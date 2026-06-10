import { useEffect, useState } from "react";
import { applyJitter, type LatLng } from "@/lib/geo";

type Status = "idle" | "prompting" | "granted" | "denied" | "unavailable";

const CACHE_KEY = "drinkedin.geo.jittered";

type Cached = LatLng & { ts: number };

function readCache(): Cached | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Cached;
    // Refresh once per hour so the jitter rotates.
    if (Date.now() - parsed.ts > 60 * 60 * 1000) return null;
    if (typeof parsed.latitude !== "number" || typeof parsed.longitude !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(c: LatLng) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ ...c, ts: Date.now() }));
  } catch {}
}

/**
 * Asks the browser for high-accuracy geolocation, applies a ±50–100 m jitter,
 * and returns ONLY the jittered coordinates. Precise lat/lng are never
 * exposed beyond this hook's internal closure.
 */
export function useGeolocation() {
  const [coords, setCoords] = useState<LatLng | null>(() => readCache());
  const [status, setStatus] = useState<Status>(() => (readCache() ? "granted" : "idle"));

  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setStatus("unavailable");
      return;
    }
    if (coords) return; // already have a recent jittered fix

    setStatus("prompting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const precise: LatLng = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        };
        const jittered = applyJitter(precise);
        writeCache(jittered);
        setCoords(jittered);
        setStatus("granted");
      },
      () => setStatus("denied"),
      { enableHighAccuracy: true, maximumAge: 5 * 60 * 1000, timeout: 10_000 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { coords, status };
}
