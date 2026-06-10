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
import {
  ArrowLeft,
  Beer,
  Clock,
  Eye,
  ImagePlus,
  MousePointerClick,
  ShieldCheck,
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

  if (authLoading || profileLoading || !profile || profile.role !== "merchant") {
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

      <main className="max-w-6xl mx-auto px-4 py-6 grid gap-5 lg:grid-cols-3">
        <section className="lg:col-span-2 space-y-5">
          <LiveAnalyticsPanel pubName={profile.pub_name} />
          <MerchantFlashControl profile={profile} />
          <MediaWorkspace userId={user!.id} pubName={profile.pub_name} />
        </section>
        <aside className="space-y-5">
          <SubscriptionClock pubName={profile.pub_name} onRefresh={refresh} />
        </aside>
      </main>
    </div>
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
  const [hover, setHover] = useState<number | null>(null);
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
        .select("heading_there_count")
        .ilike("pub_name", pubName as string)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setClicks(total.count ?? 0);
      setToday(todayQ.count ?? 0);
      setHover(dealQ.data?.heading_there_count ?? 0);
    }
    load();
    const id = setInterval(load, 15000);
    const channel = (supabase as any)
      .channel(`merchant-live-${pubName}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "merchant_clicks" }, load)
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
        <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-100">Live Analytics</h2>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <MetricTile icon={Eye} label="Hovering Now" value={hover} accent="emerald" />
        <MetricTile icon={MousePointerClick} label='"Heading There" Total' value={clicks} accent="amber" />
        <MetricTile icon={MousePointerClick} label="Today" value={today} accent="sky" />
      </div>
    </Card>
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
      <Button
        asChild
        className="w-full bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:brightness-110 text-amber-950 font-bold text-[12px] h-10 shadow-[0_0_22px_rgba(251,191,36,0.45)]"
      >
        <a href="https://rzp.io/rzp/qFoLyja" target="_blank" rel="noopener noreferrer">
          <Beer className="size-4 mr-1.5" />
          {expired ? "Renew Slot — ₹599 / Week" : "Extend Slot — ₹599 / Week"}
        </a>
      </Button>
      <p className="text-[10px] text-muted-foreground/80 mt-2 text-center">
        Razorpay-secured · auto-republishes on confirmation
      </p>
    </Card>
  );
}
