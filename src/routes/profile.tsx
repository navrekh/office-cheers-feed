import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import {
  ArrowLeft,
  Save,
  ExternalLink,
  Loader2,
  Linkedin,
  Github,
  Twitter,
  Globe,
  Download,
  Shield,
  Beer,
  CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import AuthModal from "@/components/AuthModal";
import { SITE_URL } from "@/config";

export const Route = createFileRoute("/profile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "My Badge — DrinkedIn" },
      { name: "description", content: "Your private Corporate Spy ID Badge. Manage your real-world networking links and QR." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: ProfileEditor,
});

type ProfileRow = {
  id: string;
  handle: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  github_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
};

const EMPTY: Omit<ProfileRow, "id"> = {
  handle: "",
  display_name: "",
  bio: "",
  avatar_url: "",
  linkedin_url: "",
  github_url: "",
  twitter_url: "",
  website_url: "",
};

const HANDLE_RE = /^[a-zA-Z0-9_]{3,24}$/;

function sanitizeUrl(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  if (!/^https?:\/\//i.test(s)) return `https://${s}`;
  return s;
}

function ProfileEditor() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<typeof EMPTY>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [metrics, setMetrics] = useState<{ validations: number; pints: number; posts: number }>({
    validations: 0,
    pints: 0,
    posts: 0,
  });

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setAuthOpen(true);
      setLoading(false);
      return;
    }
    (async () => {
      const [{ data, error }, postsRes] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("id, handle, display_name, bio, avatar_url, linkedin_url, github_url, twitter_url, website_url")
          .eq("id", user.id)
          .maybeSingle(),
        (supabase as any)
          .from("posts")
          .select("valid_votes, cheers_count")
          .eq("user_id", user.id),
      ]);
      if (error) {
        console.error(error);
        toast.error("Couldn't load your badge");
      } else if (data) {
        setForm({
          handle: data.handle ?? "",
          display_name: data.display_name ?? "",
          bio: data.bio ?? "",
          avatar_url: data.avatar_url ?? "",
          linkedin_url: data.linkedin_url ?? "",
          github_url: data.github_url ?? "",
          twitter_url: data.twitter_url ?? "",
          website_url: data.website_url ?? "",
        });
      }
      const rows: any[] = postsRes?.data ?? [];
      setMetrics({
        validations: rows.reduce((s, r) => s + (r.valid_votes || 0), 0),
        pints: rows.reduce((s, r) => s + (r.cheers_count || 0), 0),
        posts: rows.length,
      });
      setLoading(false);
    })();
  }, [user, authLoading]);

  function setField<K extends keyof typeof EMPTY>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return setAuthOpen(true);
    const handle = (form.handle || "").trim();
    if (!HANDLE_RE.test(handle)) {
      toast.error("Handle must be 3–24 letters, numbers, or underscores");
      return;
    }
    setSaving(true);
    const payload = {
      id: user.id,
      handle,
      display_name: form.display_name?.trim() || null,
      bio: form.bio?.trim()?.slice(0, 280) || null,
      avatar_url: sanitizeUrl(form.avatar_url || ""),
      linkedin_url: sanitizeUrl(form.linkedin_url || ""),
      github_url: sanitizeUrl(form.github_url || ""),
      twitter_url: sanitizeUrl(form.twitter_url || ""),
      website_url: sanitizeUrl(form.website_url || ""),
    };
    const { error } = await (supabase as any)
      .from("profiles")
      .upsert(payload, { onConflict: "id" });
    setSaving(false);
    if (error) {
      if (String(error.message || "").toLowerCase().includes("duplicate") || error.code === "23505") {
        toast.error("That handle is taken — try another");
      } else {
        toast.error(error.message || "Couldn't save");
      }
      return;
    }
    toast.success("Badge updated");
  }

  const handleValid = !!form.handle && HANDLE_RE.test(form.handle);
  const previewUrl = handleValid ? `${SITE_URL}/u/${form.handle}` : null;

  const badgeId = useMemo(() => {
    if (!user) return "—————";
    return user.id.replace(/-/g, "").slice(0, 10).toUpperCase();
  }, [user]);

  function downloadQR() {
    const canvas = document.querySelector<HTMLCanvasElement>("#badge-qr canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `drinkedin-badge-${form.handle || "spy"}.png`;
    a.click();
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-mono">
      {/* CRT scanlines */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.6) 0px, rgba(255,255,255,0.6) 1px, transparent 1px, transparent 3px)",
        }}
      />
      <header className="relative z-10 border-b border-amber-500/20 bg-black/70 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-amber-400/80 hover:text-amber-300">
            <ArrowLeft className="h-3.5 w-3.5" /> Return to breakroom
          </Link>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-widest text-amber-400 hover:underline"
            >
              Public card <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-3xl px-4 py-8">
        <div className="mb-6 flex items-center gap-2 text-[10px] uppercase tracking-[0.2em] text-amber-400/70">
          <Shield className="h-3 w-3" />
          Classified · Private to you · Never linked from anonymous posts
        </div>

        {loading ? (
          <div className="mt-10 grid place-items-center text-amber-400/70">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !user ? (
          <div className="mt-8 rounded-lg border border-amber-500/30 bg-zinc-900/60 p-6 text-center">
            <p className="text-sm text-zinc-300">Sign in to claim your badge.</p>
            <button
              onClick={() => setAuthOpen(true)}
              className="mt-4 rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-amber-950 hover:bg-amber-400"
            >
              Sign in
            </button>
          </div>
        ) : (
          <>
            {/* THE BADGE */}
            <section className="relative overflow-hidden rounded-2xl border-2 border-amber-500/40 bg-gradient-to-br from-zinc-900 via-zinc-950 to-black shadow-[0_0_60px_-15px_rgba(245,158,11,0.35)]">
              {/* lanyard clip */}
              <div className="absolute left-1/2 top-0 h-3 w-16 -translate-x-1/2 rounded-b-md border border-t-0 border-amber-500/40 bg-zinc-800" />

              <div className="grid gap-6 p-6 pt-8 sm:grid-cols-[1fr,auto] sm:p-8">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-amber-400">
                    <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
                    DrinkedIn · Corporate Spy ID · Lvl Ω
                  </div>
                  <div className="mt-4 flex items-center gap-4">
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-md border border-amber-500/40 bg-zinc-800 text-xl font-black text-amber-300">
                      {form.avatar_url ? (
                        <img src={form.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        <span>{(form.display_name || form.handle || "??").slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-xl font-extrabold tracking-tight text-amber-200">
                        {form.display_name || (form.handle ? `@${form.handle}` : "Unnamed Operative")}
                      </div>
                      <div className="truncate text-[11px] uppercase tracking-widest text-amber-400/80">
                        @{form.handle || "claim-handle"}
                      </div>
                    </div>
                  </div>

                  <dl className="mt-5 grid grid-cols-3 gap-2">
                    <Stat icon={<CheckCircle2 className="h-3 w-3" />} label="Validations" value={metrics.validations} />
                    <Stat icon={<Beer className="h-3 w-3" />} label="Pints" value={metrics.pints} />
                    <Stat label="Drops" value={metrics.posts} />
                  </dl>

                  <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-amber-500/15 pt-4 text-[11px]">
                    <KV k="Badge #" v={badgeId} />
                    <KV k="Clearance" v="Anonymous" />
                    <KV k="Status" v={handleValid ? "ACTIVE" : "DRAFT"} ok={handleValid} />
                    <KV k="Issued" v={new Date().getFullYear().toString()} />
                  </div>
                </div>

                <div className="flex flex-col items-center justify-between gap-3">
                  <div id="badge-qr" className="rounded-lg bg-white p-2.5">
                    <QRCodeCanvas
                      value={previewUrl || `${SITE_URL}`}
                      size={148}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <button
                    onClick={downloadQR}
                    disabled={!handleValid}
                    className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-widest text-amber-300 hover:bg-amber-500/20 disabled:opacity-40"
                  >
                    <Download className="h-3 w-3" /> PNG
                  </button>
                </div>
              </div>

              <div className="border-t border-amber-500/15 bg-black/40 px-6 py-2 text-[9px] uppercase tracking-[0.3em] text-amber-400/50 sm:px-8">
                ▮▮▮ Property of nobody · If found, scan to return ▮▮▮
              </div>
            </section>

            {/* INTERCEPTION LOG */}
            <InterceptionLog seed={user.id} handle={form.handle || ""} />

            {/* EDITOR */}
            <form onSubmit={save} className="mt-8 space-y-5 rounded-xl border border-amber-500/15 bg-zinc-900/40 p-5 sm:p-6">
              <h2 className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-400">
                ▸ Dossier — editable
              </h2>

              <Field label="Handle" hint="Public URL slug. 3–24 letters / numbers / underscores.">
                <div className="flex items-center rounded-md border border-amber-500/20 bg-black/60 focus-within:border-amber-400">
                  <span className="pl-3 text-xs text-amber-400/60">drinkedin.me/u/</span>
                  <input
                    value={form.handle ?? ""}
                    onChange={(e) => setField("handle", e.target.value.replace(/\s/g, ""))}
                    placeholder="agent_42"
                    maxLength={24}
                    className="flex-1 bg-transparent px-1 py-2 text-sm outline-none"
                  />
                </div>
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Display name">
                  <Text value={form.display_name ?? ""} onChange={(v) => setField("display_name", v)} placeholder="What you go by IRL" max={60} />
                </Field>
                <Field label="Avatar URL">
                  <Text value={form.avatar_url ?? ""} onChange={(v) => setField("avatar_url", v)} placeholder="https://..." />
                </Field>
              </div>

              <Field label="Bio" hint="280 char max. Shown only on your public networking card.">
                <textarea
                  value={form.bio ?? ""}
                  onChange={(e) => setField("bio", e.target.value)}
                  placeholder="Senior burnout engineer. EOD beers > standups."
                  maxLength={280}
                  rows={3}
                  className="w-full rounded-md border border-amber-500/20 bg-black/60 px-3 py-2 text-sm outline-none focus:border-amber-400"
                />
              </Field>

              <div>
                <h3 className="text-[11px] font-bold uppercase tracking-[0.25em] text-amber-400">▸ Networking vault</h3>
                <p className="mt-1 text-[11px] text-zinc-400">
                  These — and ONLY these — appear when someone scans your badge. Your anonymous confessions stay sealed.
                </p>
                <div className="mt-3 grid gap-4 sm:grid-cols-2">
                  <Field label={<span className="inline-flex items-center gap-1.5"><Linkedin className="h-3 w-3" /> LinkedIn</span>}>
                    <Text value={form.linkedin_url ?? ""} onChange={(v) => setField("linkedin_url", v)} placeholder="linkedin.com/in/you" />
                  </Field>
                  <Field label={<span className="inline-flex items-center gap-1.5"><Github className="h-3 w-3" /> GitHub</span>}>
                    <Text value={form.github_url ?? ""} onChange={(v) => setField("github_url", v)} placeholder="github.com/you" />
                  </Field>
                  <Field label={<span className="inline-flex items-center gap-1.5"><Twitter className="h-3 w-3" /> X / Twitter</span>}>
                    <Text value={form.twitter_url ?? ""} onChange={(v) => setField("twitter_url", v)} placeholder="x.com/you" />
                  </Field>
                  <Field label={<span className="inline-flex items-center gap-1.5"><Globe className="h-3 w-3" /> Portfolio</span>}>
                    <Text value={form.website_url ?? ""} onChange={(v) => setField("website_url", v)} placeholder="you.com" />
                  </Field>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-amber-950 hover:bg-amber-400 disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Commit to badge
                </button>
                {previewUrl && (
                  <button
                    type="button"
                    onClick={() => navigate({ to: "/u/$handle", params: { handle: form.handle! } })}
                    className="text-[11px] uppercase tracking-widest text-amber-400/80 hover:text-amber-300"
                  >
                    Open public card →
                  </button>
                )}
              </div>
            </form>
          </>
        )}
      </main>

      <AuthModal
        open={authOpen}
        onOpenChange={(o) => {
          setAuthOpen(o);
          if (!o && !user) navigate({ to: "/" });
        }}
        compact
      />
    </div>
  );
}

function Field({ label, hint, children }: { label: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[11px] font-bold uppercase tracking-widest text-amber-400/80">{label}</span>
      <div className="mt-1">{children}</div>
      {hint && <span className="mt-1 block text-[10px] text-zinc-500">{hint}</span>}
    </label>
  );
}

function Text({ value, onChange, placeholder, max }: { value: string; onChange: (v: string) => void; placeholder?: string; max?: number }) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={max}
      className="w-full rounded-md border border-amber-500/20 bg-black/60 px-3 py-2 text-sm outline-none focus:border-amber-400"
    />
  );
}

function Stat({ icon, label, value }: { icon?: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-md border border-amber-500/20 bg-black/40 px-2 py-1.5">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest text-amber-400/70">
        {icon}
        {label}
      </div>
      <div className="mt-0.5 text-base font-extrabold tabular-nums text-amber-200">{value.toLocaleString()}</div>
    </div>
  );
}

function KV({ k, v, ok }: { k: string; v: string; ok?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2 truncate">
      <span className="text-[10px] uppercase tracking-widest text-amber-400/50">{k}</span>
      <span className={`truncate font-mono tabular-nums ${ok ? "text-emerald-400" : "text-amber-200"}`}>{v}</span>
    </div>
  );
}
