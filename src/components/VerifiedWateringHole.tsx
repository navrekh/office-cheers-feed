import { useEffect, useMemo, useState, type FormEvent } from "react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ShieldCheck, Beer, MapPin, Check, Sparkles, Users } from "lucide-react";
import {
  getSelectedCity,
  subscribeCity,
  subscribeAdPreview,
  triggerAdPreview,
  MERCHANTS,
  type CityKey,
} from "@/lib/cityStore";
import type { Profile } from "@/lib/useProfile";
import MerchantAdDashboard from "@/components/MerchantAdDashboard";

const leadSchema = z.object({
  pub_name: z.string().trim().min(1, "Pub name is required").max(120),
  city: z.string().trim().min(1, "City is required").max(80),
  contact_info: z
    .string()
    .trim()
    .min(3, "Contact info is required")
    .max(240, "Keep contact info under 240 characters"),
});

const HEADING_KEY = "drinkedin.headingThere.v1";

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

type HeadingState = Record<string, { date: string; extra: number; mine: boolean }>;

function loadHeading(): HeadingState {
  try {
    return JSON.parse(localStorage.getItem(HEADING_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveHeading(s: HeadingState) {
  try {
    localStorage.setItem(HEADING_KEY, JSON.stringify(s));
  } catch {}
}

type VerifiedProps = {
  onRequireAuth?: () => boolean;
  profile?: Profile | null;
  userId?: string | null;
  onProfileUpdated?: (p: Profile) => void;
};

export default function VerifiedWateringHole({
  onRequireAuth,
  profile = null,
  userId = null,
  onProfileUpdated,
}: VerifiedProps = {}) {
  const [merchantDashOpen, setMerchantDashOpen] = useState(false);
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pubName, setPubName] = useState("");
  const [city, setCity] = useState("");
  const [contact, setContact] = useState("");

  const [activeCity, setActiveCity] = useState<CityKey>("Bangalore");
  const [heading, setHeading] = useState<HeadingState>({});
  const [popping, setPopping] = useState(false);
  const [highlighted, setHighlighted] = useState(false);
  const [liveExtra, setLiveExtra] = useState<number>(0);

  useEffect(() => {
    setActiveCity(getSelectedCity());
    setHeading(loadHeading());
    const offCity = subscribeCity(setActiveCity);
    const offPrev = subscribeAdPreview((ms) => {
      setHighlighted(true);
      window.setTimeout(() => setHighlighted(false), ms);
    });
    return () => {
      offCity();
      offPrev();
    };
  }, []);

  const sponsored = MERCHANTS[activeCity][0];
  const today = todayStr();
  const headingKey = sponsored.id;
  const cityState = heading[headingKey];
  const alreadyChecked =
    !!cityState && cityState.date === today && cityState.mine === true;

  // Live cross-device counter from the backend merchant_clicks table
  useEffect(() => {
    let cancelled = false;
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const sinceIso = startOfDay.toISOString();

    async function refresh() {
      try {
        const { count, error } = await (supabase as any)
          .from("merchant_clicks")
          .select("id", { count: "exact", head: true })
          .eq("pub_id", sponsored.name)
          .gte("created_at", sinceIso);
        if (cancelled) return;
        if (!error && typeof count === "number") setLiveExtra(count);
      } catch (err) {
        console.warn("[DrinkedIn] heading-count refresh failed", err);
      }
    }
    setLiveExtra(0);
    void refresh();

    const channel = (supabase as any)
      .channel(`merchant-clicks-${sponsored.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "merchant_clicks", filter: `pub_id=eq.${sponsored.name}` },
        (payload: any) => {
          const created = payload?.new?.created_at as string | undefined;
          if (!created || created >= sinceIso) {
            setLiveExtra((n) => n + 1);
            setPopping(true);
            window.setTimeout(() => setPopping(false), 500);
          }
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      try { (supabase as any).removeChannel(channel); } catch {}
    };
  }, [sponsored.id, sponsored.name]);

  const headingCount = useMemo(
    () => sponsored.base_heading + liveExtra,
    [sponsored.base_heading, liveExtra]
  );

  async function handleHeadingClick() {
    if (alreadyChecked) {
      toast("You're already on the list for tonight 🍻", {
        description: "Come back tomorrow to check in again.",
      });
      return;
    }
    const next: HeadingState = {
      ...heading,
      [headingKey]: {
        date: today,
        extra: (cityState?.date === today ? cityState.extra : 0) + 1,
        mine: true,
      },
    };
    setHeading(next);
    saveHeading(next);
    setPopping(true);
    window.setTimeout(() => setPopping(false), 500);
    toast.success(`You're heading to ${sponsored.name} 🏃‍♂️🍻`);
    if (userId) {
      try {
        const { error } = await (supabase as any)
          .from("merchant_clicks")
          .insert({ pub_id: sponsored.name, user_id: userId, city: activeCity });
        if (error) throw error;
      } catch (err) {
        console.warn("[DrinkedIn] merchant click insert failed", err);
      }
    } else {
      // Anonymous preview-mode click: locally bump so the user sees feedback.
      setLiveExtra((n) => n + 1);
    }
  }

  function resetForm() {
    setPubName("");
    setCity("");
    setContact("");
    setSuccess(false);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    const parsed = leadSchema.safeParse({
      pub_name: pubName,
      city,
      contact_info: contact,
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Please check the form.");
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await (supabase as any)
        .from("advertiser_leads")
        .insert(parsed.data);
      if (error) {
        toast.error("Couldn't send your request. Try again in a sec.");
        return;
      }
      setSuccess(true);
      toast.success("Sponsorship request received! 🍻");
    } catch {
      toast.error("Network hiccup. Try again in a sec.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      <div
        className={highlighted ? "ad-preview-active transition" : "transition"}
      >
        <Card className="p-4 border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-card to-card relative overflow-hidden shadow-[0_0_30px_rgba(251,191,36,0.12)]">
          <div className="absolute -top-10 -right-10 size-32 bg-amber-400/20 rounded-full blur-3xl pointer-events-none" />

          <div className="flex items-center justify-between mb-2 relative">
            <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-bold">
              Promoted · {activeCity}
            </span>
            <span
              className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.4)]"
              title="Independently verified by DrinkedIn's Chief Happy Hour Officer"
            >
              <ShieldCheck className="size-3" />
              Verified Watering Hole 🛡️
            </span>
          </div>

          <div className="flex items-start gap-3 relative">
            <div className="size-12 rounded-xl bg-gradient-to-br from-amber-500/40 to-primary/40 grid place-items-center text-xl shrink-0">
              🍺
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="font-bold text-[15px] leading-tight">
                {sponsored.name}
              </h3>
              <div className="text-[11px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <MapPin className="size-3" /> {sponsored.area}
              </div>
            </div>
          </div>

          <div className="mt-3 rounded-md border border-amber-400/30 bg-amber-500/5 p-2.5 relative">
            <div className="text-[10px] uppercase tracking-wider font-bold text-amber-300 mb-1">
              🔥 Happy Hour Alert
            </div>
            <p className="text-[12px] leading-snug text-foreground/90">
              {sponsored.deal}
            </p>
          </div>

          {/* Heading There Tonight CTA */}
          <div className="mt-3 rounded-md border border-amber-400/40 bg-gradient-to-br from-amber-500/10 to-transparent p-2.5 relative">
            <div className="flex items-center gap-1.5 text-[10px] text-amber-200/90 mb-2">
              <Users className="size-3" />
              <span>
                <span
                  className={`font-bold text-amber-100 inline-block ${
                    popping ? "animate-drinkedin-pop" : ""
                  }`}
                >
                  {headingCount}
                </span>{" "}
                people from {activeCity} are heading here tonight
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              onClick={handleHeadingClick}
              disabled={alreadyChecked}
              className={`w-full font-bold text-[12px] h-9 ${
                alreadyChecked
                  ? "bg-emerald-500/20 hover:bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 cursor-default"
                  : "bg-amber-500 hover:bg-amber-400 text-amber-950"
              }`}
            >
              {alreadyChecked
                ? "You're on the list ✓"
                : "Heading There Tonight 🏃‍♂️🍻"}
            </Button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (onRequireAuth && !onRequireAuth()) return;
              if (profile?.role === "merchant") {
                setMerchantDashOpen(true);
                return;
              }
              resetForm();
              setOpen(true);
            }}
            className="w-full mt-3 border-amber-400/50 hover:border-amber-300 hover:bg-amber-500/10 text-amber-200 hover:text-amber-100 font-semibold text-[12px] h-9"
          >
            {profile?.role === "merchant"
              ? "Open Merchant Ad Dashboard 🛡️"
              : "Own a Pub? Sponsor this slot for ₹599/week 🍻"}
          </Button>
        </Card>
      </div>

      {profile?.role === "merchant" && (
        <MerchantAdDashboard
          open={merchantDashOpen}
          onOpenChange={setMerchantDashOpen}
          profile={profile}
          onSaved={(p) => {
            onProfileUpdated?.(p);
            setMerchantDashOpen(false);
          }}
        />
      )}

      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setTimeout(resetForm, 200);
        }}
      >
        <DialogContent className="max-w-md border-amber-400/40">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Beer className="size-5 text-amber-300" />
              Sponsor a Verified Watering Hole
            </DialogTitle>
            <DialogDescription>
              Get in front of the right corporate crowd, right before clock-out.
            </DialogDescription>
          </DialogHeader>

          {success ? (
            <div className="space-y-3 py-2">
              <div className="rounded-md border border-emerald-400/40 bg-emerald-500/10 p-4 text-center">
                <div className="size-10 mx-auto rounded-full bg-emerald-500/20 grid place-items-center mb-2">
                  <Check className="size-5 text-emerald-300" />
                </div>
                <p className="font-semibold text-sm">Request received! 🍻</p>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">
                  Pay ₹599 to instantly activate your 1-week ad slot, or wait
                  for our Chief Happy Hour Officer to reach out within 2 hours.
                </p>
              </div>
              <Button
                asChild
                className="w-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold"
              >
                <a
                  href="https://rzp.io/rzp/qFoLyja"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Pay ₹599 & Go Live Now 🚀
                </a>
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => setOpen(false)}
              >
                Close
              </Button>
            </div>
          ) : (
            <>
              <ul className="space-y-2 text-[13px] text-foreground/90 mb-3">
                <li className="flex items-start gap-2">
                  <span className="text-amber-300 mt-0.5">✓</span>
                  Target thousands of corporate employees right before clock-out
                  time.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-300 mt-0.5">✓</span>
                  Update your live tap lists and flash happy hour deals
                  dynamically.
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-amber-300 mt-0.5">✓</span>
                  Receive a dedicated Verified Pub Owner Profile.
                </li>
              </ul>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  triggerAdPreview(4500);
                  toast("Live preview active 👀", {
                    description:
                      "Check the right sidebar — that's your ad slot lighting up.",
                  });
                }}
                className="w-full mb-3 border-amber-400/50 hover:border-amber-300 hover:bg-amber-500/10 text-amber-200 hover:text-amber-100 font-semibold text-[12px] h-9"
              >
                <Sparkles className="size-3.5 mr-1.5" />
                See What Your Ad Looks Like
              </Button>

              <form onSubmit={submit} className="space-y-2.5">
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Pub Name
                  </label>
                  <Input
                    value={pubName}
                    onChange={(e) => setPubName(e.target.value)}
                    placeholder="e.g. Independence Brewing Co."
                    maxLength={120}
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    City
                  </label>
                  <Input
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="e.g. Pune"
                    maxLength={80}
                    required
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Owner Contact Info
                  </label>
                  <Input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="WhatsApp number or email"
                    maxLength={240}
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold"
                >
                  {submitting ? "Submitting…" : "Submit Sponsorship Request"}
                </Button>
                <p className="text-[10px] text-muted-foreground/70 text-center">
                  No login needed. We'll reach out within 2 hours.
                </p>
              </form>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
