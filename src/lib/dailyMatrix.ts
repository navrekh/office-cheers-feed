// Timezone-aware "Daily Active Matrix" — single source of truth for the
// app's day/hour state. Everything is computed in the visitor's LOCAL
// timezone via the native browser locale, never hardcoded to IST.

export type DayKind = "midweek" | "friday-prelaunch" | "friday-live" | "weekend";

export type DayContext = {
  /** 0 = Sunday … 6 = Saturday (LOCAL). */
  weekday: number;
  /** 0–23 LOCAL hour. */
  hour: number;
  /** Minute of the hour 0–59. */
  minute: number;
  /** IANA timezone, e.g. "Asia/Kolkata", "America/Los_Angeles". */
  timezone: string;
  /** True Mon–Thu (any local time). */
  isMidWeek: boolean;
  /** True Friday before 12:00 local. */
  isFridayPrelaunch: boolean;
  /** True Friday from 12:00 local onward — the "Live Space Radar" trigger. */
  isFridayLive: boolean;
  /** True Sat/Sun. */
  isWeekend: boolean;
  /** Bucketed label for switch statements. */
  kind: DayKind;
  /** Human label e.g. "Tuesday · 14:32 IST". */
  label: string;
};

function tzName(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

/** Build the day context for the visitor's local clock. SSR-safe (returns a
 *  deterministic neutral context on the server so first paint never differs
 *  from hydration; refresh via `useDayContext()` once mounted). */
export function getLocalDayContext(now: Date = new Date()): DayContext {
  // Date's getDay/getHours already use the host's local zone.
  const weekday = now.getDay();
  const hour = now.getHours();
  const minute = now.getMinutes();
  const isMidWeek = weekday >= 1 && weekday <= 4;
  const isFriday = weekday === 5;
  const isFridayLive = isFriday && hour >= 12;
  const isFridayPrelaunch = isFriday && hour < 12;
  const isWeekend = weekday === 0 || weekday === 6;
  const kind: DayKind = isFridayLive
    ? "friday-live"
    : isFridayPrelaunch
      ? "friday-prelaunch"
      : isWeekend
        ? "weekend"
        : "midweek";
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const label = `${dayNames[weekday]} · ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")} ${tzName()}`;
  return {
    weekday, hour, minute,
    timezone: tzName(),
    isMidWeek, isFridayPrelaunch, isFridayLive, isWeekend,
    kind, label,
  };
}

/** Minutes until the next local Friday 12:00. Useful for prelaunch countdowns. */
export function minutesUntilFridayNoon(now: Date = new Date()): number {
  const target = new Date(now);
  const daysUntilFri = (5 - now.getDay() + 7) % 7;
  target.setDate(now.getDate() + daysUntilFri);
  target.setHours(12, 0, 0, 0);
  if (target.getTime() <= now.getTime()) target.setDate(target.getDate() + 7);
  return Math.max(0, Math.round((target.getTime() - now.getTime()) / 60000));
}

// ----- React hook -----------------------------------------------------------
import { useEffect, useState } from "react";

/** Reactive day context. SSR returns a stable "midweek" placeholder so the
 *  first server-rendered HTML matches first client render; the real local
 *  context kicks in inside useEffect, then refreshes every 60s. */
export function useDayContext(): DayContext {
  const [ctx, setCtx] = useState<DayContext>(() => ({
    weekday: 2, hour: 10, minute: 0,
    timezone: "UTC",
    isMidWeek: true, isFridayPrelaunch: false, isFridayLive: false, isWeekend: false,
    kind: "midweek",
    label: "Loading…",
  }));
  useEffect(() => {
    setCtx(getLocalDayContext());
    const id = setInterval(() => setCtx(getLocalDayContext()), 60_000);
    return () => clearInterval(id);
  }, []);
  return ctx;
}

// ----- Daily mid-week micro-metric ------------------------------------------
export type MidWeekMetric = {
  emoji: string;
  title: string;
  metric: string;
  value: number; // 0–100
  flavor: string;
};

const MIDWEEK_METRICS: Record<number, MidWeekMetric> = {
  1: {
    emoji: "😵",
    title: "Monday Re-entry Trauma Index",
    metric: "Inbox Backlog",
    value: 87,
    flavor: "412 unread emails. 3 are useful. We will not tell you which.",
  },
  2: {
    emoji: "🥱",
    title: "Tuesday Standup Exhaustion Level",
    metric: "Camera-Off Probability",
    value: 73,
    flavor: "By 10:14 AM, half your team is muted with a black square.",
  },
  3: {
    emoji: "🐫",
    title: "Hump-Day Slack Latency",
    metric: "Reply Delay",
    value: 61,
    flavor: "Average response time: 47 minutes. Average meaningful response: never.",
  },
  4: {
    emoji: "⏳",
    title: "Thursday Pre-Friday Anticipation",
    metric: "Calendar Avoidance",
    value: 79,
    flavor: "You declined 2 meetings labeled 'quick sync 🙂'. Correct call.",
  },
};

export function getMidWeekMetric(weekday: number): MidWeekMetric {
  return MIDWEEK_METRICS[weekday] ?? MIDWEEK_METRICS[2];
}
