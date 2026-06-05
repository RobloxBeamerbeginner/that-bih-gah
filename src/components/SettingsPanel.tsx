import { X, Camera, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { THEME_PRESETS, DEFAULT_REMOTE_MAP, type Settings, type ThemePreset, type BackgroundKind, type RemoteKey } from "@/lib/settings";
import bgMinecraft from "@/assets/bg-minecraft.asset.json";
import bgHunt from "@/assets/bg-hunt.asset.json";

export function SettingsPanel({
  open,
  settings,
  onClose,
  onChange,
}: {
  open: boolean;
  settings: Settings;
  onClose: () => void;
  onChange: (s: Settings) => void;
}) {
  const [bgUrlInput, setBgUrlInput] = useState("");
  const [avatarInput, setAvatarInput] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const update = <K extends keyof Settings>(k: K, v: Settings[K]) =>
    onChange({ ...settings, [k]: v });

  const onAvatarFile = (f: File) => {
    const reader = new FileReader();
    reader.onload = () => update("avatarUrl", String(reader.result));
    reader.readAsDataURL(f);
  };

  const presetVideos = [
    { label: "Minecraft", url: bgMinecraft.url },
    { label: "Hunt: Showdown", url: bgHunt.url },
  ];

  return (
    <div
      className={`fixed inset-0 z-50 ${open ? "pointer-events-auto" : "pointer-events-none"}`}
      aria-hidden={!open}
    >
      <div
        className={`absolute inset-0 bg-black/40 transition-opacity ${
          open ? "opacity-100" : "opacity-0"
        }`}
        onClick={onClose}
      />
      <aside
        className={`absolute top-0 right-0 h-full w-full sm:w-[420px] glass-strong p-5 overflow-y-auto transition-transform ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold">Settings</h2>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-full glass flex items-center justify-center hover:bg-white/10"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <Section title="Profile">
          <div className="flex items-start gap-3">
            <div className="relative">
              <div className="w-16 h-16 rounded-full overflow-hidden glass flex items-center justify-center">
                {settings.avatarUrl ? (
                  <img src={settings.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-xl font-bold text-gradient-delta">
                    {(settings.name || "?").slice(0, 1).toUpperCase()}
                  </span>
                )}
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-gradient-delta flex items-center justify-center"
                aria-label="Upload avatar"
              >
                <Camera className="w-3.5 h-3.5 text-black" />
              </button>
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => e.target.files?.[0] && onAvatarFile(e.target.files[0])}
              />
            </div>
            <div className="flex-1 space-y-2">
              <input
                value={settings.name}
                onChange={(e) => update("name", e.target.value)}
                placeholder="Your name"
                maxLength={60}
                className="w-full glass rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <div className="flex gap-2">
                <input
                  value={avatarInput}
                  onChange={(e) => setAvatarInput(e.target.value)}
                  placeholder="…or paste image URL"
                  className="flex-1 glass rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={() => {
                    if (avatarInput.trim()) update("avatarUrl", avatarInput.trim());
                    setAvatarInput("");
                  }}
                  className="px-3 rounded-lg glass text-xs hover:bg-white/10"
                >
                  Set
                </button>
              </div>
            </div>
          </div>
          <textarea
            value={settings.about}
            onChange={(e) => update("about", e.target.value)}
            placeholder="About you (D3LTAhub remembers this)"
            rows={3}
            maxLength={1500}
            className="mt-3 w-full glass rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none"
          />
        </Section>

        <Section title="Theme">
          <div className="grid grid-cols-3 gap-2">
            {(Object.keys(THEME_PRESETS) as ThemePreset[]).map((k) => {
              const p = THEME_PRESETS[k];
              const active = settings.theme === k;
              return (
                <button
                  key={k}
                  onClick={() => {
                    update("theme", k);
                    update("accentHue", p.accent);
                  }}
                  className={`group rounded-xl overflow-hidden border ${
                    active ? "border-primary ring-2 ring-primary/40" : "border-white/10"
                  }`}
                >
                  <div
                    className="h-14"
                    style={{ background: `linear-gradient(135deg, ${p.from}, ${p.to})` }}
                  />
                  <div className="text-xs py-1.5 bg-black/40">{p.label}</div>
                </button>
              );
            })}
          </div>
          <Slider
            label="Accent hue"
            value={settings.accentHue}
            min={0}
            max={360}
            onChange={(v) => update("accentHue", v)}
          />
          <Slider
            label="Glass blur"
            value={settings.glassBlur}
            min={0}
            max={40}
            onChange={(v) => update("glassBlur", v)}
          />
        </Section>

        <Section title="Background">
          <div className="flex flex-wrap gap-2">
            {(["aurora", "solid", "gradient", "image", "video"] as BackgroundKind[]).map((k) => (
              <button
                key={k}
                onClick={() => update("background", k)}
                className={`pill px-3 py-1.5 text-xs border ${
                  settings.background === k
                    ? "bg-gradient-delta text-black border-transparent"
                    : "glass border-white/10 hover:bg-white/10"
                }`}
              >
                {k}
              </button>
            ))}
          </div>
          {(settings.background === "image" || settings.background === "video") && (
            <>
              <div className="flex gap-2 mt-3">
                <input
                  value={bgUrlInput}
                  onChange={(e) => setBgUrlInput(e.target.value)}
                  placeholder={`Paste ${settings.background} URL`}
                  className="flex-1 glass rounded-lg px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <button
                  onClick={() => {
                    if (bgUrlInput.trim()) update("backgroundUrl", bgUrlInput.trim());
                    setBgUrlInput("");
                  }}
                  className="px-3 rounded-lg glass text-xs hover:bg-white/10"
                >
                  Use
                </button>
              </div>
              {settings.background === "video" && (
                <div className="mt-3">
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">
                    Presets
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {presetVideos.map((v) => (
                      <button
                        key={v.url}
                        onClick={() => update("backgroundUrl", v.url)}
                        className={`rounded-lg glass overflow-hidden border ${
                          settings.backgroundUrl === v.url
                            ? "border-primary"
                            : "border-white/10"
                        } p-2 text-xs hover:bg-white/10 text-left`}
                      >
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </Section>
      </aside>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-7">
      <h3 className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-3">{title}</h3>
      {children}
    </section>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <label className="mt-3 flex items-center gap-3 text-sm">
      <span className="w-24 text-muted-foreground">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="flex-1 accent-[var(--theme-from)]"
      />
    </label>
  );
}
