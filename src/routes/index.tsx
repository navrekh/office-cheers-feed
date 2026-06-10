import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useMemo, useCallback, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  Home,
  Users,
  Beer,
  MessageSquare,
  Bell,
  Search,
  Image as ImageIcon,
  Video,
  CalendarDays,
  FileText,
  MessageCircle,
  Share2,
  TrendingUp,
  BookmarkPlus,
  MoreHorizontal,
  Plus,
  Shuffle,
  Send,
  Sparkles,
  Briefcase,
  MapPin,
  UserPlus,
  Check,
  Clock,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "DrinkedIn 🍻 — Feed" },
      { name: "description", content: "The professional network for corporate workers who refuse to network sober." },
      { property: "og:title", content: "DrinkedIn 🍻 — Feed" },
      { property: "og:description", content: "Happy hours, hangover takes, and liquid leadership." },
    ],
  }),
  component: Index,
});

type Post = {
  id: string;
  author_name: string;
  author_headline: string;
  body_text: string;
  cheers_count: number;
  created_at: string;
};

type Comment = {
  id: string;
  post_id: string;
  author_name: string;
  body_text: string;
  created_at: string;
};

const RANDOM_FIRST = ["Brittany", "Chad", "Devon", "Marcus", "Priya", "Ainsley", "Trent", "Kelsey", "Jordan", "Avery", "Skyler", "Hunter"];
const RANDOM_LAST = ["Sullivan", "Hollows", "Volkov", "Park", "Reyes", "Lambert", "O'Brien", "Ngata", "Whitaker", "Stein", "Vasquez", "Bloom"];
const RANDOM_TITLES = [
  "Principal Synergy Drinker",
  "Chief Hangover Officer",
  "VP of Liquid Infrastructure",
  "Director of Strategic Pours",
  "Head of Pint-Driven Development",
  "Senior Manager, After-Hours Alignment",
  "Lead Evangelist, Craft Brew Operations",
  "Distinguished Fellow of Post-Mortem Cocktails",
  "Chief of Staff to the Open Bar",
  "Global Lead, Mandatory Fun",
  "Staff Engineer of Liquid Refactoring",
  "Fractional CFO (Chief Fermentation Officer)",
];
const RANDOM_COMMENT_NAMES = ["Anonymous Intern", "Casey from Comms", "Mid-Level Manager", "Recruiter Bot 9000", "Probably-A-VP"];

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}
function randomIdentity() {
  return {
    name: `${pick(RANDOM_FIRST)} ${pick(RANDOM_LAST)}`,
    headline: pick(RANDOM_TITLES),
  };
}

