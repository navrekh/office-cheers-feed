import { useEffect, useRef, useState } from "react";
import { ArrowDown, ArrowRight, Flame, MessageCircle, Beer } from "lucide-react";
import { Link } from "@tanstack/react-router";

/**
 * LandingHero — full-bleed makeover (July 2026).
 *
 * Rewrite goals:
 *   1. Utilize the full page width (parent breaks out of the 3xl container).
 *   2. No clipped text at any breakpoint — mobile-first typography with
 *      `break-words` + `min-w-0` on every flex/grid text container.
 *   3. Left-aligned content, not centered — reads like a real landing page.
 *   4. Live faux-feed panel stacks BELOW the pitch on mobile, sits beside it
 *      on lg+. Both columns get `min-w-0` so nothing overflows.
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
  { handle: "@ghost_PM_4471", ago: "2m ago", body: "My standup is 4 PMs explaining what 'sync' means. We have not synced anything in 8 months.", cheers: 412, comments: 73, roast: 188 },
  { handle: "@burnt_staff_eng", ago: "4m ago", body: "Got promoted. Pay raise: $0. New responsibilities: 6. New title length: 47 characters. I have peaked.", cheers: 1284, comments: 211, roast: 902 },
  { handle: "@anon_designer_22", ago: "7m ago", body: "PM asked if I could 'just AI it real quick.' Sir this is a 60-page brand system.", cheers: 988, comments: 142, roast: 540 },
  { handle: "@laid_off_no9", ago: "11m ago", body: "HR called it a 'strategic re-skilling opportunity.' I call it Tuesday and a 3 PM beer.", cheers: 2310, comments: 388, roast: 1402 },
  { handle: "@cto_in_hiding", ago: "14m ago", body: "Our DEI training was an AI avatar named Chad. Chad logged off after question 2.", cheers: 1761, comments: 297, roast: 1188 },
  { handle: "@on_call_again", ago: "18m ago", body: "Pager went off at 3 AM. The 'incident' was the CEO trying to access Notion on a flight.", cheers: 3204, comments: 502, roast: 2188 },
  { handle: "@quiet_quitter_v3", ago: "22m ago", body: "I no longer attend meetings without an agenda. Calendar went from 41h to 4. Promoted next week.", cheers: 2942, comments: 471, roast: 1810 },
];

function formatCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return String(n);
}

function ConfessionCard({ post, accent = false }: { post: Confession; accent?: boolean }) {
  return (
    <article
      className={`min-w-0 rounded-lg border p-3 sm:p-4 ${
        accent
          ? "border-amber-400/60 bg-gradient-to-br from-neutral-900 to-amber-950/30"
          : "border-neutral-800 bg-neutral-950/80"
      }`}
      style={bodyFont}
    >
      <header className="flex items-center justify-between gap-2 text-[11px] min-w-0">
        <span className="truncate font-bold text-amber-300" style={monoFont}>{post.handle}</span>
        <span className="shrink-0 text-neutral-500" style={monoFont}>{post.ago}</span>
      </header>
      <p className="mt-2 text-[13px] sm:text-[14px] leading-snug text-neutral-100 break-words">
        {post.body}
      </p>
      <footer className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-neutral-400">
        <span className="inline-flex items-center gap-1.5"><Beer className="size-3.5 text-amber-400" /> {formatCount(post.cheers)}</span>
        <span className="inline-flex items-center gap-1.5"><MessageCircle className="size-3.5" /> {formatCount(post.comments)}</span>
        <span className="inline-flex items-center gap-1.5"><Flame className="size-3.5 text-orange-500" /> {formatCount(post.roast)}</span>
      </footer>
    </article>
  );
}

export function LandingHero({ onSignIn: _onSignIn, onDecode: _onDecode }: { onSignIn: (reason: string) => void; onDecode: () => void }) {
  const [active, setActive] = useState(247);
  const [feed, setFeed] = useState<Confession[]>(() => CONFESSION_POOL.slice(0, 3));
  const idx = useRef(3);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((n) => Math.max(180, Math.min(420, n + Math.round((Math.random() - 0.4) * 6))));
    }, 3200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setFeed((prev) => {
        const next = CONFESSION_POOL[idx.current % CONFESSION_POOL.length];
        idx.current += 1;
        const aged = prev.map((p, i) => ({ ...p, ago: i === 0 ? "just now" : `${(i + 1) * 2}m ago` }));
        return [{ ...next, ago: "just now" }, ...aged].slice(0, 3);
      });
    }, 4500);
    return () => clearInterval(id);
  }, []);

  function scrollToFeed() {
    const el = document.getElementById("feed");
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    else window.scrollBy({ top: 700, behavior: "smooth" });
  }

  return (
    <section
      className="relative w-full overflow-hidden rounded-2xl border border-amber-400/20 bg-[#0a0a0a]"
      style={bodyFont}
    >
      {/* Grain + radial glow */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.04] [background-image:radial-gradient(rgba(255,255,255,0.6)_1px,transparent_1px)] [background-size:3px_3px]" />
      <div className="pointer-events-none absolute -top-32 -left-32 size-96 rounded-full bg-amber-500/10 blur-3xl" />

      <div className="relative mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-10 lg:py-16">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr] lg:gap-12 items-start">
          {/* ============= LEFT — PITCH ============= */}
          <div className="min-w-0 flex flex-col">
            <div
              className="mb-4 sm:mb-5 inline-flex w-fit max-w-full items-center gap-2 border border-amber-400/40 bg-amber-500/5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300"
              style={monoFont}
            >
              <span className="size-1.5 shrink-0 rounded-full bg-amber-400 animate-pulse" />
              <span className="truncate">Anonymous · Uncensored · Unemployable</span>
            </div>

            <h1
              className="uppercase leading-[1.02] tracking-tight text-amber-50 text-[2rem] sm:text-[2.75rem] md:text-[3.25rem] lg:text-[3.75rem] xl:text-[4.25rem] break-words"
              style={headingFont}
            >
              <span className="block">Glassdoor,</span>
              <span className="mt-1 inline-block bg-amber-400 px-2 py-0.5 text-neutral-950 leading-[1.05]">
                but anonymous.
              </span>
              <span className="block mt-1">
                And actually <span className="text-amber-400">funny.</span>
              </span>
            </h1>

            <p className="mt-5 max-w-xl text-[15px] sm:text-[17px] leading-relaxed text-neutral-300 break-words">
              Workplace confessions, manager roasts, and desperation polls from people who can't say it on Slack.{" "}
              <span className="font-semibold text-amber-200">No real name. No work email. Ever.</span>
            </p>

            <div className="mt-6 sm:mt-7 flex flex-col sm:flex-row sm:flex-wrap gap-3">
              <Link
                to="/profile"
                className="group inline-flex items-center justify-center gap-2 rounded-md bg-amber-400 px-5 sm:px-7 py-3.5 sm:py-4 text-[12px] sm:text-[13px] font-black uppercase tracking-[0.12em] text-neutral-950 hover:bg-amber-300 transition shadow-xl shadow-amber-500/20"
                style={headingFont}
              >
                Drop Your First Confession
                <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
              </Link>
              <button
                onClick={scrollToFeed}
                className="inline-flex items-center justify-center gap-2 rounded-md border border-amber-400/30 bg-transparent px-5 py-3 text-[12px] font-bold uppercase tracking-[0.12em] text-amber-200 hover:bg-amber-500/10 transition"
                style={headingFont}
              >
                Or lurk the feed <ArrowDown className="size-4" />
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-neutral-400">
              <div className="inline-flex items-center gap-2 min-w-0">
                <span className="size-2 shrink-0 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_10px_rgba(52,211,153,0.7)]" />
                <span className="truncate">
                  <span className="font-bold text-emerald-300" style={monoFont}>{active}</span>{" "}
                  spies confessing right now
                </span>
              </div>
              <div className="hidden sm:flex items-center -space-x-2">
                {["🥸", "🫥", "👹", "🤡", "👤"].map((face, i) => (
                  <span key={i} className="grid size-7 place-items-center rounded-full border-2 border-neutral-950 bg-neutral-800 text-sm">
                    {face}
                  </span>
                ))}
              </div>
            </div>

            <p className="mt-3 text-[11px] text-neutral-500 break-words" style={monoFont}>
              FREE · ANON · NO WORK EMAIL · 12.9K CHEERS TODAY
            </p>
          </div>

          {/* ============= RIGHT — LIVE FEED PREVIEW ============= */}
          <div className="min-w-0 w-full">
            <div className="overflow-hidden rounded-xl border border-neutral-800 bg-[#0d0d0d] shadow-2xl shadow-black/60">
              <div className="flex items-center gap-2 border-b border-neutral-800 bg-neutral-900/80 px-3 py-2 min-w-0">
                <span className="size-2.5 shrink-0 rounded-full bg-red-500/80" />
                <span className="size-2.5 shrink-0 rounded-full bg-amber-400/80" />
                <span className="size-2.5 shrink-0 rounded-full bg-emerald-400/80" />
                <div className="ml-2 min-w-0 flex-1 truncate rounded bg-neutral-950/80 px-2.5 py-1 text-[11px] text-neutral-400" style={monoFont}>
                  drinkedin.me/feed
                </div>
                <span
                  className="shrink-0 inline-flex items-center gap-1.5 rounded-sm border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-widest text-red-300"
                  style={monoFont}
                >
                  <span className="size-1.5 rounded-full bg-red-500 animate-pulse" /> Live
                </span>
              </div>

              <div className="space-y-3 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.18em] text-neutral-500 min-w-0" style={monoFont}>
                  <span className="truncate">// global feed</span>
                  <span className="shrink-0 text-amber-400">new posts ↑</span>
                </div>

                {feed.map((post, i) => (
                  <div
                    key={`${post.handle}-${i}-${idx.current}`}
                    style={{ animation: i === 0 ? "slideInFromTop 0.55s ease-out" : undefined }}
                  >
                    <ConfessionCard post={post} accent={i === 0} />
                  </div>
                ))}

                <div className="pt-1 text-center text-[10px] uppercase tracking-[0.2em] text-neutral-600" style={monoFont}>
                  · · · 247 more spies typing · · ·
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ============= "HOW IT WORKS" STRIP ============= */}
        <div className="mt-10 sm:mt-12 border-t border-neutral-800/80 pt-6 sm:pt-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            {[
              { n: "01", t: "Pick a mask", d: "Random handle. No phone, no work email." },
              { n: "02", t: "Post the truth", d: "Confession, poll, or roast your manager." },
              { n: "03", t: "Watch it go viral", d: "Cheers, comments, and roast counts in real time." },
            ].map((step) => (
              <div key={step.n} className="flex items-start gap-3 min-w-0">
                <span className="shrink-0 text-2xl text-amber-400" style={headingFont}>{step.n}</span>
                <div className="min-w-0">
                  <div className="text-[13px] uppercase tracking-wide text-amber-50" style={headingFont}>{step.t}</div>
                  <div className="text-[12px] text-neutral-400 break-words">{step.d}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

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
