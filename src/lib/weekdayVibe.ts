// Global "Weekday Vibe Engine" — single source of truth for the active day's
// corporate-survival sub-theme. Header text, subtext, accent color, and the
// AI persona vocabulary all bind to this.

import { useEffect, useState } from "react";

export type WeekdayVibeId = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "weekend";

export type WeekdayVibe = {
  id: WeekdayVibeId;
  emoji: string;
  header: string;
  subtext: string;
  /** Short uppercase eyebrow rendered above the header */
  eyebrow: string;
  /** Tailwind text class for the accent */
  accentText: string;
  /** Tailwind border class for the accent */
  accentBorder: string;
  /** Inline gradient style for the strip background */
  accentGradient: string;
  /** Vocabulary bank the AI personas pull from */
  aiVents: string[];
  aiReplies: string[];
};

const MAP: Record<WeekdayVibeId, WeekdayVibe> = {
  monday: {
    id: "monday",
    emoji: "💀",
    eyebrow: "Monday · The Dread",
    header: "💀 The Monday Morning Standup Survival Grid.",
    subtext:
      "KPI alignments, sprint planning, and pure existential dread. Track how many techies are already crying on mute.",
    accentText: "text-amber-200",
    accentBorder: "border-amber-700/40",
    accentGradient: "linear-gradient(90deg, rgba(180,83,9,0.20), rgba(63,63,70,0.30))",
    aiVents: [
      "It's 9:02 AM and the standup is already 4 people deep into 'quick context'. Send help.",
      "Manager opened with 'let's align on alignment'. I am dreading every minute of this week.",
      "Just got 14 'circling back from last week' emails. Crying quietly on mute.",
      "My calendar Monday is a wall of grey. No food. No air. Only Jira.",
    ],
    aiReplies: [
      "💀 Same. Standup is a hostage situation today.",
      "☕ Co-signed. Surviving on cold brew and spite.",
      "🪦 Pinging the squad — we regroup at 6.",
    ],
  },
  tuesday: {
    id: "tuesday",
    emoji: "🔄",
    eyebrow: "Tuesday · The Grind",
    header: "🔄 Tuesday Cross-Functional Synergy Huddle.",
    subtext:
      "The sprint is officially behind schedule. 95% of your current meetings could have been a 2-line Slack message.",
    accentText: "text-emerald-300",
    accentBorder: "border-emerald-500/30",
    accentGradient: "linear-gradient(90deg, rgba(16,185,129,0.14), rgba(6,78,59,0.25))",
    aiVents: [
      "Third 'sync' of the day. Could have been a Slack thread. Could have been a haiku.",
      "PM just said 'let's parking-lot that'. The parking lot is full. The lot is on fire.",
      "Sprint burndown chart is now a burn-UP chart. Beautiful.",
      "I have been in back-to-back 'huddles' since 10am. I have not done any actual work.",
    ],
    aiReplies: [
      "🟢 Same energy. This could've been a one-liner.",
      "📎 Co-signed. Synergy is a scam.",
      "⏱️ Heading out at 5:01 sharp. Save me a seat.",
    ],
  },
  wednesday: {
    id: "wednesday",
    emoji: "🐪",
    eyebrow: "Wednesday · Hump Day",
    header: "🐪 Mid-Week Runway Crisis.",
    subtext:
      "Halfway through the matrix. Battery levels are critical. Escape radar tracking early lunch dashes now.",
    accentText: "text-orange-300",
    accentBorder: "border-orange-500/40",
    accentGradient: "linear-gradient(90deg, rgba(249,115,22,0.18), rgba(120,53,15,0.28))",
    aiVents: [
      "Battery: 12%. Coffee: cold. Standup: still going. Mid-week is a war crime.",
      "Just blocked 12:30–2:00 as 'focus time'. It's a long lunch. I am the focus.",
      "Hump day Slack latency: 47 minutes per reply. Average meaningful reply: never.",
      "Skip-level wants 'a quick async update'. My async update is a 1pm dosa.",
    ],
    aiReplies: [
      "🐫 Same. Sneaking out at 12:25.",
      "🍜 Co-signed. Lunch dash incoming.",
      "🔋 Charging at the nearest taproom. ETA 10.",
    ],
  },
  thursday: {
    id: "thursday",
    emoji: "🕒",
    eyebrow: "Thursday · The Pre-Game",
    header: "🕒 Thursday Deployment Paranoia.",
    subtext:
      "Don't merge that pull request. Let's align on a pre-Friday buffer strategy instead.",
    accentText: "text-fuchsia-300",
    accentBorder: "border-fuchsia-500/40",
    accentGradient: "linear-gradient(90deg, rgba(217,70,239,0.16), rgba(76,29,149,0.30))",
    aiVents: [
      "Someone just opened a PR titled 'small refactor'. It is +1,847 / -23. On a Thursday. The audacity.",
      "Release manager said 'we have a buffer'. The buffer is me. I am the buffer.",
      "Calendar invite at 5pm: 'Pre-deploy alignment'. I will be aligned with the bar.",
      "Tomorrow is Friday. Today, please, no surprise rollbacks.",
    ],
    aiReplies: [
      "🟣 Hard agree. Freeze the repo, free the people.",
      "🛑 Co-signed. Nobody merges anything tonight.",
      "🍻 Pre-game roll call — who's in for a 7pm pour?",
    ],
  },
  friday: {
    id: "friday",
    emoji: "🍻",
    eyebrow: "Friday · Escape Velocity",
    header: "🍻 Welcome to the Breakroom. The Corporate Matrix is offline.",
    subtext:
      "Whisper anonymously. Vote the poll. No HR. No metrics. Just the pod heading to the taproom.",
    accentText: "text-amber-300",
    accentBorder: "border-amber-400/40",
    accentGradient: "linear-gradient(90deg, rgba(251,191,36,0.16), rgba(168,85,247,0.14))",
    aiVents: [
      "Slack status: 'in a deep focus session'. Location: walking out the tech park gates.",
      "Who's buying the first round at Arbor tonight? Deployment was a trainwreck.",
      "PM moved the standup to 6:30 PM. I'm moving my body to Toit.",
      "Skip-level just asked for a 'quick async update' at 4:55pm. My update is a cold lager.",
    ],
    aiReplies: [
      "🎯 Pure facts. Grab a slot on the radar, we head out in 10.",
      "🍻 Co-signed. Already saving you a stool at Toit.",
      "📡 Radar pinged. Crew is rallying — drop your ETA.",
    ],
  },
  weekend: {
    id: "weekend",
    emoji: "🌅",
    eyebrow: "Weekend · Off the Clock",
    header: "🌅 Weekend Decompression Lounge.",
    subtext:
      "Slack is muted. Standup is a myth. Sunday scaries are still 36 hours away — pour something cold.",
    accentText: "text-sky-300",
    accentBorder: "border-sky-500/30",
    accentGradient: "linear-gradient(90deg, rgba(56,189,248,0.14), rgba(30,58,138,0.28))",
    aiVents: [
      "Two whole days without a 'quick sync'. I don't know what to do with my hands.",
      "Brunch lasted 4 hours. Productive weekend, honestly.",
      "Sunday scaries incoming at 6pm sharp. Pre-loading with pilsner.",
    ],
    aiReplies: [
      "🌞 Same. No laptop on the table today.",
      "🍳 Brunch radar pinged. Save me a chair.",
      "🍺 Co-signed. Off-grid until Monday standup.",
    ],
  },
};

export function getWeekdayVibe(day: number = new Date().getDay()): WeekdayVibe {
  switch (day) {
    case 1: return MAP.monday;
    case 2: return MAP.tuesday;
    case 3: return MAP.wednesday;
    case 4: return MAP.thursday;
    case 5: return MAP.friday;
    default: return MAP.weekend;
  }
}

/** SSR-safe reactive hook. Returns Friday on the server so the first paint
 *  matches the prior copy, then swaps in the visitor's local day on mount. */
export function useWeekdayVibe(): WeekdayVibe {
  const [vibe, setVibe] = useState<WeekdayVibe>(() => MAP.friday);
  useEffect(() => {
    setVibe(getWeekdayVibe());
    const id = setInterval(() => setVibe(getWeekdayVibe()), 5 * 60_000);
    return () => clearInterval(id);
  }, []);
  return vibe;
}
