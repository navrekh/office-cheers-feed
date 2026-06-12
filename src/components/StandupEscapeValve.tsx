import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { useDayContext } from "@/lib/dailyMatrix";

const BUZZWORDS = [
  "Circle back", "Bandwidth", "Leverage", "AI-driven", "OKRs",
  "Synergy", "Low-hanging fruit", "Move the needle", "Touch base",
];

const WIN_LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];

function todayKey(): string {
  return new Date().toISOString().slice(0, 10);
}

function isWin(c: boolean[]): boolean {
  return WIN_LINES.some((l) => l.every((i) => c[i]));
}

export default function StandupEscapeValve({
  isAuthenticated,
  onSignUp,
}: {
  isAuthenticated: boolean;
  onSignUp: (reason?: string) => void;
}) {
  const ctx = useDayContext();
  const [expanded, setExpanded] = useState(false);
  const [checked, setChecked] = useState<boolean[]>(() => Array(9).fill(false));
  const [streak, setStreak] = useState(0);
  const [won, setWon] = useState(false);
  const [promptedAuth, setPromptedAuth] = useState(false);

  // The widget is "in window" Mon–Fri between 09:30 and 11:00 local. Outside
  // that, render as a 1-line teaser so it doesn't dominate the feed.
  const inWindow =
    ctx.weekday >= 1 && ctx.weekday <= 5 &&
    ((ctx.hour === 9 && ctx.minute >= 30) || ctx.hour === 10 ||
      (ctx.hour === 11 && ctx.minute === 0));

  useEffect(() => {
    try {
      const stored = localStorage.getItem(`drinkedin.standupBingo.${todayKey()}`);
      if (stored) {
        const parsed = JSON.parse(stored) as boolean[];
        if (Array.isArray(parsed) && parsed.length === 9) {
          setChecked(parsed);
          setExpanded(parsed.some(Boolean));
        }
      }
      const s = localStorage.getItem("drinkedin.standupBingo.streak");
      if (s) setStreak(Number(s));
    } catch { /* ignore */ }
  }, []);

  function persist(next: boolean[]) {
    try {
      localStorage.setItem(`drinkedin.standupBingo.${todayKey()}`, JSON.stringify(next));
    } catch { /* ignore */ }
  }

  function toggle(i: number) {
    setChecked((prev) => {
      const next = prev.map((v, idx) => (idx === i ? !v : v));
      persist(next);
      if (!won && isWin(next)) {
        setWon(true);
        const last = (() => { try { return localStorage.getItem("drinkedin.standupBingo.streak.lastDay"); } catch { return null; } })();
        const t = todayKey();
        const nextStreak = last === t ? streak : streak + 1;
        setStreak(nextStreak);
        try {
          localStorage.setItem("drinkedin.standupBingo.streak", String(nextStreak));
          localStorage.setItem("drinkedin.standupBingo.streak.lastDay", t);
        } catch { /* ignore */ }
        if (!isAuthenticated && !promptedAuth) {
          setPromptedAuth(true);
          setTimeout(() => onSignUp("Lock in my global slacker streak leaderboard position."), 400);
        }
      }
      return next;
    });
  }

  function start() {
    setExpanded(true);
    if (!checked.some(Boolean)) {
      const first = Array(9).fill(false);
      first[4] = true; // free center tile — feels good.
      setChecked(first);
      persist(first);
    }
  }

  if (!inWindow && !expanded) {
    // Compact teaser outside the standup window.
    return (
      <Card className="p-3 border-border bg-muted/20 flex items-center justify-between gap-3">
        <div className="text-[11px] leading-snug">
          <span className="font-bold">☕ Standup Escape Valve</span>{" "}
          <span className="text-muted-foreground">— opens weekdays 09:30–11:00 local.</span>
        </div>
        <span className="text-[10px] text-muted-foreground shrink-0">🔥 {streak}d</span>
      </Card>
    );
  }

  return (
    <Card className="p-4 border-border relative overflow-hidden bg-gradient-to-br from-emerald-500/[0.06] via-card to-cyan-500/[0.04]">
      <div className="flex items-center justify-between gap-2 mb-2.5">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-emerald-300/90 font-bold">
            ☕ The 10 AM Standup Escape Valve
          </div>
          <div className="text-[11px] text-muted-foreground">
            One click per buzzword. Win the row, win the day.
          </div>
        </div>
        <div className="text-right">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Streak</div>
          <div className="text-sm font-black text-emerald-300">🔥 {streak}d</div>
        </div>
      </div>

      {!expanded ? (
        <button
          type="button"
          onClick={start}
          className="w-full py-3 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-black text-sm shadow-[0_8px_24px_-8px_rgba(16,185,129,0.6)] transition-all hover:scale-[1.01] active:scale-[0.99]"
        >
          🛎️ BINGO! My manager just said a buzzword.
        </button>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-1.5">
            {BUZZWORDS.map((word, i) => {
              const on = checked[i];
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => toggle(i)}
                  className={`aspect-square rounded-md border text-[10px] leading-tight p-1.5 text-center font-semibold transition-all ${
                    on
                      ? "border-emerald-400 bg-emerald-400/15 text-foreground shadow-[0_0_10px_rgba(16,185,129,0.45)] scale-[0.97]"
                      : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground active:scale-95"
                  }`}
                >
                  <span className={on ? "line-through decoration-emerald-300" : ""}>{word}</span>
                </button>
              );
            })}
          </div>
          {won && (
            <div className="mt-3 rounded-md border border-emerald-400/60 bg-emerald-400/10 px-3 py-2 text-[11px] leading-snug animate-fade-in">
              🎉 <span className="font-bold text-emerald-300">BINGO!</span>{" "}
              {isAuthenticated
                ? `Streak +1 — you've survived ${streak} standups in a row.`
                : "Lock in your spot on the global slacker leaderboard with 1-click sign-in."}
            </div>
          )}
        </>
      )}
    </Card>
  );
}
