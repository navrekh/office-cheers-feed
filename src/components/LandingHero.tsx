import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { QrCode, Share2, Eye, ArrowRight } from "lucide-react";

const SAMPLE_DOSSIERS = [
  { handle: "ghost_protocol", emoji: "🥷", line: "Sips Negronis. Decoded 14 spies tonight.", tag: "SAMPLE" },
  { handle: "neon_analyst",   emoji: "🕶️", line: "Slack-dark, pint-light. Last seen: Koramangala.", tag: "SAMPLE" },
  { handle: "midnight_qa",    emoji: "🦉", line: "Bug-free since 11 PM. Whiskey-positive.", tag: "SAMPLE" },
];

export function LandingHero({ onSignIn }: { onSignIn: (reason: string) => void }) {
  const [active, setActive] = useState(247);

  // Lightweight "live" counter so the page feels alive on day one
  useEffect(() => {
    const id = setInterval(() => {
      setActive((n) => Math.max(180, n + Math.round((Math.random() - 0.45) * 6)));
    }, 3200);
    return () => clearInterval(id);
  }, []);

  return (
    <section className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-neutral-950 via-neutral-950 to-amber-950/20 p-6 sm:p-8 shadow-2xl shadow-amber-500/5 overflow-hidden">
      {/* Live counter */}
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
        {active} spies active tonight
      </div>

      <h1 className="text-3xl sm:text-5xl font-black leading-tight text-amber-50">
        The anonymous{" "}
        <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
          spy dossier
        </span>{" "}
        for after-work life.
      </h1>
      <p className="mt-3 max-w-xl text-sm sm:text-base text-neutral-400">
        Drop a badge. Decode strangers. See who decoded you. No real names, no LinkedIn cosplay —
        just the version of you that comes out after 7 PM.
      </p>

      {/* Three primary actions */}
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <ActionCard
          icon={<QrCode className="size-5" />}
          title="Decode a dossier"
          body="Scan a badge or search a handle"
          accent="amber"
          onClick={() => onSignIn("Sign in to decode a dossier.")}
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
        <button
          onClick={() => onSignIn("Sign in to enter.")}
          className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-neutral-950 hover:bg-amber-300 transition"
        >
          Enter the bar <ArrowRight className="size-4" />
        </button>
        <Link to="/profile" className="text-neutral-400 hover:text-amber-300 underline-offset-4 hover:underline">
          or peek at a sample badge
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
