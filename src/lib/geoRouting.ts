// Lightweight, non-blocking client-side geo router.
//
// Strategy (fastest signal wins, never blocks the page):
//   1. Browser timezone via `Intl.DateTimeFormat()...timeZone` — instant, free,
//      privacy-safe. Resolved synchronously on mount.
//   2. `https://ipapi.co/json/` — async fallback that fires AFTER the first
//      paint so it never blocks the 50-poll roulette or any other init.
//
// Auto-routing rules (see plan):
//   IN + southern state → Bangalore
//   IN + western state  → Pune
//   IN otherwise        → Bangalore (largest tech footprint)
//   US / CA             → San Francisco (Silicon Valley umbrella)
//   GB                  → London
//   IE                  → Dublin
//   DE                  → Berlin
//   NL                  → Amsterdam
//   FR                  → Paris
//   anything else       → San Francisco (premium monetization default)

import { useEffect } from "react";
import { CITIES, getSelectedCity, setSelectedCity, type CityKey } from "@/lib/cityStore";
import { HUBS, detectDefaultHub } from "@/lib/hubs";

// Single global guard so the IP lookup runs at most once per browser tab.
let geoLookupStarted = false;

// India city → hub map (rough region buckets).
const SOUTHERN_IN_CITIES = new Set([
  "bangalore", "bengaluru", "chennai", "madras", "coimbatore", "kochi",
  "ernakulam", "thiruvananthapuram", "trivandrum", "mysore", "mysuru",
  "hyderabad", "secunderabad", "vijayawada", "visakhapatnam", "mangalore",
  "mangaluru", "hubli", "calicut", "kozhikode", "madurai",
]);
const WESTERN_IN_CITIES = new Set([
  "pune", "mumbai", "bombay", "thane", "navi mumbai", "nashik", "nagpur",
  "aurangabad", "ahmedabad", "surat", "vadodara", "rajkot", "panaji",
  "panjim", "goa",
]);

function normCity(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

/** Pure mapper: turns a country/city signal into one of our CityKey hubs. */
export function routeFromGeo(countryCode: string | null, city: string | null): CityKey {
  const cc = (countryCode ?? "").toUpperCase();
  const c = normCity(city);

  if (cc === "IN") {
    if (WESTERN_IN_CITIES.has(c)) return "Pune";
    if (SOUTHERN_IN_CITIES.has(c)) {
      // Hyderabad is its own hub if matched, otherwise default to Bangalore.
      if (c === "hyderabad" || c === "secunderabad") return "Hyderabad";
      return "Bangalore";
    }
    // Match an exact CityKey if the IP gave us "Delhi", "Gurgaon" etc.
    const exact = (CITIES as string[]).find((k) => k.toLowerCase() === c);
    if (exact) return exact as CityKey;
    return "Bangalore";
  }
  if (cc === "US" || cc === "CA") return "San Francisco";
  if (cc === "GB" || cc === "UK") return "London";
  if (cc === "IE") return "Dublin";
  if (cc === "DE" || cc === "AT" || cc === "CH") return "Berlin";
  if (cc === "NL" || cc === "BE" || cc === "LU") return "Amsterdam";
  if (cc === "FR") return "Paris";

  // EU members → Amsterdam as the nearest English-speaking EU node.
  const EU = new Set([
    "IT", "ES", "PT", "DK", "SE", "FI", "NO", "PL", "CZ", "SK", "HU",
    "RO", "BG", "GR", "LT", "LV", "EE", "HR", "SI", "CY", "MT",
  ]);
  if (EU.has(cc)) return "Amsterdam";

  // Premium monetization fallback for everything else (LATAM, APAC, ME, AF).
  return "San Francisco";
}

/** Async, never-blocking. Resolves to a hub or `null` if the IP lookup
 *  fails. Caller can ignore — we only act if we get useful data. */
async function fetchIpHub(signal: AbortSignal): Promise<CityKey | null> {
  try {
    const res = await fetch("https://ipapi.co/json/", { signal, cache: "force-cache" });
    if (!res.ok) return null;
    const data = (await res.json()) as { country_code?: string; city?: string };
    return routeFromGeo(data.country_code ?? null, data.city ?? null);
  } catch {
    return null;
  }
}

/** React hook: detects, then auto-routes the global hub context if the user
 *  has not explicitly chosen one yet. Designed to never block render. */
export function useGeoAutoRoute(): void {
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Respect explicit choice: if the visitor (or the landing modal flow)
    // already persisted a hub, do not stomp on it.
    if (window.localStorage.getItem("drinkedin.selectedCity")) return;
    if (geoLookupStarted) return;
    geoLookupStarted = true;

    // 1) Instant timezone-based guess. Apply immediately so the dashboard
    //    feels localized before the IP lookup resolves.
    try {
      const tzGuess = detectDefaultHub();
      if (tzGuess && getSelectedCity() !== tzGuess) {
        setSelectedCity(tzGuess);
      }
    } catch { /* ignore */ }

    // 2) Refine via ipapi.co in the background.
    const ctrl = new AbortController();
    // Defer past the first paint so we never compete with poll init.
    const idleId = (window.requestIdleCallback ?? ((cb: () => void) => setTimeout(cb, 250)))(
      () => {
        void fetchIpHub(ctrl.signal).then((hub) => {
          if (!hub) return;
          // Don't override if the visitor has just picked something manually
          // while the fetch was in flight.
          if (window.localStorage.getItem("drinkedin.hub.manualPick") === "1") return;
          // Only apply if our IP-derived hub is actually one we support.
          if (!HUBS.find((h) => h.city === hub)) return;
          setSelectedCity(hub);
          try {
            import("@/lib/analytics").then((m) =>
              m.trackEngagement("geo_auto_route", { hub }),
            );
          } catch { /* ignore */ }
        });
      },
    );

    return () => {
      ctrl.abort();
      try { (window.cancelIdleCallback ?? clearTimeout)(idleId as number); } catch { /* ignore */ }
    };
  }, []);
}
