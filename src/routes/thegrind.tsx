import { createFileRoute, Link } from "@tanstack/react-router";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
} from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  ArrowUpDown,
  Ghost,
  Radio,
  Send,
  ShieldCheck,
  Skull,
  Upload,
  X,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { GRIND_SEED_POSTS, type SeedPost } from "@/lib/grindSeed";

// Build 50 sample posts with staggered timestamps (2-180 minutes old) so
// they look like a lively feed on first paint. Sample rows never touch the DB.
function buildSeedPosts(): GrindPost[] {
  const now = Date.now();
  return GRIND_SEED_POSTS.map((s: SeedPost, i: number) => ({
    id: s.id,
    body: s.body,
    tags: s.tags,
    ts: new Date(now - (2 + i * 3.5) * 60_000).toISOString(),
    sample: true,
  }));
}

export const Route = createFileRoute("/thegrind")({
  head: () => ({
    meta: [
      { title: "#TheGrind — DrinkedIn" },
      {
        name: "description",
        content:
          "The unfiltered job-hunt dashboard. Post redacted evidence, track ghosts, shame ATS villains, and unlock direct referrals — all anonymously.",
      },
    ],
    links: [
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@500;700&display=swap",
      },
    ],
  }),
  component: TheGrindPage,
});

// ============================================================
// TOKENS — Modern Grind Dashboard
// ============================================================
const sans = "font-[Inter,ui-sans-serif,system-ui]";
const mono = "font-[JetBrains_Mono,ui-monospace,monospace]";

// ============================================================
// TYPES
// ============================================================
type GrindPost = {
  id: string;
  body: string;
  tags: string[];
  image?: string;
  ts: string;
  sample?: boolean;
};

type ShameRow = {
  name: string;
  ats: number;
  ghost: number;
  velocity: number;
};

type BypassCandidate = {
  id: string;
  profile: string;
  ts: string;
  referred: boolean;
};

type SortKey = keyof Omit<ShameRow, "name"> | "name";

const PRESET_TAGS = [
  "Instant Rejection",
  "Ghosted 30 Days",
  "7-Round Interview",
  "AI Assessment Choke",
];

const SEED_CANDIDATES: BypassCandidate[] = [
  {
    id: "c1",
    profile:
      "Backend / Go+Rust · gRPC · 8y distributed systems · k8s operator author · 40M QPS load handled",
    ts: "2026-01-01T00:00:00.000Z",
    referred: false,
  },
  {
    id: "c2",
    profile:
      "ML/Infra · PyTorch · CUDA kernel opt · trained 7B param model · MLOps @ hyperscaler",
    ts: "2026-01-01T00:00:00.000Z",
    referred: false,
  },
];

// Renders a locale-formatted time only after mount to avoid SSR/CSR hydration mismatch.
function ClientTime({ iso, mode = "datetime" }: { iso: string; mode?: "datetime" | "time" }) {
  const [text, setText] = useState("");
  useEffect(() => {
    const d = new Date(iso);
    setText(mode === "time" ? d.toLocaleTimeString() : d.toLocaleString());
  }, [iso, mode]);
  return <span suppressHydrationWarning>{text}</span>;
}

// ============================================================
// HELPERS
// ============================================================
async function scrubImage(file: File): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const im = new Image();
    im.onload = () => resolve(im);
    im.onerror = reject;
    im.src = dataUrl;
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  ctx.fillStyle = "#000";
  const w = canvas.width;
  const h = canvas.height;
  const rows = [0.08, 0.22, 0.36, 0.61, 0.78];
  rows.forEach((y, i) => {
    const rectW = w * (0.32 + ((i * 37) % 20) / 100);
    const rectH = Math.max(14, h * 0.035);
    const x = w * (0.05 + ((i * 13) % 15) / 100);
    ctx.fillRect(x, y * h, rectW, rectH);
  });

  ctx.fillStyle = "rgba(245,158,11,0.9)";
  ctx.font = `${Math.max(10, h * 0.02)}px system-ui,sans-serif`;
  ctx.fillText("SCRUBBED · drinkedin.me/thegrind", 12, h - 12);
  return canvas.toDataURL("image/png");
}

