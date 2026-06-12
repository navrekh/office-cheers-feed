import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { useAuth, corporateCodename } from "@/lib/useAuth";
import { trackEngagement } from "@/lib/analytics";

type Msg = {
  id: string;
  handle: string;
  emoji: string;
  text: string;
  ts: number;
};

const HANDLE_EMOJIS = ["🎨", "🚀", "🛠️", "📊", "☕", "🍻", "🧠", "💻", "🔥", "🪐"];
const COMPANY_MASKS = ["Infosys_Dev", "TCS_PM", "Capgemini_QA", "Wipro_SRE", "Cognizant_BA", "Accenture_Mgr", "Persistent_Eng", "Mindtree_UX"];

function randomHandle(seed: number): { handle: string; emoji: string } {
  const c = COMPANY_MASKS[seed % COMPANY_MASKS.length];
  const n = ((seed * 31) % 900) + 100;
  const e = HANDLE_EMOJIS[(seed * 7) % HANDLE_EMOJIS.length];
  return { handle: `${c}_${n}`, emoji: e };
}

const SEED: Msg[] = [
  { id: "s1", handle: "Infosys_Dev_90", emoji: "🎨", text: "Anyone heading to Toit after 4 PM? Need to wash away this sprint planning huddle.", ts: Date.now() - 1000 * 60 * 9 },
  { id: "s2", handle: "TCS_PM_404", emoji: "🚀", text: "Hinjawadi Phase 1 traffic is already looking terrible. Moving to the nearest taproom early.", ts: Date.now() - 1000 * 60 * 6 },
  { id: "s3", handle: "Capgemini_QA_212", emoji: "🛠️", text: "Manager just scheduled a 4:30 PM sync. Absolute crime on a Friday. Pressing the Panic Button as we speak.", ts: Date.now() - 1000 * 60 * 3 },
  { id: "s4", handle: "Wipro_SRE_77", emoji: "🍻", text: "First round of IPAs at Effingut is on me if anyone from Capgemini makes it out by 4.", ts: Date.now() - 1000 * 60 * 1 },
];

function relTime(ts: number): string {
  const s = Math.max(1, Math.floor((Date.now() - ts) / 1000));
  if (s < 30) return "Just now";
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

type Props = {
  requireAuth: (reason?: string) => boolean;
};

export default function LocalShoutbox({ requireAuth }: Props) {
  const { user } = useAuth();
  const [msgs, setMsgs] = useState<Msg[]>(SEED);
  const [text, setText] = useState("");
  const [, force] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // tick timestamps
  useEffect(() => {
    const t = setInterval(() => force((x) => x + 1), 30000);
    return () => clearInterval(t);
  }, []);

  // simulated incoming chatter
  useEffect(() => {
    const t = setInterval(() => {
      const seed = Math.floor(Math.random() * 9999);
      const { handle, emoji } = randomHandle(seed);
      const chatter = [
        "Anyone else's standup just ran 40 minutes over? 😵",
        "EOD ticket dump incoming. Send help (and lager).",
        "Just got 'circling back' for the 4th time today.",
        "Hinjawadi to Baner in 50 min. I quit.",
        "Babylon's Friday crowd looking thicc already.",
        "Calendar shows 'sync' but my soul shows 'pub'.",
      ];
      const txt = chatter[seed % chatter.length];
      setMsgs((prev) => [...prev.slice(-40), { id: `r${Date.now()}`, handle, emoji, text: txt, ts: Date.now() }]);
    }, 18000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs.length]);

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const v = text.trim();
    if (!v) return;
    if (!requireAuth("Sign in once and whisper anonymously to the local breakroom.")) return;
    const codename = corporateCodename(user?.email);
    const emoji = HANDLE_EMOJIS[codename.length % HANDLE_EMOJIS.length];
    setMsgs((prev) => [...prev, { id: `u${Date.now()}`, handle: codename, emoji, text: v.slice(0, 240), ts: Date.now() }]);
    setText("");
    trackEngagement("shoutbox_send");
  }

  function onFocus() {
    if (!user) requireAuth("Sign in once and whisper anonymously to the local breakroom.");
  }

  return (
    <section
      aria-label="Live Breakroom Chat"
      className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-zinc-950/60 via-zinc-900/40 to-zinc-950/60 backdrop-blur-xl shadow-[0_0_40px_rgba(251,191,36,0.06)] overflow-hidden"
    >
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <h3 className="text-sm font-bold tracking-tight text-amber-100">💬 Live Breakroom Chat <span className="text-[10px] text-amber-300/70 font-medium">(Local Hub)</span></h3>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-300/80">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          live
        </span>
      </header>

      <div ref={scrollRef} className="max-h-72 overflow-y-auto px-3 py-3 space-y-2.5 scroll-smooth">
        {msgs.map((m) => (
          <div key={m.id} className="group">
            <div className="flex items-baseline gap-2 text-[11px]">
              <span className="font-semibold text-amber-200/90">
                <span className="mr-1">{m.emoji}</span>{m.handle}
              </span>
              <span className="text-muted-foreground/60">· {relTime(m.ts)}</span>
            </div>
            <p className="mt-0.5 text-[12.5px] leading-snug text-foreground/90 rounded-lg bg-white/[0.03] border border-white/5 px-2.5 py-1.5">
              {m.text}
            </p>
          </div>
        ))}
      </div>

      <form onSubmit={onSubmit} className="flex items-center gap-2 p-2 border-t border-white/5 bg-black/20">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={onFocus}
          maxLength={240}
          placeholder="Whisper anonymously to the breakroom..."
          className="flex-1 h-9 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-[12.5px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber-400/40 focus:bg-white/[0.06] transition"
        />
        <button
          type="submit"
          aria-label="Send message"
          className="inline-grid place-items-center size-9 rounded-lg bg-amber-500 hover:bg-amber-400 text-amber-950 transition shadow-[0_0_20px_rgba(251,191,36,0.25)] disabled:opacity-50"
          disabled={!text.trim()}
        >
          <Send className="size-4" />
        </button>
      </form>
    </section>
  );
}
