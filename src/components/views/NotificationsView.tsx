import { Bell, MoreHorizontal } from "lucide-react";
import { Card } from "@/components/ui/card";

const MOCK_NOTIFICATIONS = [
  {
    emoji: "⚠️",
    title: "HR flagged your 'Hangover Index' status as highly accurate.",
    meta: "People Operations · 2m",
    tone: "border-destructive/40 bg-destructive/5",
  },
  {
    emoji: "🚨",
    title: "Your Project Manager added a 4:45 PM sync call. System recommends opening a cold one.",
    meta: "Calendar AI · 14m",
    tone: "border-accent/40 bg-accent/5",
  },
  {
    emoji: "🍻",
    title: "12 colleagues from your previous company just clicked 'Cheers' on your liquid refactoring post.",
    meta: "Engagement · 1h",
    tone: "border-primary/40 bg-primary/5",
  },
  {
    emoji: "📈",
    title: "Your team's aggregate blood alcohol content has reached synergistic alignment.",
    meta: "Team Analytics · 3h",
    tone: "border-chart-3/40 bg-chart-3/5",
  },
];

export default function NotificationsView() {
  return (
    <div className="space-y-3 animate-fade-in">
      <Card className="p-4 border-border flex items-center justify-between">
        <div>
          <h2 className="font-display text-xl font-bold leading-tight">Notifications</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            4 new corporate alerts requiring immediate liquid attention.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold bg-primary text-primary-foreground shadow-[0_0_12px_var(--primary)] animate-notif-glow">
          <Bell className="size-3.5" /> 4 new
        </span>
      </Card>
      {MOCK_NOTIFICATIONS.map((n, i) => (
        <Card
          key={i}
          className={`p-4 border ${n.tone} hover:translate-x-0.5 transition cursor-pointer`}
        >
          <div className="flex items-start gap-3">
            <div className="size-10 shrink-0 rounded-full bg-card border border-border grid place-items-center text-lg">
              {n.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm leading-snug text-foreground/95">{n.title}</p>
              <p className="text-[11px] text-muted-foreground mt-1">{n.meta}</p>
            </div>
            <button className="text-muted-foreground hover:text-foreground p-1 shrink-0">
              <MoreHorizontal className="size-4" />
            </button>
          </div>
        </Card>
      ))}
    </div>
  );
}
