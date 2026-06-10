import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { Lock, MessageCircle, PartyPopper, Sparkles, Vote } from "lucide-react";

type Status = {
  active_merchants: number;
  vote_count: number;
  target: number;
  launched: boolean;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  city: string;
};

const SESSION_KEY = "drinkedin.voteSession";
function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let v = window.localStorage.getItem(SESSION_KEY);
  if (!v) {
    v = (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);
    window.localStorage.setItem(SESSION_KEY, v);
  }
  return v;
}

const leadSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(80, "Max 80 chars"),
  pub_name: z.string().trim().min(1, "Bar name required").max(120, "Max 120 chars"),
  whatsapp: z.string().trim()
    .min(6, "Enter a valid WhatsApp number")
    .max(20, "Max 20 chars")
    .regex(/^[+\d][\d\s()-]{5,19}$/, "Digits, spaces, +, -, () only"),
});

export default function CityCampaignModal({ open, onOpenChange, city }: Props) {
  const [status, setStatus] = useState<Status | null>(null);
  const [loading, setLoading] = useState(true);
  const [voting, setVoting] = useState(false);
  const [justVoted, setJustVoted] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [leadSubmitting, setLeadSubmitting] = useState(false);
  const [leadDone, setLeadDone] = useState(false);
  const [lead, setLead] = useState({ name: "", pub_name: "", whatsapp: "" });

  useEffect(() => {
    if (!open) return;
    setJustVoted(false);
    setShowShare(false);
    setLeadDone(false);
    setLead({ name: "", pub_name: "", whatsapp: "" });
    setLoading(true);
    let cancelled = false;
    (async () => {
      const { data, error } = await (supabase as any).rpc("get_city_status", { p_city: city });
      if (cancelled) return;
      if (error || !Array.isArray(data) || data.length === 0) {
        setStatus({ active_merchants: 0, vote_count: 0, target: 500, launched: false });
      } else {
        setStatus(data[0] as Status);
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [open, city]);

  const pct = useMemo(() => {
    if (!status) return 0;
    return Math.min(100, Math.round((status.vote_count / Math.max(1, status.target)) * 100));
  }, [status]);

  async function castVote() {
    if (voting) return;
    setVoting(true);
    try {
      const { data, error } = await (supabase as any).rpc("vote_for_city", {
        p_city: city,
        p_session_id: getSessionId(),
      });
      if (error) throw error;
      const row = Array.isArray(data) ? data[0] : data;
      if (row) {
        setStatus((s) => s ? { ...s, vote_count: row.vote_count, target: row.target, launched: row.launched } : s);
        if (row.already_voted) {
          toast.message("You've already voted for this city 🗳️", { description: "Share the link to multiply impact." });
        } else {
          toast.success(`Vote logged for ${city} 🗳️`);
        }
      }
      setJustVoted(true);
      setShowShare(true);
    } catch (err: any) {
      toast.error("Couldn't record your vote", { description: err?.message });
    } finally {
      setVoting(false);
    }
  }

  async function submitLead(e: React.FormEvent) {
    e.preventDefault();
    const parsed = leadSchema.safeParse(lead);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Check the form");
      return;
    }
    setLeadSubmitting(true);
    try {
      const { error } = await (supabase as any).from("advertiser_leads").insert({
        city,
        pub_name: parsed.data.pub_name,
        // Reuse the existing contact_info column; prefix with owner name for context.
        contact_info: `${parsed.data.name} · WhatsApp: ${parsed.data.whatsapp}`,
      });
      if (error) throw error;
      setLeadDone(true);
      toast.success("Founding-partner slot reserved 🍻", {
        description: "We'll WhatsApp you within 24 hours to lock the free 2-day window.",
      });
    } catch (err: any) {
      toast.error("Couldn't submit", { description: err?.message });
    } finally {
      setLeadSubmitting(false);
    }
  }

  const shareUrl = "https://drinkedin.me";
  const shareText = `Dude, check out DrinkedIn.me 🍻 - It's an anonymous sonar radar showing which pubs local tech workers are escaping to right now. Vote to unlock our city here!`;
  const waHref = `https://api.whatsapp.com/send?text=${encodeURIComponent(`${shareText} ${shareUrl}`)}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-amber-500/40 bg-gradient-to-b from-zinc-950 via-amber-950/30 to-zinc-950 p-0 overflow-hidden">
        {/* Arcade-style header */}
        <div className="relative px-6 pt-6 pb-4 border-b border-amber-500/30 bg-amber-500/5">
          <div className="flex items-center gap-2 text-amber-300">
            <Lock className="size-5" />
            <DialogTitle className="text-base font-black uppercase tracking-[0.18em] drop-shadow-[0_0_10px_rgba(251,191,36,0.7)]">
              ⚠️ This Tech Hub is Currently Locked! 🔒
            </DialogTitle>
          </div>
          <DialogDescription className="mt-2 text-[12px] text-amber-100/80">
            {city} hasn't reached deployment threshold yet. Cast a vote to unlock the local Sonar Radar.
          </DialogDescription>
        </div>

        <div className="px-6 py-5 space-y-5">
          {loading || !status ? (
            <ProgressSkeleton />
          ) : (
            <>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-mono tabular-nums">
                  <span className="font-bold text-amber-200 uppercase tracking-wider">{city}</span>
                  <span className="text-amber-100">
                    {status.vote_count.toLocaleString()} / {status.target.toLocaleString()} votes
                  </span>
                </div>
                <div className="relative h-4 rounded-full bg-zinc-900 border border-amber-400/30 overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400 transition-[width] duration-700 ease-out shadow-[0_0_18px_rgba(251,191,36,0.7)]"
                    style={{ width: `${pct}%` }}
                  />
                  <div className="absolute inset-0 grid place-items-center text-[10px] font-black text-zinc-900 mix-blend-overlay">
                    {pct}% to launch
                  </div>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {status.active_merchants} verified merchant{status.active_merchants === 1 ? "" : "s"} live · need 3 to auto-launch.
                </p>
              </div>

              {!showShare ? (
                <Button
                  type="button"
                  onClick={castVote}
                  disabled={voting}
                  className="w-full h-12 text-base font-black tracking-wide bg-gradient-to-r from-amber-400 to-orange-500 hover:from-amber-300 hover:to-orange-400 text-amber-950 shadow-[0_0_28px_rgba(251,191,36,0.6)] uppercase"
                >
                  <Vote className="size-5 mr-2" />
                  {voting ? "Casting…" : "Vote & Cast Your Ballot 🗳️"}
                </Button>
              ) : (
                <ShareCard waHref={waHref} justVoted={justVoted} />
              )}
            </>
          )}

          {/* B2B Pub-owner lead card */}
          <div className="rounded-xl border border-emerald-400/40 bg-gradient-to-br from-emerald-500/10 via-zinc-900 to-zinc-950 p-4 space-y-3 shadow-[0_0_22px_rgba(52,211,153,0.18)]">
            {leadDone ? (
              <div className="flex flex-col items-center text-center py-4 animate-fade-in">
                <PartyPopper className="size-8 text-emerald-300 animate-bounce" />
                <p className="mt-2 text-sm font-bold text-emerald-100">You're on the founding-partner list 🍻</p>
                <p className="text-[11px] text-emerald-200/80 mt-1">
                  Our launch desk will WhatsApp you within 24 hours to activate your free 2-day slot.
                </p>
              </div>
            ) : (
              <>
                <div className="flex items-start gap-2">
                  <Sparkles className="size-4 text-emerald-300 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-emerald-100">
                      Are you a bar owner in {city}? 🍻
                    </p>
                    <p className="text-[11px] text-emerald-200/80 leading-snug">
                      Be the founding partner on our radar grid. Claim 2 days of 100% free hyper-local foot-traffic advertising before our regional launch countdown finishes.
                    </p>
                  </div>
                </div>
                <form onSubmit={submitLead} className="grid gap-2">
                  <Input
                    placeholder="Your name"
                    value={lead.name}
                    onChange={(e) => setLead((p) => ({ ...p, name: e.target.value }))}
                    maxLength={80}
                    className="h-9 bg-zinc-950/60 border-emerald-400/30 text-emerald-50 placeholder:text-emerald-200/40"
                  />
                  <Input
                    placeholder="Bar / venue name"
                    value={lead.pub_name}
                    onChange={(e) => setLead((p) => ({ ...p, pub_name: e.target.value }))}
                    maxLength={120}
                    className="h-9 bg-zinc-950/60 border-emerald-400/30 text-emerald-50 placeholder:text-emerald-200/40"
                  />
                  <Input
                    placeholder="WhatsApp number (with country code)"
                    value={lead.whatsapp}
                    onChange={(e) => setLead((p) => ({ ...p, whatsapp: e.target.value }))}
                    maxLength={20}
                    inputMode="tel"
                    className="h-9 bg-zinc-950/60 border-emerald-400/30 text-emerald-50 placeholder:text-emerald-200/40"
                  />
                  <Button
                    type="submit"
                    disabled={leadSubmitting}
                    className="h-10 bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold"
                  >
                    {leadSubmitting ? "Submitting…" : "Claim My 2 Free Days 🚀"}
                  </Button>
                </form>
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ProgressSkeleton() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-12 w-full" />
    </div>
  );
}

function ShareCard({ waHref, justVoted }: { waHref: string; justVoted: boolean }) {
  return (
    <div className={`rounded-xl border border-emerald-400/50 bg-gradient-to-br from-emerald-500/15 via-zinc-900 to-zinc-950 p-4 ${justVoted ? "animate-scale-in" : ""}`}>
      <p className="text-sm font-bold text-emerald-100 leading-snug">
        🔥 Double your city's deployment speed!
      </p>
      <p className="text-[11px] text-emerald-200/80 mt-1 leading-snug">
        Share this link with your office Slack channels or WhatsApp groups to unlock the local happy hour radar faster.
      </p>
      <a
        href={waHref}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center justify-center gap-2 w-full h-11 rounded-md bg-[#25D366] hover:bg-[#1ebe57] text-white font-bold text-[13px] shadow-[0_0_18px_rgba(37,211,102,0.45)] transition"
      >
        <MessageCircle className="size-4" />
        Share on WhatsApp
      </a>
    </div>
  );
}
