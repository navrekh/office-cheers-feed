import { useEffect, useState } from "react";

type Hub = {
  flag: string;
  city: string;
  tz: string;
  tzLabel: string;
  status: string;
  dotClass: string;
};

const HUBS: Hub[] = [
  {
    flag: "🇺🇸",
    city: "Silicon Valley",
    tz: "America/Los_Angeles",
    tzLabel: "PST",
    status: "🍻 Peak Taproom Transgression • 96.4% OOO",
    dotClass: "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]",
  },
  {
    flag: "🇮🇳",
    city: "Bangalore / Pune",
    tz: "Asia/Kolkata",
    tzLabel: "IST",
    status: "☕ Chai & Side-Hustle Mode • 98.1% Checked Out",
    dotClass: "bg-purple-400 shadow-[0_0_8px_rgba(192,132,252,0.9)]",
  },
  {
    flag: "🇬🇧",
    city: "London",
    tz: "Europe/London",
    tzLabel: "GMT",
    status: "🛌 Weekend Hibernation Active • 94.2% Ghosting Slack",
    dotClass: "bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.9)]",
  },
  {
    flag: "🇨🇳",
    city: "Shenzhen",
    tz: "Asia/Shanghai",
    tzLabel: "CST",
    status: "🤫 Late Night Stealth PTO • 89.7% Off-Grid",
    dotClass: "bg-rose-400 shadow-[0_0_8px_rgba(251,113,133,0.9)]",
  },
];

function localTime(tz: string, now: Date): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(now);
  } catch {
    return "--:--";
  }
}

export default function GlobalTimezoneMatrix() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="bg-[#0d0d0d]/80 backdrop-blur-xl border border-[#1f1f1f] rounded-2xl p-4 shadow-xl">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[11px] font-bold tracking-wider text-white/90">
          🌐 GLOBAL CHECKOUT VELOCITY (LIVE)
        </h3>
        <span className="text-[9px] font-mono text-emerald-400/80 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE
        </span>
      </div>

      <div className="space-y-2">
        {HUBS.map((h) => (
          <div
            key={h.city}
            className="flex items-start gap-2.5 p-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] transition-colors"
          >
            <span
              className={`mt-1.5 w-2 h-2 rounded-full animate-pulse flex-shrink-0 ${h.dotClass}`}
            />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-white/90 truncate">
                  {h.flag} {h.city}
                </span>
                <span className="text-[9px] font-mono text-white/50 tabular-nums">
                  {localTime(h.tz, now)} {h.tzLabel}
                </span>
              </div>
              <div className="text-[10px] text-white/60 mt-0.5 leading-snug">
                {h.status}
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[9px] text-white/40 mt-3 text-center italic">
        💡 Telemetry auto-synced via global IP mesh nodes.
      </p>
    </div>
  );
}
