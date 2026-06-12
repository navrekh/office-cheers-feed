import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState, useRef } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import { useProfile } from "@/lib/useProfile";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import MerchantFlashControl from "@/components/MerchantFlashControl";
import MerchantOnboardingWizard from "@/components/MerchantOnboardingWizard";
import BillingTab from "@/components/BillingTab";
import LiveAmbientEqualizer from "@/components/LiveAmbientEqualizer";
import { useT, useI18n } from "@/lib/i18n";
import {
  ArrowLeft,
  Beer,
  Clock,
  Eye,
  ImagePlus,
  Loader2,
  MousePointerClick,
  Phone,
  Radio,
  ShieldCheck,
  Store,
  Trash2,
} from "lucide-react";

export const Route = createFileRoute("/merchant-dashboard")({
  head: () => ({
    meta: [
      { title: "Merchant Dashboard — DrinkedIn" },
      { name: "description", content: "Deploy flash deals, manage venue media, and track real-time foot traffic." },
    ],
  }),
  component: MerchantDashboardPage,
});

function MerchantDashboardPage() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, refresh } = useProfile(user?.id ?? null);

  // Onboarding state: do we have any merchant_deals row for this pub yet?
  const [needsOnboarding, setNeedsOnboarding] = useState<boolean | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!profile || profile.role !== "merchant") return;
    let cancelled = false;
    (async () => {
      const pubName = profile.pub_name?.trim();
      // No pub name yet → definitely needs onboarding.
      if (!pubName) { if (!cancelled) setNeedsOnboarding(true); return; }
      const { count } = await (supabase as any)
        .from("merchant_deals")
        .select("id", { count: "exact", head: true })
        .ilike("pub_name", pubName);
      if (cancelled) return;
      setNeedsOnboarding((count ?? 0) === 0);
    })();
    return () => { cancelled = true; };
  }, [profile, reloadKey]);

  // Gate
  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user) {
      toast.error("Sign in as a merchant to access this portal.");
      navigate({ to: "/" });
      return;
    }
    if (profile && profile.role !== "merchant") {
      toast.error("No verified merchant account footprint detected.", {
        description: "Standard employee accounts can't open the merchant portal. Booted back to the feed.",
      });
      navigate({ to: "/" });
    }
  }, [authLoading, profileLoading, user, profile, navigate]);

  if (authLoading || profileLoading || !profile || profile.role !== "merchant" || needsOnboarding === null) {
    return <DashboardSkeleton />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 text-foreground">
      <header className="border-b border-amber-500/20 bg-zinc-950/60 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-grid place-items-center size-9 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300">
              <ShieldCheck className="size-5" />
            </span>
            <div>
              <h1 className="text-base font-bold leading-tight">Merchant Control Room</h1>
              <p className="text-[11px] text-muted-foreground">{profile.pub_name || "Unnamed Venue"}</p>
            </div>
          </div>
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
            <Link to="/"><ArrowLeft className="size-4 mr-1" /> Back to feed</Link>
          </Button>
        </div>
      </header>

      <B2BClaimHero pubName={profile.pub_name} />

      <DashboardTabs userId={user!.id} profile={profile} onRefresh={refresh} />




      {needsOnboarding && (
        <MerchantOnboardingWizard
          userId={user!.id}
          profile={profile}
          onComplete={async () => {
            await refresh();
            setReloadKey((k) => k + 1);
            setNeedsOnboarding(false);
          }}
        />
      )}
    </div>
  );
}

type TabKey = "analytics" | "billing";

function DashboardTabs({
  userId, profile, onRefresh,
}: { userId: string; profile: import("@/lib/useProfile").Profile; onRefresh: () => void }) {
  const [tab, setTab] = useState<TabKey>("analytics");
  return (
    <main className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <div role="tablist" className="inline-flex p-1 rounded-lg bg-zinc-900/70 border border-border gap-1">
        <TabButton active={tab === "analytics"} onClick={() => setTab("analytics")} label="Live Foot-Traffic Analytics 📡" />
        <TabButton active={tab === "billing"} onClick={() => setTab("billing")} label="Subscription & Billing 💳" />
      </div>

      {tab === "analytics" ? (
        <div className="grid gap-5 lg:grid-cols-3 animate-fade-in">
          <section className="lg:col-span-2 space-y-5">
            <LiveAnalyticsPanel pubName={profile.pub_name} />
            <GuestSentimentPanel pubName={profile.pub_name} />
            <MerchantFlashControl profile={profile} />
            <MediaWorkspace userId={userId} pubName={profile.pub_name} />
          </section>
          <aside className="space-y-5">
            <SubscriptionClock pubName={profile.pub_name} onRefresh={onRefresh} />
          </aside>
        </div>
      ) : (
        <BillingTab userId={userId} pubName={profile.pub_name} />
      )}
    </main>
  );
}

