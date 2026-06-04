import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import ReactMarkdown from "react-markdown";
import {
  Monitor,
  MonitorOff,
  Send,
  Settings as SettingsIcon,
  Trash2,
  Plus,
  Image as ImageIcon,
  Zap,
  Brain,
  Crown,
  Search,
  Gamepad2,
  PictureInPicture2,
  X,
  PanelLeft,
  Loader2,
} from "lucide-react";
import { RokuRemote, type RemotePress } from "@/components/RokuRemote";

import {
  listConversations,
  createConversation,
  deleteConversation,
  loadMessages,
} from "@/lib/chat.functions";
import { D3LTALogo, SparkleIcon } from "@/components/D3LTALogo";
import { BackgroundLayer } from "@/components/BackgroundLayer";
import { BootScreen } from "@/components/BootScreen";
import { SettingsPanel } from "@/components/SettingsPanel";
import {
  loadSettings,
  saveSettings,
  applyTheme,
  getClientId,
  DEFAULT_SETTINGS,
  type Settings,
} from "@/lib/settings";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "D3LTAhub — Your AI co-pilot" },
      {
        name: "description",
        content:
          "D3LTAhub is an AI co-pilot that can see your shared screen, stream answers, and remember your conversations.",
      },
      { property: "og:title", content: "D3LTAhub — Your AI co-pilot" },
      { property: "og:description", content: "AI chat with live screen-share vision." },
    ],
  }),
  component: IndexPage,
  ssr: false,
});

type Msg = { id: string; role: string; content: string; created_at: string };
type Conv = { id: string; title: string; created_at: string; updated_at: string };

const MODES = [
  { id: "fast" as const, label: "Fast", icon: Zap },
  { id: "thinking" as const, label: "Thinking", icon: Brain },
  { id: "pro" as const, label: "Pro", icon: Crown },
  { id: "search" as const, label: "Search", icon: Search },
];

const SUGGESTIONS = [
  "Explain quantum entanglement like I'm 12",
  "Write a Python function that finds primes up to N",
  "What's the population of Tokyo?",
  "Solve: integral of x²·sin(x) dx",
];

function IndexPage() {
  const [booted, setBooted] = useState(false);
  const [clientId, setClientId] = useState("");
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Hydrate from localStorage
  useEffect(() => {
    setClientId(getClientId());
    const s = loadSettings();
    setSettings(s);
    applyTheme(s);
    setBooted(s.bootShown);
  }, []);

  // Persist + apply theme on change
  useEffect(() => {
    if (clientId) {
      saveSettings(settings);
      applyTheme(settings);
    }
  }, [settings, clientId]);

  const onBootDone = () => {
    const s = { ...settings, bootShown: true };
    setSettings(s);
    setBooted(true);
  };

  if (!clientId) return null;

  return (
    <>
      <BackgroundLayer settings={settings} />
      {!booted && <BootScreen onDone={onBootDone} />}
      {booted && (!settings.name ? (
        <NamePrompt onSubmit={(name) => setSettings({ ...settings, name })} />
      ) : (
        <ChatShell
          clientId={clientId}
          settings={settings}
          setSettings={setSettings}
          settingsOpen={settingsOpen}
          setSettingsOpen={setSettingsOpen}
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
        />
      ))}
    </>
  );
}

function NamePrompt({ onSubmit }: { onSubmit: (n: string) => void }) {
  const [name, setName] = useState("");
  return (
    <div className="min-h-screen flex items-center justify-center px-4 fade-in">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) onSubmit(name.trim());
        }}
        className="glass-strong rounded-3xl p-8 w-full max-w-md shadow-glow"
      >
        <div className="flex items-center gap-3 mb-6">
          <D3LTALogo size={48} />
          <div>
            <h1 className="text-2xl font-bold">
              <span className="text-white">D3LTA</span>
              <span className="text-gradient-delta">hub</span>
            </h1>
            <p className="text-xs text-muted-foreground tracking-wider uppercase">Official Preview</p>
          </div>
        </div>
        <label className="text-sm text-muted-foreground">What should I call you?</label>
        <input
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={60}
          placeholder="Your name"
          className="mt-2 w-full glass rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          type="submit"
          disabled={!name.trim()}
          className="mt-5 w-full bg-gradient-delta text-black font-semibold py-3 rounded-xl shadow-glow disabled:opacity-50 transition hover:scale-[1.01]"
        >
          Enter D3LTAhub
        </button>
      </form>
    </div>
  );
}

