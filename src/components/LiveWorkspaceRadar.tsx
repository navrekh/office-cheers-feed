import { useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card } from "@/components/ui/card";
import { Radio, Loader2, Compass, MapPinOff, Beer } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { applyJitter, haversineKm, type LatLng } from "@/lib/geo";
import { getScrubbedRadarBlips, type ScrubbedBlip } from "@/lib/radar.functions";
import { useT } from "@/lib/i18n";
import { usePanicState } from "@/lib/usePanicState";

type CheckIn = {
  id: string;
  activity: "browsing_deals" | "posting" | "commenting" | "checked_in";
  latitude: number;
  longitude: number;
  created_at: string;
  expires_at: string;
};

export type ProximityFilter = "tech-park" | "lunch-dash" | "city";

export type RadarPost = {
  id: string;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  author_name?: string;
};

export type RadarMerchant = {
  id: string;
  name: string;
  area: string;
};

type Props = {
  origin: LatLng | null;
  geoStatus: "idle" | "prompting" | "granted" | "denied" | "unavailable";
  posts: RadarPost[];
  merchants: RadarMerchant[];
  proximity: ProximityFilter;
  onProximityChange: (p: ProximityFilter) => void;
};

const WINDOW_MS = 3 * 60 * 60 * 1000;
const FILTER_KM: Record<ProximityFilter, number> = {
  "tech-park": 0.5,
  "lunch-dash": 2,
  city: 25,
};

// Deterministic hash → number in [0, 1)
function hash01(s: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 100000) / 100000;
}

// Synthesize a fuzzy lat/lng for a merchant near the origin so it can be
// plotted on the sonar grid. Deterministic per merchant id + then jittered
// so exact desk coordinates can never be reverse-engineered from blips.
function merchantCoord(origin: LatLng, id: string): LatLng {
  const bearing = hash01(id, 1) * 2 * Math.PI;
  const distKm = 0.3 + hash01(id, 2) * 2.2; // 0.3 – 2.5 km
  const dLat = (distKm / 111.32) * Math.cos(bearing);
  const dLng =
    (distKm / (111.32 * Math.cos((origin.latitude * Math.PI) / 180))) *
    Math.sin(bearing);
  return applyJitter({
    latitude: origin.latitude + dLat,
    longitude: origin.longitude + dLng,
  });
}

// Project a coordinate onto the radar canvas (0..1 x/y, origin at 0.5,0.5).
function project(origin: LatLng, target: LatLng, maxKm: number) {
  const distKm = haversineKm(origin, target);
  if (!isFinite(distKm)) return null;
  // Bearing (true north up). atan2(east, north).
  const dLat = target.latitude - origin.latitude;
  const dLng =
    (target.longitude - origin.longitude) *
    Math.cos((origin.latitude * Math.PI) / 180);
  const angle = Math.atan2(dLng, dLat); // 0 = north, +pi/2 = east
  const r = Math.min(1, distKm / maxKm);
  const x = 0.5 + (r * 0.46) * Math.sin(angle);
  const y = 0.5 - (r * 0.46) * Math.cos(angle);
  return { x, y, distKm };
}