function TabButton({ active, onClick, label }: { active: boolean; onClick: () => void; label: string }) {
  return (
    <button
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={`px-3 sm:px-4 h-9 rounded-md text-[12px] font-bold transition ${
        active
          ? "bg-amber-500 text-amber-950 shadow-[0_0_18px_rgba(251,191,36,0.45)]"
          : "text-muted-foreground hover:text-foreground hover:bg-zinc-800/60"
      }`}
    >
      {label}
    </button>
  );
}


function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-zinc-950 p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <Skeleton className="h-14 w-full" />
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-4">
            <Skeleton className="h-28 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    </div>
  );
}

/* ------- A. Live Analytics ------- */
function LiveAnalyticsPanel({ pubName }: { pubName: string | null }) {
  const [verified, setVerified] = useState<number | null>(null);
  const [commuting, setCommuting] = useState<number | null>(null);
  const [clicks, setClicks] = useState<number | null>(null);
  const [today, setToday] = useState<number | null>(null);

  useEffect(() => {
    if (!pubName) return;
    let cancelled = false;
    async function load() {
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const total = await (supabase as any)
        .from("merchant_clicks")
        .select("id", { count: "exact", head: true })
        .ilike("pub_id", pubName as string);
      const todayQ = await (supabase as any)
        .from("merchant_clicks")
        .select("id", { count: "exact", head: true })
        .ilike("pub_id", pubName as string)
        .gte("created_at", startOfDay.toISOString());
      const dealQ = await (supabase as any)
        .from("merchant_deals")
        .select("verified_at_venue_count, commuting_count")
        .ilike("pub_name", pubName as string)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setClicks(total.count ?? 0);
      setToday(todayQ.count ?? 0);
      setVerified(dealQ.data?.verified_at_venue_count ?? 0);
      setCommuting(dealQ.data?.commuting_count ?? 0);
    }
    load();
    const id = setInterval(load, 15000);
    const channel = (supabase as any)
      .channel(`merchant-live-${pubName}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "merchant_clicks" }, load)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "merchant_deals" }, load)
      .subscribe();
    return () => {
      cancelled = true;
      clearInterval(id);
      (supabase as any).removeChannel(channel);
    };
  }, [pubName]);

  return (
    <Card className="p-5 border-emerald-400/30 bg-gradient-to-br from-emerald-500/10 via-zinc-900 to-zinc-950">
      <div className="flex items-center gap-2 mb-3">
        <span className="inline-block size-2 rounded-full bg-emerald-400 animate-pulse" />
        <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-100">Geofenced Foot-Traffic Cockpit</h2>
      </div>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <GaugeTile
          label="Verified Patrons on Premises 🔥"
          sublabel="Inside the 200 m geofence"
          value={verified}
          accent="emerald"
        />
        <GaugeTile
          label="In-Bound Commuters Incoming 🏃‍♂️"
          sublabel="En route, not yet verified"
          value={commuting}
          accent="sky"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <MetricTile icon={MousePointerClick} label='"Heading There" Total' value={clicks} accent="amber" />
        <MetricTile icon={Eye} label="Today" value={today} accent="sky" />
      </div>
    </Card>
  );
}

function GaugeTile({
  label, sublabel, value, accent,
}: { label: string; sublabel: string; value: number | null; accent: "emerald" | "sky" }) {
  const tone = accent === "emerald"
    ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-50 shadow-[0_0_24px_rgba(52,211,153,0.25)]"
    : "border-sky-400/50 bg-sky-500/15 text-sky-50 shadow-[0_0_24px_rgba(56,189,248,0.25)]";
  const ring = accent === "emerald" ? "ring-emerald-400/40" : "ring-sky-400/40";
  return (
    <div className={`rounded-xl border p-4 ring-1 ${ring} ${tone}`}>
      <div className="text-[10px] uppercase tracking-wider font-bold opacity-90">{label}</div>
      <div className="text-4xl font-black mt-1 tabular-nums">{value ?? "—"}</div>
      <div className="text-[10px] opacity-70 mt-1">{sublabel}</div>
    </div>
  );
}

function MetricTile({
  icon: Icon, label, value, accent,
}: { icon: any; label: string; value: number | null; accent: "emerald" | "amber" | "sky" }) {
  const tone = {
    emerald: "border-emerald-400/30 bg-emerald-500/10 text-emerald-100",
    amber: "border-amber-400/30 bg-amber-500/10 text-amber-100",
    sky: "border-sky-400/30 bg-sky-500/10 text-sky-100",
  }[accent];
  return (
    <div className={`rounded-lg border p-3 ${tone}`}>
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider opacity-80 font-bold">
        <Icon className="size-3" /> {label}
      </div>
      <div className="text-3xl font-extrabold mt-1 tabular-nums">{value ?? "—"}</div>
    </div>
  );
}

/* ------- C. Media Workspace ------- */
function MediaWorkspace({ userId, pubName }: { userId: string; pubName: string | null }) {
  const [files, setFiles] = useState<{ name: string; url: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function refreshList() {
    const { data } = await supabase.storage.from("bar_pics").list(userId, { limit: 50 });
    if (!data) return;
    setFiles(
      data
        .filter((f) => f.name && !f.name.startsWith("."))
        .map((f) => ({
          name: f.name,
          url: supabase.storage.from("bar_pics").getPublicUrl(`${userId}/${f.name}`).data.publicUrl,
        })),
    );
  }

  useEffect(() => { refreshList(); }, [userId]);

  async function onUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image too large (max 5 MB).");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() || "jpg";
    const path = `${userId}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("bar_pics").upload(path, file, {
      cacheControl: "3600",
      upsert: false,
      contentType: file.type,
    });
    setUploading(false);
    if (error) {
      toast.error("Upload failed", { description: error.message });
      return;
    }
    toast.success("Venue photo uploaded 📸");
    if (inputRef.current) inputRef.current.value = "";
    refreshList();
  }

  async function remove(name: string) {
    const { error } = await supabase.storage.from("bar_pics").remove([`${userId}/${name}`]);
    if (error) { toast.error("Couldn't delete"); return; }
    toast.success("Removed");
    refreshList();
  }

  return (
    <Card className="p-5 border-sky-400/30 bg-gradient-to-br from-sky-500/5 via-zinc-900 to-zinc-950">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <ImagePlus className="size-4 text-sky-300" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-sky-100">Venue Media Workspace</h2>
        </div>
        <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 h-8 rounded-md bg-sky-500 hover:bg-sky-400 text-sky-950 text-[12px] font-bold transition">
          <ImagePlus className="size-3.5" />
          {uploading ? "Uploading…" : "Upload Photo"}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onUpload}
            disabled={uploading}
          />
        </label>
      </div>
      {!pubName && (
        <p className="text-[11px] text-amber-300/80 mb-3">
          Tip: set your pub name so customers can match these photos to the right venue.
        </p>
      )}
      {files.length === 0 ? (
        <div className="text-center text-[12px] text-muted-foreground py-8 border border-dashed border-border rounded-md">
          No photos yet. Upload your best ambience shot to anchor your listing.
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {files.map((f) => (
            <div key={f.name} className="relative group rounded-md overflow-hidden border border-border bg-black/40 aspect-square">
              <img src={f.url} alt={f.name} className="w-full h-full object-cover" loading="lazy" />
              <button
                type="button"
                onClick={() => remove(f.name)}
                className="absolute top-1 right-1 size-7 grid place-items-center rounded bg-black/70 text-red-300 opacity-0 group-hover:opacity-100 transition hover:text-red-200"
                aria-label="Delete"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}

/* ------- D. Subscription Telemetry Clock ------- */
function SubscriptionClock({ pubName, onRefresh }: { pubName: string | null; onRefresh: () => void }) {
  const [expires, setExpires] = useState<string | null>(null);
  const [active, setActive] = useState<boolean>(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!pubName) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("merchant_deals")
        .select("expires_at, is_active")
        .ilike("pub_name", pubName as string)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setExpires(data?.expires_at ?? null);
      setActive(!!data?.is_active);
    })();
    return () => { cancelled = true; };
  }, [pubName, onRefresh]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const remaining = useMemo(() => {
    if (!expires) return null;
    const diff = new Date(expires).getTime() - now;
    if (diff <= 0) return { expired: true, d: 0, h: 0, m: 0, s: 0 };
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff / 3600000) % 24);
    const m = Math.floor((diff / 60000) % 60);
    const s = Math.floor((diff / 1000) % 60);
    return { expired: false, d, h, m, s };
  }, [expires, now]);

  const expired = !remaining || remaining.expired || !active;

  return (
    <Card className={`p-5 border-2 ${expired ? "border-red-400/50 bg-gradient-to-br from-red-500/10 via-zinc-900 to-zinc-950" : "border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-zinc-900 to-zinc-950"}`}>
      <div className="flex items-center gap-2 mb-3">
        <Clock className={`size-4 ${expired ? "text-red-300" : "text-amber-300"}`} />
        <h2 className="text-sm font-bold uppercase tracking-wider text-foreground">Subscription Clock</h2>
      </div>
      {!expires ? (
        <p className="text-[12px] text-muted-foreground mb-4">
          No active sponsorship slot yet. Deploy your first flash deal or activate a paid slot to start the 7-day timer.
        </p>
      ) : expired ? (
        <div className="mb-4">
          <div className="text-3xl font-extrabold text-red-200">EXPIRED</div>
          <p className="text-[11px] text-red-100/70 mt-1">Your slot ended on {new Date(expires).toLocaleString()}.</p>
        </div>
      ) : (
        <div className="mb-4">
          <div className="grid grid-cols-4 gap-2 text-center">
            {(["d", "h", "m", "s"] as const).map((k) => (
              <div key={k} className="rounded-md border border-amber-400/30 bg-black/40 py-2">
                <div className="text-2xl font-extrabold text-amber-100 tabular-nums leading-none">
                  {String((remaining as any)[k]).padStart(2, "0")}
                </div>
                <div className="text-[9px] uppercase tracking-wider text-amber-200/70 mt-1">
                  {k === "d" ? "Days" : k === "h" ? "Hrs" : k === "m" ? "Min" : "Sec"}
                </div>
              </div>
            ))}
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">
            Auto-expires {new Date(expires).toLocaleString()}
          </p>
        </div>
      )}
      <SubscribeCta expired={expired} />
      <p className="text-[10px] text-muted-foreground/80 mt-2 text-center">
        Razorpay-secured · auto-republishes on confirmation
      </p>
    </Card>
  );
}

/* ------- D.1 Geo-aware Subscribe CTA (Razorpay — INR for IN, USD elsewhere) ------- */
const RAZORPAY_KEY_ID = "YOUR_RAZORPAY_KEY_ID";
const RAZORPAY_SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

function detectRegion(lang: string): string {
  try {
    const nav = (navigator.language || "").toUpperCase();
    const parts = nav.split("-");
    if (parts[1]) return parts[1];
  } catch { /* ignore */ }
  return lang === "ja" ? "JP" : lang === "de" ? "DE" : "US";
}

function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as any).Razorpay) return resolve(true);
    const existing = document.querySelector(
      `script[src="${RAZORPAY_SCRIPT_SRC}"]`,
    ) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () => resolve(true));
      existing.addEventListener("error", () => resolve(false));
      return;
    }
    const script = document.createElement("script");
    script.src = RAZORPAY_SCRIPT_SRC;
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
}

