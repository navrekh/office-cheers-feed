import { useEffect, useMemo, useState } from "react";
import { Megaphone, Flame } from "lucide-react";
import { getSelectedCity, subscribeCity } from "@/lib/cityStore";
import type { CityKey } from "@/lib/cityStore";
import { toast } from "sonner";

type Cluster = { name: string; pct: number; tag: string };

const COMPANY_MAP: Partial<Record<CityKey, string[]>> = {
  Bangalore: ["TCS", "Infosys", "Capgemini", "Cognizant"],
  Pune: ["TCS", "Infosys", "Capgemini", "Cognizant"],
  Hyderabad: ["TCS", "Infosys", "Capgemini", "Cognizant"],
  Gurgaon: ["TCS", "Infosys", "Capgemini", "Cognizant"],
  Mumbai: ["TCS", "Infosys", "Capgemini", "Cognizant"],
  Delhi: ["TCS", "Infosys", "Capgemini", "Cognizant"],
  "San Francisco": ["Google", "Meta", "Apple", "Netflix"],
  Austin: ["Google", "Meta", "Apple", "Netflix"],
  London: ["Barclays", "HSBC", "Stripe", "Amazon"],
  Dublin: ["Barclays", "HSBC", "Stripe", "Amazon"],
  Berlin: ["SAP", "N26", "Zalando", "Delivery Hero"],
  Amsterdam: ["ING", "Booking", "Adyen", "TomTom"],
  Paris: ["BNP Paribas", "Dassault", "Criteo", "Doctolib"],
};

const TAGS = [
  "Checked Out",
  "Escape Velocity",
  "Mentally OOO",
  "Stealth PTO",
  "Slack Ghosted",
  "Calendar Blocked",
];

function seedPct(name: string) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return 72 + (h % 24); // 72-95
}

export default function TrendingEscapeClusters() {
  const [selectedCity, setSelectedCity] = useState<CityKey>(() => getSelectedCity());
  useEffect(() => subscribeCity((c) => setSelectedCity(c)), []);

  const companies = useMemo(
    () => COMPANY_MAP[selectedCity] ?? ["Google", "Meta", "Apple", "Netflix"],
    [selectedCity]
  );

  const [clusters, setClusters] = useState<Cluster[]>(() =>
    companies.map((c: string, i: number) => ({ name: c, pct: seedPct(c), tag: TAGS[i % TAGS.length] }))
  );

  useEffect(() => {
    setClusters(companies.map((c: string, i: number) => ({ name: c, pct: seedPct(c), tag: TAGS[i % TAGS.length] })));
  }, [companies]);

  useEffect(() => {
    const id = setInterval(() => {
      setClusters((prev) =>
        prev.map((c) => {
          const delta = (Math.random() - 0.45) * 3;
          const next = Math.max(68, Math.min(98, c.pct + delta));
          return { ...c, pct: Math.round(next * 10) / 10 };
        })
      );
    }, 2200);
    return () => clearInterval(id);
  }, []);

  const top = useMemo(
    () => [...clusters].sort((a, b) => b.pct - a.pct)[0],
    [clusters]
  );

  const [flashIdx, setFlashIdx] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  const rallyCompany = async (idx: number) => {
    const boost = Math.round((0.2 + Math.random() * 0.3) * 10) / 10;
    let updatedPct = 0;
    let companyName = "";
    setClusters((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c;
        const next = Math.min(99.9, Math.round((c.pct + boost) * 10) / 10);
        updatedPct = next;
        companyName = c.name;
        return { ...c, pct: next };
      })
    );
    setFlashIdx(idx);
    window.setTimeout(() => setFlashIdx((v) => (v === idx ? null : v)), 700);

    const text = `📊 COMPASS ALERT: ${companyName} is currently tracking at ${updatedPct.toFixed(
      1
    )}% Escape Velocity on the live breakroom tracker. We are losing to the other tech parks. Hit the button, log your burnout state, and rally our sector to the top: https://drinkedin.me`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
    setCopiedIdx(idx);
    window.setTimeout(() => setCopiedIdx((v) => (v === idx ? null : v)), 1500);
    toast.success("🔥 Team rallied! You just boosted your company's escape velocity index.");
  };

  const rallyTop = async () => {
    const idx = clusters.findIndex((c) => c.name === top?.name);
    if (idx >= 0) rallyCompany(idx);
  };

  return (
    <div
      className="rounded-2xl p-5 sm:p-6"
      style={{
        background:
          "linear-gradient(135deg, rgba(168,85,247,0.10), rgba(34,211,238,0.08))",
        border: "1px solid rgba(168,85,247,0.25)",
        boxShadow: "0 10px 40px -20px rgba(168,85,247,0.5)",
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <Flame className="h-4 w-4 text-orange-400 animate-pulse" />
          <h3 className="text-sm sm:text-base font-bold tracking-tight text-foreground">
            Trending Escape Clusters{" "}
            <span className="text-xs font-normal text-muted-foreground">
              (Real-Time Activity · {selectedCity})
            </span>
          </h3>
        </div>
        <button
          onClick={rallyTop}
          className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition hover:scale-105"
          style={{
            background: "linear-gradient(135deg, #f97316, #ef4444)",
            color: "white",
            boxShadow: "0 4px 14px -2px rgba(239,68,68,0.5)",
          }}
        >
          <Megaphone className="h-3.5 w-3.5" />
          Rally My Team
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {clusters.map((c, idx) => {
          const isFlashing = flashIdx === idx;
          const isCopied = copiedIdx === idx;
          return (
            <div key={c.name} className="space-y-1.5">
              <div className="flex items-center justify-between text-xs gap-2">
                <span className="font-mono font-semibold text-foreground/90 truncate">
                  {c.name}
                </span>
                <span className="font-mono tabular-nums text-cyan-300 animate-pulse">
                  {c.pct.toFixed(1)}% {c.tag}
                </span>
              </div>
              <div
                className={`h-2 rounded-full overflow-hidden transition-colors duration-300 ${
                  isFlashing ? "ring-1 ring-amber-300/70" : ""
                }`}
                style={{ background: "rgba(255,255,255,0.06)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-300 ease-out"
                  style={{
                    width: `${c.pct}%`,
                    background: isFlashing
                      ? "#fbbf24"
                      : "linear-gradient(90deg, #a855f7 0%, #ec4899 50%, #f97316 100%)",
                    boxShadow: isFlashing
                      ? "0 0 14px rgba(251,191,36,0.9)"
                      : "0 0 10px rgba(236,72,153,0.6)",
                  }}
                />
              </div>
              <button
                onClick={() => rallyCompany(idx)}
                className={`mt-1 w-full text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-1 border transition-all duration-200 ${
                  isCopied
                    ? "border-emerald-400/70 bg-emerald-500/15 text-emerald-200"
                    : "border-amber-400/40 bg-amber-500/[0.06] text-amber-200 hover:bg-amber-500/[0.14] hover:border-amber-300/60"
                }`}
              >
                {isCopied ? "📋 Link Packaged!" : "📣 Rally My Team"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

