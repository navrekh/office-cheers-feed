import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Subscribe to a single Postgres-changes channel scoped to a hub partition.
 * Tears down + rebuilds automatically when `hub` or `table` changes — so a
 * city switch yields a fresh per-hub channel name (e.g. `shoutbox:Pune`).
 */
export function useRealtimeHub<T = Record<string, unknown>>(
  table: string,
  hub: string,
  onInsert: (row: T) => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled || !hub || !table) return;
    const channelName = `${table}:${hub}`;
    const channel = supabase
      .channel(channelName)
      .on(
        // @ts-expect-error postgres_changes payload type is broad
        "postgres_changes",
        { event: "INSERT", schema: "public", table, filter: `hub=eq.${hub}` },
        (payload: { new: T }) => {
          try { onInsert(payload.new); } catch { /* swallow listener errors */ }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // onInsert intentionally not in deps — caller should memoize if needed
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, hub, enabled]);
}
