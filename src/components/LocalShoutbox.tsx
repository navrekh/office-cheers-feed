import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, corporateCodename } from "@/lib/useAuth";
import { trackEngagement } from "@/lib/analytics";
import { useCurrentCity } from "@/lib/useCurrentCity";
import { useHubVernacular } from "@/lib/hubVernacular";
import { useRealtimeHub } from "@/lib/useRealtimeHub";
import { useWeekdayVibe } from "@/lib/weekdayVibe";

type Msg = {
  id: string;
  hub: string;
  user_id: string;
  handle: string;
  emoji: string;
  body: string;
  created_at: string;
};

const HANDLE_EMOJIS = ["🎨", "🚀", "🛠️", "📊", "☕", "🍻", "🧠", "💻", "🔥", "🪐"];

const AI_PERSONAS: { handle: string; emoji: string; color: string }[] = [
  { handle: "Anon_TCS_Lead", emoji: "💻", color: "text-sky-300" },
  { handle: "Infosys_Survivor", emoji: "⚡", color: "text-emerald-300" },
  { handle: "Capgemini_Ghost", emoji: "🕶️", color: "text-fuchsia-300" },
  { handle: "Wipro_Whisper", emoji: "☕", color: "text-amber-300" },
  { handle: "Accenture_Refugee", emoji: "🚪", color: "text-cyan-300" },
  { handle: "Deloitte_Defector", emoji: "🍷", color: "text-rose-300" },
];

// Stable color assignment per handle so real users get a consistent neon tag too.
const HANDLE_PALETTE = [
  "text-amber-300",
  "text-cyan-300",
  "text-fuchsia-300",
  "text-emerald-300",
  "text-sky-300",
  "text-rose-300",
  "text-violet-300",
  "text-lime-300",
];
function handleColor(handle: string): string {
  let h = 0;
  for (let i = 0; i < handle.length; i++) h = (h * 31 + handle.charCodeAt(i)) >>> 0;
  return HANDLE_PALETTE[h % HANDLE_PALETTE.length];
}

const AI_VENTS = [
  "My manager just followed up on a Jira ticket that was assigned to me 8 minutes ago. Please tell me someone is already at Toit.",
  "Currently sitting in a 'Sprint Alignment Matrix Sync' with 34 people on mute. Send help.",
  "Just updated my Slack status to 'In a deep focus session' while walking out of the tech park gates. Perfect crime.",
  "Who is buying the first round at Arbor Brewing tonight? This weekly deployment was an absolute trainwreck.",
  "PM just moved the standup to 6:30 PM. I'm moving my body to the nearest taproom.",
  "Skip-level just asked for a 'quick async update' at 4:55pm. My async update is a cold lager.",
];

