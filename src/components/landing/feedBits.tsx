// Small leaf UI bits extracted from src/routes/index.tsx during the cleanup pass:
// ComposerChip, ActionBtn, SocialAction (+ SOCIAL_THEME), ReactionStrip (+ QUICK_REACTIONS),
// TrendItem, CopeItem, ComingSoonView. Pure presentational, except ReactionStrip which
// keeps its own internal counter state and dispatches an analytics event.

import { useState, type ReactNode } from "react";
import { Plus, BookmarkPlus } from "lucide-react";
import { Card } from "@/components/ui/card";

// ----- ComposerChip ---------------------------------------------------------
export function ComposerChip({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <button
      type="button"
      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:bg-muted/60 hover:text-foreground transition"
    >
      {icon}
      {label}
    </button>
  );
}

// ----- ActionBtn ------------------------------------------------------------
export function ActionBtn({
  icon,
  label,
  onClick,
  active,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-semibold transition ${
        active
          ? "text-primary bg-primary/10"
          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

// ----- SocialAction + theme palette ----------------------------------------
export const SOCIAL_THEME = {
  amber:    { text: "group-hover:text-amber-300",    bg: "group-hover:bg-amber-400/10",    active: "text-amber-300" },
  sky:      { text: "group-hover:text-sky-300",      bg: "group-hover:bg-sky-400/10",      active: "text-sky-300" },
  emerald:  { text: "group-hover:text-emerald-300",  bg: "group-hover:bg-emerald-400/10",  active: "text-emerald-300" },
  fuchsia:  { text: "group-hover:text-fuchsia-300",  bg: "group-hover:bg-fuchsia-400/10",  active: "text-fuchsia-300" },
} as const;

export function SocialAction({
  icon, label, count, countKey, onClick, active, theme = "sky",
}: {
  icon: ReactNode;
  label: string;
  count?: number;
  countKey?: number;
  onClick?: () => void;
  active?: boolean;
  theme?: keyof typeof SOCIAL_THEME;
}) {
  const t = SOCIAL_THEME[theme];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`group flex-1 flex items-center justify-center gap-2 py-2 text-[13px] font-semibold transition ${active ? t.active : "text-muted-foreground"}`}
    >
      <span className={`size-8 rounded-full grid place-items-center transition ${t.bg} ${active ? "" : t.text}`}>
        {icon}
      </span>
      {typeof count === "number" && count > 0 && (
        <span
          key={countKey}
          className={`tabular-nums ${countKey ? "animate-count-bump" : ""} ${active ? "" : t.text}`}
        >
          {count >= 1000 ? `${(count / 1000).toFixed(1)}k` : count}
        </span>
      )}
    </button>
  );
}

// ----- ReactionStrip --------------------------------------------------------
export const QUICK_REACTIONS = ["🍻", "😂", "💀", "🔥", "😭"] as const;

export function ReactionStrip({ postId, onCheers }: { postId: string; onCheers: () => void }) {
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [floats, setFloats] = useState<{ id: number; emoji: string; x: number }[]>([]);
  function tap(emoji: string) {
    setCounts((c) => ({ ...c, [emoji]: (c[emoji] ?? 0) + 1 }));
    const id = Date.now() + Math.random();
    setFloats((f) => [...f, { id, emoji, x: 20 + Math.random() * 60 }]);
    setTimeout(() => setFloats((f) => f.filter((x) => x.id !== id)), 900);
    if (emoji === "🍻") onCheers();
    import("@/lib/analytics").then((m) =>
      m.trackEngagement("post_reaction", { post_id: postId, emoji })
    );
  }
  return (
    <div className="relative px-4 pb-2 pt-1 flex items-center gap-1.5 flex-wrap">
      {QUICK_REACTIONS.map((e) => {
        const n = counts[e] ?? 0;
        return (
          <button
            key={e}
            type="button"
            onClick={() => tap(e)}
            aria-label={`React with ${e}`}
            className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[12px] font-bold transition hover:scale-110 active:scale-95 ${
              n > 0
                ? "border-amber-400/60 bg-amber-400/10 text-amber-200 shadow-[0_0_14px_-4px_rgba(251,191,36,0.55)]"
                : "border-border bg-muted/30 text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <span className="text-[14px] leading-none">{e}</span>
            {n > 0 && <span className="tabular-nums">{n}</span>}
          </button>
        );
      })}
      <div className="pointer-events-none absolute inset-0 overflow-visible">
        {floats.map((f) => (
          <span
            key={f.id}
            className="absolute bottom-2 text-2xl animate-reaction-float"
            style={{ left: `${f.x}%` }}
          >
            {f.emoji}
          </span>
        ))}
      </div>
    </div>
  );
}

// ----- TrendItem / CopeItem -------------------------------------------------
export function TrendItem({ title, meta }: { title: string; meta: string }) {
  return (
    <li className="flex gap-2 group cursor-pointer">
      <Plus className="size-3.5 mt-1 text-muted-foreground group-hover:text-primary shrink-0" />
      <div>
        <div className="font-semibold text-foreground leading-snug group-hover:text-primary">
          {title}
        </div>
        <div className="text-muted-foreground text-[11px]">{meta}</div>
      </div>
    </li>
  );
}

export function CopeItem({ tag, title, stat }: { tag: string; title: string; stat: string }) {
  return (
    <li className="flex gap-2 cursor-pointer group">
      <BookmarkPlus className="size-3.5 mt-1 text-muted-foreground group-hover:text-accent shrink-0" />
      <div>
        <div className="text-[10px] uppercase tracking-wider text-accent font-bold">
          {tag}
        </div>
        <div className="font-semibold text-foreground leading-snug group-hover:text-accent">
          {title}
        </div>
        <div className="text-muted-foreground text-[11px]">{stat}</div>
      </div>
    </li>
  );
}

// ----- ComingSoonView -------------------------------------------------------
export function ComingSoonView({ title, emoji, copy }: { title: string; emoji: string; copy: string }) {
  return (
    <Card className="p-10 text-center border-border space-y-3 animate-in fade-in duration-300">
      <div className="text-5xl">{emoji}</div>
      <h2 className="text-xl font-bold">{title}</h2>
      <p className="text-sm text-muted-foreground max-w-sm mx-auto leading-relaxed">{copy}</p>
      <p className="text-xs text-muted-foreground/70 italic pt-2">
        (Sober-rolling out next sprint.)
      </p>
    </Card>
  );
}
