import { useEffect, useMemo, useState } from "react";
import { Vote, Clock } from "lucide-react";
import { toast } from "sonner";

type Poll = {
  id: string;
  q: string;
  options: { id: string; label: string; baseVotes: number }[];
  endsInHours: number;
};

const POLLS: Poll[] = [
  {
    id: "rto-2026",
    q: "Your CEO just announced 5-day RTO. You…",
    options: [
      { id: "a", label: "Quietly quit. Bare minimum mode engaged.", baseVotes: 1284 },
      { id: "b", label: "Update LinkedIn. Open to opportunities.", baseVotes: 2103 },
      { id: "c", label: "Comply. Need the paycheck, hate myself.", baseVotes: 1672 },
      { id: "d", label: "Negotiate a remote exception. I'm built different.", baseVotes: 411 },
    ],
    endsInHours: 18,
  },
  {
    id: "appraisal",
    q: "Manager said 'we value you' but no hike. Translation?",
    options: [
      { id: "a", label: "You're getting laid off in Q2.", baseVotes: 892 },
      { id: "b", label: "Budget frozen. Same boat as everyone.", baseVotes: 1244 },
      { id: "c", label: "Time to start interviewing.", baseVotes: 2018 },
      { id: "d", label: "ESOPs vesting > cash. Cope.", baseVotes: 318 },
    ],
    endsInHours: 42,
  },
  {
    id: "slack-weekend",
    q: "Boss DMs you on Saturday at 11 PM. You…",
    options: [
      { id: "a", label: "Reply instantly. Brand-building.", baseVotes: 187 },
      { id: "b", label: "See it. Wait till Monday 9:01 AM.", baseVotes: 2891 },
      { id: "c", label: "Mark unread. Forever.", baseVotes: 1402 },
      { id: "d", label: "Set Slack status: 'at my therapist'.", baseVotes: 977 },
    ],
    endsInHours: 6,
  },
];

const KEY = "drinkedin.drama.votes.v1";

function loadVotes(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export default function OfficeDramaPolls() {
  const [idx, setIdx] = useState(0);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [tallies, setTallies] = useState<Record<string, Record<string, number>>>({});

  useEffect(() => {
    setVotes(loadVotes());
    // start each poll with its base tallies (live-feel)
    const t: Record<string, Record<string, number>> = {};
    POLLS.forEach((p) => {
      t[p.id] = {};
      p.options.forEach((o) => (t[p.id][o.id] = o.baseVotes));
    });
    setTallies(t);
  }, []);

  const poll = POLLS[idx];
  const myVote = votes[poll.id];
  const total = useMemo(
    () => Object.values(tallies[poll.id] || {}).reduce((a, b) => a + b, 0) || 1,
    [tallies, poll.id],
  );

  function cast(optId: string) {
    if (myVote) return;
    const nextVotes = { ...votes, [poll.id]: optId };
    setVotes(nextVotes);
    try {
      localStorage.setItem(KEY, JSON.stringify(nextVotes));
    } catch {}
    setTallies((prev) => ({
      ...prev,
      [poll.id]: {
        ...prev[poll.id],
        [optId]: (prev[poll.id]?.[optId] || 0) + 1,
      },
    }));
    toast.success("🗳️ Vote logged anonymously.", {
      description: "Results updated in the drama matrix.",
    });
  }

  function next() {
    setIdx((i) => (i + 1) % POLLS.length);
  }

  return (
    <div className="rounded-2xl p-5 mt-6 shadow-2xl bg-[#0d0d0d]/90 backdrop-blur-xl border border-violet-950/40">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <Vote className="size-3.5 text-violet-400" />
          <h3 className="text-[11px] uppercase tracking-[0.22em] font-extrabold text-violet-300">
            Office Drama Live Polls
          </h3>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
          <Clock className="size-3" /> {poll.endsInHours}h left
        </span>
      </div>

      <p className="text-[13px] leading-snug text-foreground/90 font-semibold mt-2 mb-3">
        {poll.q}
      </p>

      <div className="space-y-1.5">
        {poll.options.map((o) => {
          const count = tallies[poll.id]?.[o.id] || 0;
          const pct = Math.round((count / total) * 100);
          const mine = myVote === o.id;
          const showResults = !!myVote;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => cast(o.id)}
              disabled={showResults}
              className={`relative w-full text-left overflow-hidden rounded-md border px-2.5 py-2 transition ${
                mine
                  ? "border-violet-400/70 bg-violet-500/10"
                  : showResults
                    ? "border-[#2b2b2b] bg-black/40 cursor-default"
                    : "border-[#2b2b2b] bg-black/50 hover:border-violet-500/50 hover:bg-violet-500/5"
              }`}
            >
              {showResults && (
                <div
                  className={`absolute inset-y-0 left-0 ${
                    mine ? "bg-violet-500/25" : "bg-violet-500/10"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              )}
              <div className="relative flex items-center justify-between gap-2">
                <span className="text-[12px] text-foreground/90 leading-snug">
                  {mine && "✓ "}
                  {o.label}
                </span>
                {showResults && (
                  <span className="text-[10px] font-extrabold tabular-nums text-violet-200">
                    {pct}%
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-3 flex items-center justify-between text-[10px] text-muted-foreground">
        <span className="tabular-nums">{total.toLocaleString()} votes</span>
        <button
          type="button"
          onClick={next}
          className="font-extrabold uppercase tracking-wider text-violet-300 hover:text-violet-200"
        >
          next drama →
        </button>
      </div>
    </div>
  );
}
