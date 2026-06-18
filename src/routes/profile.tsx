import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Save, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/useAuth";
import AuthModal from "@/components/AuthModal";
import { SITE_URL } from "@/config";

export const Route = createFileRoute("/profile")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Edit your profile — DrinkedIn" },
      { name: "description", content: "Claim your DrinkedIn handle, drop your socials, and share a single QR." },
      { name: "robots", content: "noindex" },
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
  instagram_url: string | null;
  facebook_url: string | null;
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
  instagram_url: "",
  facebook_url: "",
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

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setAuthOpen(true);
      setLoading(false);
      return;
    }
    (async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, handle, display_name, bio, avatar_url, linkedin_url, instagram_url, facebook_url, github_url, twitter_url, website_url")
        .eq("id", user.id)
        .maybeSingle();
      if (error) {
        console.error(error);
        toast.error("Couldn't load your profile");
      } else if (data) {
        setForm({
          handle: data.handle ?? "",
          display_name: data.display_name ?? "",
          bio: data.bio ?? "",
          avatar_url: data.avatar_url ?? "",
          linkedin_url: data.linkedin_url ?? "",
          instagram_url: data.instagram_url ?? "",
          facebook_url: data.facebook_url ?? "",
          github_url: data.github_url ?? "",
          twitter_url: data.twitter_url ?? "",
          website_url: data.website_url ?? "",
        });
      }
      setLoading(false);
    })();
  }, [user, authLoading]);

  function setField<K extends keyof typeof EMPTY>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!user) {
      setAuthOpen(true);
      return;
    }
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
      instagram_url: sanitizeUrl(form.instagram_url || ""),
      facebook_url: sanitizeUrl(form.facebook_url || ""),
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
    toast.success("Profile saved");
  }

  const previewUrl = form.handle && HANDLE_RE.test(form.handle) ? `${SITE_URL}/u/${form.handle}` : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-zinc-950 text-white">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between px-4 py-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          {previewUrl && (
            <a
              href={previewUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-amber-400 hover:underline"
            >
              View public page <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-extrabold tracking-tight">Your profile</h1>
        <p className="mt-1 text-sm text-white/60">
          Drop your links. We'll generate a public page + scannable QR at <span className="text-amber-300">drinkedin.me/u/your-handle</span>.
        </p>

        {loading ? (
          <div className="mt-10 grid place-items-center text-white/50">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : !user ? (
          <div className="mt-8 rounded-lg border border-white/10 bg-zinc-900/60 p-6 text-center">
            <p className="text-sm text-white/70">Sign in to claim your profile.</p>
            <button
              onClick={() => setAuthOpen(true)}
              className="mt-4 rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-amber-950 hover:bg-amber-400"
            >
              Sign in
            </button>
          </div>
        ) : (
          <form onSubmit={save} className="mt-6 space-y-5">
            <Field label="Handle" hint="3–24 letters, numbers, underscores. This is your public URL.">
              <div className="flex items-center rounded-md border border-white/15 bg-zinc-900 focus-within:border-amber-400">
                <span className="pl-3 text-sm text-white/50">drinkedin.me/u/</span>
                <input
                  value={form.handle ?? ""}
                  onChange={(e) => setField("handle", e.target.value.replace(/\s/g, ""))}
                  placeholder="your_handle"
                  maxLength={24}
                  className="flex-1 bg-transparent px-1 py-2 text-sm outline-none"
                />
              </div>
            </Field>

            <Field label="Display name">
              <Text value={form.display_name ?? ""} onChange={(v) => setField("display_name", v)} placeholder="What you go by" max={60} />
            </Field>

            <Field label="Bio" hint="280 characters max">
              <textarea
                value={form.bio ?? ""}
                onChange={(e) => setField("bio", e.target.value)}
                placeholder="Senior burnout engineer. Lover of EOD beers."
                maxLength={280}
                rows={3}
                className="w-full rounded-md border border-white/15 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-amber-400"
              />
            </Field>

            <Field label="Avatar URL">
              <Text value={form.avatar_url ?? ""} onChange={(v) => setField("avatar_url", v)} placeholder="https://..." />
            </Field>

            <div className="pt-2">
              <h2 className="text-xs font-bold uppercase tracking-wider text-amber-400/80">Socials</h2>
              <div className="mt-3 grid sm:grid-cols-2 gap-4">
                <Field label="LinkedIn"><Text value={form.linkedin_url ?? ""} onChange={(v) => setField("linkedin_url", v)} placeholder="linkedin.com/in/you" /></Field>
                <Field label="Instagram"><Text value={form.instagram_url ?? ""} onChange={(v) => setField("instagram_url", v)} placeholder="instagram.com/you" /></Field>
                <Field label="X / Twitter"><Text value={form.twitter_url ?? ""} onChange={(v) => setField("twitter_url", v)} placeholder="x.com/you" /></Field>
                <Field label="GitHub"><Text value={form.github_url ?? ""} onChange={(v) => setField("github_url", v)} placeholder="github.com/you" /></Field>
                <Field label="Facebook"><Text value={form.facebook_url ?? ""} onChange={(v) => setField("facebook_url", v)} placeholder="facebook.com/you" /></Field>
                <Field label="Website"><Text value={form.website_url ?? ""} onChange={(v) => setField("website_url", v)} placeholder="you.com" /></Field>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="submit"
                disabled={saving}
                className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-amber-950 hover:bg-amber-400 disabled:opacity-50"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                Save profile
              </button>
              {previewUrl && (
                <button
                  type="button"
                  onClick={() => navigate({ to: "/u/$handle", params: { handle: form.handle! } })}
                  className="text-xs text-white/70 hover:text-white"
                >
                  Open public page →
                </button>
              )}
            </div>
          </form>
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

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-white/80">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-white/40">{hint}</span>}
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
      className="mt-1 w-full rounded-md border border-white/15 bg-zinc-900 px-3 py-2 text-sm outline-none focus:border-amber-400"
    />
  );
}