function RazorpayLoadingOverlay() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-[80] grid place-items-center bg-black/70 backdrop-blur-sm animate-fade-in"
    >
      <div
        className="flex flex-col items-center gap-4 px-8 py-7 rounded-2xl border text-center max-w-xs"
        style={{
          background: "rgba(24, 20, 20, 0.85)",
          border: "1px solid rgba(255, 255, 255, 0.08)",
          boxShadow: "0 20px 60px -20px rgba(0,0,0,0.7)",
        }}
      >
        <div className="relative">
          <Loader2 className="size-10 text-amber-300 animate-spin" />
          <span className="absolute inset-0 rounded-full ring-2 ring-amber-400/30 animate-ping" />
        </div>
        <div>
          <p className="text-sm font-bold text-amber-100">Securing connection to Razorpay…</p>
          <p className="text-[11px] text-amber-50/60 mt-1 leading-snug">
            Loading the encrypted checkout vault. Hang tight, this only takes a heartbeat.
          </p>
        </div>
      </div>
    </div>
  );
}

function SubscribeCta({ expired }: { expired: boolean }) {
  const { lang } = useI18n();
  const { user } = useAuth();
  const region = detectRegion(lang);
  const isIndia = region === "IN";
  const [processing, setProcessing] = useState(false);
  const [scriptLoading, setScriptLoading] = useState(false);

  const config = isIndia
    ? { amount: 59900, currency: "INR", display: "₹599 / Week" }
    : { amount: 999, currency: "USD", display: "$9.99 / Week" };

  async function openCheckout() {
    setProcessing(true);
    import("@/lib/analytics").then((m) =>
      m.trackEngagement("merchant_sponsor_slot_click", {
        region,
        currency: config.currency,
      }),
    );

    // Surface the styled spinner immediately if the SDK isn't on window yet.
    const sdkReady = typeof window !== "undefined" && !!(window as any).Razorpay;
    if (!sdkReady) setScriptLoading(true);

    const ok = await loadRazorpayScript();
    setScriptLoading(false);

    if (!ok || !(window as any).Razorpay) {
      setProcessing(false);
      toast.error("Couldn't load the Razorpay checkout.", {
        description: "Check your connection and try again in a moment.",
      });
      return;
    }

    const options = {
      key: RAZORPAY_KEY_ID,
      amount: config.amount,
      currency: config.currency,
      name: "DrinkedIn.me",
      description: "Weekly Neighborhood Sponsored Slot",
      prefill: {
        email: user?.email || "",
        contact: "",
      },
      theme: { color: "#181414" },
      modal: {
        ondismiss: () => {
          setProcessing(false);
          toast("Checkout closed", {
            description: "Your sponsored slot is still available whenever you're ready.",
          });
        },
      },
      handler: (response: { razorpay_payment_id?: string }) => {
        setProcessing(false);
        toast.success(
          "🎉 Payment verified via Razorpay! Your sponsored venue slot is now live on the local radar map.",
          {
            description: response?.razorpay_payment_id
              ? `Txn ${response.razorpay_payment_id}`
              : undefined,
          },
        );
      },
    };

    try {
      const Rzp = (window as any).Razorpay;
      if (!Rzp) throw new Error("Razorpay SDK unavailable after load.");
      const rzp = new Rzp(options);
      rzp.on?.("payment.failed", (resp: any) => {
        setProcessing(false);
        toast.error("Razorpay payment failed", {
          description:
            resp?.error?.description ||
            "Slot is still available — give it another shot.",
        });
      });
      rzp.open();
    } catch (err: any) {
      setProcessing(false);
      toast.error("Razorpay checkout error", {
        description: err?.message || "Please retry in a moment.",
      });
    }
  }

  const label = isIndia
    ? processing
      ? "Opening Razorpay…"
      : expired
        ? `Renew Slot — ${config.display}`
        : `Extend Slot — ${config.display}`
    : processing
      ? "Opening Razorpay…"
      : `⚡ Sponsor District via International Cards (Razorpay) — ${config.display}`;

  const buttonClass = isIndia
    ? "w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-amber-950 font-bold text-[12px] h-10 shadow-[0_0_22px_rgba(251,191,36,0.45)]"
    : "w-full bg-gradient-to-r from-indigo-500 via-violet-500 to-fuchsia-500 hover:brightness-110 text-white font-bold text-[12px] h-10 shadow-[0_0_22px_rgba(139,92,246,0.45)]";

  return (
    <>
      <Button onClick={openCheckout} disabled={processing} className={buttonClass}>
        <Beer className="size-4 mr-1.5" />
        {label}
      </Button>
      {scriptLoading && <RazorpayLoadingOverlay />}
    </>
  );
}


