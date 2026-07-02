import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type EmojiKey = "laugh" | "skull" | "melt" | "fire";
const EMOJIS: { key: EmojiKey; char: string; label: string; color: string }[] = [
  { key: "laugh", char: "😂", label: "LOL", color: "text-yellow-200 border-yellow-400/40 bg-yellow-500/10" },
  { key: "skull", char: "💀", label: "Dead", color: "text-zinc-200 border-zinc-400/40 bg-zinc-500/10" },
  { key: "melt", char: "🫠", label: "Cooked", color: "text-orange-200 border-orange-400/40 bg-orange-500/10" },
  { key: "fire", char: "🔥", label: "Fire", color: "text-red-200 border-red-400/40 bg-red-500/10" },
];

const SESSION_KEY_STORAGE = "drinkedin_reaction_session_v1";
const MINE_KEY = "drinkedin_reaction_mine_v1";

function getSessionKey(): string {
  if (typeof window === "undefined") return "server_session";
  let k = window.localStorage.getItem(SESSION_KEY_STORAGE);
  if (!k) {
    k = "s_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
    window.localStorage.setItem(SESSION_KEY_STORAGE, k);
  }
  return k;
}
function readMine(): Record<string, Record<string, true>> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(window.localStorage.getItem(MINE_KEY) || "{}"); } catch { return {}; }
}
function writeMine(m: Record<string, Record<string, true>>) {
  try { window.localStorage.setItem(MINE_KEY, JSON.stringify(m)); } catch {}
}

export default function MultiReactions({
  postId,
  onMilestone,
}: { postId: string; onMilestone?: (total: number) => void }) {
  const [counts, setCounts] = useState<Record<EmojiKey, number>>({ laugh: 0, skull: 0, melt: 0, fire: 0 });
  const [mine, setMine] = useState<Record<EmojiKey, boolean>>({ laugh: false, skull: false, melt: false, fire: false });
  const isSim = postId.startsWith("sim-") || postId.startsWith("seed-") || postId.startsWith("global-") || postId.startsWith("tmp-");

  useEffect(() => {
    const stored = readMine()[postId] || {};
    setMine({
      laugh: !!stored.laugh, skull: !!stored.skull, melt: !!stored.melt, fire: !!stored.fire,
    });
    if (isSim) {
      // Seed random counts so simulated posts feel active.
      const seed = (postId.split("").reduce((a, c) => a + c.charCodeAt(0), 0) * 7) % 40;
      setCounts({
        laugh: 3 + (seed % 12),
        skull: 2 + ((seed + 3) % 9),
        melt: 1 + ((seed + 7) % 7),
        fire: 4 + ((seed + 11) % 15),
      });
      return;
    }
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("post_reactions")
        .select("emoji")
        .eq("post_id", postId);
      if (cancelled || !data) return;
      const next: Record<EmojiKey, number> = { laugh: 0, skull: 0, melt: 0, fire: 0 };
      for (const r of data as { emoji: EmojiKey }[]) next[r.emoji] = (next[r.emoji] || 0) + 1;
      setCounts(next);
    })();
    return () => { cancelled = true; };
  }, [postId, isSim]);

  async function react(key: EmojiKey) {
    if (mine[key]) return;
    setCounts((c) => ({ ...c, [key]: c[key] + 1 }));
    setMine((m) => ({ ...m, [key]: true }));
    const all = readMine();
    all[postId] = { ...(all[postId] || {}), [key]: true };
    writeMine(all);

    const nextTotal =
      counts.laugh + counts.skull + counts.melt + counts.fire + 1;
    onMilestone?.(nextTotal);

    if (isSim) return;
    const { error } = await (supabase as any).from("post_reactions").insert({
      post_id: postId,
      emoji: key,
      session_key: getSessionKey(),
    });
    if (error && !String(error.message || "").toLowerCase().includes("duplicate")) {
      // rollback
      setCounts((c) => ({ ...c, [key]: Math.max(0, c[key] - 1) }));
      setMine((m) => ({ ...m, [key]: false }));
      toast.error("Reaction failed");
    }
  }

  return (
    <div className="mt-2 flex items-center gap-1.5 flex-wrap">
      {EMOJIS.map((e) => {
        const active = mine[e.key];
        return (
          <button
            key={e.key}
            type="button"
            onClick={() => react(e.key)}
            aria-label={`React ${e.label}`}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold transition-all ${
              active
                ? `${e.color} scale-105 shadow-[0_0_10px_rgba(255,255,255,0.15)]`
                : "border-white/10 bg-white/[0.03] text-white/60 hover:bg-white/[0.08] hover:border-white/20"
            }`}
          >
            <span className="text-sm leading-none">{e.char}</span>
            <span className="tabular-nums">{counts[e.key]}</span>
          </button>
        );
      })}
    </div>
  );
}
