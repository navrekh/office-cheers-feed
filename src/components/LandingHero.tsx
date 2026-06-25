import { useEffect, useState } from "react";
import { ArrowDown, ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function LandingHero({ onSignIn: _onSignIn, onDecode: _onDecode }: { onSignIn: (reason: string) => void; onDecode: () => void }) {
  const [active, setActive] = useState(247);

  useEffect(() => {
    const id = setInterval(() => {
      setActive((n) => Math.max(180, n + Math.round((Math.random() - 0.45) * 6)));
    }, 3200);
    return () => clearInterval(id);
  }, []);

  function scrollToFeed() {
    const el = document.getElementById("feed");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollBy({ top: 600, behavior: "smooth" });
    }
  }

  return (
    <section className="rounded-3xl border border-amber-400/20 bg-gradient-to-br from-neutral-950 via-neutral-950 to-amber-950/20 p-6 sm:p-10 shadow-2xl shadow-amber-500/5">
      <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-emerald-300">
        <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
        {active} spies confessing tonight
      </div>

      <h1 className="text-3xl sm:text-5xl font-black leading-tight text-amber-50">
        The anonymous{" "}
        <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
          breakroom
        </span>{" "}
        for everyone who can't say it on Slack.
      </h1>
      <p className="mt-4 max-w-2xl text-sm sm:text-base text-neutral-400 leading-relaxed">
        Confessions, desperation polls, manager roasts. And a one-click{" "}
        <span className="text-amber-300 font-semibold">Anti-ATS profile</span>{" "}
        that recruiters can actually read. No real names. No work email.
      </p>

      {/* PRIMARY CTA — routes straight to the product, above the fold. */}
      <div className="mt-7 flex flex-col sm:flex-row sm:items-center gap-3">
        <Link
          to="/profile"
          className="group inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-300 to-amber-500 px-7 py-4 text-base font-black uppercase tracking-wider text-neutral-950 hover:from-amber-200 hover:to-amber-400 transition shadow-2xl shadow-amber-500/30 ring-2 ring-amber-300/40"
        >
          <Sparkles className="size-5" />
          Create Your Anti-ATS Profile
          <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
        </Link>
        <button
          onClick={scrollToFeed}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-400/30 bg-neutral-900/60 px-5 py-3 text-xs font-bold uppercase tracking-wider text-amber-200 hover:bg-neutral-900 transition"
        >
          Or lurk the feed <ArrowDown className="size-4" />
        </button>
      </div>
      <p className="mt-3 text-[11px] text-neutral-500">
        Free · anonymous · 60 seconds · no work email required
      </p>
    </section>
  );
}

export default LandingHero;
