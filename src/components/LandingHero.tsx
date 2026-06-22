import { useEffect, useState } from "react";
import { ArrowDown } from "lucide-react";

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
        Confessions, desperation polls, manager roasts. No real names. No work email.
        Just the unfiltered truth of modern work life — scroll down, we'll prove it.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <button
          onClick={scrollToFeed}
          className="inline-flex items-center gap-2 rounded-lg bg-amber-400 px-5 py-3 text-sm font-black uppercase tracking-wider text-neutral-950 hover:bg-amber-300 transition shadow-lg shadow-amber-500/20"
        >
          Read tonight's confessions <ArrowDown className="size-4" />
        </button>
        <span className="text-[11px] text-neutral-500">
          Lurk free · sign up only when you want to post
        </span>
      </div>
    </section>
  );
}

export default LandingHero;
