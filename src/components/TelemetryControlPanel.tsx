import { useEffect, useMemo, useState } from "react";

/**
 * Live Telemetry Control Panel — premium B2B dashboard widget.
 * Pure-client simulation: deterministic seed + interval ticks.
 */
export default function TelemetryControlPanel() {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setTick((x) => x + 1), 3500);
    return () => clearInterval(t);
  }, []);

  // Card 1 — Active Devices (fluctuating ~440-520)
  const activeDevices = useMemo(() => 482 + ((Math.sin(tick * 0.7) * 22 + Math.cos(tick * 1.3) * 14) | 0), [tick]);
  // Card 2 — Intent clicks (monotonic-ish)
  const intentClicks = useMemo(() => 137 + tick * 3 + (Math.floor(Math.random() * 3)), [tick]);
  // Card 3 — Competitor pins claimed nearby (slow drift)
  const competitorPins = useMemo(() => 7 + Math.floor(tick / 8) % 5, [tick]);

  return (
    <section
      aria-label="Live telemetry control panel"
      className="space-y-3"
    >
      <header className="flex items-center justify-between">
        <h2 className="text-[13px] font-bold tracking-tight text-cyan-200 uppercase">
          📡 Live Telemetry Control Panel
        </h2>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-300/80 font-mono">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          STREAMING · {new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </span>
      </header>

      {/* 3-card grid */}
      <div className="grid sm:grid-cols-3 gap-3">
        <MetricCard
          title="📡 Local Techies On Radar"
          value={activeDevices.toLocaleString()}
          unit="Active Devices"
          badge="+12% last hour"
          badgeColor="emerald"
          accent="cyan"
        />
        <MetricCard
          title="🎟️ Intent to Escape Clicks"
          value={intentClicks.toLocaleString()}
          unit="Polls + 'Heading here' taps"
          badge="HIGH INTENT"
          badgeColor="amber"
          accent="amber"
        />
        <MetricCard
          title="🏆 Top Sponsoring Competitors"
          value={String(competitorPins)}
          unit="Bars claimed this week"
          badge={competitorPins > 9 ? "MARKET SATURATING" : "SPACE LEFT"}
          badgeColor={competitorPins > 9 ? "rose" : "sky"}
          accent="violet"
        />
      </div>

      {/* Hourly burnout chart */}
      <BurnoutChart />

      {/* Live lead alert ticker */}
      <LiveLeadTicker tick={tick} />

      {/* Sticky promo banner */}
      <div className="sticky bottom-2 z-10 rounded-xl border border-amber-400/40 bg-gradient-to-r from-amber-500/20 via-red-500/15 to-amber-500/20 backdrop-blur-xl px-4 py-3 shadow-[0_0_40px_rgba(251,191,36,0.25)]">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <p className="text-[12.5px] text-amber-100/95 font-medium leading-snug">
            🔒 Unlock full targeting controls, custom push notifications, and clear your venue's placeholder status.
          </p>
          <a
            href="#subscribe"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("subscribe-cta")?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-md bg-amber-500 hover:bg-amber-400 text-amber-950 text-[12px] font-bold transition whitespace-nowrap"
          >
            ⚡ Activate Razorpay Slot
          </a>
        </div>
      </div>
    </section>
  );
}

/* ───────────────────────── Metric Card ───────────────────────── */

const ACCENT: Record<string, string> = {
  cyan: "text-cyan-300",
  amber: "text-amber-300",
  violet: "text-violet-300",
};
const BADGE: Record<string, string> = {
  emerald: "bg-emerald-500/15 text-emerald-300 border-emerald-400/30",
  amber: "bg-amber-500/15 text-amber-300 border-amber-400/30",
  rose: "bg-rose-500/15 text-rose-300 border-rose-400/30",
  sky: "bg-sky-500/15 text-sky-300 border-sky-400/30",
};

function MetricCard({
  title, value, unit, badge, badgeColor, accent,
}: { title: string; value: string; unit: string; badge: string; badgeColor: string; accent: string }) {
  return (
    <div
      className="relative rounded-xl p-4 overflow-hidden"
      style={{ background: "#111", border: "1px solid #222" }}
    >
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />
      <p className="text-[10.5px] uppercase tracking-[0.12em] text-zinc-400 font-mono">{title}</p>
      <p className={`mt-2 text-3xl font-extrabold tabular-nums ${ACCENT[accent]} drop-shadow-[0_0_12px_currentColor]`}>
        {value}
      </p>
      <p className="text-[10.5px] text-zinc-500 mt-0.5">{unit}</p>
      <span className={`mt-3 inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${BADGE[badgeColor]}`}>
        <span className="size-1.5 rounded-full bg-current animate-pulse" />
        {badge}
      </span>
    </div>
  );
}

/* ───────────────────────── Burnout Chart ───────────────────────── */

