import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShieldCheck, Users, TrendingUp } from "lucide-react";
import type { Profile } from "@/lib/useProfile";
import { isRlsDenied, RLS_DENIED_MESSAGE } from "@/lib/useProfile";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  profile: Profile;
  onSaved?: (next: Profile) => void;
};

export default function MerchantAdDashboard({ open, onOpenChange, profile, onSaved }: Props) {
  const [pubName, setPubName] = useState(profile.pub_name ?? "");
  const [deal, setDeal] = useState(profile.flash_deal_text ?? "");
  const [mapUrl, setMapUrl] = useState(profile.map_query_address ?? "");
  const [website, setWebsite] = useState(profile.merchant_website ?? "");
  const [saving, setSaving] = useState(false);
  const [clickCount, setClickCount] = useState<number | null>(null);
  const [today, setToday] = useState<number | null>(null);

  useEffect(() => {
    if (!open) return;
    setPubName(profile.pub_name ?? "");
    setDeal(profile.flash_deal_text ?? "");
    setMapUrl(profile.map_query_address ?? "");
    setWebsite(profile.merchant_website ?? "");
  }, [open, profile]);

  useEffect(() => {
    if (!open || !profile.pub_name) return;
    let cancelled = false;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    (async () => {
      const total = await (supabase as any)
        .from("merchant_clicks")
        .select("id", { count: "exact", head: true })
        .ilike("pub_id", profile.pub_name as string);
      const todayQ = await (supabase as any)
        .from("merchant_clicks")
        .select("id", { count: "exact", head: true })
        .ilike("pub_id", profile.pub_name as string)
        .gte("created_at", startOfDay.toISOString());
      if (cancelled) return;
      setClickCount(total.count ?? 0);
      setToday(todayQ.count ?? 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, profile.pub_name]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (saving) return;
    setSaving(true);
    const patch = {
      pub_name: pubName.trim() || null,
      flash_deal_text: deal.trim() || null,
      map_query_address: mapUrl.trim() || null,
      merchant_website: website.trim() || null,
    };
    const { data, error } = await (supabase as any)
      .from("profiles")
      .update(patch)
      .eq("id", profile.id)
      .select()
      .single();
    setSaving(false);
    if (error) {
      if (isRlsDenied(error)) {
        toast.error(RLS_DENIED_MESSAGE);
      } else {
        toast.error("Couldn't save your dashboard. Try again in a sec.");
      }
      return;
    }
    toast.success("Live ad slot updated 🛡️");
    onSaved?.(data as Profile);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-amber-400/40">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-amber-300" />
            Merchant Ad Dashboard
          </DialogTitle>
          <DialogDescription>
            Live controls for your Verified Watering Hole slot.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="rounded-md border border-amber-400/30 bg-amber-500/10 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-amber-200/80 font-bold">
              <Users className="size-3" /> Total "Heading There" clicks
            </div>
            <div className="text-2xl font-extrabold text-amber-100 mt-1">
              {clickCount ?? "—"}
            </div>
          </div>
          <div className="rounded-md border border-emerald-400/30 bg-emerald-500/10 p-3">
            <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider text-emerald-200/80 font-bold">
              <TrendingUp className="size-3" /> Today
            </div>
            <div className="text-2xl font-extrabold text-emerald-100 mt-1">
              {today ?? "—"}
            </div>
          </div>
        </div>

        <form onSubmit={save} className="space-y-2.5">
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Pub Name
            </label>
            <Input
              value={pubName}
              onChange={(e) => setPubName(e.target.value)}
              placeholder="Independence Brewing Co."
              maxLength={120}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Flash Deal Ticker
            </label>
            <Textarea
              value={deal}
              onChange={(e) => setDeal(e.target.value)}
              placeholder="2-for-1 craft pints, 6–9 PM tonight only"
              maxLength={240}
              rows={3}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Google Maps Link / Address
            </label>
            <Input
              value={mapUrl}
              onChange={(e) => setMapUrl(e.target.value)}
              placeholder="https://maps.google.com/?q=..."
              maxLength={500}
            />
          </div>
          <div>
            <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
              Website
            </label>
            <Input
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://your-pub.com"
              maxLength={500}
            />
          </div>
          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold"
          >
            {saving ? "Saving…" : "Save Live Ad Slot"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
