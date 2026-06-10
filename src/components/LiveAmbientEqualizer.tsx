import { useEffect, useState } from "react";

type Props = {
  crowd?: number | null;
  noise?: number | null;
  vibe?: number | null;
  /** Compact card-corner version */
  compact?: boolean;
  /** Hide the "Happening Right Now" overlay even if hot */
  hideHotBadge?: boolean;
  className?: string;
};

const TRACKS = [
  { key: "crowd", label: "Crowd", icon: "👥", color: "amber" as const },
  { key: "noise", label: "Noise", icon: "🔊", color: "fuchsia" as const },
  { key: "vibe",  label: "Vibe",  icon: "🍻", color: "cyan" as const },
];

const COLOR_MAP: Record<"amber" | "fuchsia" | "cyan", { bar: string; glow: string; text: string }> = {
  amber:   { bar: "from-amber-400 to-amber-600",     glow: "rgba(251,191,36,0.7)",  text: "text-amber-200" },
  fuchsia: { bar: "from-fuchsia-400 to-fuchsia-600", glow: "rgba(232,121,249,0.7)", text: "text-fuchsia-200" },
  cyan:    { bar: "from-cyan-400 to-cyan-600",       glow: "rgba(34,211,238,0.7)",  text: "text-cyan-200" },
};

/**
 * Mini live equalizer rendering crowd / noise / vibe averages as
 * pulsing neon bars. Each bar is height-driven by its 0–1 value and
 * subtly animates around that target to feel alive.
 */
export default function LiveAmbientEqualizer({
  crowd, noise, vibe, compact, hideHotBadge, className,
}: Props) {
  const c = clamp01(crowd);
  const n = clamp01(noise);
  const v = clamp01(vibe);
  const values: Record<string, number> = { crowd: c, noise: n, vibe: v };
  const hot = c >= 0.8 && n >= 0.8;

  // Tiny ambient jitter so the bars "bounce".
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setPulse((p) => (p + 1) % 1000), 420);
    return () => clearInterval(id);
  }, []);

  const trackH = compact ? 28 : 44;

  return (
    <div className={`relative ${className ?? ""}`}>
      <div
        className={`flex items-end gap-1.5 px-2 py-2 rounded-md border bg-zinc-950/70 ${
          hot ? "border-rose-400/60 shadow-[0_0_22px_rgba(244,63,94,0.55)] animate-pulse" : "border-amber-400/20"
        }`}
      >
        {TRACKS.map((t, idx) => {
          const target = values[t.key];
          // Light jitter that scales with the value (silence stays silent).
          const jitter = ((Math.sin((pulse + idx * 7) * 0.9) + 1) / 2) * target * 0.12;
          const pct = Math.max(0.04, Math.min(1, target + jitter));
          const col = COLOR_MAP[t.color];
          return (
            <div key={t.key} className="flex flex-col items-center gap-0.5" style={{ width: compact ? 14 : 18 }}>
              <div
                className="w-full rounded-sm bg-zinc-800/80 border border-zinc-700/70 overflow-hidden flex items-end"
                style={{ height: trackH }}
              >
                <div
                  className={`w-full bg-gradient-to-t ${col.bar} transition-[height] duration-300 ease-out`}
                  style={{
                    height: `${pct * 100}%`,
                    boxShadow: `0 0 10px ${col.glow}, inset 0 0 6px ${col.glow}`,
                  }}
                />
              </div>
              {!compact && (
                <span className={`text-[8px] uppercase tracking-wider font-bold ${col.text}`} aria-hidden>
                  {t.icon}
                </span>
              )}
            </div>
          );
        })}
        {!compact && (
          <div className="ml-2 flex flex-col gap-0.5 text-[9px] font-mono tabular-nums leading-tight">
            <span className="text-amber-200/80">crowd {(c * 100).toFixed(0)}%</span>
            <span className="text-fuchsia-200/80">noise {(n * 100).toFixed(0)}%</span>
            <span className="text-cyan-200/80">vibe  {(v * 100).toFixed(0)}%</span>
          </div>
        )}
      </div>
      {hot && !hideHotBadge && (
        <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-rose-500 text-white shadow-[0_0_14px_rgba(244,63,94,0.85)] animate-pulse">
          🔥 Happening Right Now
        </span>
      )}
    </div>
  );
}

function clamp01(n: number | null | undefined): number {
  if (n == null || Number.isNaN(n)) return 0;
  return Math.max(0, Math.min(1, n));
}
