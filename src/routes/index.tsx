import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState, type FormEvent } from "react";
import ReactMarkdown from "react-markdown";
import {
  Monitor,
  MonitorOff,
  Send,
  Sparkles,
  Trash2,
  Loader2,
} from "lucide-react";
import { loadMessages, sendChatMessage, clearChat } from "@/lib/chat.functions";
import { D3LTALogo } from "@/components/D3LTALogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "D3LTAhub — Your AI co-pilot" },
      {
        name: "description",
        content:
          "Chat with D3LTAhub, an AI that can see your shared screen and answer anything in real time.",
      },
      { property: "og:title", content: "D3LTAhub — Your AI co-pilot" },
      {
        property: "og:description",
        content: "AI chat with live screen-share vision.",
      },
    ],
  }),
  component: Index,
  ssr: false,
});

function getClientId() {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("d3ltahub_client_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("d3ltahub_client_id", id);
  }
  return id;
}

function Index() {
  const [name, setName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [clientId, setClientId] = useState("");

  useEffect(() => {
    setClientId(getClientId());
    setName(localStorage.getItem("d3ltahub_name"));
  }, []);

  const submitName = (e: FormEvent) => {
    e.preventDefault();
    const n = nameInput.trim();
    if (!n) return;
    localStorage.setItem("d3ltahub_name", n);
    setName(n);
  };

  if (!clientId) return null;

  if (!name) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <form
          onSubmit={submitName}
          className="w-full max-w-md bg-card/70 backdrop-blur-xl border border-border rounded-2xl p-8 shadow-glow"
        >
          <div className="flex items-center gap-3 mb-6">
            <D3LTALogo size={44} />
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                <span className="text-gradient-delta">D3LTA</span>hub
              </h1>
              <p className="text-xs text-muted-foreground">
                Your AI co-pilot · sees your screen
              </p>
            </div>
          </div>
          <label className="block text-sm font-medium mb-2 text-muted-foreground">
            What should I call you?
          </label>
          <input
            autoFocus
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Your name"
            className="w-full bg-input border border-border rounded-lg px-4 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            maxLength={60}
          />
          <button
            type="submit"
            disabled={!nameInput.trim()}
            className="mt-4 w-full bg-gradient-delta text-primary-foreground font-semibold py-3 rounded-lg shadow-glow transition hover:scale-[1.01] disabled:opacity-50 disabled:hover:scale-100"
          >
            Enter chat
          </button>
        </form>
      </div>
    );
  }

  return <Chat clientId={clientId} userName={name} onResetName={() => { localStorage.removeItem("d3ltahub_name"); setName(null); }} />;
}

type ChatMsg = { id: string; role: string; content: string; created_at: string };

