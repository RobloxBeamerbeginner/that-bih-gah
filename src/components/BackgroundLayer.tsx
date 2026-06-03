import type { Settings } from "@/lib/settings";

export function BackgroundLayer({ settings }: { settings: Settings }) {
  const { background, backgroundUrl } = settings;

  if (background === "aurora") {
    return <div className="aurora-bg" aria-hidden />;
  }
  if (background === "solid") {
    return (
      <div
        className="fixed inset-0 -z-10"
        aria-hidden
        style={{ background: "oklch(0.1 0.02 270)" }}
      />
    );
  }
  if (background === "gradient") {
    return (
      <div
        className="fixed inset-0 -z-10"
        aria-hidden
        style={{
          background: `linear-gradient(135deg, var(--theme-from), var(--theme-to))`,
          filter: "saturate(120%)",
        }}
      />
    );
  }
  if (background === "image" && backgroundUrl) {
    return (
      <div className="fixed inset-0 -z-10" aria-hidden>
        <img
          src={backgroundUrl}
          alt=""
          className="w-full h-full object-cover"
          draggable={false}
        />
        <div className="absolute inset-0 bg-black/35" />
      </div>
    );
  }
  if (background === "video" && backgroundUrl) {
    return (
      <div className="fixed inset-0 -z-10" aria-hidden>
        <video
          src={backgroundUrl}
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/35" />
      </div>
    );
  }
  return <div className="aurora-bg" aria-hidden />;
}
