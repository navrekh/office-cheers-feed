import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type Props = {
  onClose: () => void;
};

const CACHE_KEYS = [
  "drinkedin.cache.posts",
  "drinkedin.cache.comments",
  "drinkedin.rate.posts",
  "drinkedin.visited",
  "drinkedin.tokenlens.loopCount",
];

function emit(name: string, detail?: unknown) {
  window.dispatchEvent(new CustomEvent(name, { detail }));
}

export default function DevConsole({ onClose }: Props) {
  const [outage, setOutage] = useState(false);
  const [bursting, setBursting] = useState(false);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function simulateBurst() {
    if (bursting) return;
    setBursting(true);
    emit("drinkedin:dev-burst", { count: 50 });
    toast.success("Injected 50 simulated posts 📈");
    setTimeout(() => setBursting(false), 1500);
  }

  function clearCache() {
    try {
      CACHE_KEYS.forEach((k) => localStorage.removeItem(k));
    } catch {}
    emit("drinkedin:dev-clear-cache");
    toast.success("Local cache cleared 🧽");
  }

  function toggleOutage() {
    const next = !outage;
    setOutage(next);
    emit("drinkedin:dev-toggle-outage", { outage: next });
    toast(next ? "Mock outage ON ⚠️" : "Mock outage OFF ✅", {
      description: next
        ? "Realtime channel detached. Skeletons + local fallback should show."
        : "Reconnecting realtime channel.",
    });
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center bg-background/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-xl border border-primary/40 bg-card/95 backdrop-blur p-5 shadow-2xl shadow-primary/20">
        <div className="flex items-center justify-between mb-3">
          <div>
            <div className="text-[10px] uppercase tracking-wider text-primary font-bold">
              Internal · Local-only
            </div>
            <h3 className="text-base font-bold flex items-center gap-2">
              🛠️ DrinkedIn Dev Console
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground text-xl leading-none"
            aria-label="Close dev console"
          >
            ×
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
          Hidden test rig. Triggered via <kbd className="px-1 py-0.5 rounded bg-muted/60 text-[10px]">Ctrl/⌘ + Shift + D</kbd> or
          long-pressing the DrinkedIn logo. Press <kbd className="px-1 py-0.5 rounded bg-muted/60 text-[10px]">Esc</kbd> to close.
        </p>

        <div className="space-y-2">
          <Button
            onClick={simulateBurst}
            disabled={bursting}
            className="w-full justify-start rounded-lg font-semibold"
            variant="secondary"
          >
            📈 Simulate High Concurrency Sync (50 posts)
          </Button>
          <Button
            onClick={clearCache}
            className="w-full justify-start rounded-lg font-semibold"
            variant="secondary"
          >
            🧽 Clear Local Cache & Rate Limits
          </Button>
          <Button
            onClick={toggleOutage}
            className="w-full justify-start rounded-lg font-semibold"
            variant={outage ? "destructive" : "secondary"}
          >
            {outage ? "🔌 Outage ON · Click to Reconnect" : "🔌 Toggle Mock Network Outage"}
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground/60 mt-4">
          State stays in-browser. Nothing here hits production.
        </p>
      </div>
    </div>
  );
}
