import { useState } from "react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";
import { Flame, Loader2, Copy, Shuffle } from "lucide-react";
import { generateRoast } from "@/lib/roast.functions";

type Intensity = "mild" | "spicy" | "nuclear";

const INTENSITIES: { id: Intensity; label: string; emoji: string }[] = [
  { id: "mild", label: "Mild", emoji: "🌶️" },
  { id: "spicy", label: "Spicy", emoji: "🔥" },
  { id: "nuclear", label: "Nuclear", emoji: "☢️" },
];

const EXAMPLES = [
  "Let's circle back on this offline and align on the synergy framework.",
  "Quick favor — can you jump on a call at 6:45 PM IST? Won't take more than 5 min.",
  "We're not doing layoffs, we're rebalancing the talent portfolio.",
  "Per my last email, kindly do the needful at the earliest.",
  "I noticed you logged off at 6 — everything ok? Just checking on bandwidth.",
];

export default function RoastMyManager() {
  const roastFn = useServerFn(generateRoast);
  const [text, setText] = useState("");
  const [intensity, setIntensity] = useState<Intensity>("spicy");
  const [loading, setLoading] = useState(false);
  const [roast, setRoast] = useState<string | null>(null);

  async function run() {
    const clean = text.trim();
    if (clean.length < 3) {
      toast.error("Paste at least a sentence of corporate-speak.");
      return;
    }
    setLoading(true);
    setRoast(null);
    try {
      const { roast } = await roastFn({ data: { text: clean, intensity } });
      setRoast(roast);
    } catch (e: any) {
      toast.error(e?.message || "Roast failed. Try again.");
    } finally {
      setLoading(false);
    }
  }

  function shuffleExample() {
    const next = EXAMPLES[Math.floor(Math.random() * EXAMPLES.length)];
    setText(next);
    setRoast(null);
  }

  function copyRoast() {
    if (!roast) return;
    try {
      navigator.clipboard.writeText(`${roast}\n\n— anonymously roasted on drinkedin.me 🍻`);
      toast.success("Roast copied. Drop it in the group chat.");
    } catch {}
  }

  return (
    <div
      className="rounded-2xl p-5 mt-6 shadow-2xl bg-[#0d0d0d]/90 backdrop-blur-xl border border-dashed border-orange-900/40"
    >
      <div className="flex items-center gap-2 mb-1">
        <Flame className="size-3.5 text-orange-400" />
        <h3 className="text-[11px] uppercase tracking-[0.22em] font-extrabold text-orange-300">
          AI Manager Roast Engine
        </h3>
      </div>
      <p className="text-[11px] text-muted-foreground leading-snug mb-3">
        Paste any soul-crushing Slack message, email, or meeting line. Get an instant, anonymous breakroom-grade burn.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        maxLength={800}
        placeholder={`e.g. "Let's take this offline and circle back tomorrow."`}
        className="w-full resize-none rounded-lg bg-black/60 border border-[#2b2b2b] text-[12px] text-foreground/90 placeholder:text-muted-foreground/60 px-3 py-2 focus:outline-none focus:border-orange-500/40"
      />

      <div className="flex items-center justify-between mt-2 gap-2 flex-wrap">
        <div className="flex gap-1">
          {INTENSITIES.map((i) => (
            <button
              key={i.id}
              type="button"
              onClick={() => setIntensity(i.id)}
              className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border transition ${
                intensity === i.id
                  ? "bg-orange-500/20 border-orange-500/60 text-orange-200"
                  : "bg-black/40 border-[#2b2b2b] text-muted-foreground hover:text-foreground"
              }`}
            >
              {i.emoji} {i.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={shuffleExample}
          className="text-[10px] font-semibold text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
        >
          <Shuffle className="size-3" /> example
        </button>
      </div>

      <button
        type="button"
        onClick={run}
        disabled={loading}
        className="mt-3 w-full rounded-xl px-3 py-2.5 text-[12px] font-extrabold text-black bg-gradient-to-r from-orange-400 via-red-400 to-orange-400 shadow-[0_0_18px_rgba(251,146,60,0.45)] hover:brightness-110 transition disabled:opacity-60"
      >
        {loading ? (
          <span className="inline-flex items-center gap-2 justify-center">
            <Loader2 className="size-3.5 animate-spin" /> Lighting the roast…
          </span>
        ) : (
          "🔥 Generate Anonymous Roast"
        )}
      </button>

      {roast && (
        <div className="mt-3 rounded-xl border border-orange-500/30 bg-orange-500/5 p-3 animate-fade-in">
          <p className="text-[13px] leading-snug text-orange-100 whitespace-pre-wrap break-words">
            {roast}
          </p>
          <button
            type="button"
            onClick={copyRoast}
            className="mt-2 inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-orange-300 hover:text-orange-200"
          >
            <Copy className="size-3" /> copy & share
          </button>
        </div>
      )}
    </div>
  );
}
