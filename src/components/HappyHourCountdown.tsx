import { useEffect, useState } from "react";
import { getSelectedCity, subscribeCity, type CityKey } from "@/lib/cityStore";
import { HUB_BY_CITY } from "@/lib/hubs";

function getZonedParts(timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour12: false,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = fmt.formatToParts(new Date());
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  let h = Number(get("hour"));
  if (h === 24) h = 0;
  const dayMap: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  const day = dayMap[get("weekday")] ?? new Date().getDay();
  return { day, h, m: Number(get("minute")), s: Number(get("second")) };
}

function computeRemaining(day: number, h: number, m: number, s: number) {
  const cur = h * 3600 + m * 60 + s;
  // Weekend: Sat (6) or Sun (0) → next Monday 9:00
  if (day === 6 || day === 0) {
    const daysAhead = day === 6 ? 2 : 1;
    const target = daysAhead * 24 * 3600 + 9 * 3600;
    return { mode: "weekend" as const, remaining: Math.max(0, target - cur) };
  }
  // Friday past 5pm → still weekend recovery
  if (day === 5 && cur >= 17 * 3600) {
    const target = 3 * 24 * 3600 + 9 * 3600; // Fri evening → Mon 9am
    return { mode: "weekend" as const, remaining: Math.max(0, target - cur) };
  }
  // Workday: target this Friday 17:00
  const target = (5 - day) * 24 * 3600 + 17 * 3600;
  return { mode: "workday" as const, remaining: Math.max(0, target - cur) };
}

export default function HappyHourCountdown() {
  const [mounted, setMounted] = useState(false);
  const [city, setCity] = useState<CityKey>(() => getSelectedCity());
  const [, setTick] = useState(0);
  const [pulse, setPulse] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCity(getSelectedCity());
    return subscribeCity(setCity);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    const id = setInterval(() => {
      setTick((t) => t + 1);
      setPulse(true);
      window.setTimeout(() => setPulse(false), 280);
    }, 1000);
    return () => clearInterval(id);
  }, [mounted]);

  if (!mounted) {
    return <div className="w-full h-[26px] border-b border-cyan-400/20 bg-zinc-950/80" aria-hidden />;
  }

  const tz = HUB_BY_CITY[city]?.timezones?.[0] ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { day, h, m, s } = getZonedParts(tz);
  const { mode, remaining } = computeRemaining(day, h, m, s);

  const hh = Math.floor(remaining / 3600);
  const mm = Math.floor((remaining % 3600) / 60);
  const ss = remaining % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  const isWeekend = mode === "weekend";
  const accentColor = isWeekend ? "#fb7185" : "#fbbf24";
  const baseColor = isWeekend ? "text-rose-300" : "text-amber-200";
  const borderColor = isWeekend ? "border-rose-400/30" : "border-amber-400/25";
  const labelPrefix = isWeekend
    ? "🚨 WEEKEND RECOVERY RUNWAY REMAINING:"
    : "⏳ TIME UNTIL GLOBAL ESCAPE MATRIX VELOCITY:";
  const labelSuffix = isWeekend ? "UNTIL CORE MATRIX LOGIN" : "";

  // Battery: based on remaining within current window
  const windowSecs = isWeekend
    ? (day === 6 ? 2 : day === 0 ? 1 : 3) * 24 * 3600 + 9 * 3600
    : (5 - day) * 24 * 3600 + 17 * 3600;
  const pct = windowSecs > 0 ? Math.round((remaining / windowSecs) * 100) : 0;

  return (
    <div
      className={`w-full border-b ${borderColor} bg-zinc-950/80`}
      suppressHydrationWarning
      aria-live="polite"
    >
      <div className="mx-auto max-w-7xl px-4 py-1 flex items-center justify-center gap-2 flex-wrap">
        <span className={`text-[10px] sm:text-[11px] font-black uppercase tracking-widest font-mono ${baseColor}`}>
          {labelPrefix}{" "}
          <span
            className="tabular-nums transition-all duration-300"
            style={{
              color: pulse ? accentColor : undefined,
              textShadow: pulse ? `0 0 8px ${accentColor}` : undefined,
            }}
          >
            {pad(hh)}H : {pad(mm)}M : {pad(ss)}S
          </span>
          {labelSuffix ? <span className="ml-1">{labelSuffix}</span> : null}
        </span>
        <span className="text-[9px] sm:text-[10px] uppercase tracking-wider text-white/50 hidden sm:inline">
          · {city}
        </span>
      </div>
      <div className="h-[2px] w-full bg-zinc-900">
        <div
          className="h-full transition-all duration-1000 ease-linear"
          style={{
            width: `${pct}%`,
            background: isWeekend
              ? "linear-gradient(90deg, #fb7185, #f43f5e, #fda4af)"
              : "linear-gradient(90deg, #fbbf24, #f59e0b, #fde68a)",
            boxShadow: isWeekend
              ? "0 0 10px rgba(251,113,133,0.8), 0 0 20px rgba(251,113,133,0.4)"
              : "0 0 10px rgba(251,191,36,0.8), 0 0 20px rgba(251,191,36,0.4)",
          }}
        />
      </div>
    </div>
  );
}
