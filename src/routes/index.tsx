import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, useRef, useMemo, useCallback, lazy, Suspense, memo, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import { SITE, TOKENLENS } from "@/config";
import { notifyAdminNewPost } from "@/lib/adminNotify.functions";
import {
  generateHistoricalSimulatedFeed,
  generateSimulatedPost,
  isSimulatedPost,
} from "@/lib/mockFeed";
import { encodePostMeta, decodePostMeta } from "@/lib/postMeta";
import { VIBES, getVibe } from "@/lib/vibes";
import { GifPicker } from "@/components/GifPicker";
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
  Loader2,
  Sparkles,
  
  MapPin,
  UserPlus,
  Check,
  Clock,
  Rocket,
  Volume2,
  VolumeX,
  Lightbulb,
  AlertTriangle,
  Download,
  ExternalLink,
  Navigation,
  ShieldCheck,
  Users as UsersIcon,
} from "lucide-react";
import {
  CITIES,
  MERCHANTS,
  getSelectedCity,
  subscribeCity,
  mapsDirectionsUrl,
  type CityKey,
  type Merchant,
} from "@/lib/cityStore";
import { useGeolocation } from "@/hooks/useGeolocation";
import { getOrCreateSessionId, haversineKm } from "@/lib/geo";
import { LiveWorkspaceRadar, type ProximityFilter } from "@/components/LiveWorkspaceRadar";
import { ProximityAdDispatcher, dealCoord } from "@/components/ProximityAdDispatcher";
import { useMerchantDeals, type MerchantDeal } from "@/lib/useMerchantDeals";

// ---------- Client-side spam guard ----------
const RATE_KEY = "drinkedin.rate.posts";
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 2;
function checkRateLimit(): { ok: boolean; retryInMs: number } {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    const now = Date.now();
    const arr: number[] = raw ? JSON.parse(raw) : [];
    const recent = arr.filter((t) => now - t < RATE_WINDOW_MS);
    if (recent.length >= RATE_MAX) {
      const retry = RATE_WINDOW_MS - (now - recent[0]);
      return { ok: false, retryInMs: Math.max(retry, 30_000) };
    }
    return { ok: true, retryInMs: 0 };
  } catch {
    return { ok: true, retryInMs: 0 };
  }
}
function recordPostTimestamp() {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    const arr: number[] = raw ? JSON.parse(raw) : [];
    arr.push(Date.now());
    const trimmed = arr.slice(-10);
    localStorage.setItem(RATE_KEY, JSON.stringify(trimmed));
  } catch {}
}
function sanitizePostBody(raw: string): { ok: boolean; reason?: string; clean: string } {
  const clean = raw.trim();
  if (!clean) return { ok: false, reason: "Empty post — even silence costs HR money.", clean };
  if (/(.)\1{6,}/.test(clean)) return { ok: false, reason: "Repetitive character spam detected. Sober up the keyboard.", clean };
  if (clean.length < 2) return { ok: false, reason: "Too short to be a hot take.", clean };
  return { ok: true, clean };
}

// ---------- Lazy code-split modules (kept out of the initial bundle) ----------
const BarLocator = lazy(() => import("@/components/BarLocator"));
const DevConsole = lazy(() => import("@/components/DevConsole"));
// Image export is a one-shot click; dynamic import on demand
async function triggerDownloadPostCard(post: { id: string; author_name: string; author_headline: string; body_text: string; cheers_count: number }) {
  const mod = await import("@/lib/postCardImage");
  mod.downloadPostAsImage(post);
}


import AchievementBadges, { ACH_KEYS, bumpAchievement } from "@/components/AchievementBadges";
import MerchantFlashControl from "@/components/MerchantFlashControl";
import TaproomVisualizer from "@/components/TaproomVisualizer";
import DesperationGauge from "@/components/DesperationGauge";
import EmergencyDealOverlay from "@/components/EmergencyDealOverlay";
import CorporateBingo from "@/components/CorporateBingo";
import VerifiedWateringHole from "@/components/VerifiedWateringHole";
import HappyHourTicker from "@/components/HappyHourTicker";
import ClaimTicketModal from "@/components/ClaimTicketModal";
import AuthModal from "@/components/AuthModal";
import CommentsDrawer from "@/components/CommentsDrawer";
import { useAuth, emailPrefix, signOut, corporateCodename } from "@/lib/useAuth";
import { useProfile, isRlsDenied, RLS_DENIED_MESSAGE } from "@/lib/useProfile";
import { reportPost as reportPostRpc, tribunalVote as tribunalVoteRpc } from "@/lib/tribunal";
import BeerTipPopover from "@/components/BeerTipPopover";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { LogOut, Copy, Briefcase, KeyRound, FileText as DraftIcon } from "lucide-react";


