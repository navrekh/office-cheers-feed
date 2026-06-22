import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { X } from "lucide-react";

const KEY = "dr_onboarded_v1";

const STEPS = [
  {
    emoji: "🪪",
    title: "Claim your Spy Badge",
    body: "Pick a handle. Your badge becomes a shareable QR — scan it at the bar, drop it in your bio, print it on a sticker.",
    cta: "Open My Badge",
    href: "/profile",
  },
  {
    emoji: "📡",
    title: "Share to get decoded",
    body: "Every time someone scans your QR or opens your dossier, it shows up in your Interception Log. The more you share, the more spies you collect.",
    cta: "Next",
    href: null,
  },
  {
    emoji: "🕵️",
    title: "Decode someone else",
    body: "Tap any handle in the feed or scan a badge at the pub. Their dossier opens — and you appear in their log. Mutual curiosity. That's the game.",
    cta: "Got it — let me in",
    href: null,
  },
] as const;

export function FirstRunCoachmark({ onClaim }: { onClaim?: () => void } = {}) {
  const [open, setOpen] = useState(false);
  const [i, setI] = useState(0);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {}
  }, []);

  function dismiss() {
    try { localStorage.setItem(KEY, "1"); } catch {}
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") dismiss(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!open) return null;
  const step = STEPS[i];
  const last = i === STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[120] grid place-items-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300"
      onClick={dismiss}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md rounded-2xl border border-amber-400/30 bg-gradient-to-br from-neutral-950 to-neutral-900 p-6 pt-12 shadow-2xl shadow-amber-500/10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={dismiss}
          aria-label="Close"
          type="button"
          className="absolute right-3 top-3 z-10 grid size-10 place-items-center rounded-full border border-neutral-700 bg-neutral-900/95 text-neutral-200 hover:bg-amber-400 hover:text-neutral-950 hover:border-amber-400 transition shadow-lg"
        >
          <X className="size-5" />
        </button>

        <div className="mb-4 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400/80">
          <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
          Mission briefing · Step {i + 1} of {STEPS.length}
        </div>

        <div className="mb-2 text-5xl leading-none">{step.emoji}</div>
        <h2 className="text-2xl font-black text-amber-50">{step.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-neutral-400">{step.body}</p>

        <div className="mt-5 flex items-center gap-1.5">
          {STEPS.map((_, idx) => (
            <span
              key={idx}
              className={`h-1 rounded-full transition-all ${
                idx === i ? "w-8 bg-amber-400" : "w-4 bg-neutral-700"
              }`}
            />
          ))}
        </div>

        <div className="mt-6 flex items-center justify-between gap-3">
          <button
            onClick={dismiss}
            className="text-xs font-medium text-neutral-500 hover:text-neutral-300"
          >
            Skip
          </button>
          <div className="flex items-center gap-2">
            {step.href && onClaim ? (
              <button
                onClick={() => { dismiss(); onClaim(); }}
                className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-neutral-950 hover:bg-amber-300 transition"
              >
                {step.cta} →
              </button>
            ) : step.href ? (
              <Link
                to={step.href}
                onClick={dismiss}
                className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-neutral-950 hover:bg-amber-300 transition"
              >
                {step.cta} →
              </Link>
            ) : (
              <button
                onClick={() => (last ? dismiss() : setI(i + 1))}
                className="rounded-lg bg-amber-400 px-4 py-2 text-sm font-bold text-neutral-950 hover:bg-amber-300 transition"
              >
                {step.cta} {last ? "" : "→"}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default FirstRunCoachmark;
