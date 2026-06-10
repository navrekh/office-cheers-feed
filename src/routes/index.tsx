import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useMemo, useCallback, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

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
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const cheeredRef = useRef<Set<string>>(new Set());
  const [hangoverIndex, setHangoverIndex] = useState<number>(37);
  const [sortMode, setSortMode] = useState<"recent" | "top">("recent");
  const [anonymous, setAnonymous] = useState(false);
  const [, force] = useState(0);

  const ANON_NAME = "Anonymous Colleague";
  const ANON_HEADLINE = "Incognito | Drinking to Cope";
  const displayName = anonymous ? ANON_NAME : authorName;
  const displayHeadline = anonymous ? ANON_HEADLINE : authorHeadline;



  useEffect(() => {
    let mounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    async function loadFeed() {
      if (!mounted) return;
      setFeedError(null);
      try {
        const [postsRes, commentsRes] = await Promise.all([
          (supabase as any).from("posts").select("*").order("created_at", { ascending: false }),
          (supabase as any).from("comments").select("*").order("created_at", { ascending: true }),
        ]);
        if (!mounted) return;
        if (postsRes.error) throw postsRes.error;
        if (commentsRes.error) throw commentsRes.error;
        if (postsRes.data) setPosts(postsRes.data as Post[]);
        if (commentsRes.data) {
          const grouped: Record<string, Comment[]> = {};
          (commentsRes.data as Comment[]).forEach((c) => {
            (grouped[c.post_id] ||= []).push(c);
          });
          setCommentsByPost(grouped);
        }
        setFeedLoading(false);
      } catch (err: any) {
        console.warn("[DrinkedIn] feed load hiccup, retrying…", err?.message || err);
        if (!mounted) return;
        setFeedError("The bartender dropped the connection. Re-pouring…");
        retryTimer = setTimeout(loadFeed, 3000);
      }
    }

    loadFeed();

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
      .subscribe((status: string) => {
        // Gracefully surface transient realtime hiccups without breaking the UI
        if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
          console.warn("[DrinkedIn] realtime status:", status);
        }
      });

    return () => {
      mounted = false;
      if (retryTimer) clearTimeout(retryTimer);
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
        author_name: anonymous ? ANON_NAME : (authorName || "Anonymous Intern"),
        author_headline: anonymous ? ANON_HEADLINE : (authorHeadline || "Specializing in Liquid Refactoring"),
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
    // Production-canonical share URL (always points to drinkedin.me regardless of preview host)
    const url = `https://drinkedin.me/?post=${postId}`;
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

  // Lightweight, anonymous click tracker for the TokenLens banner CTA
  const trackTokenLensClick = useCallback(() => {
    const event = {
      event: "tokenlens_banner_click",
      ts: new Date().toISOString(),
      path: typeof window !== "undefined" ? window.location.pathname : "/",
    };
    console.log("[DrinkedIn Analytics]", event);
    if (typeof window !== "undefined") {
      const w = window as any;
      (w.__drinkedinEvents ||= []).push(event);
    }
  }, []);


  // Sort posts by selected mode, then pin highlighted post at top
  const orderedPosts = useMemo(() => {
    const sorted = [...posts].sort((a, b) => {
      if (sortMode === "top") return b.cheers_count - a.cheers_count;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    if (!highlightedId) return sorted;
    const idx = sorted.findIndex((p) => p.id === highlightedId);
    if (idx < 0) return sorted;
    return [sorted[idx], ...sorted.slice(0, idx), ...sorted.slice(idx + 1)];
  }, [posts, highlightedId, sortMode]);

  const hangoverStatus = useMemo(() => {
    if (hangoverIndex <= 20)
      return { label: "Dangerously Sober", copy: "High risk of replying to emails on time.", tone: "text-chart-3 border-chart-3/40 bg-chart-3/10" };
    if (hangoverIndex <= 50)
      return { label: "Functional Synergy", copy: "Navigating Slack with a moderate buzz.", tone: "text-primary border-primary/40 bg-primary/10" };
    if (hangoverIndex <= 80)
      return { label: "Liquid Architecture", copy: "Camera off during regional alignment calls.", tone: "text-accent border-accent/40 bg-accent/10" };
    return { label: "Total System Outage", copy: "Submitting PTO retroactively.", tone: "text-destructive border-destructive/40 bg-destructive/10" };
  }, [hangoverIndex]);



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
            onClick={trackTokenLensClick}
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
            <NavItem icon={<Home className="size-5" />} label="Home" active={view === "home"} onClick={() => setView("home")} />
            <NavItem icon={<Users className="size-5" />} label="Bar Hop" active={view === "barhop"} onClick={() => setView("barhop")} />
            <NavItem icon={<Beer className="size-5" />} label="Pubs" active={view === "pubs"} onClick={() => setView("pubs")} />
            <NavItem icon={<MessageSquare className="size-5" />} label="Messages" active={view === "messages"} onClick={() => setView("messages")} />
            <NavItem icon={<Bell className="size-5" />} label="Notifications" badge={4} active={view === "notifications"} onClick={() => setView("notifications")} />
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
            <div className="border-t border-border px-4 py-3 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Your Hangover Index
                </span>
                <span className="text-xs font-bold text-primary tabular-nums">{hangoverIndex}%</span>
              </div>
              <Slider
                value={[hangoverIndex]}
                onValueChange={(v) => setHangoverIndex(v[0] ?? 0)}
                min={0}
                max={100}
                step={1}
                aria-label="Your current hangover index"
              />
              <div className={`rounded-md border px-2.5 py-1.5 text-[11px] leading-snug transition-colors ${hangoverStatus.tone}`}>
                <div className="font-bold">{hangoverStatus.label}</div>
                <div className="text-foreground/70 mt-0.5">{hangoverStatus.copy}</div>
              </div>
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
          {view === "home" && (
            <>
              {/* Composer */}
              <Card className="p-4 border-border">
                <form onSubmit={submitPost} className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className={`size-11 shrink-0 rounded-full grid place-items-center text-lg font-bold transition-colors ${anonymous ? "bg-muted text-muted-foreground" : "bg-primary/20 text-primary"}`}>
                      {anonymous ? "🎭" : initials(authorName)}
                    </div>
                    <div className="flex-1 space-y-2 min-w-0">
                      <div className="flex items-center gap-2">
                        <Input
                          value={displayName}
                          onChange={(e) => setAuthorName(e.target.value)}
                          placeholder="Your corporate alias"
                          disabled={anonymous}
                          className="h-8 text-xs bg-transparent border-dashed flex-1 disabled:opacity-70"
                        />
                        <button
                          type="button"
                          onClick={randomize}
                          disabled={anonymous}
                          title="Randomize a corporate identity"
                          className="shrink-0 inline-flex items-center gap-1 h-8 px-2.5 rounded-md text-[11px] font-semibold border border-primary/40 text-primary hover:bg-primary/15 hover:border-primary transition disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                        >
                          <Shuffle className="size-3.5" />
                          Randomize
                        </button>
                      </div>
                      <Input
                        value={displayHeadline}
                        onChange={(e) => setAuthorHeadline(e.target.value)}
                        placeholder="Your parody headline"
                        disabled={anonymous}
                        className="h-8 text-xs bg-transparent border-dashed italic text-muted-foreground disabled:opacity-70"
                      />
                      <Textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        placeholder={anonymous ? "Spill the corporate tea anonymously…" : "Start a post… overshare about your 4pm Aperol."}
                        className="resize-none min-h-24 bg-muted/40 border-border rounded-xl text-[15px] focus-visible:bg-background"
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-3 pl-14">
                    <label className={`flex items-center gap-2 cursor-pointer rounded-md px-2.5 py-1.5 border transition ${anonymous ? "border-primary/50 bg-primary/10" : "border-border hover:bg-muted/40"}`}>
                      <Switch checked={anonymous} onCheckedChange={setAnonymous} aria-label="Post anonymously" />
                      <span className="text-[11px] font-semibold">
                        Post Anonymously <span className="text-muted-foreground font-normal">(Confession Mode 🎭)</span>
                      </span>
                    </label>
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

              {highlightedId && orderedPosts.some((p) => p.id === highlightedId) && (
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-md bg-primary/10 border border-primary/30 text-xs">
                  <span className="text-foreground/90">
                    🍻 Showing a shared post at the top.
                  </span>
                  <button
                    onClick={() => {
                      setHighlightedId(null);
                      if (typeof window !== "undefined") {
                        window.history.replaceState({}, "", window.location.pathname);
                      }
                    }}
                    className="font-semibold text-primary hover:underline"
                  >
                    Show full feed
                  </button>
                </div>
              )}

              <div className="flex items-center gap-3 text-xs px-1">
                <div className="inline-flex items-center rounded-full border border-border bg-card p-0.5">
                  <button
                    type="button"
                    onClick={() => setSortMode("recent")}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold transition ${
                      sortMode === "recent"
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Recent
                  </button>
                  <button
                    type="button"
                    onClick={() => setSortMode("top")}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold transition inline-flex items-center gap-1 ${
                      sortMode === "top"
                        ? "bg-primary text-primary-foreground shadow"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    🏆 Top Brews
                  </button>
                </div>
                <div className="h-px flex-1 bg-border" />
                <span className="text-muted-foreground">
                  {sortMode === "top" ? "Most Cheered 🍻" : "Freshly poured"}
                </span>
              </div>


              {feedError && orderedPosts.length === 0 && (
                <Card className="p-4 text-center text-xs text-primary/90 border-primary/30 bg-primary/5 animate-pulse">
                  {feedError}
                </Card>
              )}

              {feedLoading && orderedPosts.length === 0 && !feedError && (
                <div className="space-y-3" aria-label="Loading feed" role="status">
                  {[0, 1, 2].map((i) => (
                    <Card key={i} className="p-4 border-border animate-pulse">
                      <div className="flex items-start gap-3">
                        <div className="size-11 rounded-full bg-muted/60" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-1/3 rounded bg-muted/60" />
                          <div className="h-2 w-1/2 rounded bg-muted/40" />
                        </div>
                      </div>
                      <div className="mt-4 space-y-2">
                        <div className="h-2.5 w-11/12 rounded bg-muted/50" />
                        <div className="h-2.5 w-10/12 rounded bg-muted/50" />
                        <div className="h-2.5 w-8/12 rounded bg-muted/40" />
                      </div>
                      <div className="mt-4 h-32 rounded-lg bg-muted/30" />
                    </Card>
                  ))}
                </div>
              )}

              {!feedLoading && !feedError && orderedPosts.length === 0 && (
                <Card className="p-8 text-center text-sm text-muted-foreground border-border">
                  Pouring the first round…
                </Card>
              )}


              <div key={sortMode} className="space-y-3 animate-fade-in">
                {orderedPosts.map((p) => (
                  <PostCard
                    key={p.id}
                    post={p}
                    comments={commentsByPost[p.id] || []}
                    onCheers={() => cheers(p)}
                    onComment={(text, name) => addComment(p.id, text, name)}
                    onShare={() => sharePost(p.id)}
                    cheered={cheeredRef.current.has(p.id)}
                    highlighted={p.id === highlightedId}
                  />
                ))}
              </div>
            </>
          )}

          {view === "pubs" && <PubsView />}
          {view === "barhop" && <BarHopView />}
          {view === "messages" && <ComingSoonView title="Messages" emoji="📬" copy="Your DMs are too embarrassing. We're protecting you from yourself." />}
          {view === "notifications" && <NotificationsView />}
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

          <BuzzwordDecrypter />



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
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex flex-col items-center justify-center px-3 py-1 min-w-[64px] text-[11px] transition-colors ${
        active
          ? "text-foreground border-b-2 border-primary -mb-px"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      <div className="relative">
        {icon}
        {badge ? (
          <span className="absolute -top-1.5 -right-2 bg-primary text-primary-foreground text-[9px] font-bold rounded-full size-4 grid place-items-center shadow-[0_0_10px_var(--primary)] animate-notif-glow">
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
  onShare,
  cheered,
  highlighted,
}: {
  post: Post;
  comments: Comment[];
  onCheers: () => void;
  onComment: (text: string, name: string) => void;
  onShare: () => void;
  cheered: boolean;
  highlighted?: boolean;
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
    <Card className={`border-border overflow-hidden ${highlighted ? "post-spotlight" : ""}`}>
      {highlighted && (
        <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
          <Sparkles className="size-3" /> Shared with you · spotlight
        </div>
      )}
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
        <ActionBtn onClick={onShare} label="Share" icon={<Share2 className="size-5" />} />
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

// ============================================================
// Pubs view (parody Jobs board)
// ============================================================
const PUB_JOBS = [
  {
    title: "Lead Happy Hour Architect",
    company: "Brewstack Inc.",
    location: "Remote · Anywhere with a tap",
    salary: "$160k + Unlimited IPA",
    type: "Full-time",
    tags: ["Remote", "Senior", "Pints/PR"],
    posted: "2h",
  },
  {
    title: "Senior Post-Mortem Email Drafter",
    company: "Latework Labs",
    location: "Hybrid · 2 days at the bar",
    salary: "$145k + Whiskey stipend",
    type: "Hybrid",
    tags: ["Hybrid", "Writing", "Damage control"],
    posted: "5h",
  },
  {
    title: "VP of Liquid Infrastructure",
    company: "Synergy & Sons LLC",
    location: "On-site · Must bring own flask",
    salary: "$220k + Equity in keg",
    type: "Executive",
    tags: ["Leadership", "Onsite", "BYOF"],
    posted: "1d",
  },
  {
    title: "Principal Engineer, Beer-Driven Development",
    company: "Stack Overpour",
    location: "Remote · Pacific Pint Time",
    salary: "$190k + Sabbatical at vineyard",
    type: "Full-time",
    tags: ["Remote", "Engineering"],
    posted: "1d",
  },
];

function PubsView() {
  const [applied, setApplied] = useState<string | null>(null);

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      <Card className="p-5 border-border bg-gradient-to-br from-card via-card to-primary/5">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-primary/20 grid place-items-center text-primary">
            <Briefcase className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Pubs · Jobs</h2>
            <p className="text-xs text-muted-foreground">
              Roles that prefer their KPIs poured, not measured.
            </p>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PUB_JOBS.map((job) => (
          <Card
            key={job.title}
            className="p-4 border-border hover:border-primary/50 transition group flex flex-col"
          >
            <div className="flex items-start gap-3 mb-2">
              <div className="size-10 rounded-md bg-gradient-to-br from-primary/30 to-accent/30 grid place-items-center text-lg shrink-0">
                🍺
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-[15px] leading-tight group-hover:text-primary transition">
                  {job.title}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">{job.company}</p>
              </div>
            </div>

            <div className="text-xs text-muted-foreground space-y-1 mb-3">
              <div className="flex items-center gap-1.5">
                <MapPin className="size-3" /> {job.location}
              </div>
              <div className="flex items-center gap-1.5">
                <Sparkles className="size-3 text-primary" /> {job.salary}
              </div>
            </div>

            <div className="flex flex-wrap gap-1 mb-3">
              {job.tags.map((t) => (
                <span
                  key={t}
                  className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 text-muted-foreground"
                >
                  {t}
                </span>
              ))}
            </div>

            <div className="mt-auto flex items-center justify-between">
              <span className="text-[11px] text-muted-foreground">Posted {job.posted} ago</span>
              <Button
                size="sm"
                onClick={() => setApplied(job.title)}
                className="rounded-full h-8 px-4 font-semibold"
              >
                Quick Apply
              </Button>
            </div>
          </Card>
        ))}
      </div>

      <Dialog open={!!applied} onOpenChange={(o) => !o && setApplied(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">🍻</span> Application submitted!
            </DialogTitle>
            <DialogDescription className="pt-2 leading-relaxed">
              Go grab a drink while HR ignores this. You'll receive a templated
              rejection email in 6–8 weeks. Best of luck out there, champ.
            </DialogDescription>
          </DialogHeader>
          {applied && (
            <p className="text-xs text-muted-foreground italic">
              Applied to: <span className="text-foreground font-medium">{applied}</span>
            </p>
          )}
          <Button onClick={() => setApplied(null)} className="rounded-full mt-2">
            Pour me one
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================
// Bar Hop view (parody My Network)
// ============================================================
const BAR_HOP_PROFILES = [
  { name: "Jamie O'Donnell", title: "Scrum Master | Open to Drinks", mutual: "12 mutual liver casualties" },
  { name: "Priya Kapoor", title: "Director of Synergy | 4x Hangover Survivor", mutual: "8 mutual standups skipped" },
  { name: "Marcus Trent", title: "Growth Hacker | Specializing in Vodka-Sodas & A/B Tests", mutual: "21 mutual happy hours" },
  { name: "Sam Whittaker", title: "Product Manager | I ship features and shots", mutual: "5 mutual all-hands naps" },
  { name: "Lena Park", title: "DevOps Engineer | CI/CD = Cocktails In, Drinks Continuously", mutual: "17 mutual incidents" },
  { name: "Casey Rivers", title: "Chief People & Pints Officer | We hire vibes", mutual: "3 mutual offsites" },
];

function BarHopView() {
  const [statuses, setStatuses] = useState<Record<string, "idle" | "pending" | "connected">>({});

  function connect(name: string) {
    setStatuses((s) => ({ ...s, [name]: "pending" }));
    setTimeout(() => {
      setStatuses((s) => ({ ...s, [name]: "connected" }));
    }, 1200);
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      <Card className="p-5 border-border bg-gradient-to-br from-card via-card to-accent/5">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-accent/20 grid place-items-center text-accent">
            <Users className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold">Bar Hop · Network</h2>
            <p className="text-xs text-muted-foreground">
              People who are professionally pretending to be sober. Same as you.
            </p>
          </div>
        </div>
      </Card>

      <Card className="border-border divide-y divide-border">
        {BAR_HOP_PROFILES.map((p) => {
          const status = statuses[p.name] ?? "idle";
          return (
            <div key={p.name} className="p-4 flex items-center gap-3">
              <div className="size-12 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 grid place-items-center font-bold text-base shrink-0">
                {initials(p.name)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-[15px] leading-tight truncate">{p.name}</div>
                <div className="text-xs text-muted-foreground line-clamp-1">{p.title}</div>
                <div className="text-[11px] text-muted-foreground/80 mt-0.5">{p.mutual}</div>
              </div>
              <Button
                size="sm"
                variant={status === "idle" ? "default" : status === "pending" ? "secondary" : "outline"}
                disabled={status !== "idle"}
                onClick={() => connect(p.name)}
                className="rounded-full h-8 px-4 font-semibold shrink-0 min-w-[160px]"
              >
                {status === "idle" && (
                  <>
                    <UserPlus className="size-3.5 mr-1.5" /> Connect
                  </>
                )}
                {status === "pending" && (
                  <>
                    <Clock className="size-3.5 mr-1.5 animate-spin" /> Pending Recovery…
                  </>
                )}
                {status === "connected" && (
                  <>
                    <Check className="size-3.5 mr-1.5 text-primary" /> Drinks Confirmed
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </Card>
    </div>
  );
}

function ComingSoonView({ title, emoji, copy }: { title: string; emoji: string; copy: string }) {
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

const BUZZWORDS: { phrase: string; translation: string }[] = [
  {
    phrase: "Let's take this offline",
    translation:
      "If I have to look at your shared screen for another 30 seconds I am opening a beer.",
  },
  {
    phrase: "Circle back next week",
    translation:
      "I am actively hungover and will not process this spreadsheet today.",
  },
  {
    phrase: "High-priority deliverable",
    translation:
      "The VP promised something to a client while drinking at an airport bar.",
  },
  {
    phrase: "Synergistic alignment",
    translation:
      "We are drinking together at 5:00 PM to forget this project structure.",
  },
];

function BuzzwordDecrypter() {
  const [phrase, setPhrase] = useState<string>(BUZZWORDS[0].phrase);
  const translation = BUZZWORDS.find((b) => b.phrase === phrase)?.translation ?? "";

  return (
    <Card className="p-4 border-border">
      <h4 className="text-sm font-semibold mb-1 flex items-center gap-1.5">
        <Sparkles className="size-4 text-primary" /> Corporate Buzzword Decrypter
      </h4>
      <p className="text-[11px] text-muted-foreground mb-3 leading-snug">
        Pick a phrase. We'll tell you what it actually meant.
      </p>
      <Select value={phrase} onValueChange={setPhrase}>
        <SelectTrigger className="h-9 text-xs">
          <SelectValue placeholder="Select a corporate phrase" />
        </SelectTrigger>
        <SelectContent>
          {BUZZWORDS.map((b) => (
            <SelectItem key={b.phrase} value={b.phrase} className="text-xs">
              {b.phrase}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <blockquote
        key={phrase}
        className="mt-3 relative rounded-lg border-l-4 border-primary bg-primary/10 px-3 py-2.5 text-xs italic leading-relaxed text-foreground/90 animate-in fade-in duration-300"
      >
        <span className="absolute -top-2 left-2 text-2xl leading-none text-primary/60 select-none">
          "
        </span>
        {translation}
      </blockquote>
    </Card>
  );
}

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

function NotificationsView() {
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


