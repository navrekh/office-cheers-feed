import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

// Map the local hour-of-day onto a 0..1 desperation score. Then blend a
// secondary signal from recent global cheers + live post velocity.
function timeOfDayScore(d = new Date()) {
  const mins = d.getHours() * 60 + d.getMinutes();
  // 9:00 -> 0.10 ; 13:00 -> 0.35 ; 15:30 -> 0.55 ; 16:30 -> 0.75 ; 17:00+ -> 0.95
  if (mins < 9 * 60) return 0.08;
  if (mins < 13 * 60) return 0.18 + ((mins - 9 * 60) / (4 * 60)) * 0.12;
  if (mins < 15.5 * 60) return 0.32 + ((mins - 13 * 60) / (2.5 * 60)) * 0.2;
  if (mins < 16.5 * 60) return 0.55 + ((mins - 15.5 * 60) / 60) * 0.2;
  if (mins < 20 * 60) return 0.78 + ((mins - 16.5 * 60) / (3.5 * 60)) * 0.2;
  return 0.65; // late night winds down
}

type Zone = {
  label: string;
  emoji: string;
  tone: string;
  glowVar: string;
};

function zoneFor(score: number, d = new Date()): Zone {
  const mins = d.getHours() * 60 + d.getMinutes();
  if (mins < 13 * 60)
    return { label: "Productive / Sober", emoji: "☕", tone: "text-emerald-300", glowVar: "0 0 14px rgba(52,211,153,0.55)" };
  if (mins < 15.5 * 60)
    return { label: "Post-Lunch Slump", emoji: "🥱", tone: "text-yellow-300", glowVar: "0 0 14px rgba(250,204,21,0.55)" };
  if (mins < 16.5 * 60)
    return { label: "Slack: Out of Office", emoji: "🤫", tone: "text-orange-300", glowVar: "0 0 16px rgba(251,146,60,0.7)" };
  if (score >= 0.78)
    return { label: "CRITICAL SYNERGY CRASH", emoji: "🚨", tone: "text-red-300", glowVar: "0 0 22px rgba(239,68,68,0.85)" };
  return { label: "Cooling Down", emoji: "🌙", tone: "text-indigo-300", glowVar: "0 0 14px rgba(129,140,248,0.55)" };
}

export default function DesperationGauge() {
  const [tick, setTick] = useState(0);
  const [recentCheers, setRecentCheers] = useState(0);

  // Re-render every 30s so the gauge breathes through the day.
  useEffect(() => {
    const i = setInterval(() => setTick((n) => n + 1), 30_000);
    return () => clearInterval(i);
  }, []);

  // Pull last-hour cheers (best-effort; gauge still works offline).
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
        const { data } = await (supabase as any)
          .from("posts")
          .select("cheers_count")
          .gte("created_at", since)
          .limit(200);
        if (cancelled || !data) return;
        const sum = (data as Array<{ cheers_count: number }>).reduce(
          (a, r) => a + (r.cheers_count ?? 0),
          0,
        );
        setRecentCheers(sum);
      } catch {
        /* offline fallback */
      }
    }
    load();
    const i = setInterval(load, 60_000);
    return () => {
      cancelled = true;
      clearInterval(i);
    };
  }, []);

  const { score, zone, angle } = useMemo(() => {
    const now = new Date();
    const t = timeOfDayScore(now);
    const cheerBoost = Math.min(0.2, recentCheers / 500);
    const score = Math.min(1, t + cheerBoost);
    const zone = zoneFor(score, now);
    // -90deg (left) .. +90deg (right)
    const angle = -90 + score * 180;
    return { score, zone, angle };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick, recentCheers]);

  // Trigger ambient page glow when critical.
  useEffect(() => {
    const critical = zone.label === "CRITICAL SYNERGY CRASH";
    document.documentElement.classList.toggle("drinkedin-critical-glow", critical);
    return () => {
      document.documentElement.classList.remove("drinkedin-critical-glow");
    };
  }, [zone.label]);

  return (
    <Card className="p-4 border-border bg-gradient-to-b from-zinc-950 to-zinc-900 relative overflow-hidden">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-[11px] font-bold uppercase tracking-wider text-foreground/90">
          📊 Office Desperation Index
        </h4>
        <span
          className={`text-[10px] font-mono tabular-nums ${zone.tone}`}
          style={{ textShadow: zone.glowVar }}
        >
          {Math.round(score * 100)}%
        </span>
      </div>

      {/* Gauge */}
      <div className="relative h-24 mx-auto" style={{ width: 200 }}>
        {/* Arc zones */}
        <svg viewBox="0 0 200 110" className="absolute inset-0 w-full h-full">
          <defs>
            <linearGradient id="gaugeGrad" x1="0" x2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="40%" stopColor="#facc15" />
              <stop offset="70%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          <path
            d="M 15 100 A 85 85 0 0 1 185 100"
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth="10"
            strokeLinecap="round"
            opacity="0.85"
          />
          {/* Tick marks */}
          {[-90, -45, 0, 45, 90].map((a) => {
            const rad = (a * Math.PI) / 180;
            const x1 = 100 + Math.sin(rad) * 70;
            const y1 = 100 - Math.cos(rad) * 70;
            const x2 = 100 + Math.sin(rad) * 82;
            const y2 = 100 - Math.cos(rad) * 82;
            return (
              <line
                key={a}
                x1={x1}
                y1={y1}
                x2={x2}
                y2={y2}
                stroke="rgba(255,255,255,0.35)"
                strokeWidth="1.5"
              />
            );
          })}
        </svg>

        {/* Needle */}
        <div
          className="absolute left-1/2 bottom-[10px] origin-bottom"
          style={{
            width: 2,
            height: 70,
            transform: `translateX(-1px) rotate(${angle}deg)`,
            transition: "transform 900ms cubic-bezier(0.34, 1.56, 0.64, 1)",
            background: "linear-gradient(to top, #f4f4f5, #fef08a)",
            boxShadow: zone.glowVar,
            borderRadius: 2,
          }}
        />
        {/* Hub */}
        <div className="absolute left-1/2 bottom-[6px] -translate-x-1/2 size-3 rounded-full bg-zinc-200 border border-zinc-700 shadow" />
      </div>

      <div
        className={`mt-1 text-center text-[12px] font-bold ${zone.tone} ${
          zone.label.startsWith("CRITICAL") ? "animate-pulse" : ""
        }`}
        style={{ textShadow: zone.glowVar }}
      >
        {zone.emoji} {zone.label}
      </div>
      <div className="text-center text-[10px] text-muted-foreground/80 mt-0.5">
        Recent cheers: <span className="font-mono">{recentCheers}</span> · live
      </div>
    </Card>
  );
}
