import { useEffect, useMemo, useState } from "react";
import { Megaphone, Flame } from "lucide-react";
import { useCityStore } from "@/lib/cityStore";
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
  const selectedCity = useCityStore((s) => s.selectedCity);
  const companies = useMemo(
    () => COMPANY_MAP[selectedCity] ?? ["Google", "Meta", "Apple", "Netflix"],
    [selectedCity]
  );

  const [clusters, setClusters] = useState<Cluster[]>(() =>
    companies.map((c, i) => ({ name: c, pct: seedPct(c), tag: TAGS[i % TAGS.length] }))
  );

  useEffect(() => {
    setClusters(companies.map((c, i) => ({ name: c, pct: seedPct(c), tag: TAGS[i % TAGS.length] })));
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

  const rally = async () => {
    const text = `${top?.name ?? "Capgemini"} is currently beating us on the DrinkedIn Escape Radar. Hit the link, vote in the burnout roulette, and let's head to the taproom early: https://drinkedin.me`;
    try {
      await navigator.clipboard.writeText(text);
      toast.success("Rally message copied — paste it in your team chat.");
    } catch {
      toast.error("Clipboard blocked — long-press to copy manually.");
    }
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
          onClick={rally}
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
        {clusters.map((c) => (
          <div key={c.name} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-mono font-semibold text-foreground/90">
                {c.name}
              </span>
              <span className="font-mono tabular-nums text-cyan-300 animate-pulse">
                {c.pct.toFixed(1)}% {c.tag}
              </span>
            </div>
            <div
              className="h-2 rounded-full overflow-hidden"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              <div
                className="h-full rounded-full transition-all duration-1000 ease-out"
                style={{
                  width: `${c.pct}%`,
                  background:
                    "linear-gradient(90deg, #a855f7 0%, #ec4899 50%, #f97316 100%)",
                  boxShadow: "0 0 10px rgba(236,72,153,0.6)",
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
