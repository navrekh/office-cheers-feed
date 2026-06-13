import { useMemo } from "react";
import { usePresenceCount, useTypingPeers } from "@/lib/presence";

/**
 * Slim social-presence strip that sits above the feed.
 * Layout-safe: single row, full width of its parent, no width changes.
 */
export default function PresenceBar() {
  const count = usePresenceCount();
  const typing = useTypingPeers();

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
