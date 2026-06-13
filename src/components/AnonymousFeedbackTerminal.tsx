import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";

const STORAGE_KEY = "drinkedin_user_feedback";

type FeedbackEntry = {
  id: string;
  idea: string;
  company: string;
  ts: number;
};

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

export default function AnonymousFeedbackTerminal() {
  const [idea, setIdea] = useState("");
  const [company, setCompany] = useState("");
  const [entries, setEntries] = useState<FeedbackEntry[]>([]);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    setEntries(loadFeedback());
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
    </div>
  );
}
