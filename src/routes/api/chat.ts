import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { streamText, type ModelMessage } from "ai";
import { createLovableAiGatewayProvider } from "@/lib/ai-gateway.server";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const BodySchema = z.object({
  conversationId: z.string().uuid(),
  userName: z.string().min(1).max(60),
  about: z.string().max(2000).optional(),
  message: z.string().min(1).max(8000),
  mode: z.enum(["fast", "thinking", "pro"]).default("fast"),
  screenImageBase64: z.string().max(8_000_000).optional(),
});

const SYSTEM = `You are D3LTAhub, a sharp, futuristic AI companion with an edgy, confident tone.
You are conversational, helpful, and concise. Use markdown for code, lists, and emphasis when it helps.
When a screen-share frame is attached, naturally reference what's on screen ("I can see ...", "On your screen ...").
Never break character as D3LTAhub.`;

function modelFor(mode: "fast" | "thinking" | "pro") {
  if (mode === "pro") return "openai/gpt-5";
  if (mode === "thinking") return "google/gemini-2.5-pro";
  return "google/gemini-3-flash-preview";
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env.LOVABLE_API_KEY;
        if (!key) return new Response("Missing LOVABLE_API_KEY", { status: 500 });
        let body: z.infer<typeof BodySchema>;
        try {
          body = BodySchema.parse(await request.json());
        } catch (e) {
          return new Response(`Invalid body: ${e instanceof Error ? e.message : "unknown"}`, { status: 400 });
        }

        // Persist the user message
        const { error: insErr } = await supabaseAdmin.from("chat_messages").insert({
          client_id: body.conversationId,
          conversation_id: body.conversationId,
          role: "user",
          content: body.message,
        });
        if (insErr) return new Response(insErr.message, { status: 500 });

        // Auto-title if first message
        const { count } = await supabaseAdmin
          .from("chat_messages")
          .select("id", { count: "exact", head: true })
          .eq("conversation_id", body.conversationId);
        if ((count ?? 0) <= 1) {
          const title = body.message.slice(0, 60).trim() || "New chat";
          await supabaseAdmin
            .from("conversations")
            .update({ title, updated_at: new Date().toISOString() })
            .eq("id", body.conversationId);
        } else {
          await supabaseAdmin
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", body.conversationId);
        }

        // Load history (excluding the user msg we just inserted — we'll re-add it with image if needed)
        const { data: history } = await supabaseAdmin
          .from("chat_messages")
          .select("role, content")
          .eq("conversation_id", body.conversationId)
          .order("created_at", { ascending: true })
          .limit(400);

        const systemContent = `${SYSTEM}\nThe user's name is ${body.userName}.${
          body.about ? `\nAbout the user: ${body.about}` : ""
        }`;

        const messages: ModelMessage[] = [
          { role: "system", content: systemContent },
          ...(history ?? []).slice(0, -1).map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          })),
        ];

        if (body.screenImageBase64) {
          messages.push({
            role: "user",
            content: [
              { type: "text", text: `[Live screen frame attached]\n${body.message}` },
              { type: "image", image: body.screenImageBase64 },
            ],
          });
        } else {
          messages.push({ role: "user", content: body.message });
        }

        const gateway = createLovableAiGatewayProvider(key);

        try {
          const result = streamText({
            model: gateway(modelFor(body.mode)),
            messages,
          });

          // Stream tokens as SSE; persist final text on finish
          const encoder = new TextEncoder();
          let fullText = "";
          const stream = new ReadableStream({
            async start(controller) {
              try {
                for await (const delta of result.textStream) {
                  fullText += delta;
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`),
                  );
                }
                await supabaseAdmin.from("chat_messages").insert({
                  client_id: body.conversationId,
                  conversation_id: body.conversationId,
                  role: "assistant",
                  content: fullText,
                });
                await supabaseAdmin
                  .from("conversations")
                  .update({ updated_at: new Date().toISOString() })
                  .eq("id", body.conversationId);
                controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
                controller.close();
              } catch (e) {
                const msg = e instanceof Error ? e.message : String(e);
                let friendly = msg;
                if (msg.includes("429")) friendly = "D3LTAhub is rate limited. Try again shortly.";
                if (msg.includes("402")) friendly = "AI credits exhausted. Add credits in workspace settings.";
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ error: friendly })}\n\n`),
                );
                controller.close();
              }
            },
          });

          return new Response(stream, {
            headers: {
              "Content-Type": "text/event-stream",
              "Cache-Control": "no-cache, no-transform",
              Connection: "keep-alive",
            },
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "unknown";
          return new Response(msg, { status: 500 });
        }
      },
    },
  },
});
