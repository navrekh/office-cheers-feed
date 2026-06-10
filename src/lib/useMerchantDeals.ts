import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { CityKey } from "@/lib/cityStore";

export type MerchantDeal = {
  id: string;
  pub_name: string;
  city: string;
  neighborhood: string | null;
  deal_text: string;
  urgency_level: number;
  heading_there_count: number;
  is_active: boolean;
  updated_at: string;
  activated_at?: string;
  expires_at?: string;
};

// Happy hour window: 16:30 – 19:30 local. Peaks at 18:00.
function timeFactor(now = new Date()): number {
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = 16 * 60 + 30;
  const end = 19 * 60 + 30;
  const peak = 18 * 60;
  if (mins < start || mins > end) return 0.4;
  const dist = Math.abs(mins - peak);
  const span = Math.max(peak - start, end - peak);
  return 1 + (1 - dist / span) * 1.5; // 1.0 – 2.5
}

export function computePriority(d: MerchantDeal, now = new Date()): number {
  const t = timeFactor(now);
  const urgency = Math.max(1, d.urgency_level) * 3;
  const velocity = 1 + Math.log10(1 + Math.max(0, d.heading_there_count));
  return t * urgency * velocity;
}

export function useMerchantDeals(city: CityKey) {
  const [deals, setDeals] = useState<MerchantDeal[]>([]);
  const [tick, setTick] = useState(0);

  // Re-sort every minute so time factor stays fresh.
  useEffect(() => {
    const i = setInterval(() => setTick((n) => n + 1), 60_000);
    return () => clearInterval(i);
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data, error } = await supabase
          .from("merchant_deals")
          .select("*")
          .eq("city", city)
          .eq("is_active", true)
          .gt("expires_at", new Date().toISOString());
        if (!cancelled && !error && data) setDeals(data as MerchantDeal[]);
      } catch {
        /* offline fallback handled by caller */
      }
    }
    load();

    const channel = supabase
      .channel(`public:merchant_deals:${city}:${Math.random().toString(36).slice(2)}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "merchant_deals" },
        () => load(),
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, [city]);

  const sorted = useMemo(() => {
    const now = new Date();
    return [...deals]
      .map((d) => ({ d, score: computePriority(d, now) }))
      .sort((a, b) => b.score - a.score)
      .map((x) => x.d);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deals, tick]);

  return { deals: sorted, top: sorted[0] ?? null };
}
