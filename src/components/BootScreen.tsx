import { useEffect, useState } from "react";
import { D3LTALogo } from "./D3LTALogo";
import bootAsset from "@/assets/boot-intro.asset.json";

export function BootScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<"video" | "fadeout">("video");

  useEffect(() => {
    const t = setTimeout(() => setPhase("fadeout"), 2600);
    const d = setTimeout(onDone, 3200);
    return () => {
      clearTimeout(t);
      clearTimeout(d);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-black transition-opacity duration-500 ${
        phase === "fadeout" ? "opacity-0" : "opacity-100"
      }`}
    >
      <video
        src={bootAsset.url}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover opacity-70"
      />
      <div className="relative z-10 flex flex-col items-center scale-in">
        <D3LTALogo size={96} />
        <div className="mt-5 text-4xl sm:text-5xl font-bold tracking-tight">
          <span className="text-white">D3LTA</span>
          <span className="text-gradient-delta">hub</span>
        </div>
        <div className="mt-2 text-xs tracking-[0.3em] text-white/70 uppercase">
          Official Preview
        </div>
        <div className="mt-8 w-40 h-1 rounded-full overflow-hidden bg-white/10">
          <div className="h-full bg-gradient-delta animate-pulse" style={{ width: "70%" }} />
        </div>
      </div>
    </div>
  );
}
