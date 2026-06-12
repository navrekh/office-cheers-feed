import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { trackEngagement } from "@/lib/analytics";
import { useAuth } from "@/lib/useAuth";
import { useCurrentCity } from "@/lib/useCurrentCity";

type Tone = "danger" | "thread" | "chill";

type PollChoice = {
  key: Tone;
  emoji: string;
  label: string;
  accent: string;
  bar: string;
};

type Poll = {
  id: string;
  question: string;
  choices: PollChoice[];
};

const TONE_STYLE: Record<Tone, { accent: string; bar: string; emoji: string }> = {
  danger: {
    emoji: "🔴",
    accent:
      "border-red-400/40 bg-red-500/10 text-red-100 hover:bg-red-500/20 hover:border-red-300/70 shadow-[0_0_18px_rgba(248,113,113,0.25)]",
    bar: "from-red-500 to-rose-400",
  },
  thread: {
    emoji: "🟡",
    accent:
      "border-amber-400/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20 hover:border-amber-300/70 shadow-[0_0_18px_rgba(251,191,36,0.25)]",
    bar: "from-amber-400 to-yellow-300",
  },
  chill: {
    emoji: "🟢",
    accent:
      "border-emerald-400/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20 hover:border-emerald-300/70 shadow-[0_0_18px_rgba(16,185,129,0.25)]",
    bar: "from-emerald-400 to-teal-300",
  },
};

function makeChoice(key: Tone, label: string): PollChoice {
  const s = TONE_STYLE[key];
  return { key, emoji: s.emoji, label, accent: s.accent, bar: s.bar };
}

const POLLS: Poll[] = [
  {
    id: "friday_huddle",
    question:
      "Your manager asks for a 'quick 5-minute huddle' at 4:45 PM on a Friday. What's your move?",
    choices: [
      makeChoice("danger", "Fake a sudden internet outage"),
      makeChoice("thread", "Accept and cry silently with camera off"),
      makeChoice("chill", "Press the Panic Button and run"),
    ],
  },
  {
    id: "buzzword_rage",
    question:
      "Which corporate synergy buzzword makes you want to throw your laptop into a lake?",
    choices: [
      makeChoice("danger", "'Let's circle back & align'"),
      makeChoice("thread", "'Let's take this offline'"),
      makeChoice("chill", "'Let's maximize our bandwidth'"),
    ],
  },
  {
    id: "standup_waste",
    question:
      "What percentage of your daily standup could have been a 2-line Slack message?",
    choices: [
      makeChoice("danger", "80% (Absolute waste of time)"),
      makeChoice("thread", "100% (Could've been an email)"),
      makeChoice("chill", "120% (It actively hurt my brain)"),
    ],
  },
  {
    id: "battery_life",
    question: "Current state of your corporate battery life right now:",
    choices: [
      makeChoice("danger", "1% (Running on pure dark humor)"),
      makeChoice("thread", "Critical Saver Mode"),
      makeChoice("chill", "Completely fried"),
    ],
  },
];

const VOTED_KEY = (pollId: string) => `drinkedin_voted_poll_${pollId}`;

// Deterministic pseudo-random per pollId+hub so the % chart feels "localized" but stable.
function hash(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function simulatedCounts(pollId: string, hub: string): Record<Tone, number> {
  const seed = hash(`${pollId}::${hub}`);
  const a = 80 + (seed % 220);
  const b = 60 + ((seed >> 7) % 240);
  const c = 50 + ((seed >> 14) % 260);
  return { danger: a, thread: b, chill: c };
}

export default function DesperationPoll({ onSignUp }: { onSignUp: () => void }) {
  const { user } = useAuth();
  const hub = useCurrentCity();

  const [poll, setPoll] = useState<Poll | null>(null);
  const [choice, setChoice] = useState<Tone | null>(null);
  const [counts, setCounts] = useState<Record<Tone, number>>({
    danger: 0,
    thread: 0,
    chill: 0,
  });

  // Pick a random poll on mount (client-only to avoid SSR hydration drift).
  useEffect(() => {
    const picked = POLLS[Math.floor(Math.random() * POLLS.length)];
    setPoll(picked);
    setCounts(simulatedCounts(picked.id, hub));
    if (typeof window !== "undefined") {
      try {
        const prior = localStorage.getItem(VOTED_KEY(picked.id));
        if (prior === "danger" || prior === "thread" || prior === "chill") {
          setChoice(prior);
        }
      } catch {
        /* ignore */
      }
    }
  }, [hub]);

  const total = useMemo(
    () => counts.danger + counts.thread + counts.chill,
    [counts],
  );

  function vote(opt: Tone) {
    if (!poll || choice) return;
    setChoice(opt);
    setCounts((prev) => ({ ...prev, [opt]: prev[opt] + 1 }));
    try {
      localStorage.setItem(VOTED_KEY(poll.id), opt);
    } catch {
      /* ignore */
    }
    trackEngagement("desperation_poll_vote", {
      poll_id: poll.id,
      choice: opt,
      hub,
    });
  }

  function handleSignUp() {
    trackEngagement("desperation_poll_signup_click", {
      poll_id: poll?.id ?? "none",
      choice: choice ?? "none",
      hub,
    });
    onSignUp();
  }

  return (
    <Card className="p-5 border-border animate-fade-in">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-200/90">
            📊 Today's Desperation Index{" "}
            <span className="text-[10px] text-muted-foreground normal-case tracking-normal">
              · {hub}
            </span>
          </h3>
          <p className="mt-1 text-[13px] text-foreground/85 leading-snug">
            {poll?.question ?? "Loading today's question…"}
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-mono uppercase tracking-wider text-emerald-300/90 border border-emerald-500/30 rounded-full px-2 py-0.5">
          Live · {total.toLocaleString()} votes
        </span>
      </div>

      {poll && !choice && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 animate-fade-in">
          {poll.choices.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => vote(opt.key)}
              className={`group flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition hover-scale ${opt.accent}`}
            >
              <span className="text-2xl leading-none">{opt.emoji}</span>
              <span className="text-[13px] font-bold leading-tight">
                {opt.label}
              </span>
            </button>
          ))}
        </div>
      )}

      {poll && choice && (
        <div className="space-y-2 animate-fade-in">
          {poll.choices.map((opt) => {
            const value = counts[opt.key];
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            const mine = opt.key === choice;
            return (
              <div key={opt.key} className="space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span
                    className={`font-semibold ${
                      mine ? "text-foreground" : "text-muted-foreground"
                    }`}
                  >
                    <span className="mr-1">{opt.emoji}</span>
                    {opt.label}
                    {mine && (
                      <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-300">
                        Your pick
                      </span>
                    )}
                  </span>
                  <span className="tabular-nums font-mono text-[11px] text-muted-foreground">
                    {pct}% · {value.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${opt.bar} transition-[width] duration-700 ease-out ${
                      mine ? "shadow-[0_0_12px_rgba(251,191,36,0.45)]" : ""
                    }`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}

          {!user && (
            <button
              type="button"
              onClick={handleSignUp}
              className="mt-3 w-full text-left rounded-lg border border-amber-400/30 bg-amber-500/10 hover:bg-amber-500/15 hover:border-amber-300/60 transition px-3 py-2.5 text-[12px] leading-snug text-amber-100/95"
            >
              🔗{" "}
              <span className="font-bold">
                Lock your vote on the live leaderboard
              </span>{" "}
              and drop an anonymous confession.{" "}
              <span className="underline decoration-amber-300/60 underline-offset-2">
                Tap to sign in
              </span>{" "}
              <span className="text-amber-200/75">(1-Click Google)</span>
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
