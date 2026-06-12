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
  {
    id: "eta_panic",
    question:
      "Your manager asks for your 'updated ETA' on a task you started exactly 14 minutes ago. Current status?",
    choices: [
      makeChoice("danger", "Writing a 3-page justification essay"),
      makeChoice("thread", "Intentionally moving Jira tickets back and forth"),
      makeChoice("chill", "Closing laptop to seek immediate sanctuary"),
    ],
  },
  {
    id: "urgent_alignment",
    question:
      "A Friday email arrives titled: 'Urgent Alignment on Cross-Functional Synergies'. Your internal translation?",
    choices: [
      makeChoice("danger", "Someone panicked and scheduled a 2-hour meeting"),
      makeChoice("thread", "My weekend plans are officially under heavy risk"),
      makeChoice("chill", "Mark as read and escape to the nearest brewery"),
    ],
  },
  {
    id: "meeting_overrun",
    question:
      "Primary survival mechanism when a meeting extends 20 minutes past its scheduled end?",
    choices: [
      makeChoice("danger", "Staring blankly at my wallpaper"),
      makeChoice("thread", "Aggressively typing passive-aggressive Slack vents"),
      makeChoice("chill", "Double-clicking the 'Panic Button' for visual peace"),
    ],
  },
  {
    id: "ai_tracking_tool",
    question:
      "Your team adopts a new 'AI-powered productivity tracking tool'. Immediate response?",
    choices: [
      makeChoice("danger", "Setting up an automated mouse-jiggler macro"),
      makeChoice("thread", "Looking for a new job with a less dystopian stack"),
      makeChoice("chill", "Generating a high-cringe Broetry card about it"),
    ],
  },
  {
    id: "mandatory_fun",
    question:
      "Newsletter announces a 'Mandatory Virtual Friday Happy Hour'. Your vibe?",
    choices: [
      makeChoice("danger", "Maximum awkwardness over Zoom camera"),
      makeChoice("thread", "Claiming my local camera hardware just malfunctioned"),
      makeChoice("chill", "Sneaking out to a real taproom under an anonymous mask"),
    ],
  },
  {
    id: "calendar_optimized",
    question:
      "Your calendar has been 'optimized' with 6 back-to-back huddles on Friday morning. Remaining energy?",
    choices: [
      makeChoice("danger", "0% (Running entirely on caffeine and spite)"),
      makeChoice("thread", "Critical thermal throttling"),
      makeChoice("chill", "Sub-zero motivation"),
    ],
  },
  {
    id: "offline_translation",
    question:
      "What does 'Let's take this offline' actually mean in an executive board meeting?",
    choices: [
      makeChoice("danger", "'Stop talking, you are ruining my slide deck'"),
      makeChoice("thread", "'We are never going to discuss this again'"),
      makeChoice("chill", "'Meet me at the nearest pub in 10 minutes'"),
    ],
  },
  {
    id: "hyper_hybrid_matrix",
    question:
      "Your company rolls out a 'Hyper-Hybrid-Synchronous Workspace Collaboration Matrix'. What even is that?",
    choices: [
      makeChoice("danger", "A random string of words HR found on LinkedIn"),
      makeChoice("thread", "An expensive way to track my badge sign-ins"),
      makeChoice("chill", "An undeniable sign that I need a cold craft beer"),
    ],
  },
  {
    id: "friday_prod_bug",
    question:
      "You find a massive bug in production at 4:55 PM on a Friday. Standard protocol?",
    choices: [
      makeChoice("danger", "Blame a deprecated third-party microservice API"),
      makeChoice("thread", "Commit, push, turn off phone, and run"),
      makeChoice("chill", "Pretend the entire cloud region is experiencing an outage"),
    ],
  },
  {
    id: "ballpark_estimate",
    question:
      "PM asks for a 'High-Level Ballpark Estimation' that will become a hard deadline. Your estimate strategy?",
    choices: [
      makeChoice("danger", "Take my true estimate and multiply it by 4"),
      makeChoice("thread", "Guess a random number between 1 and 45 weeks"),
      makeChoice("chill", "Shrug and look for the nearest happy hour slot"),
    ],
  },
  {
    id: "tech_park_traffic",
    question:
      "The tech-park corridor outside your office is completely red on Google Maps at 4 PM. Your strategy?",
    choices: [
      makeChoice("danger", "Wait it out in a highly depressing cubicle"),
      makeChoice("thread", "Brave the gridlock and question my life choices"),
      makeChoice("chill", "Take refuge at the closest brewery on the radar grid"),
    ],
  },
  {
    id: "linkedin_cringe",
    question:
      "Influencer posts: 'Why I love waking up at 4 AM to review legacy enterprise codebases'. Your reaction?",
    choices: [
      makeChoice("danger", "Report the post for deeply offensive content"),
      makeChoice("thread", "Instantly feed it to the Broetry Engine for a parody"),
      makeChoice("chill", "Close LinkedIn forever out of pure cringe"),
    ],
  },
  {
    id: "hey_navin",
    question:
      "Your manager Slacks 'Hey Navin.' with no further context or typing indicator. State of mind?",
    choices: [
      makeChoice("danger", "Calculating my severance package options"),
      makeChoice("thread", "Heart rate instantly spiking past 150 BPM"),
      makeChoice("chill", "Disappearing into anonymous camouflage mode"),
    ],
  },
  {
    id: "pantry_downgrade",
    question:
      "The pantry replaces premium coffee with a budget instant-mix. What is this signal?",
    choices: [
      makeChoice("danger", "The company's Q3 budget runway is actively collapsing"),
      makeChoice("thread", "A declaration of war against the engineering team"),
      makeChoice("chill", "Time to transition my portfolio to a pub table"),
    ],
  },
  {
    id: "weekly_report",
    question:
      "Weekly report demands 'Actionable, Data-Driven Key Results'. Your actual status?",
    choices: [
      makeChoice("danger", "Survived 4 status alignment huddles"),
      makeChoice("thread", "Wrote 3 lines of code and deleted 400 lines"),
      makeChoice("chill", "Spent the entire day looking at the spatial radar"),
    ],
  },
  {
    id: "laptop_boot_25min",
    question:
      "Your corporate laptop takes 25 minutes to boot from security scans. What is that time used for?",
    choices: [
      makeChoice("danger", "Questioning why I chose a career in software delivery"),
      makeChoice("thread", "Drinking a third cup of tea in deep silence"),
      makeChoice("chill", "Checking the local tech-park burnout leaderboard"),
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
