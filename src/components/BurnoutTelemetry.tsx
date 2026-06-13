import { useEffect, useState } from "react";

export default function BurnoutTelemetry() {
  const [burnout, setBurnout] = useState(84.6);
  const [coffee, setCoffee] = useState(91.2);
  const [slack, setSlack] = useState(76.4);

  // Coffee fluctuates between 89-94 on a subtle interval
  useEffect(() => {
    const id = window.setInterval(() => {
      setCoffee(() => {
        const next = 89 + Math.random() * 5;
        return Math.round(next * 10) / 10;
      });
    }, 2400);
    return () => window.clearInterval(id);
  }, []);

  // Burnout ticks up on user activity events
  useEffect(() => {
    const bump = () => setBurnout((v) => Math.min(99.9, Math.round((v + 0.1) * 10) / 10));
    const events = [
      "drinkedin:rumor-vote",
      "drinkedin:mood-chip",
      "drinkedin:achievement",
      "drinkedin:pint-tapped",
    ];
    events.forEach((e) => window.addEventListener(e, bump));
    return () => events.forEach((e) => window.removeEventListener(e, bump));
  }, []);

  // Slack resistance drifts gently
  useEffect(() => {
    const id = window.setInterval(() => {
      setSlack((v) => {
        const delta = (Math.random() - 0.5) * 0.6;
        const next = Math.max(70, Math.min(85, v + delta));
        return Math.round(next * 10) / 10;
      });
    }, 3200);
    return () => window.clearInterval(id);
  }, []);

  const bars = [
    {
      label: "🤯 SYSTEM BURNOUT RATIO",
      value: burnout,
      barClass: "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]",
      capClass: "bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.9)]",
      textClass: "text-red-300",
    },
    {
      label: "☕ COFFEE MATRIX VELOCITY",
      value: coffee,
      barClass: "bg-amber-600 shadow-[0_0_10px_rgba(217,119,6,0.5)]",
      capClass: "bg-amber-400 shadow-[0_0_8px_rgba(217,119,6,0.9)]",
      textClass: "text-amber-300",
    },
    {
      label: "📴 SLACK RESISTANCE VELOCITY",
      value: slack,
      barClass: "bg-purple-500 shadow-[0_0_10px_rgba(168,85,247,0.5)]",
      capClass: "bg-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.9)]",
      textClass: "text-purple-300",
    },
  ];

  return (
    <div className="bg-[#0d0d0d]/80 backdrop-blur-xl border border-[#1f1f1f] rounded-2xl p-4 shadow-xl mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] font-bold tracking-[0.22em] text-white/45 uppercase">
          📊 Core Workspace Telemetry // Live
        </h3>
        <span className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-emerald-400/80 font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Streaming
        </span>
      </div>

      <div className="space-y-3">
        {bars.map((b) => (
          <div key={b.label}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10.5px] font-semibold tracking-wider text-white/75">
                {b.label}
              </span>
              <span
                className={`text-[11px] font-mono font-bold tabular-nums transition-all duration-500 ${b.textClass}`}
              >
                {b.value.toFixed(1)}%
              </span>
            </div>
            <div className="relative h-1.5 w-full rounded-full bg-white/[0.05] overflow-visible">
              <div
                className={`h-full rounded-full transition-all duration-500 ${b.barClass}`}
                style={{ width: `${Math.min(100, b.value)}%` }}
              />
              <span
                className={`absolute top-1/2 -translate-y-1/2 w-2 h-2 rounded-full animate-pulse ${b.capClass}`}
                style={{
                  left: `calc(${Math.min(100, b.value)}% - 4px)`,
                  transition: "left 500ms ease-out",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
