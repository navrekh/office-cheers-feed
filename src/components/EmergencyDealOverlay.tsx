import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

type Burst = { id: number; deal: string; pub: string };

const PARTICLES = ["🍺", "⚡", "🍻", "💥", "🟡", "🟠"];

export default function EmergencyDealOverlay() {
  const [bursts, setBursts] = useState<Burst[]>([]);

  useEffect(() => {
    const seen = new Set<string>();
    const channel = supabase
      .channel("public:merchant_deals:emergency")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "merchant_deals" },
        (payload: any) => {
          const next = payload.new ?? {};
          const prev = payload.old ?? {};
          if (next.urgency_level !== 3) return;
          if (next.is_active === false) return;
          // De-dupe: only burst once per (id + activated_at).
          const sig = `${next.id}:${next.activated_at ?? next.updated_at ?? ""}`;
          if (seen.has(sig)) return;
          // For UPDATEs, only fire when urgency was just escalated to 3.
          if (payload.eventType === "UPDATE" && prev.urgency_level === 3) return;
          seen.add(sig);

          const burst: Burst = {
            id: Date.now() + Math.random(),
            deal: next.deal_text ?? "Emergency deal!",
            pub: next.pub_name ?? "Verified Pub",
          };
          setBursts((b) => [...b, burst]);
          setTimeout(() => {
            setBursts((b) => b.filter((x) => x.id !== burst.id));
          }, 2400);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (bursts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[200] overflow-hidden">
      {bursts.map((b) => (
        <div key={b.id} className="absolute inset-0">
          {/* Particle shower */}
          {Array.from({ length: 28 }).map((_, i) => {
            const left = Math.random() * 100;
            const delay = Math.random() * 600;
            const size = 18 + Math.random() * 18;
            const emoji = PARTICLES[i % PARTICLES.length];
            return (
              <span
                key={i}
                className="absolute"
                style={{
                  left: `${left}%`,
                  top: "-40px",
                  fontSize: size,
                  animation: `drinkedin-emergency-fall 2.2s cubic-bezier(0.22, 1, 0.36, 1) ${delay}ms forwards`,
                  textShadow: "0 0 12px rgba(251,191,36,0.85)",
                }}
              >
                {emoji}
              </span>
            );
          })}

          {/* Pinned blinking banner */}
          <div
            className="absolute left-1/2 -translate-x-1/2 top-16 max-w-md w-[92%] rounded-lg border-2 border-red-400 bg-red-950/85 backdrop-blur px-4 py-3 shadow-[0_0_50px_rgba(239,68,68,0.7)]"
            style={{ animation: "drinkedin-emergency-blink 0.55s steps(2) 4" }}
          >
            <div className="text-[10px] font-black uppercase tracking-[0.3em] text-red-300 mb-1">
              🚨 EMERGENCY OUTAGE DEAL · {b.pub}
            </div>
            <div className="text-sm font-bold text-red-50 leading-snug">
              {b.deal}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
