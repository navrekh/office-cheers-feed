import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Hash, AtSign, Loader2, ImageOff } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type FeedPost = {
  id: string;
  author_name: string;
  author_headline: string;
  body_text: string;
  created_at: string;
  attached_visual_url: string | null;
  media_type: string | null;
  tags: string[] | null;
  cheers_count: number;
};

function initials(name: string) {
  return name
    .replace(/[^A-Za-z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

// Render body with #tag and @mention highlights
function RichBody({ text }: { text: string }) {
  const parts = text.split(/(\s+)/);
  return (
    <p className="text-[13.5px] leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
      {parts.map((p, i) => {
        if (/^#[A-Za-z0-9_]{2,}$/.test(p)) {
          return (
            <span key={i} className="text-fuchsia-300 font-semibold">
              {p}
            </span>
          );
        }
        if (/^@[A-Za-z0-9_]{2,}$/.test(p)) {
          return (
            <span key={i} className="text-cyan-300 font-semibold">
              {p}
            </span>
          );
        }
        return <span key={i}>{p}</span>;
      })}
    </p>
  );
}

function MediaThumb({ path, kind }: { path: string; kind: string | null }) {
  const [url, setUrl] = useState<string | null>(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      // If it's already a full URL (legacy posts), use it directly.
      if (/^https?:\/\//.test(path)) {
        setUrl(path);
        return;
      }
      const { data, error } = await supabase.storage
        .from("post_media")
        .createSignedUrl(path, 60 * 60 * 6); // 6h
      if (cancelled) return;
      if (error || !data?.signedUrl) {
        setErr(true);
        return;
      }
      setUrl(data.signedUrl);
    })();
    return () => {
      cancelled = true;
    };
  }, [path]);

  if (err) {
    return (
      <div className="mt-2 flex items-center gap-2 rounded-lg border border-white/5 bg-black/40 p-3 text-[11px] text-muted-foreground">
        <ImageOff className="size-3.5" /> Attachment unavailable
      </div>
    );
  }
  if (!url) {
    return (
      <div className="mt-2 grid place-items-center rounded-lg border border-white/5 bg-black/40 h-40">
        <Loader2 className="size-4 animate-spin text-muted-foreground" />
      </div>
    );
  }
  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-white/5 bg-black/40">
      {kind === "video" ? (
        <video src={url} controls className="w-full max-h-[420px]" />
      ) : (
        <img src={url} alt="" className="w-full max-h-[420px] object-contain" loading="lazy" />
      )}
    </div>
  );
}

export default function PostsFeed() {
  const [posts, setPosts] = useState<FeedPost[] | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("posts")
      .select("id,author_name,author_headline,body_text,created_at,attached_visual_url,media_type,tags,cheers_count,is_hidden")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) {
      setPosts([]);
      return;
    }
    setPosts((data ?? []) as FeedPost[]);
  }, []);

  useEffect(() => {
    void load();
    const onCreated = () => void load();
    window.addEventListener("drinkedin:post-created", onCreated);

    const channel = supabase
      .channel("posts-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        () => void load()
      )
      .subscribe();

    return () => {
      window.removeEventListener("drinkedin:post-created", onCreated);
      supabase.removeChannel(channel);
    };
  }, [load]);

  return (
    <div
      className="rounded-2xl p-4 shadow-xl"
      style={{
        background: "rgba(13, 13, 13, 0.8)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        border: "1px solid #1f1f1f",
      }}
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[10px] uppercase tracking-[0.24em] font-bold text-cyan-300/90">
          📡 Live Breakroom Feed
        </h3>
        <span className="text-[9px] uppercase tracking-wider text-emerald-300/80 font-bold flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Live
        </span>
      </div>

      {posts === null ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : posts.length === 0 ? (
        <p className="text-[12.5px] text-muted-foreground py-6 text-center">
          No posts yet — be the first to drop a confession ☝️
        </p>
      ) : (
        <ul className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
          {posts.map((p) => (
            <li key={p.id} className="rounded-xl border border-white/5 bg-zinc-950/50 p-3 animate-fade-in">
              <div className="flex items-start gap-2.5">
                <div className="size-9 shrink-0 rounded-full bg-gradient-to-br from-fuchsia-500/30 to-amber-400/30 border border-white/10 grid place-items-center text-[11px] font-extrabold text-foreground/90">
                  {initials(p.author_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[12.5px] font-bold text-foreground truncate">{p.author_name}</span>
                    <span className="text-[10px] text-muted-foreground truncate">{p.author_headline}</span>
                  </div>
                  <div className="text-[10px] text-muted-foreground mb-1.5">
                    {formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}
                  </div>
                  <RichBody text={p.body_text} />

                  {p.attached_visual_url && (
                    <MediaThumb path={p.attached_visual_url} kind={p.media_type} />
                  )}

                  {p.tags && p.tags.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.tags.map((t) => (
                        <span
                          key={t}
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono flex items-center gap-0.5 ${
                            t.startsWith("#")
                              ? "bg-fuchsia-500/10 text-fuchsia-200 border border-fuchsia-400/25"
                              : "bg-cyan-500/10 text-cyan-200 border border-cyan-400/25"
                          }`}
                        >
                          {t.startsWith("#") ? <Hash className="size-2.5" /> : <AtSign className="size-2.5" />}
                          {t.slice(1)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
