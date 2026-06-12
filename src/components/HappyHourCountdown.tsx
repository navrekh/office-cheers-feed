import { useEffect, useState } from "react";
import { getSelectedCity, subscribeCity, type CityKey } from "@/lib/cityStore";
import { HUB_BY_CITY } from "@/lib/hubs";

const START_HOUR = 9;
const END_HOUR = 17;

function getNowParts(timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? "0");
  let h = get("hour");
  if (h === 24) h = 0;
  return { h, m: get("minute"), s: get("second") };
}

export default function HappyHourCountdown() {
  const [city, setCity] = useState<CityKey>(() => getSelectedCity());
  const [tick, setTick] = useState(0);

  useEffect(() => {
    setCity(getSelectedCity());
    return subscribeCity(setCity);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const tz = HUB_BY_CITY[city]?.timezones?.[0] ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { h, m, s } = getNowParts(tz);
  const totalSecs = h * 3600 + m * 60 + s;
  const endSecs = END_HOUR * 3600;
  const startSecs = START_HOUR * 3600;

  const past5 = totalSecs >= endSecs && totalSecs < 24 * 3600;
  const remaining = Math.max(0, endSecs - totalSecs);
  const hh = Math.floor(remaining / 3600);
  const mm = Math.floor((remaining % 3600) / 60);
  const ss = remaining % 60;

  // Battery: 100% at 9am, 0% at 5pm
  let pct = 0;
  if (totalSecs <= startSecs) pct = 100;
  else if (totalSecs >= endSecs) pct = 0;
  else pct = Math.round(((endSecs - totalSecs) / (endSecs - startSecs)) * 100);

  if (past5) {
    return (
      <div
        className="w-full border-b border-violet-400/40 px-4 py-1.5 text-center animate-pulse"
        style={{
          background:
            "linear-gradient(90deg, rgba(91,33,182,0.85), rgba(139,92,246,0.85), rgba(91,33,182,0.85))",
          boxShadow: "0 0 24px -4px rgba(139,92,246,0.6) inset",
        }}
        suppressHydrationWarning
        aria-live="polite"
      >
        <span className="text-[11px] sm:text-xs font-black uppercase tracking-widest text-white drop-shadow-[0_0_8px_rgba(255,255,255,0.6)]">
          🔓 Matrix Broken. Happy Hour is Officially Live in Your Sector.
        </span>
      </div>
    );
  }

  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      className="w-full border-b border-cyan-400/20 bg-zinc-950/80"
      suppressHydrationWarning
      aria-live="polite"
    >
      <div className="mx-auto max-w-7xl px-4 py-1 flex items-center justify-center gap-2">
        <span className="text-[10px] sm:text-[11px] font-black uppercase tracking-widest font-mono text-cyan-200">
          ⏳ {pad(hh)}h : {pad(mm)}m : <span className="tabular-nums">{pad(ss)}</span>s
        </span>
        <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-cyan-300/70 hidden sm:inline">
          until escape matrix velocity · {city}
        </span>
      </div>
      <div className="h-[2px] w-full bg-zinc-900">
        <div
          className="h-full transition-all duration-1000 ease-linear"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #22d3ee, #06b6d4, #67e8f9)",
            boxShadow: "0 0 10px rgba(34,211,238,0.8), 0 0 20px rgba(34,211,238,0.4)",
          }}
        />
      </div>
    </div>
  );
}
