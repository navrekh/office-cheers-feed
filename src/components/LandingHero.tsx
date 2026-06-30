import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowRight, Flame, MessageCircle, Beer } from "lucide-react";
import { Link } from "@tanstack/react-router";

/**
 * LandingHero — complete makeover (June 2026).
 *
 * Problem we're solving: 98% of first-time visitors don't grok what DrinkedIn is.
 * Solution: split-screen above-the-fold that answers "what is this?" in 3 seconds.
 *   LEFT  — tabloid headline "Glassdoor, but anonymous. And actually funny." + 1-line pitch + primary CTA + social proof
 *   RIGHT — a faux browser frame with a LIVE-LOOKING confession feed; a new card slides in every ~4s
 *
 * Locked taste (do not drift):
 *   - Palette: charcoal #0a0a0a / #1a1a1a / #3a2a18, amber #f59e0b
 *   - Type: Archivo Black headlines, Hind body (loaded in __root.tsx)
 *   - Layout: split-screen desktop, stacked mobile
 */

const headingFont = { fontFamily: "'Archivo Black', 'Archivo', system-ui, sans-serif" };
const bodyFont = { fontFamily: "'Hind', system-ui, sans-serif" };
const monoFont = { fontFamily: "'Courier Prime', ui-monospace, monospace" };

type Confession = {
  handle: string;
  ago: string;
  body: string;
  cheers: number;
  comments: number;
  roast: number;
};

