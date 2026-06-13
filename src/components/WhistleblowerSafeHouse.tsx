import { useState } from "react";
import { Lock, Sparkles, X, PartyPopper } from "lucide-react";

const FEATURES = [
  "Real-Time Salary & Layoff Leak Intelligence (TCS, Infosys, CTS)",
  "Manager Heat-Maps: Track the most toxic managers by tech park sector",
  "AI Performance Review Fabricator (Generate 5-star ratings with 0 effort)",
  "Automated Stealth Job Search Mode (Auto-apply while on active Zoom calls)",
];

const CONFETTI = ["🍻", "🎉", "✨", "🥳", "🚀", "💸", "🎊"];

export default function WhistleblowerSafeHouse() {
  const [open, setOpen] = useState(false);
  const [burst, setBurst] = useState<{ id: number; left: number; emoji: string; delay: number }[]>([]);

  function triggerUpgrade() {
    // Fire-and-forget confetti
    const pieces = Array.from({ length: 28 }).map((_, i) => ({
      id: Date.now() + i,
      left: Math.random() * 100,
      emoji: CONFETTI[Math.floor(Math.random() * CONFETTI.length)],
      delay: Math.random() * 0.4,
    }));
    setBurst(pieces);
    window.setTimeout(() => setBurst([]), 2600);
    setOpen(true);
  }

  return (
    <>
      <div
        className="relative rounded-2xl p-4 shadow-xl overflow-hidden bg-gradient-to-br from-[#0c0c0c] to-[#161224]"
        style={{
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
        }}
      >
        {/* Animated glow border */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl animate-pulse"
          style={{
            border: "1px solid rgba(168,85,247,0.5)",
            boxShadow: "0 0 24px rgba(168,85,247,0.35), inset 0 0 18px rgba(168,85,247,0.12)",
          }}
        />

        <div className="relative">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="size-3.5 text-purple-300" />
            <h3 className="text-[10.5px] uppercase tracking-[0.18em] font-extrabold text-purple-200 leading-tight whitespace-normal break-words">
              🔓 Enter the Whistleblower Safe-House (Premium)
            </h3>
          </div>
          <p className="text-[11px] text-muted-foreground mb-3 leading-snug">
            Unlock the off-the-record intel layer used by senior devs going stealth.
          </p>

          <ul className="space-y-1.5 mb-3.5">
            {FEATURES.map((f) => (
              <li
                key={f}
                className="flex items-start gap-2 text-[11.5px] leading-snug text-foreground/85"
              >
                <Lock className="size-3 mt-0.5 shrink-0 text-amber-300" />
                <span className="whitespace-normal break-words">🔒 {f}</span>
              </li>
            ))}
          </ul>

          <button
            type="button"
            onClick={triggerUpgrade}
            className="w-full rounded-xl px-3 py-2.5 text-[12px] font-extrabold text-purple-50 bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 shadow-[0_0_22px_rgba(168,85,247,0.55)] hover:brightness-110 transition whitespace-normal break-words leading-tight"
          >
            🚀 Gain Lifetime Access (Pay with 1 Beer at Toit)
          </button>
        </div>
      </div>

      {/* Confetti overlay */}
      {burst.length > 0 && (
        <div className="pointer-events-none fixed inset-0 z-[80] overflow-hidden">
          {burst.map((p) => (
            <span
              key={p.id}
              className="absolute text-2xl"
              style={{
                left: `${p.left}vw`,
                top: "-10vh",
                animation: `confetti-fall 2.4s cubic-bezier(.25,.46,.45,.94) ${p.delay}s forwards`,
              }}
            >
              {p.emoji}
            </span>
          ))}
          <style>{`@keyframes confetti-fall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(110vh) rotate(540deg); opacity: 0.9; }
          }`}</style>
        </div>
      )}

      {/* Success modal */}
      {open && (
        <div
          className="fixed inset-0 z-[90] grid place-items-center p-4 animate-fade-in"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }}
          onClick={() => setOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-2xl p-6 shadow-2xl bg-gradient-to-br from-[#0c0c0c] to-[#161224] animate-scale-in"
            style={{
              border: "1px solid rgba(168,85,247,0.5)",
              boxShadow: "0 0 60px rgba(168,85,247,0.45)",
            }}
          >
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Close"
              className="absolute top-3 right-3 size-7 grid place-items-center rounded-full bg-white/5 text-foreground/70 hover:bg-white/10"
            >
              <X className="size-4" />
            </button>
            <div className="flex items-center gap-2 mb-3 text-amber-300">
              <PartyPopper className="size-5" />
              <span className="text-[10px] uppercase tracking-[0.22em] font-extrabold">
                Transaction Complete
              </span>
            </div>
            <h2 className="text-xl font-black leading-tight text-foreground mb-2">
              🍻 You just funded the developer revolution!
            </h2>
            <p className="text-[13px] text-muted-foreground leading-relaxed">
              Since we are in <span className="text-purple-200 font-semibold">public pre-launch alpha</span>,
              your account has been automatically upgraded to{" "}
              <span className="text-amber-300 font-bold">Executive Whistleblower Tier</span> for{" "}
              <span className="text-emerald-300 font-bold">100% FREE</span>. Go drop a premium meme in
              the live breakroom feed!
            </p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-5 w-full rounded-xl px-3 py-2.5 text-[12.5px] font-extrabold text-amber-950 bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 shadow-[0_0_18px_rgba(251,191,36,0.45)] hover:brightness-110 transition"
            >
              Take Me to the Feed
            </button>
          </div>
        </div>
      )}
    </>
  );
}