function isHappyHourNow(d: Date = new Date()): boolean {
  const minutes = d.getHours() * 60 + d.getMinutes();
  return minutes >= 16 * 60 + 30 && minutes < 18 * 60;
}
export const Route = createFileRoute("/")({
  head: () => {
    const title = "DrinkedIn 🍻 | Anonymous Corporate Coping & Pub Parody";
    const description =
      "Anonymous workplace confessions, one-click viral Broetry, and verified happy hours in your tech hub city. Cope with corporate life, one pint at a time.";
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

type Post = {
  id: string;
  author_name: string;
  author_headline: string;
  body_text: string;
  cheers_count: number;
  created_at: string;
  claim_ticket?: string;
  post_type?: "user" | "merchant";
  merchant_website?: string;
  map_query_address?: string;
  user_id?: string | null;
  is_hidden?: boolean;
  attached_visual_url?: string | null;
  is_in_tribunal?: boolean;
  valid_votes?: number;
  misconduct_votes?: number;
};

function merchantToPost(m: Merchant, city: CityKey): Post {
  return {
    id: `merchant-${m.id}`,
    author_name: m.name,
    author_headline: `Verified Pub Partner 🛡️ · ${m.area} · ${city}`,
    body_text: `🔥 Tonight's Happy Hour Alert\n\n${m.deal}\n\nShow this DrinkedIn feed at the bar to redeem.`,
    cheers_count: m.base_heading * 3,
    created_at: new Date().toISOString(),
    post_type: "merchant",
    merchant_website: m.website,
    map_query_address: m.map_query_address,
  };
}

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

const PENDING_DRAFT_KEY = "drinkedin.pendingDraft.v1";
type PendingDraft = {
  body: string;
  gifUrl: string | null;
  vibeId: string | null;
  anonymous: boolean;
  authorName: string;
  authorHeadline: string;
  autoSubmit: boolean;
  ts: number;
};

function Index() {
  // Live geolocation (jittered). Coords here are ALREADY fuzzed by ±50–100 m
  // before they leave the useGeolocation hook — precise lat/lng never reach
  // the database or any other client. Declared first so all submit/insert
  // callbacks below can close over it.
  const { coords: geoCoords, status: geoStatus } = useGeolocation();

  const [posts, setPosts] = useState<Post[]>([]);
  const [commentsByPost, setCommentsByPost] = useState<Record<string, Comment[]>>({});
  const [body, setBody] = useState("");
  // Identity is resolved from the live Supabase session below. `authorName`
  // is ONLY populated when the user explicitly types a custom pseudonym
  // (Priority 1). Otherwise the cascade falls through to email prefix →
  // "Anonymous Guest". No mock seed names live here anymore.
  const [authorName, setAuthorName] = useState("");
  const [authorHeadline, setAuthorHeadline] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [gifUrl, setGifUrl] = useState<string | null>(null);
  const [vibeId, setVibeId] = useState<string | null>(null);
  const [attachedUrl, setAttachedUrl] = useState<string | null>(null);
  const [attachedPath, setAttachedPath] = useState<string | null>(null);
  const [uploadingPic, setUploadingPic] = useState<null | "bar" | "tasting">(null);
  const picInputRef = useRef<HTMLInputElement | null>(null);
  const picKindRef = useRef<"bar" | "tasting">("bar");
  const [gifPickerOpen, setGifPickerOpen] = useState(false);
  const [view, setView] = useState<ViewKey>("home");
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const [feedLoading, setFeedLoading] = useState(true);
  const [feedError, setFeedError] = useState<string | null>(null);
  const cheeredRef = useRef<Set<string>>(new Set());
  const [hangoverIndex, setHangoverIndex] = useState<number>(37);
  const [sortMode, setSortMode] = useState<"recent" | "top" | "mine" | "tribunal">("recent");
  const [proximity, setProximity] = useState<ProximityFilter>("city");
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifUnread, setNotifUnread] = useState<number>(4);
  const [notifPulseKey, setNotifPulseKey] = useState<number>(0);
  const seenMilestonesRef = useRef<Set<string>>(new Set());
  const seenCommentIdsRef = useRef<Set<string>>(new Set());
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [anonymous, setAnonymous] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [loopCount, setLoopCount] = useState<number>(1847);
  const [, force] = useState(0);
  const [devOpen, setDevOpen] = useState(false);
  const [happyHour, setHappyHour] = useState<boolean>(false);
  const [claimTicket, setClaimTicket] = useState<string | null>(null);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { profile, refresh: refreshProfile } = useProfile(user?.id ?? null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authReason, setAuthReason] = useState<string | undefined>(undefined);
  function requireAuth(reason?: string): boolean {
    if (user) return true;
    setAuthReason(reason);
    setAuthModalOpen(true);
    return false;
  }
  // Auto-fill composer alias from the signed-in user's email prefix (never the full email)
  const userAlias = user ? emailPrefix(user.email) : null;
  const userCodename = user ? corporateCodename(user.email) : null;
  const restoredDraftRef = useRef(false);

  // Seamless auth handoff: once the user is signed in, restore their saved
  // composer draft and auto-submit if the original action was a Post click.
  useEffect(() => {
    if (!user || restoredDraftRef.current) return;
    let raw: string | null = null;
    try { raw = localStorage.getItem(PENDING_DRAFT_KEY); } catch {}
    if (!raw) return;
    restoredDraftRef.current = true;
    let draft: PendingDraft | null = null;
    try { draft = JSON.parse(raw) as PendingDraft; } catch {}
    if (!draft) {
      try { localStorage.removeItem(PENDING_DRAFT_KEY); } catch {}
      return;
    }
    // Stale drafts (older than 1 hour) are dropped silently.
    if (Date.now() - (draft.ts || 0) > 60 * 60_000) {
      try { localStorage.removeItem(PENDING_DRAFT_KEY); } catch {}
      return;
    }
    // Hydrate the composer for visibility.
    setBody(draft.body || "");
    setGifUrl(draft.gifUrl || null);
    setVibeId(draft.vibeId || null);
    setAnonymous(!!draft.anonymous);
    if (draft.authorName) setAuthorName(draft.authorName);
    if (draft.authorHeadline) setAuthorHeadline(draft.authorHeadline);

    if (!draft.autoSubmit) return;

    // Auto-submit the saved draft directly under the new UID, then surface at top.
    (async () => {
      const hasVisual = !!(draft!.gifUrl || draft!.vibeId);
      const bodyForSanitize = draft!.body.trim() ? draft!.body : hasVisual ? "🍻" : draft!.body;
      const sanitized = sanitizePostBody(bodyForSanitize);
      if (!sanitized.ok) {
        toast.error(sanitized.reason || "Your saved draft didn't make the cut.");
        try { localStorage.removeItem(PENDING_DRAFT_KEY); } catch {}
        return;
      }
      const composed = encodePostMeta(
        { vibe: draft!.vibeId || undefined, gif: draft!.gifUrl || undefined },
        sanitized.clean
      );
      const { data, error } = await (supabase as any)
        .from("posts")
        .insert({
          author_name: draft!.anonymous ? "Anonymous Colleague" : (draft!.authorName || "Anonymous Intern"),
          author_headline: draft!.anonymous ? "Incognito | Drinking to Cope" : (draft!.authorHeadline || "Specializing in Liquid Refactoring"),
          body_text: composed,
          user_id: user.id,
        })
        .select()
        .single();
      try { localStorage.removeItem(PENDING_DRAFT_KEY); } catch {}
      if (!error && data) {
        setPosts((prev) => (prev.some((p) => p.id === data.id) ? prev : [data as Post, ...prev]));
        setBody("");
        setGifUrl(null);
        setVibeId(null);
        setSortMode("recent");
        setHighlightedId((data as Post).id);
        if ((data as any).claim_ticket) {
          setClaimTicket((data as any).claim_ticket as string);
          setClaimModalOpen(true);
        }
        toast.success("Welcome back — your draft just published 🍻", { description: "It's pinned to the top of the feed." });
      } else if (error) {
        toast.error("Couldn't auto-publish your saved draft. It's restored in the composer above.");
      }
    })();
  }, [user]);


  // Happy Hour Mode (16:30–18:00 local time)
  useEffect(() => {
    function tick() { setHappyHour(isHappyHourNow()); }
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  // Bingo-win listener: pre-fill composer with a humblebrag draft
  useEffect(() => {
    function onBingo(e: Event) {
      const draft = ((e as CustomEvent).detail as any)?.draft as string | undefined;
      if (draft) {
        setBody(draft);
        toast.success("BINGO! 🎯", { description: "Draft loaded into your composer." });
      }
    }
    window.addEventListener("drinkedin:bingo-win", onBingo as EventListener);
    return () => window.removeEventListener("drinkedin:bingo-win", onBingo as EventListener);
  }, []);

  // Legendary Asset badge: any of my posts crosses 100 cheers
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (localStorage.getItem(ACH_KEYS.legendary) === "1") return;
    let mine: string[] = [];
    try { mine = JSON.parse(localStorage.getItem(ACH_KEYS.myPosts) || "[]"); } catch {}
    if (!mine.length) return;
    const hit = posts.some((p) => mine.includes(p.id) && p.cheers_count >= 100);
    if (hit) {
      bumpAchievement("legendary", true);
      toast.success("🏆 Legendary Asset unlocked!", { description: "One of your posts broke 100 cheers." });
    }
  }, [posts]);

  const [mockOutage, setMockOutage] = useState(false);
  const logoPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Hidden developer console: Ctrl/Cmd + Shift + D
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "D" || e.key === "d")) {
        e.preventDefault();
        setDevOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Dev console event bus: burst sim, cache clear, outage toggle
  useEffect(() => {
    function onBurst(e: Event) {
      const count = ((e as CustomEvent).detail as any)?.count ?? 50;
      const fakes: Post[] = Array.from({ length: count }).map((_, i) => {
        const id = randomIdentity();
        return {
          id: `dev-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 7)}`,
          author_name: id.name,
          author_headline: id.headline,
          body_text: `[DEV BURST #${i + 1}] Simulated viral take — testing scroll stability under concurrent realtime load.`,
          cheers_count: Math.floor(Math.random() * 500),
          created_at: new Date(Date.now() - i * 50).toISOString(),
        };
      });
      setPosts((prev) => [...fakes, ...prev]);
    }
    function onClear() {
      cheeredRef.current.clear();
      setPosts([]);
      setCommentsByPost({});
      setFeedLoading(true);
    }
    function onOutage(e: Event) {
      const next = !!((e as CustomEvent).detail as any)?.outage;
      setMockOutage(next);
      if (next) {
        setFeedLoading(true);
      } else {
        setFeedLoading(false);
      }
    }
    window.addEventListener("drinkedin:dev-burst", onBurst as EventListener);
    window.addEventListener("drinkedin:dev-clear-cache", onClear);
    window.addEventListener("drinkedin:dev-toggle-outage", onOutage as EventListener);
    return () => {
      window.removeEventListener("drinkedin:dev-burst", onBurst as EventListener);
      window.removeEventListener("drinkedin:dev-clear-cache", onClear);
      window.removeEventListener("drinkedin:dev-toggle-outage", onOutage as EventListener);
    };
  }, []);

  // Hydrate persistent TokenLens counter on the client only (avoids SSR hydration mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("drinkedin.tokenlens.loopCount");
      const parsed = saved ? parseInt(saved, 10) : NaN;
      const start = Number.isFinite(parsed) && parsed >= 1400 ? parsed : 1400 + Math.floor(Math.random() * 1101);
      setLoopCount(start);
      localStorage.setItem("drinkedin.tokenlens.loopCount", String(start));
    } catch {}
    const id = setInterval(() => {
      setLoopCount((n) => {
        const next = n + 1;
        try { localStorage.setItem("drinkedin.tokenlens.loopCount", String(next)); } catch {}
        return next;
      });
    }, 180000);
    return () => clearInterval(id);
  }, []);

  // First-time visitor onboarding toast
  useEffect(() => {
    try {
      if (localStorage.getItem("drinkedin.visited") === "1") return;
      const t = setTimeout(() => {
        toast("Welcome to DrinkedIn! 🍻", {
          description:
            "Draft your corporate coping stories, turn simple complaints into dramatic LinkedIn-style 'Broetry' using our custom engine, and check the top banner to see how your engineering team can save on token bills.",
          duration: 14000,
          className: "drinkedin-onboard-toast",
          action: {
            label: "Let's drink! 🚀",
            onClick: () => {
              try { localStorage.setItem("drinkedin.visited", "1"); } catch {}
            },
          },
        });
        try { localStorage.setItem("drinkedin.visited", "1"); } catch {}
      }, 900);
      return () => clearTimeout(t);
    } catch {}
  }, []);


  const playClink = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const AC = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AC) return;
      const ctx = new AC();
      const now = ctx.currentTime;
      [1760, 2640].forEach((freq, i) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, now + i * 0.04);
        g.gain.exponentialRampToValueAtTime(0.18, now + i * 0.04 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.04 + 0.35);
        o.connect(g).connect(ctx.destination);
        o.start(now + i * 0.04);
        o.stop(now + i * 0.04 + 0.4);
      });
      setTimeout(() => ctx.close().catch(() => {}), 800);
    } catch {}
  }, [soundEnabled]);

  const broetrify = useCallback((raw: string) => {
    const text = raw.trim() || "I drank a beer during a meeting";
    const openers = [
      "I did it.",
      "Let that sink in.",
      "Nobody is talking about this.",
      "This changed everything for me.",
      "Hot take, but somebody had to say it.",
    ];
    const setups = [
      `Yesterday, ${text.toLowerCase()}. Camera off. Microphone muted.`,
      `Last quarter, ${text.toLowerCase()}. No slide deck. No agenda. Just vibes.`,
      `This morning, ${text.toLowerCase()}. While my calendar was on fire.`,
      `Mid-standup, ${text.toLowerCase()}. The Jira board was screaming.`,
    ];
    const whys = ["Why?", "Here's the thing:", "And the lesson?", "But here's what nobody tells you:"];
    const philosophies = [
      "Because true leadership isn't about sitting through 60-minute slide decks sober. It's about optimizing liquid infrastructure when project scope creeps.",
      "Because synergy is a lie. Hydration with hops is the only real KPI.",
      "Because the best 1:1s happen at the bar, not in a Zoom breakout room.",
      "Because you can't refactor a meeting, but you can absolutely refactor your sobriety.",
    ];
    const realizations = [
      "It made me realize: Sometimes, you have to let the codebase crash to appreciate the happy hour.",
      "It hit me: Burnout is just dehydration with a sprint review attached.",
      "And just like that, I understood: Every great pivot starts with a pint.",
      "That's when it clicked: The roadmap was never the destination. The bar was.",
    ];
    const ctas = [
      "Agree? Let's take it offline. 🍻",
      "Thoughts? Drop a 🍺 if this resonates.",
      "Who else is brave enough to admit it? 👇",
      "Repost if you've been there. Mute if you can't handle the truth.",
    ];
    const hashtags = [
      "#Mindset #Growth #LiquidRefactoring",
      "#Leadership #Hustle #HoppyHour",
      "#Synergy #Wellness #BrewedDifferent",
      "#Founders #Resilience #PintDriven",
    ];
    const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
    return [
      pick(openers),
      "",
      pick(setups),
      "",
      pick(whys),
      "",
      pick(philosophies),
      "",
      pick(realizations),
      "",
      pick(ctas),
      "",
      pick(hashtags),
    ].join("\n");
  }, []);


  const ANON_NAME = "Anonymous Colleague";
  const ANON_HEADLINE = "Incognito | Drinking to Cope";
  const GUEST_NAME = "Anonymous Guest 🕵️‍♂️";

  // Cascading identity resolution — runs on every render so the moment
  // `onAuthStateChange` fires inside useAuth and updates `user`, this
  // recomputes and the composer + sidebar flip to the new pseudonym
  // without any manual reload.
  //   P1: user-typed custom alias (anything in the Input box)
  //   P2: local-part of the verified auth email (e.g. dev_guy99 🎭)
  //   P3: logged-out fallback → Anonymous Guest 🕵️‍♂️
  const typedAlias = authorName.trim();
  const resolvedName = typedAlias
    ? typedAlias
    : user
      ? `${emailPrefix(user.email)} 🎭`
      : GUEST_NAME;
  const resolvedHeadline = authorHeadline.trim() || (user ? "Signed in · feed alias stays anonymous" : "Off-the-clock preview mode");

  const displayName = anonymous ? ANON_NAME : resolvedName;
  const displayHeadline = anonymous ? ANON_HEADLINE : resolvedHeadline;



  useEffect(() => {
    let mounted = true;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;

    // Resilience: hydrate from localStorage cache immediately so the feed never blanks
    try {
      const cachedPosts = localStorage.getItem("drinkedin.cache.posts");
      const cachedComments = localStorage.getItem("drinkedin.cache.comments");
      if (cachedPosts) {
        const parsed = JSON.parse(cachedPosts) as Post[];
        if (Array.isArray(parsed) && parsed.length) {
          setPosts(parsed);
          setFeedLoading(false);
        }
      }
      if (cachedComments) {
        const parsed = JSON.parse(cachedComments) as Record<string, Comment[]>;
        if (parsed && typeof parsed === "object") setCommentsByPost(parsed);
      }
    } catch {}

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
        if (postsRes.data) {
          const real = postsRes.data as Post[];
          // Simulated Corporate Pulse: if the global feed is sparse, hydrate
          // with 30 historical mock posts so the timeline never feels empty.
          if (real.length < 20) {
            const sims = generateHistoricalSimulatedFeed(30) as unknown as Post[];
            setPosts([...real, ...sims]);
          } else {
            setPosts(real);
          }
        }
        if (commentsRes.data) {
          const grouped: Record<string, Comment[]> = {};
          (commentsRes.data as Comment[]).forEach((c) => {
            (grouped[c.post_id] ||= []).push(c);
          });
          setCommentsByPost(grouped);
        }
        setFeedLoading(false);
      } catch (err: any) {
        console.warn("[DrinkedIn] feed load hiccup, falling back to local cache…", err?.message || err);
        if (!mounted) return;
        // If we have a cache, keep the feed visible and quietly retry in the background
        try {
          const cachedPosts = localStorage.getItem("drinkedin.cache.posts");
          if (cachedPosts && JSON.parse(cachedPosts).length) {
            setFeedLoading(false);
            setFeedError(null);
          } else {
            setFeedError("The bartender dropped the connection. Re-pouring…");
          }
        } catch {
          setFeedError("The bartender dropped the connection. Re-pouring…");
        }
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

  // Resilience: mirror feed state to localStorage so transient outages stay invisible
  useEffect(() => {
    if (!posts.length) return;
    try { localStorage.setItem("drinkedin.cache.posts", JSON.stringify(posts.slice(0, 100))); } catch {}
  }, [posts]);

  useEffect(() => {
    if (!Object.keys(commentsByPost).length) return;
    try { localStorage.setItem("drinkedin.cache.comments", JSON.stringify(commentsByPost)); } catch {}
  }, [commentsByPost]);

  // Simulated Corporate Pulse: drop a fresh mock post onto the top of the feed
  // every 45–90s so the timeline feels like a live global user base.
  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;
    function schedule() {
      const delay = 45_000 + Math.floor(Math.random() * 45_000);
      timer = setTimeout(() => {
        if (cancelled) return;
        const sim = generateSimulatedPost() as unknown as Post;
        setPosts((prev) => [sim, ...prev]);
        schedule();
      }, delay);
    }
    schedule();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);




  async function handlePicSelected(file: File) {
    if (!user) {
      setAuthReason("Sign in to upload a bar pic — keeps uploads tied to a real account.");
      setAuthModalOpen(true);
      return;
    }
    if (!/^image\/(jpe?g|png)$/i.test(file.type)) {
      toast.error("Only JPG, JPEG, or PNG files please.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      toast.error("That image is over 8 MB — pick a smaller pour.");
      return;
    }
    const kind = picKindRef.current;
    setUploadingPic(kind);
    try {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
      const path = `${user.id}/${Date.now()}_${kind}_${safeName}`;
      const { error: upErr } = await supabase.storage
        .from("bar_pics")
        .upload(path, file, { cacheControl: "3600", upsert: false, contentType: file.type });
      if (upErr) {
        toast.error("Upload failed", { description: upErr.message });
        return;
      }
      // Long-lived signed URL (~10 years) since the bucket is private but the
      // RLS policy on storage.objects allows public read for bar_pics.
      const { data: signed, error: signErr } = await supabase.storage
        .from("bar_pics")
        .createSignedUrl(path, 60 * 60 * 24 * 365 * 10);
      if (signErr || !signed?.signedUrl) {
        toast.error("Couldn't generate a preview link. Try again.");
        return;
      }
      setAttachedPath(path);
      setAttachedUrl(signed.signedUrl);
      toast.success(kind === "tasting" ? "Tasting locked in 📷" : "Bar pic attached 📷");
    } catch (e: any) {
      toast.error("Upload failed", { description: e?.message });
    } finally {
      setUploadingPic(null);
    }
  }

  function triggerPicUpload(kind: "bar" | "tasting") {
    if (!user) {
      setAuthReason("Sign in to upload a bar pic — keeps uploads tied to a real account.");
      setAuthModalOpen(true);
      return;
    }
    picKindRef.current = kind;
    picInputRef.current?.click();
  }

  async function clearAttachedPic() {
    if (attachedPath) {
      // Best-effort delete; RLS allows the owner only.
      void supabase.storage.from("bar_pics").remove([attachedPath]).catch(() => {});
    }
    setAttachedPath(null);
    setAttachedUrl(null);
  }

  async function submitPost(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!user) {
      // Stash the draft so it survives the Magic-Link round-trip / Google redirect.
      try {
        const draft = { body, gifUrl, vibeId, anonymous, authorName, authorHeadline, autoSubmit: true, ts: Date.now() };
        localStorage.setItem(PENDING_DRAFT_KEY, JSON.stringify(draft));
      } catch {}
      setAuthReason("Sign in to post — your draft is saved and will publish the moment your session activates.");
      setAuthModalOpen(true);
      return;
    }
    // Allow body-less posts when a vibe or GIF is attached — the visual carries the post.
    const hasVisual = !!(gifUrl || vibeId);
    const bodyForSanitize = body.trim() ? body : hasVisual ? "🍻" : body;
    const sanitized = sanitizePostBody(bodyForSanitize);
    if (!sanitized.ok) {
      toast.error(sanitized.reason || "That post didn't make the cut.");
      return;
    }
    const rate = checkRateLimit();
    if (!rate.ok) {
      setSubmitting(true);
      toast.error("Whoa there, colleague! Your blood alcohol content or posting speed is too high for HR. Take a sip of water and try again in 30 seconds. 🍻");
      setTimeout(() => setSubmitting(false), Math.min(rate.retryInMs, 30_000));
      return;
    }
    setSubmitting(true);
    const composed = encodePostMeta(
      { vibe: vibeId || undefined, gif: gifUrl || undefined },
      sanitized.clean
    );
    const { data, error } = await (supabase as any)
      .from("posts")
      .insert({
        author_name: anonymous ? ANON_NAME : (authorName || "Anonymous Intern"),
        author_headline: anonymous ? ANON_HEADLINE : (authorHeadline || "Specializing in Liquid Refactoring"),
        body_text: composed,
        user_id: user?.id ?? null,
        post_type: "user",
        attached_visual_url: attachedUrl ?? null,
        latitude: geoCoords?.latitude ?? null,
        longitude: geoCoords?.longitude ?? null,
      })
      .select()
      .single();
    if (!error && data) {
      recordPostTimestamp();
      try { localStorage.removeItem(PENDING_DRAFT_KEY); } catch {}
      // Fire a presence beacon so the radar lights up for nearby colleagues.
      if (geoCoords) {
        void (supabase as any).from("check_ins").insert({
          session_id: getOrCreateSessionId(),
          user_id: user?.id ?? null,
          activity: "posting",
          city: selectedCity,
          latitude: geoCoords.latitude,
          longitude: geoCoords.longitude,
        });
      }
      setPosts((prev) => (prev.some((p) => p.id === data.id) ? prev : [data as Post, ...prev]));
      setBody("");
      setGifUrl(null);
      setVibeId(null);
      setAttachedUrl(null);
      setAttachedPath(null);
      try {
        const mine: string[] = JSON.parse(localStorage.getItem(ACH_KEYS.myPosts) || "[]");
        if (!mine.includes(data.id)) {
          mine.push(data.id);
          localStorage.setItem(ACH_KEYS.myPosts, JSON.stringify(mine.slice(-50)));
        }
      } catch {}
      if (anonymous) bumpAchievement("whistleblower", true);
      // Surface the unique claim ticket so the author can track the post from any device.
      if ((data as any).claim_ticket) {
        setClaimTicket((data as any).claim_ticket as string);
        setClaimModalOpen(true);
      }
      // Optional admin webhook (Slack/Discord). No-op unless ADMIN_WEBHOOK_URL is set on the server.
      void notifyAdminNewPost({
        data: {
          snippet: sanitized.clean.slice(0, 200),
          author: anonymous ? "Anonymous" : (authorName || "Anonymous Intern"),
        },
      }).catch(() => {});
    } else if (error) {
      if (isRlsDenied(error)) {
        toast.error(RLS_DENIED_MESSAGE);
      } else {
        toast.error("Couldn't post that round. Try again in a sec.");
      }
    }
    setSubmitting(false);
  }

  const cheers = useCallback(async (post: Post) => {
    if (!user) {
      setAuthReason("Sign in to send a Cheers 🍻 — it keeps our metrics honest and your feed personalized.");
      setAuthModalOpen(true);
      return;
    }
    if (cheeredRef.current.has(post.id)) return;
    cheeredRef.current.add(post.id);
    force((n) => n + 1);
    playClink();
    bumpAchievement("cheers", 1);
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, cheers_count: p.cheers_count + 1 } : p))
    );
    // Simulated + merchant posts live only in local state — skip the live RPC.
    if (isSimulatedPost(post) || post.post_type === "merchant" || post.id.startsWith("merchant-")) return;
    await (supabase as any).rpc("increment_cheers", { post_id: post.id });
  }, [playClink, user]);

  const addComment = useCallback(async (postId: string, text: string, name?: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!user) {
      setAuthReason("Sign in to drop a comment 💬 — keeps our breakroom spam-free.");
      setAuthModalOpen(true);
      return;
    }
    const alias = name || corporateCodename(user.email) || pick(RANDOM_COMMENT_NAMES);
    const optimistic: Comment = {
      id: `tmp-${Date.now()}-${Math.random()}`,
      post_id: postId,
      author_name: alias,
      body_text: trimmed,
      created_at: new Date().toISOString(),
    };
    setCommentsByPost((prev) => ({
      ...prev,
      [postId]: [...(prev[postId] || []), optimistic],
    }));
    try {
      const { data, error } = await (supabase as any)
        .from("comments")
        .insert({
          post_id: postId,
          body_text: trimmed,
          author_name: alias,
          author_alias: alias,
          user_id: user.id,
          latitude: geoCoords?.latitude ?? null,
          longitude: geoCoords?.longitude ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      if (data) {
        setCommentsByPost((prev) => ({
          ...prev,
          [postId]: (prev[postId] || []).map((c) => (c.id === optimistic.id ? (data as Comment) : c)),
        }));
      }
    } catch (err) {
      console.warn("[DrinkedIn] comment insert failed", err);
      setCommentsByPost((prev) => ({
        ...prev,
        [postId]: (prev[postId] || []).filter((c) => c.id !== optimistic.id),
      }));
      toast.error("Couldn't post your reply. Try again in a sec.");
    }
  }, [user, geoCoords?.latitude, geoCoords?.longitude]);

  const reportPost = useCallback(async (post: Post) => {
    if (isSimulatedPost(post) || post.post_type === "merchant" || post.id.startsWith("merchant-")) {
      toast("Merchant ads can't be sent to the tribunal 🛡️");
      return;
    }
    if (!user) {
      setAuthReason("Sign in to flag a post — keeps our tribunal honest.");
      setAuthModalOpen(true);
      return;
    }
    setPosts((prev) =>
      prev.map((p) => (p.id === post.id ? { ...p, is_in_tribunal: true } : p))
    );
    const res = await reportPostRpc(post.id);
    if (!res.ok) {
      toast.error("Couldn't file your report. Try again in a sec.");
      return;
    }
    toast("🚨 Sent to the HR Tribunal ⚖️", {
      description: "Three Gross Misconduct votes and this post is auto-scrubbed.",
    });
  }, [user]);

  const voteTribunal = useCallback(async (post: Post, vote: "valid" | "misconduct") => {
    if (!user) {
      setAuthReason("Sign in to cast a tribunal vote — one vote per colleague.");
      setAuthModalOpen(true);
      return;
    }
    const res = await tribunalVoteRpc(post.id, vote);
    if (!res.ok) {
      if (isRlsDenied(res.error)) toast.error(RLS_DENIED_MESSAGE);
      else toast.error("Vote didn't go through. Try again in a sec.");
      return;
    }
    if (res.data) {
      setPosts((prev) =>
        prev.map((p) =>
          p.id === post.id
            ? {
                ...p,
                valid_votes: res.data!.valid_votes,
                misconduct_votes: res.data!.misconduct_votes,
                is_hidden: res.data!.is_hidden,
              }
            : p
        )
      );
      if (res.data.is_hidden) {
        toast("🛑 Scrubbed from the feed", {
          description: "The tribunal has spoken — post permanently hidden.",
        });
      } else if (vote === "valid") {
        toast.success("Valid coping mechanism 🍺");
      } else {
        toast(`Gross Misconduct strike ${res.data.misconduct_votes}/3 🛑`);
      }
    }
  }, [user]);



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
    const url = SITE.shareUrl(postId);
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
    if (typeof window === "undefined") return;
    const w = window as any;
    (w.__drinkedinEvents ||= []).push({
      event: "tokenlens_banner_click",
      ts: new Date().toISOString(),
      path: window.location.pathname,
    });
  }, []);






  // Track selected tech hub city for merchant feed injection
  const [selectedCity, setSelectedCityState] = useState<CityKey>("Bangalore");
  useEffect(() => {
    setSelectedCityState(getSelectedCity());
    return subscribeCity(setSelectedCityState);
  }, []);

  // Drop a "browsing_deals" presence beacon whenever we first acquire a fix.
  useEffect(() => {
    if (!geoCoords) return;
    const sessionId = getOrCreateSessionId();
    void (supabase as any).from("check_ins").insert({
      session_id: sessionId,
      user_id: user?.id ?? null,
      activity: "browsing_deals",
      city: selectedCity,
      latitude: geoCoords.latitude,
      longitude: geoCoords.longitude,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [geoCoords?.latitude, geoCoords?.longitude]);

  // Sort posts by selected mode, inject merchant ads at fixed slots, pin highlighted
  // Employee of the Day — most-cheered real user post in the last 24h.
  const employeeOfDay = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    const candidates = posts.filter(
      (p) =>
        !p.is_hidden &&
        !p.is_in_tribunal &&
        p.post_type !== "merchant" &&
        !isSimulatedPost(p) &&
        new Date(p.created_at).getTime() >= cutoff &&
        p.cheers_count >= 1
    );
    if (!candidates.length) return null;
    return candidates.reduce((best, p) => (p.cheers_count > best.cheers_count ? p : best));
  }, [posts]);

  const orderedPosts = useMemo(() => {
    // Tribunal — flagged posts not yet auto-hidden, newest first.
    if (sortMode === "tribunal") {
      return [...posts]
        .filter((p) => p.is_in_tribunal && !p.is_hidden)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    // "My Desk" — strictly the signed-in user's own posts, newest first, no ads.
    if (sortMode === "mine") {
      if (!user) return [];
      return [...posts]
        .filter((p) => (p as any).user_id === user.id && !p.is_hidden)
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
    const proximityKm = proximity === "tech-park" ? 0.5 : proximity === "lunch-dash" ? 2 : Infinity;
    const visible = [...posts].filter((p) => {
      if (p.is_hidden) return false;
      if (proximityKm !== Infinity) {
        if (!geoCoords) return true; // no fix yet → don't hide everything
        const d = haversineKm(geoCoords, {
          latitude: (p as any).latitude,
          longitude: (p as any).longitude,
        });
        if (!isFinite(d) || d > proximityKm) return false;
      }
      return true;
    });
    const sorted = visible.sort((a, b) => {
      if (sortMode === "top") return b.cheers_count - a.cheers_count;
      // "recent" mode: when we have a live geo fix, elevate physically-close
      // posts (within 5 km) above the rest. Recency still wins inside each band.
      if (sortMode === "recent" && geoCoords) {
        const da = haversineKm(geoCoords, {
          latitude: (a as any).latitude,
          longitude: (a as any).longitude,
        });
        const db = haversineKm(geoCoords, {
          latitude: (b as any).latitude,
          longitude: (b as any).longitude,
        });
        const aNear = isFinite(da) && da <= 5 ? 0 : 1;
        const bNear = isFinite(db) && db <= 5 ? 0 : 1;
        if (aNear !== bNear) return aNear - bNear;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    // Inject merchant ads for the active city at slots 2 and 6.
    // Skip ads when the user has narrowed the spatial filter — strict
    // proximity modes should show only nearby colleague chatter.
    const merchants = proximityKm === Infinity ? (MERCHANTS[selectedCity] ?? []) : [];
    const withAds: Post[] = [...sorted];
    if (merchants[0]) withAds.splice(Math.min(2, withAds.length), 0, merchantToPost(merchants[0], selectedCity));
    if (merchants[1]) withAds.splice(Math.min(6, withAds.length), 0, merchantToPost(merchants[1], selectedCity));

    // Pin Employee of the Day in "recent" mode.
    let withPin = withAds;
    if (sortMode === "recent" && employeeOfDay && withAds.some((p) => p.id === employeeOfDay.id)) {
      const rest = withAds.filter((p) => p.id !== employeeOfDay.id);
      withPin = [employeeOfDay, ...rest];
    }

    if (!highlightedId) return withPin;
    const idx = withPin.findIndex((p) => p.id === highlightedId);
    if (idx < 0) return withPin;
    return [withPin[idx], ...withPin.slice(0, idx), ...withPin.slice(idx + 1)];
  }, [posts, highlightedId, sortMode, selectedCity, user, employeeOfDay, geoCoords?.latitude, geoCoords?.longitude, proximity]);

  // List of the signed-in user's own posts, used by the Tickets accordion.
  const myPosts = useMemo(() => {
    if (!user) return [] as Post[];
    return [...posts]
      .filter((p) => (p as any).user_id === user.id)
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [posts, user]);

  // Live notification badge: pulse + bump unread whenever one of MY posts ticks past
  // a Cheers milestone (10 / 50 / 100), or someone replies on one of my threads.
  useEffect(() => {
    const seen = seenMilestonesRef.current;
    let bump = 0;
    for (const p of myPosts) {
      for (const m of [10, 50, 100]) {
        const key = `${p.id}:${m}`;
        if (p.cheers_count >= m && !seen.has(key)) {
          seen.add(key);
          bump += 1;
        }
      }
    }
    if (bump > 0) {
      setNotifUnread((n) => n + bump);
      setNotifPulseKey((k) => k + 1);
    }
  }, [myPosts]);

  useEffect(() => {
    if (!user) return;
    const myIds = new Set(myPosts.map((p) => p.id));
    if (myIds.size === 0) return;
    const seen = seenCommentIdsRef.current;
    let bump = 0;
    for (const pid of Object.keys(commentsByPost)) {
      if (!myIds.has(pid)) continue;
      for (const c of commentsByPost[pid] || []) {
        if (c.id.startsWith("tmp-")) continue;
        if ((c as any).user_id && (c as any).user_id === user.id) continue;
        if (!seen.has(c.id)) {
          seen.add(c.id);
          bump += 1;
        }
      }
    }
    if (bump > 0) {
      setNotifUnread((n) => n + bump);
      setNotifPulseKey((k) => k + 1);
    }
  }, [commentsByPost, myPosts, user]);

  useEffect(() => {
    if (notifOpen) setNotifUnread(0);
  }, [notifOpen]);

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
          <span className="shrink-0">🔥</span>
          <span className="text-foreground/90">
            Running commercial LLMs? TokenLens has caught{" "}
            <span className="font-bold text-primary tabular-nums">{loopCount.toLocaleString()}</span>{" "}
            runaway prompt loops this week alone.
          </span>
          <a
            href={TOKENLENS.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={trackTokenLensClick}
            className="inline-flex items-center gap-1 font-bold text-primary hover:text-primary/80 underline decoration-primary/50 decoration-2 underline-offset-4 transition"
          >
            Secure your API budget now →
          </a>
          <div className="relative group">
            <button
              type="button"
              onClick={trackTokenLensClick}
              className="inline-flex items-center gap-1 rounded-md border border-border/60 hover:border-primary/60 px-2 py-0.5 text-[11px] font-semibold text-foreground/80 hover:text-primary transition"
              aria-label="View simulated LLM cost leak categories"
            >
              <AlertTriangle className="size-3" />
              View Leaks
            </button>
            <div
              role="tooltip"
              className="absolute left-1/2 top-full z-50 mt-2 w-72 -translate-x-1/2 rounded-lg border border-border bg-popover/95 backdrop-blur p-3 text-left text-[11px] leading-relaxed shadow-2xl opacity-0 translate-y-1 pointer-events-none group-hover:opacity-100 group-hover:translate-y-0 group-hover:pointer-events-auto group-focus-within:opacity-100 group-focus-within:pointer-events-auto transition"
            >
              <div className="text-[10px] uppercase tracking-wider font-bold text-primary mb-1.5">Live leaks caught · click to fix</div>
              <ul className="space-y-1 text-foreground/90">
                {[
                  { emoji: "⚠️", label: "Runaway Agent Loops Stopped", stat: "412" },
                  { emoji: "⚠️", label: "Opaque Multi-Tenant Waste Caught", stat: "$8,420" },
                  { emoji: "⚠️", label: "Idle Sandbox API Key Leakage Blocked", stat: "1,105" },
                ].map((leak) => (
                  <li key={leak.label}>
                    <a
                      href={TOKENLENS.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={trackTokenLensClick}
                      className="flex items-start gap-1.5 rounded px-1.5 py-1 -mx-1.5 hover:bg-primary/10 hover:text-primary transition"
                    >
                      <span>{leak.emoji}</span>
                      <span>{leak.label}: <span className="font-bold text-primary tabular-nums">{leak.stat}</span></span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          {happyHour && (
            <span className="ml-1 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-amber-500/20 text-amber-200 border border-amber-400/60 shadow-[0_0_14px_rgba(251,191,36,0.5)] animate-fade-in">
              🍻 Happy Hour is Active! All 'Cheers' clicks give double telemetry points.
            </span>
          )}
          <button
            type="button"
            onClick={() => setSoundEnabled((s) => !s)}
            aria-label={soundEnabled ? "Mute clink sound" : "Unmute clink sound"}
            title={soundEnabled ? "Clink sound: ON" : "Clink sound: OFF"}
            className="ml-1 inline-flex items-center justify-center size-6 rounded-full border border-border/60 hover:border-primary/60 hover:text-primary text-muted-foreground transition"
          >
            {soundEnabled ? <Volume2 className="size-3.5" /> : <VolumeX className="size-3.5" />}
          </button>
        </div>
      </div>


      {/* Top Nav */}
      <header className={`sticky top-0 z-40 backdrop-blur border-b shadow-sm transition-colors ${happyHour ? "happy-hour-header border-amber-300/50" : "bg-card/95 border-border"}`}>
        <div className="mx-auto max-w-7xl px-4 h-14 flex items-center gap-3">
          <div
            className="flex items-center gap-2 select-none"
            onPointerDown={() => {
              if (logoPressTimer.current) clearTimeout(logoPressTimer.current);
              logoPressTimer.current = setTimeout(() => setDevOpen(true), 5000);
            }}
            onPointerUp={() => {
              if (logoPressTimer.current) { clearTimeout(logoPressTimer.current); logoPressTimer.current = null; }
            }}
            onPointerLeave={() => {
              if (logoPressTimer.current) { clearTimeout(logoPressTimer.current); logoPressTimer.current = null; }
            }}
          >
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
            <NavItem icon={<Bell className="size-5" />} label="Notifications" badge={notifUnread} pulseKey={notifPulseKey} active={notifOpen} onClick={() => setNotifOpen((o) => !o)} />
          </nav>
        </div>
        <HappyHourTicker />
      </header>

      <EmergencyDealOverlay />


      {/* 3-column layout */}
      <main className="mx-auto max-w-7xl px-4 py-6 grid grid-cols-12 gap-6">
        <h1 className="sr-only">
          DrinkedIn — the corporate sanctuary for anonymous coping, viral Broetry, and verified local happy hours
        </h1>
        {/* Left sidebar */}
        <aside className="hidden lg:block col-span-3 space-y-4">
          <Card className="overflow-hidden p-0 border-border">
            <div className="h-16 bg-gradient-to-br from-primary/40 via-accent/50 to-primary/30" />
            <div className="px-4 pb-4 -mt-8">
              <div className={`size-16 rounded-full bg-card border-4 border-card grid place-items-center text-2xl shadow transition ${user ? "ring-2 ring-primary/40" : "ring-2 ring-zinc-700/60 grayscale"}`}>
                {authLoading ? "…" : user ? "🍻" : "🕵️‍♂️"}
              </div>
              {authLoading ? (
                <div className="mt-2 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-2/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              ) : user ? (
                <>
                  <h3 className="mt-2 font-semibold text-base leading-tight">
                    Welcome, <span className="text-primary">{userCodename}</span> 🍺
                  </h3>
                  <div className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-300">
                    <ShieldCheck className="size-3" />
                    Verified Session ✔️
                  </div>
                  <p className="text-[11px] text-muted-foreground/80 mt-2 leading-snug">
                    Signed in as <span className="font-mono text-foreground/70">{userAlias}</span> · feed alias stays anonymous
                  </p>
                  <Accordion type="single" collapsible className="mt-3 -mx-1">
                    <AccordionItem value="tickets" className="border border-amber-400/30 rounded-md bg-amber-500/5">
                      <AccordionTrigger className="px-3 py-2 text-[11px] font-semibold text-amber-200 hover:no-underline hover:text-amber-100">
                        <span className="inline-flex items-center gap-1.5">
                          <KeyRound className="size-3.5" />
                          My Administrative Access Tickets
                        </span>
                      </AccordionTrigger>
                      <AccordionContent className="px-2 pt-1 pb-2">
                        {myPosts.length === 0 ? (
                          <p className="text-[11px] text-muted-foreground px-1 py-2 leading-snug">
                            No tickets yet. Post your first story to mint a tracking key.
                          </p>
                        ) : (
                          <ul className="space-y-1 max-h-48 overflow-y-auto pr-1">
                            {myPosts.map((p) => {
                              const ticket = (p as any).claim_ticket as string | undefined;
                              if (!ticket) return null;
                              return (
                                <li key={p.id} className="flex items-center gap-1.5 group rounded px-1.5 py-1 hover:bg-amber-500/10">
                                  <code className="flex-1 text-[10.5px] font-mono text-amber-200 truncate" title={ticket}>{ticket}</code>
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      const link = SITE.trackUrl(ticket);
                                      try { await navigator.clipboard.writeText(link); toast.success("Tracking link copied 📋", { description: link }); } catch { toast.error("Copy failed"); }
                                    }}
                                    aria-label={`Copy tracking link for ${ticket}`}
                                    className="shrink-0 p-1 rounded text-muted-foreground hover:text-amber-200 hover:bg-amber-500/15 opacity-60 group-hover:opacity-100 transition"
                                  >
                                    <Copy className="size-3" />
                                  </button>
                                </li>
                              );
                            })}
                          </ul>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                  <UpiVpaEditor
                    userId={user.id}
                    initial={profile?.upi_vpa ?? null}
                    onSaved={() => void refreshProfile()}
                  />
                </>
              ) : (
                <>
                  <h3 className="mt-2 font-semibold text-base leading-tight text-foreground/90">
                    Status: Off-the-Clock <span className="text-muted-foreground">Preview Mode</span> 🕵️‍♂️
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                    Browsing anonymously. Sign in to post, cheers, and claim your stash.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setAuthReason("Sign in to unlock posting, cheering, and your private dashboards.");
                      setAuthModalOpen(true);
                    }}
                    className="mt-3 w-full inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-bold text-zinc-950 bg-amber-400 hover:bg-amber-300 border border-amber-300/60 shadow-[0_0_20px_rgba(251,191,36,0.45)] hover:shadow-[0_0_28px_rgba(251,191,36,0.65)] transition"
                  >
                    Sign In to Post 🚀
                  </button>
                </>
              )}
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
            <AchievementBadges />
          </Card>

          {profile?.role === "merchant" && (
            <MerchantFlashControl profile={profile} />
          )}



          <Card className="p-4 border-border">
            <h4 className="text-sm font-semibold mb-2">Recent</h4>
            <ul className="text-xs space-y-1.5 text-muted-foreground">
              <li className="hover:text-foreground cursor-pointer"># RemoteWorkBeers</li>
              <li className="hover:text-foreground cursor-pointer"># SlackToPub</li>
              <li className="hover:text-foreground cursor-pointer"># PromotedToBartender</li>
              <li className="hover:text-foreground cursor-pointer"># OOO_AtTheBar</li>
            </ul>
          </Card>

          {user ? (
            <button
              type="button"
              onClick={async () => {
                await signOut();
                toast("Logged out. The bar is closing… for now. 🚪", {
                  description: "Your session token has been cleared.",
                });
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-[12px] font-medium text-muted-foreground hover:text-foreground border border-border/60 hover:border-border bg-card/40 hover:bg-muted/40 transition"
            >
              <LogOut className="size-3.5" />
              Logout 🚪
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setAuthReason("Sign in to unlock posting, Cheers, and your personal Desk.");
                setAuthModalOpen(true);
              }}
              className="w-full inline-flex items-center justify-center gap-2 rounded-md px-3 py-2 text-[12px] font-medium text-amber-200/90 hover:text-amber-100 border border-amber-500/30 hover:border-amber-400/50 bg-amber-500/5 hover:bg-amber-500/10 transition"
            >
              <KeyRound className="size-3.5" />
              Sign in 🔑
            </button>
          )}
        </aside>

        {/* Feed */}
        <section className="col-span-12 lg:col-span-6 space-y-3">
          {view === "home" && (
            <>
              {/* Live Workspace Radar — proximity-aware ambient ticker */}
              <LiveWorkspaceRadar
                origin={geoCoords}
                geoStatus={geoStatus}
                posts={posts.map((p) => ({
                  id: p.id,
                  latitude: (p as any).latitude ?? null,
                  longitude: (p as any).longitude ?? null,
                  created_at: p.created_at,
                  author_name: p.author_name,
                }))}
                merchants={(MERCHANTS[selectedCity] ?? []).map((m) => ({
                  id: m.id,
                  name: m.name,
                  area: m.area,
                }))}
                proximity={proximity}
                onProximityChange={setProximity}
              />

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
                  <div className="flex items-center gap-2 flex-wrap pl-14">
                    <label className={`flex items-center gap-2 cursor-pointer rounded-md px-2.5 py-1.5 border transition ${anonymous ? "border-primary/50 bg-primary/10" : "border-border hover:bg-muted/40"}`}>
                      <Switch checked={anonymous} onCheckedChange={setAnonymous} aria-label="Post anonymously" />
                      <span className="text-[11px] font-semibold">
                        Post Anonymously <span className="text-muted-foreground font-normal">(Confession Mode 🎭)</span>
                      </span>
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        const next = broetrify(body);
                        setBody(next);
                        bumpAchievement("broetry", 1);
                        toast.success("Broetry engaged 🚀", { description: "Your hot take is now LinkedIn-grade." });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 border border-primary/40 bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/20 hover:border-primary/60 transition"
                    >
                      <Rocket className="size-3.5" />
                      Make it Broetry 🚀
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const ideas = [
                          "My pull request got rejected so I am opening a stout at 11 AM.",
                          "The CEO just announced a pivot to an AI-first strategy that makes no sense.",
                          "I am currently hiding in the bathroom booth at our corporate office.",
                          "Our scrum master just called a mandatory 4:45 PM standup on a Friday.",
                          "I spent the last 3 hours formatting a single PowerPoint slide for a VP.",
                        ];
                        const pick = ideas[Math.floor(Math.random() * ideas.length)];
                        setBody(pick);
                        toast("Fresh idea poured 💡", { description: "Edit it, or run it through the Broetry engine." });
                      }}
                      className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 border border-accent/40 bg-accent/10 text-accent-foreground text-[11px] font-semibold hover:bg-accent/20 hover:border-accent/60 transition"
                    >
                      <Lightbulb className="size-3.5 text-accent" />
                      Need an Idea? 💡
                    </button>
                  </div>

                  {/* Current Vibe matrix */}
                  <div className="pl-14">
                    <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold mb-1.5">
                      Current Vibe
                    </div>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5">
                      {VIBES.map((v) => {
                        const active = vibeId === v.id;
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() => setVibeId(active ? null : v.id)}
                            title={v.caption}
                            className={`flex flex-col items-center justify-center gap-0.5 py-2 px-1 rounded-md border text-[10px] font-semibold transition ${
                              active
                                ? `bg-gradient-to-br ${v.gradient} ${v.text} border-transparent shadow-[0_0_14px_rgba(251,191,36,0.25)]`
                                : "border-border text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                            }`}
                          >
                            <span className="text-lg leading-none">{v.emoji}</span>
                            <span className="leading-tight text-center">{v.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* GIF preview */}
                  {gifUrl && (
                    <div className="pl-14">
                      <div className="relative rounded-xl overflow-hidden border border-border bg-black/40 max-w-md mx-auto">
                        <img
                          src={gifUrl}
                          alt="Selected reaction GIF for your post"
                          className="w-full h-auto object-contain max-h-72"
                        />
                        <button
                          type="button"
                          onClick={() => setGifUrl(null)}
                          className="absolute top-2 right-2 size-7 rounded-full bg-black/70 text-white grid place-items-center text-sm hover:bg-black"
                          aria-label="Remove GIF"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Uploaded bar pic preview */}
                  {attachedUrl && (
                    <div className="pl-14">
                      <div className="relative inline-block rounded-xl overflow-hidden border border-amber-500/30 bg-black/40">
                        <img
                          src={attachedUrl}
                          alt="Attached photo from your local bar"
                          loading="lazy"
                          className="max-h-48 w-auto object-cover"
                        />
                        <button
                          type="button"
                          onClick={clearAttachedPic}
                          className="absolute top-1.5 right-1.5 size-6 rounded-full bg-black/70 text-white grid place-items-center text-xs hover:bg-black"
                          aria-label="Remove attached image"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}

                  <input
                    ref={picInputRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      e.target.value = "";
                      if (f) void handlePicSelected(f);
                    }}
                  />

                  <div className="flex items-center gap-2 flex-wrap pl-14">
                    <button
                      type="button"
                      onClick={() => setGifPickerOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 border border-primary/40 bg-primary/10 text-primary text-[12px] font-bold hover:bg-primary/20 hover:border-primary/60 transition"
                    >
                      🎬 Add GIF
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerPicUpload("bar")}
                      disabled={uploadingPic !== null || !!attachedUrl}
                      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 border border-amber-500/40 bg-amber-500/10 text-amber-200 text-[12px] font-bold hover:bg-amber-500/20 hover:border-amber-500/60 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingPic === "bar" ? "Uploading…" : "📷 Bar pic"}
                    </button>
                    <button
                      type="button"
                      onClick={() => triggerPicUpload("tasting")}
                      disabled={uploadingPic !== null || !!attachedUrl}
                      className="inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 border border-amber-500/40 bg-amber-500/10 text-amber-200 text-[12px] font-bold hover:bg-amber-500/20 hover:border-amber-500/60 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {uploadingPic === "tasting" ? "Uploading…" : "📷 Tasting"}
                    </button>
                    {vibeId && (
                      <span className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold border border-border bg-muted/40">
                        {getVibe(vibeId)!.emoji} {getVibe(vibeId)!.label}
                        <button
                          type="button"
                          onClick={() => setVibeId(null)}
                          className="ml-1 text-muted-foreground hover:text-foreground"
                          aria-label="Clear vibe"
                        >
                          ✕
                        </button>
                      </span>
                    )}
                    <div className="ml-auto">
                      <Button
                        type="submit"
                        disabled={(!body.trim() && !gifUrl && !vibeId && !attachedUrl) || submitting || uploadingPic !== null}
                        className="group rounded-full px-5 font-semibold text-white border-0 bg-[linear-gradient(135deg,#f59e0b_0%,#f97316_50%,#d97706_100%)] shadow-[0_6px_20px_-4px_rgba(249,115,22,0.55)] transition-all duration-200 hover:scale-[1.03] hover:shadow-[0_0_24px_4px_rgba(249,115,22,0.65),0_0_48px_8px_rgba(234,88,12,0.35)] hover:animate-pulse active:scale-100 disabled:opacity-60 disabled:hover:scale-100 disabled:hover:shadow-[0_6px_20px_-4px_rgba(249,115,22,0.55)] disabled:hover:animate-none"
                      >
                        {submitting ? (
                          <>
                            <Loader2 className="size-4 animate-spin" />
                            Deploying… 🍺
                          </>
                        ) : (
                          <>
                            <Send className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            Eject to Pub 🚀
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </form>
              </Card>

              <TaproomVisualizer />



              <GifPicker
                open={gifPickerOpen}
                onOpenChange={setGifPickerOpen}
                onSelect={(url) => setGifUrl(url)}
              />

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
                  {user && (
                    <button
                      type="button"
                      onClick={() => setSortMode("mine")}
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition inline-flex items-center gap-1 ${
                        sortMode === "mine"
                          ? "bg-amber-400 text-zinc-950 shadow-[0_0_14px_rgba(251,191,36,0.5)]"
                          : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <Briefcase className="size-3" /> My Desk 💼
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSortMode("tribunal")}
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold transition inline-flex items-center gap-1 ${
                      sortMode === "tribunal"
                        ? "bg-red-500 text-white shadow-[0_0_14px_rgba(239,68,68,0.55)]"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    ⚖️ HR Tribunal
                    {posts.filter((p) => p.is_in_tribunal && !p.is_hidden).length > 0 && (
                      <span className="ml-1 rounded-full bg-red-500/20 px-1.5 text-[10px] font-bold text-red-200">
                        {posts.filter((p) => p.is_in_tribunal && !p.is_hidden).length}
                      </span>
                    )}
                  </button>
                </div>
                <div className="h-px flex-1 bg-border" />
                <span className="text-muted-foreground">
                  {sortMode === "top"
                    ? "Most Cheered 🍻"
                    : sortMode === "mine"
                      ? "Your timeline 💼"
                      : sortMode === "tribunal"
                        ? "Community-flagged ⚖️"
                        : "Freshly poured"}
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

              {!feedLoading && !feedError && orderedPosts.length === 0 && sortMode === "mine" && (
                <Card className="p-8 text-center border-amber-400/40 bg-gradient-to-br from-amber-950/30 via-card to-card shadow-[0_0_30px_rgba(251,191,36,0.1)]">
                  <div className="mx-auto size-14 rounded-2xl bg-amber-500/15 border border-amber-400/40 grid place-items-center text-2xl mb-3">
                    📝
                  </div>
                  <h3 className="font-display text-lg font-bold text-foreground">Your desk is currently clear!</h3>
                  <p className="text-sm text-muted-foreground mt-2 max-w-sm mx-auto leading-relaxed">
                    Write your first office coping story above to see its live global telemetry and upvotes tracking here.
                  </p>
                </Card>
              )}

              {!feedLoading && !feedError && orderedPosts.length === 0 && sortMode !== "mine" && (
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
                    onCheers={cheers}
                    onOpenComments={(p) => setActiveCommentPostId(p.id)}
                    onShare={sharePost}
                    onReport={reportPost}
                    onTribunalVote={voteTribunal}
                    cheered={cheeredRef.current.has(p.id)}
                    highlighted={p.id === highlightedId}
                    tribunalMode={sortMode === "tribunal"}
                    isEmployeeOfDay={
                      sortMode === "recent" && employeeOfDay?.id === p.id
                    }
                  />
                ))}
              </div>
            </>
          )}

          {view === "pubs" && (
            <PubsView
              requireAuth={requireAuth}
              profile={profile}
              userId={user?.id ?? null}
              onProfileUpdated={() => void refreshProfile()}
            />
          )}
          {view === "barhop" && <BarHopView />}
          {view === "messages" && <ComingSoonView title="Messages" emoji="📬" copy="Your DMs are too embarrassing. We're protecting you from yourself." />}
          {view === "notifications" && <NotificationsView />}
        </section>


        {/* Right sidebar */}
        <aside className="hidden lg:block col-span-3 space-y-4">
          <DesperationGauge />
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

          <CorporateBingo />

          <VerifiedWateringHole
            onRequireAuth={() => requireAuth("Sign in before sponsoring a slot — keeps merchant leads verified.")}
            profile={profile}
            userId={user?.id ?? null}
            onProfileUpdated={() => void refreshProfile()}
          />




          <p className="text-[10px] text-muted-foreground/60 px-2 leading-relaxed">
            DrinkedIn © 2026 · A parody. Please drink responsibly.
            <br />
            About · Accessibility · Privacy & Pints · Ad Choices
          </p>
        </aside>
      </main>

      {devOpen && (
        <Suspense fallback={null}>
          <DevConsole onClose={() => setDevOpen(false)} />
        </Suspense>
      )}

      <ClaimTicketModal
        open={claimModalOpen}
        ticket={claimTicket}
        onOpenChange={setClaimModalOpen}
      />

      <AuthModal
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        reason={authReason}
      />

      <ProximityAdDispatcher origin={geoCoords} userId={user?.id ?? null} />

      <NotificationsDrawer
        open={notifOpen}
        onOpenChange={setNotifOpen}
        signedIn={!!user}
        myPosts={myPosts}
        origin={geoCoords}
        city={selectedCity}
      />

      <CommentsDrawer
        open={!!activeCommentPostId}
        onOpenChange={(v) => { if (!v) setActiveCommentPostId(null); }}
        postId={activeCommentPostId}
        postTitle={(() => {
          const p = posts.find((x) => x.id === activeCommentPostId);
          return p ? snippetOf(p.body_text) : null;
        })()}
        comments={activeCommentPostId ? (commentsByPost[activeCommentPostId] || []) : []}
        signedIn={!!user}
        onRequireAuth={() => {
          setAuthReason("Sign in to drop a reply 💬 — keeps our breakroom spam-free.");
          setAuthModalOpen(true);
        }}
        onSubmit={(pid, text) => addComment(pid, text)}
      />
    </div>
  );
}

function NavItem({
  icon,
  label,
  active,
  badge,
  pulseKey,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  badge?: number;
  pulseKey?: number;
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
          <span
            key={pulseKey ?? 0}
            className="absolute -top-1.5 -right-2 bg-amber-500 text-amber-950 text-[9px] font-bold rounded-full min-w-4 h-4 px-1 grid place-items-center shadow-[0_0_10px_rgba(251,191,36,0.8)] animate-notif-glow"
          >
            {badge > 99 ? "99+" : badge}
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

const PostCard = memo(function PostCard({
  post,
  comments,
  onCheers,
  onOpenComments,
  onShare,
  onReport,
  onTribunalVote,
  cheered,
  highlighted,
  tribunalMode,
  isEmployeeOfDay,
}: {
  post: Post;
  comments: Comment[];
  onCheers: (post: Post) => void;
  onOpenComments: (post: Post) => void;
  onShare: (postId: string) => void;
  onReport: (post: Post) => void;
  onTribunalVote: (post: Post, vote: "valid" | "misconduct") => void;
  cheered: boolean;
  highlighted?: boolean;
  tribunalMode?: boolean;
  isEmployeeOfDay?: boolean;
}) {
  const [popKey, setPopKey] = useState(0);
  const [bumpKey, setBumpKey] = useState(0);

  function handleCheers() {
    if (!cheered) {
      setPopKey((k) => k + 1);
      setBumpKey((k) => k + 1);
    }
    onCheers(post);
  }

  const isSim = isSimulatedPost(post);
  const isMerchant = post.post_type === "merchant";

  return (
    <Card
      className={`overflow-hidden animate-fade-in ${
        highlighted ? "post-spotlight" : ""
      } ${
        isMerchant
          ? "border-amber-400/60 bg-gradient-to-br from-amber-950/40 via-amber-900/15 to-card shadow-[0_0_24px_rgba(251,191,36,0.18)]"
          : "border-border"
      }`}
    >
      {isEmployeeOfDay && !isMerchant && (
        <div className="px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-wider text-amber-200 bg-gradient-to-r from-amber-500/30 via-fuchsia-500/20 to-amber-500/30 border-b border-amber-400/40 shadow-[0_0_18px_rgba(251,191,36,0.45)] animate-pulse flex items-center justify-center gap-1.5">
          🏆 Employee of the Day · Most Cheered post in the last 24h
        </div>
      )}
      {highlighted && (
        <div className="px-4 pt-2 pb-1 text-[10px] uppercase tracking-wider text-primary font-bold flex items-center gap-1.5">
          <Sparkles className="size-3" /> Shared with you · spotlight
        </div>
      )}
      {isMerchant && (
        <div className="px-4 pt-3 pb-1 flex items-center justify-between">
          <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 shadow-[0_0_10px_rgba(251,191,36,0.35)]">
            <ShieldCheck className="size-3" /> Verified Pub Partner 🛡️
          </span>
          <span className="text-[10px] uppercase tracking-wider text-amber-300/80 font-bold">
            Sponsored · Local
          </span>
        </div>
      )}
      <div className="p-4 pb-2 flex items-start gap-3">
        <div
          className={`size-12 rounded-full grid place-items-center font-bold text-base shrink-0 ${
            isMerchant
              ? "bg-gradient-to-br from-amber-500/50 to-amber-300/30 text-amber-100 text-xl"
              : "bg-gradient-to-br from-primary/40 to-accent/40"
          }`}
        >
          {isMerchant ? "🍺" : initials(post.author_name)}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-semibold text-[15px] leading-tight truncate flex items-center gap-1.5">
            <span className={`truncate ${isMerchant ? "text-amber-100" : ""}`}>
              {isMerchant ? post.author_name : (post.author_name || "Anonymous Colleague 🎭")}
            </span>
            {!isMerchant && (
              <span className="text-xs font-normal text-muted-foreground shrink-0">· 1st</span>
            )}
            {isSim && !isMerchant && (
              <span
                className="group/sim relative inline-flex items-center gap-1 rounded-md border border-amber-400/50 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-300 shrink-0"
                tabIndex={0}
                aria-label="Simulated parody profile"
              >
                Simulation 🤖
                <span
                  role="tooltip"
                  className="pointer-events-none absolute left-1/2 top-full z-50 mt-1.5 w-56 -translate-x-1/2 rounded-md border border-border bg-popover/95 backdrop-blur p-2 text-[11px] font-normal normal-case tracking-normal text-foreground/90 shadow-xl opacity-0 -translate-y-1 transition group-hover/sim:opacity-100 group-hover/sim:translate-y-0 group-focus/sim:opacity-100 group-focus/sim:translate-y-0"
                >
                  This is an automated parody profile simulating the global corporate grid.
                </span>
              </span>
            )}
          </div>
          <div className={`text-xs line-clamp-1 ${isMerchant ? "text-amber-200/80" : "text-muted-foreground"}`}>
            {post.author_headline}
          </div>
          <div className="text-[11px] text-muted-foreground/80 mt-0.5 flex items-center gap-1">
            {timeAgo(post.created_at)} · <span>{isMerchant ? "📣" : "🌍"}</span>
          </div>
        </div>
        <button className="text-muted-foreground hover:text-foreground p-1">
          <MoreHorizontal className="size-5" />
        </button>
      </div>

      {(() => {
        const { meta, body } = decodePostMeta(post.body_text);
        const vibe = getVibe(meta.vibe);
        return (
          <>
            {vibe && (
              <div
                className={`mx-4 mt-1 mb-3 rounded-xl px-4 py-4 bg-gradient-to-br ${vibe.gradient} ${vibe.text} shadow-[0_6px_20px_-8px_rgba(0,0,0,0.6)] border border-white/5`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-3xl leading-none drop-shadow">{vibe.emoji}</span>
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.18em] font-bold opacity-80">
                      Current Vibe
                    </div>
                    <div className="text-lg font-extrabold leading-tight">{vibe.label}</div>
                    <div className="text-xs opacity-90">{vibe.caption}</div>
                  </div>
                </div>
              </div>
            )}
            {body && (
              <div className="px-4 pb-3 text-[15px] leading-relaxed whitespace-pre-wrap">
                {body}
              </div>
            )}
            {meta.gif && (
              <div className="px-4 pb-3">
                <div className="rounded-xl overflow-hidden border border-border bg-black/40">
                  <img
                    src={meta.gif}
                    alt="Reaction GIF attached to this DrinkedIn post"
                    loading="lazy"
                    className="w-full h-auto object-cover max-h-[420px]"
                  />
                </div>
              </div>
            )}
            {post.attached_visual_url && !post.is_hidden && (
              <div className="px-4 pb-3">
                <div className="rounded-2xl overflow-hidden border border-amber-500/20 bg-black/40 shadow-[0_8px_30px_-12px_rgba(251,191,36,0.25)]">
                  <img
                    src={post.attached_visual_url}
                    alt="Photo from a local bar attached to this DrinkedIn post"
                    loading="lazy"
                    decoding="async"
                    className="w-full h-auto object-cover max-h-[520px]"
                  />
                </div>
              </div>
            )}
          </>
        );
      })()}

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
            onClick={() => onOpenComments(post)}
            className="hover:text-foreground hover:underline"
          >
            {comments.length} comments
          </button>
          <span>·</span>
          <span>{Math.floor(post.cheers_count / 12)} reposts</span>
        </div>
      </div>

      {isMerchant && (post.merchant_website || post.map_query_address) && (
        <div className="px-4 pb-3 grid grid-cols-2 gap-2">
          {post.merchant_website && (
            <a
              href={post.merchant_website}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 h-9 rounded-md border border-amber-400/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-100 text-[12px] font-semibold transition"
            >
              <ExternalLink className="size-3.5" /> Visit Website 🌐
            </a>
          )}
          {post.map_query_address && (
            <a
              href={mapsDirectionsUrl(post.map_query_address)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center justify-center gap-1.5 h-9 rounded-md bg-amber-500 hover:bg-amber-400 text-amber-950 text-[12px] font-bold transition"
            >
              <Navigation className="size-3.5" /> Get Directions 📍
            </a>
          )}
        </div>
      )}

      <div className="border-t border-border grid grid-cols-4 px-2 py-1">
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
          onClick={() => onOpenComments(post)}
        />
        <ActionBtn onClick={() => onShare(post.id)} label="Share" icon={<Share2 className="size-5" />} />
        <ActionBtn
          onClick={() => {
            void triggerDownloadPostCard(post);
            toast.success("Post card downloading 🍻");
          }}
          label="Download"
          icon={<Download className="size-5" />}
        />
      </div>

      {!isMerchant && (
        <div className="border-t border-border px-4 py-2 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
          <BeerTipPopover
            authorUserId={(post as any).user_id ?? null}
            authorName={post.author_name}
          />
          <button
            type="button"
            onClick={() => onReport(post)}
            disabled={post.is_in_tribunal}
            className="inline-flex items-center gap-1 font-semibold hover:text-red-300 disabled:text-red-300/60 disabled:cursor-default transition"
            title={post.is_in_tribunal ? "Already in the tribunal" : "Send to HR Tribunal"}
          >
            <AlertTriangle className="size-3.5" />
            {post.is_in_tribunal ? "In Tribunal ⚖️" : "Report 🚨"}
          </button>
        </div>
      )}

      {tribunalMode && !isMerchant && (
        <div className="border-t border-red-400/30 bg-red-500/5 px-4 py-3">
          <div className="flex items-center justify-between text-[10px] uppercase tracking-wider font-bold mb-2">
            <span className="text-red-300">⚖️ HR Tribunal Vote</span>
            <span className="text-muted-foreground">
              🍺 {post.valid_votes ?? 0} · 🛑 {post.misconduct_votes ?? 0}/3
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => onTribunalVote(post, "valid")}
              className="h-9 rounded-md border border-emerald-400/40 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-200 text-[12px] font-bold transition"
            >
              Valid Coping 🍺
            </button>
            <button
              type="button"
              onClick={() => onTribunalVote(post, "misconduct")}
              className="h-9 rounded-md border border-red-400/40 bg-red-500/10 hover:bg-red-500/20 text-red-200 text-[12px] font-bold transition"
            >
              Gross Misconduct 🛑
            </button>
          </div>
        </div>
      )}

    </Card>
  );
});

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
// Pubs view — trending neighborhood watering holes (city-filtered)
// ============================================================


function PubsView({
  requireAuth,
  profile,
  userId,
  onProfileUpdated,
}: {
  requireAuth: (reason?: string) => boolean;
  profile: import("@/lib/useProfile").Profile | null;
  userId: string | null;
  onProfileUpdated: () => void;
}) {
  const [selectedCity, setSelectedCityLocal] = useState<CityKey>("Bangalore");
  useEffect(() => {
    setSelectedCityLocal(getSelectedCity());
    return subscribeCity(setSelectedCityLocal);
  }, []);

  const merchants = MERCHANTS[selectedCity] ?? [];

  // Per-merchant "tech workers here tonight" counter (localStorage-backed,
  // shared with the Heading-There-Tonight check-in on the sidebar ad).
  const [heading, setHeading] = useState<Record<string, { date: string; extra: number; mine: boolean }>>({});
  useEffect(() => {
    try {
      setHeading(JSON.parse(localStorage.getItem("drinkedin.headingThere.v1") || "{}"));
    } catch {}
  }, [selectedCity]);

  const today = new Date().toISOString().slice(0, 10);

  function checkIn(m: Merchant) {
    const state = heading[m.id];
    const alreadyChecked = state && state.date === today && state.mine === true;
    if (alreadyChecked) {
      toast("You're already on the list for tonight 🍻", {
        description: "Come back tomorrow to check in again.",
      });
      return;
    }
    const next = {
      ...heading,
      [m.id]: {
        date: today,
        extra: (state?.date === today ? state.extra : 0) + 1,
        mine: true,
      },
    };
    setHeading(next);
    try { localStorage.setItem("drinkedin.headingThere.v1", JSON.stringify(next)); } catch {}
    toast.success(`You're heading to ${m.name} 🏃‍♂️🍻`);
  }

  return (
    <div className="space-y-3 animate-in fade-in duration-300">
      <VerifiedWateringHole
        onRequireAuth={() => requireAuth("Sign in before sponsoring a slot — keeps merchant leads verified.")}
        profile={profile}
        userId={userId}
        onProfileUpdated={onProfileUpdated}
      />

      <Card className="p-5 border-amber-400/30 bg-gradient-to-br from-amber-950/30 via-card to-card">
        <div className="flex items-center gap-3">
          <div className="size-11 rounded-xl bg-amber-500/20 grid place-items-center text-amber-300">
            <Beer className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold leading-tight">
              Trending Neighborhood Watering Holes
            </h2>
            <p className="text-xs text-muted-foreground">
              Live in <span className="text-amber-300 font-semibold">{selectedCity}</span> — change your tech hub from the top ticker.
            </p>
          </div>
          <select
            aria-label="Filter by city"
            value={selectedCity}
            onChange={(e) => {
              import("@/lib/cityStore").then((m) => m.setSelectedCity(e.target.value as CityKey));
            }}
            className="hidden sm:block h-8 text-xs bg-muted/40 border border-border rounded-md px-2 cursor-pointer hover:border-amber-400/50"
          >
            {CITIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {merchants.map((m) => {
          const state = heading[m.id];
          const extra = state && state.date === today ? state.extra : 0;
          const count = m.base_heading + extra;
          const checked = !!state && state.date === today && state.mine === true;
          return (
            <Card
              key={m.id}
              className="p-4 border-amber-400/40 bg-gradient-to-br from-amber-950/25 via-card to-card hover:border-amber-300/60 transition flex flex-col shadow-[0_0_18px_rgba(251,191,36,0.12)]"
            >
              <div className="flex items-start gap-3 mb-2">
                <div className="size-10 rounded-md bg-gradient-to-br from-amber-500/40 to-amber-300/20 grid place-items-center text-lg shrink-0">
                  🍺
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-400/60 bg-amber-500/15 px-1.5 py-0 text-[9px] font-bold uppercase tracking-wider text-amber-300">
                      <ShieldCheck className="size-2.5" /> Verified
                    </span>
                  </div>
                  <h3 className="font-bold text-[15px] leading-tight text-amber-100 truncate">
                    {m.name}
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-0.5 flex items-center gap-1">
                    <MapPin className="size-3" /> {m.area}
                  </p>
                </div>
              </div>

              <div className="rounded-md border border-amber-400/30 bg-amber-500/5 p-2.5 mb-3">
                <div className="text-[10px] uppercase tracking-wider font-bold text-amber-300 mb-1">
                  🔥 Flash Happy Hour
                </div>
                <p className="text-[12px] leading-snug text-foreground/90">
                  {m.deal}
                </p>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-amber-200/90 mb-3">
                <UsersIcon className="size-3" />
                <span>
                  <span className="font-bold text-amber-100">{count}</span> tech workers here tonight
                </span>
              </div>

              <div className="mt-auto grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => checkIn(m)}
                  disabled={checked}
                  className={`h-9 text-[12px] font-bold ${
                    checked
                      ? "bg-emerald-500/20 hover:bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 cursor-default"
                      : "bg-amber-500 hover:bg-amber-400 text-amber-950"
                  }`}
                >
                  {checked ? "On the list ✓" : "I'm heading 🏃‍♂️"}
                </Button>
                <a
                  href={mapsDirectionsUrl(m.map_query_address)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 h-9 rounded-md border border-amber-400/50 bg-amber-500/10 hover:bg-amber-500/20 text-amber-100 text-[12px] font-semibold transition"
                >
                  <Navigation className="size-3.5" /> Get Directions 📍
                </a>
              </div>

              {m.website && (
                <a
                  href={m.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-flex items-center justify-center gap-1.5 h-8 rounded-md text-[11px] font-semibold text-amber-300 hover:text-amber-100 hover:underline"
                >
                  <ExternalLink className="size-3" /> Visit Website 🌐
                </a>
              )}
            </Card>
          );
        })}
      </div>

      <Suspense
        fallback={
          <Card className="p-5 border-border h-64 animate-pulse bg-gradient-to-br from-card via-card to-primary/5" />
        }
      >
        <BarLocator />
      </Suspense>
    </div>
  );
}

// (BarLocator moved to src/components/BarLocator.tsx — lazy-loaded)



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

function NotificationsDrawer({
  open,
  onOpenChange,
  signedIn,
  myPosts,
  origin,
  city,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  signedIn: boolean;
  myPosts: Post[];
  origin: { latitude: number; longitude: number } | null;
  city: CityKey;
}) {
  const { deals } = useMerchantDeals(city);

  // Active merchant flash deals within a 3 km radius of the user's fix.
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

  // Contextual alerts derived from current state.
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
          {/* General platform notifications */}
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

          {/* Geographic notifications */}
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

function snippetOf(s: string): string {
  const clean = s.replace(/«di-meta»[\s\S]*?«\/di-meta»/g, "").trim();
  return clean.length > 60 ? clean.slice(0, 57) + "…" : clean || "(visual post)";
}

function UpiVpaEditor({
  userId,
  initial,
  onSaved,
}: {
  userId: string;
  initial: string | null;
  onSaved: () => void;
}) {
  const [vpa, setVpa] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setVpa(initial ?? "");
  }, [initial]);

  async function save() {
    const clean = vpa.trim();
    if (clean && !/^[a-z0-9._-]{2,}@[a-z]{2,}$/i.test(clean)) {
      toast.error("That doesn't look like a UPI VPA (e.g. yourname@upi).");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({ upi_vpa: clean || null })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save your tip handle. Try again in a sec.");
      return;
    }
    toast.success("Beer fund handle saved 🍺");
    onSaved();
  }

  return (
    <div className="mt-3 rounded-md border border-amber-400/30 bg-amber-500/5 p-2.5">
      <label className="text-[10px] uppercase tracking-wider font-bold text-amber-200/90">
        Beer-Fund UPI VPA
      </label>
      <p className="text-[10px] text-muted-foreground mb-1.5">
        Optional. Lets colleagues tip you ₹50 via the "Buy them a Beer 🍺" QR.
      </p>
      <div className="flex gap-1.5">
        <Input
          value={vpa}
          onChange={(e) => setVpa(e.target.value)}
          placeholder="yourname@upi"
          maxLength={120}
          className="h-8 text-[12px]"
        />
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={saving || vpa === (initial ?? "")}
          className="h-8 px-3 bg-amber-500 hover:bg-amber-400 text-amber-950 text-[11px] font-bold"
        >
          {saving ? "…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

