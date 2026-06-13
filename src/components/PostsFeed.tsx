import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Hash, AtSign, Loader2, ImageOff, CornerDownRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/lib/useAuth";
import { usePanicState } from "@/lib/usePanicState";

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const FEED_COUNTS_KEY = "drinkedin_local_feed";

function readCounts(): Record<string, { v: number; p: number }> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(FEED_COUNTS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}
function writeCounts(postId: string, v: number, p: number) {
  if (typeof window === "undefined") return;
  try {
    const all = readCounts();
    all[postId] = { v, p };
    window.localStorage.setItem(FEED_COUNTS_KEY, JSON.stringify(all));
  } catch {}
}

function PostActions({
  postId,
  authorName,
  bodyText,
  isUserOwned = false,
}: {
  postId: string;
  authorName: string;
  bodyText: string;
  isUserOwned?: boolean;
}) {
  const seed = useMemo(
    () => (isUserOwned ? { v: 0, p: 0 } : { v: randInt(14, 85), p: randInt(3, 22) }),
    [postId, isUserOwned]
  );

  const [validated, setValidated] = useState(seed.v);
  const [pints, setPints] = useState(seed.p);
  const [vPulse, setVPulse] = useState(false);
  const [pPulse, setPPulse] = useState(false);
  const [foam, setFoam] = useState<number[]>([]);
  const [copied, setCopied] = useState(false);

  // Hydrate persisted counts after mount (avoids SSR mismatch).
  useEffect(() => {
    const stored = readCounts()[postId];
    if (stored) {
      setValidated(stored.v);
      setPints(stored.p);
    }
  }, [postId]);

  function onValidate() {
    setValidated((n) => {
      const next = n + 1;
      writeCounts(postId, next, pints);
      return next;
    });
    setVPulse(true);
    window.setTimeout(() => setVPulse(false), 220);
  }

  function onPint() {
    setPints((n) => {
      const next = n + 1;
      writeCounts(postId, validated, next);
      return next;
    });
    setPPulse(true);
    window.setTimeout(() => setPPulse(false), 220);
    const id = Date.now() + Math.random();
    setFoam((f) => [...f, id]);
    window.setTimeout(() => setFoam((f) => f.filter((x) => x !== id)), 1200);
    toast("🍺 You just slid a cold one to an anonymous colleague!", {
      duration: 1800,
    });
    try { window.dispatchEvent(new CustomEvent("drinkedin:pint-tapped")); } catch {}
  }


  function detectMood(text: string): string {
    const t = text.toLowerCase();
    if (/(fire|🔥|burn|prod|on-call|panic)/.test(t)) return "🔥";
    if (/(meeting|standup|jira|sprint|manager)/.test(t)) return "🥱";
    if (/(beer|toit|pint|🍻|happy hour|taproom)/.test(t)) return "🍻";
    if (/(side-hustle|quit|exit|resign|escape)/.test(t)) return "🚀";
    if (/(ghost|slack|read|📴|leave)/.test(t)) return "👻";
    return "🤯";
  }

  function onShare() {
    const mood = detectMood(bodyText);
    const truncated =
      bodyText.length > 80 ? bodyText.slice(0, 80) : bodyText;
    const payload =
      `🚨 DRINKEDIN LEAK: An anonymous ${authorName} just dropped a confession from the tech park breakroom...\n\n` +
      `Mood: ${mood}\n` +
      `Status: "${truncated}..."\n\n` +
      `Read the full unfiltered timeline and check your company's real-time checkout velocity here: https://drinkedin.me`;

    const done = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      toast(
        "🔗 Leak packaged! Go drop it into your private company WhatsApp group chat or Slack thread to rally your team.",
        { duration: 2600 }
      );
      try { window.dispatchEvent(new CustomEvent("drinkedin:radar-pulse")); } catch {}
    };

    try {
      navigator.clipboard.writeText(payload).then(done).catch(() => {
        // Fallback
        const ta = document.createElement("textarea");
        ta.value = payload;
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand("copy"); } catch {}
        document.body.removeChild(ta);
        done();
      });
    } catch {
      done();
    }
  }

  return (
    <div
      className={`mt-3 flex items-center gap-2 flex-wrap pt-2 border-t transition-colors duration-300 ${
        copied ? "border-emerald-400/60" : "border-white/5"
      }`}
    >
      <button
        type="button"
        onClick={onValidate}
        className={`px-3 py-1 rounded-full text-[11px] font-bold border border-white/15 bg-white/[0.03] text-white/80 hover:bg-white/[0.08] hover:border-white/25 transition-all duration-200 transform ${
          vPulse ? "scale-110" : "scale-100"
        }`}
      >
        🎯 Validated ({validated})
      </button>
      <button
        type="button"
        onClick={onPint}
        className={`relative px-3 py-1 rounded-full text-[11px] font-bold border border-amber-400/40 bg-amber-500/[0.06] text-amber-200 hover:bg-amber-500/[0.14] hover:border-amber-300/60 transition-all duration-200 transform ${
          pPulse ? "scale-110" : "scale-100"
        }`}
      >
        🍻 Buy a Pint ({pints})
        {foam.map((id) => (
          <span
            key={id}
            className="pointer-events-none absolute -top-2 left-1/2 -translate-x-1/2 text-sm animate-[foam-float_1.2s_ease-out_forwards]"
          >
            🫧
          </span>
        ))}
      </button>
      <button
        type="button"
        onClick={onShare}
        className={`px-3 py-1 rounded-full text-[11px] font-bold border transition-all duration-200 ${
          copied
            ? "border-emerald-400/70 bg-emerald-500/15 text-emerald-200"
            : "border-white/15 bg-white/[0.03] text-white/70 hover:bg-white/[0.08] hover:border-white/25"
        }`}
      >
        {copied ? "✅ Copied to Clipboard!" : "🔗 Share Leak"}
      </button>
      <style>{`
        @keyframes foam-float {
          0% { opacity: 0; transform: translate(-50%, 0) scale(0.6); }
          30% { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -28px) scale(1.2); }
        }
      `}</style>
    </div>
  );
}

