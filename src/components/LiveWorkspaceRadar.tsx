import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Radio, Loader2, Compass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { haversineKm, type LatLng } from "@/lib/geo";

type CheckIn = {
  id: string;
  activity: "browsing_deals" | "posting" | "commenting" | "checked_in";
  latitude: number;
  longitude: number;
  created_at: string;
  expires_at: string;
};

type Props = {
  origin: LatLng | null;
  geoStatus: "idle" | "prompting" | "granted" | "denied" | "unavailable";
};

const WINDOW_MS = 3 * 60 * 60 * 1000; // last 3 hours

export function LiveWorkspaceRadar({ origin, geoStatus }: Props) {
  const [checkins, setCheckins] = useState<CheckIn[]>([]);
  const [tickerIdx, setTickerIdx] = useState(0);

  // Initial fetch + realtime stream
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

  // Compute proximity buckets relative to current origin
  const { extreme, nearby, total } = useMemo(() => {
    if (!origin) return { extreme: [] as CheckIn[], nearby: [] as CheckIn[], total: 0 };
    const fresh = checkins.filter(
      (c) => Date.now() - new Date(c.created_at).getTime() <= WINDOW_MS
    );
    const ex: CheckIn[] = [];
    const nx: CheckIn[] = [];
    for (const c of fresh) {
      const d = haversineKm(origin, { latitude: c.latitude, longitude: c.longitude });
      if (d <= 0.5) ex.push(c);
      else if (d <= 2.0) nx.push(c);
    }
    return { extreme: ex, nearby: nx, total: fresh.length };
  }, [checkins, origin]);

  // Build ticker messages
  const tickers = useMemo(() => {
    const msgs: { tone: "red" | "yellow" | "neutral"; text: string }[] = [];
    if (extreme.length > 0) {
      const c = extreme[0];
      const distKm = origin
        ? haversineKm(origin, { latitude: c.latitude, longitude: c.longitude })
        : 0;
      const meters = Math.max(50, Math.round(distKm * 1000 / 50) * 50);
      const verb =
        c.activity === "posting"
          ? "just posted a coping story"
          : c.activity === "commenting"
            ? "is venting in the comments"
            : c.activity === "checked_in"
              ? "checked into a pub"
              : "is browsing deals";
      msgs.push({
        tone: "red",
        text: `🔴 Extreme Proximity: A Colleague ${verb} ~${meters}m away in your tech park!`,
      });
    }
    if (nearby.length > 0) {
      const browsing = nearby.filter((c) => c.activity === "browsing_deals").length;
      const posting = nearby.filter((c) => c.activity === "posting").length;
      if (browsing > 0) {
        msgs.push({
          tone: "yellow",
          text: `🟡 Nearby: ${browsing} tech professional${browsing === 1 ? " is" : "s are"} currently browsing happy hour deals within your corporate sector.`,
        });
      }
      if (posting > 0) {
        msgs.push({
          tone: "yellow",
          text: `🟡 Nearby: ${posting} colleague${posting === 1 ? " just dropped" : "s just dropped"} a fresh DrinkedIn post within 2 km.`,
        });
      }
    }
    if (msgs.length === 0) {
      msgs.push({
        tone: "neutral",
        text:
          geoStatus === "granted"
            ? `🛰️ Scanning your corporate sector… ${total} signal${total === 1 ? "" : "s"} in the last 3h.`
            : geoStatus === "denied"
              ? "🛰️ Radar offline — enable browser location to triangulate nearby colleagues."
              : "🛰️ Calibrating radar…",
      });
    }
    return msgs;
  }, [extreme, nearby, total, origin, geoStatus]);

  // Cycle ticker every 5s without re-rendering the panel layout
  useEffect(() => {
    if (tickers.length <= 1) return;
    const id = setInterval(() => setTickerIdx((i) => (i + 1) % tickers.length), 5000);
    return () => clearInterval(id);
  }, [tickers.length]);

  const current = tickers[tickerIdx % tickers.length];
  const toneClass =
    current.tone === "red"
      ? "text-red-300"
      : current.tone === "yellow"
        ? "text-amber-200"
        : "text-muted-foreground";

  return (
    <Card
      className="relative overflow-hidden border-amber-500/30 bg-gradient-to-br from-amber-950/40 via-zinc-950 to-zinc-950 shadow-[0_0_24px_-6px_rgba(251,191,36,0.45)]"
      aria-label="Live Workspace Radar"
    >
      {/* Glow sweep */}
      <div className="pointer-events-none absolute -top-1/2 left-1/2 size-[150%] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.18),transparent_55%)] animate-pulse" />
      <div className="relative px-4 py-3 flex items-center gap-3">
        <div className="relative size-9 shrink-0 rounded-full grid place-items-center bg-amber-500/15 border border-amber-400/40 text-amber-200 shadow-[0_0_18px_rgba(251,191,36,0.4)]">
          {geoStatus === "prompting" ? (
            <Loader2 className="size-4 animate-spin" />
          ) : origin ? (
            <Radio className="size-4" />
          ) : (
            <Compass className="size-4" />
          )}
          <span className="absolute inset-0 rounded-full ring-2 ring-amber-400/50 animate-ping" aria-hidden />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-amber-300/90 flex items-center gap-2">
            Live Workspace Radar 🛰️
            <span className="text-[10px] font-medium normal-case text-muted-foreground">
              {extreme.length + nearby.length} nearby · {total} in 3h
            </span>
          </div>
          {/* Fixed-height ticker line so swapping text never reflows the page */}
          <div className="mt-0.5 h-10 sm:h-6 relative overflow-hidden">
            <p
              key={tickerIdx}
              className={`absolute inset-0 text-[12.5px] leading-snug ${toneClass} animate-fade-in`}
            >
              {current.text}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}
