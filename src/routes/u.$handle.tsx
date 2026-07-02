import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { QRCodeCanvas } from "qrcode.react";
import { ArrowLeft, Linkedin, Github, Twitter, Globe, Share2, Download, Copy, Flame } from "lucide-react";
import { toast } from "sonner";
import { getPublicProfile, type PublicProfile } from "@/lib/profiles.functions";
import { getProfileTopPosts, type TopPost } from "@/lib/topPosts.functions";
import { PublicTestimonials } from "@/components/PublicTestimonials";
import WatchButton from "@/components/WatchButton";
import { formatDistanceToNow } from "date-fns";

import { SITE_URL } from "@/config";

export const Route = createFileRoute("/u/$handle")({
  loader: async ({ params }) => {
    const [profile, topPosts] = await Promise.all([
      getPublicProfile({ data: { handle: params.handle } }),
      getProfileTopPosts({ data: { handle: params.handle } }).catch(() => [] as TopPost[]),
    ]);
    if (!profile) throw notFound();
    return { profile, topPosts };
  },
  head: ({ params, loaderData }) => {
    const p = loaderData?.profile as PublicProfile | undefined;
    const name = p?.display_name || `@${p?.handle ?? params.handle}`;
    const title = `${name} — DrinkedIn profile`;
    const description = p?.bio || `Connect with ${name} on DrinkedIn. Scan the QR to grab their links.`;
    const url = `${SITE_URL}/u/${params.handle}`;
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: url },
        { property: "og:type", content: "profile" },
        ...(p?.avatar_url ? [{ property: "og:image", content: p.avatar_url }] : []),
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  component: ProfileView,
  notFoundComponent: () => (
    <div className="min-h-screen grid place-items-center bg-black text-white px-4 text-center">
      <div>
        <h1 className="text-2xl font-bold">Profile not found</h1>
        <p className="mt-2 text-sm text-white/60">This handle isn't claimed yet.</p>
        <Link to="/" className="mt-6 inline-block rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-amber-950">
          Back to the breakroom
        </Link>
      </div>
    </div>
  ),
  errorComponent: () => (
    <div className="min-h-screen grid place-items-center bg-black text-white px-4 text-center">
      <div>
        <h1 className="text-xl font-bold">Couldn't load profile</h1>
        <Link to="/" className="mt-6 inline-block rounded-md bg-amber-500 px-4 py-2 text-sm font-bold text-amber-950">
          Back home
        </Link>
      </div>
    </div>
  ),
});

const SOCIALS: Array<{ key: keyof PublicProfile; label: string; Icon: typeof Linkedin; color: string }> = [
  { key: "linkedin_url", label: "LinkedIn", Icon: Linkedin, color: "bg-[#0a66c2]" },
  { key: "github_url", label: "GitHub", Icon: Github, color: "bg-zinc-800" },
  { key: "twitter_url", label: "X / Twitter", Icon: Twitter, color: "bg-black border border-white/20" },
  { key: "website_url", label: "Portfolio", Icon: Globe, color: "bg-emerald-600" },
];

