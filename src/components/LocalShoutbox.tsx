import { useEffect, useRef, useState, type FormEvent } from "react";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, corporateCodename } from "@/lib/useAuth";
import { trackEngagement } from "@/lib/analytics";
import { useCurrentCity } from "@/lib/useCurrentCity";
import { useRealtimeHub } from "@/lib/useRealtimeHub";

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

type Props = { requireAuth: (reason?: string) => boolean };

export default function LocalShoutbox({ requireAuth }: Props) {
  const { user } = useAuth();
  const hub = useCurrentCity();
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
        <h3 className="text-sm font-bold tracking-tight text-amber-100">
          💬 Live Breakroom Chat <span className="text-[10px] text-amber-300/70 font-medium">({hub})</span>
        </h3>
        <span className="inline-flex items-center gap-1.5 text-[10px] text-emerald-300/80">
          <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
          live
        </span>
      </header>

      <div ref={scrollRef} className="max-h-72 min-h-[10rem] overflow-y-auto px-3 py-3 space-y-2.5 scroll-smooth">
        {msgs.length === 0 ? (
          <p className="text-center text-[11.5px] text-muted-foreground/70 py-6">
            Quiet for a minute in {hub}. Be the first to whisper.
          </p>
        ) : (
          msgs.map((m) => (
            <div key={m.id} className="group animate-fade-in">
              <div className="flex items-baseline gap-2 text-[11px]">
                <span className="font-semibold text-amber-200/90">
                  <span className="mr-1">{m.emoji}</span>{m.handle}
                </span>
                <span className="text-muted-foreground/60">
                  · {nowMs === 0 ? "" : relTime(m.created_at, nowMs)}
                </span>
              </div>
              <p className="mt-0.5 text-[12.5px] leading-snug text-foreground/90 rounded-lg bg-white/[0.03] border border-white/5 px-2.5 py-1.5">
                {m.body}
              </p>
            </div>
          ))
        )}
      </div>

      <form onSubmit={onSubmit} className="flex items-center gap-2 p-2 border-t border-white/5 bg-black/20">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onFocus={onFocus}
          maxLength={280}
          placeholder="Whisper anonymously to the breakroom..."
          className="flex-1 h-9 px-3 rounded-lg bg-white/[0.04] border border-white/10 text-[12.5px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber-400/40 focus:bg-white/[0.06] transition"
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
    </section>
  );
}
