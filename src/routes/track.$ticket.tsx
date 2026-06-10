import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SITE } from "@/config";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  Beer,
  Copy,
  Globe2,
  Loader2,
  MessageCircle,
  Trash2,
  TrendingUp,
} from "lucide-react";

export const Route = createFileRoute("/track/$ticket")({
  head: ({ params }) => ({
    meta: [
      { title: `Track ${params.ticket} — DrinkedIn 🍻` },
      {
        name: "description",
        content:
          "Private tracking dashboard for your anonymous DrinkedIn post. Cheers, comments, and admin control.",
      },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  component: TrackPage,
});

type TrackedPost = {
  id: string;
  author_name: string;
  author_headline: string;
  body_text: string;
  cheers_count: number;
  created_at: string;
  claim_ticket: string;
};

type TrackedComment = {
  id: string;
  post_id: string;
  author_name: string;
  body_text: string;
  created_at: string;
};

function timeAgo(iso: string) {
  const diff = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

function TrackPage() {
  const { ticket } = Route.useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState<TrackedPost | null>(null);
  const [comments, setComments] = useState<TrackedComment[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const trackUrl = SITE.trackUrl(ticket);

  const load = useCallback(async () => {
    try {
      const { data, error } = await (supabase as any)
        .from("posts")
        .select("*")
        .eq("claim_ticket", ticket)
        .maybeSingle();
      if (error || !data) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setPost(data as TrackedPost);
      setLoading(false);
      try {
        const { data: cmts } = await (supabase as any)
          .from("comments")
          .select("*")
          .eq("post_id", data.id)
          .order("created_at", { ascending: true });
        setComments((cmts as TrackedComment[] | null) ?? []);
      } catch (err) {
        console.warn("[DrinkedIn] track comments load failed", err);
      }
    } catch (err) {
      console.warn("[DrinkedIn] track post load failed", err);
      setNotFound(true);
      setLoading(false);
    }
  }, [ticket]);

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    void load();
  }, [load]);

  // Realtime polling for live cheers + comments
  useEffect(() => {
    if (!post) return;
    const id = setInterval(() => {
      void load();
    }, 6000);
    return () => clearInterval(id);
  }, [post, load]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(trackUrl);
      toast.success("Copied! 🍻");
    } catch {
      toast.error("Copy failed.");
    }
  }

  async function deletePost() {
    if (!post) return;
    setDeleting(true);
    try {
      const { data, error } = await (supabase as any).rpc("delete_post_by_ticket", { ticket });
      if (error || !data) {
        toast.error("Couldn't delete. Try again in a sec.");
        setDeleting(false);
        return;
      }
      toast.success("Post deleted. 🗑️", { description: "Your evidence has been shredded." });
      setTimeout(() => navigate({ to: "/" }), 800);
    } catch (err) {
      console.warn("[DrinkedIn] delete post failed", err);
      toast.error("Network hiccup. Try again in a sec.");
      setDeleting(false);
    }
  }

  const reach = post ? Math.max(post.cheers_count * 37, 128) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-slate-100">
      <div className="mx-auto max-w-3xl px-4 py-6">
        <div className="mb-6 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-amber-300">
            <ArrowLeft className="h-4 w-4" />
            Back to feed
          </Link>
          <div className="flex items-center gap-2">
            <Beer className="h-5 w-5 text-amber-400" />
            <span className="text-sm font-semibold text-amber-300">DrinkedIn Tracker</span>
          </div>
        </div>

        <div className="mb-4 rounded-lg border border-amber-500/30 bg-black/40 p-3">
          <div className="text-[10px] uppercase tracking-widest text-amber-400/80">
            Your Claim Ticket
          </div>
          <div className="mt-1 flex items-center justify-between gap-2">
            <span className="font-mono text-lg font-bold tracking-wider text-amber-200">{ticket}</span>
            <Button
              size="sm"
              variant="outline"
              onClick={copyLink}
              className="border-amber-500/40 text-amber-200 hover:bg-amber-500/10"
            >
              <Copy className="mr-2 h-3.5 w-3.5" />
              Copy link
            </Button>
          </div>
        </div>

        {loading && (
          <div className="flex items-center justify-center py-20 text-slate-400">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Pulling your post from the cellar…
          </div>
        )}

        {notFound && !loading && (
          <Card className="border-amber-500/30 bg-slate-900/80 p-8 text-center">
            <AlertTriangle className="mx-auto mb-3 h-10 w-10 text-amber-400" />
            <h1 className="text-xl font-bold text-amber-200">No post found for this ticket</h1>
            <p className="mt-2 text-sm text-slate-400">
              Either the ticket is wrong, the post was deleted, or the bartender lost the receipt.
            </p>
            <Button asChild className="mt-5 bg-amber-500 text-slate-950 hover:bg-amber-400">
              <Link to="/">Back to the bar</Link>
            </Button>
          </Card>
        )}

        {post && !loading && (
          <>
            <Card className="relative overflow-hidden border-2 border-amber-500/60 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 p-5 shadow-[0_0_40px_rgba(251,191,36,0.25)]">
              <div className="pointer-events-none absolute inset-0 -z-0 animate-pulse bg-amber-500/5" />
              <div className="relative z-10">
                <div className="mb-3 inline-flex items-center gap-1.5 rounded-full border border-amber-500/40 bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-300">
                  <Beer className="h-3 w-3" />
                  Author View · Highlighted
                </div>
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-200 ring-2 ring-amber-400/50">
                    {initials(post.author_name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-slate-100">{post.author_name}</div>
                    <div className="truncate text-xs text-slate-400">{post.author_headline}</div>
                    <div className="text-[11px] text-slate-500">{timeAgo(post.created_at)}</div>
                  </div>
                </div>
                <p className="mt-4 whitespace-pre-wrap text-[15px] leading-relaxed text-slate-100">
                  {post.body_text.replace(/«di-meta»[\s\S]*?«\/di-meta»/g, "").trim()}
                </p>
              </div>
            </Card>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Card className="border-slate-800 bg-slate-900/70 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber-300">
                  <TrendingUp className="h-3.5 w-3.5" />
                  Cheers 🍻 Impressions
                </div>
                <div className="mt-2 text-3xl font-bold text-amber-200">
                  {post.cheers_count.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500">Live · refreshes every 6s</div>
              </Card>
              <Card className="border-slate-800 bg-slate-900/70 p-4">
                <div className="flex items-center gap-2 text-xs uppercase tracking-wider text-amber-300">
                  <Globe2 className="h-3.5 w-3.5" />
                  Global Reach
                </div>
                <div className="mt-2 text-3xl font-bold text-slate-100">
                  {reach.toLocaleString()}
                </div>
                <div className="text-[11px] text-slate-500">Est. impressions across the grid</div>
              </Card>
            </div>

            <Card className="mt-5 border-slate-800 bg-slate-900/70 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
                <MessageCircle className="h-4 w-4 text-amber-300" />
                Comments ({comments.length})
              </div>
              <div className="mt-3 space-y-3">
                {comments.length === 0 && (
                  <p className="text-sm text-slate-500">No replies yet. Patience — the office isn't drunk yet.</p>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="rounded border border-slate-800 bg-slate-950/60 p-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-300">{c.author_name}</span>
                      <span className="text-slate-500">{timeAgo(c.created_at)}</span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">{c.body_text}</p>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="mt-5 border-red-900/50 bg-red-950/20 p-4">
              <div className="flex items-center gap-2 text-sm font-semibold text-red-300">
                <Trash2 className="h-4 w-4" />
                Danger Zone — Anonymous Admin Control
              </div>
              <p className="mt-1 text-xs text-red-200/70">
                This delete button is visible ONLY through your secret ticket link. Use it wisely.
              </p>
              {!confirmDelete ? (
                <Button
                  variant="destructive"
                  onClick={() => setConfirmDelete(true)}
                  className="mt-3 bg-red-600 hover:bg-red-500"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Post 🗑️
                </Button>
              ) : (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    variant="destructive"
                    disabled={deleting}
                    onClick={deletePost}
                    className="bg-red-600 hover:bg-red-500"
                  >
                    {deleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Yes, shred the evidence
                  </Button>
                  <Button variant="outline" onClick={() => setConfirmDelete(false)}>
                    Cancel
                  </Button>
                </div>
              )}
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
