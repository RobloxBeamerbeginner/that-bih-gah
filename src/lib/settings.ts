export type ThemePreset =
  | "iridescent"
  | "airy"
  | "neon"
  | "sunset"
  | "matrix"
  | "rose";

export type BackgroundKind = "aurora" | "solid" | "gradient" | "image" | "video";

export type RemoteKey =
  | "up" | "down" | "left" | "right" | "ok"
  | "home" | "back" | "play" | "pause"
  | "rewind" | "forward" | "voldown" | "volup" | "mute"
  | "info" | "voice" | "brightscript";

export const DEFAULT_REMOTE_MAP: Record<RemoteKey, string> = {
  up: "Up", down: "Down", left: "Left", right: "Right", ok: "OK",
  home: "Home", back: "Back", play: "Play", pause: "Pause",
  rewind: "Rewind", forward: "Fast forward",
  voldown: "Volume down", volup: "Volume up", mute: "Mute",
  info: "Options *", voice: "Voice search", brightscript: "BrightScript help",
};

export type Settings = {
  name: string;
  avatarUrl: string;
  about: string;
  theme: ThemePreset;
  accentHue: number; // 0-360
  glassBlur: number; // 0-40 px
  background: BackgroundKind;
  backgroundUrl: string; // for image/video
  mode: "fast" | "thinking" | "pro" | "search";
  bootShown: boolean;
};

const KEY = "d3ltahub_settings_v2";

export const DEFAULT_SETTINGS: Settings = {
  name: "",
  avatarUrl: "",
  about: "",
  theme: "iridescent",
  accentHue: 195,
  glassBlur: 22,
  background: "aurora",
  backgroundUrl: "",
  mode: "fast",
  bootShown: false,
};

export const THEME_PRESETS: Record<
  ThemePreset,
  { label: string; from: string; to: string; accent: number }
> = {
  iridescent: { label: "Iridescent", from: "#22d3ee", to: "#a855f7", accent: 195 },
  airy: { label: "Airy Glass", from: "#dbeafe", to: "#f5d0fe", accent: 230 },
  neon: { label: "Neon Cyber", from: "#22d3ee", to: "#ec4899", accent: 320 },
  sunset: { label: "Sunset", from: "#fb7185", to: "#f59e0b", accent: 20 },
  matrix: { label: "Matrix", from: "#10b981", to: "#064e3b", accent: 150 },
  rose: { label: "Rose Quartz", from: "#fda4af", to: "#f9a8d4", accent: 340 },
};

export function loadSettings(): Settings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(s: Settings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
}

export function getClientId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem("d3ltahub_client_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("d3ltahub_client_id", id);
  }
  return id;
}

export function applyTheme(s: Settings) {
  if (typeof document === "undefined") return;
  const preset = THEME_PRESETS[s.theme];
  const root = document.documentElement;
  root.style.setProperty("--theme-from", preset.from);
  root.style.setProperty("--theme-to", preset.to);
  root.style.setProperty("--accent-hue", String(s.accentHue));
  root.style.setProperty("--glass-blur", `${s.glassBlur}px`);
}
