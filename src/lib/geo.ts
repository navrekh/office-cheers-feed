// Lightweight client-side geo utilities. All coordinates that ever leave the
// browser MUST be jittered first — precise lat/lng never reach the database
// or any other client.

const SESSION_ID_KEY = "drinkedin.geo.session_id";

/** Stable anonymous browser id used to attribute presence beacons. */
export function getOrCreateSessionId(): string {
  try {
    let id = localStorage.getItem(SESSION_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(SESSION_ID_KEY, id);
    }
    return id;
  } catch {
    return "session-" + Math.random().toString(36).slice(2);
  }
}

export type LatLng = { latitude: number; longitude: number };

/**
 * Haversine great-circle distance in kilometres between two lat/lng points.
 * Returns Infinity if either argument is missing.
 */
export function haversineKm(a: LatLng | null | undefined, b: LatLng | null | undefined): number {
  if (!a || !b) return Infinity;
  if (
    typeof a.latitude !== "number" ||
    typeof a.longitude !== "number" ||
    typeof b.latitude !== "number" ||
    typeof b.longitude !== "number"
  ) {
    return Infinity;
  }
  const R = 6371; // km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * Add a randomized ±50–100 m offset to a precise coordinate. The result is
 * what we store, broadcast, and compare against. Once jittered, the original
 * precise location cannot be recovered from any client-visible payload.
 */
export function applyJitter(coord: LatLng): LatLng {
  // 1° latitude ≈ 111.32 km. 50–100 m → 0.00045°–0.00090° latitude.
  const minM = 50;
  const maxM = 100;
  const distanceM = minM + Math.random() * (maxM - minM);
  const bearing = Math.random() * 2 * Math.PI;
  const dLatDeg = (distanceM * Math.cos(bearing)) / 111_320;
  const dLngDeg =
    (distanceM * Math.sin(bearing)) /
    (111_320 * Math.cos((coord.latitude * Math.PI) / 180));
  return {
    latitude: coord.latitude + dLatDeg,
    longitude: coord.longitude + dLngDeg,
  };
}

/** Human-friendly distance label, e.g. "300 m", "1.2 km", "Far". */
export function formatDistance(km: number): string {
  if (!isFinite(km)) return "Unknown distance";
  if (km < 1) return `${Math.round(km * 1000)} m`;
  if (km < 10) return `${km.toFixed(1)} km`;
  return `${Math.round(km)} km`;
}