function BurnoutChart() {
  // 24 hourly points 0..23. Hockey stick: low until 12, sharp spike 12-17, peak ~16, then drop.
  const points = useMemo(() => {
    const arr: number[] = [];
    for (let h = 0; h < 24; h++) {
      let v: number;
      if (h < 9) v = 4 + h * 0.6;
      else if (h < 12) v = 9 + (h - 9) * 2;
      else if (h <= 16) v = 18 + Math.pow(h - 12, 1.9) * 4;
      else if (h <= 17) v = 95; // peak
      else if (h <= 19) v = 85 - (h - 17) * 10;
      else v = Math.max(8, 55 - (h - 19) * 9);
      arr.push(v);
    }
    return arr;
  }, []);

  const W = 600, H = 160, P = 28;
  const max = 100;
  const xs = (i: number) => P + (i * (W - P * 2)) / 23;
  const ys = (v: number) => H - P - ((v / max) * (H - P * 2));

  const linePath = points.map((v, i) => `${i === 0 ? "M" : "L"} ${xs(i).toFixed(1)} ${ys(v).toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${xs(23).toFixed(1)} ${H - P} L ${xs(0).toFixed(1)} ${H - P} Z`;

  return (
    <div className="rounded-xl p-4" style={{ background: "#111", border: "1px solid #222" }}>
      <div className="flex items-baseline justify-between mb-2">
        <div>
          <h3 className="text-[12px] font-bold text-cyan-200">📈 Hourly Burnout Accumulation</h3>
          <p className="text-[10px] text-zinc-500">Push a discount code when the curve breaks — peak window 15:30–17:30</p>
        </div>
        <span className="text-[10px] font-mono text-rose-300/80">PEAK: 16:30</span>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-40">
        <defs>
          <linearGradient id="burnout-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#f97316" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="burnout-stroke" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#22d3ee" />
            <stop offset="60%" stopColor="#fbbf24" />
            <stop offset="100%" stopColor="#f43f5e" />
          </linearGradient>
        </defs>
        {/* grid */}
        {[0, 25, 50, 75, 100].map((g) => (
          <line key={g} x1={P} x2={W - P} y1={ys(g)} y2={ys(g)} stroke="#222" strokeDasharray="2 4" />
        ))}
        {/* peak window highlight */}
        <rect x={xs(15)} y={P / 2} width={xs(17) - xs(15)} height={H - P - P / 2} fill="#f43f5e" opacity={0.08} />
        <path d={areaPath} fill="url(#burnout-fill)" />
        <path d={linePath} fill="none" stroke="url(#burnout-stroke)" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
        {/* peak marker */}
        <circle cx={xs(16)} cy={ys(points[16])} r={4} fill="#f43f5e" stroke="#111" strokeWidth={2}>
          <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
        </circle>
        {/* hour labels */}
        {[0, 6, 12, 16, 20, 23].map((h) => (
          <text key={h} x={xs(h)} y={H - 6} fontSize="9" fill="#52525b" textAnchor="middle" fontFamily="ui-monospace, monospace">
            {String(h).padStart(2, "0")}:00
          </text>
        ))}
      </svg>
    </div>
  );
}

/* ───────────────────────── Live Lead Ticker ───────────────────────── */

type Lead = { id: string; time: string; text: string };

const SEED_LEADS: Lead[] = [
  { id: "l1", time: "11:15 AM", text: "A pool of 24 developers from Capgemini just voted 'Danger Zone' in Hinjawadi." },
  { id: "l2", time: "11:22 AM", text: "14 users near Cybercity just opened the Happy Hour list." },
  { id: "l3", time: "11:34 AM", text: "9 testers from Wipro pinned your district as 'Escape Target'." },
  { id: "l4", time: "11:41 AM", text: "Surge: 31 standup-survivors near Magarpatta tapped 'I'm heading here'." },
];

const LEAD_POOL = [
  "18 PMs near Kharadi just bookmarked a Friday hop.",
  "7 SREs in Baner clicked 'pour me a pint' on the radar.",
  "22 devs from TCS voted 'Loose Standup' — venue intent rising.",
  "11 designers near Viman Nagar opened your district profile.",
  "Surge: 38 colleagues at Hinjawadi P2 marked status 'Out of Office mentally'.",
  "A 6-person QA pod from Cognizant just locked a flash deal nearby.",
];

function LiveLeadTicker({ tick }: { tick: number }) {
  const [leads, setLeads] = useState<Lead[]>(SEED_LEADS);

  useEffect(() => {
    if (tick === 0) return;
    const now = new Date();
    const time = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const text = LEAD_POOL[(tick + leads.length) % LEAD_POOL.length];
    setLeads((prev) => [{ id: `live-${tick}`, time, text }, ...prev].slice(0, 8));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: "#0c0c0c", border: "1px solid #222" }}>
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#222]">
        <h3 className="text-[11px] font-bold text-cyan-200 uppercase tracking-wider">⚡ Live Lead Alert Feed</h3>
        <span className="text-[9.5px] font-mono text-zinc-500">SYSTEM LOG · TAIL -f</span>
      </div>
      <ul className="max-h-56 overflow-y-auto divide-y divide-[#1a1a1a]">
        {leads.map((l, i) => (
          <li
            key={l.id}
            className="flex items-start gap-3 px-4 py-2.5 font-mono text-[11.5px] text-zinc-300 hover:bg-white/[0.02]"
            style={i === 0 ? { background: "rgba(34,211,238,0.04)" } : undefined}
          >
            <span className="text-amber-300 shrink-0">⚡</span>
            <span className="text-zinc-500 shrink-0">[{l.time}]</span>
            <span className="text-zinc-200 leading-snug">{l.text}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
