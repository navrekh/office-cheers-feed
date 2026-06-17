import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { getPostById, type SharedPost } from "@/lib/posts.functions";
import { SITE_URL } from "@/config";
import AuthModal from "@/components/AuthModal";
import { useAuth } from "@/lib/useAuth";
import { ArrowLeft, Flame, Share2, MessageCircle } from "lucide-react";
import { toast } from "sonner";

function excerpt(text: string, n = 140) {
  const t = text.replace(/\s+/g, " ").trim();
  return t.length <= n ? t : t.slice(0, n - 1).trimEnd() + "…";
}

export const Route = createFileRoute("/p/$postId")({
  loader: async ({ params }) => {
    const post = await getPostById({ data: { id: params.postId } });
    if (!post) throw notFound();
    return { post };
  },
  head: ({ params, loaderData }) => {
    const post = loaderData?.post as SharedPost | undefined;
    const title = post
      ? `"${excerpt(post.body_text, 60)}" — DrinkedIn`
      : "Anonymous confession — DrinkedIn";
    const description = post
      ? `${post.author_name} just dropped an anonymous breakroom confession. ${excerpt(post.body_text, 140)}`
      : "Read the anonymous tech-park confession on DrinkedIn.";
    const url = `${SITE_URL}/p/${params.postId}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: PostDetail,
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center bg-black text-white px-4 text-center">
      <div>
        <h1 className="text-2xl font-bold">Confession not found</h1>
        <p className="mt-2 text-sm text-white/60">Maybe it got deleted, or the link is broken.</p>
        <Link to="/" className="mt-6 inline-block rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-amber-950">
          Back to the breakroom
        </Link>
      </div>
    </div>
  ),
  errorComponent: () => (
    <div className="min-h-screen grid place-items-center bg-black text-white px-4 text-center">
      <div>
        <h1 className="text-xl font-bold">Couldn't load this confession</h1>
        <Link to="/" className="mt-6 inline-block rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-amber-950">
          Back home
        </Link>
      </div>
    </div>
  ),
});

function PostDetail() {
  const { post } = Route.useLoaderData();
  const params = Route.useParams();
  const { user } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  const shareUrl = `${SITE_URL}/p/${params.postId}`;

  function copyShare() {
    const payload =
      `🚨 DRINKEDIN LEAK: ${post.author_name} just dropped an anonymous confession.\n\n` +
      `"${excerpt(post.body_text, 200)}"\n\n` +
      `Read + roast → ${shareUrl}`;
    try {
      navigator.clipboard.writeText(payload);
      toast.success("Link copied — drop it in your team WhatsApp / Slack.");
    } catch {
      toast.error("Couldn't copy. Long-press the link to share.");
    }
  }

  function inviteToRoast() {
    if (!user) {
      setAuthOpen(true);
      return;
    }
    copyShare();
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-zinc-950 text-white">
      <div className="mx-auto max-w-2xl px-4 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-white/60 hover:text-amber-300 transition"
        >
          <ArrowLeft className="size-3.5" /> Back to feed
        </Link>

        <article className="mt-6 rounded-2xl border border-amber-500/20 bg-zinc-950/70 p-6 shadow-[0_0_60px_rgba(251,191,36,0.08)] backdrop-blur">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <div>
              <div className="text-sm font-bold text-amber-200 font-mono">{post.author_name}</div>
              <div className="text-[11px] text-white/50">{post.author_headline}</div>
            </div>
            <span className="rounded-full border border-emerald-400/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-200">
              ● Anon
            </span>
          </div>

          <p className="mt-5 whitespace-pre-wrap text-lg leading-relaxed text-white/90">{post.body_text}</p>

          <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-white/5 pt-4">
            <button
              onClick={inviteToRoast}
              className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-400 to-amber-300 px-4 py-2 text-sm font-extrabold text-amber-950 shadow-[0_0_18px_rgba(251,191,36,0.4)] hover:brightness-110 transition"
            >
              <Flame className="size-4" /> Invite team to roast
            </button>
            <button
              onClick={copyShare}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white/[0.03] px-4 py-2 text-sm font-bold text-white/80 hover:bg-white/[0.08] transition"
            >
              <Share2 className="size-4" /> Copy link
            </button>
            <Link
              to="/"
              className="inline-flex items-center gap-2 rounded-xl border border-sky-400/30 bg-sky-500/10 px-4 py-2 text-sm font-bold text-sky-200 hover:bg-sky-500/20 transition"
            >
              <MessageCircle className="size-4" /> Drop your own confession
            </Link>
          </div>

          {!user && (
            <div className="mt-4 rounded-lg border border-amber-400/30 bg-amber-500/5 px-3 py-3 text-center">
              <p className="text-[12px] text-amber-100/85">
                Sign in once (Google, anonymous handle) to roast, reply, or post your own.
              </p>
              <button
                onClick={() => setAuthOpen(true)}
                className="mt-2 inline-flex items-center justify-center rounded-md bg-amber-500 px-4 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-400 transition"
              >
                Get my anonymous mask →
              </button>
            </div>
          )}
        </article>

        <p className="mt-6 text-center text-[11px] text-white/40">
          DrinkedIn — the anti-LinkedIn breakroom for tech employees.
        </p>
      </div>

      <AuthModal
        open={authOpen}
        onOpenChange={setAuthOpen}
        reason="Sign in to roast, reply, and drop your own anonymous confessions."
        defaultIntent="employee"
        compact
      />
    </div>
  );
}