// ============================================================
// SMALL UI PRIMITIVES
// ============================================================
function SectionCard({
  eyebrow,
  title,
  right,
  children,
  className,
}: {
  eyebrow?: string;
  title?: string;
  right?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden",
        className,
      )}
    >
      {(eyebrow || title || right) && (
        <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between gap-3">
          <div className="min-w-0">
            {eyebrow && (
              <div
                className={cn(
                  "text-[10px] font-extrabold uppercase tracking-[0.2em] text-amber-500",
                  sans,
                )}
              >
                {eyebrow}
              </div>
            )}
            {title && (
              <h2 className={cn("text-sm font-bold text-zinc-100 mt-0.5 truncate", sans)}>
                {title}
              </h2>
            )}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

function LivePill() {
  return (
    <div className="flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75"></span>
        <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
      </span>
      <span
        className={cn(
          "text-[10px] font-semibold uppercase tracking-widest text-zinc-500",
          mono,
        )}
      >
        Live
      </span>
    </div>
  );
}

// ============================================================
// FEED + SCRUBBER
// ============================================================
function FeedComposer({ onPosted }: { onPosted?: () => void }) {
  const [body, setBody] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [scrubbed, setScrubbed] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Only images can be scrubbed");
      return;
    }
    setBusy(true);
    try {
      const url = await scrubImage(file);
      setScrubbed(url);
      toast.success("PII redacted on your device. Nothing was uploaded.");
    } catch {
      toast.error("Scrub failed");
    } finally {
      setBusy(false);
    }
  }, []);

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  const submit = async () => {
    if (!body.trim() && !scrubbed) {
      toast.error("Add a note or a screenshot before posting");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("grind_posts").insert({
      body: body.trim(),
      tags,
      image_url: scrubbed ?? null,
    });
    setBusy(false);
    if (error) {
      toast.error("Broadcast failed: " + error.message);
      return;
    }
    setBody("");
    setTags([]);
    setScrubbed(undefined);
    toast.success("Posted anonymously");
    onPosted?.();
  };

  return (
    <div className="space-y-4">
      <Textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder="What just happened? A ghost, a lowball, a 7-round loop..."
        className={cn(
          "min-h-[96px] resize-none bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600 focus-visible:ring-amber-500/40",
          sans,
        )}
      />

      <div className="flex flex-wrap gap-2">
        {PRESET_TAGS.map((t) => {
          const active = tags.includes(t);
          return (
            <button
              key={t}
              onClick={() =>
                setTags((prev) =>
                  prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
                )
              }
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-semibold transition-all border",
                sans,
                active
                  ? "bg-amber-500 text-zinc-950 border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.35)]"
                  : "bg-transparent text-zinc-400 border-zinc-800 hover:border-zinc-600 hover:text-zinc-200",
              )}
            >
              {t}
            </button>
          );
        })}
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        onClick={() => inputRef.current?.click()}
        className="border border-dashed border-zinc-800 hover:border-amber-500/60 bg-zinc-950/50 rounded-xl p-5 text-center cursor-pointer transition-colors"
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e: ChangeEvent<HTMLInputElement>) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
          }}
        />
        {scrubbed ? (
          <div className="relative">
            <img
              src={scrubbed}
              alt="Scrubbed screenshot"
              className="max-h-64 mx-auto rounded-lg"
            />
            <button
              onClick={(e) => {
                e.stopPropagation();
                setScrubbed(undefined);
              }}
              className="absolute top-2 right-2 p-1.5 rounded-full bg-zinc-950/90 text-zinc-300 border border-zinc-700 hover:text-amber-500"
              aria-label="Remove image"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="mt-2 text-[10px] uppercase tracking-widest text-emerald-500 font-bold">
              ✓ Names, emails, and phone numbers redacted on-device
            </div>
          </div>
        ) : (
          <div className={cn("text-sm text-zinc-500", sans)}>
            <Upload className="h-6 w-6 mx-auto mb-2 text-amber-500" />
            <div className="font-semibold text-zinc-300">
              {busy ? "Scrubbing…" : "Drop a screenshot to auto-redact"}
            </div>
            <div className="text-xs mt-1">
              Names, emails, and phone-number rows get blacked out before upload.
            </div>
          </div>
        )}
      </div>

      <Button
        onClick={submit}
        disabled={busy}
        className={cn(
          "w-full h-11 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold uppercase tracking-wider text-xs",
          sans,
        )}
      >
        <Send className="h-4 w-4 mr-2" /> Post anonymously
      </Button>
    </div>
  );
}

