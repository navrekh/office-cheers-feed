import { useEffect, useState, useCallback } from "react";
import { Coffee, Code2, Flame, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

type Metric = "slippery" | "ninja" | "cooked";
type Counts = { slippery: number; ninja: number; cooked: number };

const METRICS: Array<{
  key: Metric;
  label: string;
  emoji: string;
  Icon: typeof Coffee;
  bar: string;
  glow: string;
  ring: string;
  text: string;
}> = [
  { key: "slippery", label: "Slippery", emoji: "☕", Icon: Coffee, bar: "bg-emerald-400", glow: "shadow-[0_0_12px_rgba(52,211,153,0.5)]", ring: "border-emerald-500/40", text: "text-emerald-300" },
  { key: "ninja",    label: "Ninja",    emoji: "💻", Icon: Code2,  bar: "bg-amber-400",   glow: "shadow-[0_0_12px_rgba(251,191,36,0.5)]",  ring: "border-amber-500/40",   text: "text-amber-300" },
  { key: "cooked",   label: "Cooked",   emoji: "🔥", Icon: Flame,  bar: "bg-red-400",     glow: "shadow-[0_0_12px_rgba(248,113,113,0.5)]", ring: "border-red-500/40",     text: "text-red-300" },
];

const SESSION_KEY = "drinkedin:metric-session";
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

const VOTED_KEY = (handle: string) => `drinkedin:voted:${handle}`;
function getVoted(handle: string): Record<Metric, boolean> {
  if (typeof window === "undefined") return { slippery: false, ninja: false, cooked: false };
  try { return { slippery: false, ninja: false, cooked: false, ...JSON.parse(localStorage.getItem(VOTED_KEY(handle)) || "{}") }; }
  catch { return { slippery: false, ninja: false, cooked: false }; }
}
function setVoted(handle: string, voted: Record<Metric, boolean>) {
  try { localStorage.setItem(VOTED_KEY(handle), JSON.stringify(voted)); } catch { /* noop */ }
}

export function SurvivalMetrics({
  handle,
  readOnly = false,
  compact = false,
}: {
  handle: string;
  /** When viewing your own private badge, hide vote buttons */
  readOnly?: boolean;
  /** Tighter layout for the badge header */
  compact?: boolean;
}) {
  const [counts, setCounts] = useState<Counts>({ slippery: 0, ninja: 0, cooked: 0 });
  const [voted, setVotedState] = useState<Record<Metric, boolean>>({ slippery: false, ninja: false, cooked: false });
  const [busy, setBusy] = useState<Metric | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!handle) { setLoading(false); return; }
    const { data, error } = await (supabase as any).rpc("get_profile_metrics", { p_handle: handle });
    setLoading(false);
    if (error) { console.error(error); return; }
    const rec = Array.isArray(data) ? data[0] : data;
    if (rec) setCounts({ slippery: rec.slippery ?? 0, ninja: rec.ninja ?? 0, cooked: rec.cooked ?? 0 });
  }, [handle]);

  useEffect(() => { load(); setVotedState(getVoted(handle)); }, [load, handle]);

  // Live updates: any insert into the votes table refreshes counts for this owner
  useEffect(() => {
    if (!handle) return;
    const channel = supabase
      .channel(`metrics:${handle}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "profile_metric_votes" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [handle, load]);

  async function vote(metric: Metric) {
    if (readOnly || voted[metric] || busy) return;
    setBusy(metric);
    // Optimistic
    setCounts((c) => ({ ...c, [metric]: c[metric] + 1 }));
    const next = { ...voted, [metric]: true };
    setVotedState(next);
    setVoted(handle, next);

    const { data, error } = await (supabase as any).rpc("cast_metric_vote", {
      p_handle: handle,
      p_metric: metric,
      p_session: getSessionId(),
    });
    setBusy(null);
    if (error) {
      // Rollback
      setCounts((c) => ({ ...c, [metric]: Math.max(0, c[metric] - 1) }));
      const back = { ...voted, [metric]: false };
      setVotedState(back);
      setVoted(handle, back);
      toast.error(error.message || "Couldn't cast vote");
      return;
    }
    const rec = Array.isArray(data) ? data[0] : data;
    if (rec) setCounts({ slippery: rec.slippery ?? 0, ninja: rec.ninja ?? 0, cooked: rec.cooked ?? 0 });
  }

  const total = Math.max(1, counts.slippery + counts.ninja + counts.cooked);

  return (
    <div className={`rounded-lg border border-amber-500/20 bg-black/40 ${compact ? "p-3" : "p-4"}`}>
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[10px] font-bold uppercase tracking-[0.25em] text-amber-400/80">
          ▸ Corporate Survival Metrics
        </h3>
        {loading ? (
          <Loader2 className="h-3 w-3 animate-spin text-amber-400/60" />
        ) : (
          <span className="text-[9px] uppercase tracking-widest text-amber-400/40">
            {counts.slippery + counts.ninja + counts.cooked} votes
          </span>
        )}
      </div>

      <div className="space-y-2">
        {METRICS.map(({ key, label, emoji, bar, text, ring, glow }) => {
          const v = counts[key];
          const pct = Math.round((v / total) * 100);
          const did = voted[key];
          return (
            <div key={key} className="grid grid-cols-[88px,1fr,auto] items-center gap-2">
              <div className={`flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest ${text}`}>
                <span aria-hidden>{emoji}</span> {label}
              </div>
              <div className="relative h-3 overflow-hidden rounded-sm border border-amber-500/15 bg-zinc-950">
                <div
                  className={`absolute inset-y-0 left-0 ${bar} ${pct > 0 ? glow : ""} transition-[width] duration-500 ease-out`}
                  style={{ width: `${pct}%` }}
                />
                <div className="absolute inset-0 grid place-items-center text-[9px] font-bold tabular-nums text-black/80 mix-blend-screen">
                  {pct}% · {v}
                </div>
              </div>
              {readOnly ? (
                <span className={`rounded-sm border px-1.5 py-0.5 text-[9px] uppercase tracking-widest text-amber-400/40 ${ring}`}>
                  ◉ live
                </span>
              ) : (
                <button
                  type="button"
                  onClick={() => vote(key)}
                  disabled={did || busy === key}
                  title={did ? "Vote logged" : `Cast ${label} vote`}
                  className={`inline-flex h-6 min-w-[40px] items-center justify-center gap-0.5 rounded-sm border px-1.5 text-[10px] font-bold uppercase tracking-widest transition ${ring} ${did ? "opacity-50" : "hover:bg-amber-500/10"} ${text}`}
                >
                  {busy === key ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : did ? (
                    "✓"
                  ) : (
                    <>
                      <Plus className="h-3 w-3" /> +1
                    </>
                  )}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {!readOnly && (
        <p className="mt-2 text-[9px] uppercase tracking-widest text-amber-400/30">
          Anonymous · No identity captured · One vote per metric
        </p>
      )}
    </div>
  );
}
