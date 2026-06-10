import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";

const SQUARES = [
  "Muted while talking",
  "Urgent Friday 4:55 PM email",
  "AI mentioned 15 times",
  "Camera off alignment",
  "Link in the comments",
  "Circle back",
  "Synergistic pivot",
  "Pinged on Slack on weekend",
  "Unnecessary slide deck",
];

const WIN_LINES: number[][] = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],            // diagonals
];

function isWin(checked: boolean[]): boolean {
  return WIN_LINES.some((line) => line.every((i) => checked[i]));
}

const BINGO_DRAFT =
  "I just hit BINGO on DrinkedIn! Surviving corporate synergy one meeting at a time. 🍻 #CorporateBingo";

export default function CorporateBingo() {
  const [checked, setChecked] = useState<boolean[]>(() => Array(9).fill(false));
  const [confettiKey, setConfettiKey] = useState(0);
  const [hasWon, setHasWon] = useState(false);

  const won = useMemo(() => isWin(checked), [checked]);

  useEffect(() => {
    if (won && !hasWon) {
      setHasWon(true);
      setConfettiKey((k) => k + 1);
      window.dispatchEvent(
        new CustomEvent("drinkedin:bingo-win", { detail: { draft: BINGO_DRAFT } })
      );
    }
    if (!won && hasWon) setHasWon(false);
  }, [won, hasWon]);

  function toggle(i: number) {
    setChecked((prev) => prev.map((v, idx) => (idx === i ? !v : v)));
  }

  function reset() {
    setChecked(Array(9).fill(false));
  }

  const confettiBits = useMemo(
    () => Array.from({ length: 24 }).map((_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.4,
      duration: 1.2 + Math.random() * 0.8,
      emoji: ["🍻", "✨", "🎉", "🍺"][i % 4],
      rot: Math.random() * 360,
    })),
    [confettiKey],
  );

  return (
    <Card className="p-4 border-border relative overflow-hidden">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold flex items-center gap-1.5">
          <span>🎯</span> B2B Corporate Bingo
        </h4>
        <button
          onClick={reset}
          className="text-[10px] uppercase tracking-wider text-muted-foreground hover:text-primary font-bold"
        >
          Reset
        </button>
      </div>

      <div className="grid grid-cols-3 gap-1.5">
        {SQUARES.map((label, i) => {
          const isOn = checked[i];
          return (
            <button
              key={i}
              type="button"
              onClick={() => toggle(i)}
              className={`relative aspect-square rounded-md border text-[10px] leading-tight p-1.5 text-center font-medium transition-all duration-200 ${
                isOn
                  ? "border-primary bg-primary/15 text-foreground shadow-[0_0_10px_var(--primary)] scale-[0.97]"
                  : "border-border bg-muted/30 text-muted-foreground hover:bg-muted/60 hover:text-foreground active:scale-95"
              }`}
            >
              <span className={isOn ? "opacity-70 line-through decoration-primary" : ""}>{label}</span>
              {isOn && (
                <span className="absolute top-0.5 right-1 text-primary font-black text-[12px] animate-scale-in">
                  ❌
                </span>
              )}
            </button>
          );
        })}
      </div>

      {hasWon && (
        <div className="mt-3 rounded-md border border-primary/60 bg-primary/10 px-3 py-2 text-[11px] leading-snug text-foreground animate-fade-in">
          🎉 <span className="font-bold text-primary">BINGO!</span> Pre-filled a humblebrag into your composer.
        </div>
      )}

      {confettiKey > 0 && (
        <div key={confettiKey} className="pointer-events-none absolute inset-0 z-10 overflow-hidden">
          {confettiBits.map((c, i) => (
            <span
              key={i}
              className="absolute top-0 text-base"
              style={{
                left: `${c.left}%`,
                transform: `rotate(${c.rot}deg)`,
                animation: `drinkedin-confetti ${c.duration}s ${c.delay}s ease-in forwards`,
              }}
            >
              {c.emoji}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
