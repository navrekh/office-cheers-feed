import { useState } from "react";
import { toast } from "sonner";

const DESTINATIONS = [
  { key: "svy", label: "Silicon Valley (The RSU Golden Cage)", short: "Silicon Valley" },
  { key: "ldn", label: "London Fintech (The Tube & Rain Protocol)", short: "London Fintech" },
  { key: "eu", label: "Amsterdam / Berlin (The 30% Tax Free Haven)", short: "Amsterdam/Berlin" },
  { key: "sgp", label: "Singapore (The High-Velocity Cleanroom)", short: "Singapore" },
];

const STACKS = [
  { key: "legacy", label: "Legacy Java & COBOL (Ancient Archaeologist)", short: "Legacy Java/COBOL", base: 64 },
  { key: "react", label: "React / Next.js / Tailwind (The Aesthetic Shifter)", short: "React/Next.js", base: 76 },
  { key: "ai", label: "Python / PyTorch / CUDA (The Hype-Train Rider)", short: "Python/CUDA", base: 88 },
  { key: "cloud", label: "Cloud Infrastructure & K8s (The Server Martyr)", short: "K8s/Cloud", base: 82 },
];

const VERDICTS: Record<string, (dest: string) => string> = {
  legacy: (d) =>
    `⚠️ VERDICT: Your COBOL armor reads as "fossilized but irreplaceable" to ${d} mesh nodes. Recruiters are circling, but your bank's three-decade migration backlog is throttling your visa packet by 41%. Compile silently and slip out during the maintenance window.`,
  react: (d) =>
    `⚠️ VERDICT: Your React/Tailwind stack triggered an aesthetic-shifter alert across ${d} hiring radars. However, your manager's "just one more design review" Slack pings are introducing a 28% latency on your relocation pipeline. Ship the portfolio, ghost the standup.`,
  ai: (d) =>
    `⚠️ VERDICT: Your Python/CUDA stack has triggered high interest from ${d} mesh nodes. However, your manager's weekend micro-management protocols are currently introducing a 32% latency delay to your visa authorization. Clear your cache and apply stealthily.`,
  cloud: (d) =>
    `⚠️ VERDICT: Your K8s/cloud telemetry is pinging ${d} infra teams in real time. Unfortunately the 3 AM PagerDuty rotation has degraded your sleep cycle by 47%, jeopardizing the interview loop. Drain the node, take PTO, escape.`,
};

type EscapeMetrics = {
  score: number;
  destShort: string;
  stackShort: string;
  verdict: string;
};

export default function GlobalEscapeSimulator() {
  const [destKey, setDestKey] = useState<string>(DESTINATIONS[0].key);
  const [stackKey, setStackKey] = useState<string>(STACKS[0].key);
  const [escapeMetrics, setEscapeMetrics] = useState<EscapeMetrics | null>(null);
  const [copied, setCopied] = useState(false);

  function calculate() {
    const dest = DESTINATIONS.find((d) => d.key === destKey)!;
    const stack = STACKS.find((s) => s.key === stackKey)!;
    const jitter = Math.floor(Math.random() * 10) - 4;
    const score = Math.max(62, Math.min(94, stack.base + jitter));
    setEscapeMetrics({
      score,
      destShort: dest.short,
      stackShort: stack.short,
      verdict: VERDICTS[stack.key](dest.short),
    });
    setCopied(false);
  }

  function share() {
    if (!escapeMetrics) return;
    const payload = `✈️ VISA MATRIX BREAKOUT: I just calculated a ${escapeMetrics.score}% Escape Velocity to ${escapeMetrics.destShort} using my ${escapeMetrics.stackShort} armor on the DrinkedIn global terminal. Test your relocation runtime and plan your escape route here: https://drinkedin.me`;
    const done = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      toast("📋 Passport leak copied — drop it in the engineering channel.", { duration: 2400 });
    };
    try {
      navigator.clipboard.writeText(payload).then(done).catch(done);
    } catch {
      done();
    }
  }

  const selectCls =
    "w-full bg-black/60 border border-emerald-900/40 rounded-lg px-2.5 py-2 text-[12px] text-emerald-100 font-mono focus:outline-none focus:border-emerald-400/60 transition-colors";

  return (
    <div className="bg-[#0d0d0d]/90 backdrop-blur-xl border border-emerald-950/20 rounded-2xl p-4 shadow-2xl mt-4">
      <h3 className="text-[10.5px] uppercase tracking-[0.22em] font-extrabold text-emerald-300 mb-3 drop-shadow-[0_0_8px_rgba(16,185,129,0.55)]">
        ✈️ GLOBAL ESCAPE ROUTE SIMULATOR
      </h3>

      <div className="space-y-2.5">
        <div>
          <label className="block text-[9px] uppercase tracking-wider font-bold text-emerald-200/70 mb-1">
            Target Destination Hub
          </label>
          <select className={selectCls} value={destKey} onChange={(e) => setDestKey(e.target.value)}>
            {DESTINATIONS.map((d) => (
              <option key={d.key} value={d.key} className="bg-black">{d.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-[9px] uppercase tracking-wider font-bold text-emerald-200/70 mb-1">
            Current Tech Stack Armor
          </label>
          <select className={selectCls} value={stackKey} onChange={(e) => setStackKey(e.target.value)}>
            {STACKS.map((s) => (
              <option key={s.key} value={s.key} className="bg-black">{s.label}</option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={calculate}
          className="w-full mt-1 px-3 py-2 rounded-lg text-[11.5px] font-extrabold uppercase tracking-wider border border-emerald-400/50 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 hover:border-emerald-300 transition-all shadow-[0_0_18px_rgba(16,185,129,0.25)]"
        >
          🏁 Calculate Cross-Border Escape Velocity
        </button>
      </div>

      {escapeMetrics && (
        <div className="mt-4 rounded-xl border border-emerald-400/25 bg-emerald-500/[0.05] p-3 animate-fade-in transition-all duration-500">
          <div className="flex items-baseline justify-between">
            <span className="text-[9px] uppercase tracking-widest font-bold text-emerald-200/70">
              Escape Velocity
            </span>
            <span className="text-[28px] font-black text-emerald-300 leading-none drop-shadow-[0_0_12px_rgba(16,185,129,0.65)] tabular-nums transition-all duration-500">
              {escapeMetrics.score}%
            </span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-black/60 overflow-hidden border border-emerald-900/40">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-300 transition-all duration-700"
              style={{ width: `${escapeMetrics.score}%` }}
            />
          </div>
          <p className="mt-2.5 text-[11.5px] leading-snug text-emerald-50/90">{escapeMetrics.verdict}</p>

          <button
            type="button"
            onClick={share}
            className={`mt-3 w-full px-2.5 py-1.5 rounded-lg text-[10.5px] font-bold uppercase tracking-wider border transition-all ${
              copied
                ? "border-emerald-300 bg-emerald-500/25 text-emerald-100"
                : "border-emerald-400/40 bg-black/40 text-emerald-200 hover:bg-emerald-500/15 hover:border-emerald-300/70"
            }`}
          >
            {copied ? "✅ Passport Packaged!" : "🔗 Package Passport Leak"}
          </button>
        </div>
      )}
    </div>
  );
}
