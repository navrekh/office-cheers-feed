import { useState } from "react";
import { Users, UserPlus, Check, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { initials } from "@/lib/randomIdentity";

const BAR_HOP_PROFILES = [
  { name: "Jamie O'Donnell", title: "Scrum Master | Open to Drinks", mutual: "12 mutual liver casualties" },
  { name: "Priya Kapoor", title: "Director of Synergy | 4x Hangover Survivor", mutual: "8 mutual standups skipped" },
  { name: "Marcus Trent", title: "Growth Hacker | Specializing in Vodka-Sodas & A/B Tests", mutual: "21 mutual happy hours" },
  { name: "Sam Whittaker", title: "Product Manager | I ship features and shots", mutual: "5 mutual all-hands naps" },
  { name: "Lena Park", title: "DevOps Engineer | CI/CD = Cocktails In, Drinks Continuously", mutual: "17 mutual incidents" },
  { name: "Casey Rivers", title: "Chief People & Pints Officer | We hire vibes", mutual: "3 mutual offsites" },
];

export default function BarHopView() {
  const [statuses, setStatuses] = useState<Record<string, "idle" | "pending" | "connected">>({});

  function connect(name: string) {
    setStatuses((s) => ({ ...s, [name]: "pending" }));
    setTimeout(() => {
      setStatuses((s) => ({ ...s, [name]: "connected" }));
    }, 1200);
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      <Card className="p-5 border-border bg-gradient-to-br from-card via-card to-accent/5">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-accent/20 grid place-items-center text-accent">
            <Users className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Bar Hop · Network</h2>
            <p className="text-xs text-muted-foreground">
              People who are professionally pretending to be sober. Same as you.
            </p>
          </div>
        </div>
      </Card>

      <Card className="border-border divide-y divide-border">
        {BAR_HOP_PROFILES.map((p) => {
          const status = statuses[p.name] ?? "idle";
          return (
            <div key={p.name} className="p-4 flex items-center gap-3">
              <div className="size-12 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 grid place-items-center font-bold text-base shrink-0">
                {initials(p.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[15px] leading-tight truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">{p.title}</div>
                <div className="text-[11px] text-muted-foreground/80 mt-0.5">{p.mutual}</div>
              </div>
              <Button
                size="sm"
                variant={status === "idle" ? "default" : status === "pending" ? "secondary" : "outline"}
                disabled={status !== "idle"}
                onClick={() => connect(p.name)}
                className="rounded-full h-8 px-4 font-semibold shrink-0 min-w-[160px]"
              >
                {status === "idle" && (<><UserPlus className="size-3.5 mr-1.5" /> Connect</>)}
                {status === "pending" && (<><Clock className="size-3.5 mr-1.5 animate-spin" /> Pending Recovery…</>)}
                {status === "connected" && (<><Check className="size-3.5 mr-1.5 text-primary" /> Drinks Confirmed</>)}
              </Button>
            </div>
          );
        })}
      </Card>
    </div>
  );
}
