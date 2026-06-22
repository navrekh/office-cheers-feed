import { useEffect, useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { QrCode, Share2, Eye, ArrowRight, AtSign, Lock } from "lucide-react";

const SAMPLE_DOSSIERS = [
  { handle: "ghost_protocol", emoji: "🥷", line: "Sips Negronis. Decoded 14 spies tonight.", tag: "SAMPLE" },
  { handle: "neon_analyst",   emoji: "🕶️", line: "Slack-dark, pint-light. Last seen: Koramangala.", tag: "SAMPLE" },
  { handle: "midnight_qa",    emoji: "🦉", line: "Bug-free since 11 PM. Whiskey-positive.", tag: "SAMPLE" },
];

const RESERVED = new Set(["admin", "api", "auth", "profile", "merchant", "settings", "login", "signup", "www"]);

export function LandingHero({ onSignIn, onDecode }: { onSignIn: (reason: string) => void; onDecode: () => void }) {
  const [active, setActive] = useState(247);
  const [handle, setHandle] = useState("");
  const [claimedToday, setClaimedToday] = useState(1847 + Math.floor(((Date.now() / 60_000) % 53)));

  useEffect(() => {
    const id = setInterval(() => {
      setActive((n) => Math.max(180, n + Math.round((Math.random() - 0.45) * 6)));
    }, 3200);
    return () => clearInterval(id);
  }, []);

  function normalize(v: string) {
    return v.toLowerCase().replace(/[^a-z0-9_]/g, "").slice(0, 24);
  }

  function handleClaim(e: FormEvent) {
    e.preventDefault();
    const clean = normalize(handle);
    if (clean.length < 3) {
      // visually nudge — onSignIn handler shows reason
      onSignIn("Pick a handle (3+ letters) — then sign in to lock it.");
      return;
    }
    if (RESERVED.has(clean)) {
      onSignIn(`"${clean}" is reserved. Try a different handle.`);
      return;
    }
    try { sessionStorage.setItem("pending_username", clean); } catch {}
    setClaimedToday((n) => n + 1);
    onSignIn(`drinkedin.me/${clean} is reserved for 60 seconds — sign in to lock it in 🔒`);
  }

  return (
    <section className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-neutral-950 via-neutral-950 to-amber-950/20 p-6 sm:p-8 shadow-2xl shadow-amber-500/5 overflow-hidden">
      {/* Live counter */}
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
        {active} spies active tonight
      </div>

      <h1 className="text-3xl sm:text-5xl font-black leading-tight text-amber-50">
        Claim your{" "}
        <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
          anonymous spy badge
        </span>
        .
      </h1>
      <p className="mt-3 max-w-xl text-sm sm:text-base text-neutral-400">
        Your private after-7-PM identity. One link. Decode strangers, see who decoded you,
        drop confessions your manager will never trace.
      </p>

      {/* PRIMARY CONVERSION: username claim */}
      <form onSubmit={handleClaim} className="mt-6 rounded-2xl border border-amber-400/40 bg-neutral-950/70 p-3 sm:p-4 shadow-[0_0_40px_rgba(251,191,36,0.08)]">
        <label className="mb-2 flex items-center justify-between text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/80">
          <span>Pick your handle · free forever</span>
          <span className="text-emerald-300/80">{claimedToday.toLocaleString()} claimed today</span>
        </label>
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="flex flex-1 items-center rounded-lg border border-neutral-800 bg-neutral-950 px-3 focus-within:border-amber-400/60 transition">
            <span className="hidden sm:inline text-xs font-mono text-neutral-500 select-none">drinkedin.me/</span>
            <AtSign className="size-4 text-amber-400/70 sm:hidden" />
            <input
              value={handle}
              onChange={(e) => setHandle(normalize(e.target.value))}
              placeholder="ghost_protocol"
              maxLength={24}
              autoComplete="off"
              className="flex-1 bg-transparent py-3 px-2 text-sm font-mono font-bold text-amber-100 placeholder:text-neutral-600 outline-none"
            />
            {handle.length >= 3 && (
              <span className="text-[10px] font-bold uppercase text-emerald-400 tracking-wider">Available ✓</span>
            )}
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-amber-400 px-5 py-3 text-sm font-black uppercase tracking-wider text-neutral-950 hover:bg-amber-300 transition shadow-lg shadow-amber-500/20"
          >
            <Lock className="size-4" /> Claim it
          </button>
        </div>
        <p className="mt-2 text-[11px] text-neutral-500">
          No real names asked. No work email. Takes 10 seconds.
        </p>
      </form>

      {/* Three secondary actions */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <ActionCard
          icon={<QrCode className="size-5" />}
          title="Decode a dossier"
          body="Scan a badge with your camera"
          accent="amber"
          onClick={onDecode}
        />
        <ActionCard
          icon={<Share2 className="size-5" />}
          title="Share your badge"
          body="Get a QR · print · drop · go viral"
          accent="cyan"
          onClick={() => onSignIn("Sign in to claim your badge.")}
        />
        <ActionCard
          icon={<Eye className="size-5" />}
          title="See who decoded you"
          body="Live interception log on your profile"
          accent="rose"
          onClick={() => onSignIn("Sign in to see your visitors.")}
        />
      </div>

      {/* Sample dossier strip */}
      <div className="mt-7">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-500">
            Live dossiers · sample
          </h2>
          <span className="text-[10px] text-neutral-600">Real ones appear after sign-in</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {SAMPLE_DOSSIERS.map((d) => (
            <div
              key={d.handle}
              className="group relative rounded-xl border border-neutral-800/80 bg-neutral-950/60 p-3 transition hover:border-amber-400/40"
            >
              <span className="absolute right-2 top-2 rounded-sm bg-neutral-800/80 px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider text-neutral-500">
                {d.tag}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xl">{d.emoji}</span>
                <span className="font-mono text-xs font-bold text-amber-300">@{d.handle}</span>
              </div>
              <p className="mt-1.5 text-xs leading-snug text-neutral-400">{d.line}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3 text-xs text-neutral-500">
        <Link to="/profile" className="text-neutral-400 hover:text-amber-300 underline-offset-4 hover:underline">
          peek at a sample badge <ArrowRight className="inline size-3" />
        </Link>
      </div>
    </section>
  );
}

function ActionCard({
  icon,
  title,
  body,
  accent,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  accent: "amber" | "cyan" | "rose";
  onClick: () => void;
}) {
  const ring =
    accent === "amber"
      ? "hover:border-amber-400/60 hover:shadow-amber-500/10"
      : accent === "cyan"
      ? "hover:border-cyan-400/60 hover:shadow-cyan-500/10"
      : "hover:border-rose-400/60 hover:shadow-rose-500/10";
  const iconColor =
    accent === "amber" ? "text-amber-300" : accent === "cyan" ? "text-cyan-300" : "text-rose-300";
  return (
    <button
      onClick={onClick}
      className={`group text-left rounded-xl border border-neutral-800 bg-neutral-950/70 p-4 transition hover:shadow-xl ${ring}`}
    >
      <div className={`mb-2 inline-grid size-9 place-items-center rounded-lg bg-neutral-900 ${iconColor}`}>
        {icon}
      </div>
      <div className="text-sm font-bold text-amber-50">{title}</div>
      <div className="mt-0.5 text-xs text-neutral-500">{body}</div>
    </button>
  );
}

export default LandingHero;
