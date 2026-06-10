// "Current Vibe" decorative header cards. Pure presentation data —
// pick by id, render the gradient block above the post body.

export type Vibe = {
  id: string;
  emoji: string;
  label: string;
  caption: string;
  /** Tailwind gradient classes for the decorative header */
  gradient: string;
  /** Text + accent color */
  text: string;
};

export const VIBES: Vibe[] = [
  {
    id: "survival",
    emoji: "☕",
    label: "Survival Mode",
    caption: "Running on cold brew & spite",
    gradient: "from-amber-900/70 via-stone-800/70 to-stone-900/90",
    text: "text-amber-100",
  },
  {
    id: "liquid-lunch",
    emoji: "🍺",
    label: "Liquid Lunch",
    caption: "OOO from 12 to 2. Don't @ me.",
    gradient: "from-yellow-500/40 via-amber-600/40 to-orange-700/60",
    text: "text-yellow-50",
  },
  {
    id: "outage",
    emoji: "🚨",
    label: "Server Outage",
    caption: "Production is down. Pour is up.",
    gradient: "from-red-700/60 via-rose-800/60 to-zinc-900/80",
    text: "text-red-50",
  },
  {
    id: "zoom-fatigue",
    emoji: "😵",
    label: "Zoom Fatigue",
    caption: "Camera off. Soul off.",
    gradient: "from-sky-800/60 via-indigo-800/60 to-slate-900/80",
    text: "text-sky-50",
  },
  {
    id: "clocked-out",
    emoji: "🥳",
    label: "Clocked Out",
    caption: "Slack on snooze. Tab on tab.",
    gradient: "from-fuchsia-600/50 via-pink-600/50 to-orange-500/60",
    text: "text-fuchsia-50",
  },
  {
    id: "incognito",
    emoji: "🤫",
    label: "Incognito",
    caption: "I was never here. Neither were the shots.",
    gradient: "from-zinc-700/70 via-zinc-800/80 to-black/90",
    text: "text-zinc-100",
  },
];

export function getVibe(id?: string): Vibe | undefined {
  if (!id) return undefined;
  return VIBES.find((v) => v.id === id);
}