function ChatShell({
  clientId,
  settings,
  setSettings,
  settingsOpen,
  setSettingsOpen,
  sidebarOpen,
  setSidebarOpen,
}: {
  clientId: string;
  settings: Settings;
  setSettings: (s: Settings) => void;
  settingsOpen: boolean;
  setSettingsOpen: (b: boolean) => void;
  sidebarOpen: boolean;
  setSidebarOpen: (b: boolean) => void;
}) {
  const qc = useQueryClient();
  const list = useServerFn(listConversations);
  const create = useServerFn(createConversation);
  const del = useServerFn(deleteConversation);
  const loadMsgs = useServerFn(loadMessages);

  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: conversations = [] } = useQuery<Conv[]>({
    queryKey: ["conversations", clientId],
    queryFn: () => list({ data: { clientId } }),
  });

  // Auto-select / auto-create
  useEffect(() => {
    if (activeId) return;
    if (conversations.length) setActiveId(conversations[0].id);
  }, [conversations, activeId]);

  const ensureConversation = async (): Promise<string> => {
    if (activeId) return activeId;
    const c = await create({ data: { clientId } });
    qc.invalidateQueries({ queryKey: ["conversations", clientId] });
    setActiveId(c.id);
    return c.id;
  };

  const newChat = async () => {
    const c = await create({ data: { clientId } });
    qc.invalidateQueries({ queryKey: ["conversations", clientId] });
    setActiveId(c.id);
    setSidebarOpen(false);
  };

  const { data: messages = [] } = useQuery<Msg[]>({
    queryKey: ["messages", activeId],
    queryFn: () => (activeId ? loadMsgs({ data: { conversationId: activeId } }) : Promise.resolve([])),
    enabled: !!activeId,
  });

  // Streaming buffer (assistant tokens not yet committed)
  const [streamText, setStreamText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingUser, setPendingUser] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Screen share
  const [sharing, setSharing] = useState(false);
  const [remoteOpen, setRemoteOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Input
  const [input, setInput] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages.length, streamText, pendingUser]);

  const captureFrame = (): string | undefined => {
    const v = videoRef.current;
    if (!sharing || !v || !v.videoWidth) return undefined;
    const scale = Math.min(1, 1280 / v.videoWidth);
    const w = Math.round(v.videoWidth * scale);
    const h = Math.round(v.videoHeight * scale);
    const c = document.createElement("canvas");
    c.width = w; c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(v, 0, 0, w, h);
    return c.toDataURL("image/jpeg", 0.7);
  };

  const send = async (text: string) => {
    if (!text.trim() || isStreaming) return;
    setError(null);
    setPendingUser(text);
    setStreamText("");
    setIsStreaming(true);
    const convoId = await ensureConversation();
    const screenImageBase64 = captureFrame();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: convoId,
          userName: settings.name,
          about: settings.about,
          message: text,
          mode: settings.mode,
          screenImageBase64,
        }),
      });
      if (!res.ok || !res.body) {
        const t = await res.text();
        throw new Error(t || `HTTP ${res.status}`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let done = false;
      while (!done) {
        const { value, done: d } = await reader.read();
        if (d) break;
        buf += decoder.decode(value, { stream: true });
        let i: number;
        while ((i = buf.indexOf("\n")) !== -1) {
          let line = buf.slice(0, i);
          buf = buf.slice(i + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trim();
          if (data === "[DONE]") { done = true; break; }
          try {
            const j = JSON.parse(data);
            if (j.delta) setStreamText((p) => p + j.delta);
            if (j.error) throw new Error(j.error);
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setIsStreaming(false);
      setPendingUser(null);
      setStreamText("");
      await qc.invalidateQueries({ queryKey: ["messages", activeId] });
      await qc.invalidateQueries({ queryKey: ["conversations", clientId] });
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const t = input.trim();
    if (!t) return;
    setInput("");
    void send(t);
  };

  const startShare = async () => {
    try {
      const s = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 8 },
        audio: false,
      });
      streamRef.current = s;
      if (videoRef.current) {
        videoRef.current.srcObject = s;
        await videoRef.current.play().catch(() => {});
      }
      if (pipVideoRef.current) {
        pipVideoRef.current.srcObject = s;
        await pipVideoRef.current.play().catch(() => {});
      }
      s.getVideoTracks()[0].addEventListener("ended", stopShare);
      setSharing(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start screen share");
    }
  };

  const enterPip = async () => {
    const v = pipVideoRef.current ?? videoRef.current;
    if (!v) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
        return;
      }
      const anyV = v as HTMLVideoElement & { requestPictureInPicture?: () => Promise<PictureInPictureWindow> };
      if (typeof anyV.requestPictureInPicture === "function") {
        await anyV.requestPictureInPicture();
      } else {
        setError("Picture-in-Picture not supported in this browser");
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not enter PiP");
    }
  };

  const stopShare = () => {
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    }
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    if (pipVideoRef.current) pipVideoRef.current.srcObject = null;
    setSharing(false);
  };

  useEffect(() => () => stopShare(), []);

  const onDeleteConv = async (id: string) => {
    if (!confirm("Delete this conversation?")) return;
    await del({ data: { id } });
    if (activeId === id) setActiveId(null);
    qc.invalidateQueries({ queryKey: ["conversations", clientId] });
  };

  const isEmpty = messages.length === 0 && !pendingUser && !streamText;

  return (
    <div className="min-h-screen flex flex-col">
      <TopBar
        settings={settings}
        setSettings={setSettings}
        onOpenSettings={() => setSettingsOpen(true)}
        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
        onNewChat={newChat}
      />

      <Sidebar
        open={sidebarOpen}
        conversations={conversations}
        activeId={activeId}
        onSelect={(id) => { setActiveId(id); setSidebarOpen(false); }}
        onDelete={onDeleteConv}
        onClose={() => setSidebarOpen(false)}
        onNew={newChat}
      />

      <video ref={videoRef} className="hidden" muted playsInline />

      <main ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto px-4 py-6 pb-40">
          {isEmpty ? (
            <Hero name={settings.name} onPick={(s) => void send(s)} />
          ) : (
            <div className="space-y-6 pt-4">
              {messages.map((m) =>
                m.role === "user" ? (
                  <UserBubble key={m.id} content={m.content} avatar={settings.avatarUrl} />
                ) : (
                  <AssistantBubble key={m.id} content={m.content} />
                ),
              )}
              {pendingUser && (
                <UserBubble content={pendingUser} avatar={settings.avatarUrl} />
              )}
              {isStreaming && (
                <AssistantBubble content={streamText || "…"} streaming />
              )}
              {error && (
                <div className="text-sm text-destructive border border-destructive/30 bg-destructive/10 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {sharing && (
        <ScreenSharePiP videoRef={pipVideoRef} onClose={stopShare} onPip={enterPip} />
      )}

      {remoteOpen && (
        <RokuRemote
          onClose={() => setRemoteOpen(false)}
          onPress={(key: RemotePress, label: string) => {
            if (key === "brightscript") {
              void send("Give me a concise BrightScript example for a Roku SceneGraph component that handles remote key events (up/down/OK), with `onKeyEvent` and `observeField`.");
            } else {
              void send(`[REMOTE PRESS: ${key}] ${label}${sharing ? " (while screen sharing)" : ""}. What should happen next?`);
            }
          }}
        />
      )}

      <InputBar
        input={input}
        setInput={setInput}
        onSubmit={onSubmit}
        sharing={sharing}
        onToggleShare={sharing ? stopShare : startShare}
        remoteOpen={remoteOpen}
        onToggleRemote={() => setRemoteOpen((o) => !o)}
        isStreaming={isStreaming}
        inputRef={inputRef}
      />


      <SettingsPanel
        open={settingsOpen}
        settings={settings}
        onClose={() => setSettingsOpen(false)}
        onChange={setSettings}
      />
    </div>
  );
}

function TopBar({
  settings,
  setSettings,
  onOpenSettings,
  onToggleSidebar,
  onNewChat,
}: {
  settings: Settings;
  setSettings: (s: Settings) => void;
  onOpenSettings: () => void;
  onToggleSidebar: () => void;
  onNewChat: () => void;
}) {
  return (
    <header className="sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-3">
        <div className="glass rounded-full px-3 py-2 flex items-center justify-between gap-2 shadow-glow">
          <div className="flex items-center gap-2 min-w-0">
            <button
              onClick={onToggleSidebar}
              className="w-9 h-9 rounded-full glass flex items-center justify-center hover:bg-white/10"
              aria-label="History"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
            <div className="w-9 h-9 rounded-full bg-gradient-delta/20 flex items-center justify-center">
              <D3LTALogo size={22} />
            </div>
            <div className="leading-tight hidden sm:block">
              <div className="font-bold">
                <span className="text-white">D3LTA</span>
                <span className="text-gradient-delta">hub</span>
              </div>
              <div className="text-[9px] uppercase tracking-[0.25em] text-muted-foreground">
                Official Preview
              </div>
            </div>
          </div>

          <div className="glass pill p-1 flex items-center gap-0.5">
            {MODES.map((m) => {
              const active = settings.mode === m.id;
              const Icon = m.icon;
              return (
                <button
                  key={m.id}
                  onClick={() => setSettings({ ...settings, mode: m.id })}
                  className={`pill px-3 py-1.5 text-xs font-medium flex items-center gap-1.5 transition ${
                    active
                      ? "bg-gradient-delta text-black shadow-glow"
                      : "text-foreground/80 hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{m.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onNewChat}
              className="glass pill px-3 py-2 text-xs font-medium flex items-center gap-1.5 hover:bg-white/10"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New</span>
            </button>
            <button
              onClick={onOpenSettings}
              className="w-9 h-9 rounded-full overflow-hidden glass flex items-center justify-center hover:ring-2 hover:ring-primary/40"
              aria-label="Settings"
            >
              {settings.avatarUrl ? (
                <img src={settings.avatarUrl} alt="" className="w-full h-full object-cover" />
              ) : (
                <SettingsIcon className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

function Sidebar({
  open,
  conversations,
  activeId,
  onSelect,
  onDelete,
  onClose,
  onNew,
}: {
  open: boolean;
  conversations: Conv[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onNew: () => void;
}) {
  return (
    <div className={`fixed inset-0 z-40 ${open ? "" : "pointer-events-none"}`}>
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />
      <aside
        className={`absolute top-0 left-0 h-full w-[300px] glass-strong p-4 overflow-y-auto transition-transform ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold">History</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-full glass flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <button
          onClick={onNew}
          className="w-full bg-gradient-delta text-black font-semibold py-2.5 rounded-xl mb-4 flex items-center justify-center gap-2 shadow-glow"
        >
          <Plus className="w-4 h-4" /> New chat
        </button>
        <div className="space-y-1">
          {conversations.length === 0 && (
            <p className="text-xs text-muted-foreground px-2 py-4 text-center">
              No conversations yet
            </p>
          )}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center gap-1 rounded-lg ${
                activeId === c.id ? "bg-white/10" : "hover:bg-white/5"
              }`}
            >
              <button
                onClick={() => onSelect(c.id)}
                className="flex-1 text-left px-3 py-2 text-sm truncate"
              >
                {c.title}
              </button>
              <button
                onClick={() => onDelete(c.id)}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-2 text-muted-foreground hover:text-destructive"
                aria-label="Delete"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}

function Hero({ name, onPick }: { name: string; onPick: (s: string) => void }) {
  return (
    <div className="min-h-[70vh] flex flex-col items-center justify-center text-center fade-in">
      <div className="w-20 h-20 rounded-2xl glass-strong flex items-center justify-center mb-6 shadow-glow scale-in">
        <SparkleIcon size={36} />
      </div>
      <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight text-shadow-lg">
        Hi, <span className="text-white">{name}</span>.{" "}
        <span className="text-gradient-delta">I'm D3LTAhub.</span>
      </h1>
      <p className="mt-4 max-w-xl text-sm sm:text-base text-white/80 text-shadow-lg">
        Ask me anything — I can search the web, do math, write code, see images, and watch your
        screen across tabs.
      </p>
      <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="glass rounded-2xl px-4 py-3 text-left text-sm hover:bg-white/10 flex items-start gap-2 transition"
          >
            <SparkleIcon size={16} />
            <span>{s}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function InputBar({
  input,
  setInput,
  onSubmit,
  sharing,
  onToggleShare,
  remoteOpen,
  onToggleRemote,
  isStreaming,
  inputRef,
}: {
  input: string;
  setInput: (s: string) => void;
  onSubmit: (e: FormEvent) => void;
  sharing: boolean;
  onToggleShare: () => void;
  remoteOpen: boolean;
  onToggleRemote: () => void;
  isStreaming: boolean;
  inputRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <footer className="fixed bottom-0 left-0 right-0 z-20 pb-4 px-3 sm:px-4">
      <form
        onSubmit={onSubmit}
        className="max-w-3xl mx-auto glass-strong rounded-full px-2 py-2 flex items-end gap-2 shadow-glow"
      >
        <button
          type="button"
          className="shrink-0 w-10 h-10 rounded-full glass flex items-center justify-center hover:bg-white/10"
          aria-label="Attach image"
          title="Image attach coming soon"
        >
          <ImageIcon className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onToggleShare}
          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition ${
            sharing
              ? "bg-destructive/30 text-destructive border border-destructive/40"
              : "glass hover:bg-white/10"
          }`}
          aria-label={sharing ? "Stop screen share" : "Start screen share"}
        >
          {sharing ? <MonitorOff className="w-4 h-4" /> : <Monitor className="w-4 h-4" />}
        </button>
        <button
          type="button"
          onClick={onToggleRemote}
          className={`shrink-0 w-10 h-10 rounded-full flex items-center justify-center transition ${
            remoteOpen
              ? "bg-gradient-delta text-black shadow-glow"
              : "glass hover:bg-white/10"
          }`}
          aria-label="Roku remote"
          title="Roku remote control"
        >
          <Gamepad2 className="w-4 h-4" />
        </button>
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
          placeholder={sharing ? "Ask about what's on your screen…" : "Ask D3LTAhub anything…"}
          className="flex-1 bg-transparent resize-none focus:outline-none px-2 py-2 max-h-40 placeholder:text-white/50"
        />
        <button
          type="submit"
          disabled={!input.trim() || isStreaming}
          className="shrink-0 w-11 h-11 rounded-full bg-gradient-delta text-black flex items-center justify-center shadow-glow disabled:opacity-40 hover:scale-105 transition"
          aria-label="Send"
        >
          {isStreaming ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
      <p className="text-center text-[10px] text-white/50 mt-2">
        D3LTAhub can make mistakes. Verify important info.
      </p>
    </footer>
  );
}

function ScreenSharePiP({
  videoRef,
  onClose,
}: {
  videoRef: React.RefObject<HTMLVideoElement | null>;
  onClose: () => void;
}) {
  return (
    <div className="fixed bottom-28 right-4 z-30 w-[300px] sm:w-[360px] glass-strong rounded-2xl overflow-hidden shadow-glow fade-in">
      <div className="px-3 py-2 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span className="font-medium">Live screen — D3LTAhub sees this</span>
        </div>
        <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Stop share">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <video ref={videoRef} muted playsInline className="w-full aspect-video object-cover bg-black" />
    </div>
  );
}

function UserBubble({ content, avatar }: { content: string; avatar?: string }) {
  return (
    <div className="flex justify-end gap-2 fade-in">
      <div className="max-w-[80%] glass-strong rounded-2xl rounded-br-md px-4 py-2.5 whitespace-pre-wrap">
        {content}
      </div>
      {avatar ? (
        <img src={avatar} alt="" className="w-7 h-7 rounded-full object-cover shrink-0" />
      ) : (
        <div className="w-7 h-7 rounded-full bg-gradient-delta/40 shrink-0" />
      )}
    </div>
  );
}

function AssistantBubble({
  content,
  streaming,
}: {
  content: string;
  streaming?: boolean;
}) {
  const md = useMemo(() => <ReactMarkdown>{content}</ReactMarkdown>, [content]);
  return (
    <div className="flex gap-3 fade-in">
      <div className="shrink-0 mt-1">
        <D3LTALogo size={26} />
      </div>
      <div className={`prose-delta text-foreground leading-relaxed ${streaming ? "typing-cursor" : ""}`}>
        {md}
      </div>
    </div>
  );
}
