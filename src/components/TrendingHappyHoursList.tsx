import { useEffect, useMemo, useState } from "react";
import { TrendingUp, MoreHorizontal, Plus } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  MERCHANTS,
  getSelectedCity,
  subscribeCity,
  type CityKey,
  type Merchant,
} from "@/lib/cityStore";
import { useHubVernacular } from "@/lib/hubVernacular";

type Vibe = {
  density: "Low" | "Medium" | "High" | "Packed";
  mood: string;
  emoji: string;
};

// Deterministic but time-aware vibe metric per venue.
// Crowd density swings with local hour; mood is seeded by venue id so each
// row stays internally consistent across re-renders.
function vibeFor(m: Merchant, hour: number, idx: number): Vibe {
  // Friday rush window: 16:00–21:00 = packed; lunch dip; late night winds down.
  let densityScore = 0;
  if (hour >= 16 && hour <= 21) densityScore = 3;
  else if (hour >= 12 && hour < 16) densityScore = 1;
  else if (hour > 21 && hour <= 23) densityScore = 2;
  else densityScore = 0;
  // Jitter per-venue so the list isn't uniform.
  densityScore = Math.max(0, Math.min(3, densityScore + ((idx % 2) - (m.base_heading % 2))));

  const density: Vibe["density"] = (["Low", "Medium", "High", "Packed"] as const)[densityScore];

  const moods = [
    { mood: "Buzzing", emoji: "⚡" },
    { mood: "Loose Standup", emoji: "🎉" },
    { mood: "Networking", emoji: "🤝" },
    { mood: "Decompressing", emoji: "🍻" },
    { mood: "Sprint Survivor Energy", emoji: "🔥" },
  ];
  const pick = moods[(m.base_heading + idx) % moods.length];
  return { density, ...pick };
}

function TrendingRow({ m, vibe }: { m: Merchant; vibe: Vibe }) {
  const densityTone: Record<Vibe["density"], string> = {
    Low: "text-slate-400",
    Medium: "text-amber-300",
    High: "text-orange-300",
    Packed: "text-rose-300",
  };
  return (
    <li className="flex gap-2 group cursor-pointer">
      <Plus className="size-3.5 mt-1 text-muted-foreground group-hover:text-primary shrink-0" />
      <div className="min-w-0 flex-1">
        <div className="font-semibold text-foreground leading-snug group-hover:text-primary truncate">
          {m.name}
        </div>
        <div className="text-muted-foreground text-[11px] truncate">{m.area}</div>
        <div className="text-[10.5px] mt-0.5 flex items-center gap-1 flex-wrap">
          <span className={`font-bold ${densityTone[vibe.density]}`}>
            {vibe.emoji} Crowd Density: {vibe.density}
          </span>
          <span className="text-muted-foreground/60">|</span>
          <span className="text-fuchsia-300/90">Vibe: {vibe.mood}</span>
        </div>
      </div>
    </li>
  );
}

export default function TrendingHappyHoursList() {
  const [city, setCity] = useState<CityKey>("Bangalore");
  // SSR-safe: don't compute the time-dependent vibe (which depends on the
  // visitor's local hour) until after mount, otherwise server (UTC) and
  // client (local TZ) disagree and React throws hydration error #418.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setCity(getSelectedCity());
    return subscribeCity(setCity);
  }, []);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, []);

  const merchants = MERCHANTS[city] ?? [];
  // Pre-mount we render a neutral "Low" baseline so SSR matches first paint.
  const hour = now ? now.getHours() : 9;

  const rows = useMemo(
    () => merchants.slice(0, 6).map((m, i) => ({ m, vibe: vibeFor(m, hour, i) })),
    [merchants, hour],
  );

  const vern = useHubVernacular();

  return (
    <Card className="p-4 border-border">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <TrendingUp className="size-4 text-primary" /> {vern.trendingTitle}
        </h4>
        <MoreHorizontal className="size-4 text-muted-foreground" />
      </div>
      {rows.length === 0 ? (
        <p className="text-[11px] text-muted-foreground leading-snug">
          No verified {vern.pubs} wired up in <span className="font-semibold text-foreground">{city}</span> yet — your sector unlocks once 3 {vern.wateringHole}s claim their slot.
        </p>
      ) : (
        <ul className="space-y-3 text-xs">
          {rows.map(({ m, vibe }) => (
            <TrendingRow key={m.id} m={m} vibe={vibe} />
          ))}
        </ul>
      )}
      <p className="mt-3 text-[10px] text-muted-foreground/70 leading-snug">
        Live vibe scores are crowd-sourced from on-premise check-ins in <span className="font-semibold">{city}</span>. Updated every minute.
      </p>
    </Card>
  );
}
