import { useEffect, useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { HUBS, REGIONS, detectDefaultHub } from "@/lib/hubs";
import { setSelectedCity, type CityKey } from "@/lib/cityStore";

const KEY = "drinkedin.hub.onboarded";

/** First-visit landing modal that showcases the user's nearest global tech
 *  node and lets them swap hubs with a single click. Persists onboarding to
 *  LocalStorage so it doesn't re-open on subsequent visits. */
export default function HubLandingModal() {
  const [open, setOpen] = useState(false);
  const [detected, setDetected] = useState<CityKey>("Bangalore");

  useEffect(() => {
    try {
      const seen = localStorage.getItem(KEY);
      if (seen) return;
      setDetected(detectDefaultHub());
      // Slight delay so it feels like an entry "reveal", not a popup ambush.
      const id = setTimeout(() => setOpen(true), 900);
      return () => clearTimeout(id);
    } catch { /* ignore */ }
  }, []);

  function pick(city: CityKey) {
    setSelectedCity(city);
    try {
      localStorage.setItem(KEY, "1");
      localStorage.setItem("drinkedin.hub.manualPick", "1");
    } catch { /* ignore */ }
    import("@/lib/analytics").then((m) => m.trackEngagement("hub_landing_pick", { city }));
    setOpen(false);
  }

  function skip() {
    try { localStorage.setItem(KEY, "1"); } catch { /* ignore */ }
    setOpen(false);
  }

  // Mock "live techies online" — deterministic per hub so the number doesn't
  // flicker on each render but feels lively across hubs.
  function onlineFor(city: CityKey): number {
    const seed = city.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    return 80 + (seed % 240);
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) skip(); }}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden border-border max-h-[90vh] overflow-y-auto">
        <div className="relative bg-gradient-to-br from-fuchsia-500/15 via-card to-amber-500/10 px-6 py-5 border-b border-border/60">
          <div className="absolute -top-16 -right-12 size-44 rounded-full bg-fuchsia-500/15 blur-3xl pointer-events-none" />
          <div className="text-[10px] uppercase tracking-widest text-fuchsia-300 font-bold">
            🌐 Global Tech Hub Selector
          </div>
          <h2 className="text-xl sm:text-2xl font-black mt-1 leading-tight">
            Pick your local burnout matrix.
          </h2>
          <p className="text-[12px] text-muted-foreground mt-1.5 leading-snug">
            We localized everything — chats, taprooms, leaderboards, ticker — to your nearest
            tech node. Detected:{" "}
            <span className="text-amber-300 font-semibold">✨ {detected}</span>. Switch any time
            from the header.
          </p>
        </div>

        <div className="px-5 py-4 space-y-5">
          {REGIONS.map((region) => {
            const hubs = HUBS.filter((h) => h.region === region);
            if (!hubs.length) return null;
            return (
              <div key={region}>
                <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground/90 mb-2 px-1">
                  {region}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {hubs.map((h) => {
                    const isDetected = h.city === detected;
                    const online = onlineFor(h.city);
                    return (
                      <button
                        key={h.city}
                        type="button"
                        onClick={() => pick(h.city)}
                        className={`group text-left rounded-lg border p-3 transition-all hover:scale-[1.01] hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.4)] ${
                          isDetected
                            ? "border-amber-400/70 bg-amber-400/5"
                            : "border-border/70 bg-muted/20 hover:border-primary/50"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{h.flag}</span>
                            <span className="font-bold text-sm">{h.city}</span>
                            {isDetected && (
                              <span className="text-[9px] uppercase font-bold tracking-wider bg-amber-400/20 text-amber-300 px-1.5 py-0.5 rounded">
                                Nearest
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-muted-foreground">{h.country}</span>
                        </div>
                        <div className="text-[10.5px] text-muted-foreground/90 line-clamp-2 leading-snug">
                          {h.zones.slice(0, 4).join(" · ")}
                        </div>
                        <div className="text-[10px] mt-1.5 flex items-center gap-1.5">
                          <span className="inline-block size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span className="text-emerald-300/90 font-semibold">{online}</span>
                          <span className="text-muted-foreground">techies online</span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={skip}
              className="text-[11px] text-muted-foreground hover:text-foreground underline-offset-2 hover:underline"
            >
              Skip — I'll wander
            </button>
            <button
              type="button"
              onClick={() => pick(detected)}
              className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-xs font-bold hover:bg-primary/90"
            >
              Use {detected} →
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
