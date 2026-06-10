import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "employee" | "merchant";

export type Profile = {
  id: string;
  role: AppRole;
  verified_hub_city: string | null;
  pub_name: string | null;
  map_query_address: string | null;
  merchant_website: string | null;
  flash_deal_text: string | null;
};

/**
 * Loads the current user's profile (role + merchant metadata).
 * Returns null until a session is hydrated or if no user.
 */
export function useProfile(userId: string | null | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    if (!userId) {
      setProfile(null);
      return;
    }
    setLoading(true);
    const { data } = await (supabase as any)
      .from("profiles")
      .select("id, role, verified_hub_city, pub_name, map_query_address, merchant_website, flash_deal_text")
      .eq("id", userId)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return { profile, loading, refresh };
}

export const RLS_DENIED_MESSAGE =
  "Access Denied! You need a liquor license and a verified merchant subscription to drop corporate ad slots here. 🛑";

/** Returns true if a Postgres / PostgREST error looks like an RLS denial. */
export function isRlsDenied(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; message?: string; status?: number };
  if (e.code === "42501") return true;
  if (e.status === 401 || e.status === 403) return true;
  const msg = (e.message || "").toLowerCase();
  return msg.includes("row-level security") || msg.includes("violates row-level");
}
