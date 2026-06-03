import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { ModelMessage } from "ai";

const SYSTEM_PROMPT = `You are D3LTAhub, a sharp, futuristic AI companion with an edgy, confident tone.
You are conversational, helpful, and concise. Use markdown when it helps clarity.
When the user shares their screen, you receive an image of what they are looking at right now.
When you see a screen image, naturally reference what is on screen if relevant ("I can see ...", "On your screen ...").
Always sign with personality — never break character as D3LTAhub.`;

export const loadMessages = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ clientId: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("chat_messages")
      .select("id, role, content, created_at")
      .eq("client_id", data.clientId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const sendChatMessage = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) =>
    z
      .object({
        clientId: z.string().min(1).max(100),
        userName: z.string().min(1).max(60),
        message: z.string().min(1).max(4000),
        screenImageBase64: z.string().max(8_000_000).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("Missing LOVABLE_API_KEY");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createLovableAiGatewayProvider } = await import("@/lib/ai-gateway.server");
    const { generateText } = await import("ai");

    // Save user message
    const { error: insErr } = await supabaseAdmin.from("chat_messages").insert({
      client_id: data.clientId,
      role: "user",
      content: data.message,
    });
    if (insErr) throw new Error(insErr.message);

    // Load full history
    const { data: history, error: histErr } = await supabaseAdmin
      .from("chat_messages")
      .select("role, content")
      .eq("client_id", data.clientId)
      .order("created_at", { ascending: true })
      .limit(200);
    if (histErr) throw new Error(histErr.message);

    const messages: ModelMessage[] = [
      { role: "system", content: `${SYSTEM_PROMPT}\nThe user's name is ${data.userName}.` },
      ...(history ?? []).slice(0, -1).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    // For the latest user turn, attach image if provided
    if (data.screenImageBase64) {
      messages.push({
        role: "user",
        content: [
          { type: "text", text: `[Live screen share frame attached]\n${data.message}` },
          { type: "image", image: data.screenImageBase64 },
        ],
      });
    } else {
      messages.push({ role: "user", content: data.message });
    }

    const gateway = createLovableAiGatewayProvider(key);
    let assistantText: string;
    try {
      const result = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        messages,
      });
      assistantText = result.text;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes("429")) throw new Error("D3LTAhub is rate limited. Try again in a moment.");
      if (msg.includes("402")) throw new Error("AI credits exhausted. Add credits in workspace settings.");
      throw new Error(msg);
    }

    const { error: aErr } = await supabaseAdmin.from("chat_messages").insert({
      client_id: data.clientId,
      role: "assistant",
      content: assistantText,
    });
    if (aErr) throw new Error(aErr.message);

    return { assistant: assistantText };
  });

export const clearChat = createServerFn({ method: "POST" })
  .inputValidator((d: unknown) => z.object({ clientId: z.string().min(1).max(100) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("chat_messages")
      .delete()
      .eq("client_id", data.clientId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
