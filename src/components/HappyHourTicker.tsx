import { useEffect, useState } from "react";
import {
  CITIES,
  FLASH_DEALS,
  getSelectedCity,
  setSelectedCity,
  subscribeCity,
  type CityKey,
} from "@/lib/cityStore";

export default function HappyHourTicker() {
  const [city, setCity] = useState<CityKey>("Bangalore");

  useEffect(() => {
    setCity(getSelectedCity());
    return subscribeCity(setCity);
  }, []);

  const deal = FLASH_DEALS[city];

  return (
    <div className="relative w-full border-b border-amber-400/30 bg-gradient-to-r from-amber-950/60 via-amber-900/50 to-amber-950/60 overflow-hidden">
      <div className="mx-auto max-w-7xl flex items-center gap-2 px-4 h-6">
        <select
          aria-label="Select tech hub city"
          value={city}
          onChange={(e) => setSelectedCity(e.target.value as CityKey)}
          className="shrink-0 h-5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/20 border border-amber-400/50 rounded text-amber-100 px-1.5 py-0 leading-none cursor-pointer hover:bg-amber-500/30 focus:outline-none focus:ring-1 focus:ring-amber-300"
        >
          {CITIES.map((c) => (
            <option key={c} value={c} className="bg-amber-950 text-amber-100">
              {c}
            </option>
          ))}
        </select>
        <span className="shrink-0 text-[10px] font-black uppercase tracking-widest text-amber-300 drop-shadow-[0_0_6px_rgba(251,191,36,0.7)] animate-pulse">
          LIVE
        </span>
        <div
          className="relative flex-1 overflow-hidden h-5"
          aria-live="polite"
        >
          <div className="absolute inset-y-0 whitespace-nowrap flex items-center text-[11px] font-medium text-amber-100/95 drinkedin-marquee">
            <span className="px-8">{deal}</span>
            <span className="px-8">{deal}</span>
            <span className="px-8">{deal}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
