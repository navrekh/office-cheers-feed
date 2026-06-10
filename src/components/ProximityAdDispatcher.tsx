import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { MapPin, Navigation } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useMerchantDeals, type MerchantDeal } from "@/lib/useMerchantDeals";
import { applyJitter, haversineKm, type LatLng } from "@/lib/geo";
import {
  mapsDirectionsUrl,
  getSelectedCity,
  subscribeCity,
  type CityKey,
} from "@/lib/cityStore";

// 4-hour per-pub cooldown — keeps the rewarding alert from turning spammy.
const COOLDOWN_MS = 4 * 60 * 60 * 1000;
const STORAGE_KEY = "drinkedin.local_notified_pubs";
// Geofence radius that promotes a deal to "Ultra-Local".
export const ULTRA_LOCAL_KM = 1.0;

function hash01(s: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

/**
 * Deterministic fuzzy coordinate for a merchant deal. Real pub coords are
 * not stored on the row, so we synthesize a stable point 200m–2.5km from
 * the user, then jitter ±50–100m so a deal's plotted location can never
 * reverse-engineer the user's precise position.
 */
export function dealCoord(origin: LatLng, dealId: string): LatLng {
  const bearing = hash01(dealId, 7) * 2 * Math.PI;
  const distKm = 0.2 + hash01(dealId, 13) * 2.3; // 0.2 – 2.5 km
  const dLat = (distKm / 111.32) * Math.cos(bearing);
  const dLng =
    (distKm / (111.32 * Math.cos((origin.latitude * Math.PI) / 180))) *
    Math.sin(bearing);
  return applyJitter({
    latitude: origin.latitude + dLat,
    longitude: origin.longitude + dLng,
  });
}

function metersLabel(km: number): string {
  if (!isFinite(km)) return "—";
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)}m`;
  return `${km.toFixed(1)}km`;
}

function loadNotified(): Record<string, number> {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}
function saveNotified(s: Record<string, number>) {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {}
}

type Props = { origin: LatLng | null; userId: string | null };

export function ProximityAdDispatcher({ origin, userId }: Props) {
  const [city, setCity] = useState<CityKey>(() =>
    typeof window === "undefined" ? "Bangalore" : getSelectedCity()
  );
  useEffect(() => subscribeCity(setCity), []);
  const { deals } = useMerchantDeals(city);

  // Per-deal signature so we re-fire when urgency / deal_text changes,
  // but not on every realtime keepalive.
  const sigRef = useRef<Map<string, string>>(new Map());
  const userIdRef = useRef(userId);
  userIdRef.current = userId;

  useEffect(() => {
    if (!origin) return;
    const notified = loadNotified();
    const now = Date.now();
    // Purge expired cooldown entries so storage stays tiny.
    for (const k of Object.keys(notified)) {
      if (now - notified[k] > COOLDOWN_MS) delete notified[k];
    }

    for (const d of deals) {
      const coord = dealCoord(origin, d.id);
      const distKm = haversineKm(origin, coord);
      if (!isFinite(distKm) || distKm > ULTRA_LOCAL_KM) continue;

      const sig = `${d.urgency_level}|${d.deal_text}|${d.updated_at}`;
      const prevSig = sigRef.current.get(d.id);
      sigRef.current.set(d.id, sig);
      // Only fire when the deal itself changed (new row, urgency bump,
      // deal text edit). Steady state stays quiet.
      if (prevSig === sig) continue;

      const last = notified[d.id] || 0;
      if (now - last < COOLDOWN_MS) continue;
      notified[d.id] = now;

      fireProximityToast(d, distKm, userIdRef.current);
    }
    saveNotified(notified);
  }, [origin?.latitude, origin?.longitude, deals]);

  return null;
}

function fireProximityToast(
  deal: MerchantDeal,
  distKm: number,
  userId: string | null
) {
  const label = metersLabel(distKm);
  toast.custom(
    (t) => (
      <div className="w-[340px] max-w-[92vw] rounded-lg border-2 border-amber-400 bg-zinc-950/95 backdrop-blur p-3 shadow-[0_0_32px_rgba(251,191,36,0.6)] animate-slide-in-right">
        <div className="flex items-center justify-between gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-amber-300">
          <span className="inline-flex items-center gap-1.5">
            <MapPin className="size-3.5" />
            📍 Proximity Alert: {label} away
          </span>
          <button
            type="button"
            onClick={() => toast.dismiss(t)}
            className="text-amber-300/60 hover:text-amber-200 text-[14px] leading-none"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
        <div className="mt-2 flex items-start gap-2.5">
          <div className="size-10 shrink-0 rounded-md bg-gradient-to-br from-amber-400/50 to-amber-700/30 border border-amber-300/50 grid place-items-center text-lg shadow-[0_0_12px_rgba(251,191,36,0.4)]">
            🍺
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold text-amber-100 truncate">
              {deal.pub_name}
              {deal.neighborhood ? (
                <span className="ml-1 text-[10px] font-medium text-amber-200/60">
                  · {deal.neighborhood}
                </span>
              ) : null}
            </div>
            <p className="text-[12px] text-amber-50/90 leading-snug mt-0.5">
              {deal.pub_name}: {deal.deal_text}
            </p>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={async () => {
              try {
                window.dispatchEvent(
                  new CustomEvent("drinkedin:heading-there", {
                    detail: { dealId: deal.id, pubName: deal.pub_name },
                  })
                );
                if (userId) {
                  // Fire-and-forget — feed counter + taproom seat drop
                  // both react to these writes via realtime.
                  void (supabase as any)
                    .from("merchant_clicks")
                    .insert({
                      pub_id: deal.pub_name,
                      user_id: userId,
                      city: deal.city,
                    });
                  void (supabase as any).rpc("increment_heading_there", {
                    p_deal_id: deal.id,
                  });
                }
                toast.success(`Locked in at ${deal.pub_name} 🍻`, {
                  description: "Your avatar just dropped into the live taproom.",
                });
              } catch {
                toast.error("Couldn't lock your spot — try again.");
              } finally {
                toast.dismiss(t);
              }
            }}
            className="flex-1 text-[11px] font-bold rounded-md bg-amber-400 hover:bg-amber-300 text-amber-950 px-2.5 py-1.5 transition shadow-[0_0_12px_rgba(251,191,36,0.4)]"
          >
            Lock in Spot 🏃‍♂️
          </button>
          <button
            type="button"
            onClick={() => {
              const q = [deal.pub_name, deal.neighborhood, deal.city]
                .filter(Boolean)
                .join(", ");
              window.open(
                mapsDirectionsUrl(q),
                "_blank",
                "noopener,noreferrer"
              );
              toast.dismiss(t);
            }}
            className="flex-1 text-[11px] font-bold rounded-md border border-amber-400/60 hover:border-amber-300 text-amber-100 hover:text-amber-50 bg-amber-500/10 hover:bg-amber-500/20 px-2.5 py-1.5 inline-flex items-center justify-center gap-1 transition"
          >
            <Navigation className="size-3" />
            Navigate 🗺️
          </button>
        </div>
      </div>
    ),
    { duration: 12000, position: "top-right" }
  );
}
