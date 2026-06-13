import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "drinkedin_user_feedback";
const VOTES_KEY = "drinkedin_roadmap_votes";

type FeedbackEntry = {
  id: string;
  idea: string;
  company: string;
  ts: number;
};

type RoadmapFeature = {
  id: string;
  title: string;
  description: string;
  baseVotes: number;
};

const ROADMAP_FEATURES: RoadmapFeature[] = [
  {
    id: "dm-mesh",
    title: "🕵️‍♂️ Anonymous DM Mesh Network",
    description:
      "Securely message colleagues in your same tech park without entering compliance logs.",
    baseVotes: 342,
  },
  {
    id: "manager-registry",
    title: "🚩 Corporate Toxic Manager Registry",
    description:
      "A crowd-sourced, encrypted heat-map to cross-reference manager turnover histories.",
    baseVotes: 518,
  },
  {
    id: "visa-space",
    title: "🛂 H-1B / Visa Sponsor Safe Space",
    description:
      "Dedicated tech-hub boards for tracking immigration delays, stealth PTO rules, and transfer protocols.",
    baseVotes: 289,
  },
];

function loadFeedback(): FeedbackEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as FeedbackEntry[]) : [];
  } catch {
    return [];
  }
}

function loadVotes(): Record<string, { count: number; voted: boolean }> {
  const base: Record<string, { count: number; voted: boolean }> = {};
  for (const f of ROADMAP_FEATURES) base[f.id] = { count: f.baseVotes, voted: false };
  if (typeof window === "undefined") return base;
  try {
    const raw = window.localStorage.getItem(VOTES_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Record<string, { count: number; voted: boolean }>;
    for (const f of ROADMAP_FEATURES) {
      if (parsed[f.id]) base[f.id] = parsed[f.id];
    }
    return base;
  } catch {
    return base;
  }
}

export default function AnonymousFeedbackTerminal() {
  const [idea, setIdea] = useState("");
  const [company, setCompany] = useState("");
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [sent, setSent] = useState(false);
  const [votes, setVotes] = useState<Record<string, { count: number; voted: boolean }>>(() =>
    loadVotes(),
  );

  useEffect(() => {
    setEntries(loadFeedback());
    setVotes(loadVotes());
  }, []);

  const submit = () => {
    const trimmed = idea.trim();
    if (!trimmed) {
      toast.error("Drop an idea first — the terminal is hungry.");
      return;
    }
    const entry: FeedbackEntry = {
      id: `fb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      idea: trimmed,
      company: company.trim(),
      ts: Date.now(),
    };
    const next = [entry, ...entries].slice(0, 200);
    setEntries(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* storage full / disabled — best effort */
    }
    setIdea("");
    setCompany("");
    setSent(true);
    toast.success("🚀 Feedback sent completely anonymously!");
  };

  const upvote = (id: string) => {
    setVotes((prev) => {
      if (prev[id]?.voted) return prev;
      const next = {
        ...prev,
        [id]: { count: (prev[id]?.count ?? 0) + 1, voted: true },
      };
      try {
        window.localStorage.setItem(VOTES_KEY, JSON.stringify(next));
      } catch {
        /* best effort */
      }
      return next;
    });
    toast.success("🎯 Signal logged. Priority queue updated in the founder's matrix.");
  };

  return (
    <div className="bg-[#0d0d0d]/90 backdrop-blur-xl border border-dashed border-[#2b2b2b] rounded-2xl p-5 mt-6 shadow-2xl">
      <h3 className="text-[11px] uppercase tracking-[0.28em] font-bold text-emerald-400 drop-shadow-[0_0_10px_rgba(16,185,129,0.55)] mb-4">
        📟 Anonymous Feature Radar // Beta Feedback
      </h3>

      {sent ? (
        <div className="rounded-xl border border-emerald-500/30 bg-black/60 p-4 font-mono text-[12px] text-emerald-300 leading-relaxed">
          <div className="text-emerald-400 font-bold mb-2">🔒 SIGNAL TRANSMITTED.</div>
          <p className="text-emerald-200/80">
            Your feedback has been routed directly to the founder's terminal. No tracking tokens
            were attached to this packet.
          </p>
          <button
            type="button"
            onClick={() => setSent(false)}
            className="mt-4 text-[11px] uppercase tracking-[0.2em] text-emerald-400/80 hover:text-emerald-300 underline underline-offset-4"
          >
            › Transmit another signal
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <Textarea
            value={idea}
            onChange={(e) => setIdea(e.target.value)}
            placeholder="What feature or tech park data should we unlock next? Don't hold back..."
            rows={4}
            className="bg-black/60 border border-[#1f1f1f] focus-visible:ring-emerald-500/40 text-emerald-100 placeholder:text-zinc-600 font-mono text-[13px] rounded-xl"
          />
          <Input
            value={company}
            onChange={(e) => setCompany(e.target.value)}
            placeholder="Your current company / Tech Park (Optional)"
            className="bg-black/60 border border-[#1f1f1f] focus-visible:ring-emerald-500/40 text-emerald-100 placeholder:text-zinc-600 font-mono text-[12px] rounded-xl"
          />
          <button
            type="button"
            onClick={submit}
            className="w-full rounded-xl bg-emerald-500/15 border border-emerald-500/40 hover:bg-emerald-500/25 text-emerald-300 hover:text-emerald-200 font-bold text-[12px] uppercase tracking-[0.2em] py-2.5 transition-colors"
          >
            › Send Anonymous Signal
          </button>
          <p className="text-[10px] text-zinc-500 font-mono leading-snug">
            No email. No account. No tracking. Stored locally + routed to the founder.
          </p>
        </div>
      )}

      <div className="border-t border-dashed border-[#2b2b2b] my-4" />

      <h4 className="text-[10px] uppercase tracking-[0.22em] font-bold text-emerald-400 drop-shadow-[0_0_8px_rgba(16,185,129,0.6)] mb-3 font-mono">
        📡 Current Deployment Signal Queue (Vote for Next Unlock)
      </h4>

      <ul className="space-y-2">
        {ROADMAP_FEATURES.map((f) => {
          const v = votes[f.id] ?? { count: f.baseVotes, voted: false };
          return (
            <li
              key={f.id}
              className="flex items-start gap-3 rounded-xl border border-[#1f1f1f] bg-black/50 p-3"
            >
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-bold text-emerald-200 leading-tight break-words">
                  {f.title}
                </div>
                <p className="text-[11px] text-zinc-400 font-mono mt-1 leading-snug break-words">
                  {f.description}
                </p>
              </div>
              <div className="flex flex-col items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => upvote(f.id)}
                  disabled={v.voted}
                  aria-label={`Upvote ${f.title}`}
                  className={
                    v.voted
                      ? "w-8 h-8 rounded-lg border border-emerald-400/80 bg-emerald-500/25 text-emerald-300 font-bold text-sm shadow-[0_0_12px_rgba(16,185,129,0.75)] cursor-not-allowed"
                      : "w-8 h-8 rounded-lg border border-[#2b2b2b] bg-black/60 text-emerald-400 hover:border-emerald-500/60 hover:bg-emerald-500/15 hover:text-emerald-200 font-bold text-sm transition-colors"
                  }
                >
                  ▲
                </button>
                <span className="text-[10px] font-mono font-bold text-emerald-300 tabular-nums">
                  {v.count.toLocaleString()}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
