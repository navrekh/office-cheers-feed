import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { useMerchantDeals } from "@/lib/useMerchantDeals";
import { getSelectedCity, subscribeCity, type CityKey } from "@/lib/cityStore";

// Tiny pixel-style avatars rendered as emoji glyphs. Cheap, plays nicely with SSR.
const PERSONAS = ["👨‍💻", "👩‍💻", "🧑‍🎨", "👔", "🧑‍🔧", "👩‍🔬", "🧑‍💼", "🦸"];
const DRINKS = ["🍺", "🍻", "🍷", "🥃", "🍹", "🍸"];

function seatColor(i: number) {
  // Neon palette cycled deterministically
  const palette = [
    "from-amber-400/30 to-amber-600/10",
    "from-fuchsia-400/30 to-fuchsia-600/10",
    "from-cyan-400/30 to-cyan-600/10",
    "from-emerald-400/30 to-emerald-600/10",
    "from-rose-400/30 to-rose-600/10",
  ];
  return palette[i % palette.length];
}

export default function TaproomVisualizer() {
  const [city, setCity] = useState<CityKey>("Bangalore");
  useEffect(() => {
    setCity(getSelectedCity());
    return subscribeCity(setCity);
  }, []);

  const { top } = useMerchantDeals(city);
  const baseCount = top?.heading_there_count ?? 24;
  // Cap how many tiny avatars we render so the bar counter never overflows.
  const seatCount = Math.min(28, Math.max(6, baseCount));

  // Track the previous count to flag NEW arrivals that should bounce-in.
  const prevRef = useRef<number>(seatCount);
  const [newSeats, setNewSeats] = useState<Set<number>>(new Set());
  useEffect(() => {
    const prev = prevRef.current;
    if (seatCount > prev) {
      const fresh = new Set<number>();
      for (let i = prev; i < seatCount; i++) fresh.add(i);
      setNewSeats(fresh);
      const t = setTimeout(() => setNewSeats(new Set()), 900);
      prevRef.current = seatCount;
      return () => clearTimeout(t);
    }
    prevRef.current = seatCount;
  }, [seatCount]);

  const seats = useMemo(
    () =>
      Array.from({ length: seatCount }, (_, i) => ({
        i,
        persona: PERSONAS[i % PERSONAS.length],
        drink: DRINKS[i % DRINKS.length],
      })),
    [seatCount],
  );

  return (
    <Card className="relative overflow-hidden p-0 border-amber-400/30 bg-gradient-to-b from-zinc-950 via-amber-950/40 to-zinc-950 shadow-[0_0_40px_rgba(251,191,36,0.15)]">
      {/* Neon header bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-amber-400/30 bg-amber-500/5">
        <div className="flex items-center gap-2">
          <span
            className="text-[10px] font-black uppercase tracking-[0.25em] text-amber-300"
            style={{ textShadow: "0 0 8px rgba(251,191,36,0.85)" }}
          >
            ◉ Live Taproom
          </span>
          <span className="text-[10px] text-amber-200/70">
            {top?.pub_name ?? "Verified Watering Hole"} · {city}
          </span>
        </div>
        <span className="text-[10px] font-mono text-amber-300/90 tabular-nums">
          {seatCount} seated 🍺
        </span>
      </div>

      {/* Stage area */}
      <div className="relative h-32 px-4">
        {/* Back wall: neon "BAR" sign */}
        <div className="absolute inset-x-0 top-2 flex justify-center pointer-events-none">
          <span
            className="text-[28px] font-black tracking-[0.4em] text-fuchsia-400/70"
            style={{
              textShadow:
                "0 0 8px rgba(232,121,249,0.9), 0 0 22px rgba(232,121,249,0.5)",
            }}
          >
            BAR
          </span>
        </div>

        {/* Avatars row sitting at the counter */}
        <div className="absolute inset-x-3 bottom-7 flex items-end gap-1.5 overflow-x-auto no-scrollbar">
          {seats.map((s) => (
            <div
              key={s.i}
              className="flex flex-col items-center shrink-0"
              style={{
                animation: newSeats.has(s.i)
                  ? "taproom-drop 700ms cubic-bezier(0.34, 1.56, 0.64, 1) both"
                  : undefined,
              }}
            >
              <span className="text-[9px] leading-none mb-0.5" aria-hidden>
                {s.drink}
              </span>
              <div
                className={`size-7 rounded-md grid place-items-center text-[14px] bg-gradient-to-b ${seatColor(s.i)} border border-amber-400/30 shadow-[0_0_6px_rgba(251,191,36,0.4)]`}
              >
                {s.persona}
              </div>
            </div>
          ))}
        </div>

        {/* Bar counter (wood-grain glow) */}
        <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-b from-amber-700/60 to-amber-950 border-t border-amber-400/50 shadow-[0_-6px_18px_rgba(251,191,36,0.25)_inset]" />
      </div>
    </Card>
  );
}
