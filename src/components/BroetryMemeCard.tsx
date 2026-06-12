import { Download, Share2 } from "lucide-react";
import { toast } from "sonner";
import { downloadBroetryCard } from "@/lib/downloadBroetryCard";
import { trackEngagement } from "@/lib/analytics";

const SHARE_FOOTER =
  "Surviving the 4:30 PM corporate synergy matrix? 💀 Escape anonymously to local watering holes on the live tech-park radar grid over at DrinkedIn.me 🍻";

function formatForSocial(text: string): string {
  return `${text.trim()}\n\n---\n${SHARE_FOOTER}`;
}

/**
 * Visual preview of the cringe-worthy Broetry output, framed as a downloadable
 * meme card. Reveals only after the Broetry engine has been engaged.
 */
export default function BroetryMemeCard({ text }: { text: string }) {
  const content = (text || "").trim();
  if (!content) return null;

  async function copySocialText() {
    const formatted = formatForSocial(content);
    try {
      await navigator.clipboard.writeText(formatted);
      trackEngagement("broetry_social_copy", { len: formatted.length });
      toast.success("📋 Algorithm-ready text copied to clipboard!", {
        description: "Ready to share.",
      });
    } catch {
      toast.error("Clipboard blocked", {
        description: "Long-press inside the preview to copy manually.",
      });
    }
  }

  return (
    <div className="pl-14 animate-fade-in">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">
        Broetry Meme Preview
      </div>
      <div
        className="relative rounded-2xl overflow-hidden border border-white/10 shadow-[0_20px_60px_-20px_rgba(0,0,0,0.8)]"
        style={{
          background:
            "linear-gradient(180deg, rgba(21,23,28,1) 0%, rgba(12,13,17,1) 100%)",
        }}
      >
        <div className="px-5 pt-4 pb-3 flex items-center justify-between border-b border-white/5">
          <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-300/90">
            DrinkedIn.me
          </span>
          <span className="text-[10px] text-white/45 font-medium">
            Anonymous Corporate Confession
          </span>
        </div>
        <div className="px-5 sm:px-7 py-6 sm:py-7 min-h-[200px]">
          <p className="whitespace-pre-wrap text-[15.5px] sm:text-[17px] leading-[1.55] font-semibold text-white">
            {content}
          </p>
        </div>
        <div
          className="px-5 py-2.5 text-right border-t border-white/5"
          style={{ background: "rgba(255,255,255,0.02)" }}
        >
          <span className="text-[10px] font-medium text-white/35 tracking-wide">
            Generated on DrinkedIn.me 🍻
          </span>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            trackEngagement("broetry_meme_download", { len: content.length });
            downloadBroetryCard(content);
          }}
          className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[12px] font-bold bg-gradient-to-r from-amber-400 via-amber-300 to-amber-400 text-amber-950 shadow-[0_0_18px_rgba(251,191,36,0.45)] hover:brightness-110 transition"
        >
          <Download className="size-3.5" />
          📥 Download as Image
        </button>
        <button
          type="button"
          onClick={copySocialText}
          className="inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-[12px] font-bold bg-gradient-to-r from-sky-500 via-indigo-500 to-fuchsia-500 text-white shadow-[0_0_18px_rgba(99,102,241,0.45)] hover:brightness-110 transition"
        >
          <Share2 className="size-3.5" />
          📱 Copy Text for LinkedIn / X
        </button>
      </div>
    </div>
  );
}