function FeedTimeline({ posts }: { posts: GrindPost[] }) {
  if (posts.length === 0) {
    return (
      <div className="text-center py-10 text-sm text-zinc-500">
        No reports yet. Be the first — the feed updates live.
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {posts.map((p) => (
        <article
          key={p.id}
          className="rounded-xl bg-zinc-950/60 border border-zinc-800 p-4 flex gap-3"
        >
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/30 to-zinc-800 shrink-0 grid place-items-center">
            <Ghost className="h-4 w-4 text-amber-500" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className={cn("text-xs font-semibold text-zinc-300 flex items-center gap-1.5", sans)}>
                anon_{p.id.slice(0, 6).replace(/^seed-?/, "s")}
                {p.sample && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700 font-bold uppercase tracking-wider">
                    Sample
                  </span>
                )}
              </span>
              <span className={cn("text-[10px] text-zinc-500", mono)}>
                <ClientTime iso={p.ts} />
              </span>
            </div>
            {p.body && (
              <p
                className={cn(
                  "text-sm text-zinc-200 mt-1 whitespace-pre-wrap leading-relaxed",
                  sans,
                )}
              >
                {p.body}
              </p>
            )}
            {p.image && (
              <img
                src={p.image}
                alt="Redacted evidence"
                className="rounded-lg max-h-64 mt-2 border border-zinc-800"
              />
            )}
            {p.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {p.tags.map((t) => (
                  <span
                    key={t}
                    className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-semibold"
                  >
                    #{t.replace(/\s+/g, "")}
                  </span>
                ))}
              </div>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}

// ============================================================
// GHOST TRACKER
// ============================================================
function Stepper({
  label,
  value,
  setValue,
  icon,
  tone,
}: {
  label: string;
  value: number;
  setValue: (n: number) => void;
  icon: React.ReactNode;
  tone: "amber" | "red" | "emerald";
}) {
  const toneMap = {
    amber: "text-amber-500",
    red: "text-red-500",
    emerald: "text-emerald-500",
  } as const;
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-3">
      <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2">
        <span className={toneMap[tone]}>{icon}</span>
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setValue(Math.max(0, value - 1))}
          className="w-7 h-7 rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition"
        >
          −
        </button>
        <div className={cn("flex-1 text-center text-2xl font-black", mono, toneMap[tone])}>
          {value}
        </div>
        <button
          onClick={() => setValue(value + 1)}
          className="w-7 h-7 rounded-lg border border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-100 transition"
        >
          +
        </button>
      </div>
    </div>
  );
}

function GhostTracker() {
  const [apps, setApps] = useState(47);
  const [ghosts, setGhosts] = useState(38);
  const [kills, setKills] = useState(6);
  const responses = Math.max(0, apps - ghosts - kills);
  const filteredPct = apps > 0 ? Math.round(((ghosts + kills) / apps) * 100) : 0;

  const rows = [
    { label: "Applied", n: apps, tone: "bg-zinc-700", text: "text-zinc-300" },
    { label: "Ghosted", n: ghosts, tone: "bg-amber-500", text: "text-amber-400" },
    { label: "Auto-rejected", n: kills, tone: "bg-red-500", text: "text-red-400" },
    { label: "Replied", n: responses, tone: "bg-emerald-500", text: "text-emerald-400" },
  ];

  return (
    <SectionCard
      eyebrow="Ghost Tracker"
      title="Your week in ATS attrition"
      right={
        <div className="text-right">
          <div className={cn("text-3xl font-black text-zinc-100", mono)}>{filteredPct}%</div>
          <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
            filtered
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stepper
          label="Apps"
          value={apps}
          setValue={setApps}
          icon={<Zap className="h-3 w-3" />}
          tone="emerald"
        />
        <Stepper
          label="Ghosts"
          value={ghosts}
          setValue={setGhosts}
          icon={<Ghost className="h-3 w-3" />}
          tone="amber"
        />
        <Stepper
          label="Rejects"
          value={kills}
          setValue={setKills}
          icon={<Skull className="h-3 w-3" />}
          tone="red"
        />
      </div>

      <div className="space-y-2.5">
        {rows.map((r) => {
          const pct = apps > 0 ? Math.round((r.n / apps) * 100) : 0;
          return (
            <div key={r.label} className="flex items-center gap-3">
              <div className="w-24 text-xs text-zinc-400 font-semibold">{r.label}</div>
              <div className="flex-1 h-2 rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className={cn("h-full transition-all duration-500", r.tone)}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <div className={cn("w-10 text-right text-xs font-bold", mono, r.text)}>
                {r.n}
              </div>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

// ============================================================
// SHAME INDEX
// ============================================================
function ShameIndex({ rows }: { rows: ShameRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("ats");
  const [asc, setAsc] = useState(false);
  const [selectedName, setSelectedName] = useState<string | null>(null);
  const [complaint, setComplaint] = useState([50]);
  const [busy, setBusy] = useState(false);

  const sorted = useMemo(() => {
    const copy = [...rows];
    copy.sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return asc ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return asc ? Number(av) - Number(bv) : Number(bv) - Number(av);
    });
    return copy;
  }, [rows, sortKey, asc]);

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setAsc(!asc);
    else {
      setSortKey(k);
      setAsc(false);
    }
  };

  const selected = rows.find((r) => r.name === selectedName) ?? rows[0];

  const submitComplaint = async () => {
    if (!selected) return;
    setBusy(true);
    const { error } = await supabase.rpc("file_shame_complaint", {
      p_company: selected.name,
      p_severity: complaint[0],
    });
    setBusy(false);
    if (error) {
      toast.error("Complaint dropped: " + error.message);
      return;
    }
    toast.success(`Complaint filed against ${selected.name}.`);
  };

  const HeatBadge = ({ ats }: { ats: number }) => {
    const tone =
      ats >= 90
        ? "bg-red-500/10 text-red-400 border-red-500/20"
        : ats >= 80
          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    return (
      <span
        className={cn(
          "text-[11px] font-bold py-1 px-2 rounded-md border",
          mono,
          tone,
        )}
      >
        {ats.toFixed(0)} SHM
      </span>
    );
  };

  return (
    <SectionCard
      eyebrow="The Shame Index"
      title="Anonymous corporate archetypes"
      right={
        <div className="hidden sm:flex items-center gap-1 text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
          <button
            onClick={() => toggleSort("ats")}
            className={cn(
              "px-2 py-1 rounded",
              sortKey === "ats" ? "text-amber-500" : "hover:text-zinc-300",
            )}
          >
            ATS <ArrowUpDown className="inline h-3 w-3 -mt-0.5" />
          </button>
          <button
            onClick={() => toggleSort("ghost")}
            className={cn(
              "px-2 py-1 rounded",
              sortKey === "ghost" ? "text-amber-500" : "hover:text-zinc-300",
            )}
          >
            Ghost <ArrowUpDown className="inline h-3 w-3 -mt-0.5" />
          </button>
          <button
            onClick={() => toggleSort("velocity")}
            className={cn(
              "px-2 py-1 rounded",
              sortKey === "velocity" ? "text-amber-500" : "hover:text-zinc-300",
            )}
          >
            Reject <ArrowUpDown className="inline h-3 w-3 -mt-0.5" />
          </button>
        </div>
      }
    >
      <div className="mb-4 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-[11px] leading-relaxed text-amber-200/80">
        ⚠️ Satire. Rows are fictional archetypes — not real firms. Metrics reflect
        anonymous community sentiment, not verified data.
      </div>

      <ul className="divide-y divide-zinc-800 -mx-5">
        {sorted.map((r, i) => {
          const isSel = selected?.name === r.name;
          return (
            <li key={r.name}>
              <button
                onClick={() => setSelectedName(r.name)}
                className={cn(
                  "w-full flex items-center justify-between gap-3 px-5 py-3 text-left transition-colors",
                  isSel ? "bg-amber-500/5" : "hover:bg-zinc-800/40",
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className={cn(
                      "text-[10px] font-bold w-6 shrink-0",
                      mono,
                      i < 3 ? "text-amber-500" : "text-zinc-600",
                    )}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <span
                    className={cn(
                      "text-sm font-bold truncate",
                      isSel ? "text-amber-400" : "text-zinc-100",
                    )}
                  >
                    {r.name}
                  </span>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <div className="hidden md:flex items-center gap-3 text-[11px]">
                    <span className={cn("text-zinc-500", mono)}>
                      {r.ghost}d ghost
                    </span>
                    <span className={cn("text-zinc-500", mono)}>
                      {r.velocity}m rej
                    </span>
                  </div>
                  <HeatBadge ats={r.ats} />
                </div>
              </button>
            </li>
          );
        })}
      </ul>

      {selected && (
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                File complaint against
              </div>
              <div className="text-sm font-bold text-amber-400">{selected.name}</div>
            </div>
            <div className={cn("text-2xl font-black text-zinc-100", mono)}>
              {complaint[0]}
            </div>
          </div>
          <Slider
            value={complaint}
            onValueChange={setComplaint}
            min={0}
            max={100}
            step={5}
            className="mb-4"
          />
          <Button
            size="sm"
            onClick={submitComplaint}
            disabled={busy}
            className={cn(
              "w-full h-10 bg-zinc-100 hover:bg-white text-zinc-950 font-bold uppercase tracking-wider text-xs",
              sans,
            )}
          >
            {busy ? "Submitting…" : "Submit report"}
          </Button>
          <p className="text-[10px] mt-2 text-zinc-500 leading-relaxed">
            Stanford HAI '24 estimates 78% of enterprise reqs are auto-culled
            pre-human. You are not the problem.
          </p>
        </div>
      )}
    </SectionCard>
  );
}

// ============================================================
// DIRECT BYPASS
// ============================================================
function DirectBypass({ candidates }: { candidates: BypassCandidate[] }) {
  const [profile, setProfile] = useState("");
  const [handshake, setHandshake] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const push = async () => {
    if (profile.trim().length < 20) {
      toast.error("Profile too thin — add stack, years, and shipped metrics.");
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from("bypass_referrals")
      .insert({ candidate_profile: profile.trim() });
    setBusy(false);
    if (error) {
      toast.error("Push failed: " + error.message);
      return;
    }
    setProfile("");
    toast.success("Profile added to the anonymous pool.");
  };

  const refer = async (id: string) => {
    const { error } = await supabase.rpc("mark_bypass_referred", { p_id: id });
    if (error) {
      toast.error("Handshake failed: " + error.message);
      return;
    }
    setHandshake(
      [
        `handshake_init → 0x${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`,
        `bridging candidate → verified.employee[hash:0x${Math.random().toString(16).slice(2, 10)}]`,
        `ATS_bypass = TRUE`,
        `secure encrypted bridge generated`,
        `bypassing external ATS`,
        `saved to /bypass_referrals`,
      ].join("\n"),
    );
    setTimeout(() => setHandshake(null), 6000);
  };

  return (
    <SectionCard
      eyebrow="Direct Bypass"
      title="Skip the resume shredder"
      right={
        <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
          {candidates.length} in pool
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Candidate side */}
        <div className="rounded-xl bg-zinc-950/50 border border-zinc-800 p-4">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-emerald-500 mb-3">
            <Radio className="h-3 w-3" />
            <span>Post an anonymous profile</span>
          </div>
          <Textarea
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            placeholder="core stack · years · shipped metrics — no names, no universities"
            className={cn(
              "min-h-[120px] resize-none mb-3 bg-zinc-950 border-zinc-800 text-zinc-100 placeholder:text-zinc-600",
              sans,
            )}
          />
          <Button
            onClick={push}
            disabled={busy}
            className={cn(
              "w-full h-10 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold uppercase tracking-wider text-xs",
              sans,
            )}
          >
            {busy ? "Pushing…" : "Open to bypass"}
          </Button>
        </div>

        {/* Employed side */}
        <div className="rounded-xl bg-zinc-950/50 border border-zinc-800 p-4 max-h-[420px] overflow-y-auto">
          <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-amber-500 mb-3">
            <ShieldCheck className="h-3 w-3" />
            <span>Verified employee — refer someone</span>
          </div>
          <div className="space-y-3">
            {candidates.length === 0 && (
              <div className="text-sm text-zinc-500 text-center py-6">
                No candidates yet. The pool updates live.
              </div>
            )}
            {candidates.map((c) => (
              <div
                key={c.id}
                className="rounded-lg border border-zinc-800 bg-zinc-900 p-3"
              >
                <div className="flex items-center justify-between text-[10px] text-zinc-500 mb-1.5">
                  <span className={mono}>anon#{c.id.slice(0, 6)}</span>
                  <span className={mono}>
                    <ClientTime iso={c.ts} mode="time" />
                  </span>
                </div>
                <p className={cn("text-sm text-zinc-200 mb-3 leading-relaxed", sans)}>
                  {c.profile}
                </p>
                <Button
                  size="sm"
                  disabled={c.referred}
                  onClick={() => refer(c.id)}
                  className={cn(
                    "w-full h-9 font-bold uppercase tracking-wider text-xs",
                    sans,
                    c.referred
                      ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                      : "bg-zinc-100 hover:bg-white text-zinc-950",
                  )}
                >
                  {c.referred ? "✓ Bridge sealed" : "Anonymously refer"}
                </Button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {handshake && (
        <pre
          className={cn(
            "mt-4 p-4 text-[11px] whitespace-pre-wrap rounded-xl bg-zinc-950 border border-emerald-500/40 text-emerald-400 leading-relaxed",
            mono,
          )}
        >
          {handshake}
        </pre>
      )}
    </SectionCard>
  );
}

// ============================================================
// STAT STRIP
// ============================================================
function StatStrip({ posts, shame }: { posts: number; shame: number }) {
  const items = [
    { label: "Reports today", value: posts.toLocaleString(), tone: "text-zinc-100" },
    { label: "Companies indexed", value: shame.toLocaleString(), tone: "text-amber-500" },
    { label: "Median reply latency", value: "19d", tone: "text-red-500" },
    { label: "Auto-culled reqs", value: "78%", tone: "text-emerald-500" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {items.map((s) => (
        <div
          key={s.label}
          className="rounded-2xl border border-zinc-800 bg-zinc-900 p-4"
        >
          <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
            {s.label}
          </div>
          <div className={cn("text-2xl font-black mt-1", mono, s.tone)}>{s.value}</div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// PAGE
// ============================================================
type ShameRowDb = {
  company: string;
  ats_score: number;
  ghost_days: number;
  rejection_velocity: number;
};
type PostRowDb = {
  id: string;
  body: string;
  tags: string[] | null;
  image_url: string | null;
  created_at: string;
};
type BypassRowDb = {
  id: string;
  candidate_profile: string;
  referred: boolean;
  created_at: string;
};

function TheGrindPage() {
  const [posts, setPosts] = useState<GrindPost[]>(() => buildSeedPosts());
  const [shame, setShame] = useState<ShameRow[]>([]);
  const [candidates, setCandidates] = useState<BypassCandidate[]>(SEED_CANDIDATES);

  const mapPost = (r: PostRowDb): GrindPost => ({
    id: r.id,
    body: r.body,
    tags: r.tags ?? [],
    image: r.image_url ?? undefined,
    ts: r.created_at,
  });
  const mapShame = (r: ShameRowDb): ShameRow => ({
    name: r.company,
    ats: r.ats_score,
    ghost: r.ghost_days,
    velocity: r.rejection_velocity,
  });
  const mapCand = (r: BypassRowDb): BypassCandidate => ({
    id: r.id,
    profile: r.candidate_profile,
    referred: r.referred,
    ts: r.created_at,
  });

  useEffect(() => {
    let alive = true;
    (async () => {
      const [p, s, b] = await Promise.all([
        supabase
          .from("grind_posts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50),
        supabase.from("shame_metrics").select("*").order("ats_score", { ascending: false }),
        supabase
          .from("bypass_referrals")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      if (!alive) return;
      if (p.data) {
        const real = p.data.map(mapPost);
        setPosts((prev) => [...real, ...prev.filter((x) => x.sample)]);
      }
      if (s.data) setShame(s.data.map(mapShame));
      if (b.data && b.data.length > 0) setCandidates(b.data.map(mapCand));
    })();

    const channel = supabase
      .channel("thegrind_live")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "grind_posts" },
        (payload) => {
          setPosts((prev) => [mapPost(payload.new as PostRowDb), ...prev]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "shame_metrics" },
        (payload) => {
          const row = mapShame(payload.new as ShameRowDb);
          setShame((prev) => prev.map((r) => (r.name === row.name ? row : r)));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "shame_metrics" },
        (payload) => {
          setShame((prev) => [...prev, mapShame(payload.new as ShameRowDb)]);
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "bypass_referrals" },
        (payload) => {
          setCandidates((prev) => [mapCand(payload.new as BypassRowDb), ...prev]);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "bypass_referrals" },
        (payload) => {
          const row = mapCand(payload.new as BypassRowDb);
          setCandidates((prev) => prev.map((c) => (c.id === row.id ? row : c)));
        },
      )
      .subscribe();

    // Refresh the feed feel: every ~22s pluck a sample post from the bottom
    // and re-stamp it near the top, so newcomers always see movement.
    const rotate = setInterval(() => {
      setPosts((prev) => {
        const samples = prev.filter((p) => p.sample);
        if (samples.length < 2) return prev;
        const pick = samples[Math.floor(Math.random() * samples.length)];
        const rest = prev.filter((p) => p.id !== pick.id);
        const real = rest.filter((p) => !p.sample);
        const otherSamples = rest.filter((p) => p.sample);
        const refreshed = { ...pick, ts: new Date().toISOString() };
        return [...real, refreshed, ...otherSamples];
      });
    }, 22_000);

    return () => {
      alive = false;
      clearInterval(rotate);
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <div className={cn("min-h-screen bg-zinc-950 text-zinc-100", sans)}>
      {/* Top bar */}
      <div className="border-b border-zinc-900 bg-zinc-950/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 lg:px-6 h-14 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <Link
              to="/"
              className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-100 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">DrinkedIn</span>
            </Link>
            <div className="h-4 w-px bg-zinc-800" />
            <div className="flex items-baseline gap-2 min-w-0">
              <span className="text-sm font-black tracking-tight text-amber-500">
                #TheGrind
              </span>
              <span className="hidden md:inline text-[11px] text-zinc-500 truncate">
                Anonymous job-hunt intelligence
              </span>
            </div>
          </div>
          <LivePill />
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 lg:px-6 py-6 lg:py-8 space-y-6">
        {/* Hero headline */}
        <header className="space-y-3">
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-zinc-100 leading-tight">
            Post what happened.{" "}
            <span className="text-amber-500">Redact everything else.</span>
          </h1>
          <p className="text-sm md:text-base text-zinc-400 max-w-2xl leading-relaxed">
            A dashboard for the algorithmically-rejected. Share a screenshot,
            we scrub the PII on your device. Track your ghosts. Rate the worst
            firms. Get a real human referral.
          </p>
        </header>

        <StatStrip posts={posts.length} shame={shame.length} />

        {/* 8/4 grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Feed column */}
          <div className="lg:col-span-8 space-y-6">
            <SectionCard
              eyebrow="The Daily Grind"
              title="Log a report"
              right={<LivePill />}
            >
              <FeedComposer />
            </SectionCard>

            <SectionCard title="Live feed" eyebrow="Broadcast Timeline">
              <FeedTimeline posts={posts} />
            </SectionCard>
          </div>

          {/* Sidebar column */}
          <div className="lg:col-span-4 space-y-6">
            <GhostTracker />
            <ShameIndex rows={shame} />

            <section className="rounded-2xl bg-amber-500 text-zinc-950 p-5 shadow-[0_20px_40px_-20px_rgba(245,158,11,0.5)]">
              <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-70">
                Direct Bypass
              </div>
              <h3 className="text-xl font-black tracking-tight mt-1">
                Skip the resume shredder.
              </h3>
              <p className="text-sm mt-2 opacity-80">
                Post an anonymous stack. Verified employees route you around
                the ATS. Zero PII stored.
              </p>
              <a
                href="#bypass"
                className={cn(
                  "mt-4 inline-flex items-center justify-center w-full h-11 rounded-xl bg-zinc-950 text-white text-xs font-bold uppercase tracking-widest hover:-translate-y-0.5 transition-transform",
                  sans,
                )}
              >
                Access referrals ↓
              </a>
            </section>
          </div>
        </div>

        {/* Full-width bypass */}
        <div id="bypass" className="scroll-mt-20">
          <DirectBypass candidates={candidates} />
        </div>

        <footer className="pt-6 pb-2 text-center text-[11px] text-zinc-600">
          drinkedin.me/thegrind · realtime · no PII stored · satirical archetypes only
        </footer>
      </main>
    </div>
  );
}