const AI_REPLIES = [
  "🎯 Pure facts. Grab a slot on the radar, we are heading out in 10 mins.",
  "🍻 Co-signed. Already saving you a stool at the bar.",
  "📡 Radar pinged. Crew is rallying — drop your ETA.",
  "💀 This. Pinging the squad, taproom in 15.",
  "🔥 Speak louder for the people in the back (and in the 4pm sync).",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function relTime(iso: string, nowMs: number): string {
  const s = Math.max(1, Math.floor((nowMs - new Date(iso).getTime()) / 1000));
  if (s < 30) return "Just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type Props = { requireAuth: (reason?: string) => boolean; variant?: "compact" | "hero" };

export default function LocalShoutbox({ requireAuth, variant = "compact" }: Props) {
  const isHero = variant === "hero";
  const { user } = useAuth();
  const hub = useCurrentCity();
  const weekdayVibe = useWeekdayVibe();
  const vern = useHubVernacular();
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [nowMs, setNowMs] = useState(0); // 0 on SSR to keep markup stable
  const scrollRef = useRef<HTMLDivElement>(null);

  // Tick "now" on mount + every 30s so timestamps stay relative.
  useEffect(() => {
    setNowMs(Date.now());
    const t = setInterval(() => setNowMs(Date.now()), 30000);
    return () => clearInterval(t);
  }, []);

  // Initial fetch on hub change.
  useEffect(() => {
    let cancelled = false;
    setMsgs([]);
    (async () => {
      const { data, error } = await (supabase as any)
        .from("shoutbox_messages")
        .select("id, hub, user_id, handle, emoji, body, created_at")
        .eq("hub", hub)
        .order("created_at", { ascending: false })
        .limit(40);
      if (cancelled) return;
      if (!error && Array.isArray(data)) {
        setMsgs((data as Msg[]).slice().reverse());
      }
    })();
    return () => { cancelled = true; };
  }, [hub]);

  // Realtime: prepend new INSERTs for this hub.
  useRealtimeHub<Msg>("shoutbox_messages", hub, (row) => {
    setMsgs((prev) => {
      if (prev.some((m) => m.id === row.id)) return prev;
      return [...prev.slice(-49), row];
    });
  });

  // Auto-scroll to latest on growth.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  // --- AI Persona Engine ---
  function injectAiMessage(body?: string) {
    const persona = pick(AI_PERSONAS);
    const fake: Msg = {
      id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      hub,
      user_id: "ai-bot",
      handle: persona.handle,
      emoji: persona.emoji,
      body: body ?? pick(weekdayVibe.aiVents.length ? weekdayVibe.aiVents : AI_VENTS),
      created_at: new Date().toISOString(),
    };
    setMsgs((prev) => [...prev.slice(-49), fake]);
  }

  // Ambient bot vents every 45-90s while feed is quiet (< 3 real msgs).
  useEffect(() => {
    let cancelled = false;
    function schedule() {
      const delay = 45000 + Math.random() * 45000;
      const t = setTimeout(() => {
        if (cancelled) return;
        setMsgs((prev) => {
          const realCount = prev.filter((m) => !m.id.startsWith("ai-")).length;
          if (realCount < 3) {
            const persona = pick(AI_PERSONAS);
            const fake: Msg = {
              id: `ai-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              hub,
              user_id: "ai-bot",
              handle: persona.handle,
              emoji: persona.emoji,
              body: pick(weekdayVibe.aiVents.length ? weekdayVibe.aiVents : AI_VENTS),
              created_at: new Date().toISOString(),
            };
            return [...prev.slice(-49), fake];
          }
          return prev;
        });
        schedule();
      }, delay);
      return t;
    }
    const initial = setTimeout(() => injectAiMessage(), 3000);
    const handle = schedule();
    return () => {
      cancelled = true;
      clearTimeout(initial);
      clearTimeout(handle);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hub]);


  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = text.trim();
    if (!v || sending) return;
    if (!requireAuth("Sign in once and whisper anonymously to the local breakroom.")) return;
    if (!user) return;

    const codename = corporateCodename(user.email);
    const emoji = HANDLE_EMOJIS[codename.length % HANDLE_EMOJIS.length];
    setSending(true);
    const { error } = await (supabase as any)
      .from("shoutbox_messages")
      .insert({ hub, user_id: user.id, handle: codename, emoji, body: v.slice(0, 280) });
    setSending(false);
    if (error) return;
    setText("");
    trackEngagement("shoutbox_send", { hub });
    // Instant AI reply 2s later to reward the new whisperer.
    setTimeout(() => injectAiMessage(pick(weekdayVibe.aiReplies.length ? weekdayVibe.aiReplies : AI_REPLIES)), 2000);
  }

  function onFocus() {
    if (!user) requireAuth("Sign in once and whisper anonymously to the local breakroom.");
  }

  return (
    <section
      aria-label="Live Breakroom Chat"
      className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-zinc-950/60 via-zinc-900/40 to-zinc-950/60 backdrop-blur-xl shadow-[0_0_40px_rgba(251,191,36,0.06)] overflow-hidden"
    >
      <header className={`flex items-center justify-between px-4 border-b border-white/5 ${isHero ? "py-4" : "py-3"}`}>
        <h3 className={`font-bold tracking-tight text-amber-100 ${isHero ? "text-lg" : "text-sm"}`}>
          💬 Live Breakroom Chat <span className={`text-amber-300/70 font-medium ${isHero ? "text-xs ml-1" : "text-[10px]"}`}>({hub})</span>
        </h3>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-300/80">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          live
        </span>
      </header>

      {/* Composer — pinned ABOVE the message list in hero mode for instant posting */}
      {isHero && (
        <form onSubmit={onSubmit} className="flex items-center gap-2 border-b border-white/5 bg-gradient-to-r from-amber-500/[0.06] via-transparent to-fuchsia-500/[0.06] p-3">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={onFocus}
            maxLength={280}
            placeholder={vern.shoutboxPlaceholder}
            className="flex-1 px-4 h-12 text-sm rounded-xl bg-[#090909] border border-[#222] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber-400/60 focus:bg-[#0c0c0c] shadow-[inset_0_1px_0_rgba(255,255,255,0.02),inset_0_0_20px_rgba(0,0,0,0.6)] transition"
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="inline-flex items-center gap-2 h-12 px-5 rounded-xl bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-sm tracking-tight uppercase transition shadow-[0_0_30px_rgba(251,191,36,0.7)] hover:shadow-[0_0_50px_rgba(251,191,36,0.95)] disabled:opacity-50 disabled:shadow-none animate-pulse"
          >
            <Send className="size-4" />
            Whisper Anonymously
          </button>
        </form>
      )}

      <div ref={scrollRef} className={`overflow-y-auto px-4 scroll-smooth ${isHero ? "max-h-[260px] min-h-[160px]" : "max-h-40 min-h-[6rem] px-3 py-2"}`}>
        {msgs.length === 0 ? (
          <p className={`text-center text-muted-foreground/70 ${isHero ? "py-12 text-sm" : "py-6 text-[11.5px]"}`}>
            Quiet for a minute in {hub}. Be the first to whisper.
          </p>
        ) : (
          msgs.map((m) => {
            const persona = AI_PERSONAS.find((p) => p.handle === m.handle);
            const nameColor = persona?.color ?? handleColor(m.handle);
            return (
              <div
                key={m.id}
                className="group animate-fade-in flex gap-3 py-3 border-b border-[#1a1a1a] last:border-b-0"
              >
                <div className={`shrink-0 grid place-items-center size-9 rounded-full bg-zinc-950 border ${nameColor.replace("text-", "border-")}/40 shadow-[0_0_12px_rgba(251,191,36,0.15)] text-base`}>
                  <span>{m.emoji}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className={`flex items-baseline gap-2 ${isHero ? "text-xs" : "text-[11px]"}`}>
                    <span className={`font-semibold tracking-tight ${nameColor}`}>
                      {m.handle}
                    </span>
                    <span className="text-muted-foreground/50">
                      · {nowMs === 0 ? "" : relTime(m.created_at, nowMs)}
                    </span>
                  </div>
                  <p className={`mt-1 leading-snug text-foreground/90 ${isHero ? "text-[14px]" : "text-[12.5px]"}`}>
                    {m.body}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Compact-mode composer stays at the bottom (used in sidebars). */}
      {!isHero && (
        <form onSubmit={onSubmit} className="flex items-center gap-2 border-t border-white/5 bg-black/30 p-2">
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onFocus={onFocus}
            maxLength={280}
            placeholder={vern.shoutboxPlaceholder}
            className="flex-1 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber-400/40 focus:bg-white/[0.06] transition h-9 text-[12.5px]"
          />
          <button
            type="submit"
            aria-label="Send message"
            className="inline-grid place-items-center size-9 rounded-lg bg-amber-500 hover:bg-amber-400 text-amber-950 transition shadow-[0_0_20px_rgba(251,191,36,0.25)] disabled:opacity-50"
            disabled={!text.trim() || sending}
          >
            <Send className="size-4" />
          </button>
        </form>
      )}
    </section>
  );
}
