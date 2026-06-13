import { useEffect, useState } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "drinkedin_rumor_bracket_vote";

type OptionKey = "A" | "B" | "C" | "D";

const OPTIONS: { key: OptionKey; label: string; pct: number; color: string }[] = [
  { key: "A", label: "Option A: TCS (The Micro-Management Regime)", pct: 42, color: "from-amber-500/70 to-amber-400/40" },
  { key: "B", label: "Option B: Infosys (The 70-Hour Workweek Vanguard)", pct: 38, color: "from-rose-500/70 to-rose-400/40" },
  { key: "C", label: "Option C: Capgemini (The Mandatory Alignment Squad)", pct: 12, color: "from-indigo-500/70 to-indigo-400/40" },
  { key: "D", label: "Option D: Cognizant (The Bench-Sitting Overlords)", pct: 8, color: "from-emerald-500/70 to-emerald-400/40" },
];

export default function RumorMillBracket() {
  const [hasUserVoted, setHasUserVoted] = useState(false);
  const [votedKey, setVotedKey] = useState<OptionKey | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.voted) {
          setHasUserVoted(true);
          setVotedKey(parsed.key ?? null);
        }
      }
    } catch {}
  }, []);

  function castVote(key: OptionKey) {
    if (hasUserVoted) return;
    setHasUserVoted(true);
    setVotedKey(key);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ voted: true, key, ts: Date.now() }));
    } catch {}

    const brag =
      "🔥 RUMOR MATRIX ALERT: Infosys and TCS are currently neck-and-neck in the Saturday burnout poll on DrinkedIn. Log your vote anonymously and see the live tech park statistics: https://drinkedin.me";
    try {
      navigator.clipboard?.writeText(brag).catch(() => {});
    } catch {}

    toast("📋 Voting link packaged! Paste it into your company WhatsApp pods to swing the poll metrics.", {
      duration: 2800,
    });
  }

  return (
    <div className="bg-[#0d0d0d]/90 backdrop-blur-xl border border-[#1f1f1f] rounded-2xl p-5 shadow-2xl">
      <div className="flex items-center gap-2 mb-1">
        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
        <h3 className="text-[11px] font-extrabold tracking-[0.22em] text-amber-300 uppercase">
          📊 Saturday Underground Rumor Mill
        </h3>
      </div>
      <p className="text-[12.5px] leading-snug text-white/80 mb-4">
        Which local corporate giant is most likely to send a passive-aggressive Slack message to their team over the weekend?
      </p>

      <div className="space-y-2">
        {OPTIONS.map((opt) => {
          if (hasUserVoted) {
            const isVoted = votedKey === opt.key;
            return (
              <div
                key={opt.key}
                className={`relative overflow-hidden rounded-xl border ${
                  isVoted ? "border-amber-400/60" : "border-white/10"
                } bg-white/[0.03] px-3 py-2.5 animate-fade-in`}
              >
                <div
                  className={`absolute inset-y-0 left-0 bg-gradient-to-r ${opt.color} origin-left animate-[bar-grow_0.8s_cubic-bezier(0.22,1,0.36,1)_forwards]`}
                  style={{ width: `${opt.pct}%` }}
                />
                <div className="relative flex items-center justify-between gap-3">
                  <span className="text-[12px] font-semibold text-white/90 leading-snug">
                    {opt.label}
                  </span>
                  <span className="text-[12px] font-extrabold text-white tabular-nums shrink-0">
                    {opt.pct}%
                  </span>
                </div>
              </div>
            );
          }
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => castVote(opt.key)}
              className="w-full text-left rounded-xl border border-white/10 bg-white/[0.03] hover:bg-amber-500/[0.08] hover:border-amber-400/40 transition-all duration-200 px-3 py-2.5 text-[12px] font-semibold text-white/85 hover:text-amber-100"
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {hasUserVoted && (
        <p className="mt-3 text-[10px] text-amber-300/70 italic text-center">
          ✅ Vote locked in. Live tech-park sentiment streaming.
        </p>
      )}

      <style>{`@keyframes bar-grow {
        0% { transform: scaleX(0); opacity: 0.4; }
        100% { transform: scaleX(1); opacity: 1; }
      }`}</style>
    </div>
  );
}
