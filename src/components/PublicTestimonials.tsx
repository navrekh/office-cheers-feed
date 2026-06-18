import { useEffect, useState, useCallback } from "react";
import { Loader2, MessageSquareQuote, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import AuthModal from "@/components/AuthModal";

type Approved = {
  id: string;
  body: string;
  pinned: boolean;
  created_at: string;
};

const PRESETS = [
  "Deploys directly to production on a Friday afternoon.",
  "Master of tactical meeting evasion techniques.",
  "Codebase quality requires a team of exorcists to debug.",
  "Replies to Slack faster than light. Replies to PRs in geological time.",
  "Single-handedly keeps the coffee machine OKR green.",
];

export function PublicTestimonials({ handle, ownerName }: { handle: string; ownerName: string }) {
  const { user } = useAuth();
  const [list, setList] = useState<Approved[]>([]);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await (supabase as any).rpc("get_profile_testimonials", { p_handle: handle });
    setLoading(false);
    if (error) {
      console.error(error);
      return;
    }
    setList((data ?? []) as Approved[]);
  }, [handle]);

  useEffect(() => {
    load();
  }, [load]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setAuthOpen(true);
      return;
    }
    const text = body.trim();
    if (text.length < 4) {
      toast.error("Say a bit more");
      return;
    }
    if (text.length > 280) {
      toast.error("280 characters max");
      return;
    }
    setSending(true);
    const { error } = await (supabase as any).rpc("submit_testimonial", { p_handle: handle, p_body: text });
    setSending(false);
    if (error) {
      toast.error(error.message || "Couldn't submit");
      return;
    }
    setBody("");
    toast.success(`Submitted — ${ownerName.split(" ")[0] || "they"}'ll approve before it goes live`);
  }

  return (
    <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/60 p-6 sm:p-8 shadow-2xl">
      <div className="flex items-center justify-between gap-3">
        <h2 className="inline-flex items-center gap-2 text-sm font-bold uppercase tracking-wider text-amber-300">
          <MessageSquareQuote className="h-4 w-4" />
          Anonymous Peer Reviews
        </h2>
        <span className="text-[10px] uppercase tracking-widest text-white/40">
          {list.length} live
        </span>
      </div>
      <p className="mt-1 text-xs text-white/50">
        Performance testimonials. Owner-moderated. Submissions stay pending until {ownerName.split(" ")[0] || "they"} approve.
      </p>

      {/* Submission */}
      <form onSubmit={submit} className="mt-5 rounded-xl border border-amber-500/15 bg-black/40 p-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-widest text-amber-400/80">
            <Sparkles className="h-3 w-3" /> Quick drop
          </span>
          {PRESETS.map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setBody(p)}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-white/70 hover:border-amber-500/40 hover:text-amber-300"
              title={p}
            >
              {p.length > 36 ? p.slice(0, 34) + "…" : p}
            </button>
          ))}
        </div>
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          maxLength={280}
          placeholder={`Drop a short, anonymous review for ${ownerName.split(" ")[0] || "this operative"}…`}
          className="mt-3 w-full rounded-md border border-white/10 bg-zinc-950 px-3 py-2 text-sm text-white outline-none focus:border-amber-400"
        />
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-white/40">{body.length}/280 · Your identity is never shown publicly</span>
          <button
            type="submit"
            disabled={sending}
            className="inline-flex items-center gap-1.5 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-400 disabled:opacity-50"
          >
            {sending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
            {user ? "Submit review" : "Sign in to submit"}
          </button>
        </div>
      </form>

      {/* List */}
      <div className="mt-5">
        {loading ? (
          <div className="grid place-items-center py-6 text-white/40">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : list.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/40">
            No reviews live yet. Be the first to drop one.
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {list.map((t) => (
              <li
                key={t.id}
                className={`rounded-lg border p-3 text-sm leading-relaxed ${
                  t.pinned ? "border-amber-500/40 bg-amber-500/[0.05]" : "border-white/10 bg-black/30"
                }`}
              >
                {t.pinned && (
                  <div className="mb-1 text-[9px] font-bold uppercase tracking-widest text-amber-300">★ Pinned</div>
                )}
                <p className="text-white/85">“{t.body}”</p>
                <div className="mt-2 text-[10px] uppercase tracking-widest text-white/30">
                  Anonymous · {new Date(t.created_at).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <AuthModal open={authOpen} onOpenChange={setAuthOpen} compact />
    </section>
  );
}