function metersLabel(km: number): string {
  if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)}m`;
  return `${km.toFixed(1)}km`;
}

export function LiveWorkspaceRadar({
  origin,
  geoStatus,
  posts,
  merchants,
  proximity,
  onProximityChange,
}: Props) {
  const t = useT();
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [serverBlips, setServerBlips] = useState<ScrubbedBlip[]>([]);
  const fetchScrubbedBlips = useServerFn(getScrubbedRadarBlips);

  // Sonar pulse event bridge — fired from composer/rally/share actions
  const [pulses, setPulses] = useState<number[]>([]);
  const [whisperActive, setWhisperActive] = useState(false);
  const whisperTimerRef = useRef<number | null>(null);
  const panicActive = usePanicState();
  useEffect(() => {
    function onPulse() {
      if (panicActive) return;
      const id = Date.now() + Math.random();
      setPulses((prev) => [...prev, id]);
      window.setTimeout(() => {
        setPulses((prev) => prev.filter((p) => p !== id));
      }, 2000);
      setWhisperActive(true);
      if (whisperTimerRef.current) window.clearTimeout(whisperTimerRef.current);
      whisperTimerRef.current = window.setTimeout(() => setWhisperActive(false), 2000);
    }
    window.addEventListener("drinkedin:radar-pulse", onPulse);
    return () => {
      window.removeEventListener("drinkedin:radar-pulse", onPulse);
      if (whisperTimerRef.current) window.clearTimeout(whisperTimerRef.current);
    };
  }, [panicActive]);

  // Hard-clear any in-flight pulses the instant panic activates so nothing
  // glows through the camouflage sheet.
  useEffect(() => {
    if (panicActive) {
      setPulses([]);
      setWhisperActive(false);
    }
  }, [panicActive]);



  useEffect(() => {
    let cancelled = false;
    (async () => {
      const since = new Date(Date.now() - WINDOW_MS).toISOString();
      const { data } = await supabase
        .from("check_ins")
        .select("id,activity,latitude,longitude,created_at,expires_at")
        .gt("expires_at", new Date().toISOString())
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(250);
      if (!cancelled && data) setCheckins(data as CheckIn[]);
    })();
    const channel = supabase
      .channel("drinkedin-radar")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "check_ins" },
        (payload) => {
          const row = payload.new as CheckIn;
          setCheckins((prev) => [row, ...prev].slice(0, 250));
        }
      )
      .subscribe();
    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const maxKm = FILTER_KM[proximity];

  // Fetch scrubbed (no-PII, no-company) post blips from the server.
  // Server returns only distance + bearing + color — the wire never carries
  // declared_company, user_id, or raw coordinates for the post authors.
  useEffect(() => {
    if (!origin) {
      setServerBlips([]);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Guard: server fn requires auth. Skip silently for anonymous viewers.
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) setServerBlips([]);
          return;
        }
        const res = await fetchScrubbedBlips({
          data: {
            latitude: origin.latitude,
            longitude: origin.longitude,
            maxKm,
          },
        });
        if (!cancelled) setServerBlips(res.blips);
      } catch {
        if (!cancelled) setServerBlips([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [origin?.latitude, origin?.longitude, maxKm, posts.length, fetchScrubbedBlips]);

  // Build blip list
  const { postBlips, merchantBlips } = useMemo(() => {
    if (!origin) return { postBlips: [], merchantBlips: [] };

    // Convert server-scrubbed (distance, bearing, color) into canvas coords.
    const postBlips = serverBlips
      .filter((b) => b.distKm <= maxKm)
      .map((b) => {
        const r = Math.min(1, b.distKm / maxKm);
        const x = 0.5 + r * 0.46 * Math.sin(b.bearingRad);
        const y = 0.5 - r * 0.46 * Math.cos(b.bearingRad);
        return {
          id: b.id,
          x,
          y,
          distKm: b.distKm,
          color: b.color,
          name:
            b.color === "cyan"
              ? "Direct Colleague"
              : "Nearby Professional",
        };
      });

    // Anonymous check-ins still render as amber "nearby" blips (no PII).
    const checkinBlips = checkins
      .filter((c) => Date.now() - new Date(c.created_at).getTime() <= WINDOW_MS)
      .map((c) => {
        const proj = project(
          origin,
          { latitude: c.latitude, longitude: c.longitude },
          maxKm
        );
        if (!proj) return null;
        return {
          id: `ci-${c.id}`,
          ...proj,
          color: "amber" as const,
          name: "Nearby Professional",
        };
      })
      .filter(Boolean)
      .filter((b) => (b as any).distKm <= maxKm) as typeof postBlips;

    const merchantBlips = merchants
      .map((m) => {
        const coord = merchantCoord(origin, m.id);
        const proj = project(origin, coord, maxKm);
        if (!proj) return null;
        return { id: m.id, name: m.name, area: m.area, ...proj };
      })
      .filter(Boolean)
      .filter((b) => (b as any).distKm <= maxKm) as Array<{
      id: string;
      name: string;
      area: string;
      x: number;
      y: number;
      distKm: number;
    }>;

    return {
      postBlips: [...postBlips, ...checkinBlips].slice(0, 40),
      merchantBlips: merchantBlips.slice(0, 12),
    };
  }, [origin, serverBlips, checkins, merchants, maxKm]);



  // ---------- Permission fallback ----------
  if (geoStatus === "denied" || geoStatus === "unavailable") {
    return (
      <Card
        role="status"
        aria-label="Radar offline"
        className="relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-zinc-950 to-zinc-950 px-4 py-3 animate-fade-in"
      >
        <div className="flex items-center gap-3">
          <div className="size-9 shrink-0 rounded-full grid place-items-center bg-amber-500/15 border border-amber-400/40 text-amber-200">
            <MapPinOff className="size-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90">
              {t("radar.offline")}
            </div>
            <p className="text-[12.5px] leading-snug text-muted-foreground">
              📍 Exact radar offline. Defaulting to standard corporate feed context — use the city selector in the header to switch tech hubs.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  // ---------- Active sonar ----------
  const calibrating = !origin;

  return (
    <Card
      className="relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-emerald-950/30 via-zinc-950 to-zinc-950 shadow-[0_0_28px_-8px_rgba(16,185,129,0.45)] animate-fade-in"
      aria-label="Live Workspace Radar"
    >
      <div className="relative px-4 pt-3 pb-2 flex items-center gap-3">
        <div className="relative size-9 shrink-0 rounded-full grid place-items-center bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 shadow-[0_0_18px_rgba(16,185,129,0.4)]">
          {geoStatus === "prompting" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : origin ? (
            <Radio className="size-4" />
          ) : (
            <Compass className="size-4" />
          )}
          <span className="absolute inset-0 rounded-full ring-2 ring-emerald-400/50 animate-ping" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-200/90">
            {t("radar.title")}
          </div>
          <p className="text-[12px] leading-snug text-muted-foreground">
            {whisperActive
              ? "📡 NEW WHISPER DETECTED NEAR BY"
              : calibrating
              ? "🛰️ Calibrating sonar… requesting your high-accuracy fix."
              : `${postBlips.length} colleague signal${postBlips.length === 1 ? "" : "s"} · ${merchantBlips.length} verified watering hole${merchantBlips.length === 1 ? "" : "s"} within ${metersLabel(maxKm)}.`}
          </p>
        </div>
      </div>

      {/* Sonar Canvas */}
      <div className="relative mx-auto my-2 aspect-square w-[78%] max-w-[320px]">
        {/* Outer ring */}
        <div className="absolute inset-0 rounded-full border border-emerald-400/15 bg-[radial-gradient(circle,rgba(16,185,129,0.05),rgba(0,0,0,0.6)_70%)]" />
        {/* Concentric range rings */}
        <div className="absolute inset-[12%] rounded-full border border-emerald-400/8" />
        <div className="absolute inset-[28%] rounded-full border border-emerald-400/8" />
        <div className="absolute inset-[44%] rounded-full border border-emerald-400/10" />
        {/* Crosshairs */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-emerald-400/8" />
        <div className="absolute inset-y-0 left-1/2 w-px bg-emerald-400/8" />

        {/* Rotating sonar sweep */}
        <div
          className="pointer-events-none absolute inset-0 rounded-full overflow-hidden opacity-60"
          aria-hidden
        >
          <div
            className="absolute inset-0 origin-center"
            style={{
              background:
                "conic-gradient(from 0deg, rgba(16,185,129,0) 0deg, rgba(16,185,129,0) 300deg, rgba(16,185,129,0.3) 355deg, rgba(110,231,183,0.5) 360deg, rgba(16,185,129,0) 360deg)",
              animation: "spin 3.5s linear infinite",
              maskImage: "radial-gradient(circle, black 70%, transparent 72%)",
              WebkitMaskImage: "radial-gradient(circle, black 70%, transparent 72%)",
            }}
          />
        </div>

        {/* Range label */}
        <div className="absolute bottom-1 right-1 text-[9px] font-mono text-emerald-300/60 tabular-nums">
          R: {metersLabel(maxKm)}
        </div>

        {/* Center "You" dot */}
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 group">
          <span className="block size-3 rounded-full bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.95)]" />
          <span className="absolute inset-0 rounded-full ring-2 ring-emerald-300/70 animate-ping" aria-hidden />
          {pulses.map((id) => (
            <span
              key={id}
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 size-24 rounded-full border-2 border-emerald-400/50 shadow-[0_0_22px_rgba(16,185,129,0.55)] animate-ping"
              style={{ animationDuration: "2s" }}
            />
          ))}
          <span className="absolute left-1/2 top-full mt-1 -translate-x-1/2 whitespace-nowrap rounded bg-zinc-900/95 px-1.5 py-0.5 text-[9px] font-mono text-emerald-200 border border-emerald-500/30 opacity-0 group-hover:opacity-100 transition pointer-events-none">
            Your Cubicle (You)
          </span>
        </div>


        {/* Colleague blips — cyan = same declared company, amber = nearby */}
        {postBlips.map((b) => {
          const cyan = b.color === "cyan";
          return (
            <div
              key={b.id}
              className="absolute -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%` }}
            >
              <span
                className={
                  cyan
                    ? "block size-2.5 rounded-full bg-cyan-300 shadow-[0_0_12px_rgba(34,211,238,1)] animate-pulse ring-1 ring-cyan-200/80"
                    : "block size-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse"
                }
              />
              <div
                className={`pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap rounded px-2 py-1 text-[10px] opacity-0 group-hover:opacity-100 transition z-10 shadow-lg bg-zinc-900/95 ${
                  cyan
                    ? "text-cyan-100 border border-cyan-400/50"
                    : "text-amber-100 border border-amber-500/40"
                }`}
              >
                {cyan ? "🎯 Direct Colleague" : "🎭 Nearby Professional"} — {metersLabel(b.distKm)} away
              </div>
            </div>
          );
        })}


        {/* Merchant (beer mug) blips */}
        {merchantBlips.map((b) => (
          <div
            key={b.id}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            style={{ left: `${b.x * 100}%`, top: `${b.y * 100}%` }}
          >
            <span className="relative grid place-items-center size-4 rounded-full bg-amber-500/80 border border-amber-200 shadow-[0_0_10px_rgba(251,191,36,1)] animate-pulse">
              <Beer className="size-2.5 text-zinc-950" strokeWidth={3} />
            </span>
            <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 bottom-full mb-1 whitespace-nowrap rounded bg-zinc-900/95 px-2 py-1 text-[10px] text-amber-100 border border-amber-400/50 opacity-0 group-hover:opacity-100 transition z-10 shadow-lg">
              🍻 Verified Watering Hole: {b.name} — {metersLabel(b.distKm)} away
            </div>
          </div>
        ))}
      </div>

      {/* Proximity filter chips */}
      <div className="px-3 pb-3 pt-1 flex flex-wrap items-center justify-center gap-1.5">
        {(
          [
            { key: "tech-park", label: "Immediate Tech Park (< 500m)" },
            { key: "lunch-dash", label: "Lunchtime Dash (< 2km)" },
            { key: "city", label: "Happy Hour Radius (Entire City)" },
          ] as Array<{ key: ProximityFilter; label: string }>
        ).map((chip) => {
          const active = proximity === chip.key;
          return (
            <button
              key={chip.key}
              type="button"
              onClick={() => onProximityChange(chip.key)}
              aria-pressed={active}
              className={`text-[10.5px] font-mono uppercase tracking-wide px-2.5 py-1 rounded-full border transition hover-scale ${
                active
                  ? "bg-emerald-400 text-zinc-950 border-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.6)]"
                  : "bg-zinc-900/60 text-emerald-200/80 border-emerald-500/30 hover:border-emerald-400/60 hover:text-emerald-100"
              }`}
            >
              {chip.label}
            </button>
          );
        })}
      </div>
    </Card>
  );
}