const SATIRICAL_TITLES = [
  "Senior Fire Extinguisher (Production Support)",
  "Jira Ticket Moving Champion",
  "Legacy Code Archaeologist",
  "On-Call Martyr & Caffeine Depository",
  "Slide-Deck Aesthetic Architect",
  "VP of Over-Promising & Under-Delivering",
  "Lead Alignment Synergy Liaison",
  "Sprint Retrospective Survivor",
  "Muted Attendee in 45-Person Syncs",
  "Principal Legacy Refactoring Fugitive",
];

const AVATAR_GRADIENTS = [
  "from-emerald-500/40 to-teal-500/10 ring-emerald-400/40",
  "from-pink-500/40 to-fuchsia-500/10 ring-pink-400/40",
  "from-amber-500/40 to-orange-500/10 ring-amber-400/40",
  "from-indigo-500/40 to-violet-500/10 ring-indigo-400/40",
  "from-cyan-500/40 to-sky-500/10 ring-cyan-400/40",
  "from-rose-500/40 to-red-500/10 ring-rose-400/40",
];

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function pickTitle(seed: string): string {
  return SATIRICAL_TITLES[hashStr(seed) % SATIRICAL_TITLES.length];
}
function pickGradient(seed: string): string {
  return AVATAR_GRADIENTS[hashStr(seed + "g") % AVATAR_GRADIENTS.length];
}





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
  user_id: string | null;
  isUserOwned?: boolean;
};

type SimReply = {
  id: string;
  persona: string;
  text: string;
  ts: number;
};

const REPLY_PERSONAS = [
  "Capgemini_Ghost",
  "Deloitte_Defector",
  "Anon_TCS_Lead",
  "Wipro_Survivor",
  "Infosys_Refugee",
  "HCL_Zombie",
  "Accenture_Scout",
  "Google_Burnout",
  "Pune_TCS_Lead",
  "SFO_Google_Architect",
  "Austin_Tesla_Dev",
  "London_Quant_Lead",
  "Berlin_Unicorn_Dev",
  "NYC_Fintech_Sec",
];

