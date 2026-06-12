import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { trackEngagement } from "@/lib/analytics";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { useCurrentCity } from "@/lib/useCurrentCity";
import { useRealtimeHub } from "@/lib/useRealtimeHub";

type Choice = "danger" | "thread" | "chill";
type Counts = Record<Choice, number>;

const OPTIONS: Array<{
  key: Choice; emoji: string; label: string; sub: string; accent: string; bar: string;
}> = [
  { key: "danger", emoji: "🔴", label: "Danger Zone", sub: "Ready to bolt",
    accent: "border-red-400/40 bg-red-500/10 text-red-100 hover:bg-red-500/20 hover:border-red-300/70 shadow-[0_0_18px_rgba(248,113,113,0.25)]",
    bar: "from-red-500 to-rose-400" },
  { key: "thread", emoji: "🟡", label: "Hanging by a thread", sub: "One more meeting and I'm gone",
    accent: "border-amber-400/40 bg-amber-500/10 text-amber-100 hover:bg-amber-500/20 hover:border-amber-300/70 shadow-[0_0_18px_rgba(251,191,36,0.25)]",
    bar: "from-amber-400 to-yellow-300" },
  { key: "chill", emoji: "🟢", label: "Chilling", sub: "Manager is away",
    accent: "border-emerald-400/40 bg-emerald-500/10 text-emerald-100 hover:bg-emerald-500/20 hover:border-emerald-300/70 shadow-[0_0_18px_rgba(16,185,129,0.25)]",
    bar: "from-emerald-400 to-teal-300" },
];

// LocalStorage fallback so unauthed guests get a "you already saw the result" shape.
const VOTED_KEY = "drinkedin_has_voted_today";

type VotedStash = { hub: string; choice: Choice; day: string };

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

function loadVoted(hub: string): Choice | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(VOTED_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as VotedStash;
    if (parsed.hub !== hub || parsed.day !== todayUTC()) return null;
    return parsed.choice;
  } catch { return null; }
}

function saveVoted(hub: string, choice: Choice) {
  if (typeof window === "undefined") return;
  try { localStorage.setItem(VOTED_KEY, JSON.stringify({ hub, choice, day: todayUTC() } as VotedStash)); }
  catch { /* ignore */ }
}

