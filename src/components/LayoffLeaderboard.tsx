import { useEffect, useMemo, useState } from "react";
import { Trophy, Flame } from "lucide-react";
import { toast } from "sonner";

type Entry = { company: string; votes: number };

const KEY = "drinkedin.layoff.leaderboard.v1";
const WEEK_KEY = "drinkedin.layoff.week.v1";

const SEED: Entry[] = [
  { company: "MetaBoros", votes: 412 },
  { company: "Gloogle", votes: 388 },
  { company: "Amazoom", votes: 341 },
  { company: "Twixxer", votes: 297 },
  { company: "Snapdeel", votes: 214 },
  { company: "Byjusn't", votes: 188 },
  { company: "Paytmm", votes: 142 },
  { company: "Olla", votes: 119 },
];

function currentWeek(): string {
  const d = new Date();
  const year = d.getFullYear();
  const start = new Date(year, 0, 1).getTime();
  const week = Math.floor((d.getTime() - start) / (7 * 86400000));
  return `${year}-W${week}`;
}

function load(): Entry[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return SEED;
}

export default function LayoffLeaderboard() {
  const [entries, setEntries] = useState<Entry[]>(SEED);
  const [voted, setVoted] = useState<Record<string, boolean>>({});
  const [input, setInput] = useState("");

  useEffect(() => {
    setEntries(load());
    try {
      const v = localStorage.getItem(`${KEY}.voted.${currentWeek()}`);
      if (v) setVoted(JSON.parse(v));
    } catch {}
  }, []);

  function persist(next: Entry[]) {
    setEntries(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {}
  }

  function persistVoted(next: Record<string, boolean>) {
    setVoted(next);
    try {
      localStorage.setItem(`${KEY}.voted.${currentWeek()}`, JSON.stringify(next));
    } catch {}
  }

  function vote(company: string) {
    if (voted[company]) {
      toast("Already flagged this week.", { description: "One vote per company per week." });
      return;
    }
    const next = entries.map((e) =>
      e.company === company ? { ...e, votes: e.votes + 1 } : e,
    );
    persist(next);
    persistVoted({ ...voted, [company]: true });
    toast.success(`🚨 +1 flagged on ${company}`);
  }

  function submitNew() {
    const name = input.trim();
    if (name.length < 2 || name.length > 32) {
      toast.error("2–32 characters, anon.");
      return;
    }
    const existing = entries.find(
      (e) => e.company.toLowerCase() === name.toLowerCase(),
    );
    if (existing) {
      vote(existing.company);
      setInput("");
      return;
    }
    const next = [...entries, { company: name, votes: 1 }];
    persist(next);
    persistVoted({ ...voted, [name]: true });
    setInput("");
    toast.success(`🆕 ${name} entered the leaderboard.`);
  }

  const ranked = useMemo(
    () => [...entries].sort((a, b) => b.votes - a.votes).slice(0, 8),
    [entries],
  );
  const max = ranked[0]?.votes || 1;

  return (
    <div className="rounded-2xl p-5 mt-6 shadow-2xl bg-[#0d0d0d]/90 backdrop-blur-xl border border-red-950/30">
      <div className="flex items-center gap-2 mb-1">
        <Trophy className="size-3.5 text-red-400" />
        <h3 className="text-[11px] uppercase tracking-[0.22em] font-extrabold text-red-300">
          Weekly Layoff Leaderboard
        </h3>
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug mb-3">
        Anonymous flags from the breakroom. Resets every Monday. No proof, just vibes.
      </p>

      <ol className="space-y-1.5">
        {ranked.map((e, i) => {
          const pct = Math.max(6, Math.round((e.votes / max) * 100));
          const isTop = i === 0;
          return (
            <li
              key={e.company}
              className="relative overflow-hidden rounded-md border border-[#2b2b2b] bg-black/50"
            >
              <div
                className={`absolute inset-y-0 left-0 ${
                  isTop ? "bg-red-500/20" : "bg-red-500/10"
                }`}
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center gap-2 px-2.5 py-1.5">
                <span className="text-[10px] font-black text-muted-foreground tabular-nums w-4">
                  {i + 1}
                </span>
                <span className="text-[12px] font-bold text-foreground/90 flex-1 truncate">
                  {isTop && <Flame className="size-3 text-orange-400 inline -mt-0.5 mr-1" />}
                  {e.company}
                </span>
                <span className="text-[10px] tabular-nums text-red-300 font-bold">
                  {e.votes}
                </span>
                <button
                  type="button"
                  onClick={() => vote(e.company)}
                  disabled={!!voted[e.company]}
                  className="text-[10px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded border border-red-500/40 text-red-200 hover:bg-red-500/15 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {voted[e.company] ? "✓" : "+1"}
                </button>
              </div>
            </li>
          );
        })}
      </ol>

      <div className="mt-3 flex gap-1.5">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submitNew()}
          maxLength={32}
          placeholder="Add a company (anon)…"
          className="flex-1 rounded-md bg-black/60 border border-[#2b2b2b] text-[11px] text-foreground/90 placeholder:text-muted-foreground/60 px-2 py-1.5 focus:outline-none focus:border-red-500/40"
        />
        <button
          type="button"
          onClick={submitNew}
          className="text-[10px] font-extrabold uppercase tracking-wider px-2.5 py-1.5 rounded-md bg-red-500/20 border border-red-500/50 text-red-200 hover:bg-red-500/30"
        >
          Flag
        </button>
      </div>
    </div>
  );
}