function ProfileView() {
  const { profile, topPosts } = Route.useLoaderData();
  const params = Route.useParams();
  const profileUrl = `${SITE_URL}/u/${params.handle}`;
  const name = profile.display_name || `@${profile.handle}`;



  function share() {
    const text = `Check out ${name} on DrinkedIn → ${profileUrl}`;
    if (navigator.share) {
      navigator.share({ title: name, text, url: profileUrl }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      toast.success("Profile link copied");
    }
  }

  function downloadQR() {
    const canvas = document.querySelector<HTMLCanvasElement>("#dk-qr canvas");
    if (!canvas) return;
    const url = canvas.toDataURL("image/png");
    const a = document.createElement("a");
    a.href = url;
    a.download = `drinkedin-${profile.handle}.png`;
    a.click();
  }

  const availableSocials = SOCIALS.filter((s) => profile[s.key]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-zinc-950 text-white">
      <header className="border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-white/70 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back
          </Link>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                navigator.clipboard.writeText(profileUrl).then(
                  () => toast.success("Link copied"),
                  () => toast.error("Copy failed"),
                );
              }}
              className="inline-flex items-center gap-1.5 rounded-md border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-white/80 hover:bg-white/10"
              title="Copy profile link"
            >
              <Copy className="h-3.5 w-3.5" /> Copy
            </button>
            <button
              onClick={share}
              className="inline-flex items-center gap-2 rounded-md bg-amber-500 px-3 py-1.5 text-xs font-bold text-amber-950 hover:bg-amber-400"
            >
              <Share2 className="h-3.5 w-3.5" /> Share
            </button>
          </div>

        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/60 p-6 sm:p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center gap-5">
            <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-full bg-gradient-to-br from-amber-400 to-orange-600 grid place-items-center text-3xl font-black text-amber-950 overflow-hidden shrink-0">
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt={name} className="h-full w-full object-cover" />
              ) : (
                <span>{(profile.display_name || profile.handle).slice(0, 2).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">{name}</h1>
              <p className="text-sm text-amber-300/90">@{profile.handle}</p>
              {profile.pub_name && (
                <p className="mt-1 text-xs text-white/60">🍺 {profile.pub_name}</p>
              )}
              {profile.bio && <p className="mt-3 text-sm text-white/80 whitespace-pre-wrap">{profile.bio}</p>}
          </div>

          <WatchButton
            handle={profile.handle}
            postCount={topPosts.length > 0 ? topPosts.length : null}
            joinedAt={(profile as { created_at?: string | null }).created_at ?? null}
          />







          {availableSocials.length > 0 && (
            <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-2">
              {availableSocials.map(({ key, label, Icon, color }) => (
                <a
                  key={key as string}
                  href={profile[key] as string}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-semibold text-white hover:opacity-90 transition ${color}`}
                >
                  <Icon className="h-4 w-4" /> {label}
                </a>
              ))}
            </div>
          )}

          <div className="mt-8 grid sm:grid-cols-[auto,1fr] gap-6 items-center border-t border-white/10 pt-6">
            <div id="dk-qr" className="rounded-xl bg-white p-3 w-fit mx-auto sm:mx-0">
              <QRCodeCanvas
                value={profileUrl}
                size={168}
                level="M"
                includeMargin={false}
              />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider text-amber-400/80 font-bold">Scan to connect</p>
              <p className="mt-1 text-sm text-white/70">
                Point any phone camera at this QR. It opens this profile with every link {name} has shared.
              </p>
              <button
                onClick={downloadQR}
                className="mt-3 inline-flex items-center gap-2 rounded-md border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-semibold text-white/90 hover:bg-white/10"
              >
                <Download className="h-3.5 w-3.5" /> Download QR
              </button>
            </div>
          </div>
        </div>

        {topPosts && topPosts.length > 0 && (
          <section className="mt-6 rounded-2xl border border-white/10 bg-zinc-900/40 p-5 sm:p-6">
            <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-amber-400">
              <Flame className="h-3.5 w-3.5" /> Receipts · Top confessions
            </h2>
            <ul className="mt-3 space-y-3">
              {topPosts.map((p: TopPost) => (
                <li key={p.id} className="rounded-lg border border-white/5 bg-black/40 p-3">
                  <p className="text-sm text-white/90 whitespace-pre-wrap break-words">
                    {p.body_text.length > 240 ? p.body_text.slice(0, 240) + "…" : p.body_text}
                  </p>
                  <div className="mt-2 flex items-center gap-3 text-[10.5px] text-white/50 font-mono uppercase tracking-wider">
                    <span>🍻 {p.cheers_count}</span>
                    <span>💬 {p.comment_count}</span>
                    <span className="ml-auto">{formatDistanceToNow(new Date(p.created_at), { addSuffix: true })}</span>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        )}

        <PublicTestimonials handle={profile.handle} ownerName={name} />

        <div className="mt-6 text-center text-xs text-white/50">
          Want your own? <Link to="/profile" className="text-amber-400 hover:underline">Claim your @handle</Link>
        </div>
      </main>
    </div>
  );
}