const REPLY_LINES = [
  "Standard middle-management behavior right here. 💀",
  "Big agree, run for the hills mate.",
  "Are you on my team? This sounds exactly like our current sprint alignment.",
  "Bro this is my JIRA backlog in human form.",
  "Saving this for my exit interview. 📌",
  "Reading this between two 'urgent' Slack pings.",
  "The standup energy is unmatched today. 🫠",
  "My manager would weaponize this against me.",
  "Take a half-day. Trust.",
  "Production is on fire and so are we. 🔥",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function initials(name: string) {
  return name
    .replace(/[^A-Za-z\s]/g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase() ?? "")
    .join("") || "?";
}

function RichBody({ text }: { text: string }) {
  const parts = text.split(/(\s+)/);
  return (
    <p className="text-[13.5px] leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
      {parts.map((p, i) => {
        if (/^#[A-Za-z0-9_]{2,}$/.test(p)) {
          return <span key={i} className="text-fuchsia-300 font-semibold">{p}</span>;
        }
        if (/^@[A-Za-z0-9_]{2,}$/.test(p)) {
          return <span key={i} className="text-cyan-300 font-semibold">{p}</span>;
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
      if (/^https?:\/\//.test(path)) {
        setUrl(path);
        return;
      }
      const { data, error } = await supabase.storage
        .from("post_media")
        .createSignedUrl(path, 60 * 60 * 6);
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

const SATURDAY_VIBES = [
  "Woke up at 8 AM out of pure corporate habit and panicking that I missed a standup call... someone clear my cache 💀",
  "Currently at a local cafe in Baner working on my side-hustle. The goal is to quit before the Q3 appraisal cycle hits.",
  "Manager texted 'Hey, quick question when you're free' on a Saturday morning. Leaving that notification on read until Monday 9:01 AM. 📴",
  "Heading over to Toit / High Spirits later to erase all memory of this week's micro-management.",
  "On-call rotation is pure pain today. Production server is hanging and the senior dev is completely ghosting.",
  "Saturday standup energy? None. Saturday side-project energy? Unmatched. 🛠️",
];

const SAT_PERSONAS = [
  { name: "Anon_Infosys_Refugee", headline: "Weekend · Pune" },
  { name: "Capgemini_Ghost", headline: "Weekend · Bangalore" },
  { name: "Wipro_Survivor", headline: "Weekend · Hyderabad" },
  { name: "Anon_TCS_Lead", headline: "Weekend · Mumbai" },
  { name: "Deloitte_Defector", headline: "Weekend · Gurgaon" },
  { name: "HCL_Zombie", headline: "Weekend · Bangalore" },
];

function makeSimPost(idx: number, msg?: string): FeedPost {
  const persona = SAT_PERSONAS[Math.floor(Math.random() * SAT_PERSONAS.length)];
  const body = msg ?? SATURDAY_VIBES[Math.floor(Math.random() * SATURDAY_VIBES.length)];
  return {
    id: `sim-sat-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 6)}`,
    author_name: persona.name,
    author_headline: persona.headline,
    body_text: body,
    created_at: new Date(Date.now() - idx * 1000).toISOString(),
    attached_visual_url: null,
    media_type: null,
    tags: null,
    cheers_count: 0,
    user_id: null,
    isUserOwned: false,
  };
}

const NAVIN_LAUNCH_POST_ID = "navin-launch-post-1";

function makeNavinLaunchPost(): FeedPost {
  return {
    id: NAVIN_LAUNCH_POST_ID,
    author_name: "Anon_Founder (You)",
    author_headline: "Just now",
    body_text:
      "Happy weekend everyone! DrinkedIn is officially live. Drop your tech park telemetry below. 🍻🔥",
    created_at: new Date().toISOString(),
    attached_visual_url: null,
    media_type: null,
    tags: null,
    cheers_count: 142,
    user_id: null,
    isUserOwned: true,
  };
}

type GlobalSeed = {
  id: string;
  author_name: string;
  author_headline: string;
  body_text: string;
  minutesAgo: number;
  cheers: number;
};

const GLOBAL_SEED_POSTS: GlobalSeed[] = [
  {
    id: "global-seed-meta-e6",
    author_name: "Anon_Meta_E6",
    author_headline: "Silicon Valley · RSU Golden Handcuff Prisoner",
    body_text:
      "Manager just hinted at another round of 'efficiency calibration' during our Friday 1-on-1. Unlimited PTO is a trap, y'all. Taking a mental health day on Monday.",
    minutesAgo: 8,
    cheers: 312,
  },
  {
    id: "global-seed-london-quant",
    author_name: "London_Quant_Lead",
    author_headline: "UK · Legacy Cobol Archaeologist",
    body_text:
      "Production server at the Canary Wharf branch is held together by pure hope and ancient caffeine deposits. On-call rotation this weekend is pure misery.",
    minutesAgo: 19,
    cheers: 248,
  },
  {
    id: "global-seed-berlin-unicorn",
    author_name: "Berlin_Unicorn_Dev",
    author_headline: "Germany · Agile Standup Survivor",
    body_text:
      "Founder just asked the engineering pod to work Saturday morning to 'hit our Q2 velocity KPIs.' My Slack status is set to offline and I am currently in a cafe pretending to have no signal. ☕",
    minutesAgo: 32,
    cheers: 401,
  },
  {
    id: "global-seed-nyc-fintech",
    author_name: "NYC_Fintech_Sec",
    author_headline: "New York · Senior Slide-Deck Architect",
    body_text:
      "Spent 4 hours formatting alignment slides for a managing director who won't even open the deck. Transitioning this baseline telemetry to deep-focus sleep mode immediately.",
    minutesAgo: 47,
    cheers: 189,
  },
  {
    id: "global-seed-stealth-saas",
    author_name: "Stealth_SaaS_Founder",
    author_headline: "Austin · Principal Refactoring Fugitive",
    body_text:
      "Currently building my independent SaaS project in an office corner while actively muted on a 45-person corporate alignment sync call.",
    minutesAgo: 61,
    cheers: 527,
  },
];

function makeGlobalSeedPosts(): FeedPost[] {
  const now = Date.now();
  return GLOBAL_SEED_POSTS.map((s) => ({
    id: s.id,
    author_name: s.author_name,
    author_headline: s.author_headline,
    body_text: s.body_text,
    created_at: new Date(now - s.minutesAgo * 60_000).toISOString(),
    attached_visual_url: null,
    media_type: null,
    tags: null,
    cheers_count: s.cheers,
    user_id: null,
    isUserOwned: false,
  }));
}


export default function PostsFeed() {
  const { user } = useAuth();
  const panicActive = usePanicState();
  const [posts, setPosts] = useState<FeedPost[] | null>(null);
  const [simPosts, setSimPosts] = useState<FeedPost[]>(() => [makeNavinLaunchPost(), ...makeGlobalSeedPosts()]);
  const [replies, setReplies] = useState<Record<string, SimReply[]>>({});
  const scheduledRef = useRef<Set<string>>(new Set());
  const mountTimeRef = useRef<number>(Date.now());

  // Seed persisted validation/pint counts for the hardcoded launch post so the
  // PostActions row hydrates to 142 / 38 on first paint (and on every reload
  // unless the visitor has actively tapped the buttons since).
  useEffect(() => {
    const existing = readCounts()[NAVIN_LAUNCH_POST_ID];
    if (!existing) writeCounts(NAVIN_LAUNCH_POST_ID, 142, 38);
  }, []);


  const load = useCallback(async () => {
    const { data, error } = await (supabase as any)
      .from("posts")
      .select("id,author_name,author_headline,body_text,created_at,attached_visual_url,media_type,tags,cheers_count,is_hidden,user_id")
      .eq("is_hidden", false)
      .order("created_at", { ascending: false })
      .limit(25);
    if (error) {
      setPosts([]);
      return;
    }
    const list = ((data ?? []) as FeedPost[]).map((p) => ({
      ...p,
      isUserOwned: !!user?.id && p.user_id === user.id,
    }));
    setPosts(list);
  }, [user?.id]);

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

  // Saturday Vibe Matrix: seed 3 weekend persona posts on mount, then append
  // 1 fresh weekend message every 90s to keep the feed organically alive.
  useEffect(() => {
    if (new Date().getDay() !== 6) return;
    if (panicActive) return;
    setSimPosts((prev) => {
      const pinned = prev.filter((p) => p.id === NAVIN_LAUNCH_POST_ID || p.id.startsWith("global-seed-"));
      return [...pinned, makeSimPost(0), makeSimPost(1), makeSimPost(2)];
    });
    const interval = window.setInterval(() => {
      setSimPosts((prev) => {
        const pinned = prev.filter((p) => p.id === NAVIN_LAUNCH_POST_ID || p.id.startsWith("global-seed-"));
        const others = prev.filter((p) => p.id !== NAVIN_LAUNCH_POST_ID && !p.id.startsWith("global-seed-"));
        return [...pinned, makeSimPost(others.length), ...others].slice(0, 18);
      });
    }, 90_000);
    return () => window.clearInterval(interval);
  }, [panicActive]);

  // Force the AI persona reply engine to fire 5s after mount against the
  // hardcoded launch post — guarantees a fresh notification bell ping on
  // every single page load without relying on the user posting anything.
  useEffect(() => {
    if (panicActive) return;
    const t = window.setTimeout(() => {
      const persona = "Pune_Tech_Park_Lead";
      const text =
        "Huge milestone! Already dropped my burnout metric on the sidebar grid. Let's run it up! 🚀";
      const reply: SimReply = {
        id: `${NAVIN_LAUNCH_POST_ID}-launch-${Date.now()}`,
        persona,
        text,
        ts: Date.now(),
      };
      setReplies((prev) => ({
        ...prev,
        [NAVIN_LAUNCH_POST_ID]: [...(prev[NAVIN_LAUNCH_POST_ID] ?? []), reply],
      }));
      try {
        window.dispatchEvent(
          new CustomEvent("drinkedin:post-reply", {
            detail: {
              postId: NAVIN_LAUNCH_POST_ID,
              persona,
              text,
              snippet: "your weekend status update",
            },
          })
        );
        window.dispatchEvent(new CustomEvent("drinkedin:ai-chat-message"));
      } catch {}
    }, 5_000);
    return () => window.clearTimeout(t);
  }, [panicActive]);




  // Automated reply engine: when a user-owned post appears AFTER mount,
  // schedule a 12-25s delayed simulated reply from a random AI persona.
  useEffect(() => {
    if (!posts || !user?.id || panicActive) return;
    const timers: number[] = [];

    for (const p of posts) {
      if (!p.isUserOwned) continue;
      if (scheduledRef.current.has(p.id)) continue;
      const createdMs = new Date(p.created_at).getTime();
      // Only react to posts that landed during this session — not historical ones.
      if (createdMs < mountTimeRef.current - 5_000) {
        scheduledRef.current.add(p.id);
        continue;
      }
      scheduledRef.current.add(p.id);

      const delay = 12_000 + Math.floor(Math.random() * 13_000); // 12–25s
      const t = window.setTimeout(() => {
        const persona = pick(REPLY_PERSONAS);
        const text = pick(REPLY_LINES);
        const reply: SimReply = {
          id: `${p.id}-${Date.now()}`,
          persona,
          text,
          ts: Date.now(),
        };
        setReplies((prev) => ({ ...prev, [p.id]: [...(prev[p.id] ?? []), reply] }));

        // Bridge to navbar bell + notifications drawer
        window.dispatchEvent(
          new CustomEvent("drinkedin:post-reply", {
            detail: {
              postId: p.id,
              persona,
              text,
              snippet: p.body_text.slice(0, 80),
            },
          })
        );
        // Reuse the existing AI-chat bell pulse bridge as well
        window.dispatchEvent(new CustomEvent("drinkedin:ai-chat-message"));
      }, delay);
      timers.push(t);
    }

    return () => {
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [posts, user?.id, panicActive]);

  // Allow the notifications drawer to scroll a target post into view.
  useEffect(() => {
    function onScrollTo(e: Event) {
      const detail = (e as CustomEvent).detail as { postId?: string } | undefined;
      const id = detail?.postId;
      if (!id) return;
      const el = document.getElementById(`post-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-amber-400/60");
        window.setTimeout(() => el.classList.remove("ring-2", "ring-amber-400/60"), 2000);
      }
    }
    window.addEventListener("drinkedin:scroll-to-post", onScrollTo);
    return () => window.removeEventListener("drinkedin:scroll-to-post", onScrollTo);
  }, []);

  // God-Mode traffic surge injector: prepends synthetic posts dispatched from
  // the hidden founder telemetry deck. No DB writes; purely client-side stress.
  useEffect(() => {
    function onSurge(e: Event) {
      const detail = (e as CustomEvent).detail as
        | { id: string; author_name: string; author_headline: string; body_text: string }
        | undefined;
      if (!detail) return;
      const post: FeedPost = {
        id: detail.id,
        author_name: detail.author_name,
        author_headline: detail.author_headline,
        body_text: detail.body_text,
        created_at: new Date().toISOString(),
        attached_visual_url: null,
        media_type: null,
        tags: null,
        cheers_count: 0,
        user_id: null,
        isUserOwned: false,
      };
      setSimPosts((prev) => [post, ...prev].slice(0, 60));
    }
    window.addEventListener("drinkedin:godmode-surge-post", onSurge);
    return () => window.removeEventListener("drinkedin:godmode-surge-post", onSurge);
  }, []);


  // Merge real + simulated weekend posts, sorted newest-first
  const merged: FeedPost[] | null =
    posts === null
      ? null
      : [...simPosts, ...posts].sort(
          (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

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

      {merged === null ? (
        <div className="grid place-items-center py-10">
          <Loader2 className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : merged.length === 0 ? (
        <p className="text-[12.5px] text-muted-foreground py-6 text-center">
          No posts yet — be the first to drop a confession ☝️
        </p>
      ) : (
        <ul className="space-y-4 max-h-[640px] overflow-y-auto pr-1">
          {merged.map((p) => (
            <li
              key={p.id}
              id={`post-${p.id}`}
              className={`rounded-xl border p-3 animate-fade-in transition-shadow ${
                p.isUserOwned
                  ? "border-amber-400/30 bg-amber-500/[0.04]"
                  : "border-white/5 bg-zinc-950/50"
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`size-9 shrink-0 rounded-full bg-gradient-to-br ${pickGradient(
                    p.id
                  )} backdrop-blur-sm border border-white/10 ring-2 grid place-items-center text-[11px] font-extrabold text-foreground/90 shadow-[inset_0_0_8px_rgba(255,255,255,0.08)]`}
                >
                  {initials(p.author_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-[12.5px] font-bold text-foreground truncate">{p.author_name}</span>
                    {p.isUserOwned && (
                      <span className="text-[9px] uppercase tracking-wider font-bold text-amber-300 bg-amber-500/15 border border-amber-400/30 rounded-full px-1.5 py-0.5">
                        You
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground truncate">
                      · {pickTitle(p.id)}
                    </span>
                  </div>
                  {p.author_headline && (
                    <div className="text-[9.5px] text-muted-foreground/70 truncate">
                      {p.author_headline}
                    </div>
                  )}

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

                  {/* Simulated AI persona replies */}
                  {(replies[p.id] ?? []).map((r) => (
                    <div
                      key={r.id}
                      className="mt-2.5 ml-1 rounded-lg border border-cyan-400/20 bg-cyan-500/[0.06] p-2.5 animate-fade-in"
                    >
                      <div className="flex items-center gap-1.5 text-[10.5px] font-bold text-cyan-200">
                        <CornerDownRight className="size-3" />
                        {r.persona}
                        <span className="font-normal text-muted-foreground">
                          · {formatDistanceToNow(new Date(r.ts), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="mt-1 text-[12.5px] text-foreground/90 leading-snug">{r.text}</p>
                    </div>
                  ))}

                  <PostActions postId={p.id} authorName={p.author_name} bodyText={p.body_text} />
                </div>
              </div>
            </li>

          ))}
        </ul>
      )}
    </div>
  );
}
