import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import { Megaphone, Beer, X, Clock, Users, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth, corporateCodename } from "@/lib/useAuth";
import { useCurrentCity } from "@/lib/useCurrentCity";
import { useRealtimeHub } from "@/lib/useRealtimeHub";
import { trackEngagement } from "@/lib/analytics";

type Rally = {
  id: string;
  hub: string;
  creator_id: string;
  creator_handle: string;
  creator_emoji: string;
  venue: string;
  note: string | null;
  eta_minutes: number;
  source_message_id: string | null;
  created_at: string;
  expires_at: string;
};

type Rsvp = {
  id: string;
  rally_id: string;
  user_id: string;
  handle: string;
  emoji: string;
  created_at: string;
};

type Props = { requireAuth: (reason?: string) => boolean };

const ETA_PRESETS = [15, 30, 60];

function minsLeft(expires: string, now: number): number {
  return Math.max(0, Math.round((new Date(expires).getTime() - now) / 60000));
}

export default function RallyBoard({ requireAuth }: Props) {
  const { user } = useAuth();
  const hub = useCurrentCity();
  const [rallies, setRallies] = useState<Rally[]>([]);
  const [rsvps, setRsvps] = useState<Rsvp[]>([]);
  const [now, setNow] = useState(0);
  const [open, setOpen] = useState(false);
  const [venue, setVenue] = useState("");
  const [note, setNote] = useState("");
  const [eta, setEta] = useState(30);
  const [sourceMsgId, setSourceMsgId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Fetch active rallies + their RSVPs on hub change.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: rs } = await (supabase as any)
        .from("rallies")
        .select("*")
        .eq("hub", hub)
        .gt("expires_at", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(20);
      if (cancelled) return;
      const list = (rs ?? []) as Rally[];
      setRallies(list);
      if (list.length) {
        const ids = list.map((r) => r.id);
        const { data: vs } = await (supabase as any)
          .from("rally_rsvps")
          .select("*")
          .in("rally_id", ids);
        if (!cancelled) setRsvps((vs ?? []) as Rsvp[]);
      } else {
        setRsvps([]);
      }
    })();
    return () => { cancelled = true; };
  }, [hub]);

  // Realtime: new rallies for this hub.
  useRealtimeHub<Rally>("rallies", hub, (row) => {
    setRallies((prev) => (prev.some((r) => r.id === row.id) ? prev : [row, ...prev]));
  });

  // Realtime: RSVPs (not hub-filtered server-side; filter client-side by known rally ids).
  useEffect(() => {
    const channel = (supabase as any)
      .channel(`rally_rsvps:all`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "rally_rsvps" }, (p: { new: Rsvp }) => {
        setRsvps((prev) => (prev.some((r) => r.id === p.new.id) ? prev : [...prev, p.new]));
      })
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "rally_rsvps" }, (p: { old: Rsvp }) => {
        setRsvps((prev) => prev.filter((r) => r.id !== p.old.id));
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Listen for "rally this message" events from the shoutbox.
  useEffect(() => {
    function onRally(e: Event) {
      const detail = (e as CustomEvent<{ messageId?: string; suggested?: string }>).detail || {};
      if (!requireAuth("Rally the breakroom — pin a meet-up so the squad can join in one tap.")) return;
      setSourceMsgId(detail.messageId ?? null);
      if (detail.suggested) setVenue(detail.suggested);
      setOpen(true);
      setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
    }
    window.addEventListener("drinkedin:rally-from-message", onRally as EventListener);
    return () => window.removeEventListener("drinkedin:rally-from-message", onRally as EventListener);
  }, [requireAuth]);

  const active = useMemo(
    () => rallies.filter((r) => new Date(r.expires_at).getTime() > now || now === 0),
    [rallies, now],
  );

  const rsvpsByRally = useMemo(() => {
    const m = new Map<string, Rsvp[]>();
    for (const r of rsvps) {
      const arr = m.get(r.rally_id) ?? [];
      arr.push(r);
      m.set(r.rally_id, arr);
    }
    return m;
  }, [rsvps]);

  async function createRally(e: FormEvent) {
    e.preventDefault();
    if (submitting) return;
    if (!requireAuth("Sign in to rally — keeps the breakroom from spam pins.")) return;
    if (!user) return;
    const v = venue.trim();
    if (!v) return;
    setSubmitting(true);
    const handle = corporateCodename(user.email);
    const expires = new Date(Date.now() + (eta + 30) * 60_000).toISOString();
    const { data, error } = await (supabase as any)
      .from("rallies")
      .insert({
        hub,
        creator_id: user.id,
        creator_handle: handle,
        creator_emoji: "🍻",
        venue: v.slice(0, 80),
        note: note.trim().slice(0, 200) || null,
        eta_minutes: eta,
        source_message_id: sourceMsgId,
        expires_at: expires,
      })
      .select()
      .single();
    setSubmitting(false);
    if (error) {
      toast.error("Couldn't post rally", { description: error.message });
      return;
    }
    // Auto-RSVP creator.
    if (data) {
      await (supabase as any)
        .from("rally_rsvps")
        .insert({ rally_id: data.id, user_id: user.id, handle, emoji: "🍻" });
    }
    trackEngagement("rally_create", { hub, eta });
    toast.success("🚨 Rally pinned", { description: `${v} · ${eta}m ETA. The squad sees it now.` });
    setVenue(""); setNote(""); setEta(30); setSourceMsgId(null); setOpen(false);
  }

  async function toggleRsvp(rally: Rally) {
    if (!requireAuth("Sign in to lock in your spot at the rally.")) return;
    if (!user) return;
    const mine = (rsvpsByRally.get(rally.id) ?? []).find((r) => r.user_id === user.id);
    const handle = corporateCodename(user.email);
    if (mine) {
      const { error } = await (supabase as any).from("rally_rsvps").delete().eq("id", mine.id);
      if (!error) trackEngagement("rally_unrsvp", { rally: rally.id });
    } else {
      const { error } = await (supabase as any)
        .from("rally_rsvps")
        .insert({ rally_id: rally.id, user_id: user.id, handle, emoji: "🙌" });
      if (error) {
        toast.error("Couldn't RSVP", { description: error.message });
        return;
      }
      trackEngagement("rally_rsvp", { rally: rally.id });
      toast.success(`🙌 You're in: ${rally.venue}`, { description: `${rally.eta_minutes}m ETA · ${rally.creator_handle} is leading.` });
    }
  }

  return (
    <section
      aria-label="Live Rallies"
      className="rounded-2xl border border-amber-500/25 bg-gradient-to-br from-zinc-950/70 via-zinc-900/50 to-zinc-950/70 backdrop-blur-xl shadow-[0_0_40px_rgba(251,191,36,0.07)] overflow-hidden"
    >
      <header className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2">
          <Megaphone className="size-4 text-amber-300" />
          <h3 className="text-sm font-bold tracking-tight text-amber-100">
            🚨 Live Rallies <span className="text-amber-300/70 font-medium text-[10px] ml-1">({hub})</span>
          </h3>
          {active.length > 0 && (
            <span className="ml-1 inline-flex items-center gap-1.5 text-[10px] text-emerald-300/85">
              <span className="size-1.5 rounded-full bg-emerald-400 animate-soft-breathe" />
              {active.length} active
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            if (!requireAuth("Sign in to start a rally.")) return;
            setOpen((v) => !v);
            setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 60);
          }}
          className="inline-flex items-center gap-1.5 text-[11px] font-extrabold uppercase tracking-wider px-3 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black transition shadow-[0_0_18px_rgba(251,191,36,0.4)]"
        >
          <Sparkles className="size-3.5" />
          {open ? "Close" : "Start Rally"}
        </button>
      </header>

      {open && (
        <div ref={formRef} className="border-b border-white/5 bg-gradient-to-r from-amber-500/[0.06] via-transparent to-fuchsia-500/[0.06] p-3">
          <form onSubmit={createRally} className="space-y-2">
            {sourceMsgId && (
              <div className="flex items-center justify-between text-[10px] text-amber-300/80">
                <span>↳ Rallying off a whisper</span>
                <button type="button" onClick={() => setSourceMsgId(null)} className="text-muted-foreground hover:text-foreground"><X className="size-3" /></button>
              </div>
            )}
            <input
              autoFocus
              type="text"
              value={venue}
              onChange={(e) => setVenue(e.target.value)}
              maxLength={80}
              placeholder="Venue or area · e.g. Toit, Indiranagar"
              className="w-full px-3 h-10 text-sm rounded-lg bg-[#090909] border border-[#222] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber-400/60"
            />
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              placeholder="Optional note · 'first round on me'"
              className="w-full px-3 h-9 text-xs rounded-lg bg-[#090909] border border-[#222] text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-amber-400/40"
            />
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {ETA_PRESETS.map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setEta(m)}
                    className={`text-[11px] font-bold px-2.5 py-1 rounded-md border transition ${
                      eta === m
                        ? "border-amber-400/70 bg-amber-400/15 text-amber-200"
                        : "border-white/10 bg-white/[0.03] text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {m}m
                  </button>
                ))}
              </div>
              <button
                type="submit"
                disabled={!venue.trim() || submitting}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-extrabold text-xs uppercase tracking-wider transition shadow-[0_0_24px_rgba(251,191,36,0.55)] disabled:opacity-50 disabled:shadow-none"
              >
                <Megaphone className="size-4" />
                Pin Rally
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="px-3 py-2 max-h-[280px] overflow-y-auto">
        {active.length === 0 ? (
          <p className="py-6 text-center text-[12px] text-muted-foreground/70">
            No live rallies in {hub}. Pin one and the squad shows up in 30.
          </p>
        ) : (
          <ul className="space-y-2">
            {active.map((r) => {
              const list = rsvpsByRally.get(r.id) ?? [];
              const mine = user ? list.some((x) => x.user_id === user.id) : false;
              const left = now === 0 ? r.eta_minutes : minsLeft(r.expires_at, now);
              return (
                <li
                  key={r.id}
                  className="rounded-xl border border-white/8 bg-black/40 p-3 hover:border-amber-400/30 transition animate-fade-in"
                >
                  <div className="flex items-start gap-3">
                    <div className="shrink-0 grid place-items-center size-9 rounded-full bg-amber-500/15 border border-amber-400/40 text-base">
                      {r.creator_emoji}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                        <span className="text-[13px] font-bold text-amber-100 truncate">{r.venue}</span>
                        <span className="text-[10px] text-muted-foreground">· led by <span className="text-amber-300/90">{r.creator_handle}</span></span>
                      </div>
                      {r.note && <p className="mt-1 text-[12px] text-foreground/85 leading-snug">{r.note}</p>}
                      <div className="mt-1.5 flex items-center gap-3 text-[10.5px] text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {r.eta_minutes}m ETA · {left}m left</span>
                        <span className="inline-flex items-center gap-1"><Users className="size-3" /> {list.length} in</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleRsvp(r)}
                      className={`shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-lg text-[11px] font-extrabold uppercase tracking-wider transition ${
                        mine
                          ? "bg-emerald-500/20 text-emerald-200 border border-emerald-400/40 hover:bg-emerald-500/30"
                          : "bg-amber-400 text-black hover:bg-amber-300 shadow-[0_0_16px_rgba(251,191,36,0.35)]"
                      }`}
                    >
                      <Beer className="size-3.5" />
                      {mine ? "You're in" : "I'm in"}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
