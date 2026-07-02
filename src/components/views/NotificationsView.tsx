import { useEffect, useMemo, useState } from "react";
import { Bell, MessageSquare, Loader2, Flame } from "lucide-react";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

type ReplyRow = {
  id: string;
  post_id: string;
  body: string;
  author_alias: string | null;
  user_id: string | null;
  created_at: string;
  post_body?: string | null;
};

function timeAgo(iso: string) {
  const s = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s`;
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function NotificationsView() {
  const [userId, setUserId] = useState<string | null>(null);
  const [rows, setRows] = useState<ReplyRow[]>([]);
  const [trending, setTrending] = useState<ReplyRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data.user?.id ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setUserId(session?.user?.id ?? null);
    });
    return () => { mounted = false; sub.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);

      // Always load trending threads as a fallback / "jump in" prompt.
      const { data: trend } = await (supabase as any)
        .from("comments")
        .select("id, post_id, body, author_alias, user_id, created_at")
        .order("created_at", { ascending: false })
        .limit(12);
      const postIds = Array.from(new Set((trend ?? []).map((c: any) => c.post_id)));
      const bodyById: Record<string, string> = {};
      if (postIds.length) {
        const { data: posts } = await (supabase as any)
          .from("posts").select("id, body_text").in("id", postIds);
        (posts ?? []).forEach((p: any) => { bodyById[p.id] = p.body_text || ""; });
      }
      if (!cancelled) {
        setTrending((trend ?? []).map((c: any) => ({ ...c, post_body: bodyById[c.post_id] })));
      }

      if (!userId) { if (!cancelled) setLoading(false); return; }

      const { data: myPosts } = await (supabase as any)
        .from("posts")
        .select("id, body_text")
        .eq("user_id", userId);
      if (!myPosts?.length) {
        if (!cancelled) { setRows([]); setLoading(false); }
        return;
      }
      const myIds = myPosts.map((p: any) => p.id);
      const myBody: Record<string, string> = {};
      myPosts.forEach((p: any) => { myBody[p.id] = p.body_text || ""; });

      const { data: comments } = await (supabase as any)
        .from("comments")
        .select("id, post_id, body, author_alias, user_id, created_at")
        .in("post_id", myIds)
        .neq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (cancelled) return;
      setRows((comments ?? []).map((c: any) => ({ ...c, post_body: myBody[c.post_id] })));
      setLoading(false);
    })();

    const channel = supabase
      .channel(`notifs-live-${userId ?? "guest"}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, async (payload) => {
        const c: any = payload.new;
        if (!c) return;
        if (userId && c.user_id !== userId) {
          const { data: post } = await (supabase as any)
            .from("posts").select("id, body_text, user_id").eq("id", c.post_id).maybeSingle();
          if (post && post.user_id === userId) {
            setRows((prev) => [{ ...c, post_body: post.body_text } as ReplyRow, ...prev].slice(0, 50));
            return;
          }
        }
        setTrending((prev) => [{ ...c } as ReplyRow, ...prev].slice(0, 12));
      })
      .subscribe();

    return () => { cancelled = true; supabase.removeChannel(channel); };
  }, [userId]);

  const openPost = (postId: string) => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("drinkedin:open-comments", { detail: { postId } }));
  };

  const header = useMemo(() => (
    <Card className="p-4 border-border flex items-center justify-between">
      <div>
        <h2 className="font-display text-xl font-bold leading-tight">Replies to your confessions</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          {userId
            ? rows.length
              ? `${rows.length} anonymous colleague${rows.length === 1 ? "" : "s"} weighed in.`
              : "No replies yet — jump into a live thread below."
            : "Sign in to see who replied to your posts."}
        </p>
      </div>
      {rows.length > 0 && (
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold bg-primary text-primary-foreground shadow-[0_0_12px_var(--primary)]">
          <Bell className="size-3.5" /> {rows.length}
        </span>
      )}
    </Card>
  ), [rows.length, userId]);

  const showTrending = !loading && rows.length === 0;

  return (
    <div className="space-y-3 animate-fade-in">
      {header}

      {loading && (
        <Card className="p-6 border-border text-center text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin inline mr-2" /> Decoding replies…
        </Card>
      )}

      {rows.map((r) => (
        <Card
          key={r.id}
          onClick={() => openPost(r.post_id)}
          className="p-4 border border-primary/30 bg-primary/5 hover:translate-x-0.5 hover:border-primary/60 transition cursor-pointer"
        >
          <div className="flex items-start gap-3">
            <div className="size-10 shrink-0 rounded-full bg-card border border-border grid place-items-center text-lg">💬</div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-muted-foreground uppercase tracking-wide">
                <span className="font-bold text-foreground">{r.author_alias || "anon_colleague"}</span> replied · {timeAgo(r.created_at)} ago
              </p>
              <p className="text-sm leading-snug text-foreground/95 mt-1 line-clamp-2">"{r.body}"</p>
              {r.post_body && (
                <p className="text-[11px] text-muted-foreground mt-1.5 italic line-clamp-1">
                  on your post: {r.post_body}
                </p>
              )}
            </div>
          </div>
        </Card>
      ))}

      {showTrending && (
        <>
          <div className="flex items-center gap-2 px-1 pt-2 text-[11px] uppercase tracking-[0.2em] text-amber-400/80 font-bold">
            <Flame className="size-3.5" /> Live threads to jump into
          </div>
          {trending.length === 0 ? (
            <Card className="p-6 border-dashed text-center text-sm text-muted-foreground">
              <MessageSquare className="size-6 mx-auto mb-2 opacity-40" />
              Quiet in the breakroom. Drop a confession to start the loop.
            </Card>
          ) : (
            trending.map((r) => (
              <Card
                key={`t-${r.id}`}
                onClick={() => openPost(r.post_id)}
                className="p-3 border border-border hover:border-amber-400/40 transition cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="size-8 shrink-0 rounded-full bg-amber-500/15 border border-amber-400/30 grid place-items-center text-sm">🔥</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10.5px] text-muted-foreground uppercase tracking-wide font-mono">
                      {r.author_alias || "anon"} · {timeAgo(r.created_at)} ago
                    </p>
                    <p className="text-sm leading-snug text-foreground/90 mt-0.5 line-clamp-2">"{r.body}"</p>
                    {r.post_body && (
                      <p className="text-[11px] text-muted-foreground mt-1 italic line-clamp-1">
                        thread: {r.post_body}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </>
      )}
    </div>
  );
}

