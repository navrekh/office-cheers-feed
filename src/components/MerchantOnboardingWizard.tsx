import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  MapPin, Phone, Beer, Zap, AlertTriangle, Rocket, CheckCircle2,
  Upload, ArrowRight, ArrowLeft, Sparkles, Building2,
} from "lucide-react";
import type { Profile } from "@/lib/useProfile";

type Props = {
  userId: string;
  profile: Profile;
  onComplete: () => void;
};

type StepKey = 0 | 1 | 2;

const URGENCY = [
  { v: 1, label: "Standard", emoji: "🍺", icon: Beer, cls: "border-amber-400/40" },
  { v: 2, label: "Rain / Clock-Out", emoji: "⚡", icon: Zap, cls: "border-sky-400/40" },
  { v: 3, label: "Emergency!", emoji: "🚨", icon: AlertTriangle, cls: "border-red-400/50" },
] as const;

export default function MerchantOnboardingWizard({ userId, profile, onComplete }: Props) {
  const [step, setStep] = useState<StepKey>(0);
  const [direction, setDirection] = useState<1 | -1>(1);

  // Step 1
  const [pubName, setPubName] = useState(profile.pub_name ?? "");
  const [whatsapp, setWhatsapp] = useState("");
  const [address, setAddress] = useState(profile.map_query_address ?? "");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(
    profile.latitude && profile.longitude
      ? { lat: profile.latitude as number, lng: profile.longitude as number }
      : null,
  );
  const [pinning, setPinning] = useState(false);

  // Step 2
  const [dealText, setDealText] = useState("");
  const [urgency, setUrgency] = useState<number>(1);

  // Step 3
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [launching, setLaunching] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    if (!file) { setFilePreview(null); return; }
    const url = URL.createObjectURL(file);
    setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function pinLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Geolocation unavailable in this browser.");
      return;
    }
    setPinning(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setPinning(false);
        toast.success("Venue pinned 📍", {
          description: `Coordinates locked at ${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`,
        });
      },
      (err) => {
        setPinning(false);
        toast.error("Couldn't lock location", { description: err.message });
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function validateStep(s: StepKey): string | null {
    if (s === 0) {
      if (!pubName.trim()) return "Pub name is required.";
      if (!/^\+?[\d\s\-()]{7,20}$/.test(whatsapp.trim())) return "Enter a valid WhatsApp number.";
      if (address.trim().length < 6) return "Add a complete street address.";
      if (!coords) return "Pin your venue's exact map location to continue.";
    }
    if (s === 1) {
      if (!dealText.trim()) return "Compose your launch deal first.";
      if (dealText.trim().length > 120) return "Deal text must be ≤ 120 characters.";
    }
    return null;
  }

  function go(next: StepKey) {
    const err = validateStep(step);
    if (next > step && err) { toast.error(err); return; }
    setDirection(next > step ? 1 : -1);
    setStep(next);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f && f.type.startsWith("image/")) setFile(f);
    else toast.error("Drop an image file (jpg/png/webp).");
  }

  async function launch() {
    const err = validateStep(0) || validateStep(1);
    if (err) { toast.error(err); setStep(err.includes("location") || err.includes("address") || err.includes("WhatsApp") || err.includes("Pub name") ? 0 : 1); return; }
    setLaunching(true);
    try {
      // 1. Update profile
      const { error: pErr } = await (supabase as any)
        .from("profiles")
        .update({
          pub_name: pubName.trim(),
          whatsapp_number: whatsapp.trim(),
          map_query_address: address.trim(),
          latitude: coords!.lat,
          longitude: coords!.lng,
        })
        .eq("id", userId);
      if (pErr) throw pErr;

      // 2. Upload banner (optional)
      if (file) {
        const ext = file.name.split(".").pop() || "jpg";
        const path = `${userId}/banner-${Date.now()}.${ext}`;
        const { error: upErr } = await supabase.storage
          .from("bar_pics")
          .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
        if (upErr) toast.warning("Photo upload failed", { description: upErr.message });
      }

      // 3. Insert merchant_deals row (trigger sets activated_at + expires_at = now()+7d)
      const { error: dErr } = await (supabase as any)
        .from("merchant_deals")
        .insert({
          pub_name: pubName.trim(),
          city: profile.verified_hub_city ?? null,
          deal_text: dealText.trim(),
          urgency_level: urgency,
          is_active: true,
        });
      if (dErr) throw dErr;

      setCelebrating(true);
      toast.success("You're LIVE 🚀", { description: "Your 7-day spotlight has started." });
      setTimeout(() => { setCelebrating(false); onComplete(); }, 2400);
    } catch (e: any) {
      toast.error("Couldn't launch", { description: e?.message ?? "Try again in a sec." });
    } finally {
      setLaunching(false);
    }
  }

  return (
    <div className="fixed inset-0 z-30 bg-gradient-to-br from-zinc-950/95 via-zinc-900/95 to-zinc-950/95 backdrop-blur-md overflow-y-auto">
      {celebrating && <ConfettiShower />}
      <div className="min-h-full grid place-items-center p-4">
        <Card className="w-full max-w-2xl border-amber-500/30 bg-zinc-950/80 shadow-[0_0_80px_rgba(251,191,36,0.18)] overflow-hidden">
          <div className="p-5 border-b border-amber-500/15 bg-gradient-to-r from-amber-500/10 via-transparent to-transparent">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="size-5 text-amber-300" />
              <h1 className="text-lg font-extrabold">Merchant Onboarding Wizard</h1>
            </div>
            <p className="text-[12px] text-muted-foreground">
              Three quick steps to spin up your live storefront on the Sonar Radar.
            </p>
            <StepIndicator current={step} />
          </div>

          <div className="relative overflow-hidden">
            <div
              key={step}
              className={`p-6 ${direction === 1 ? "animate-slide-in-right" : "animate-fade-in"}`}
            >
              {step === 0 && (
                <Step1
                  pubName={pubName} setPubName={setPubName}
                  whatsapp={whatsapp} setWhatsapp={setWhatsapp}
                  address={address} setAddress={setAddress}
                  coords={coords} pinning={pinning} pinLocation={pinLocation}
                />
              )}
              {step === 1 && (
                <Step2
                  dealText={dealText} setDealText={setDealText}
                  urgency={urgency} setUrgency={setUrgency}
                />
              )}
              {step === 2 && (
                <Step3
                  file={file} preview={filePreview}
                  fileInputRef={fileInputRef}
                  onPick={(f) => setFile(f)}
                  dragOver={dragOver} setDragOver={setDragOver}
                  onDrop={handleDrop}
                />
              )}
            </div>
          </div>

          <div className="p-4 border-t border-border bg-zinc-950/60 flex items-center justify-between gap-3">
            <Button
              variant="ghost"
              size="sm"
              disabled={step === 0 || launching}
              onClick={() => go((step - 1) as StepKey)}
            >
              <ArrowLeft className="size-4 mr-1" /> Back
            </Button>
            <div className="text-[11px] text-muted-foreground hidden sm:block">
              Step {step + 1} of 3
            </div>
            {step < 2 ? (
              <Button
                size="sm"
                onClick={() => go((step + 1) as StepKey)}
                className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold"
              >
                Next <ArrowRight className="size-4 ml-1" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={launch}
                disabled={launching}
                className="bg-gradient-to-r from-red-500 via-amber-500 to-amber-400 hover:brightness-110 text-amber-950 font-extrabold shadow-[0_0_22px_rgba(251,146,60,0.55)]"
              >
                <Rocket className="size-4 mr-1.5" />
                {launching ? "Launching…" : "Launch My Business Live 🚀"}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

function StepIndicator({ current }: { current: StepKey }) {
  const labels = ["Identity", "Launch Deal", "Media & Terms"];
  return (
    <div className="mt-4 grid grid-cols-3 gap-2">
      {labels.map((l, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <div key={l} className="flex items-center gap-2">
            <div
              className={`size-6 rounded-full grid place-items-center text-[11px] font-bold border ${
                done
                  ? "bg-emerald-500 border-emerald-400 text-emerald-950"
                  : active
                    ? "bg-amber-500 border-amber-400 text-amber-950"
                    : "bg-zinc-900 border-border text-muted-foreground"
              }`}
            >
              {done ? <CheckCircle2 className="size-3.5" /> : i + 1}
            </div>
            <span className={`text-[11px] font-semibold ${active ? "text-amber-200" : done ? "text-emerald-200" : "text-muted-foreground"}`}>
              {l}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ---------------- STEP 1 ---------------- */
function Step1(props: {
  pubName: string; setPubName: (v: string) => void;
  whatsapp: string; setWhatsapp: (v: string) => void;
  address: string; setAddress: (v: string) => void;
  coords: { lat: number; lng: number } | null;
  pinning: boolean; pinLocation: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold flex items-center gap-2">
        <Building2 className="size-4 text-amber-300" />
        Venue Identity & Location
      </h2>
      <Field label="Official Pub / Bar Name *">
        <Input value={props.pubName} onChange={(e) => props.setPubName(e.target.value)} placeholder="Independence Brewing Co." maxLength={120} />
      </Field>
      <Field label="Business WhatsApp Number *">
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input value={props.whatsapp} onChange={(e) => props.setWhatsapp(e.target.value)} placeholder="+91 98765 43210" className="pl-9" maxLength={20} />
        </div>
      </Field>
      <Field label="Complete Street Address *">
        <Textarea value={props.address} onChange={(e) => props.setAddress(e.target.value)} placeholder="118, Magrath Rd, Ashok Nagar, Bengaluru 560025" rows={2} maxLength={300} />
      </Field>
      <Field label="Pin Your Exact Map Location *">
        <div className="rounded-lg border-2 border-dashed border-amber-400/40 bg-amber-500/5 p-4">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <Button type="button" onClick={props.pinLocation} disabled={props.pinning} className="bg-amber-500 hover:bg-amber-400 text-amber-950 font-bold">
              <MapPin className="size-4 mr-1.5" />
              {props.pinning ? "Locating…" : props.coords ? "Re-pin Location" : "Pin Map Location 📍"}
            </Button>
            <div className="text-[11px] text-muted-foreground">
              {props.coords ? (
                <span className="text-emerald-300 font-mono">
                  ✅ {props.coords.lat.toFixed(5)}, {props.coords.lng.toFixed(5)}
                </span>
              ) : (
                "Required — powers the Sonar Radar's Haversine distance calculations."
              )}
            </div>
          </div>
        </div>
      </Field>
    </div>
  );
}

/* ---------------- STEP 2 ---------------- */
function Step2(props: {
  dealText: string; setDealText: (v: string) => void;
  urgency: number; setUrgency: (v: number) => void;
}) {
  const remaining = 120 - props.dealText.length;
  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold flex items-center gap-2">
        <Zap className="size-4 text-amber-300" />
        First Flash Deal
      </h2>
      <Field label="Launch Deal (max 120 chars) *">
        <Textarea
          value={props.dealText}
          onChange={(e) => props.setDealText(e.target.value)}
          placeholder="Tech Park Special: Show your company ID badge for 15% off all drafts! 🍺"
          rows={4}
          maxLength={160}
        />
        <div className={`text-[10px] text-right mt-1 font-mono ${remaining < 0 ? "text-red-400" : remaining < 20 ? "text-amber-300" : "text-muted-foreground"}`}>
          {props.dealText.length}/120
        </div>
      </Field>
      <Field label="Urgency Level (Algorithmic Priority Boost)">
        <div className="grid grid-cols-3 gap-2">
          {URGENCY.map((opt) => {
            const on = props.urgency === opt.v;
            const Icon = opt.icon;
            return (
              <button
                key={opt.v}
                type="button"
                onClick={() => props.setUrgency(opt.v)}
                className={`rounded-md border-2 px-2 py-3 text-[11px] font-semibold transition flex flex-col items-center gap-1 ${opt.cls} ${
                  on ? "bg-amber-500/20 border-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.35)]" : "bg-zinc-900/60 hover:bg-zinc-900"
                }`}
              >
                <Icon className="size-4" />
                <span className="text-lg">{opt.emoji}</span>
                <span>L{opt.v} · {opt.label}</span>
              </button>
            );
          })}
        </div>
      </Field>
    </div>
  );
}

/* ---------------- STEP 3 ---------------- */
function Step3(props: {
  file: File | null; preview: string | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onPick: (f: File | null) => void;
  dragOver: boolean; setDragOver: (v: boolean) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-base font-bold flex items-center gap-2">
        <Upload className="size-4 text-amber-300" />
        Banner Image & Subscription Terms
      </h2>

      <Field label="Drop a banner image of your venue (optional)">
        <div
          onDragOver={(e) => { e.preventDefault(); props.setDragOver(true); }}
          onDragLeave={() => props.setDragOver(false)}
          onDrop={props.onDrop}
          onClick={() => props.fileInputRef.current?.click()}
          className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition ${
            props.dragOver ? "border-amber-300 bg-amber-500/15" : "border-border bg-zinc-900/40 hover:bg-zinc-900/70"
          }`}
        >
          {props.preview ? (
            <div className="space-y-2">
              <img src={props.preview} alt="Banner preview" className="mx-auto max-h-44 rounded-md object-cover" />
              <p className="text-[11px] text-emerald-300">{props.file?.name}</p>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); props.onPick(null); }}
                className="text-[11px] text-red-300 hover:text-red-200 underline"
              >
                Remove
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              <Upload className="size-7 mx-auto text-muted-foreground" />
              <p className="text-[12px] font-semibold">Drag & drop or click to upload</p>
              <p className="text-[10px] text-muted-foreground">JPG / PNG / WEBP · up to 5 MB</p>
            </div>
          )}
          <input
            ref={props.fileInputRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              if (f.size > 5 * 1024 * 1024) { toast.error("Image too large (max 5 MB)."); return; }
              props.onPick(f);
            }}
          />
        </div>
      </Field>

      <Card className="p-4 border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-transparent">
        <div className="flex items-start gap-3">
          <div className="text-2xl">✨</div>
          <div className="flex-1">
            <h3 className="font-bold text-sm">Your 7-Day Advertisement Block</h3>
            <p className="text-[12px] text-muted-foreground mt-1">
              Live on every active feed in your city for one full week. Cooldown timer auto-expires
              your slot on day 7 — renew anytime in the dashboard.
            </p>
            <div className="mt-3 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold text-amber-200">₹599</span>
              <span className="text-[12px] text-amber-200/80 font-semibold">/ week</span>
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Billing kicks in after launch · Razorpay-secured · cancel anytime.
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground block mb-1.5">
        {label}
      </label>
      {children}
    </div>
  );
}

/* ---------------- Confetti ---------------- */
function ConfettiShower() {
  const pieces = Array.from({ length: 80 });
  const colors = ["#fbbf24", "#f59e0b", "#ef4444", "#10b981", "#38bdf8", "#a78bfa"];
  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.6;
        const duration = 1.6 + Math.random() * 1.4;
        const size = 6 + Math.random() * 8;
        const color = colors[i % colors.length];
        const rot = Math.floor(Math.random() * 360);
        return (
          <span
            key={i}
            style={{
              left: `${left}%`,
              width: size,
              height: size * 0.4,
              background: color,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              transform: `rotate(${rot}deg)`,
            }}
            className="absolute top-[-10%] rounded-sm confetti-fall"
          />
        );
      })}
      <style>{`
        @keyframes confetti-fall {
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(120vh) rotate(720deg); opacity: 0.85; }
        }
        .confetti-fall { animation-name: confetti-fall; animation-timing-function: cubic-bezier(.2,.7,.4,1); animation-fill-mode: forwards; }
      `}</style>
    </div>
  );
}
