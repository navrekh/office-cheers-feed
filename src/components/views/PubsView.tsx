import { lazy, Suspense, useEffect, useState } from "react";
import { Beer, MapPin, Navigation, ShieldCheck, ExternalLink, Users as UsersIcon } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CITIES,
  MERCHANTS,
  getSelectedCity,
  subscribeCity,
  mapsDirectionsUrl,
  type CityKey,
  type Merchant,
} from "@/lib/cityStore";
import VerifiedWateringHole from "@/components/VerifiedWateringHole";

const BarLocator = lazy(() => import("@/components/BarLocator"));

export default function PubsView({
  requireAuth,
  profile,
  userId,
  onProfileUpdated,
}: {
  requireAuth: (reason?: string) => boolean;
  profile: import("@/lib/useProfile").Profile | null;
  userId: string | null;
  onProfileUpdated: () => void;
}) {
  const [selectedCity, setSelectedCityLocal] = useState<CityKey>("Bangalore");
  useEffect(() => {
    setSelectedCityLocal(getSelectedCity());
    return subscribeCity(setSelectedCityLocal);
  }, []);

  const merchants = MERCHANTS[selectedCity] ?? [];

  const [heading, setHeading] = useState<Record<string, { date: string; extra: number; mine: boolean }>>({});
  useEffect(() => {
    try {
      setHeading(JSON.parse(localStorage.getItem("drinkedin.headingThere.v1") || "{}"));
    } catch {}
  }, [selectedCity]);

  const today = new Date().toISOString().slice(0, 10);

  function checkIn(m: Merchant) {
    if (!requireAuth("1-click Google Sign-In locks your spot on tonight's group reward list.")) return;
    const state = heading[m.id];
    const alreadyChecked = state && state.date === today && state.mine === true;
    if (alreadyChecked) {
      toast("You're already on the list for tonight 🍻", {
        description: "Come back tomorrow to check in again.",
      });
      return;
    }
    const nextExtra = (state?.date === today ? state.extra : 0) + 1;
    const next = {
      ...heading,
      [m.id]: { date: today, extra: nextExtra, mine: true },
    };
    setHeading(next);
    try { localStorage.setItem("drinkedin.headingThere.v1", JSON.stringify(next)); } catch {}
    if (nextExtra >= 10) {
      toast.success(`🎯 Target Hit! 10 techies are heading to ${m.name}`, {
        description: "Live heat-map data is being routed to their management right now to unlock an exclusive DrinkedIn corporate discount code for tonight!",
        duration: 7000,
      });
    } else {
      toast.success(`You're heading to ${m.name} 🍻 — ${10 - nextExtra} more to unlock the group reward!`);
    }
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      <VerifiedWateringHole
        onRequireAuth={() => requireAuth("Sign in before sponsoring a slot — keeps merchant leads verified.")}
        profile={profile}
        userId={userId}
        onProfileUpdated={onProfileUpdated}
      />

      <Card className="p-5 border-amber-400/30 bg-gradient-to-br from-amber-950/30 via-card to-card">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-amber-500/20 grid place-items-center text-amber-300">
            <Beer className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold leading-tight">
              Trending Neighborhood Watering Holes
            </h2>
            <p className="text-xs text-muted-foreground">
              Live in <span className="text-amber-300 font-semibold">{selectedCity}</span> — change your tech hub from the top ticker.
            </p>
          </div>
          <select
            aria-label="Filter by city"
            value={selectedCity}
            onChange={(e) => {
              const next = e.target.value as CityKey;
              import("@/lib/cityStore").then((m) => m.setSelectedCity(next));
              import("@/lib/analytics").then((m) =>
                m.trackEngagement("city_sector_change", { city: next, surface: "trending" })
              );
            }}
            className="hidden sm:block h-8 text-xs bg-muted/40 border border-border rounded-md px-2 cursor-pointer hover:border-amber-400/50"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {merchants.map((m) => {
          const state = heading[m.id];
          const extra = state && state.date === today ? state.extra : 0;
          const count = m.base_heading + extra;
          const checked = !!state && state.date === today && state.mine === true;
          return (
            <Card
              key={m.id}
              className="p-4 border-amber-400/40 bg-gradient-to-br from-amber-950/25 via-card to-card hover:border-amber-300/60 transition flex flex-col shadow-[0_0_18px_rgba(251,191,36,0.12)]"
            >
              <div className="flex items-start gap-3 mb-2">
                <div className="size-10 rounded-md bg-gradient-to-br from-amber-500/40 to-amber-300/20 grid place-items-center text-lg shrink-0">
                  🍺
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-500/15 px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider text-amber-300">
                      <ShieldCheck className="size-2.5" /> Verified
                    </span>
                  </div>
                  <h3 className="font-bold text-[15px] leading-tight text-amber-100 truncate">
                    {m.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <MapPin className="size-3" /> {m.area}
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-fuchsia-400/40 bg-gradient-to-br from-fuchsia-500/10 via-amber-500/5 to-fuchsia-500/10 p-2.5 mb-3">
                <div className="text-[10px] uppercase tracking-wider font-bold text-fuchsia-200 mb-1">
                  👥 Community Push Deal: Unlock 10% Off Group Reward
                </div>
                <p className="text-[12px] leading-snug text-foreground/90">
                  {m.deal}
                </p>
                {extra >= 10 ? (
                  <div className="mt-2 rounded border border-emerald-400/50 bg-emerald-500/15 px-2 py-1.5 text-[11px] text-emerald-100 leading-snug animate-pulse">
                    🎯 <span className="font-bold">Target Hit!</span> 10 techies are heading here. Routing live heat-map data to management to unlock tonight's exclusive DrinkedIn corporate discount code.
                  </div>
                ) : (
                  <div className="mt-2">
                    <div className="flex items-center justify-between text-[10px] text-fuchsia-100/80 mb-1">
                      <span><span className="font-bold text-fuchsia-100">{extra}</span> / 10 heading here tonight</span>
                      <span>{Math.max(0, 10 - extra)} more to unlock</span>
                    </div>
                    <div className="h-1.5 rounded-full bg-fuchsia-950/60 overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-fuchsia-400 to-amber-300 transition-all duration-500"
                        style={{ width: `${Math.min(100, (extra / 10) * 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-amber-200/90 mb-3">
                <UsersIcon className="size-3" />
                <span>
                  <span className="font-bold text-amber-100">{count}</span> tech workers here tonight
                </span>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => checkIn(m)}
                  disabled={checked}
                  className={`h-9 text-[12px] font-bold ${
                    checked
                      ? "bg-emerald-500/20 hover:bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 cursor-default"
                      : "bg-gradient-to-r from-fuchsia-500 to-amber-500 hover:brightness-110 text-amber-950"
                  }`}
                  title={checked ? "You're on tonight's list" : "1-click Google Sign-In required"}
                >
                  {checked ? "On the list ✓" : "I'm heading here 🍻"}
                </Button>

                <a
                  href={mapsDirectionsUrl(m.map_query_address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 h-9 rounded-md border border-amber-400/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-100 text-[12px] font-semibold transition"
                >
                  <Navigation className="size-3.5" /> Get Directions 📍
                </a>
              </div>

              {m.website && (
                <a
                  href={m.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center justify-center gap-1.5 h-8 rounded-md text-[11px] font-semibold text-amber-300 hover:text-amber-100 hover:underline"
                >
                  <ExternalLink className="size-3" /> Visit Website 🌐
                </a>
              )}
            </Card>
          );
        })}
      </div>

      <Suspense
        fallback={
          <Card className="p-5 border-border h-64 animate-pulse bg-gradient-to-br from-card via-card to-primary/5" />
        }
      >
        <BarLocator />
      </Suspense>
    </div>
  );
}
