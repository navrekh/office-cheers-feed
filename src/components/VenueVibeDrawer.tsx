import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Props = {
  dealId: string | null | undefined;
  userId: string | null | undefined;
  initial?: { crowd?: number; noise?: number; vibe?: number } | null;
};

const SLIDERS = [
  {
    key: "crowd" as const,
    title: "Crowd Scale",
    left: "Ghost Town 🏜️",
    right: "Standing Room Only 🔥",
    accent: "amber" as const,
  },
  {
    key: "noise" as const,
    title: "Acoustics",
    left: "Silent Cubicle 🤫",
    right: "Concert Front Row 🎸",
    accent: "fuchsia" as const,
  },
  {
    key: "vibe" as const,
    title: "Scene Vibe",
    left: "Solemn Networking 👔",
    right: "Absolute De-stress Party 🍻",
    accent: "cyan" as const,
  },
];

const ACCENT_CLASSES: Record<"amber" | "fuchsia" | "cyan", string> = {
  amber: "accent-amber-400",
  fuchsia: "accent-fuchsia-400",
  cyan: "accent-cyan-400",
};

/**
 * Geofence-gated slider drawer. The parent decides whether to render
 * this (only when the viewer is verified at_venue for `dealId`).
 * Sliders write [0,1] floats and debounce writes through the
 * `submit_venue_vibe` RPC at 300 ms.
 */
export default function VenueVibeDrawer({ dealId, userId, initial }: Props) {
  const [crowd, setCrowd] = useState(initial?.crowd ?? 0.5);
  const [noise, setNoise] = useState(initial?.noise ?? 0.5);
  const [vibe, setVibe]   = useState(initial?.vibe  ?? 0.5);
  const [pending, setPending] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent = useRef<string>("");

  // Debounced submit. We bundle all three values per ping — backend
  // averages each one independently.
  useEffect(() => {
    if (!dealId || !userId) return;
    const sig = `${crowd.toFixed(3)}|${noise.toFixed(3)}|${vibe.toFixed(3)}`;
    if (sig === lastSent.current) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setPending(true);
      try {
        const { error } = await (supabase as any).rpc("submit_venue_vibe", {
          p_deal_id: dealId,
          p_crowd: crowd,
          p_noise: noise,
          p_vibe: vibe,
        });
        if (error) throw error;
        lastSent.current = sig;
      } catch (err: any) {
        // Surface a brief toast; don't spam on every keystroke.
        toast.error("Vibe ping rejected", { description: err?.message ?? "Are you still at the venue?" });
      } finally {
        setPending(false);
      }
    }, 300);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [crowd, noise, vibe, dealId, userId]);

  if (!dealId || !userId) return null;

  const values = { crowd, noise, vibe } as const;
  const setters: Record<"crowd" | "noise" | "vibe", (n: number) => void> = {
    crowd: setCrowd, noise: setNoise, vibe: setVibe,
  };

  return (
    <div className="mx-3 mb-3 mt-2 rounded-lg border border-emerald-400/40 bg-zinc-950/85 backdrop-blur px-3 py-2.5 shadow-[0_0_24px_rgba(16,185,129,0.18)] animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-200">
          🟢 Verified inside · Submit a vibe ping
        </span>
        <span className="text-[9px] text-emerald-300/70 font-mono">
          {pending ? "syncing…" : "auto-saves"}
        </span>
      </div>
      <div className="space-y-2">
        {SLIDERS.map((s) => (
          <div key={s.key} className="space-y-1">
            <div className="flex items-center justify-between text-[9px] uppercase tracking-wider font-bold text-zinc-300">
              <span>{s.title}</span>
              <span className="font-mono tabular-nums text-zinc-400">{Math.round(values[s.key] * 100)}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={Math.round(values[s.key] * 100)}
              onChange={(e) => setters[s.key](Number(e.target.value) / 100)}
              className={`w-full h-1.5 ${ACCENT_CLASSES[s.accent]} cursor-pointer`}
              aria-label={s.title}
            />
            <div className="flex justify-between text-[9px] text-zinc-500">
              <span>{s.left}</span>
              <span>{s.right}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
