import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Rocket, Zap, AlertTriangle, Beer } from "lucide-react";
import type { Profile } from "@/lib/useProfile";

type Props = { profile: Profile };

type DealRow = {
  id: string;
  pub_name: string;
  city: string | null;
  deal_text: string;
  urgency_level: number;
  is_active: boolean;
  activated_at?: string | null;
  expires_at?: string | null;
};

const MAX = 120;

const URGENCY = [
  { v: 1, label: "Standard Deal", emoji: "🍺", icon: Beer,
    cls: "border-amber-400/40 data-[on=true]:bg-amber-500/20 data-[on=true]:border-amber-300" },
  { v: 2, label: "Rain / Clock-Out", emoji: "⚡", icon: Zap,
    cls: "border-sky-400/40 data-[on=true]:bg-sky-500/20 data-[on=true]:border-sky-300" },
  { v: 3, label: "Emergency Outage!", emoji: "🚨", icon: AlertTriangle,
    cls: "border-red-400/50 data-[on=true]:bg-red-500/20 data-[on=true]:border-red-300 data-[on=true]:animate-pulse" },
] as const;

export default function MerchantFlashControl({ profile }: Props) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [row, setRow] = useState<DealRow | null>(null);
  const [text, setText] = useState("");
  const [urgency, setUrgency] = useState<number>(1);
  const [justDeployed, setJustDeployed] = useState(false);

  const pubName = profile.pub_name?.trim() || "";

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (!pubName) {
          if (!cancelled) { setRow(null); setText(profile.flash_deal_text ?? ""); }
          return;
        }
        const { data } = await (supabase as any)
          .from("merchant_deals")
          .select("*")
          .ilike("pub_name", pubName)
          .order("updated_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        if (cancelled) return;
        if (data) {
          setRow(data as DealRow);
          setText((data as DealRow).deal_text ?? "");
          setUrgency((data as DealRow).urgency_level ?? 1);
        } else {
          setRow(null);
          setText(profile.flash_deal_text ?? "");
        }
      } catch {
        /* offline-safe */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [pubName, profile.flash_deal_text]);

  const trimmed = text.trim();
  const tooLong = trimmed.length > MAX;
  const expired =
    !!row?.expires_at && new Date(row.expires_at).getTime() <= Date.now();
  const canSubmit = !!trimmed && !tooLong && !saving && !loading && !expired;

  const counterTone = useMemo(() => {
    if (tooLong) return "text-red-300";
    if (trimmed.length > MAX - 20) return "text-amber-300";
    return "text-muted-foreground";
  }, [trimmed.length, tooLong]);

  async function deploy() {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload = {
        pub_name: pubName || "Verified Pub",
        city: (profile as any).city ?? null,
        deal_text: trimmed,
        urgency_level: urgency,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      let res;
      if (row?.id) {
        res = await (supabase as any)
          .from("merchant_deals")
          .update(payload)
          .eq("id", row.id)
          .select()
          .single();
      } else {
        res = await (supabase as any)
          .from("merchant_deals")
          .insert(payload)
          .select()
          .single();
      }
      if (res.error) throw res.error;
      setRow(res.data as DealRow);
      setJustDeployed(true);
      setTimeout(() => setJustDeployed(false), 2200);
      toast.success("Deal Dispatched to Local Feeds! 🔥", {
        description: "All open browsers are recalculating priority right now.",
      });
    } catch (e: any) {
      toast.error("Couldn't deploy your deal", {
        description: e?.message ?? "Try again in a sec.",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="p-4 border-red-400/40 bg-gradient-to-br from-red-500/10 via-amber-500/5 to-card relative overflow-hidden shadow-[0_0_30px_rgba(239,68,68,0.12)]">
      <div className="absolute -top-10 -right-10 size-32 bg-red-500/15 rounded-full blur-3xl pointer-events-none" />

      <div className="flex items-center gap-2 mb-1 relative">
        <span className="text-base">🚨</span>
        <h4 className="font-bold text-sm tracking-tight">Live Flash Deal Control</h4>
      </div>
      <p className="text-[10px] text-muted-foreground/80 mb-3 relative">
        Push instantly to every active tab in your city.
      </p>

      {loading ? (
        <div className="space-y-2 relative">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : (
        <div className="space-y-3 relative">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1">
              Your Broadcast Deal
            </label>
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Server down? Bring your terminal screen for a free pint!"
              rows={3}
              maxLength={MAX + 40}
              disabled={saving}
              className="text-[12px] resize-none bg-background/60"
            />
            <div className="flex items-center justify-between mt-1">
              <span className="text-[10px] text-muted-foreground/70">
                Live-broadcasts to all open tabs
              </span>
              <span className={`text-[10px] font-mono tabular-nums ${counterTone}`}>
                {trimmed.length}/{MAX}
              </span>
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
              Urgency Boost
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {URGENCY.map((opt) => {
                const on = urgency === opt.v;
                const Icon = opt.icon;
                return (
                  <button
                    key={opt.v}
                    type="button"
                    data-on={on}
                    onClick={() => setUrgency(opt.v)}
                    disabled={saving}
                    className={`rounded-md border px-1.5 py-2 text-[10px] font-semibold leading-tight transition flex flex-col items-center gap-1 ${opt.cls}`}
                    title={`Level ${opt.v}`}
                  >
                    <Icon className="size-3.5" />
                    <span>{opt.emoji}</span>
                    <span className="text-[9px] opacity-90 text-center">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <Button
            type="button"
            onClick={deploy}
            disabled={!canSubmit}
            className={`w-full font-bold text-[12px] h-9 transition ${
              justDeployed
                ? "bg-emerald-500 hover:bg-emerald-500 text-emerald-950"
                : "bg-gradient-to-r from-red-500 via-amber-500 to-red-500 hover:brightness-110 text-amber-950 shadow-[0_0_22px_rgba(251,146,60,0.55)]"
            }`}
          >
            <Rocket className="size-3.5 mr-1.5" />
            {saving
              ? "Dispatching…"
              : justDeployed
              ? "Deal Dispatched! 🔥"
              : "Deploy Live Flash Update 🚀"}
          </Button>

          {!pubName && (
            <p className="text-[10px] text-amber-300/90 leading-snug">
              Tip: set your Pub Name in the Merchant Ad Dashboard so the deal
              lands in the right city feed.
            </p>
          )}
        </div>
      )}
    </Card>
  );
}
