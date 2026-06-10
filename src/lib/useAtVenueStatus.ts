import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns true when the signed-in user has an active `at_venue`
 * check-in for the given deal (i.e. the geofence engine verified
 * them inside the 200 m radius and the session hasn't expired).
 */
export function useAtVenueStatus(dealId: string | null | undefined, userId: string | null | undefined) {
  const [atVenue, setAtVenue] = useState(false);

  useEffect(() => {
    if (!dealId || !userId) { setAtVenue(false); return; }
    let cancelled = false;
    async function check() {
      const { data } = await (supabase as any)
        .from("check_ins")
        .select("id")
        .eq("pub_id", dealId)
        .eq("user_id", userId)
        .eq("status", "at_venue")
        .gt("expires_at", new Date().toISOString())
        .limit(1)
        .maybeSingle();
      if (!cancelled) setAtVenue(!!data);
    }
    check();
    const id = setInterval(check, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, [dealId, userId]);

  return atVenue;
}
