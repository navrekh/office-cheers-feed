import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Twitter-style "+N new sips" pill.
 * Counts posts that arrive while the user has scrolled away from the top of the feed.
 * Click → smooth scroll to top + reset counter.
 */
export default function NewSipsPill() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let armed = false;
    const armTimer = setTimeout(() => {
      armed = true;
    }, 4000);

    const ch = supabase
      .channel("new-sips-pill")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        () => {
          if (!armed) return;
          // Only count if user is scrolled below the fold; otherwise they'll see it land
          if (typeof window !== "undefined" && window.scrollY > 240) {
            setCount((n) => Math.min(n + 1, 99));
          }
        },
      )
      .subscribe();

    const onScroll = () => {
      if (typeof window !== "undefined" && window.scrollY < 120) setCount(0);
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      clearTimeout(armTimer);
      supabase.removeChannel(ch);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  if (count === 0) return null;

  return (
    <div className="sticky top-16 z-30 flex justify-center pointer-events-none animate-fade-in">
      <button
        type="button"
        onClick={() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
          setCount(0);
        }}
        className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-amber-500 to-amber-400 hover:from-amber-400 hover:to-amber-300 text-amber-950 text-[12px] font-extrabold uppercase tracking-wider px-4 py-2 shadow-[0_4px_24px_-2px_rgba(251,191,36,0.6)] border border-amber-300/60 transition-transform hover:scale-105 active:scale-95"
      >
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-80" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
        </span>
        <span>+{count} new sip{count === 1 ? "" : "s"}</span>
        <span className="text-base leading-none">↑</span>
      </button>
    </div>
  );
}