function timeAgo(iso: string) {
  const diff = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

type ViewKey = "home" | "barhop" | "pubs" | "messages" | "notifications";

function Index() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [body, setBody] = useState("");
  const [authorName, setAuthorName] = useState("Alex Morgan");
  const [authorHeadline, setAuthorHeadline] = useState(
    "Senior Program Manager | Specialize in Liquid Refactoring"
  );
  const [submitting, setSubmitting] = useState(false);
  const [view, setView] = useState<ViewKey>("home");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const cheeredRef = useRef<Set<string>>(new Set());
  const [, force] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      const [{ data: postRows }, { data: commentRows }] = await Promise.all([
        (supabase as any).from("posts").select("*").order("created_at", { ascending: false }),
        (supabase as any).from("comments").select("*").order("created_at", { ascending: true }),
      ]);
      if (!mounted) return;
      if (postRows) setPosts(postRows as Post[]);
      if (commentRows) {
        const grouped: Record<string, Comment[]> = {};
        (commentRows as Comment[]).forEach((c) => {
          (grouped[c.post_id] ||= []).push(c);
        });
        setCommentsByPost(grouped);
      }
    })();

    const channel = (supabase as any)
      .channel("drinkedin-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "posts" },
        (payload: any) => {
          setPosts((prev) =>
            prev.some((p) => p.id === payload.new.id) ? prev : [payload.new as Post, ...prev]
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "posts" },
        (payload: any) => {
          setPosts((prev) =>
            prev.map((p) => (p.id === payload.new.id ? (payload.new as Post) : p))
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        (payload: any) => {
          const c = payload.new as Comment;
          setCommentsByPost((prev) => {
            const existing = prev[c.post_id] || [];
            if (existing.some((x) => x.id === c.id)) return prev;
            return { ...prev, [c.post_id]: [...existing, c] };
          });
        }
      )
      .subscribe();

    return () => {
      mounted = false;
      (supabase as any).removeChannel(channel);
    };
  }, []);

  async function submitPost(e: FormEvent) {
    e.preventDefault();
    if (!body.trim() || submitting) return;
    setSubmitting(true);
    const { data, error } = await (supabase as any)
      .from("posts")
      .insert({
        author_name: authorName || "Anonymous Intern",
        author_headline: authorHeadline || "Specializing in Liquid Refactoring",
        body_text: body.trim(),
      })
      .select()
      .single();
    if (!error && data) {
      setPosts((prev) => (prev.some((p) => p.id === data.id) ? prev : [data as Post, ...prev]));
      setBody("");
    }
    setSubmitting(false);
  }

  const cheers = useCallback(async (post: Post) => {
    if (cheeredRef.current.has(post.id)) return;
    cheeredRef.current.add(post.id);
    force((n) => n + 1);
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, cheers_count: p.cheers_count + 1 } : p))
    );
    await (supabase as any).rpc("increment_cheers", { post_id: post.id });
  }, []);

  const addComment = useCallback(async (postId: string, text: string, name: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    const optimistic: Comment = {
      id: `tmp-${Date.now()}-${Math.random()}`,
      post_id: postId,
      author_name: name || "Anonymous Intern",
      body_text: trimmed,
      created_at: new Date().toISOString(),
    };
    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), optimistic],
    }));
    const { data, error } = await (supabase as any)
      .from("comments")
      .insert({ post_id: postId, body_text: trimmed, author_name: name || "Anonymous Intern" })
      .select()
      .single();
    if (!error && data) {
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).map((c) => (c.id === optimistic.id ? (data as Comment) : c)),
      }));
    }
  }, []);

  function randomize() {
    const id = randomIdentity();
    setAuthorName(id.name);
    setAuthorHeadline(id.headline);
  }

  // Deep-link: ?post=<id> spotlights a post at the top of the feed
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const target = params.get("post");
    if (target) {
      setHighlightedId(target);
      setView("home");
    }
  }, []);

  const sharePost = useCallback(async (postId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?post=${postId}`;
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied to clipboard! 🍻", {
        description: "Now go forth and overshare on Slack.",
      });
    } catch {
      toast.error("Couldn't copy. Try long-pressing the link.", {
        description: url,
      });
    }
  }, []);

  // Sort posts with highlighted one pinned at top
  const orderedPosts = useMemo(() => {
    if (!highlightedId) return posts;
    const idx = posts.findIndex((p) => p.id === highlightedId);
    if (idx < 0) return posts;
    return [posts[idx], ...posts.slice(0, idx), ...posts.slice(idx + 1)];
  }, [posts, highlightedId]);


  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Premium permanent TokenLens banner with neon-amber glow */}
      <div className="tokenlens-banner relative w-full">
        <div className="mx-auto max-w-7xl px-4 py-2.5 text-center text-[13px] font-medium leading-snug flex items-center justify-center gap-2 flex-wrap">
          <Sparkles className="size-3.5 text-primary shrink-0" />
          <span className="text-foreground/90">
            Sobered up and need to fix your actual cloud infrastructure bills?
          </span>
          <a
            href="https://tokenlens.co.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-bold text-primary hover:text-primary/80 underline decoration-primary/50 decoration-2 underline-offset-4 transition"
          >
            Check out my real engineering tool: TokenLens →
          </a>
        </div>
      </div>

      {/* Top Nav */}
      <header className="sticky top-0 z-40 bg-card/95 backdrop-blur border-b border-border shadow-sm">
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-md bg-primary text-primary-foreground grid place-items-center font-black text-lg">
              🍻
            </div>
            <span className="hidden sm:block font-display text-xl font-bold tracking-tight">
              Drinked<span className="text-primary">In</span>
            </span>
          </div>

          <div className="flex-1 max-w-md ml-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search pubs, people, pints…"
                className="pl-9 bg-muted/60 border-transparent focus-visible:bg-background h-9 rounded-md"
              />
            </div>
          </div>

          <nav className="flex items-center gap-1 ml-auto">
            <NavItem icon={<Home className="size-5" />} label="Home" active />
            <NavItem icon={<Users className="size-5" />} label="Bar Hop" />
            <NavItem icon={<Beer className="size-5" />} label="Pubs" />
            <NavItem icon={<MessageSquare className="size-5" />} label="Messages" />
            <NavItem icon={<Bell className="size-5" />} label="Notifications" badge={9} />
          </nav>
        </div>
      </header>

      {/* 3-column layout */}
      <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-12 gap-6">
        {/* Left sidebar */}
        <aside className="hidden lg:block col-span-3 space-y-4">
          <Card className="overflow-hidden p-0 border-border">
            <div className="h-16 bg-gradient-to-br from-primary/40 via-accent/50 to-primary/30" />
            <div className="px-4 pb-4 -mt-8">
              <div className="size-16 rounded-full bg-card border-4 border-card ring-2 ring-primary/40 grid place-items-center text-2xl shadow">
                🍺
              </div>
              <h3 className="mt-2 font-semibold text-base leading-tight">{authorName}</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-snug line-clamp-2">
                {authorHeadline}
              </p>
              <p className="text-[11px] text-muted-foreground/80 mt-1">
                📍 Brewlyn, NY · BigCorp Holdings
              </p>
            </div>
            <div className="border-t border-border px-4 py-3 text-xs space-y-2 hover:bg-muted/40 cursor-pointer">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Who viewed your hangover status</span>
                <span className="font-semibold text-primary">42</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Impressions of your last excuse</span>
                <span className="font-semibold text-primary">1,204</span>
              </div>
            </div>
            <div className="border-t border-border px-4 py-2 text-xs hover:bg-muted/40 cursor-pointer">
              <span className="text-muted-foreground">Saved </span>
              <span className="font-semibold">🍷 Wine cellar bookmarks</span>
            </div>
          </Card>

          <Card className="p-4 border-border">
            <h4 className="text-sm font-semibold mb-2">Recent</h4>
            <ul className="text-xs space-y-1.5 text-muted-foreground">
              <li className="hover:text-foreground cursor-pointer"># RemoteWorkBeers</li>
              <li className="hover:text-foreground cursor-pointer"># SlackToPub</li>
              <li className="hover:text-foreground cursor-pointer"># PromotedToBartender</li>
              <li className="hover:text-foreground cursor-pointer"># OOO_AtTheBar</li>
            </ul>
          </Card>
        </aside>

        {/* Feed */}
        <section className="col-span-12 lg:col-span-6 space-y-3">
          {/* Composer */}
          <Card className="p-4 border-border">
            <form onSubmit={submitPost} className="space-y-3">
              <div className="flex items-start gap-3">
                <div className="size-11 shrink-0 rounded-full bg-primary/20 grid place-items-center text-lg font-bold text-primary">
                  {initials(authorName)}
                </div>
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="flex items-center gap-2">
                    <Input
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="Your corporate alias"
                      className="h-8 text-xs bg-transparent border-dashed flex-1"
                    />
                    <button
                      type="button"
                      onClick={randomize}
                      title="Randomize a corporate identity"
                      className="shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-md text-[11px] font-semibold border border-primary/40 text-primary hover:bg-primary/15 hover:border-primary transition"
                    >
                      <Shuffle className="size-3.5" />
                      Randomize
                    </button>
                  </div>
                  <Input
                    value={authorHeadline}
                    onChange={(e) => setAuthorHeadline(e.target.value)}
                    placeholder="Your parody headline"
                    className="h-8 text-xs bg-transparent border-dashed italic text-muted-foreground"
                  />
                  <Textarea
                    value={body}
                    onChange={(e) => setBody(e.target.value)}
                    placeholder="Start a post… overshare about your 4pm Aperol."
                    className="resize-none min-h-24 bg-muted/40 border-border rounded-xl text-[15px] focus-visible:bg-background"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1 flex-wrap pl-14">
                <ComposerChip icon={<ImageIcon className="size-4 text-accent" />} label="Bar pic" />
                <ComposerChip icon={<Video className="size-4 text-primary" />} label="Tasting" />
                <ComposerChip icon={<CalendarDays className="size-4 text-chart-3" />} label="Happy hr" />
                <ComposerChip icon={<FileText className="size-4 text-muted-foreground" />} label="Excuse" />
                <div className="ml-auto">
                  <Button
                    type="submit"
                    disabled={!body.trim() || submitting}
                    className="rounded-full px-5 font-semibold"
                  >
                    {submitting ? "Pouring…" : "Post 🍻"}
                  </Button>
                </div>
              </div>
            </form>
          </Card>

          <div className="flex items-center gap-3 text-xs text-muted-foreground px-1">
            <div className="h-px flex-1 bg-border" />
            <span>Sort by: <span className="text-foreground font-medium">Most Tipsy ▾</span></span>
          </div>

          {posts.length === 0 && (
            <Card className="p-8 text-center text-sm text-muted-foreground border-border">
              Pouring the first round…
            </Card>
          )}

          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              comments={commentsByPost[p.id] || []}
              onCheers={() => cheers(p)}
              onComment={(text, name) => addComment(p.id, text, name)}
              cheered={cheeredRef.current.has(p.id)}
            />
          ))}
        </section>

        {/* Right sidebar */}
        <aside className="hidden lg:block col-span-3 space-y-4">
          <Card className="p-4 border-border">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-semibold flex items-center gap-1.5">
                <TrendingUp className="size-4 text-primary" /> Trending Happy Hours
              </h4>
              <MoreHorizontal className="size-4 text-muted-foreground" />
            </div>
            <ul className="space-y-3 text-xs">
              <TrendItem title="O'Malley's $3 Lager Thursday" meta="Midtown · 1.2k professionals attending" />
              <TrendItem title="The Rooftop @ FinTech HQ" meta="Today 4pm · 'Mandatory team bonding'" />
              <TrendItem title="Whiskey & Wireframes" meta="Designers only · pretzel bar included" />
              <TrendItem title="Margarita Standup" meta="Daily 11:30am · attendance optional" />
            </ul>
          </Card>

          <Card className="p-4 border-border">
            <h4 className="text-sm font-semibold mb-3">Corporate Coping Strategies</h4>
            <ul className="space-y-3 text-xs">
              <CopeItem tag="Trending" title="The 'Camera Off' Mimosa" stat="+312% this Q" />
              <CopeItem tag="Hot" title="LinkedIn Posting While Buzzed" stat="ROI: undefined" />
              <CopeItem tag="Promoted" title="OOO autoresponder: 'Hydrating'" stat="98% open rate" />
              <CopeItem tag="New" title="Scheduling 'focus time' at the pub" stat="Synergy unlocked" />
            </ul>
          </Card>

          <p className="text-[10px] text-muted-foreground/60 px-2 leading-relaxed">
            DrinkedIn © 2026 · A parody. Please drink responsibly.
            <br />
            About · Accessibility · Privacy & Pints · Ad Choices
          </p>
        </aside>
      </main>
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
  badge,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
}) {
  return (
    <button
      className={`relative flex flex-col items-center justify-center px-3 py-1 min-w-[64px] text-[11px] transition-colors ${
        active
          ? "text-foreground border-b-2 border-primary -mb-px"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <div className="relative">
        {icon}
        {badge ? (
          <span className="absolute -top-1.5 -right-2 bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full size-4 grid place-items-center">
            {badge}
          </span>
        ) : null}
      </div>
      <span className="mt-0.5 hidden sm:block">{label}</span>
    </button>
  );
}

function ComposerChip({ icon, label }: { icon: React.ReactNode; label: string }) {
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

function PostCard({
  post,
  comments,
  onCheers,
  onComment,
  cheered,
}: {
  post: Post;
  comments: Comment[];
  onCheers: () => void;
  onComment: (text: string, name: string) => void;
  cheered: boolean;
}) {
  const [showComments, setShowComments] = useState(false);
  const [popKey, setPopKey] = useState(0);
  const [bumpKey, setBumpKey] = useState(0);

  function handleCheers() {
    if (!cheered) {
      setPopKey((k) => k + 1);
      setBumpKey((k) => k + 1);
    }
    onCheers();
  }

  return (
    <Card className="border-border overflow-hidden">
      <div className="p-4 pb-2 flex items-start gap-3">
        <div className="size-12 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 grid place-items-center font-bold text-base shrink-0">
          {initials(post.author_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[15px] leading-tight truncate">
            {post.author_name}{" "}
            <span className="text-xs font-normal text-muted-foreground">· 1st</span>
          </div>
          <div className="text-xs text-muted-foreground line-clamp-1">
            {post.author_headline}
          </div>
          <div className="text-[11px] text-muted-foreground/80 mt-0.5 flex items-center gap-1">
            {timeAgo(post.created_at)} · <span>🌍</span>
          </div>
        </div>
        <button className="text-muted-foreground hover:text-foreground p-1">
          <MoreHorizontal className="size-5" />
        </button>
      </div>

      <div className="px-4 pb-3 text-[15px] leading-relaxed whitespace-pre-wrap">
        {post.body_text}
      </div>

      <div className="px-4 pb-2 flex items-center justify-between text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="size-4 rounded-full bg-primary grid place-items-center text-[9px]">
            🍻
          </span>
          <span
            key={bumpKey}
            className={bumpKey > 0 ? "animate-count-bump inline-block" : "inline-block"}
          >
            {post.cheers_count.toLocaleString()} cheers
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowComments((v) => !v)}
            className="hover:text-foreground hover:underline"
          >
            {comments.length} comments
          </button>
          <span>·</span>
          <span>{Math.floor(post.cheers_count / 12)} reposts</span>
        </div>
      </div>

      <div className="border-t border-border grid grid-cols-3 px-2 py-1">
        <ActionBtn
          onClick={handleCheers}
          active={cheered}
          label="Cheers 🍻"
          icon={
            <span
              key={popKey}
              className={`inline-flex ${popKey > 0 ? "animate-cheers-pop" : ""}`}
            >
              <Beer className="size-5" />
            </span>
          }
        />
        <ActionBtn
          label="Comment"
          icon={<MessageCircle className="size-5" />}
          onClick={() => setShowComments((v) => !v)}
          active={showComments}
        />
        <ActionBtn label="Share" icon={<Share2 className="size-5" />} />
      </div>

      {showComments && (
        <CommentSection
          comments={comments}
          onSubmit={onComment}
        />
      )}
    </Card>
  );
}

function CommentSection({
  comments,
  onSubmit,
}: {
  comments: Comment[];
  onSubmit: (text: string, name: string) => void;
}) {
  const [text, setText] = useState("");
  const [name] = useState(() => pick(RANDOM_COMMENT_NAMES));

  function handle(e: FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmit(text, name);
    setText("");
  }

  return (
    <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
      <form onSubmit={handle} className="flex items-center gap-2">
        <div className="size-8 shrink-0 rounded-full bg-accent/30 grid place-items-center text-[11px] font-bold text-accent">
          {initials(name)}
        </div>
        <div className="flex-1 relative">
          <Input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Comment as ${name}…`}
            className="h-9 rounded-full bg-background pr-10 text-sm"
          />
          <button
            type="submit"
            disabled={!text.trim()}
            className="absolute right-1 top-1/2 -translate-y-1/2 size-7 rounded-full grid place-items-center text-primary disabled:text-muted-foreground hover:bg-primary/10 transition"
            aria-label="Post comment"
          >
            <Send className="size-3.5" />
          </button>
        </div>
      </form>

      {comments.length === 0 ? (
        <p className="text-xs text-muted-foreground italic pl-10">
          Be the first to commenting-for-beer-reach (cfbr) on this masterpiece.
        </p>
      ) : (
        <ul className="space-y-2">
          {comments.map((c) => (
            <li key={c.id} className="flex items-start gap-2">
              <div className="size-8 shrink-0 rounded-full bg-primary/20 grid place-items-center text-[11px] font-bold text-primary">
                {initials(c.author_name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="bg-card border border-border rounded-2xl rounded-tl-sm px-3 py-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-semibold truncate">{c.author_name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {timeAgo(c.created_at)}
                    </span>
                  </div>
                  <p className="text-sm leading-snug mt-0.5">{c.body_text}</p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ActionBtn({
  icon,
  label,
  onClick,
  active,
}: {
  icon: React.ReactNode;
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

function TrendItem({ title, meta }: { title: string; meta: string }) {
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

function CopeItem({ tag, title, stat }: { tag: string; title: string; stat: string }) {
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
