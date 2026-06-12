import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Trophy, Flame } from "lucide-react";
import {
  getSelectedCity,
  subscribeCity,
  type CityKey,
} from "@/lib/cityStore";
import { HUB_BY_CITY } from "@/lib/hubs";

const COMPANIES_POOL = [
  "TCS",
  "Capgemini",
  "Cognizant",
  "Infosys",
  "Wipro",
  "Accenture",
  "HCLTech",
  "Tech Mahindra",
  "Deloitte",
];

// Deterministic hash for a stable per-(zone|company) baseline.
function hash01(s: string, salt = 0) {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return ((h >>> 0) % 100000) / 100000;
}

type ZoneRow = { name: string; score: number };
type CompanyRow = { name: string; score: number };

function sampleZones(city: CityKey, tick: number): ZoneRow[] {
  const hub = HUB_BY_CITY[city];
  const zones = hub?.zones ?? [city];
  return zones
    .map((name, i) => {
      const base = 0.35 + hash01(`${city}:${name}`, 7) * 0.55; // 35–90
      const drift = Math.sin(tick / 6 + i + hash01(name, 3) * 6) * 0.07;
      const jitter = (hash01(name, tick & 0xff) - 0.5) * 0.04;
      const score = Math.max(0.1, Math.min(0.98, base + drift + jitter));
      return { name, score };
    })
    .sort((a, b) => b.score - a.score);
}

function sampleCompanies(city: CityKey, tick: number): CompanyRow[] {
  return COMPANIES_POOL
    .map((name, i) => {
      const base = 0.2 + hash01(`${city}:${name}`, 11) * 0.7;
      const drift = Math.sin(tick / 5 + i * 1.3) * 0.06;
      return { name, score: Math.max(0.05, Math.min(0.99, base + drift)) };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
}

function bandFor(score: number): {
  pct: number;
  emoji: string;
  bar: string;
  glow: string;
  text: string;
} {
  const pct = Math.round(score * 100);
  if (pct >= 80) {
    return {
      pct, emoji: "🔥",
      bar: "from-red-500 via-rose-500 to-red-400",
      glow: "shadow-[0_0_18px_rgba(244,63,94,0.55)]",
      text: "text-red-200",
    };
  }
  if (pct >= 60) {
    return {
      pct, emoji: "⚠️",
      bar: "from-orange-500 via-amber-400 to-orange-400",
      glow: "shadow-[0_0_18px_rgba(251,146,60,0.45)]",
      text: "text-amber-200",
    };
  }
  return {
    pct, emoji: "🟢",
    bar: "from-emerald-500 via-emerald-400 to-emerald-300",
    glow: "shadow-[0_0_14px_rgba(52,211,153,0.4)]",
    text: "text-emerald-200",
  };
}

/**
 * "🏆 Friday's Most Desperate Tech Parks" — ranked burnout index per zone
 * in the active hub, with neon progress bars that breathe every few seconds
 * to feel alive. Bottom panel aggregates a top-3 "fleeing companies" list.
 *
 * Telemetry is client-simulated (deterministic per zone + sinusoidal drift)
 * so the leaderboard never goes blank for hubs without realtime data yet.
 */
export default function BurnoutLeaderboard() {
  const [city, setCity] = useState<CityKey>("Bangalore");
  const [tick, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setCity(getSelectedCity());
    return subscribeCity(setCity);
  }, []);

  useEffect(() => {
    intervalRef.current = setInterval(() => setTick((t) => t + 1), 2500);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, []);

  const zones = useMemo(() => sampleZones(city, tick), [city, tick]);
  const companies = useMemo(() => sampleCompanies(city, tick), [city, tick]);

  return (
    <Card
      className="p-4"
      style={{
        background: "rgba(24, 20, 20, 0.65)",
        border: "1px solid rgba(255, 255, 255, 0.06)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-bold flex items-center gap-1.5">
          <Trophy className="size-4 text-amber-300" />
          <span>Friday's Most Desperate Tech Parks</span>
        </h4>
        <span className="text-[9px] uppercase tracking-wider text-amber-300/70 font-bold flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
          Live · 4 h
        </span>
      </div>

      <ol className="space-y-2.5">
        {zones.map((z, i) => {
          const band = bandFor(z.score);
          return (
            <li key={z.name} className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[12px] font-semibold truncate flex items-center gap-1.5">
                  <span className="text-[10px] font-bold text-muted-foreground tabular-nums w-3">{i + 1}</span>
                  {z.name}
                </span>
                <span className={`text-[11px] font-extrabold tabular-nums ${band.text}`}>
                  {band.emoji} {band.pct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-zinc-800/80 overflow-hidden">
                <div
                  className={`h-full rounded-full bg-gradient-to-r ${band.bar} ${band.glow} transition-all duration-700 ease-out`}
                  style={{ width: `${band.pct}%` }}
                />
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-4 pt-3 border-t border-white/5">
        <div className="text-[10px] uppercase tracking-wider font-bold text-fuchsia-300/80 mb-2 flex items-center gap-1">
          <Flame className="size-3" /> Top Fleeing Companies Right Now
        </div>
        <ol className="grid grid-cols-3 gap-1.5">
          {companies.map((c, i) => (
            <li
              key={c.name}
              className="rounded-md border border-fuchsia-400/20 bg-fuchsia-500/10 px-2 py-1.5 text-center transition-all duration-500"
            >
              <div className="text-[9px] uppercase tracking-wider text-fuchsia-200/70 font-bold">#{i + 1}</div>
              <div className="text-[11px] font-extrabold text-fuchsia-100 truncate">{c.name}</div>
              <div className="text-[10px] text-fuchsia-200/80 tabular-nums">
                {Math.round(c.score * 100)}%
              </div>
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}
