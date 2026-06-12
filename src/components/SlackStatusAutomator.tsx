import { useState } from "react";
import { toast } from "sonner";
import { MessageSquare, Clipboard, X } from "lucide-react";

type Tone = "danger" | "thread" | "chill";

const STATUS_BY_TONE: Record<Tone, string> = {
  chill:
    "🔋 Corporate Battery: 1% | 🏃‍♂️ Escaping Matrix Early | 🛰️ Tracked on DrinkedIn.me",
  thread:
    "🔴 Status: Constant Huddle Overload | 🔄 Syncing Cross-Functional Synergies Offline",
  danger:
    "🚨 Current Vibe: Running on Pure Caffeine & Dark Humor | 🤫 Do Not Disturb",
};

export default function SlackStatusAutomator({ choice }: { choice: Tone | null }) {
  const [open, setOpen] = useState(false);
  const status = choice ? STATUS_BY_TONE[choice] : STATUS_BY_TONE.chill;

  async function copy() {
    try {
      await navigator.clipboard.writeText(status);
      toast.success("🚀 Status copied! Paste into Slack or Teams to signal the pod.");
    } catch {
      toast.error("Clipboard blocked — long-press the status text to copy manually.");
    }
  }

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full inline-flex items-center justify-center gap-2 rounded-lg border border-cyan-400/40 bg-gradient-to-r from-cyan-500/15 via-sky-500/15 to-cyan-500/15 hover:from-cyan-500/25 hover:to-cyan-500/25 hover:border-cyan-300/70 transition px-3 py-2.5 text-[12px] font-bold tracking-wide text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.18)]"
      >
        <MessageSquare className="h-3.5 w-3.5" />
        💬 Automate My Friday Slack Status
      </button>

      {open && (
        <div
          className="mt-2 rounded-xl p-3 animate-fade-in"
          style={{
            background:
              "linear-gradient(135deg, rgba(34,211,238,0.08), rgba(168,85,247,0.08))",
            border: "1px solid rgba(34,211,238,0.3)",
          }}
        >
          <div className="flex items-start justify-between gap-2 mb-2">
            <span className="text-[10px] uppercase tracking-wider font-mono text-cyan-300/90">
              Preview · Slack / Teams Status
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-muted-foreground hover:text-foreground transition"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <p className="text-[13px] leading-snug font-mono text-foreground/95 bg-black/30 rounded-md p-2.5 select-all">
            {status}
          </p>
          <button
            type="button"
            onClick={copy}
            className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-[12px] font-bold transition hover:scale-[1.02]"
            style={{
              background: "linear-gradient(135deg, #06b6d4, #8b5cf6)",
              color: "white",
              boxShadow: "0 4px 14px -2px rgba(139,92,246,0.5)",
            }}
          >
            <Clipboard className="h-3.5 w-3.5" />
            📋 Copy Status & Emojis
          </button>
        </div>
      )}
    </div>
  );
}
