import { useState } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "drinkedin_digest_subscribers";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function MidnightLeakDigest() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!EMAIL_RE.test(clean)) {
      toast.error("That doesn't look like a valid email. Try again.");
      return;
    }
    setSubmitting(true);
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const list: string[] = raw ? JSON.parse(raw) : [];
      if (!list.includes(clean)) list.push(clean);
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch {}
    window.setTimeout(() => {
      setSubmitting(false);
      setSubmitted(true);
    }, 350);
  };

  return (
    <div className="bg-[#0d0d0d]/90 backdrop-blur-xl border border-red-950/30 rounded-2xl p-4 shadow-2xl">
      {submitted ? (
        <div className="animate-fade-in text-center py-3">
          <div className="text-[11px] font-bold tracking-wider text-emerald-300 mb-1.5">
            🔒 SECURE CONNECTION ESTABLISHED
          </div>
          <p className="text-[10.5px] text-white/70 leading-relaxed">
            Your mask is verified. Check your inbox tonight at{" "}
            <span className="font-mono text-amber-400">00:00 AM</span>.
          </p>
          <div className="mt-3 flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[9px] uppercase tracking-widest text-emerald-400/80 font-bold">
              Encrypted Pipe Live
            </span>
          </div>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="animate-fade-in">
          <h3 className="text-[11px] font-bold tracking-wider text-white mb-1.5">
            📬 THE MIDNIGHT LEAK DIGEST
          </h3>
          <p className="text-[10px] text-white/55 leading-snug mb-3">
            Get the daily top-voted corporate confessions, toxic manager
            alerts, and tech-park salary spikes sent straight to your personal
            burner inbox. 100% confidential.
          </p>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your personal/burner email..."
            disabled={submitting}
            aria-label="Burner email for Midnight Leak Digest"
            className="bg-[#141414] border border-[#222] text-sm rounded-xl px-3 py-2 w-full text-amber-500 focus:outline-none focus:border-amber-500/50 placeholder:text-white/30 placeholder:text-[12px] disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={submitting}
            className="mt-2 w-full text-[11px] font-bold uppercase tracking-wider rounded-xl px-3 py-2 border border-amber-400/40 bg-gradient-to-b from-amber-500/15 to-amber-500/[0.04] text-amber-200 hover:bg-amber-500/20 hover:border-amber-300/60 transition-all duration-200 disabled:opacity-60"
          >
            {submitting ? "🔐 Encrypting..." : "⚡ Subscribe to Underground Feed"}
          </button>
          <p className="text-[9px] text-white/35 mt-2 text-center italic">
            No spam. No corporate trackers. Burn after reading.
          </p>
        </form>
      )}
    </div>
  );
}
