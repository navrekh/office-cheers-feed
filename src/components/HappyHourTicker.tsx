import { useEffect, useRef, useState } from "react";
import {
  CITIES,
  FLASH_DEALS,
  getSelectedCity,
  setSelectedCity,
  subscribeCity,
  type CityKey,
} from "@/lib/cityStore";
import { useMerchantDeals } from "@/lib/useMerchantDeals";
import { supabase } from "@/integrations/supabase/client";
import CityCampaignModal from "@/components/CityCampaignModal";
import LanguageSwitcher from "@/components/LanguageSwitcher";

export default function HappyHourTicker() {
  const [city, setCity] = useState<CityKey>("Bangalore");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalCity, setModalCity] = useState<CityKey>("Bangalore");
  const checked = useRef<Set<string>>(new Set());

  useEffect(() => {
    setCity(getSelectedCity());
    return subscribeCity(setCity);
  }, []);

  const { top } = useMerchantDeals(city);
  const deal = top?.deal_text ?? FLASH_DEALS[city];
  const dealKey = `${city}:${deal}`;

  // After any city change, ping `get_city_status` and pop the lock modal
  // when there are fewer than 3 active paying merchants in that region.
  // We dedupe per session to avoid nagging on every dropdown change.
  useEffect(() => {
    if (checked.current.has(city)) return;
    checked.current.add(city);
    let cancelled = false;
    (async () => {
      try {
        const { data, error } = await (supabase as any).rpc("get_city_status", { p_city: city });
        if (cancelled || error || !Array.isArray(data) || data.length === 0) return;
        const row = data[0] as { active_merchants: number; launched: boolean };
        if (!row.launched && row.active_merchants < 3) {
          setModalCity(city);
          setModalOpen(true);
        }
      } catch {
        /* network hiccup — silent */
      }
    })();
    return () => { cancelled = true; };
  }, [city]);

  return (
    <div className="relative w-full border-b border-amber-400/30 bg-gradient-to-r from-amber-950/60 via-amber-900/50 to-amber-950/60 overflow-hidden">
      <div className="mx-auto max-w-7xl flex items-center gap-2 px-4 h-6">
        <select
          aria-label="Select tech hub city"
          value={city}
          onChange={(e) => {
            const next = e.target.value as CityKey;
            setSelectedCity(next);
            import("@/lib/analytics").then((m) =>
              m.trackEngagement("city_sector_change", { city: next, surface: "ticker" })
            );
          }}
          className="shrink-0 h-5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 border border-amber-400/50 rounded text-amber-100 px-1.5 py-0 leading-none cursor-pointer hover:bg-amber-500/30 focus:outline-none focus:ring-1 focus:ring-amber-300"
        >
          {CITIES.map((c) => (
            <option key={c} value={c} className="bg-amber-950 text-amber-100">
              {c}
            </option>
          ))}
        </select>
        <LanguageSwitcher />
        <button
          type="button"
          onClick={() => { setModalCity(city); setModalOpen(true); }}
          className="shrink-0 h-5 px-1.5 text-[10px] font-bold uppercase tracking-wider rounded bg-fuchsia-500/20 border border-fuchsia-400/60 text-fuchsia-100 hover:bg-fuchsia-500/30"
          title="Vote to unlock more cities"
        >
          🗳️ Unlock
        </button>
        <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-amber-300/80">
          {top?.urgency_level === 3 ? "🚨 URGENT" : "LIVE"}
        </span>
        <div
          className="relative flex-1 overflow-hidden h-5"
          aria-live="polite"
        >
          <div
            key={dealKey}
            className="absolute inset-y-0 whitespace-nowrap flex items-center text-[11px] font-medium text-amber-100/95 drinkedin-marquee drinkedin-deal-fade"
          >
            <span className="px-8">{deal}</span>
            <span className="px-8">{deal}</span>
            <span className="px-8">{deal}</span>
          </div>
        </div>
      </div>
      <CityCampaignModal open={modalOpen} onOpenChange={setModalOpen} city={modalCity} />
    </div>
  );
}
