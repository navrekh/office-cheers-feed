import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, ShieldAlert, ShieldCheck } from "lucide-react";

const STORAGE_KEY = "drinkedin:boundary-poll";
const VOTED_KEY = "drinkedin:boundary-voted";
const SHARE_TEXT =
  "My manager is currently tracking on the weekend boundary radar. Check your tech park stats: https://drinkedin.me";

type Counts = { yes: number; no: number };

function loadCounts(): Counts {
  if (typeof window === "undefined") return { yes: 0, no: 0 };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as Counts;
  } catch {
    /* noop */
  }
  // Seed for visual context
  return { yes: 47, no: 89 };
}

export default function WeekendBoundaryModule({ weekend }: { weekend: boolean }) {
  const [counts, setCounts] = useState<Counts>({ yes: 0, no: 0 });
  const [voted, setVoted] = useState<"yes" | "no" | null>(null);
  const [pulseYes, setPulseYes] = useState(false);

  useEffect(() => {
    setCounts(loadCounts());
    try {
      const v = localStorage.getItem(VOTED_KEY);
      if (v === "yes" || v === "no") setVoted(v);
    } catch {
      /* noop */
    }
  }, []);

  function persist(next: Counts) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* noop */
    }
  }

  function vote(choice: "yes" | "no") {
    if (voted) {
      toast.info("You already logged today's boundary status.");
      return;
    }
    setCounts((c) => {
      const next = { ...c, [choice]: c[choice] + 1 };
      persist(next);
      return next;
    });
    setVoted(choice);
    try {
      localStorage.setItem(VOTED_KEY, choice);
    } catch {
      /* noop */
    }
    if (choice === "yes") {
      setPulseYes(true);
      setTimeout(() => setPulseYes(false), 1800);
      toast.error("🛑 Boundary violation logged.", { description: "Solidarity, fellow weekend warrior." });
    } else {
      toast.success("✅ Safe in the wild.", { description: "Stay ghosted." });
    }
  }

  async function copyShare() {
    try {
      await navigator.clipboard.writeText(SHARE_TEXT);
      toast.success("Link copied — paste it in your dev circle.");
    } catch {
      toast.error("Couldn't copy — long-press and copy manually.");
    }
  }

  const total = counts.yes + counts.no;
  const yesPct = total ? Math.round((counts.yes / total) * 100) : 0;
  const noPct = total ? 100 - yesPct : 0;

  return (
    <div className="space-y-3">
      {weekend && (
        <div
          className="rounded-xl px-3.5 py-2.5 text-[11.5px] font-bold tracking-wide flex items-center gap-2 animate-fade-in"
          style={{
            background: "linear-gradient(90deg, rgba(168,85,247,0.18), rgba(217,70,239,0.18))",
            border: "1px solid rgba(192,132,252,0.45)",
            color: "#e9d5ff",
            boxShadow: "0 0 24px rgba(168,85,247,0.25)",
          }}
        >
          <span className="size-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
          🚨 WEEKEND MODE ACTIVE: The Manager Boundary Tracker is Live.
        </div>
      )}

      <div
        className="rounded-2xl p-4 shadow-xl"
        style={{
          background: "rgba(13, 13, 13, 0.8)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          border: "1px solid #1f1f1f",
        }}
      >
        <div className="flex items-center justify-between mb-2.5">
          <h3 className="text-[10px] uppercase tracking-[0.24em] font-bold text-fuchsia-300/90">
            📊 Did your manager ping you today?
          </h3>
          <button
            type="button"
            onClick={copyShare}
            className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold text-fuchsia-200 border border-fuchsia-400/30 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 transition"
            title="Copy shareable link"
          >
            <Copy className="size-3" /> Share
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => vote("yes")}
            disabled={voted === "no"}
            className={`group rounded-xl px-3 py-3 text-left border transition whitespace-normal break-words leading-tight ${
              voted === "yes"
                ? "bg-red-500/20 border-red-400 shadow-[0_0_18px_rgba(248,113,113,0.45)]"
                : "bg-red-500/10 border-red-400/30 hover:bg-red-500/20"
            } ${pulseYes ? "animate-pulse" : ""} disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center gap-2 text-[12.5px] font-extrabold text-red-200">
              <ShieldAlert className="size-4" /> 🛑 Yes (Boundary Violation)
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-[20px] font-black tabular-nums text-red-100">{counts.yes}</span>
              <span className="text-[10px] uppercase tracking-wider text-red-300/80">{yesPct}%</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => vote("no")}
            disabled={voted === "yes"}
            className={`rounded-xl px-3 py-3 text-left border transition whitespace-normal break-words leading-tight ${
              voted === "no"
                ? "bg-emerald-500/20 border-emerald-400 shadow-[0_0_18px_rgba(52,211,153,0.45)]"
                : "bg-emerald-500/10 border-emerald-400/30 hover:bg-emerald-500/20"
            } disabled:opacity-60 disabled:cursor-not-allowed`}
          >
            <div className="flex items-center gap-2 text-[12.5px] font-extrabold text-emerald-200">
              <ShieldCheck className="size-4" /> ✅ No (Safe in the Wild)
            </div>
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-[20px] font-black tabular-nums text-emerald-100">{counts.no}</span>
              <span className="text-[10px] uppercase tracking-wider text-emerald-300/80">{noPct}%</span>
            </div>
          </button>
        </div>

        <div className="mt-3 h-1.5 w-full rounded-full overflow-hidden bg-zinc-800/80 flex">
          <div
            className="h-full bg-gradient-to-r from-red-500 to-rose-400 transition-all duration-500"
            style={{ width: `${yesPct}%` }}
          />
          <div
            className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all duration-500"
            style={{ width: `${noPct}%` }}
          />
        </div>
        <div className="mt-1.5 text-[10px] text-muted-foreground text-center">
          {total.toLocaleString()} weekend warriors logged in
        </div>
      </div>
    </div>
  );
}
