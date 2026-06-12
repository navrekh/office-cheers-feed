import { useEffect, useRef, useState } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import {
  getSelectedCity,
  setSelectedCity,
  subscribeCity,
  type CityKey,
} from "@/lib/cityStore";
import { HUBS, REGIONS, HUB_BY_CITY, detectDefaultHub } from "@/lib/hubs";

/**
 * Sleek hub-switcher dropdown that sits next to the DrinkedIn logo.
 * Groups hubs by region (India · North America · Europe) and persists
 * choice through the existing cityStore so every downstream widget
 * (radar, vibe board, leaderboard, ticker) re-renders in one beat.
 */
export default function HubSelector() {
  const [city, setCity] = useState<CityKey>("Bangalore");
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const bootedRef = useRef(false);

  // First mount: hydrate from store (or detect timezone if never set).
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("drinkedin.selectedCity") : null;
    if (!stored) {
      const detected = detectDefaultHub();
      setSelectedCity(detected);
      setCity(detected);
    } else {
      setCity(getSelectedCity());
    }
    return subscribeCity(setCity);
  }, []);

  // Close on outside click + Escape.
  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const hub = HUB_BY_CITY[city];

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 h-9 px-2.5 rounded-md border border-border bg-muted/40 hover:bg-muted/70 text-xs font-semibold text-foreground transition"
      >
        <Globe className="size-3.5 text-primary" />
        <span className="hidden sm:inline">{hub?.flag ?? "🌐"}</span>
        <span className="truncate max-w-[120px]">{city}</span>
        <ChevronDown className={`size-3.5 text-muted-foreground transition ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-2 z-40 w-64 rounded-xl border border-border bg-popover/95 backdrop-blur-md shadow-[0_20px_60px_-20px_rgba(0,0,0,0.6)] animate-fade-in p-1.5"
        >
          {REGIONS.map((region) => {
            const items = HUBS.filter((h) => h.region === region);
            if (items.length === 0) return null;
            return (
              <div key={region} className="mb-1 last:mb-0">
                <div className="px-2 pt-1.5 pb-1 text-[10px] uppercase tracking-wider font-bold text-muted-foreground/80">
                  {region}
                </div>
                <ul>
                  {items.map((h) => {
                    const active = h.city === city;
                    return (
                      <li key={h.city}>
                        <button
                          type="button"
                          role="option"
                          aria-selected={active}
                          onClick={() => {
                            setSelectedCity(h.city);
                            try { localStorage.setItem("drinkedin.hub.manualPick", "1"); } catch { /* ignore */ }
                            setOpen(false);
                            import("@/lib/analytics").then((m) =>
                              m.trackEngagement("hub_switch", { city: h.city, region }),
                            );
                          }}
                          className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs font-medium transition ${
                            active
                              ? "bg-primary/15 text-primary"
                              : "text-foreground/90 hover:bg-muted/60"
                          }`}
                        >
                          <span className="text-base leading-none">{h.flag}</span>
                          <span className="flex-1 text-left truncate">{h.city}</span>
                          <span className="text-[10px] text-muted-foreground">{h.country}</span>
                          {active && <Check className="size-3.5 text-primary shrink-0" />}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
