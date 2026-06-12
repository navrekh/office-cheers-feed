import { useEffect, useState } from "react";
import { useAuth } from "@/lib/useAuth";
import { lovable } from "@/integrations/lovable/index";
import { trackEngagement } from "@/lib/analytics";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

/**
 * Floating bottom-anchored glassmorphism CTA that captures high-duration
 * sessions with a 1-click anonymous Google sign-in. Hides itself once the
 * user is authenticated or dismisses the bar.
 */
export default function FloatingMaskCta() {
  const { user, loading } = useAuth();
  const [dismissed, setDismissed] = useState(false);
  const [busy, setBusy] = useState(false);

  // Persist dismissal across the tab session only.
  useEffect(() => {
    try {
      if (sessionStorage.getItem("drinkedin.maskCta.dismissed") === "1") {
        setDismissed(true);
      }
    } catch { /* ignore */ }
  }, []);

  if (loading || user || dismissed) return null;

  async function handleClaim() {
    trackEngagement("floating_mask_cta_click");
    setBusy(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error("Google sign-in failed", { description: String(result.error) });
        setBusy(false);
        return;
      }
      // result.redirected → browser will navigate; otherwise session is set.
    } catch (err: any) {
      toast.error("Couldn't open Google sign-in", { description: err?.message });
      setBusy(false);
    }
  }

  function handleDismiss() {
    trackEngagement("floating_mask_cta_dismiss");
    try { sessionStorage.setItem("drinkedin.maskCta.dismissed", "1"); } catch { /* ignore */ }
    setDismissed(true);
  }

  return (
    <div
      role="region"
      aria-label="Claim your anonymous mask"
      className="fixed inset-x-0 bottom-0 z-50 pb-[env(safe-area-inset-bottom)] pointer-events-none"
    >
      <div className="mx-auto max-w-3xl px-3 pb-3 pointer-events-none">
        <div
          className="pointer-events-auto flex items-center gap-3 rounded-2xl px-3 sm:px-4 py-2.5 shadow-[0_12px_48px_-12px_rgba(0,0,0,0.65)]"
          style={{
            background: "rgba(24, 20, 20, 0.75)",
            backdropFilter: "blur(10px)",
            WebkitBackdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <button
            type="button"
            onClick={handleClaim}
            disabled={busy}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-amber-950 font-bold text-[12.5px] sm:text-sm px-3 sm:px-4 py-2.5 shadow-[0_0_22px_rgba(251,191,36,0.55)] hover:brightness-110 transition disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {busy ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Opening Google…
              </>
            ) : (
              <>
                <span className="text-base leading-none">🎭</span>
                <span className="truncate">
                  Claim Your Anonymous Mask <span className="hidden sm:inline opacity-80">(1-Click Google Sign-In)</span>
                </span>
              </>
            )}
          </button>
          <button
            type="button"
            onClick={handleDismiss}
            aria-label="Dismiss"
            className="shrink-0 size-8 grid place-items-center rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition text-lg leading-none"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}
