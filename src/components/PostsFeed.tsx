import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Hash, AtSign, Loader2, ImageOff, CornerDownRight } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";
import { useAuth } from "@/lib/useAuth";
const usePanicState = () => false;

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
  replyCount = 0,
  commentCount,
}: {
  postId: string;
  authorName: string;
  bodyText: string;
  isUserOwned?: boolean;
  replyCount?: number;
  commentCount?: number | null;
}) {
  const seed = useMemo(
    () => (isUserOwned ? { v: 0, p: 0, c: 0 } : { v: randInt(14, 85), p: randInt(3, 22), c: randInt(4, 38) }),
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

  // Live fluctuation: simulate other anonymous users validating / buying
  // pints on background posts so counters tick up organically and the feed
  // feels like a busy room. User-owned posts are excluded so the user sees
  // their own real engagement only.
  useEffect(() => {
    if (isUserOwned) return;
    let cancelled = false;
    let timer: number | undefined;
    const schedule = () => {
      const delay = 4_000 + Math.floor(Math.random() * 9_000); // 4–13s
      timer = window.setTimeout(tick, delay);
    };
    const tick = () => {
      if (cancelled) return;
      if (Math.random() < 0.55) { schedule(); return; }
      if (Math.random() < 0.78) {
        const bump = randInt(1, 3);
        setValidated((n) => {
          const next = n + bump;
          setPints((pp) => { writeCounts(postId, next, pp); return pp; });
          return next;
        });
        setVPulse(true);
        window.setTimeout(() => setVPulse(false), 220);
      } else {
        setPints((n) => {
          const next = n + 1;
          setValidated((vv) => { writeCounts(postId, vv, next); return vv; });
          return next;
        });
        setPPulse(true);
        window.setTimeout(() => setPPulse(false), 220);
      }
      schedule();
    };
    schedule();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, [postId, isUserOwned]);

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
      bodyText.length > 120 ? bodyText.slice(0, 120) + "…" : bodyText;
    // Per-post link gives each share its own crawlable landing page with
    // rich unfurls in WhatsApp / Slack / LinkedIn.
    const isSim = postId.startsWith("sim-") || postId.startsWith("seed-") || postId.startsWith("global-");
    const shareUrl = isSim
      ? "https://drinkedin.me/"
      : `https://drinkedin.me/p/${postId}`;
    const payload =
      `🚨 DRINKEDIN LEAK from ${authorName}\n\n` +
      `Mood: ${mood}  "${truncated}"\n\n` +
      `Roast + reply → ${shareUrl}`;

    const done = () => {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
      toast(
        "🔗 Leak copied — paste it into your team WhatsApp / Slack thread.",
        { duration: 2600 }
      );
      try { window.dispatchEvent(new CustomEvent("drinkedin:radar-pulse")); } catch {}
    };

    try {
      navigator.clipboard.writeText(payload).then(done).catch(() => {
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
        onClick={() => {
          try {
            window.dispatchEvent(
              new CustomEvent("drinkedin:open-comments", { detail: { postId } })
            );
          } catch {}
        }}
        className="px-3 py-1 rounded-full text-[11px] font-bold border border-cyan-400/30 bg-cyan-500/[0.06] text-cyan-200 hover:bg-cyan-500/[0.14] hover:border-cyan-300/60 transition-all duration-200"
        aria-label="Open replies"
      >
        💬 {(typeof commentCount === "number" ? commentCount : seed.c) + replyCount} replies
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

const FEED_VIBES = [
  "Manager just scheduled a 'quick sync' at 6:45 PM. I've already opened LinkedIn in a private tab. 🪦",
  "Currently in a 12-person standup where 11 people are on mute and 1 person is sharing the wrong screen.",
  "Stand-up update: yesterday I attended meetings, today I will attend meetings, blockers: meetings.",
  "Boss called my Jira ticket 'low effort.' Bro, you assigned it to me at 4:59 PM on Friday. 🙃",
  "Just got the 'we value your feedback' Google Form right after layoffs were announced. The audacity.",
  "Production is down. The senior dev is 'in a meeting.' The on-call doc is from 2019. We are so cooked. 🔥",
  "HR sent a wellness survey. Question 1: 'How supported do you feel?' My answer crashed the form.",
  "Got promoted to 'Senior' which apparently means same salary, more meetings, and a fancier Slack title.",
  "Refactored a 4-year-old microservice today. Found a TODO from someone who quit in 2021. Legend.",
  "VP just used 'synergy' and 'circle back' in the same sentence. I felt my soul leave my body.",
  "Skip-level 1:1 went well — by which I mean I said nothing real and smiled for 30 minutes.",
  "Currently writing a self-appraisal for someone who took credit for all my work. Award-winning fiction. 🏆",
  "Got an 'urgent' Slack at 11pm. Replied at 9:01am Monday. Boundaries are a side-hustle now.",
  "Side project hit ₹40k MRR this month. Day job hit me with a 'partial meets expectations' rating. 🚀",
  "Watched a 90-min All Hands where the CEO said 'family' 14 times and 'cost optimization' 9 times.",
  "Three months into the new job and I still don't know what my team ships. Nobody else does either.",
  "Just blocked my own manager's calendar for 'deep work.' It's a nap. 💤",
  "Got Slack-cancelled for using a 🫠 emoji in #general. The corporate vibe police are real.",
  "Recruiter pinged me about a 'rocket-ship startup.' Looked them up — 4 employees and a Notion page.",
  "Took a half-day to interview elsewhere. Manager assumed I was sick and sent a get-well GIF. Felt feral.",
  "Pair-programmed with the architect. He renamed two variables in 90 minutes and called it leverage.",
  "QA filed a P0 because a button is 2px off-center on a Samsung from 2017. Closing as 'won't fix.'",
  "Got asked to 'wear many hats' which I now realize is corporate for 'three jobs, one paycheck.' 🎩",
  "Reading my own code from 6 months ago and wondering who hurt me.",
  "Standup ran 47 minutes. The actual blocker was 'we don't know what we're building.' Nobody said it.",
  "Currently at a cafe in Indiranagar pretending to take a customer call. It's a Duolingo session. 🦉",
  "Manager wants 'data-driven storytelling.' I want a 4-day workweek. Neither of us is winning.",
  "Anniversary review: 0.7% hike, 1 new responsibility, 0 new headcount. Math is mathing. 📉",
  "Got pulled into a 'quick alignment' that turned into a 90-min political knife fight. No notes shared.",
  "WFH ban announced via Slack at 11:47 PM on a Sunday. Bold strategy, Cotton.",
  "Skip-skip-level pinged me directly. The org chart trembled. My calendar wept.",
  "Just shipped a feature nobody asked for because the VP saw a competitor demo on LinkedIn. 🫡",
  "Hackathon prize: a hoodie and the privilege of maintaining the winning project forever. 🎁",
  "Got 'feedback' that I'm 'too direct.' Translation: I asked a question in the all-hands.",
  "PIP'd a teammate's PR. Now I'm in the PIP. Beautiful symmetry.",
  "Founder told us 'we're a family' and then fired engineering on a Zoom call with no audio. 🎭",
  "Sales sold a feature that doesn't exist. Eng has 6 weeks. The customer has lawyers. 🧑‍⚖️",
  "Recruiter promised 'flat hierarchy.' My grandboss has a grandboss. The hierarchy is fractal.",
  "Just got asked to 'just make it pop' for the 4th time this sprint. The design system is a hostage.",
  "L4 → L5 promo doc deadline got pushed because my manager forgot to write the calibration deck. Cool cool cool.",
  "WFH Friday means I can finally interview at 11am without lying about a 'dentist appointment.' 🦷",
  "PM just asked engineering to 'roughly estimate' a project. Translation: deadline already exists.",
  "The new RTO policy has more pages than our company handbook. Priorities.",
  "Got a calendar invite called '[CONFIDENTIAL] Quick chat.' Updated my resume preemptively. 📝",
  "Demo day. Half the team is on caffeine, the other half is on Xanax. The product is on fire. 🔥",
  "Lead asked me to mentor a new joiner who has 4 more years of experience than me. Make it make sense.",
  "Just sat through 'AI Strategy Town Hall.' We're sprinkling GPT on the homepage and calling it transformation.",
  "Slack DM from CEO: 'got a sec?' I have not had a sec since 2021. ⏳",
  "Quarterly OKR review: we hit 30%, the deck says 110%. Storytelling is the real product.",
  "Office party canceled because 'budget.' Same week the leadership team went to Goa for 'offsite.' 🏝️",
  "Free office snacks downgraded from almonds to digestive biscuits. The runway is short, friends.",
  "New stack ranking system just dropped. Two managers already started writing each other's review.",
  "My ticket was reassigned 4 times in one sprint. It's basically a Pixar movie at this point. 🎬",
  "Got asked to 'own the customer journey end-to-end.' I am one person. With one Figma license.",
  "Standup blocker: my will to live. Standing item, every day this sprint.",
];

const FEED_PERSONAS = [
  { name: "Infosys_Refugee_42", headline: "Pune · Sprint 47 Survivor" },
  { name: "Capgemini_Ghost", headline: "Bangalore · On-Call Martyr" },
  { name: "Wipro_Survivor", headline: "Hyderabad · Jira Ticket Champion" },
  { name: "TCS_Lead_Mumbai", headline: "Mumbai · Legacy Cobol Whisperer" },
  { name: "Deloitte_Defector", headline: "Gurgaon · Deck Aesthetic Lead" },
  { name: "HCL_Zombie", headline: "Bangalore · Standup Survivor" },
  { name: "Meta_E5_Refugee", headline: "Bangalore · RSU Handcuff Prisoner" },
  { name: "SFO_Stripe_PM", headline: "San Francisco · Roadmap Negotiator" },
  { name: "Berlin_Unicorn_Dev", headline: "Berlin · Agile Refugee" },
  { name: "NYC_Fintech_Sec", headline: "New York · Slide-Deck Architect" },
  { name: "Austin_Tesla_Dev", headline: "Austin · Production Firefighter" },
  { name: "London_Quant_Lead", headline: "London · Compliance Hostage" },
  { name: "Toronto_AWS_SDE", headline: "Toronto · Mute-Button Veteran" },
  { name: "Flipkart_PM_BLR", headline: "Bangalore · OKR Negotiator" },
  { name: "Zomato_Eng_GGN", headline: "Gurgaon · Hotfix Specialist" },
  { name: "Stealth_SaaS_Founder", headline: "Remote · Refactoring Fugitive" },
  { name: "Swiggy_PM_Koramangala", headline: "Bangalore · Surge-Pricing Apologist" },
  { name: "PayTM_Dev_Noida", headline: "Noida · Compliance Hostage" },
  { name: "Razorpay_SDE3", headline: "Bangalore · Webhook Whisperer" },
  { name: "Oyo_Lead_Pivoted", headline: "Gurgaon · Pivot Survivor" },
  { name: "ExByjus_Sales", headline: "Bangalore · Cold-Call Veteran" },
  { name: "Adobe_PM_Noida", headline: "Noida · Subscription Defender" },
  { name: "Salesforce_Eng_HYD", headline: "Hyderabad · Trailhead Refugee" },
  { name: "Oracle_DBA_Lifer", headline: "Bangalore · License Hostage" },
  { name: "SAP_Consultant_NCR", headline: "Gurgaon · Transport Layer Survivor" },
  { name: "IBM_Architect_Pune", headline: "Pune · Mainframe Archaeologist" },
  { name: "Cisco_NetEng_BLR", headline: "Bangalore · VPN Firefighter" },
  { name: "Dell_PreSales", headline: "Bangalore · Quota Hostage" },
  { name: "Goldman_Quant_42", headline: "Bangalore · Excel Macro Slave" },
  { name: "JPMC_Dev_BKC", headline: "Mumbai · Compliance Hostage" },
  { name: "MorganStanley_PM", headline: "Bangalore · Bonus-Day Counter" },
  { name: "Citi_Analyst_Worli", headline: "Mumbai · Risk-Model Refugee" },
  { name: "HSBC_Ops_HYD", headline: "Hyderabad · KYC Survivor" },
  { name: "Barclays_Java_Lifer", headline: "Pune · Spring Boot Veteran" },
  { name: "Walmart_Eng_BLR", headline: "Bangalore · Inventory API Hostage" },
  { name: "Amazon_SDE2_PIPed", headline: "Hyderabad · PIP Survivor" },
  { name: "Microsoft_PM_HYD", headline: "Hyderabad · Teams Roadmap Negotiator" },
  { name: "Google_TPM_Whitefield", headline: "Bangalore · OKR Translator" },
  { name: "Uber_Eng_Marathahalli", headline: "Bangalore · Surge-Pricing Apologist" },
  { name: "Netflix_TLM_Remote", headline: "Remote · 'Keeper Test' Anxious" },
  { name: "Atlassian_Dev_BLR", headline: "Bangalore · Jira on Jira" },
  { name: "Shopify_Eng_Async", headline: "Remote · Async Meeting Apologist" },
  { name: "Cred_PM_Indiranagar", headline: "Bangalore · Burn-Rate Anxious" },
  { name: "Meesho_Eng_BLR", headline: "Bangalore · Seller-Catalog Firefighter" },
  { name: "PhonePe_SDE_UPI", headline: "Bangalore · UPI Latency Survivor" },
  { name: "Freshworks_PM_OMR", headline: "Chennai · CSAT Score Hostage" },
  { name: "Zoho_Eng_Tenkasi", headline: "Chennai · 'No-VC' Lifer" },
  { name: "Nykaa_Eng_Mumbai", headline: "Mumbai · Festive Sale Refugee" },
  { name: "BigBasket_PM_BLR", headline: "Bangalore · Slot-Capacity Negotiator" },
  { name: "DBS_Dev_SG", headline: "Singapore · Saturday Release Veteran" },
  { name: "Grab_Eng_OneNorth", headline: "Singapore · Pivot Survivor" },
  { name: "Shopee_PM_SG", headline: "Singapore · Roadmap Renegotiator" },
  { name: "Dubai_Careem_TL", headline: "Dubai · Ramadan Sprint Survivor" },
  { name: "Klarna_Risk_STO", headline: "Stockholm · Fraud-Model Refugee" },
  { name: "Revolut_Ops_LDN", headline: "London · 'Move Fast' Casualty" },
  { name: "N26_Dev_Mitte", headline: "Berlin · KYC Backlog Hostage" },
  { name: "Spotify_BE_STO", headline: "Stockholm · Squad Model Skeptic" },
  { name: "Burnt_Toast_PM", headline: "Bangalore · Standup-Optional Believer" },
  { name: "Caffeinated_TL_88", headline: "Pune · 4PM Espresso Loyalist" },
  { name: "Sprint_Goal_Skeptic", headline: "Hyderabad · Velocity Theorist" },
  { name: "TownHall_Survivor", headline: "Mumbai · All-Hands Lurker" },
  { name: "OKR_Ghost_Q4", headline: "Gurgaon · Quarterly Pivot Survivor" },
  { name: "Slack_DM_Therapist", headline: "Remote · Vent-Channel Mod" },
  { name: "Notion_Doc_Hoarder", headline: "Bangalore · Page Tree Archivist" },
  { name: "Friday_Deploy_Diva", headline: "Chennai · Weekend On-Call Lifer" },
  { name: "Quiet_Quitter_Sam", headline: "Bangalore · 9.01 to 5.59" },
  { name: "Diya_From_Powai", headline: "Mumbai · TC-Disclosure Activist" },
  { name: "Rohan_Ex_Unicorn", headline: "Bangalore · 3rd Layoff Veteran" },
  { name: "Aisha_From_BKC", headline: "Mumbai · IC5 Promo Hostage" },
  { name: "Vikram_OnBench", headline: "Pune · Project Allocation Ghost" },
  { name: "Priya_PM_Powai", headline: "Mumbai · Stakeholder Translator" },
  { name: "Ahmed_From_DIFC", headline: "Dubai · KPI Roulette Player" },
  { name: "Lena_Aus_Berlin", headline: "Berlin · 'Feedback Culture' Tired" },
  { name: "Marco_Milano_Eng", headline: "Milan · RTO Mandate Refugee" },
  { name: "Yuki_Shibuya_Dev", headline: "Tokyo · Overtime Apologist" },
  { name: "Standup_Late_Again", headline: "Bangalore · Camera-Off Loyalist" },
  { name: "Pip_The_Engineer", headline: "Remote · PIP Letter Collector" },
  { name: "Layoff_Lottery_22", headline: "Hyderabad · Severance Negotiator" },
  { name: "Calendar_Tetris_Pro", headline: "Bangalore · Meeting-Stacker" },
  { name: "Mute_Button_MVP", headline: "Remote · Zoom Marathoner" },
  { name: "Cubicle_Confessor", headline: "Gurgaon · Open-Plan Hostage" },
  { name: "Pantry_Coffee_Critic", headline: "Bangalore · Filter Coffee Loyalist" },
  { name: "WFH_Pajama_Lead", headline: "Remote · Top-Half Formal Only" },
  { name: "ExFAANG_Now_Indie", headline: "Goa · Hammock CTO" },
  { name: "Bench_Warmer_Bro", headline: "Chennai · Allocation Pending" },
];

function makeSimPost(idx: number, msg?: string): FeedPost {
  const persona = FEED_PERSONAS[Math.floor(Math.random() * FEED_PERSONAS.length)];
  const body = msg ?? FEED_VIBES[Math.floor(Math.random() * FEED_VIBES.length)];
  // Spread timestamps from ~30s to ~12min ago so the feed feels like a live stream
  // rather than a synchronized batch drop.
  const offsetMs = 30_000 + Math.floor(Math.random() * 11 * 60_000);
  return {
    id: `sim-${Date.now()}-${idx}-${Math.random().toString(36).slice(2, 7)}`,
    author_name: persona.name,
    author_headline: persona.headline,
    body_text: body,
    created_at: new Date(Date.now() - offsetMs).toISOString(),
    attached_visual_url: null,
    media_type: null,
    tags: null,
    cheers_count: 0,
    user_id: null,
    isUserOwned: false,
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
  const [simPosts, setSimPosts] = useState<FeedPost[]>(() => {
    const seeds = makeGlobalSeedPosts();
    const fresh = Array.from({ length: 14 }, (_, i) => makeSimPost(i));
    return [...fresh, ...seeds];
  });
  const [replies, setReplies] = useState<Record<string, SimReply[]>>({});
  const scheduledRef = useRef<Set<string>>(new Set());
  const mountTimeRef = useRef<number>(Date.now());



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

  // Live feed sim: refresh sim posts on mount and append a fresh persona drop
  // every ~25s so the timeline always feels like users are actively posting.
  useEffect(() => {
    if (panicActive) return;
    let cancelled = false;
    let timer: number | undefined;
    const tick = () => {
      if (cancelled) return;
      // Occasionally drop 1–3 posts at once so the feed feels bursty,
      // like a real room where multiple people chime in.
      const burst = Math.random() < 0.25 ? randInt(2, 3) : 1;
      setSimPosts((prev) => {
        const seeds = prev.filter((p) => p.id.startsWith("global-seed-"));
        const others = prev.filter((p) => !p.id.startsWith("global-seed-"));
        const fresh = Array.from({ length: burst }, (_, i) => makeSimPost(others.length + i));
        return [...fresh, ...others, ...seeds].slice(0, 50);
      });
      schedule();
    };
    const schedule = () => {
      const delay = 6_000 + Math.floor(Math.random() * 9_000); // 6–15s
      timer = window.setTimeout(tick, delay);
    };
    schedule();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
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
        <ul className={`space-y-4 max-h-[640px] overflow-y-auto pr-1 ${!user ? "relative" : ""}`}>
          {!user && merged.length > 8 && (
            <li className="sticky bottom-0 z-20 -mb-2 list-none pointer-events-none">
              <div className="pointer-events-auto rounded-xl border border-amber-400/40 bg-gradient-to-t from-neutral-950 via-neutral-950/95 to-neutral-950/70 backdrop-blur-md p-4 text-center shadow-[0_-20px_60px_rgba(0,0,0,0.8)]">
                <p className="text-[11px] font-bold uppercase tracking-wider text-amber-300 mb-1">
                  🔒 {merged.length - 8} more confessions tonight
                </p>
                <p className="text-xs text-neutral-400 mb-3">
                  Sign in (10 sec, no work email) to unlock the rest and drop your own.
                </p>
                <button
                  onClick={() => window.dispatchEvent(new CustomEvent("drinkedin:open-auth", { detail: { reason: "Unlock the full breakroom feed." } }))}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-xs font-black uppercase tracking-wider text-neutral-950 hover:bg-amber-300 transition"
                >
                  Unlock the feed →
                </button>
              </div>
            </li>
          )}
          {(user ? merged : merged.slice(0, 8)).map((p) => (
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

                  <div className="text-[10px] text-muted-foreground/80 mb-1.5 font-mono tabular-nums tracking-tight">
                    ▮ {formatDistanceToNow(new Date(p.created_at), { addSuffix: true }).toUpperCase()}
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

                  <PostActions postId={p.id} authorName={p.author_name} bodyText={p.body_text} isUserOwned={p.isUserOwned} replyCount={(replies[p.id] ?? []).length} commentCount={(p as { comment_count?: number | null }).comment_count ?? null} />
                </div>
              </div>
            </li>

          ))}
        </ul>
      )}
    </div>
  );
}
