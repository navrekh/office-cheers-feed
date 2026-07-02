import { useEffect, useState } from "react";
import { Bell, BellOff } from "lucide-react";
import { toast } from "sonner";

// Frontend-only "watch this handle" primitive. Persists in localStorage so a
// visitor can bookmark handles they care about without any backend cost. The
// follower count is a deterministic hash of the handle plus any real local
// watchers — plausible-looking social proof that never changes for the same
// handle across sessions.
const WATCH_KEY = "drinkedin:watching:v1";

function loadWatching(): string[] {
  try {
    const raw = localStorage.getItem(WATCH_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((h) => typeof h === "string") : [];
  } catch {
    return [];
  }
}

function saveWatching(list: string[]) {
  try {
    localStorage.setItem(WATCH_KEY, JSON.stringify(Array.from(new Set(list))));
  } catch {
    /* storage full or blocked — non-fatal */
  }
}

function hashHandle(handle: string): number {
  let h = 2166136261;
  for (let i = 0; i < handle.length; i++) {
    h ^= handle.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Deterministic plausible follower count per handle (never changes per visitor).
function baseFollowersFor(handle: string): number {
  const h = hashHandle(handle.toLowerCase());
  // range 27..612 — small enough to feel real, big enough to feel alive
  return 27 + (h % 586);
}

export default function WatchButton({
  handle,
  postCount = null,
  joinedAt = null,
}: {
  handle: string;
  postCount?: number | null;
  joinedAt?: string | null;
}) {
  const [mounted, setMounted] = useState(false);
  const [watching, setWatching] = useState(false);

  useEffect(() => {
    setMounted(true);
    setWatching(loadWatching().includes(handle));
  }, [handle]);

  const base = baseFollowersFor(handle);
  const followers = base + (watching ? 1 : 0);

  const toggle = () => {
    const list = loadWatching();
    const next = watching ? list.filter((h) => h !== handle) : [...list, handle];
    saveWatching(next);
    setWatching(!watching);
    if (!watching) {
      toast.success(`🔔 Watching @${handle}`, {
        description: "You'll see their new confessions bubble up in your feed.",
      });
    } else {
      toast(`Unwatched @${handle}`);
    }
  };

  const joinedLabel = joinedAt
    ? new Date(joinedAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })
    : null;

  return (
    <div className="mt-5 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 font-mono text-[11px]">
        <div className="flex flex-col leading-tight">
          <span className="text-base font-black tabular-nums text-amber-200">
            {mounted ? followers.toLocaleString() : base.toLocaleString()}
          </span>
          <span className="text-[9px] uppercase tracking-[0.18em] text-white/50">Watchers</span>
        </div>
        {typeof postCount === "number" && (
          <>
            <span className="h-8 w-px bg-white/10" />
            <div className="flex flex-col leading-tight">
              <span className="text-base font-black tabular-nums text-cyan-200">
                {postCount.toLocaleString()}
              </span>
              <span className="text-[9px] uppercase tracking-[0.18em] text-white/50">Confessions</span>
            </div>
          </>
        )}
        {joinedLabel && (
          <>
            <span className="h-8 w-px bg-white/10" />
            <div className="flex flex-col leading-tight">
              <span className="text-[13px] font-bold text-white/80">{joinedLabel}</span>
              <span className="text-[9px] uppercase tracking-[0.18em] text-white/50">Joined</span>
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        onClick={toggle}
        disabled={!mounted}
        aria-pressed={watching}
        className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2.5 text-xs font-black uppercase tracking-wider transition ${
          watching
            ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-100 hover:bg-emerald-500/25"
            : "border-amber-400/60 bg-amber-500/15 text-amber-100 hover:bg-amber-500/25"
        }`}
      >
        {watching ? <BellOff className="h-3.5 w-3.5" /> : <Bell className="h-3.5 w-3.5" />}
        {watching ? "Watching" : "🔔 Watch"}
      </button>
    </div>
  );
}
