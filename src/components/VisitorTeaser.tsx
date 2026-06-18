import { useMemo } from "react";
import { Link } from "@tanstack/react-router";
import { Eye, Radio, ArrowRight } from "lucide-react";

// Lightweight, deterministic "who decoded your dossier" tease for the
// home feed. Drives curiosity → click → /profile (My Badge) → full log.
// Anonymity is preserved: handles are spy aliases, not real users.

const SPY_HANDLES = [
  "Anon_VP_Compliance",
  "Stealth_ScrumMaster",
  "Incognito_HR_Lead",
  "Deploys_On_Friday",
  "Burnt_Toast_PM",
  "OKR_Ghost_Q4",
  "Shadow_Director_03",
  "Cubicle_Confessor_11",
  "Layoff_Lottery_22",
  "Slack_DM_Therapist",
  "TownHall_Survivor",
  "Friday_Deploy_Diva",
  "ExFAANG_Now_Indie",
  "Mute_Button_MVP",
  "Bench_Warmer_Bro",
];

const VECTORS = [
  "Silicon Valley proxy",
  "London · Canary Wharf",
  "Bangalore · Manyata",
  "Seattle · AWS egress",
  "Berlin tech hub",
  "Singapore · Marina Bay",
  "Tokyo Midtown",
  "Dublin Docklands",
  "Sydney CBD",
  "Pune · Hinjawadi",
];

function hashSeed(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619) >>> 0;
  return h >>> 0;
}
function rng(seed: number) {
  let s = seed || 1;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0xffffffff;
  };
}

export function VisitorTeaser({ userId }: { userId: string }) {
  // Re-roll every ~10 min so the feed feels alive without thrashing
  const bucket = Math.floor(Date.now() / (10 * 60 * 1000));
  const { count, recent } = useMemo(() => {
    const r = rng(hashSeed(`${userId}|visits|${bucket}`));
    const c = 3 + Math.floor(r() * 6); // 3-8 spies today
    const recent = Array.from({ length: 2 }).map(() => ({
      handle: SPY_HANDLES[Math.floor(r() * SPY_HANDLES.length)],
      vector: VECTORS[Math.floor(r() * VECTORS.length)],
      mins: 1 + Math.floor(r() * 55),
    }));
    return { count: c, recent };
  }, [userId, bucket]);

  return (
    <Link
      to="/profile"
      className="group block overflow-hidden rounded-2xl border border-amber-500/30 bg-gradient-to-br from-zinc-950 via-zinc-950 to-black shadow-[0_0_40px_-12px_rgba(245,158,11,0.35)] transition hover:border-amber-400/60 hover:shadow-[0_0_60px_-12px_rgba(245,158,11,0.6)]"
    >
      <div className="flex items-center justify-between gap-3 border-b border-amber-500/15 bg-black/60 px-4 py-2">
        <div className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.22em] text-amber-400">
          <Eye className="h-3.5 w-3.5" />
          Dossier Reconnaissance · Last 24h
        </div>
        <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest text-emerald-400/80">
          <Radio className="h-2.5 w-2.5 animate-pulse" /> live
        </span>
      </div>

      <div className="grid gap-4 px-4 py-4 sm:grid-cols-[auto,1fr,auto] sm:items-center sm:px-5">
        <div className="flex items-center gap-3">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-lg border border-amber-500/40 bg-amber-500/10 text-2xl font-black tabular-nums text-amber-300 shadow-[inset_0_0_20px_rgba(245,158,11,0.2)]">
            {count}
          </div>
          <div className="leading-tight">
            <div className="text-sm font-extrabold text-amber-100">
              spies decoded your dossier
            </div>
            <div className="mt-0.5 text-[11px] text-zinc-400">
              tap to unmask the interception log
            </div>
          </div>
        </div>

        <ul className="min-w-0 space-y-1 border-t border-amber-500/10 pt-3 font-mono text-[11px] sm:border-l sm:border-t-0 sm:pl-4 sm:pt-0">
          {recent.map((r, i) => (
            <li key={i} className="flex items-center gap-2 truncate">
              <span className="text-emerald-400/70">◉</span>
              <span className="truncate font-bold text-amber-200">{r.handle}</span>
              <span className="truncate text-zinc-500">· {r.vector}</span>
              <span className="ml-auto shrink-0 text-amber-400/60 tabular-nums">{r.mins}m</span>
            </li>
          ))}
        </ul>

        <span className="hidden shrink-0 items-center gap-1 self-center rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-amber-300 transition group-hover:bg-amber-500/20 sm:inline-flex">
          See all <ArrowRight className="h-3 w-3 transition group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
