import { useEffect, useMemo, useState } from "react";
import { Bell, MessageSquare, Loader2 } from "lucide-react";
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
  const [loading, setLoading] = useState(true);

  // Track auth
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

  // Load replies to *my* posts (excluding my own comments)
  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      setLoading(true);
      const { data: myPosts, error: postsErr } = await (supabase as any)
        .from("posts")
        .select("id, body")
        .eq("user_id", userId);
      if (postsErr || !myPosts?.length) {
        if (!cancelled) { setRows([]); setLoading(false); }
        return;
      }
      const postIds = myPosts.map((p: any) => p.id);
      const bodyById: Record<string, string> = {};
      myPosts.forEach((p: any) => { bodyById[p.id] = p.body || ""; });

      const { data: comments } = await (supabase as any)
        .from("comments")
        .select("id, post_id, body, author_alias, user_id, created_at")
        .in("post_id", postIds)
        .neq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (cancelled) return;
      setRows((comments ?? []).map((c: any) => ({ ...c, post_body: bodyById[c.post_id] })));
      setLoading(false);
    })();

    // Realtime — new replies to my posts
    const channel = supabase
      .channel(`notifs-replies-${userId}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, async (payload) => {
        const c: any = payload.new;
        if (!c || c.user_id === userId) return;
        // Verify the post belongs to me
        const { data: post } = await (supabase as any)
          .from("posts").select("id, body, user_id").eq("id", c.post_id).maybeSingle();
        if (!post || post.user_id !== userId) return;
        setRows((prev) => [{ ...c, post_body: post.body } as ReplyRow, ...prev].slice(0, 50));
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
              : "No replies yet. Post something spicy — the office is watching."
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

  return (
    <div className="space-y-3 animate-fade-in">
      {header}

      {loading && (
        <Card className="p-6 border-border text-center text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin inline mr-2" /> Decoding replies…
        </Card>
      )}

      {!loading && userId && rows.length === 0 && (
        <Card className="p-6 border-dashed text-center text-sm text-muted-foreground">
          <MessageSquare className="size-6 mx-auto mb-2 opacity-40" />
          Post your first confession — the moment anyone replies, it lands here.
        </Card>
      )}

      {rows.map((r) => (
        <Card
          key={r.id}
          onClick={() => openPost(r.post_id)}
          className="p-4 border border-primary/30 bg-primary/5 hover:translate-x-0.5 hover:border-primary/60 transition cursor-pointer"
        >
          <div className="flex items-start gap-3">
            <div className="size-10 shrink-0 rounded-full bg-card border border-border grid place-items-center text-lg">
              💬
            </div>
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
    </div>
  );
}
