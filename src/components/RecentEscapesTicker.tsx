import { useEffect, useMemo, useState } from "react";
import { shuffleArray } from "@/lib/mockFeed";

// Pool of plausible escape micro-broadcasts across global tech hubs.
const ROLES = [
  "Colleague", "Dev", "PM", "Designer", "QA", "Architect", "SRE",
  "Intern", "Product_Manager", "Data_Scientist", "DevOps", "Manager",
];
const HUBS = [
  "Hinjawadi Phase 1, Pune", "Koregaon Park, Pune", "Whitefield, Bangalore",
  "Indiranagar, Bangalore", "Cyberhub, Gurgaon", "HITEC City, Hyderabad",
  "BKC, Mumbai", "Aerocity, Delhi", "Domain, Austin", "SOMA, San Francisco",
  "Shoreditch, London", "Mission Bay, San Francisco",
];
const ACTIONS = [
  "just fled {hub} for an IPA 🏃‍♂️",
  "dropped a mask in {hub} 🤠",
  "generated a master-level Broetry card 📝",
  "checked into a verified taproom near {hub} 🍻",
  "rage-quit a 4:45 PM standup near {hub} 💀",
  "unlocked a Community Push Deal in {hub} 👥",
  "claimed the Friday flash ticket in {hub} ⚡",
  "started a confession thread near {hub} 🎭",
  "joined the burnout leaderboard in {hub} 🔥",
  "smashed their laptop shut in {hub} 💻",
];

// Front-loaded urgent stamps so the ticker always feels live on load.
const STAMP_MINUTES = [0, 1, 2, 4, 7, 11, 16, 22, 30, 40, 55, 75, 100, 140];
function stampFor(i: number): string {
  const m = STAMP_MINUTES[i] ?? STAMP_MINUTES[STAMP_MINUTES.length - 1] + i;
  if (m <= 0) return "just now";
  if (m < 60) return `${m}m ago`;
  return `${Math.round(m / 60)}h ago`;
}

function genItem(seed: number): string {
  const role = ROLES[seed % ROLES.length];
  const num = String(((seed * 37) % 900) + 100).padStart(3, "0");
  const hub = HUBS[(seed * 13) % HUBS.length];
  const action = ACTIONS[(seed * 7) % ACTIONS.length].replace("{hub}", hub);
  return `${role}_${num} ${action}`;
}

export default function RecentEscapesTicker() {
  // Start with a deterministic seed so SSR and first client render match,
  // then jitter to randomized seed after mount to avoid hydration mismatch.
  const [seed, setSeed] = useState(0);

  useEffect(() => {
    setSeed(Math.floor(Math.random() * 9999));
    const id = setInterval(() => setSeed((s) => s + 1), 7000);
    return () => clearInterval(id);
  }, []);

  const items = useMemo(() => {
    const out: string[] = [];
    for (let i = 0; i < 14; i++) out.push(genItem(seed + i));
    return out;
  }, [seed]);

  // Duplicate the run so the marquee can loop seamlessly.
  const line = items.concat(items);

  return (
    <div
      className="relative w-full border-t border-white/5 overflow-hidden"
      style={{ background: "rgba(18, 14, 14, 0.75)", backdropFilter: "blur(10px)" }}
      aria-label="Recent anonymous escapes ticker"
    >
      <div className="mx-auto max-w-7xl flex items-stretch gap-3 px-4 h-9">
        <div className="shrink-0 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-fuchsia-300">
          <span className="inline-block size-1.5 rounded-full bg-fuchsia-400 animate-pulse" />
          📣 Recent Escapes
        </div>
        <div className="relative flex-1 overflow-hidden">
          <div className="absolute inset-y-0 left-0 w-8 bg-gradient-to-r from-[rgba(18,14,14,0.95)] to-transparent z-10 pointer-events-none" />
          <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-[rgba(18,14,14,0.95)] to-transparent z-10 pointer-events-none" />
          <div
            key={seed}
            className="absolute inset-y-0 whitespace-nowrap flex items-center text-[11px] text-amber-100/90 drinkedin-marquee"
            style={{ animationDuration: "55s" }}
          >
            {line.map((t, i) => (
              <span key={i} className="px-6 inline-flex items-center gap-2">
                <span className="text-amber-300/70">●</span>
                <span>{t}</span>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