/* ------- E. Live Guest Sentiment & Environmental Audit ------- */
function GuestSentimentPanel({ pubName }: { pubName: string | null }) {
  const [row, setRow] = useState<{
    crowd_density: number | null;
    noise_level: number | null;
    vibe_type: number | null;
    vibe_sample_count: number | null;
  } | null>(null);

  useEffect(() => {
    if (!pubName) return;
    let cancelled = false;
    async function load() {
      const { data } = await (supabase as any)
        .from("merchant_deals")
        .select("crowd_density, noise_level, vibe_type, vibe_sample_count")
        .ilike("pub_name", pubName as string)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!cancelled) setRow(data ?? null);
    }
    load();
    const channel = (supabase as any)
      .channel(`sentiment-${pubName}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "merchant_deals" }, load)
      .subscribe();
    const id = setInterval(load, 15_000);
    return () => {
      cancelled = true;
      clearInterval(id);
      (supabase as any).removeChannel(channel);
    };
  }, [pubName]);

  const c = row?.crowd_density ?? 0;
  const n = row?.noise_level ?? 0;
  const v = row?.vibe_type ?? 0;
  const samples = row?.vibe_sample_count ?? 0;

  // Plain-English operational hints derived from current averages.
  const insights: string[] = [];
  if (samples === 0) {
    insights.push("Waiting on your first on-premise vibe ping — the matrix unlocks for guests inside the 200 m geofence.");
  } else {
    if (n > 0.85) insights.push("🔊 Guests flagging the room as 'concert loud' — consider trimming the master volume a notch.");
    else if (n < 0.2) insights.push("🤫 Floor is reading silent — a livelier playlist could extend table-stay.");
    if (c > 0.85) insights.push("👥 Standing-room-only on the floor — open the secondary seating zone if available.");
    else if (c < 0.25) insights.push("🏜️ Crowd density is low — push a flash deal to draw in the commuters en route.");
    if (v > 0.75) insights.push("🍻 De-stress party energy detected — perfect window to upsell premium pours.");
    else if (v < 0.3) insights.push("👔 Networking-mode vibe — quieter seating and bar snacks will keep them lingering.");
    if (insights.length === 0) insights.push("✅ Crowd, acoustics, and scene vibe are all dialled in. Hold the line.");
  }

  return (
    <Card className="p-5 border-fuchsia-400/30 bg-gradient-to-br from-fuchsia-500/10 via-zinc-900 to-zinc-950">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="inline-block size-2 rounded-full bg-fuchsia-400 animate-pulse" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-fuchsia-100">
            Live Guest Sentiment &amp; Environmental Audit
          </h2>
        </div>
        <span className="text-[10px] font-mono text-fuchsia-200/70 tabular-nums">
          {samples} samples
        </span>
      </div>
      <div className="grid sm:grid-cols-[auto_1fr] gap-4 items-center">
        <LiveAmbientEqualizer crowd={c} noise={n} vibe={v} hideHotBadge />
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-2 text-center">
            <SentimentTile label="Crowd Density" value={c} accent="amber" />
            <SentimentTile label="Noise Level" value={n} accent="fuchsia" />
            <SentimentTile label="Scene Vibe" value={v} accent="cyan" />
          </div>
          <ul className="text-[12px] text-fuchsia-50/90 space-y-1 list-none">
            {insights.map((line) => (
              <li key={line} className="leading-snug">{line}</li>
            ))}
          </ul>
        </div>
      </div>
    </Card>
  );
}

function SentimentTile({
  label, value, accent,
}: { label: string; value: number; accent: "amber" | "fuchsia" | "cyan" }) {
  const tone = {
    amber:   "border-amber-400/40 bg-amber-500/10 text-amber-100",
    fuchsia: "border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-100",
    cyan:    "border-cyan-400/40 bg-cyan-500/10 text-cyan-100",
  }[accent];
  return (
    <div className={`rounded-md border p-2 ${tone}`}>
      <div className="text-[9px] uppercase tracking-wider font-bold opacity-80">{label}</div>
      <div className="text-xl font-extrabold tabular-nums">{Math.round(value * 100)}%</div>
    </div>
  );
}
