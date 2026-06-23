import { useMemo } from "react";
import { Bell } from "lucide-react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useMerchantDeals, type MerchantDeal } from "@/lib/useMerchantDeals";
import { dealCoord } from "@/components/ProximityAdDispatcher";
import { haversineKm } from "@/lib/geo";
import { snippetOf } from "@/lib/randomIdentity";
import type { CityKey } from "@/lib/cityStore";
import type { Post } from "@/lib/feedTypes";

export default function NotificationsDrawer({
  open,
  onOpenChange,
  signedIn,
  myPosts,
  origin,
  city,
  postReplies = [],
  onPostReplyClick,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  signedIn: boolean;
  myPosts: Post[];
  origin: { latitude: number; longitude: number } | null;
  city: CityKey;
  postReplies?: Array<{ id: string; postId: string; persona: string; snippet: string; ts: number }>;
  onPostReplyClick?: (postId: string) => void;
}) {
  const { deals } = useMerchantDeals(city);

  const radarPings = useMemo(() => {
    if (!origin) return [] as Array<{ deal: MerchantDeal; distKm: number }>;
    const now = Date.now();
    return deals
      .filter((d) => {
        if (!d.is_active) return false;
        if (d.expires_at && new Date(d.expires_at).getTime() < now) return false;
        return true;
      })
      .map((d) => ({ deal: d, distKm: haversineKm(origin, dealCoord(origin, d.id)) }))
      .filter((x) => isFinite(x.distKm) && x.distKm <= 3)
      .sort((a, b) => a.distKm - b.distKm);
  }, [deals, origin?.latitude, origin?.longitude]);

  const items = useMemo(() => {
    const list: { id: string; emoji: string; title: string; body: string; tone: string }[] = [];

    list.push({
      id: "sec",
      emoji: "🛡️",
      title: "Security Check",
      body: signedIn
        ? "Your session is fully verified. Your real identity is protected, and posts are rendered anonymously."
        : "You're browsing in Off-the-Clock Preview Mode. Sign in to unlock posting and personal telemetry.",
      tone: "border-emerald-500/30 bg-emerald-500/5",
    });

    for (const p of myPosts) {
      if (p.cheers_count >= 50) {
        list.push({
          id: `milestone-50-${p.id}`,
          emoji: "🔥",
          title: "Breakthrough! 50 Cheers cleared",
          body: `Your post "${snippetOf(p.body_text)}" just hit ${p.cheers_count} Cheers. Your corporate synergy index is skyrocketing.`,
          tone: "border-amber-400/40 bg-amber-500/10",
        });
      } else if (p.cheers_count >= 10) {
        list.push({
          id: `milestone-10-${p.id}`,
          emoji: "🔥",
          title: "Breakthrough! 10 Cheers cleared",
          body: `Your post "${snippetOf(p.body_text)}" just hit ${p.cheers_count} Cheers. Your corporate synergy index is skyrocketing.`,
          tone: "border-amber-400/40 bg-amber-500/10",
        });
      }
    }

    list.push({
      id: "pm",
      emoji: "⚠️",
      title: "Urgent PM Ping",
      body: "A sprint retrospective has been scheduled for 5:00 PM. Better prepare a double pour.",
      tone: "border-destructive/40 bg-destructive/5",
    });

    return list;
  }, [signedIn, myPosts]);

  function fmtDist(km: number): string {
    if (km < 1) return `${Math.max(50, Math.round((km * 1000) / 50) * 50)}m away`;
    return `${km.toFixed(1)}km away`;
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-[380px] sm:max-w-[420px] bg-gradient-to-b from-zinc-950 via-zinc-950/95 to-zinc-900 border-l border-amber-500/20">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2 text-base">
            <Bell className="size-4 text-amber-300" />
            Notifications Hub
          </SheetTitle>
          <SheetDescription className="text-xs">
            Contextual corporate alerts. Refilled at every sip.
          </SheetDescription>
        </SheetHeader>
        <div className="mt-4 space-y-4 overflow-y-auto max-h-[calc(100dvh-7rem)] pr-1">
          {postReplies.length > 0 && (
            <section className="space-y-2">
              <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300 px-0.5 flex items-center gap-1.5">
                💬 Replies to Your Posts
                <span className="text-[9px] font-mono font-bold rounded-full bg-amber-400/20 text-amber-200 px-1.5 py-0.5 border border-amber-400/40">
                  {postReplies.length}
                </span>
              </h3>
              {postReplies.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => onPostReplyClick?.(r.postId)}
                  className="w-full text-left rounded-lg border border-amber-400/25 bg-amber-500/[0.06] p-3 hover:bg-amber-500/[0.12] transition"
                >
                  <p className="text-[12.5px] font-semibold text-amber-100 leading-snug">
                    💬 An anonymous colleague replied to your post
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                    <span className="font-bold text-cyan-200">{r.persona}</span>
                    {r.snippet ? ` · on "${r.snippet}${r.snippet.length >= 80 ? "…" : ""}"` : ""}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">Just now · tap to jump</p>
                </button>
              ))}
            </section>
          )}

          <section className="space-y-2.5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground px-0.5">
              General Alerts
            </h3>
            {items.map((n) => (
              <div key={n.id} className={`rounded-lg border ${n.tone} p-3`}>
                <div className="flex items-start gap-2.5">
                  <div className="size-9 shrink-0 rounded-md bg-card border border-border grid place-items-center text-lg">
                    {n.emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold leading-snug text-foreground">{n.title}</p>
                    <p className="text-[11.5px] text-muted-foreground mt-1 leading-relaxed">{n.body}</p>
                  </div>
                </div>
              </div>
            ))}
          </section>

          <section className="space-y-2.5">
            <h3 className="text-[10px] font-black uppercase tracking-[0.18em] text-amber-300 px-0.5 flex items-center gap-1.5">
              📡 Radar Pings Near You
              {radarPings.length > 0 && (
                <span className="text-[9px] font-mono font-bold rounded-full bg-amber-400/20 text-amber-200 px-1.5 py-0.5 border border-amber-400/40">
                  {radarPings.length}
                </span>
              )}
            </h3>
            {!origin ? (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-[11.5px] text-muted-foreground">
                Enable browser location to see active flash deals within 3 km of you.
              </div>
            ) : radarPings.length === 0 ? (
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3 text-[11.5px] text-muted-foreground">
                No live merchant pings within 3 km right now. The radar is quiet.
              </div>
            ) : (
              radarPings.map(({ deal, distKm }) => (
                <div
                  key={deal.id}
                  className="rounded-lg border border-amber-400/40 bg-gradient-to-br from-amber-500/10 to-transparent p-3 shadow-[0_0_14px_-4px_rgba(251,191,36,0.4)]"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="size-9 shrink-0 rounded-md bg-gradient-to-br from-amber-400/40 to-amber-700/30 border border-amber-300/40 grid place-items-center text-base">
                      🍺
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[13px] font-bold leading-snug text-amber-100 truncate">
                          {deal.pub_name}
                        </p>
                        <span className="text-[10px] font-mono font-bold text-amber-300 tabular-nums shrink-0">
                          {fmtDist(distKm)}
                        </span>
                      </div>
                      <p className="text-[11.5px] text-amber-50/85 mt-1 leading-relaxed">
                        {deal.deal_text}
                      </p>
                      <div className="mt-2 flex items-center gap-1.5">
                        <span
                          className={`text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded ${
                            deal.urgency_level >= 3
                              ? "bg-red-500/20 text-red-200 border border-red-400/40"
                              : deal.urgency_level === 2
                                ? "bg-amber-500/20 text-amber-200 border border-amber-400/40"
                                : "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40"
                          }`}
                        >
                          Urgency {deal.urgency_level}
                        </span>
                        {deal.neighborhood && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            · {deal.neighborhood}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
