import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const BAR_PINS: Array<{ id: string; x: number; y: number; emoji: string; team: string; label: string; venue: string }> = [
  { id: "anchor", x: 18, y: 32, emoji: "😭", team: "Product", label: "Product Team weeping into stouts at Anchor Brewing", venue: "Anchor Brewing · Pier 17" },
  { id: "incident", x: 46, y: 58, emoji: "🚨", team: "DevOps", label: "DevOps hosting an emergency incident response post-mortem at the local pub", venue: "The Crashed Server Tavern · Midtown" },
  { id: "acq", x: 74, y: 26, emoji: "💸", team: "Sales", label: "Sales running an aggressive client-acquisition tab at a downtown cocktail lounge", venue: "Velvet Pipeline · Financial District" },
  { id: "design", x: 30, y: 72, emoji: "🎨", team: "Design", label: "Design team workshopping kerning over natural wines", venue: "Grid & Garnish · SoMa" },
  { id: "eng", x: 62, y: 80, emoji: "🧪", team: "Engineering", label: "Engineering A/B testing two IPAs against a control lager", venue: "Null Pointer Pub · Mission" },
];

export default function BarLocator() {
  const [active, setActive] = useState<typeof BAR_PINS[number] | null>(null);
  const [ripple, setRipple] = useState(0);

  return (
    <Card className="p-5 border-border bg-gradient-to-br from-card via-card to-primary/5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2">
            <span>🗺️</span> Corporate Bar Locator
          </h3>
          <p className="text-xs text-muted-foreground">
            Live-ish tracking of where tech teams are currently coping. Click a pin.
          </p>
        </div>
        <span className="text-[10px] uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
          <span className="size-1.5 rounded-full bg-primary animate-pulse" /> LIVE
        </span>
      </div>

      <div className="relative w-full aspect-[16/9] rounded-xl overflow-hidden border border-border bg-gradient-to-br from-muted/40 to-card">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 w-full h-full opacity-30">
          <defs>
            <pattern id="barlocator-grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="currentColor" strokeWidth="0.2" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#barlocator-grid)" className="text-border" />
          <path d="M0 55 Q 30 40, 55 60 T 100 50" strokeWidth="0.6" fill="none" className="stroke-primary/40" />
          <path d="M20 0 L 35 100" strokeWidth="0.4" fill="none" className="stroke-accent/30" />
          <path d="M80 0 L 65 100" strokeWidth="0.4" fill="none" className="stroke-accent/30" />
        </svg>

        {BAR_PINS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => setActive(p)}
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            className="absolute -translate-x-1/2 -translate-y-1/2 group"
            aria-label={p.label}
          >
            <span className="absolute inset-0 -m-1 rounded-full bg-primary/30 animate-ping" />
            <span className="relative grid place-items-center size-9 rounded-full bg-primary text-primary-foreground text-base shadow-lg shadow-primary/30 ring-2 ring-background group-hover:scale-110 transition">
              {p.emoji}
            </span>
            <span className="absolute left-1/2 -translate-x-1/2 top-full mt-1 whitespace-nowrap text-[10px] font-semibold bg-card/90 backdrop-blur border border-border rounded px-1.5 py-0.5 text-foreground/90 opacity-0 group-hover:opacity-100 transition pointer-events-none">
              {p.team}
            </span>
          </button>
        ))}

        {active && (
          <div
            key={ripple}
            className="absolute inset-x-3 bottom-3 sm:left-auto sm:right-3 sm:max-w-sm rounded-xl border border-primary/40 bg-card/95 backdrop-blur p-4 shadow-2xl animate-fade-in"
          >
            <div className="flex items-start gap-3">
              <div className="size-10 rounded-lg bg-primary/20 text-primary grid place-items-center text-xl shrink-0">
                {active.emoji}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] uppercase tracking-wider font-bold text-primary">{active.team}</div>
                <p className="text-sm font-semibold leading-snug mt-0.5">{active.label}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{active.venue}</p>
              </div>
              <button
                onClick={() => setActive(null)}
                className="text-muted-foreground hover:text-foreground text-lg leading-none"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <Button
              size="sm"
              className="w-full mt-3 rounded-full font-semibold"
              onClick={() => {
                setRipple((r) => r + 1);
                toast.success(`Round of Cheers sent to ${active.team} 🍻`, {
                  description: `${active.venue} just lit up.`,
                });
              }}
            >
              Send a round of Cheers 🍻
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
