import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { useDayContext, getMidWeekMetric, minutesUntilFridayNoon } from "@/lib/dailyMatrix";

const PAIN_EMOJIS = ["😐", "😬", "😩", "💀", "🪦"] as const;

export default function MidWeekSurvivalTracker() {
  const ctx = useDayContext();
  const metric = getMidWeekMetric(ctx.weekday);
  const [pain, setPain] = useState<number | null>(null);
  const [streak, setStreak] = useState(0);
  const [eta, setEta] = useState<number>(0);

  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const stored = localStorage.getItem(`drinkedin.midweek.pain.${today}`);
      if (stored) setPain(Number(stored));
      const s = localStorage.getItem("drinkedin.midweek.streak");
      if (s) setStreak(Number(s));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    setEta(minutesUntilFridayNoon());
    const id = setInterval(() => setEta(minutesUntilFridayNoon()), 60_000);
    return () => clearInterval(id);
  }, []);

  function logPain(i: number) {
    setPain(i);
    try {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(`drinkedin.midweek.pain.${today}`, String(i));
      const last = localStorage.getItem("drinkedin.midweek.streak.lastDay");
      const nextStreak = last === today ? streak : streak + 1;
      localStorage.setItem("drinkedin.midweek.streak", String(nextStreak));
      localStorage.setItem("drinkedin.midweek.streak.lastDay", today);
      setStreak(nextStreak);
    } catch { /* ignore */ }
  }

  const hrs = Math.floor(eta / 60);
  const days = Math.floor(hrs / 24);
  const remH = hrs - days * 24;
  const countdown = days > 0 ? `${days}d ${remH}h` : `${hrs}h ${eta % 60}m`;

  return (
    <Card className="p-5 border-border bg-gradient-to-br from-amber-500/[0.06] via-card to-fuchsia-500/[0.04] relative overflow-hidden">
      <div className="absolute -top-12 -right-12 size-32 rounded-full bg-amber-400/10 blur-3xl pointer-events-none" />
      <div className="flex items-start justify-between gap-3 mb-3 relative">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-amber-300/80 font-bold">
            📅 Mid-Week Survival Tracker
          </div>
          <h3 className="text-base sm:text-lg font-black mt-0.5 flex items-center gap-2">
            <span className="text-2xl">{metric.emoji}</span>
            {metric.title}
          </h3>
        </div>
        <div className="text-right shrink-0">
          <div className="text-[9px] uppercase tracking-wider text-muted-foreground">Friday in</div>
          <div className="text-sm font-mono font-bold text-fuchsia-300">{countdown}</div>
        </div>
      </div>

      <div className="relative">
        <div className="flex items-baseline justify-between mb-1">
          <span className="text-[11px] text-muted-foreground">{metric.metric}</span>
          <span className="text-sm font-black text-foreground">{metric.value}%</span>
        </div>
        <div className="h-2 rounded-full bg-muted/40 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 transition-all duration-700"
            style={{ width: `${metric.value}%` }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground/90 italic mt-2 leading-snug">
          {metric.flavor}
        </p>
      </div>

      <div className="mt-4 pt-3 border-t border-border/60">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-[11px] font-semibold text-foreground/90">
            🩻 Log today's pain
          </span>
          <span className="text-[10px] text-muted-foreground">
            🔥 Streak: <span className="text-amber-300 font-bold">{streak}d</span>
          </span>
        </div>
        <div className="flex gap-1.5">
          {PAIN_EMOJIS.map((e, i) => (
            <button
              key={e}
              type="button"
              onClick={() => logPain(i)}
              className={`flex-1 h-10 rounded-md border text-xl transition-all ${
                pain === i
                  ? "border-amber-400 bg-amber-400/15 scale-105 shadow-[0_0_12px_rgba(251,191,36,0.4)]"
                  : "border-border/60 hover:bg-muted/60 hover:scale-105"
              }`}
              aria-label={`Pain level ${i + 1}`}
            >
              {e}
            </button>
          ))}
        </div>
        {pain !== null && (
          <p className="text-[10px] text-muted-foreground/80 mt-2 text-center animate-fade-in">
            Logged anonymously to your local survival diary.
          </p>
        )}
      </div>
    </Card>
  );
}
