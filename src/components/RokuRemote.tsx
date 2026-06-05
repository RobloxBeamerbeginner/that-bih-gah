import { useState } from "react";
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Home,
  ArrowLeft,
  Play,
  Pause,
  Rewind,
  FastForward,
  Volume2,
  VolumeX,
  X,
  Code2,
  Mic,
  Asterisk,
  CheckCircle2,
} from "lucide-react";
import { DEFAULT_REMOTE_MAP, type RemoteKey } from "@/lib/settings";

export type RemotePress = RemoteKey;

export function RokuRemote({
  onPress,
  onClose,
  labelMap,
  lastPress,
}: {
  onPress: (key: RemotePress, label: string) => void;
  onClose: () => void;
  labelMap?: Partial<Record<RemoteKey, string>>;
  lastPress?: { key: RemoteKey; label: string; frame: boolean; at: number } | null;
}) {
  const [playing, setPlaying] = useState(true);
  const lbl = (k: RemoteKey) => labelMap?.[k]?.trim() || DEFAULT_REMOTE_MAP[k];

  const press = (k: RemotePress) => onPress(k, lbl(k));

  return (
    <div className="fixed top-24 right-4 z-30 w-[230px] glass-strong rounded-3xl p-3 shadow-glow fade-in select-none">
      <div className="flex items-center justify-between mb-2 px-1">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.2em] text-white/70">
          <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
          Roku Remote
        </div>
        <button onClick={onClose} className="text-white/60 hover:text-white" aria-label="Close remote">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Top row: Back / Voice / Home */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <RemoteBtn label={lbl("back")} onClick={() => press("back")}><ArrowLeft className="w-4 h-4" /></RemoteBtn>
        <RemoteBtn label={lbl("voice")} onClick={() => press("voice")}><Mic className="w-4 h-4" /></RemoteBtn>
        <RemoteBtn label={lbl("home")} onClick={() => press("home")}><Home className="w-4 h-4" /></RemoteBtn>
      </div>

      {/* D-pad */}
      <div className="relative w-full aspect-square mb-3 rounded-full bg-gradient-to-br from-fuchsia-500/30 to-cyan-400/30 p-1">
        <div className="absolute inset-2 rounded-full bg-black/40 backdrop-blur-md" />
        <button
          onClick={() => press("up")}
          className="absolute top-1 left-1/2 -translate-x-1/2 w-12 h-10 rounded-t-full hover:bg-white/10 flex items-start justify-center pt-2"
          aria-label={lbl("up")}
        ><ChevronUp className="w-5 h-5" /></button>
        <button
          onClick={() => press("down")}
          className="absolute bottom-1 left-1/2 -translate-x-1/2 w-12 h-10 rounded-b-full hover:bg-white/10 flex items-end justify-center pb-2"
          aria-label={lbl("down")}
        ><ChevronDown className="w-5 h-5" /></button>
        <button
          onClick={() => press("left")}
          className="absolute left-1 top-1/2 -translate-y-1/2 w-10 h-12 rounded-l-full hover:bg-white/10 flex items-center justify-start pl-2"
          aria-label={lbl("left")}
        ><ChevronLeft className="w-5 h-5" /></button>
        <button
          onClick={() => press("right")}
          className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-12 rounded-r-full hover:bg-white/10 flex items-center justify-end pr-2"
          aria-label={lbl("right")}
        ><ChevronRight className="w-5 h-5" /></button>
        <button
          onClick={() => press("ok")}
          className="absolute inset-0 m-auto w-14 h-14 rounded-full bg-gradient-delta text-black font-bold shadow-glow hover:scale-105 transition"
          aria-label={lbl("ok")}
        >OK</button>
      </div>

      {/* Playback */}
      <div className="grid grid-cols-4 gap-2 mb-2">
        <RemoteBtn label={lbl("rewind")} onClick={() => press("rewind")}><Rewind className="w-4 h-4" /></RemoteBtn>
        <RemoteBtn label={playing ? lbl("pause") : lbl("play")} onClick={() => {
          const nextKey: RemoteKey = playing ? "pause" : "play";
          setPlaying((p) => !p);
          press(nextKey);
        }}>
          {playing ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
        </RemoteBtn>
        <RemoteBtn label={lbl("forward")} onClick={() => press("forward")}><FastForward className="w-4 h-4" /></RemoteBtn>
        <RemoteBtn label={lbl("info")} onClick={() => press("info")}><Asterisk className="w-4 h-4" /></RemoteBtn>
      </div>

      {/* Volume + brightscript */}
      <div className="grid grid-cols-4 gap-2">
        <RemoteBtn label={lbl("mute")} onClick={() => press("mute")}><VolumeX className="w-4 h-4" /></RemoteBtn>
        <RemoteBtn label={lbl("voldown")} onClick={() => press("voldown")}><Volume2 className="w-4 h-4 opacity-60" /></RemoteBtn>
        <RemoteBtn label={lbl("volup")} onClick={() => press("volup")}><Volume2 className="w-4 h-4" /></RemoteBtn>
        <RemoteBtn label={lbl("brightscript")} onClick={() => press("brightscript")}><Code2 className="w-4 h-4" /></RemoteBtn>
      </div>

      {lastPress ? (
        <div className="mt-2 glass rounded-lg px-2 py-1.5 text-[10px] leading-tight">
          <div className="flex items-center gap-1 text-emerald-300">
            <CheckCircle2 className="w-3 h-3" />
            <span className="font-mono">[REMOTE PRESS: {lastPress.key}]</span>
          </div>
          <div className="text-white/70 truncate">"{lastPress.label}"</div>
          <div className={lastPress.frame ? "text-cyan-300" : "text-white/40"}>
            {lastPress.frame ? "✓ frame attached" : "no frame (not sharing)"}
          </div>
        </div>
      ) : (
        <p className="text-[9px] text-white/50 text-center mt-2 leading-tight">
          Presses tag <span className="font-mono">[REMOTE PRESS: key]</span> and attach the current screen frame.
        </p>
      )}
    </div>
  );
}

function RemoteBtn({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      title={label}
      aria-label={label}
      className="h-9 rounded-xl glass flex items-center justify-center hover:bg-white/15 active:scale-95 transition"
    >
      {children}
    </button>
  );
}