function Chat({
  clientId,
  userName,
  onResetName,
}: {
  clientId: string;
  userName: string;
  onResetName: () => void;
}) {
  const qc = useQueryClient();
  const load = useServerFn(loadMessages);
  const send = useServerFn(sendChatMessage);
  const clear = useServerFn(clearChat);

  const { data: messages = [] } = useQuery<ChatMsg[]>({
    queryKey: ["chat", clientId],
    queryFn: () => load({ data: { clientId } }),
  });

  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Screen share state
  const [sharing, setSharing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const captureFrame = (): string | undefined => {
    const video = videoRef.current;
    if (!sharing || !video || !video.videoWidth) return undefined;
    const maxW = 1280;
    const scale = Math.min(1, maxW / video.videoWidth);
    const w = Math.round(video.videoWidth * scale);
    const h = Math.round(video.videoHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.7);
  };

  const sendMutation = useMutation({
    mutationFn: async (text: string) => {
      const screenImageBase64 = captureFrame();
      return send({ data: { clientId, userName, message: text, screenImageBase64 } });
    },
    onMutate: async (text) => {
      setError(null);
      await qc.cancelQueries({ queryKey: ["chat", clientId] });
      const prev = qc.getQueryData<ChatMsg[]>(["chat", clientId]) ?? [];
      qc.setQueryData<ChatMsg[]>(["chat", clientId], [
        ...prev,
        { id: `optimistic-${Date.now()}`, role: "user", content: text, created_at: new Date().toISOString() },
      ]);
      return { prev };
    },
    onError: (err, _v, ctx) => {
      setError(err instanceof Error ? err.message : "Something went wrong");
      if (ctx?.prev) qc.setQueryData(["chat", clientId], ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: ["chat", clientId] });
      setTimeout(() => inputRef.current?.focus(), 0);
    },
  });

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sendMutation.isPending) return;
    setInput("");
    sendMutation.mutate(text);
  };

  const startShare = async () => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 8 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      stream.getVideoTracks()[0].addEventListener("ended", stopShare);
      setSharing(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start screen share");
    }
  };

  const stopShare = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setSharing(false);
  };

  useEffect(() => () => stopShare(), []);

  const onClear = async () => {
    if (!confirm("Clear this conversation?")) return;
    await clear({ data: { clientId } });
    qc.setQueryData(["chat", clientId], []);
  };

  const greeting = `Hello ${userName} 👋 I'm **D3LTAhub**. Ask me anything — you can also share your screen and I'll see what you're looking at in real time.`;

  return (
    <div className="min-h-screen flex flex-col">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-background/60 border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <D3LTALogo size={32} />
            <div>
              <h1 className="font-bold leading-tight">
                <span className="text-gradient-delta">D3LTA</span>hub
              </h1>
              <p className="text-[11px] text-muted-foreground leading-tight">
                with {userName}
                {sharing && (
                  <span className="ml-2 inline-flex items-center gap-1 text-delta">
                    <span className="w-1.5 h-1.5 rounded-full bg-delta animate-pulse" />
                    seeing your screen
                  </span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={sharing ? stopShare : startShare}
              className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition ${
                sharing
                  ? "bg-destructive/15 text-destructive border-destructive/30 hover:bg-destructive/25"
                  : "bg-secondary text-secondary-foreground border-border hover:bg-muted"
              }`}
            >
              {sharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
              <span className="hidden sm:inline">{sharing ? "Stop share" : "Share screen"}</span>
            </button>
            <button
              onClick={onClear}
              title="Clear chat"
              className="p-2 rounded-lg border border-border bg-secondary text-muted-foreground hover:text-foreground hover:bg-muted transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <video ref={videoRef} className="hidden" muted playsInline />

      <main ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
          <AssistantBubble content={greeting} intro />
          {sharing && (
            <div className="rounded-xl border border-delta/40 bg-delta/5 px-4 py-3 text-sm flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-delta" />
              <span>
                <span className="font-semibold text-delta">d3ltahub sees this</span> — your next
                message will include a live frame of your screen.
              </span>
            </div>
          )}
          {messages.map((m) =>
            m.role === "assistant" ? (
              <AssistantBubble key={m.id} content={m.content} />
            ) : (
              <UserBubble key={m.id} content={m.content} />
            ),
          )}
          {sendMutation.isPending && (
            <div className="flex items-center gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin text-delta" />
              D3LTAhub is thinking...
            </div>
          )}
          {error && (
            <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>
      </main>

      <footer className="sticky bottom-0 backdrop-blur-xl bg-background/70 border-t border-border">
        <form onSubmit={onSubmit} className="max-w-3xl mx-auto px-4 py-3 flex gap-2 items-end">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSubmit(e as unknown as FormEvent);
              }
            }}
            rows={1}
            placeholder={sharing ? "Ask about what's on your screen..." : "Ask D3LTAhub anything..."}
            className="flex-1 resize-none bg-input border border-border rounded-xl px-4 py-3 max-h-40 focus:outline-none focus:ring-2 focus:ring-ring placeholder:text-muted-foreground"
          />
          <button
            type="submit"
            disabled={!input.trim() || sendMutation.isPending}
            className="shrink-0 w-12 h-12 flex items-center justify-center rounded-xl bg-gradient-delta text-primary-foreground shadow-glow disabled:opacity-40 transition hover:scale-105"
            aria-label="Send"
          >
            {sendMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </form>
        <div className="max-w-3xl mx-auto px-4 pb-2 text-[10px] text-muted-foreground flex justify-between">
          <span>Powered by Lovable AI</span>
          <button onClick={onResetName} className="hover:text-foreground">Change name</button>
        </div>
      </footer>
    </div>
  );
}

function UserBubble({ content }: { content: string }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] bg-gradient-delta text-primary-foreground rounded-2xl rounded-br-sm px-4 py-2.5 shadow-glow whitespace-pre-wrap">
        {content}
      </div>
    </div>
  );
}

function AssistantBubble({ content, intro }: { content: string; intro?: boolean }) {
  return (
    <div className="flex gap-3">
      <div className="shrink-0 mt-1">
        <D3LTALogo size={26} />
      </div>
      <div className={`prose-delta text-foreground leading-relaxed ${intro ? "" : ""}`}>
        <ReactMarkdown>{content}</ReactMarkdown>
      </div>
    </div>
  );
}