export default function DesperationPoll({ onSignUp }: { onSignUp: () => void }) {
  const { user } = useAuth();
  const hub = useCurrentCity();
  const [choice, setChoice] = useState<Choice | null>(null);
  const [counts, setCounts] = useState<Counts>({ danger: 0, thread: 0, chill: 0 });
  const [busy, setBusy] = useState(false);

  // Hydrate localStorage stash → instantly render the breakout chart for guests.
  useEffect(() => {
    setChoice(loadVoted(hub));
  }, [hub]);

  // Initial fetch of aggregate counts for this hub.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any).rpc("get_poll_counts", { p_hub: hub });
      if (cancelled) return;
      if (!error && Array.isArray(data) && data[0]) {
        const r = data[0] as { danger: number; thread: number; chill: number };
        setCounts({ danger: r.danger ?? 0, thread: r.thread ?? 0, chill: r.chill ?? 0 });
      } else {
        setCounts({ danger: 0, thread: 0, chill: 0 });
      }
    })();
    return () => { cancelled = true; };
  }, [hub]);

  // Realtime: any INSERT on poll_votes for this hub → +1 the matching bar.
  useRealtimeHub<{ choice: Choice; hub: string }>("poll_votes", hub, (row) => {
    if (row.choice !== "danger" && row.choice !== "thread" && row.choice !== "chill") return;
    setCounts((prev) => ({ ...prev, [row.choice]: prev[row.choice] + 1 }));
  });

  const total = useMemo(() => counts.danger + counts.thread + counts.chill, [counts]);

  async function vote(opt: Choice) {
    if (busy) return;
    // Optimistic UI for guests: lock the view + stash locally.
    saveVoted(hub, opt);
    setChoice(opt);
    setCounts((prev) => ({ ...prev, [opt]: prev[opt] + 1 }));
    trackEngagement("desperation_poll_vote", { choice: opt, hub });

    if (!user) return; // guest — wait for them to sign in via the CTA before persisting.

    setBusy(true);
    const { data, error } = await (supabase as any).rpc("cast_poll_vote", {
      p_hub: hub,
      p_choice: opt,
    });
    setBusy(false);
    if (!error && Array.isArray(data) && data[0]) {
      const r = data[0] as { danger: number; thread: number; chill: number };
      // Reconcile to authoritative numbers from the DB.
      setCounts({ danger: r.danger ?? 0, thread: r.thread ?? 0, chill: r.chill ?? 0 });
    }
  }

  function handleSignUp() {
    trackEngagement("desperation_poll_signup_click", { choice: choice ?? "none", hub });
    onSignUp();
  }

  return (
    <Card className="p-5 border-border animate-fade-in">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="min-w-0">
          <h3 className="text-sm font-bold uppercase tracking-wider text-amber-200/90">
            📊 Today's Desperation Index <span className="text-[10px] text-muted-foreground normal-case tracking-normal">· {hub}</span>
          </h3>
          <p className="mt-1 text-[13px] text-foreground/85 leading-snug">
            How close are you to slamming your laptop and heading out?
          </p>
        </div>
        <span className="shrink-0 text-[10px] font-mono uppercase tracking-wider text-emerald-300/90 border border-emerald-500/30 rounded-full px-2 py-0.5">
          Live · {total.toLocaleString()} votes
        </span>
      </div>

      {!choice && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 animate-fade-in">
          {OPTIONS.map((opt) => (
            <button
              key={opt.key}
              type="button"
              onClick={() => vote(opt.key)}
              className={`group flex flex-col items-start gap-1 rounded-xl border px-3 py-3 text-left transition hover-scale ${opt.accent}`}
            >
              <span className="text-2xl leading-none">{opt.emoji}</span>
              <span className="text-[13px] font-bold leading-tight">{opt.label}</span>
              <span className="text-[11px] opacity-80 leading-snug">{opt.sub}</span>
            </button>
          ))}
        </div>
      )}

      {choice && (
        <div className="space-y-2 animate-fade-in">
          {OPTIONS.map((opt) => {
            const value = counts[opt.key];
            const pct = total > 0 ? Math.round((value / total) * 100) : 0;
            const mine = opt.key === choice;
            return (
              <div key={opt.key} className="space-y-1">
                <div className="flex items-center justify-between text-[12px]">
                  <span className={`font-semibold ${mine ? "text-foreground" : "text-muted-foreground"}`}>
                    <span className="mr-1">{opt.emoji}</span>
                    {opt.label}
                    {mine && <span className="ml-2 text-[10px] uppercase tracking-wider text-amber-300">Your pick</span>}
                  </span>
                  <span className="tabular-nums font-mono text-[11px] text-muted-foreground">
                    {pct}% · {value.toLocaleString()}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-white/5 overflow-hidden">
                  <div
                    className={`h-full bg-gradient-to-r ${opt.bar} transition-[width] duration-700 ease-out ${mine ? "shadow-[0_0_12px_rgba(251,191,36,0.45)]" : ""}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            );
          })}

          {!user && (
            <button
              type="button"
              onClick={handleSignUp}
              className="mt-3 w-full text-left rounded-lg border border-amber-400/30 bg-amber-500/10 hover:bg-amber-500/15 hover:border-amber-300/60 transition px-3 py-2.5 text-[12px] leading-snug text-amber-100/95"
            >
              🔗 <span className="font-bold">Lock your vote on the live leaderboard</span> and drop an anonymous confession.{" "}
              <span className="underline decoration-amber-300/60 underline-offset-2">Tap to sign in</span>{" "}
              <span className="text-amber-200/75">(1-Click Google)</span>
            </button>
          )}
        </div>
      )}
    </Card>
  );
}
