import { useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Mail, Lock, ShieldCheck, Briefcase, Beer, ArrowLeft } from "lucide-react";

type Intent = "employee" | "merchant";
type Mode = "signin" | "signup";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reason?: string;
  defaultIntent?: Intent;
};

export default function AuthModal({ open, onOpenChange, reason, defaultIntent }: Props) {
  const navigate = useNavigate();
  const [intent, setIntent] = useState<Intent | null>(defaultIntent ?? null);
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [pubName, setPubName] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  useEffect(() => {
    if (open) setIntent(defaultIntent ?? null);
  }, [open, defaultIntent]);

  async function finalizeIntent(currentIntent: Intent) {
    if (currentIntent === "merchant") {
      const { error } = await (supabase as any).rpc("claim_merchant_role", {
        p_pub_name: pubName.trim() || null,
      });
      if (error) {
        toast.error("Couldn't activate merchant portal", { description: error.message });
        return;
      }
      toast.success("Merchant portal unlocked 🍻");
      onOpenChange(false);
      navigate({ to: "/merchant-dashboard" });
    } else {
      onOpenChange(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!intent) return;
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      toast.error("That doesn't look like a real email.");
      return;
    }
    if (password.length < 8) {
      toast.error("Password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const redirect = typeof window !== "undefined" ? window.location.origin : undefined;
        const { data, error } = await supabase.auth.signUp({
          email: clean,
          password,
          options: { emailRedirectTo: redirect },
        });
        if (error) {
          toast.error("Sign up failed", { description: error.message });
          return;
        }
        if (data.session) {
          await finalizeIntent(intent);
        } else {
          toast.success("Account created", { description: "Sign in to continue." });
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: clean, password });
        if (error) {
          toast.error("Sign in failed", { description: error.message });
          return;
        }
        await finalizeIntent(intent);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    if (!intent) return;
    if (intent === "merchant" && typeof window !== "undefined") {
      sessionStorage.setItem("pending_merchant_claim", pubName.trim() || "1");
    }
    setGoogleBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: typeof window !== "undefined" ? window.location.origin : undefined,
      });
      if (result.error) {
        toast.error("Google sign-in failed", {
          description: String((result.error as any)?.message ?? result.error),
        });
        setGoogleBusy(false);
        return;
      }
      if (result.redirected) return;
      await finalizeIntent(intent);
    } catch (e: any) {
      toast.error("Google sign-in failed", { description: e?.message });
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl border-amber-500/30 bg-gradient-to-br from-zinc-950/90 via-zinc-900/90 to-zinc-950/90 backdrop-blur-xl shadow-[0_0_80px_rgba(251,191,36,0.2)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="inline-grid place-items-center size-9 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300">
              <ShieldCheck className="size-5" />
            </span>
            {intent ? (
              <>
                <button
                  onClick={() => setIntent(null)}
                  className="text-muted-foreground hover:text-foreground transition"
                  aria-label="Back"
                >
                  <ArrowLeft className="size-4" />
                </button>
                {intent === "employee" ? "Corporate Employee 👔" : "Pub & Restaurant Owner 🍻"}
              </>
            ) : (
              <>Pick your entrance 🍻</>
            )}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground leading-relaxed">
            {reason || (intent
              ? intent === "employee"
                ? "Use a personal email — never your work address. Posts always stay 100% anonymous."
                : "Merchant accounts unlock the live flash deal control room and venue media manager."
              : "Two doors, one breakroom. Choose the side that fits.")}
          </DialogDescription>
        </DialogHeader>

        {!intent ? (
          <div className="grid sm:grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={() => setIntent("employee")}
              className="group text-left rounded-xl border border-sky-400/30 bg-gradient-to-br from-sky-500/10 via-sky-500/5 to-transparent p-5 hover:border-sky-300/60 hover:bg-sky-500/15 transition shadow-[0_0_30px_rgba(56,189,248,0.08)]"
            >
              <div className="inline-grid place-items-center size-10 rounded-lg bg-sky-500/20 border border-sky-400/40 text-sky-200 mb-3">
                <Briefcase className="size-5" />
              </div>
              <h3 className="font-bold text-base text-sky-100">Corporate Employee 👔</h3>
              <p className="text-[12px] text-sky-100/70 mt-1 leading-relaxed">
                Enter the anonymous breakroom to cope, vent, and find local happy hours.
              </p>
              <div className="mt-4 inline-flex items-center justify-center w-full h-9 rounded-md bg-sky-500 text-sky-950 font-bold text-[12px] group-hover:bg-sky-400 transition">
                Continue to Breakroom →
              </div>
            </button>

            <button
              type="button"
              onClick={() => setIntent("merchant")}
              className="group text-left rounded-xl border border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-red-500/5 to-transparent p-5 hover:border-amber-300/70 hover:bg-amber-500/15 transition shadow-[0_0_30px_rgba(251,191,36,0.12)]"
            >
              <div className="inline-grid place-items-center size-10 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-200 mb-3">
                <Beer className="size-5" />
              </div>
              <h3 className="font-bold text-base text-amber-100">Pub & Restaurant Owner 🍻</h3>
              <p className="text-[12px] text-amber-100/70 mt-1 leading-relaxed">
                Deploy live flash deals, capture local foot traffic, and manage your ₹599/week sponsorship.
              </p>
              <div className="mt-4 inline-flex items-center justify-center w-full h-9 rounded-md bg-amber-500 text-amber-950 font-bold text-[12px] group-hover:bg-amber-400 transition">
                Access Merchant Portal →
              </div>
            </button>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div className="rounded-lg border border-emerald-400/30 bg-emerald-500/5 px-3 py-2 text-center">
              <span className="text-[11px] font-semibold text-emerald-200/90">
                ⚡ Join <span className="font-mono font-bold text-emerald-100">{LIVE_SIGNUPS}</span> anonymous techies who signed in securely this morning.
              </span>
            </div>

            <Button
              type="button"
              onClick={handleGoogle}
              disabled={googleBusy}
              variant="outline"
              className="w-full h-11 gap-2 border-border bg-card hover:bg-muted/60 font-semibold"
            >
              <GoogleGlyph />
              {googleBusy ? "Opening Google…" : "Continue with Google"}
            </Button>

            <div className="flex items-start gap-2 rounded-lg border border-sky-400/30 bg-sky-500/5 px-3 py-2.5">
              <Lock className="size-4 text-sky-300 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-snug text-sky-100/85">
                We do <span className="font-bold text-sky-50">NOT</span> collect, read, or store your employer details, real name, or corporate network data. Your profile is automatically masked under an anonymous handle (e.g., <span className="font-mono text-amber-200">Anon_Dev_404</span>). Your workplace will never know.
              </p>
            </div>

            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
              <div className="h-px flex-1 bg-border" />
              or with email
              <div className="h-px flex-1 bg-border" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-2">
              {intent === "merchant" && mode === "signup" && (
                <div className="relative">
                  <Beer className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Your pub / restaurant name"
                    value={pubName}
                    onChange={(e) => setPubName(e.target.value)}
                    className="pl-9 h-11"
                    maxLength={120}
                  />
                </div>
              )}
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder={intent === "merchant" ? "owner@yourpub.com" : "you@gmail.com (personal — not work)"}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="pl-9 h-11"
                  required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="password"
                  placeholder={mode === "signup" ? "Create a password (min 8 chars)" : "Your password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  className="pl-9 h-11"
                  minLength={8}
                  required
                />
              </div>
              <Button
                type="submit"
                disabled={busy}
                className={`w-full h-11 font-semibold ${
                  intent === "merchant"
                    ? "bg-amber-500 hover:bg-amber-400 text-amber-950"
                    : "bg-sky-500 hover:bg-sky-400 text-sky-950"
                }`}
              >
                {busy
                  ? mode === "signup" ? "Creating account…" : "Signing in…"
                  : mode === "signup"
                    ? intent === "merchant" ? "Activate Merchant Portal 🍻" : "Enter Breakroom 👔"
                    : "Sign in 🚪"}
              </Button>
            </form>

            <button
              type="button"
              onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
              className="w-full text-center text-[12px] text-muted-foreground hover:text-foreground transition"
            >
              {mode === "signup" ? (
                <>Already have an account? <span className="text-amber-300 font-semibold">Sign in</span></>
              ) : (
                <>New here? <span className="text-amber-300 font-semibold">Create an account</span></>
              )}
            </button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GoogleGlyph() {
  return (
    <svg className="size-4" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8a12 12 0 1 1 0-24c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 1 0 44 24c0-1.2-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8A12 12 0 0 1 24 16c3 0 5.8 1.1 7.9 3l5.7-5.7A20 20 0 0 0 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3A12 12 0 0 1 12.7 28l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3a12 12 0 0 1-4.1 5.5l6.3 5.3C41.4 35.2 44 30 44 24c0-1.2-.1-2.4-.4-3.5z"/>
    </svg>
  );
}
