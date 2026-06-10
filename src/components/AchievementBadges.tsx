import { useEffect, useState } from "react";

type BadgeDef = {
  id: string;
  label: string;
  emoji: string;
  desc: string;
  check: (s: AchievementState) => boolean;
};

export type AchievementState = {
  cheers: number;
  broetry: number;
  whistleblower: boolean;
  legendary: boolean;
};

export const ACH_KEYS = {
  cheers: "drinkedin.ach.cheers",
  broetry: "drinkedin.ach.broetry",
  whistleblower: "drinkedin.ach.whistleblower",
  legendary: "drinkedin.ach.legendary",
  myPosts: "drinkedin.ach.myPosts",
};

const BADGES: BadgeDef[] = [
  { id: "junior", label: "Junior Sipper", emoji: "🍺", desc: "Cheers'd 5 times.", check: (s) => s.cheers >= 5 },
  { id: "synergy", label: "Synergy Enabler", emoji: "🚀", desc: "Ran Broetry 3 times.", check: (s) => s.broetry >= 3 },
  { id: "whistle", label: "Whistleblower", emoji: "🎭", desc: "Posted in Confession Mode.", check: (s) => s.whistleblower },
  { id: "legend", label: "Legendary Asset", emoji: "👑", desc: "Your post broke 100 cheers.", check: (s) => s.legendary },
];

function readState(): AchievementState {
  if (typeof window === "undefined") {
    return { cheers: 0, broetry: 0, whistleblower: false, legendary: false };
  }
  try {
    return {
      cheers: parseInt(localStorage.getItem(ACH_KEYS.cheers) || "0", 10) || 0,
      broetry: parseInt(localStorage.getItem(ACH_KEYS.broetry) || "0", 10) || 0,
      whistleblower: localStorage.getItem(ACH_KEYS.whistleblower) === "1",
      legendary: localStorage.getItem(ACH_KEYS.legendary) === "1",
    };
  } catch {
    return { cheers: 0, broetry: 0, whistleblower: false, legendary: false };
  }
}

export default function AchievementBadges() {
  const [state, setState] = useState<AchievementState>(() => ({ cheers: 0, broetry: 0, whistleblower: false, legendary: false }));

  useEffect(() => {
    setState(readState());
    function refresh() { setState(readState()); }
    window.addEventListener("drinkedin:achievement", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("drinkedin:achievement", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return (
    <div className="border-t border-border px-4 py-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">
        Corporate Badges
      </div>
      <div className="grid grid-cols-4 gap-2">
        {BADGES.map((b) => {
          const unlocked = b.check(state);
          return (
            <div
              key={b.id}
              title={`${b.label} — ${b.desc}${unlocked ? "" : " (locked)"}`}
              className={`group relative grid place-items-center aspect-square rounded-lg border text-xl transition ${
                unlocked
                  ? "border-primary/60 bg-primary/10 text-foreground shadow-[0_0_14px_var(--primary)] animate-fade-in"
                  : "border-border bg-muted/30 text-muted-foreground/40 grayscale"
              }`}
            >
              <span className={unlocked ? "" : "opacity-50"}>{b.emoji}</span>
              <span className="pointer-events-none absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-full whitespace-nowrap rounded bg-popover/95 border border-border px-1.5 py-0.5 text-[10px] font-semibold opacity-0 group-hover:opacity-100 transition z-20">
                {b.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Helper that other modules use to bump counters and notify
export function bumpAchievement(key: keyof typeof ACH_KEYS, value?: number | boolean) {
  if (typeof window === "undefined") return;
  try {
    const storageKey = ACH_KEYS[key];
    if (typeof value === "boolean") {
      localStorage.setItem(storageKey, value ? "1" : "0");
    } else {
      const n = parseInt(localStorage.getItem(storageKey) || "0", 10) || 0;
      const next = n + (value ?? 1);
      localStorage.setItem(storageKey, String(next));
    }
    window.dispatchEvent(new CustomEvent("drinkedin:achievement"));
  } catch {}
}