const CONFESSION_POOL: Confession[] = [
  {
    handle: "@ghost_PM_4471",
    ago: "2m ago",
    body: "My standup is 4 PMs explaining what 'sync' means. We have not synced anything in 8 months.",
    cheers: 412,
    comments: 73,
    roast: 188,
  },
  {
    handle: "@burnt_staff_eng",
    ago: "4m ago",
    body: "Got promoted. Pay raise: $0. New responsibilities: 6. New title length: 47 characters. I have peaked.",
    cheers: 1284,
    comments: 211,
    roast: 902,
  },
  {
    handle: "@anon_designer_22",
    ago: "7m ago",
    body: "PM asked if I could 'just AI it real quick.' Sir this is a 60-page brand system.",
    cheers: 988,
    comments: 142,
    roast: 540,
  },
  {
    handle: "@laid_off_no9",
    ago: "11m ago",
    body: "HR called it a 'strategic re-skilling opportunity.' I call it Tuesday and a 3 PM beer.",
    cheers: 2310,
    comments: 388,
    roast: 1402,
  },
  {
    handle: "@cto_in_hiding",
    ago: "14m ago",
    body: "Our DEI training was an AI avatar named Chad. Chad logged off after question 2.",
    cheers: 1761,
    comments: 297,
    roast: 1188,
  },
  {
    handle: "@on_call_again",
    ago: "18m ago",
    body: "Pager went off at 3 AM. The 'incident' was the CEO trying to access Notion on a flight.",
    cheers: 3204,
    comments: 502,
    roast: 2188,
  },
  {
    handle: "@quiet_quitter_v3",
    ago: "22m ago",
    body: "I no longer attend meetings without an agenda. Calendar went from 41 hours to 4. Promoted next week.",
    cheers: 2942,
    comments: 471,
    roast: 1810,
  },
];

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function ConfessionCard({ post, accent = false }: { post: Confession; accent?: boolean }) {
  return (
    <article
      className={`rounded-lg border p-4 transition-all ${
        accent
          ? "border-amber-400/60 bg-gradient-to-br from-neutral-900 to-amber-950/30 shadow-lg shadow-amber-500/10"
          : "border-neutral-800 bg-neutral-950/80"
      }`}
      style={bodyFont}
    >
      <header className="flex items-center justify-between text-[11px]">
        <span className="font-bold text-amber-300" style={monoFont}>
          {post.handle}
        </span>
        <span className="text-neutral-500" style={monoFont}>
          {post.ago}
        </span>
      </header>
      <p className="mt-2 text-[14px] leading-snug text-neutral-100">
        {post.body}
      </p>
      <footer className="mt-3 flex items-center gap-4 text-[11px] text-neutral-400">
        <span className="inline-flex items-center gap-1.5">
          <Beer className="size-3.5 text-amber-400" /> {formatCount(post.cheers)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageCircle className="size-3.5" /> {formatCount(post.comments)}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Flame className="size-3.5 text-orange-500" /> {formatCount(post.roast)}
        </span>
      </footer>
    </article>
  );
}

export function LandingHero({ onSignIn: _onSignIn, onDecode: _onDecode }: { onSignIn: (reason: string) => void; onDecode: () => void }) {
  const [active, setActive] = useState(247);
  const [feed, setFeed] = useState<Confession[]>(() => CONFESSION_POOL.slice(0, 3));
  const idx = useRef(3);

  // Live counter — gentle drift so it feels alive without being noisy.
  useEffect(() => {
    const id = setInterval(() => {
      setActive((n) => Math.max(180, Math.min(420, n + Math.round((Math.random() - 0.4) * 6))));
    }, 3200);
    return () => clearInterval(id);
  }, []);

  // New confession slides in every ~4.5s. Bottom card falls off.
  useEffect(() => {
    const id = setInterval(() => {
      setFeed((prev) => {
        const next = CONFESSION_POOL[idx.current % CONFESSION_POOL.length];
        idx.current += 1;
        // Bump existing posts' "ago" label so it feels chronological.
        const aged = prev.map((p, i) => ({
          ...p,
          ago: i === 0 ? "just now" : `${(i + 1) * 2}m ago`,
        }));
        return [{ ...next, ago: "just now" }, ...aged].slice(0, 3);
      });
    }, 4500);
    return () => clearInterval(id);
  }, []);

  const cheersTotal = useMemo(
    () => CONFESSION_POOL.reduce((s, p) => s + p.cheers, 0),
    [],
  );

  function scrollToFeed() {
    const el = document.getElementById("feed");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollBy({ top: 700, behavior: "smooth" });
  }

  return (
    <section
      className="relative overflow-hidden rounded-3xl border border-amber-400/20 bg-[#0a0a0a] shadow-2xl shadow-amber-500/5"
      style={bodyFont}
    >
      {/* Grain + radial glow */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:3px_3px]" />
      <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-amber-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 size-96 rounded-full bg-amber-500/5 blur-3xl" />

      <div className="relative grid gap-8 p-6 sm:p-10 lg:grid-cols-2 lg:gap-10">
        {/* ============= LEFT — PITCH ============= */}
        <div className="flex flex-col justify-center">
          <div
            className="mb-5 inline-flex w-fit items-center gap-2 border border-amber-400/40 bg-amber-500/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300"
            style={monoFont}
          >
            <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
            Anonymous · Uncensored · Unemployable
          </div>

          <h1
            className="text-[clamp(2.4rem,5.5vw,4.4rem)] uppercase leading-[0.95] tracking-tight text-amber-50"
            style={headingFont}
          >
            Glassdoor,{" "}
            <span className="relative inline-block">
              <span className="bg-amber-400 px-2 text-neutral-950">
                but anonymous.
              </span>
            </span>{" "}
            And actually{" "}
            <span className="text-amber-400">funny.</span>
          </h1>

          <p className="mt-5 max-w-xl text-base sm:text-[17px] leading-relaxed text-neutral-300">
            Workplace confessions, manager roasts, and desperation polls from
            people who can't say it on Slack.{" "}
            <span className="font-semibold text-amber-200">
              No real name. No work email. Ever.
            </span>
          </p>

          {/* CTAs */}
          <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3">
            <Link
              to="/profile"
              className="group inline-flex items-center justify-center gap-2 rounded-md bg-amber-400 px-7 py-4 text-[13px] font-black uppercase tracking-[0.12em] text-neutral-950 hover:bg-amber-300 transition shadow-2xl shadow-amber-500/30"
              style={headingFont}
            >
              Drop Your First Confession
              <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <button
              onClick={scrollToFeed}
              className="inline-flex items-center justify-center gap-2 rounded-md border border-amber-400/30 bg-transparent px-5 py-3.5 text-[12px] font-bold uppercase tracking-[0.12em] text-amber-200 hover:bg-amber-500/10 transition"
              style={headingFont}
            >
              Or lurk the feed <ArrowDown className="size-4" />
            </button>
          </div>

          {/* Social proof row */}
          <div className="mt-6 flex flex-wrap items-center gap-4 text-[12px] text-neutral-400">
            <div className="inline-flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
              <span>
                <span className="font-bold text-emerald-300" style={monoFont}>
                  {active}
                </span>{" "}
                spies confessing right now
              </span>
            </div>
            <div className="hidden sm:flex items-center -space-x-2">
              {["🥸", "🫥", "👹", "🤡", "👤"].map((face, i) => (
                <span
                  key={i}
                  className="grid size-7 place-items-center rounded-full border-2 border-neutral-950 bg-neutral-800 text-sm"
                  title="anonymous mask"
                >
                  {face}
                </span>
              ))}
            </div>
            <span className="text-neutral-500" style={monoFont}>
              · join in 60s
            </span>
          </div>

          <p className="mt-3 text-[11px] text-neutral-500" style={monoFont}>
            FREE · ANON · NO WORK EMAIL · {formatCount(cheersTotal)} CHEERS TODAY
          </p>
        </div>

        {/* ============= RIGHT — LIVE FEED PREVIEW ============= */}
        <div className="relative">
          {/* Faux browser frame */}
          <div className="overflow-hidden rounded-xl border border-neutral-800 bg-[#0d0d0d] shadow-2xl shadow-black/60">
            {/* title bar */}
            <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-900/80 px-3 py-2">
              <span className="size-2.5 rounded-full bg-red-500/80" />
              <span className="size-2.5 rounded-full bg-amber-400/80" />
              <span className="size-2.5 rounded-full bg-emerald-400/80" />
              <div
                className="ml-3 flex-1 truncate rounded bg-neutral-950/80 px-2.5 py-1 text-[11px] text-neutral-400"
                style={monoFont}
              >
                drinkedin.me/feed
              </div>
              <span
                className="inline-flex items-center gap-1.5 rounded-sm border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-red-300"
                style={monoFont}
              >
                <span className="size-1.5 rounded-full bg-red-500 animate-pulse" />
                Live
              </span>
            </div>

            {/* feed body */}
            <div className="space-y-3 p-4">
              <div
                className="flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-neutral-500"
                style={monoFont}
              >
                <span>// global feed</span>
                <span className="text-amber-400">new posts ↑</span>
              </div>

              {feed.map((post, i) => (
                <div
                  key={`${post.handle}-${i}-${idx.current}`}
                  className={i === 0 ? "animate-[slideIn_0.55s_ease-out]" : ""}
                  style={{
                    animation: i === 0 ? "slideInFromTop 0.55s ease-out" : undefined,
                  }}
                >
                  <ConfessionCard post={post} accent={i === 0} />
                </div>
              ))}

              <div
                className="pt-1 text-center text-[10px] uppercase tracking-[0.2em] text-neutral-600"
                style={monoFont}
              >
                · · · 247 more spies typing · · ·
              </div>
            </div>
          </div>

          {/* floating "join the leak" sticker */}
          <div
            className="absolute -bottom-3 -right-3 rotate-[6deg] border-2 border-amber-400 bg-neutral-950 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-amber-300 shadow-xl"
            style={headingFont}
          >
            100% anon. forever.
          </div>
        </div>
      </div>

      {/* ============= "HOW IT WORKS" STRIP ============= */}
      <div className="relative border-t border-neutral-800/80 bg-neutral-950/60 px-6 py-5 sm:px-10">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { n: "01", t: "Pick a mask", d: "Random handle. No phone, no work email." },
            { n: "02", t: "Post the truth", d: "Confession, poll, or roast your manager." },
            { n: "03", t: "Watch it go viral", d: "Cheers, comments, and roast counts in real time." },
          ].map((step) => (
            <div key={step.n} className="flex items-start gap-3">
              <span
                className="text-2xl text-amber-400"
                style={headingFont}
              >
                {step.n}
              </span>
              <div>
                <div
                  className="text-[13px] uppercase tracking-wide text-amber-50"
                  style={headingFont}
                >
                  {step.t}
                </div>
                <div className="text-[12px] text-neutral-400">{step.d}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* keyframes for the slide-in card */}
      <style>{`
        @keyframes slideInFromTop {
          0%   { opacity: 0; transform: translateY(-14px) scale(0.98); }
          60%  { opacity: 1; }
          100% { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </section>
  );
}

export default LandingHero;
