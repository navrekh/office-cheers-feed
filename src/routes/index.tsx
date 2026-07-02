import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { toast } from "sonner";
import { Home, Bell, Search, LogOut } from "lucide-react";

import { LandingHero } from "@/components/LandingHero";
import PostComposer from "@/components/PostComposer";
import PostsFeed from "@/components/PostsFeed";
import CommentsDrawer from "@/components/CommentsDrawer";
import AuthModal from "@/components/AuthModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import NavItem from "@/components/landing/NavItem";
import NotificationsView from "@/components/views/NotificationsView";

import { useAuth, emailPrefix, signOut, corporateCodename } from "@/lib/useAuth";
import { useProfile } from "@/lib/useProfile";
import { pick, RANDOM_COMMENT_NAMES, snippetOf } from "@/lib/randomIdentity";
import type { Comment } from "@/lib/feedTypes";

export const Route = createFileRoute("/")({
  head: () => {
    const title = "DrinkedIn 🍻 | Anonymous Corporate Confessions & #TheGrind";
    const description =
      "Anonymous workplace confessions, satirical corporate humor, and the #TheGrind burnout portal. The anti-LinkedIn.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: "https://drinkedin.me/" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: "https://drinkedin.me/" }],
    };
  },
  component: Index,
});

function Index() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { profile } = useProfile(user?.id ?? null);

  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authReason, setAuthReason] = useState<string | undefined>(undefined);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifUnread, setNotifUnread] = useState(0);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});

  const userAlias = user ? emailPrefix(user.email) : null;
  const userCodename = user ? corporateCodename(user.email) : null;

  const requireAuth = useCallback((reason?: string) => {
    if (user) return true;
    setAuthReason(reason);
    setAuthModalOpen(true);
    return false;
  }, [user]);

  // Global auth-open event
  useEffect(() => {
    const onOpen = (e: Event) => {
      const reason = (e as CustomEvent).detail?.reason as string | undefined;
      if (user) return;
      setAuthReason(reason);
      setAuthModalOpen(true);
    };
    window.addEventListener("drinkedin:open-auth", onOpen);
    return () => window.removeEventListener("drinkedin:open-auth", onOpen);
  }, [user]);

  // Feed cards dispatch this when their 💬 chip is tapped.
  useEffect(() => {
    const onOpenComments = (e: Event) => {
      const postId = (e as CustomEvent).detail?.postId as string | undefined;
      if (postId) setActiveCommentPostId(postId);
    };
    window.addEventListener("drinkedin:open-comments", onOpenComments);
    return () => window.removeEventListener("drinkedin:open-comments", onOpenComments);
  }, []);

  // Load comments for the drawer on demand
  useEffect(() => {
    if (!activeCommentPostId) return;
    if (commentsByPost[activeCommentPostId]) return;
    (async () => {
      const { data } = await (supabase as any)
        .from("comments")
        .select("*")
        .eq("post_id", activeCommentPostId)
        .order("created_at", { ascending: true });
      if (data) {
        setCommentsByPost((prev) => ({ ...prev, [activeCommentPostId]: data as Comment[] }));
      }
    })();
  }, [activeCommentPostId, commentsByPost]);

  // Realtime comments feed (keeps drawer live)
  useEffect(() => {
    const channel = (supabase as any)
      .channel("comments-live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "comments" },
        (payload: any) => {
          const c = payload.new as Comment;
          setCommentsByPost((prev) => {
            const list = prev[c.post_id] || [];
            if (list.some((x) => x.id === c.id)) return prev;
            return { ...prev, [c.post_id]: [...list, c] };
          });
        }
      )
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, []);

  // Post-signup nudge
  const firstPostNudgeRef = useRef(false);
  useEffect(() => {
    if (!user || firstPostNudgeRef.current) return;
    firstPostNudgeRef.current = true;
    const nudgeKey = `drinkedin.firstPostNudged.${user.id}`;
    try {
      if (localStorage.getItem(nudgeKey) === "1") return;
      localStorage.setItem(nudgeKey, "1");
    } catch {}
    setTimeout(() => {
      toast.success("You're in. Welcome to the breakroom 🍻", {
        description: "Drop your first anonymous confession to activate your feed.",
        duration: 8000,
      });
    }, 800);
  }, [user]);

  async function addComment(postId: string, text: string, parentId?: string | null) {
    const trimmed = text.trim();
    if (!trimmed || !user) return;
    const alias = corporateCodename(user.email) || pick(RANDOM_COMMENT_NAMES);
    const optimistic: Comment = {
      id: `tmp-${Date.now()}`,
      post_id: postId,
      author_name: alias,
      body_text: trimmed,
      created_at: new Date().toISOString(),
      parent_id: parentId ?? null,
    } as Comment;
    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), optimistic],
    }));
    const { data, error } = await (supabase as any)
      .from("comments")
      .insert({
        post_id: postId,
        body_text: trimmed,
        author_name: alias,
        author_alias: alias,
        user_id: user.id,
        parent_id: parentId ?? null,
      })
      .select()
      .single();
    if (error) {
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter((c) => c.id !== optimistic.id),
      }));
      toast.error("Couldn't post your reply. Try again.");
      return;
    }
    if (data) {
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).map((c) => (c.id === optimistic.id ? (data as Comment) : c)),
      }));
    }
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top Nav */}
      <header className="sticky top-0 z-40 backdrop-blur border-b border-border bg-card/95">
        <div className="mx-auto max-w-5xl px-4 h-14 flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2 select-none">
            <div
              className="size-10 rounded-xl bg-primary text-primary-foreground grid place-items-center font-black text-xl"
              style={{ boxShadow: "0 0 20px rgba(251,191,36,0.55)" }}
            >
              🍻
            </div>
            <span
              className="hidden sm:block font-display text-2xl font-black tracking-tight"
              style={{ textShadow: "0 0 12px rgba(251,191,36,0.7)" }}
            >
              Drinked<span className="text-amber-400">In</span>
            </span>
          </Link>

          <div className="flex-1 max-w-sm ml-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Search confessions…"
                className="pl-9 bg-muted/60 border-transparent focus-visible:bg-background h-9 rounded-md"
              />
            </div>
          </div>

          <nav className="flex items-center gap-1 ml-auto">
            <NavItem icon={<Home className="size-5" />} label="Home" active onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} />
            <NavItem
              icon={<Bell className="size-5" />}
              label="Notifications"
              badge={notifUnread}
              active={notifOpen}
              onClick={() => {
                setNotifUnread(0);
                setNotifOpen(true);
              }}
            />
            <NavItem
              icon={<span className="text-base leading-none">💀</span>}
              label="#TheGrind"
              onClick={() => navigate({ to: "/thegrind" })}
            />
            <button
              type="button"
              onClick={() => {
                if (!user) {
                  setAuthReason("Sign in to access your profile.");
                  setAuthModalOpen(true);
                  return;
                }
                setProfileOpen(true);
              }}
              aria-label="Open profile menu"
              className={`ml-1 size-9 shrink-0 rounded-full grid place-items-center text-base font-bold transition ${user ? "bg-primary/20 text-primary ring-2 ring-primary/40 hover:bg-primary/30" : "bg-muted text-muted-foreground ring-2 ring-zinc-700/60 hover:bg-muted/70"}`}
            >
              {user ? "🍻" : "🕵️"}
            </button>
          </nav>
        </div>
      </header>

      {/* Main */}
      <main className="max-w-3xl mx-auto p-4 lg:p-6">
        <section className="space-y-6 min-w-0">
          {!user && (
            <div className="relative left-1/2 -translate-x-1/2 w-screen max-w-[100vw] overflow-x-hidden">
              <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-10">
                <LandingHero
                  onSignIn={(reason) => {
                    setAuthReason(reason);
                    setAuthModalOpen(true);
                  }}
                  onDecode={() => {}}
                />
              </div>
            </div>
          )}

          <ErrorBoundary label="Composer" message="Composer is reloading…">
            <div className="rounded-2xl p-3 bg-neutral-950/70 border border-neutral-800/70 backdrop-blur-[14px]">
              <PostComposer requireAuth={requireAuth} weekend={false} />
            </div>
          </ErrorBoundary>

          <section className="rounded-2xl bg-neutral-950/40 border border-neutral-900/50 backdrop-blur-[14px] overflow-hidden">
            <header className="flex items-center justify-between px-4 py-2.5 border-b border-neutral-900/60 bg-neutral-950/60 gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                <h2 className="text-sm font-bold tracking-wide uppercase">
                  🍻 Live Breakroom Feed
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  to="/thegrind"
                  className="inline-flex items-center gap-1.5 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-red-300 hover:bg-red-500/20 transition"
                >
                  💀 #TheGrind →
                </Link>
                <span className="text-[10px] font-bold tracking-[0.18em] text-amber-300/80">
                  LIVE · ANON
                </span>
              </div>
            </header>
            <div id="feed" className="p-3 sm:p-4 scroll-mt-20">
              <ErrorBoundary label="Feed" message="Feed is reconnecting…">
                <PostsFeed />
              </ErrorBoundary>
            </div>
          </section>

          <p className="text-[10px] text-muted-foreground/60 px-2 leading-relaxed pt-6 text-center">
            DrinkedIn © 2026 · A parody. Please drink responsibly.
          </p>
        </section>
      </main>

      <footer className="w-full border-t border-border/40 bg-background/80 px-4 py-3 text-center">
        <p className="text-[11px] text-muted-foreground/80 tracking-wide">
          Crafted with spite. Anonymous by design.
        </p>
      </footer>

      {/* Notifications Sheet */}
      <Sheet open={notifOpen} onOpenChange={setNotifOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md p-0 overflow-y-auto">
          <SheetHeader className="px-4 py-3 border-b border-border/60">
            <SheetTitle className="text-sm font-bold tracking-wide flex items-center gap-2">
              <Bell className="size-4" /> Notifications
            </SheetTitle>
          </SheetHeader>
          <div className="p-3">
            <NotificationsView />
          </div>
        </SheetContent>
      </Sheet>

      {/* Auth */}
      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        reason={authReason}
        defaultIntent="employee"
        compact
      />

      {/* Profile menu Dialog */}
      <Dialog open={profileOpen} onOpenChange={setProfileOpen}>
        <DialogContent className="max-w-md p-0 overflow-hidden border-border max-h-[90vh] overflow-y-auto">
          <div className="h-16 bg-gradient-to-br from-primary/40 via-accent/50 to-primary/30" />
          <div className="px-5 -mt-8 pb-5">
            <div className="size-16 rounded-full bg-card border-4 border-card grid place-items-center text-2xl shadow ring-2 ring-primary/40">
              🍻
            </div>
            <DialogHeader className="mt-2 text-left">
              <DialogTitle className="text-base">
                Welcome, <span className="text-primary">{userCodename ?? "Guest"}</span> 🍺
              </DialogTitle>
              <DialogDescription className="text-[11px]">
                Signed in as <span className="font-mono text-foreground/70">{userAlias}</span> · feed alias stays anonymous
              </DialogDescription>
            </DialogHeader>

            {user && (
              <>
                <Link
                  to="/profile"
                  onClick={() => setProfileOpen(false)}
                  className="mt-5 w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-[12px] font-semibold text-amber-950 bg-amber-500 hover:bg-amber-400 transition"
                >
                  Open profile settings
                </Link>
                <button
                  type="button"
                  onClick={async () => {
                    await signOut();
                    setProfileOpen(false);
                    toast("Logged out. 🚪");
                  }}
                  className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-[12px] font-medium text-muted-foreground hover:text-foreground border border-border/60 hover:border-border bg-card/40 hover:bg-muted/40 transition"
                >
                  <LogOut className="size-3.5" />
                  Logout
                </button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Comments */}
      <CommentsDrawer
        open={!!activeCommentPostId}
        onOpenChange={(v) => { if (!v) setActiveCommentPostId(null); }}
        postId={activeCommentPostId}
        postTitle={(() => {
          const list = activeCommentPostId ? commentsByPost[activeCommentPostId] : null;
          return list && list[0] ? snippetOf(list[0].body_text) : null;
        })()}
        comments={activeCommentPostId ? (commentsByPost[activeCommentPostId] || []) : []}
        signedIn={!!user}
        onRequireAuth={() => {
          setAuthReason("Sign in to drop a reply 💬");
          setAuthModalOpen(true);
        }}
        onSubmit={(pid, text, parentId) => addComment(pid, text, parentId)}
      />

      {/* silence unused profile warning */}
      {profile ? null : null}
    </div>
  );
}
