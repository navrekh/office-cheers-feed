import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import DesperationPoll from "@/components/DesperationPoll";
import { trackEngagement } from "@/lib/analytics";

const SHOWN_KEY = "drinkedin_poll_modal_shown_at";
// Re-show the popup only after this many ms (per browser).
const COOLDOWN_MS = 1000 * 60 * 60 * 6; // 6 hours
const DELAY_MS = 1100;

export default function DesperationPollModal({ onSignUp }: { onSignUp: (reason?: string) => void }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    let shouldShow = true;
    try {
      const raw = localStorage.getItem(SHOWN_KEY);
      if (raw) {
        const last = parseInt(raw, 10);
        if (!Number.isNaN(last) && Date.now() - last < COOLDOWN_MS) {
          shouldShow = false;
        }
      }
    } catch { /* ignore */ }

    if (!shouldShow) return;
    const t = window.setTimeout(() => {
      setOpen(true);
      try { localStorage.setItem(SHOWN_KEY, String(Date.now())); } catch { /* ignore */ }
      trackEngagement("desperation_poll_modal_open", {});
    }, DELAY_MS);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg p-0 border-amber-400/30 bg-transparent shadow-[0_0_40px_rgba(251,191,36,0.18)]">
        <DialogTitle className="sr-only">Friday Desperation Index</DialogTitle>
        <DialogDescription className="sr-only">
          One quick anonymous poll on today's corporate burnout vibe.
        </DialogDescription>
        <div className="rounded-lg overflow-hidden">
          <DesperationPoll
            onSignUp={(reason) => {
              setOpen(false);
              onSignUp(reason);
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
