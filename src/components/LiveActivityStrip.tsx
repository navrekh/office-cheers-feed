import { useEffect, useState } from "react";

const TYPING_LINES = [
  "Anon_TCS_Lead is typing…",
  "Deloitte_Defector is drafting a confession…",
  "Burnt_Intern_431 is typing…",
  "someone in Bangalore is spilling…",
  "PIP_Survivor_88 is typing…",
  "Meta_E5_Refugee is drafting…",
  "someone in HR is typing… (uh oh)",
  "Zomato_Eng_GGN is typing…",
  "Anon_Founder is confessing…",
  "someone in a 6PM standup is typing…",
];

function jitter(base: number, spread: number) {
  return base + Math.floor((Math.random() - 0.5) * spread);
}

export default function LiveActivityStrip() {
  const [online, setOnline] = useState<number>(() => 34 + Math.floor(Math.random() * 22));
  const [lastPostSec, setLastPostSec] = useState<number>(() => 5 + Math.floor(Math.random() * 40));
  const [typing, setTyping] = useState<string>(() => TYPING_LINES[0]);
  const [typingVisible, setTypingVisible] = useState(true);

  // Online count drift
  useEffect(() => {
    const t = window.setInterval(() => {
      setOnline((n) => Math.max(18, Math.min(120, jitter(n, 6))));
    }, 4200);
    return () => window.clearInterval(t);
  }, []);

  // "Last confession Xs ago" — tick up, occasionally reset to simulate a drop
  useEffect(() => {
    const t = window.setInterval(() => {
      setLastPostSec((s) => (Math.random() < 0.14 ? Math.floor(Math.random() * 6) : s + 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, []);

  // Typing ticker rotate
  useEffect(() => {
    const t = window.setInterval(() => {
      setTypingVisible(false);
      window.setTimeout(() => {
        setTyping(TYPING_LINES[Math.floor(Math.random() * TYPING_LINES.length)]);
        setTypingVisible(true);
      }, 220);
    }, 3800);
    return () => window.clearInterval(t);
  }, []);

  const lastLabel =
    lastPostSec < 60
      ? `${lastPostSec}s ago`
      : `${Math.floor(lastPostSec / 60)}m ${lastPostSec % 60}s ago`;

  return (
    <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-emerald-400/25 bg-gradient-to-r from-emerald-500/[0.06] via-transparent to-cyan-500/[0.06] px-3 py-2 text-[11px] font-mono">
      <div className="flex items-center gap-3 min-w-0">
        <span className="inline-flex items-center gap-1.5 text-emerald-300 font-bold tabular-nums shrink-0">
          <span className="relative inline-flex size-2">
            <span className="absolute inline-flex size-full rounded-full bg-emerald-400 opacity-75 animate-ping" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          {online} ONLINE
        </span>
        <span className="text-white/25">·</span>
        <span className="text-amber-200/90 tabular-nums shrink-0">
          🍻 last confession <span className="text-amber-100 font-bold">{lastLabel}</span>
        </span>
      </div>
      <div
        className={`hidden sm:block text-cyan-200/80 truncate transition-opacity duration-200 ${
          typingVisible ? "opacity-100" : "opacity-0"
        }`}
        title={typing}
      >
        ✍️ {typing}
      </div>
    </div>
  );
}
