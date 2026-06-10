import { useState, type FormEvent } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Mail, Sparkles, ShieldCheck } from "lucide-react";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  reason?: string;
};

export default function AuthModal({ open, onOpenChange, reason }: Props) {
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    const clean = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      toast.error("That doesn't look like a real email. Try again sober.");
      return;
    }
    setSending(true);
    const redirect = typeof window !== "undefined" ? window.location.origin : undefined;
    const { error } = await supabase.auth.signInWithOtp({
      email: clean,
      options: { emailRedirectTo: redirect },
    });
    setSending(false);
    if (error) {
      toast.error("Couldn't send the magic link. Try again.", { description: error.message });
      return;
    }
    setSent(true);
    toast.success("Magic link poured 🍻", { description: "Check your inbox to finish signing in." });
  }

  async function handleGoogle() {
    setGoogleBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: typeof window !== "undefined" ? window.location.origin : undefined,
      });
      if (result.error) {
        toast.error("Google sign-in failed", { description: String((result.error as any)?.message ?? result.error) });
        setGoogleBusy(false);
        return;
      }
      if (result.redirected) return; // browser navigates to Google
      // Token-flow success — modal can close
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Google sign-in failed", { description: e?.message });
    } finally {
      setGoogleBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-amber-500/30 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 shadow-[0_0_60px_rgba(251,191,36,0.15)]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <span className="inline-grid place-items-center size-9 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-300">
              <ShieldCheck className="size-5" />
            </span>
            Sign in to keep drinking 🍻
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {reason || "We use sign-in to protect the platform from spam and liability — but your feed stays 100% anonymous to other users."}
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
            or passwordless magic link
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Magic link */}
          {sent ? (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-sm text-amber-100">
              <div className="flex items-center gap-2 font-bold">
                <Sparkles className="size-4" /> Check your inbox
              </div>
              <p className="mt-1.5 text-amber-100/80 text-xs leading-relaxed">
                We sent a one-tap sign-in link to <span className="font-semibold">{email}</span>. Open it on this device to finish signing in.
              </p>
            </div>
          ) : (
            <form onSubmit={handleMagicLink} className="space-y-2">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  className="pl-9 h-11"
                  required
                />
              </div>
              <Button type="submit" disabled={sending} className="w-full h-11 font-semibold">
                {sending ? "Sending link…" : "Email me a magic link ✨"}
              </Button>
            </form>
          )}

          <p className="text-[11px] text-muted-foreground/80 leading-relaxed">
            🔒 Your email is <span className="font-semibold text-foreground/80">never</span> shown publicly. Posts appear under a corporate alias so your feed stays a confession booth.
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
