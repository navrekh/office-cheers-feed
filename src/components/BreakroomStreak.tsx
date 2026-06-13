import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import { toast } from "sonner";

const KEY = "drinkedin.streak.v1";

type StreakState = {
  count: number;
  lastDay: string; // YYYY-MM-DD local
};

function todayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayDiff(a: string, b: string): number {
  const da = new Date(a + "T00:00:00").getTime();
  const db = new Date(b + "T00:00:00").getTime();
  return Math.round((db - da) / 86400000);
}

function load(): StreakState {
  if (typeof window === "undefined") return { count: 0, lastDay: "" };
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { count: 0, lastDay: "" };
}

export default function BreakroomStreak() {
  const [state, setState] = useState<StreakState>({ count: 0, lastDay: "" });
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const prev = load();
    const today = todayKey();
    let next: StreakState;
    if (!prev.lastDay) {
      next = { count: 1, lastDay: today };
    } else {
      const diff = dayDiff(prev.lastDay, today);
      if (diff === 0) {
        next = prev;
      } else if (diff === 1) {
        next = { count: prev.count + 1, lastDay: today };
        setTimeout(() => {
          toast.success(`🔥 Breakroom streak: Day ${next.count}`, {
            description: "Welcome back. The grind continues — anonymously.",
          });
        }, 1200);
      } else {
        // Streak broken
        next = { count: 1, lastDay: today };
        if (prev.count >= 3) {
          setTimeout(() => {
            toast(`💔 Streak reset (was ${prev.count}d)`, {
              description: "Took a break? Respect. Day 1 starts now.",
            });
          }, 1200);
        }
      }
    }
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
    setState(next);
    setPulse(true);
    const id = setTimeout(() => setPulse(false), 2400);
    return () => clearTimeout(id);
  }, []);

  if (state.count < 1) return null;

  const isHot = state.count >= 7;
  const isLegend = state.count >= 30;

  return (
    <button
      type="button"
      onClick={() =>
        toast(`🔥 ${state.count}-day breakroom streak`, {
          description: isLegend
            ? "Legendary status. You haven't worked a real day in a month."
            : isHot
              ? "You're a regular. The barkeep knows your usual."
              : "Keep showing up. The breakroom never closes.",
        })
      }
      title={`Day ${state.count} streak`}
      aria-label={`Breakroom streak: ${state.count} days`}
      className={`fixed z-40 bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full pl-2 pr-2.5 py-1 text-[11px] font-extrabold border backdrop-blur-md shadow-lg transition select-none ${
        isLegend
          ? "border-amber-400/60 bg-amber-400/15 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.45)]"
          : isHot
            ? "border-orange-500/50 bg-orange-500/15 text-orange-200 shadow-[0_0_14px_rgba(249,115,22,0.35)]"
            : "border-[#2b2b2b] bg-black/70 text-foreground/85"
      } ${pulse ? "animate-pulse" : ""}`}
    >
      <Flame className={`size-3 ${isHot ? "text-orange-300" : "text-muted-foreground"}`} />
      <span className="tabular-nums">{state.count}d</span>
      <span className="hidden sm:inline text-[9px] uppercase tracking-wider opacity-70">streak</span>
    </button>
  );
}
