import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { usePresenceCount, useTypingPeers } from "@/lib/presence";

/**
 * Slim social-presence strip above the feed.
 * - Live anon count via Supabase Presence
 * - Typing pings via Realtime broadcast
 * - 🔴 LIVE badge that pulses for ~2s on every new post insert
 */
export default function PresenceBar() {
  const count = usePresenceCount();
  const typing = useTypingPeers();
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    const ch = supabase
      .channel("presence-bar-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        () => {
          setPulse(true);
          setTimeout(() => setPulse(false), 2200);
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, []);

  const typingLabel = useMemo(() => {
    if (typing.length === 0) return null;
    const cities = Array.from(new Set(typing.map((t) => t.city).filter(Boolean)));
    if (typing.length === 1) {
      return `someone in ${cities[0] ?? "the breakroom"} is typing…`;
    }
    if (cities.length === 1) {
      return `${typing.length} anons in ${cities[0]} are typing…`;
    }
    return `${typing.length} anons typing across ${cities.slice(0, 2).join(" & ")}…`;
  }, [typing]);

  const displayCount = Math.max(count, 1);

  return (
    <div
      className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 border border-[#1f1f1f] bg-[#0d0d0d]/70 backdrop-blur-md min-w-0"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        <span className="text-[12px] font-bold text-emerald-300 tabular-nums shrink-0">
          {displayCount.toLocaleString()}
        </span>
        <span className="text-[11px] uppercase tracking-wider text-foreground/70 truncate">
          anon{displayCount === 1 ? "" : "s"} sipping right now
        </span>
        <span
          className={`ml-1 inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-wider shrink-0 transition-all duration-300 ${
            pulse
              ? "border-red-400/80 bg-red-500/20 text-red-200 shadow-[0_0_12px_rgba(248,113,113,0.6)] scale-105"
              : "border-red-500/30 bg-red-500/5 text-red-400/60"
          }`}
          aria-label="Live feed indicator"
        >
          <span className={`h-1.5 w-1.5 rounded-full bg-red-500 ${pulse ? "animate-ping" : ""}`} />
          LIVE
        </span>
      </div>
      {typingLabel && (
        <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-amber-300/80 italic truncate min-w-0">
          <span className="inline-flex gap-0.5">
            <span className="h-1 w-1 rounded-full bg-amber-300 animate-bounce [animation-delay:-0.3s]" />
            <span className="h-1 w-1 rounded-full bg-amber-300 animate-bounce [animation-delay:-0.15s]" />
            <span className="h-1 w-1 rounded-full bg-amber-300 animate-bounce" />
          </span>
          <span className="truncate">{typingLabel}</span>
        </div>
      )}
    </div>
  );
}

