import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { trackEngagement } from "@/lib/analytics";

type Choice = "danger" | "thread" | "chill";

const OPTIONS: Array<{
  key: Choice;
  emoji: string;
  label: string;
  sub: string;
  accent: string; // tailwind color classes for ring/fill
  bar: string;
}> = [
  {
    key: "danger",
    emoji: "🔴",
    label: "Danger Zone",
    sub: "Ready to bolt",
    accent:
      "border-red-400/40 bg-red-500/10 text-red-100 hover:bg-red-500/20 hover:border-red-300/70 shadow-[0_0_18px_rgba(248,113,113,0.25)]",
    bar: "from-red-500 to-rose-400",
  },
  {
    key: "thread",
    emoji: "🟡",
    label: "Hanging by a thread",
    sub: "One more meeting and I'm gone",
    accent:
      "border-amber-400/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20 hover:border-amber-300/70 shadow-[0_0_18px_rgba(251,191,36,0.25)]",
    bar: "from-amber-400 to-yellow-300",
  },
  {
    key: "chill",
    emoji: "🟢",
    label: "Chilling",
    sub: "Manager is away",
    accent:
      "border-emerald-400/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20 hover:border-emerald-300/70 shadow-[0_0_18px_rgba(16,185,129,0.25)]",
    bar: "from-emerald-400 to-teal-300",
  },
];

const STORE_KEY = "drinkedin.desperationPoll.v1";

type Stored = { choice: Choice; ts: number };

function loadStored(): Stored | null {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (Date.now() - parsed.ts > 12 * 3600 * 1000) return null;
    return parsed;
  } catch {
    return null;
  }
}

export default function DesperationPoll({ onSignUp }: { onSignUp: () => void }) {
  const [choice, setChoice] = useState<Choice | null>(null);

  // Seed deterministic-but-fresh baseline counts so the bars look alive.
  const [counts, setCounts] = useState<Record<Choice, number>>(() => ({
    danger: 188,
    thread: 142,
    chill: 71,
  }));

  // Hydrate prior vote from localStorage on mount.
  useEffect(() => {
    const stored = loadStored();
    if (stored) {
      setChoice(stored.choice);
      setCounts((prev) => ({ ...prev, [stored.choice]: prev[stored.choice] + 1 }));
    }
  }, []);

  // Simulated live drip while the user is watching the results.
  useEffect(() => {
    if (!choice) return;
    const id = setInterval(() => {
      setCounts((prev) => {
        const next = { ...prev };
        const keys: Choice[] = ["danger", "thread", "chill"];
        // Bias toward "danger" + "thread" — it's Friday after all.
        const weights = [0.55, 0.3, 0.15];
        const r = Math.random();
        const k = r < weights[0] ? keys[0] : r < weights[0] + weights[1] ? keys[1] : keys[2];
        next[k] = next[k] + 1;
        return next;
      });
    }, 2200);
    return () => clearInterval(id);
  }, [choice]);

  const total = useMemo(() => counts.danger + counts.thread + counts.chill, [counts]);

  function vote(opt: Choice) {
    setChoice(opt);
    setCounts((prev) => ({ ...prev, [opt]: prev[opt] + 1 }));
    try { localStorage.setItem(STORE_KEY, JSON.stringify({ choice: opt, ts: Date.now() } as Stored)); } catch { /* ignore */ }
    trackEngagement("desperation_poll_vote", { choice: opt });
  }

  function handleSignUp() {
    trackEngagement("desperation_poll_signup_click", { choice: choice ?? "none" });
    onSignUp();
  }

  return (
    <Card className="p-5 border-border animate-fade-in">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-200/90">
            📊 Today's Desperation Index
          </h3>
          <p className="mt-1 text-[13px] text-foreground/85 leading-snug">
            How close are you to slamming your laptop and heading out?
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-mono uppercase tracking-wider text-emerald-300/90 border border-emerald-500/30 rounded-full px-2 py-0.5">
          Live · {total.toLocaleString()} votes
        </span>
      </div>

      {!choice && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 animate-fade-in">
          {OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => vote(opt.key)}
              className={`group flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition hover-scale ${opt.accent}`}
            >
              <span className="text-2xl leading-none">{opt.emoji}</span>
              <span className="text-[13px] font-bold leading-tight">{opt.label}</span>
              <span className="text-[11px] opacity-80 leading-snug">{opt.sub}</span>
            </button>
          ))}
        </div>
      )}

      {choice && (
        <div className="space-y-2 animate-fade-in">
          {OPTIONS.map((opt) => {
            const value = counts[opt.key];
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            const mine = opt.key === choice;
            return (
              <div key={opt.key} className="space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className={`font-semibold ${mine ? "text-foreground" : "text-muted-foreground"}`}>
                    <span className="mr-1">{opt.emoji}</span>
                    {opt.label}
                    {mine && <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-300">Your pick</span>}
                  </span>
                  <span className="tabular-nums font-mono text-[11px] text-muted-foreground">
                    {pct}% · {value.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${opt.bar} transition-[width] duration-700 ease-out ${mine ? "shadow-[0_0_12px_rgba(251,191,36,0.45)]" : ""}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}

          <button
            type="button"
            onClick={handleSignUp}
            className="mt-3 w-full text-left rounded-lg border border-amber-400/30 bg-amber-500/10 hover:bg-amber-500/15 hover:border-amber-300/60 transition px-3 py-2.5 text-[12px] leading-snug text-amber-100/95"
          >
            🔗 <span className="font-bold">402 techies in your sector</span> are actively escaping right now.{" "}
            <span className="underline decoration-amber-300/60 underline-offset-2">Tap here to drop an anonymous confession</span>{" "}
            <span className="text-amber-200/75">(1-Click Google Sign-In)</span>
          </button>
        </div>
      )}
    </Card>
  );
}
