import { memo, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { getSelectedCity, subscribeCity, type CityKey } from "@/lib/cityStore";
import LiveAmbientEqualizer from "@/components/LiveAmbientEqualizer";
import { Activity } from "lucide-react";

type Row = {
  id: string;
  pub_name: string;
  crowd_density: number | null;
  noise_level: number | null;
  vibe_type: number | null;
};

/**
 * Memoized row — re-renders only when its own venue telemetry changes,
 * so a single noisy bar can't trigger a full board repaint on slower
 * mobile devices during the Friday rush.
 */
const VibeRow = memo(function VibeRow({ row }: { row: Row }) {
  const c = row.crowd_density ?? 0;
  const n = row.noise_level ?? 0;
  const hot = c >= 0.8 && n >= 0.8;
  return (
    <li
      className={`flex items-center justify-between gap-2 p-2 rounded-md border transition ${
        hot
          ? "border-rose-400/60 bg-rose-500/10 shadow-[0_0_18px_rgba(244,63,94,0.4)] animate-pulse"
          : "border-zinc-800 bg-zinc-900/60"
      }`}
    >
      <div className="min-w-0">
        <p className="text-[12px] font-bold truncate">{row.pub_name}</p>
        <p className="text-[10px] text-muted-foreground">
          {hot ? "🔥 Happening Right Now" : "Live ambient telemetry"}
        </p>
      </div>
      <LiveAmbientEqualizer
        crowd={c}
        noise={n}
        vibe={row.vibe_type ?? 0}
        compact
        hideHotBadge
      />
    </li>
  );
}, (prev, next) =>
  prev.row.id === next.row.id &&
  prev.row.crowd_density === next.row.crowd_density &&
  prev.row.noise_level === next.row.noise_level &&
  prev.row.vibe_type === next.row.vibe_type &&
  prev.row.pub_name === next.row.pub_name,
);

/**
 * Compact sidebar card. Lists up to 4 active venues in the current city
 * with a pulsing equalizer + a "Happening Right Now" tag when both
 * crowd_density and noise_level break 0.8.
 */
function LiveVibeBoard() {
  const [city, setCity] = useState<CityKey>("Bangalore");
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    setCity(getSelectedCity());
    return subscribeCity(setCity);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const { data } = await (supabase as any)
        .from("merchant_deals")
        .select("id, pub_name, crowd_density, noise_level, vibe_type, vibe_sample_count")
        .eq("city", city)
        .eq("is_active", true)
        .gt("expires_at", new Date().toISOString())
        .order("vibe_sample_count", { ascending: false })
        .limit(4);
      if (!cancelled && Array.isArray(data)) setRows(data as Row[]);
    }
    load();
    const channel = (supabase as any)
      .channel(`vibe-board-${city}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "merchant_deals" }, load)
      .subscribe();
    const id = setInterval(load, 20_000);
    return () => {
      cancelled = true;
      clearInterval(id);
      (supabase as any).removeChannel(channel);
    };
  }, [city]);

  if (rows.length === 0) return null;

  return (
    <Card className="p-4 border-fuchsia-400/30 bg-gradient-to-b from-zinc-950 via-fuchsia-950/20 to-zinc-950">
      <div className="flex items-center gap-1.5 mb-3">
        <Activity className="size-4 text-fuchsia-300" />
        <h4 className="text-sm font-semibold">Live Venue Vibe Board</h4>
      </div>
      <ul className="space-y-3">
        {rows.map((r) => (
          <VibeRow key={r.id} row={r} />
        ))}
      </ul>
    </Card>
  );
}

export default memo(LiveVibeBoard);

