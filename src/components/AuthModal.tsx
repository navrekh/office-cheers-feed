import { useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Mail, Lock, ShieldCheck } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reason?: string;
};

type Mode = "signin" | "signup";

export default function AuthModal({ open, onOpenChange, reason }: Props) {
  const [mode, setMode] = useState<Mode>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      toast.error("That doesn't look like a real email. Try again sober.");
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
          toast.success("You're in 🍻", { description: "Account created. Pouring you a session…" });
          onOpenChange(false);
        } else {
          // Should not happen with auto-confirm enabled, but handle gracefully.
          toast.success("Account created", { description: "Sign in to continue." });
          setMode("signin");
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: clean, password });
        if (error) {
          toast.error("Sign in failed", { description: error.message });
          return;
        }
        toast.success("Welcome back 🍻");
        onOpenChange(false);
      }
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
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
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Google sign-in failed", { description: e?.message });
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-amber-500/30 bg-gradient-to-br from-zinc-950/90 via-zinc-900/90 to-zinc-950/90 backdrop-blur-xl shadow-[0_0_80px_rgba(251,191,36,0.2)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="inline-grid place-items-center size-9 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300">
              <ShieldCheck className="size-5" />
            </span>
            Join the Breakroom 🍻
          </DialogTitle>
          <DialogDescription className="text-muted-foreground leading-relaxed">
            {reason ||
              "Use a personal email — never your work address. Your public posts always stay 100% anonymous behind a corporate alias."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Google */}
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

          <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider text-muted-foreground">
            <div className="h-px flex-1 bg-border" />
            or with personal email
            <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-2">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                type="email"
                placeholder="you@gmail.com (personal — not work)"
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
              className="w-full h-11 font-semibold bg-amber-500 hover:bg-amber-400 text-zinc-950"
            >
              {busy
                ? mode === "signup"
                  ? "Creating account…"
                  : "Signing in…"
                : mode === "signup"
                ? "Create account 🍻"
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

          <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
            🔒 No inbox round-trip — you're in instantly. Email is <span className="font-semibold text-foreground/80">never</span> shown publicly; posts appear under a corporate alias.
          </p>
        </div>
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
