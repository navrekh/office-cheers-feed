import { useEffect, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { trackEngagement } from "@/lib/analytics";

/**
 * Floating "🚨 PANIC: Boss Coming!" FAB anchored to the bottom-right of the
 * viewport. Tapping it slams a full-screen fake DevOps / corporate camouflage
 * dashboard over the entire app. Double-click anywhere on the camo layer (or
 * tap the tiny translucent escape dot in the top-right) restores the radar.
 */
export default function PanicButton() {
  const [camo, setCamo] = useState(false);

  // ESC also exits camo for keyboard users.
  useEffect(() => {
    if (!camo) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") deactivate();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [camo]);

  function activate() {
    setCamo(true);
    trackEngagement("panic_camouflage_activate", { ts: Date.now() });
  }

  function deactivate() {
    setCamo(false);
    trackEngagement("panic_camouflage_deactivate", { ts: Date.now() });
    toast.success(
      "Crisis averted. Your manager thinks you are deep in a Kubernetes deployment.",
      { description: "Back to the radar! 🤫🍻", duration: 5000 },
    );
  }

  return (
    <>
      {!camo && (
        <button
          type="button"
          onClick={activate}
          aria-label="Panic button — activate corporate camouflage"
          className="fixed bottom-4 right-4 z-[90] inline-flex items-center gap-2 px-3.5 h-11 rounded-full text-[12px] font-black uppercase tracking-wider text-white shadow-[0_0_28px_rgba(220,38,38,0.7)] border border-red-300/40 bg-gradient-to-r from-red-600 via-red-500 to-red-600 hover:brightness-110 active:scale-95 transition animate-pulse"
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          <ShieldAlert className="size-4" />
          🚨 PANIC: Boss Coming!
        </button>
      )}

      {camo && <CamouflageLayer onExit={deactivate} />}
    </>
  );
}

/* -------------------- Corporate Camouflage Overlay -------------------- */
function CamouflageLayer({ onExit }: { onExit: () => void }) {
  const [now, setNow] = useState<string>("");
  useEffect(() => {
    function tick() {
      setNow(new Date().toLocaleTimeString([], { hour12: false }));
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="fixed inset-0 z-[100] bg-[#f4f5f7] text-[#1f2937] overflow-auto select-text animate-fade-in"
      onDoubleClick={onExit}
      role="dialog"
      aria-label="Q2 Cross-Functional Cloud Infrastructure Architecture Realignment Metrics"
    >
      {/* Enterprise header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-[1400px] mx-auto px-5 h-12 flex items-center gap-4">
          <div className="flex items-center gap-2 text-[13px] font-bold text-slate-700">
            <div className="size-6 rounded bg-[#0a66c2] grid place-items-center text-white text-[11px] font-black">CI</div>
            <span>CloudIntelliOps · Pipeline Stability Console</span>
          </div>
          <nav className="hidden md:flex items-center gap-4 text-[11.5px] text-slate-500">
            <span className="font-semibold text-slate-700">Overview</span>
            <span>Deployments</span>
            <span>Incidents</span>
            <span>Cost Allocation</span>
            <span>Compliance (SOC 2)</span>
            <span>Quarterly Realignment</span>
          </nav>
          <div className="ml-auto flex items-center gap-3 text-[11px] text-slate-500 font-mono">
            <span>Env: prod-eu-west-1</span>
            <span>·</span>
            <span>UTC {now}</span>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onExit(); }}
              title="Exit (or double-click anywhere)"
              aria-label="Exit camouflage"
              className="size-3 rounded-full bg-slate-300/60 hover:bg-slate-400 transition"
            />
          </div>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-5 py-6 space-y-5">
        <div className="flex items-baseline justify-between">
          <h1 className="text-[18px] font-bold text-slate-800">
            Q2 Cross-Functional Cloud Infrastructure Architecture Realignment Metrics
          </h1>
          <span className="text-[11px] text-slate-500 font-mono">Last sync: {now}</span>
        </div>

        {/* KPI tiles */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiTile label="System Pipeline Stability" value="99.83%" trend="+0.04%" />
          <KpiTile label="P95 Deploy Latency" value="412 ms" trend="-3.1%" />
          <KpiTile label="Error Budget Remaining" value="86.2%" trend="+1.2%" />
          <KpiTile label="MTTR (Rolling 30d)" value="14m 22s" trend="-9.4%" />
        </div>

        {/* Graphs */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Panel title="Cluster Health · us-east-1" subtitle="99.8% System Pipeline Stability">
            <UptimeChart hue={148} />
          </Panel>
          <Panel title="Cluster Health · eu-west-1" subtitle="99.7% System Pipeline Stability">
            <UptimeChart hue={148} variant={1} />
          </Panel>
          <Panel title="Cluster Health · ap-south-1" subtitle="99.9% System Pipeline Stability">
            <UptimeChart hue={148} variant={2} />
          </Panel>
        </div>

        {/* Spreadsheet */}
        <section className="bg-white border border-slate-200 rounded-md overflow-hidden">
          <div className="px-4 h-10 flex items-center justify-between border-b border-slate-200 bg-slate-50">
            <div className="text-[12px] font-bold text-slate-700">Resource Allocation Matrix · Sheet1</div>
            <div className="text-[10.5px] text-slate-500 font-mono">42 rows · CSV export ready</div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-[11.5px] tabular-nums">
              <thead className="bg-slate-100 text-slate-600">
                <tr>
                  {["Workload ID","Cost Center","Region","vCPU","Mem (GiB)","Uptime","SLO","Owner"].map((h) => (
                    <th key={h} className="text-left font-semibold px-3 py-1.5 border-b border-slate-200">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r, i) => (
                  <tr key={r.id} className={i % 2 ? "bg-slate-50/60" : "bg-white"}>
                    <td className="px-3 py-1.5 border-b border-slate-100 font-mono text-slate-700">{r.id}</td>
                    <td className="px-3 py-1.5 border-b border-slate-100">{r.cc}</td>
                    <td className="px-3 py-1.5 border-b border-slate-100">{r.region}</td>
                    <td className="px-3 py-1.5 border-b border-slate-100">{r.vcpu}</td>
                    <td className="px-3 py-1.5 border-b border-slate-100">{r.mem}</td>
                    <td className="px-3 py-1.5 border-b border-slate-100 text-emerald-700 font-semibold">{r.uptime}</td>
                    <td className="px-3 py-1.5 border-b border-slate-100">{r.slo}</td>
                    <td className="px-3 py-1.5 border-b border-slate-100 text-slate-600">{r.owner}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <p className="text-[10.5px] text-slate-400 text-center py-4">
          Confidential · Internal use only · Generated by CloudIntelliOps Pipeline Engine v4.2.1
        </p>
      </main>

      {/* Hidden escape hatch — translucent dot, double-click also works anywhere. */}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onExit(); }}
        title="Exit camouflage"
        aria-label="Exit camouflage"
        className="fixed bottom-3 right-3 z-[110] size-3 rounded-full bg-slate-400/30 hover:bg-slate-500/60 transition"
      />
    </div>
  );
}

function KpiTile({ label, value, trend }: { label: string; value: string; trend: string }) {
  const up = trend.startsWith("+");
  return (
    <div className="bg-white border border-slate-200 rounded-md p-3">
      <div className="text-[10.5px] uppercase tracking-wider text-slate-500 font-semibold">{label}</div>
      <div className="text-[22px] font-bold text-slate-800 mt-0.5 tabular-nums">{value}</div>
      <div className={`text-[10.5px] font-mono mt-0.5 ${up ? "text-emerald-600" : "text-rose-600"}`}>
        {trend} vs last sprint
      </div>
    </div>
  );
}

function Panel({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-slate-200 rounded-md p-3">
      <div className="flex items-center justify-between mb-2">
        <div>
          <div className="text-[12px] font-bold text-slate-800">{title}</div>
          <div className="text-[10.5px] text-slate-500">{subtitle}</div>
        </div>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700">
          <span className="size-1.5 rounded-full bg-emerald-500" /> Healthy
        </span>
      </div>
      {children}
    </div>
  );
}

function UptimeChart({ hue = 148, variant = 0 }: { hue?: number; variant?: number }) {
  const W = 320, H = 90;
  const base = [
    [62,66,70,68,74,72,78,80,76,82,84,80,86,88,84,90,88,92,90,94],
    [70,72,68,76,78,74,80,82,84,80,86,88,82,84,88,90,86,92,94,90],
    [80,78,82,80,84,86,84,88,86,90,88,92,90,94,92,96,94,92,96,94],
  ][variant];
  const stepX = W / (base.length - 1);
  const path = base.map((y, i) => `${i === 0 ? "M" : "L"} ${(i * stepX).toFixed(1)} ${(H - (y / 100) * (H - 8) - 4).toFixed(1)}`).join(" ");
  const area = `${path} L ${W} ${H} L 0 ${H} Z`;
  const stroke = `hsl(${hue} 65% 38%)`;
  const fill = `hsl(${hue} 70% 55% / 0.18)`;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none" aria-hidden>
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1="0" x2={W} y1={H * g} y2={H * g} stroke="rgba(0,0,0,0.06)" strokeDasharray="2 4" />
      ))}
      <path d={area} fill={fill} />
      <path d={path} fill="none" stroke={stroke} strokeWidth="1.6" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

const ROWS = [
  { id: "WL-001", cc: "CC-4421 · Platform", region: "us-east-1", vcpu: 128, mem: 512, uptime: "99.92%", slo: "Tier 1", owner: "i.mehta@acme" },
  { id: "WL-002", cc: "CC-4421 · Platform", region: "eu-west-1", vcpu: 96, mem: 384, uptime: "99.88%", slo: "Tier 1", owner: "r.kapoor@acme" },
  { id: "WL-003", cc: "CC-5512 · Data", region: "ap-south-1", vcpu: 64, mem: 256, uptime: "99.81%", slo: "Tier 2", owner: "s.patel@acme" },
  { id: "WL-004", cc: "CC-5512 · Data", region: "us-east-1", vcpu: 32, mem: 128, uptime: "99.74%", slo: "Tier 2", owner: "n.iyer@acme" },
  { id: "WL-005", cc: "CC-6601 · Edge", region: "eu-west-1", vcpu: 16, mem: 64, uptime: "99.99%", slo: "Tier 1", owner: "k.singh@acme" },
  { id: "WL-006", cc: "CC-6601 · Edge", region: "ap-south-1", vcpu: 48, mem: 192, uptime: "99.83%", slo: "Tier 2", owner: "p.nair@acme" },
  { id: "WL-007", cc: "CC-7732 · ML", region: "us-east-1", vcpu: 256, mem: 1024, uptime: "99.71%", slo: "Tier 1", owner: "a.banerjee@acme" },
  { id: "WL-008", cc: "CC-7732 · ML", region: "eu-west-1", vcpu: 128, mem: 512, uptime: "99.79%", slo: "Tier 1", owner: "v.rao@acme" },
  { id: "WL-009", cc: "CC-8841 · Billing", region: "ap-south-1", vcpu: 16, mem: 64, uptime: "99.95%", slo: "Tier 1", owner: "h.shah@acme" },
  { id: "WL-010", cc: "CC-8841 · Billing", region: "us-east-1", vcpu: 24, mem: 96, uptime: "99.90%", slo: "Tier 1", owner: "d.gupta@acme" },
  { id: "WL-011", cc: "CC-9001 · Security", region: "eu-west-1", vcpu: 64, mem: 256, uptime: "99.97%", slo: "Tier 1", owner: "m.qureshi@acme" },
  { id: "WL-012", cc: "CC-9001 · Security", region: "ap-south-1", vcpu: 32, mem: 128, uptime: "99.86%", slo: "Tier 2", owner: "t.menon@acme" },
];
