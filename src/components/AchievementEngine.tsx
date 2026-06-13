import { useEffect, useRef, useState } from "react";

type AchievementKey =
  | "DESK_DEFENDER"
  | "TAPROOM_BENEFACTOR"
  | "WHISTLEBLOWER_ELITE"
  | "UNDERGROUND_INFILTRATOR";

type AchievementDef = {
  key: AchievementKey;
  name: string;
  trophy: string;
};

const REGISTRY: Record<AchievementKey, AchievementDef> = {
  DESK_DEFENDER: {
    key: "DESK_DEFENDER",
    name: "Desk Defender",
    trophy: "🛡️ Desk Defender: Master of the Emergency Spreadsheet Escape.",
  },
  TAPROOM_BENEFACTOR: {
    key: "TAPROOM_BENEFACTOR",
    name: "Taproom Benefactor",
    trophy: "🍺 Taproom Benefactor: Actively financing colleague decompression loops.",
  },
  WHISTLEBLOWER_ELITE: {
    key: "WHISTLEBLOWER_ELITE",
    name: "Whistleblower Elite",
    trophy: "🔓 Whistleblower Elite: Bypassed the corporate firewall matrix.",
  },
  UNDERGROUND_INFILTRATOR: {
    key: "UNDERGROUND_INFILTRATOR",
    name: "Underground Infiltrator",
    trophy: "📬 Underground Infiltrator: Burner email successfully synchronized with headquarters.",
  },
};

const UNLOCKED_KEY = "drinkedin_achievements_unlocked";
const PINT_COUNT_KEY = "drinkedin_achievement_pints";

function readUnlocked(): Record<string, number> {
  try {
    const raw = window.localStorage.getItem(UNLOCKED_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeUnlocked(map: Record<string, number>) {
  try {
    window.localStorage.setItem(UNLOCKED_KEY, JSON.stringify(map));
  } catch {}
}

type Toast = { id: number; def: AchievementDef };

export default function AchievementEngine() {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const unlockedRef = useRef<Record<string, number>>({});

  useEffect(() => {
    unlockedRef.current = readUnlocked();
  }, []);

  function unlock(key: AchievementKey) {
    if (unlockedRef.current[key]) return;
    const def = REGISTRY[key];
    if (!def) return;
    unlockedRef.current = { ...unlockedRef.current, [key]: Date.now() };
    writeUnlocked(unlockedRef.current);

    // Clipboard brag
    const brag =
      `🏆 ACHIEVEMENT UNLOCKED: I just earned the ${def.name} badge on the DrinkedIn underground breakroom network for successfully dodging corporate compliance protocols. Log your burnout radar and claim your anonymous mask here: https://drinkedin.me`;
    try {
      navigator.clipboard?.writeText(brag).catch(() => {});
    } catch {}

    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, def }]);
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 5200);
  }

  useEffect(() => {
    function onAchievement(e: Event) {
      const detail = (e as CustomEvent).detail as { key?: AchievementKey } | undefined;
      if (detail?.key && REGISTRY[detail.key]) unlock(detail.key);
    }
    function onPint() {
      let count = 0;
      try {
        count = parseInt(window.localStorage.getItem(PINT_COUNT_KEY) || "0", 10) || 0;
      } catch {}
      count += 1;
      try {
        window.localStorage.setItem(PINT_COUNT_KEY, String(count));
      } catch {}
      if (count >= 5) unlock("TAPROOM_BENEFACTOR");
    }
    window.addEventListener("drinkedin:achievement", onAchievement as EventListener);
    window.addEventListener("drinkedin:pint-tapped", onPint as EventListener);
    return () => {
      window.removeEventListener("drinkedin:achievement", onAchievement as EventListener);
      window.removeEventListener("drinkedin:pint-tapped", onPint as EventListener);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      className="pointer-events-none fixed top-4 right-4 z-[100] flex flex-col gap-2 max-w-[340px]"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto animate-[ach-slide_0.45s_ease-out] bg-amber-500/10 border border-amber-500/40 text-amber-400 rounded-xl p-3 shadow-[0_0_20px_rgba(245,158,11,0.15)] backdrop-blur-xl"
        >
          <div className="text-[10px] uppercase tracking-[0.2em] font-extrabold text-amber-300 mb-1">
            🏆 Achievement Unlocked
          </div>
          <div className="text-[12px] font-bold leading-snug text-amber-100">
            {t.def.trophy}
          </div>
          <div className="mt-2 text-[10px] text-amber-300/70 leading-snug">
            📋 Bragging link copied to clipboard! Drop it into your team chat.
          </div>
        </div>
      ))}
      <style>{`@keyframes ach-slide {
        0% { opacity: 0; transform: translateX(40px) scale(0.96); }
        100% { opacity: 1; transform: translateX(0) scale(1); }
      }`}</style>
    </div>
  );
}
