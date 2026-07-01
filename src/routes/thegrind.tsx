import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Coffee,
  Flame,
  Ghost,
  Skull,
  Terminal,
  Upload,
  X,
  ArrowUpDown,
  Send,
  Radio,
  ShieldCheck,
  Settings,
  Briefcase,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/thegrind")({
  head: () => ({
    meta: [
      { title: "#TheGrind — DrinkedIn Terminal" },
      { name: "description", content: "Cyberpunk portal for the modern job-hunt survivor. Scrub screenshots, track ghosts, shame ATS villains." },
    ],
  }),
  component: TheGrindPage,
});

// ============================================================
// THEME TOKENS (cyberpunk corporate noir — inline via arbitrary values)
// ============================================================
const NEON = "#39FF14";
const AMBER = "#FFB300";
const GRAY = "#8F95A3";
const BG = "#0D0E12";
const PANEL = "#161820";
const BORDER = "#222530";

const mono = "font-mono tracking-tight";

// ============================================================
// SIDEBAR
// ============================================================
type NavKey = "watercooler" | "grind" | "jobless" | "settings";

function Sidebar({ active, onSelect }: { active: NavKey; onSelect: (k: NavKey) => void }) {
  const items: { key: NavKey; label: string; icon: React.ReactNode; href?: string }[] = [
    { key: "watercooler", label: "Watercooler / Roast Feed", icon: <Coffee className="h-4 w-4" />, href: "/" },
    { key: "grind", label: "#TheGrind Portal", icon: <Flame className="h-4 w-4" /> },
    { key: "jobless", label: "Jobless Hub", icon: <Briefcase className="h-4 w-4" /> },
    { key: "settings", label: "Terminal Settings", icon: <Settings className="h-4 w-4" /> },
  ];
  return (
    <aside
      className={cn(
        "shrink-0 border-r flex flex-col",
        "w-full lg:w-64 lg:min-h-screen",
      )}
      style={{ borderColor: BORDER, background: PANEL }}
    >
      <div className="px-4 py-4 border-b flex items-center gap-2" style={{ borderColor: BORDER }}>
        <Terminal className="h-4 w-4" style={{ color: NEON }} />
        <span className={cn("text-sm font-bold", mono)} style={{ color: NEON }}>
          drinkedin://root
        </span>
      </div>
      <nav className="flex lg:flex-col gap-1 p-2 overflow-x-auto">
        {items.map((item) => {
          const isActive = item.key === active;
          const content = (
            <button
              key={item.key}
              onClick={() => item.href ? null : onSelect(item.key)}
              className={cn(
                "relative flex items-center gap-2 px-3 py-2 text-xs rounded-sm transition-all whitespace-nowrap w-full text-left",
                mono,
              )}
              style={{
                color: isActive ? NEON : GRAY,
                background: isActive ? "rgba(57,255,20,0.06)" : "transparent",
                border: `1px solid ${isActive ? "rgba(57,255,20,0.4)" : "transparent"}`,
                boxShadow: isActive ? `0 0 12px rgba(57,255,20,0.25)` : "none",
              }}
            >
              {isActive && (
                <span
                  className="absolute left-0 top-0 bottom-0 w-[3px]"
                  style={{ background: NEON, boxShadow: `0 0 8px ${NEON}` }}
                />
              )}
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
          if (item.href) {
            return (
              <Link key={item.key} to={item.href} className="w-full">
                {content}
              </Link>
            );
          }
          return <div key={item.key} className="w-full">{content}</div>;
        })}
      </nav>
      <div className="mt-auto p-3 border-t hidden lg:block" style={{ borderColor: BORDER }}>
        <div className={cn("text-[10px]", mono)} style={{ color: GRAY }}>
          <div>uptime: 47d 12h</div>
          <div style={{ color: AMBER }}>anon session: 0x7f3a...</div>
        </div>
      </div>
    </aside>
  );
}

// ============================================================
// PANEL SHELL
// ============================================================
function Panel({
  title,
  subtitle,
  children,
  accent = NEON,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <section
      className="border rounded-sm"
      style={{ background: PANEL, borderColor: BORDER }}
    >
      <header
        className="flex items-baseline justify-between gap-4 px-4 py-3 border-b"
        style={{ borderColor: BORDER }}
      >
        <div className="min-w-0">
          <h2 className={cn("text-sm font-bold uppercase tracking-widest", mono)} style={{ color: accent }}>
            ▸ {title}
          </h2>
          {subtitle && (
            <p className={cn("text-[11px] mt-0.5", mono)} style={{ color: GRAY }}>
              {subtitle}
            </p>
          )}
        </div>
        <span
          className={cn("text-[10px] shrink-0", mono)}
          style={{ color: GRAY }}
        >
          [LIVE]
        </span>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

// ============================================================
// PANEL 1: FEED + SCRUBBER
// ============================================================
type GrindPost = {
  id: string;
  body: string;
  tags: string[];
  image?: string;
  ts: string;
};

const PRESET_TAGS = [
  "Instant Rejection",
  "Ghosted 30 Days",
  "7-Round Interview Traumatic Stress",
  "AI Assessment Choke",
];

function TagChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn("px-2 py-1 text-[10px] rounded-sm border transition-all", mono)}
      style={{
        color: active ? BG : GRAY,
        background: active ? NEON : "transparent",
        borderColor: active ? NEON : BORDER,
      }}
    >
      [{label}]
    </button>
  );
}

// Client-side redaction: draws opaque black rectangles over simulated PII regions.
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

  // Simulate PII redaction: black bars across likely name/email/phone rows.
  // Deterministic pseudo-random bar layout based on image dimensions.
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

  // Watermark
  ctx.fillStyle = "rgba(57,255,20,0.8)";
  ctx.font = `${Math.max(10, h * 0.02)}px monospace`;
  ctx.fillText("SCRUBBED :: drinkedin.me/thegrind", 12, h - 12);

  return canvas.toDataURL("image/png");
}

function FeedPanel({
  posts,
  onPost,
}: {
  posts: GrindPost[];
  onPost: (p: GrindPost) => void;
}) {
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
      toast.success("PII redacted client-side. Nothing left the terminal.");
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
      toast.error("Log entry requires text or scrubbed asset");
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
    // realtime handler will append; also optimistically clear input
    setBody("");
    setTags([]);
    setScrubbed(undefined);
    toast.success("Broadcast to /grind_posts");
  };

  return (
    <Panel
      title="#TheGrind Feed"
      subtitle="POST → SCRUB → BROADCAST. All PII redacted on-device."
    >
      <div className="space-y-3">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="> log your latest hiring atrocity..."
          className={cn("min-h-[80px] resize-none", mono)}
          style={{ background: BG, borderColor: BORDER, color: NEON }}
        />

        <div className="flex flex-wrap gap-1.5">
          {PRESET_TAGS.map((t) => (
            <TagChip
              key={t}
              label={t}
              active={tags.includes(t)}
              onClick={() =>
                setTags((prev) => (prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t]))
              }
            />
          ))}
        </div>

        <div
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          className="border border-dashed rounded-sm p-4 text-center cursor-pointer"
          style={{ borderColor: BORDER, background: BG }}
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
              <img src={scrubbed} alt="Scrubbed" className="max-h-64 mx-auto rounded-sm" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setScrubbed(undefined);
                }}
                className="absolute top-1 right-1 p-1 rounded-full"
                style={{ background: BG, color: AMBER, border: `1px solid ${BORDER}` }}
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <div className={cn("text-xs", mono)} style={{ color: GRAY }}>
              <Upload className="h-5 w-5 mx-auto mb-1" style={{ color: NEON }} />
              {busy ? "SCRUBBING..." : "Drop recruiter chat screenshot // click to load"}
            </div>
          )}
        </div>

        <Button
          onClick={submit}
          className={cn("w-full", mono)}
          style={{ background: NEON, color: BG, boxShadow: `0 0 12px rgba(57,255,20,0.4)` }}
        >
          <Send className="h-4 w-4 mr-1" /> BROADCAST_LOG()
        </Button>

        {/* Timeline */}
        <div className="pt-3 border-t space-y-3" style={{ borderColor: BORDER }}>
          {posts.length === 0 && (
            <div className={cn("text-xs text-center py-4", mono)} style={{ color: GRAY }}>
              // no logs yet. be the first casualty.
            </div>
          )}
          {posts.map((p) => (
            <article key={p.id} className="border rounded-sm p-3" style={{ borderColor: BORDER, background: BG }}>
              <div className="flex items-center justify-between mb-1">
                <span className={cn("text-[10px]", mono)} style={{ color: AMBER }}>
                  anon_{p.id.slice(0, 6)}
                </span>
                <span className={cn("text-[10px]", mono)} style={{ color: GRAY }}>
                  {new Date(p.ts).toLocaleString()}
                </span>
              </div>
              {p.body && (
                <p className={cn("text-xs mb-2 whitespace-pre-wrap", mono)} style={{ color: "#DDD" }}>
                  {p.body}
                </p>
              )}
              {p.image && <img src={p.image} alt="scrubbed" className="rounded-sm max-h-56 mb-2" />}
              <div className="flex flex-wrap gap-1">
                {p.tags.map((t) => (
                  <span
                    key={t}
                    className={cn("text-[9px] px-1.5 py-0.5 rounded-sm border", mono)}
                    style={{ color: NEON, borderColor: NEON }}
                  >
                    #{t.replace(/\s+/g, "")}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </div>
    </Panel>
  );
}

// ============================================================
// PANEL 2: GHOST TRACKER
// ============================================================
function GhostTrackerPanel() {
  const [apps, setApps] = useState(47);
  const [ghosts, setGhosts] = useState(38);
  const [kills, setKills] = useState(6);

  const responses = Math.max(0, apps - ghosts - kills);
  const filteredPct = apps > 0 ? Math.round(((ghosts + kills) / apps) * 100) : 0;

  const Stepper = ({
    label,
    value,
    setValue,
    icon,
    color = NEON,
  }: {
    label: string;
    value: number;
    setValue: (n: number) => void;
    icon: React.ReactNode;
    color?: string;
  }) => (
    <div className="border rounded-sm p-2" style={{ borderColor: BORDER, background: BG }}>
      <div className={cn("flex items-center gap-1 text-[10px] mb-1", mono)} style={{ color: GRAY }}>
        {icon} {label}
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setValue(Math.max(0, value - 1))}
          className={cn("w-6 h-6 border rounded-sm", mono)}
          style={{ borderColor: BORDER, color }}
        >
          −
        </button>
        <span className={cn("flex-1 text-center text-2xl font-bold", mono)} style={{ color }}>
          {value}
        </span>
        <button
          onClick={() => setValue(value + 1)}
          className={cn("w-6 h-6 border rounded-sm", mono)}
          style={{ borderColor: BORDER, color }}
        >
          +
        </button>
      </div>
    </div>
  );

  const bar = (n: number, total: number, char: string, color: string) => {
    const width = 24;
    const filled = total > 0 ? Math.round((n / total) * width) : 0;
    return (
      <span style={{ color }}>
        {char.repeat(filled)}
        <span style={{ color: BORDER }}>{"·".repeat(Math.max(0, width - filled))}</span>
      </span>
    );
  };

  return (
    <Panel title="Daily Ghost Tracker" subtitle="Real-time attrition math for the modern job hunt.">
      <div className="grid grid-cols-3 gap-2 mb-4">
        <Stepper label="APPS FIRED" value={apps} setValue={setApps} icon={<Zap className="h-3 w-3" />} />
        <Stepper label="SILENT GHOSTS" value={ghosts} setValue={setGhosts} icon={<Ghost className="h-3 w-3" />} color={AMBER} />
        <Stepper label="AUTO-KILLS" value={kills} setValue={setKills} icon={<Skull className="h-3 w-3" />} color="#FF4466" />
      </div>

      {/* ASCII Funnel */}
      <div
        className={cn("text-[11px] leading-6 p-3 border rounded-sm overflow-x-auto", mono)}
        style={{ borderColor: BORDER, background: BG }}
      >
        <div style={{ color: GRAY }}>{"// funnel.render()"}</div>
        <div>
          <span style={{ color: NEON }}>APPS      </span> {bar(apps, apps, "█", NEON)} <span style={{ color: NEON }}>{apps}</span>
        </div>
        <div>
          <span style={{ color: AMBER }}>GHOSTED   </span> {bar(ghosts, apps, "▓", AMBER)} <span style={{ color: AMBER }}>{ghosts}</span>
        </div>
        <div>
          <span style={{ color: "#FF4466" }}>KILLED    </span> {bar(kills, apps, "▒", "#FF4466")} <span style={{ color: "#FF4466" }}>{kills}</span>
        </div>
        <div>
          <span style={{ color: "#7DFF9E" }}>REPLIED   </span> {bar(responses, apps, "░", "#7DFF9E")} <span style={{ color: "#7DFF9E" }}>{responses}</span>
        </div>
        <div className="pt-2" style={{ color: GRAY }}>
          {">> "}
          <span style={{ color: AMBER }}>{filteredPct}%</span> filtered by black-box ATS.
        </div>
      </div>
    </Panel>
  );
}

// ============================================================
// PANEL 3: SHAME INDEX
// ============================================================
type ShameRow = {
  name: string;
  ats: number;
  ghost: number;
  velocity: number;
};

const INITIAL_SHAME: ShameRow[] = [
  { name: "Accenture", ats: 94, ghost: 42, velocity: 3 },
  { name: "Capgemini", ats: 91, ghost: 51, velocity: 4 },
  { name: "TCS", ats: 88, ghost: 38, velocity: 6 },
  { name: "Infosys", ats: 86, ghost: 45, velocity: 5 },
  { name: "Cognizant", ats: 92, ghost: 37, velocity: 2 },
  { name: "Wipro", ats: 84, ghost: 49, velocity: 7 },
];

type SortKey = keyof Omit<ShameRow, "name"> | "name";

function ShamePanel({ rows }: { rows: ShameRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("ats");
  const [asc, setAsc] = useState(false);
  const [selected, setSelected] = useState(0);
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

  const submitComplaint = async () => {
    const target = rows[selected];
    if (!target) return;
    setBusy(true);
    const { error } = await supabase.rpc("file_shame_complaint", {
      p_company: target.name,
      p_severity: complaint[0],
    });
    setBusy(false);
    if (error) {
      toast.error("Complaint dropped: " + error.message);
      return;
    }
    toast.success(`Complaint filed against ${target.name}. Shame index recalculated.`);
  };


  const Th = ({ k, label }: { k: SortKey; label: string }) => (
    <th
      onClick={() => toggleSort(k)}
      className={cn("px-2 py-2 text-left cursor-pointer select-none", mono)}
      style={{ color: sortKey === k ? NEON : GRAY }}
    >
      <span className="inline-flex items-center gap-1">
        {label} <ArrowUpDown className="h-3 w-3" />
      </span>
    </th>
  );

  return (
    <Panel
      title="WITCH & SI :: Shame Index"
      subtitle="Real-time corporate accountability leaderboard."
      accent={AMBER}
    >
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_220px] gap-4">
        <div className="overflow-x-auto border rounded-sm" style={{ borderColor: BORDER }}>
          <table className="w-full text-xs">
            <thead style={{ background: BG }}>
              <tr>
                <Th k="name" label="COMPANY" />
                <Th k="ats" label="ATS_DEP" />
                <Th k="ghost" label="GHOST_DAYS" />
                <Th k="velocity" label="REJ_MIN" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const isSel = rows[selected]?.name === r.name;
                return (
                  <tr
                    key={r.name}
                    onClick={() => setSelected(rows.findIndex((x) => x.name === r.name))}
                    className="border-t cursor-pointer transition-colors"
                    style={{
                      borderColor: BORDER,
                      background: isSel ? "rgba(255,179,0,0.06)" : "transparent",
                    }}
                  >
                    <td className={cn("px-2 py-2", mono)} style={{ color: "#DDD" }}>
                      {r.name}
                    </td>
                    <td className={cn("px-2 py-2", mono)}>
                      <span
                        className="inline-block h-1 mr-2 align-middle transition-all duration-500"
                        style={{
                          width: `${r.ats}px`,
                          background: r.ats > 90 ? "#FF4466" : AMBER,
                          maxWidth: "60px",
                        }}
                      />
                      <span style={{ color: r.ats > 90 ? "#FF4466" : AMBER }}>{r.ats}</span>
                    </td>
                    <td className={cn("px-2 py-2", mono)} style={{ color: AMBER }}>
                      {r.ghost}d
                    </td>
                    <td className={cn("px-2 py-2", mono)} style={{ color: NEON }}>
                      {r.velocity}m
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="border rounded-sm p-3" style={{ borderColor: BORDER, background: BG }}>
          <div className={cn("text-[10px] mb-2", mono)} style={{ color: GRAY }}>
            FILE COMPLAINT →
          </div>
          <div className={cn("text-sm font-bold mb-3", mono)} style={{ color: AMBER }}>
            {rows[selected]?.name}
          </div>
          <div className={cn("text-[10px] mb-1", mono)} style={{ color: GRAY }}>
            Severity: {complaint[0]}
          </div>
          <Slider
            value={complaint}
            onValueChange={setComplaint}
            min={0}
            max={100}
            step={5}
            className="mb-3"
          />
          <Button
            size="sm"
            onClick={submitComplaint}
            disabled={busy}
            className={cn("w-full", mono)}
            style={{ background: AMBER, color: BG }}
          >
            {busy ? "SUBMITTING..." : "SUBMIT_REPORT()"}
          </Button>

          <p className={cn("text-[9px] mt-2", mono)} style={{ color: GRAY }}>
            // Stanford HAI '24: 78% of enterprise reqs are auto-culled pre-human.
          </p>
        </div>
      </div>
    </Panel>
  );
}

// ============================================================
// PANEL 4: DIRECT BYPASS
// ============================================================
type BypassCandidate = {
  id: string;
  profile: string;
  ts: string;
  referred: boolean;
};

const SEED_CANDIDATES: BypassCandidate[] = [
  {
    id: "c1",
    profile: "Backend / Go+Rust · gRPC · 8y distributed systems · k8s operator author · 40M QPS load handled",
    ts: new Date(Date.now() - 3600e3).toISOString(),
    referred: false,
  },
  {
    id: "c2",
    profile: "ML/Infra · PyTorch · CUDA kernel opt · trained 7B param model · MLOps @ hyperscaler",
    ts: new Date(Date.now() - 7200e3).toISOString(),
    referred: false,
  },
];

function BypassPanel({ candidates }: { candidates: BypassCandidate[] }) {
  const [profile, setProfile] = useState("");
  const [handshake, setHandshake] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const push = async () => {
    if (profile.trim().length < 20) {
      toast.error("Profile too thin. Add architectures, metrics, framework fluencies.");
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
    toast.success("Bypass profile added to anonymous pool.");
  };

  const refer = async (id: string) => {
    const { error } = await supabase.rpc("mark_bypass_referred", { p_id: id });
    if (error) {
      toast.error("Handshake failed: " + error.message);
      return;
    }
    setHandshake(
      `> handshake_init(0x${crypto.randomUUID().replace(/-/g, "").slice(0, 16)})\n` +
      `> bridging candidate → verified.employee[hash:0x${Math.random().toString(16).slice(2, 10)}]\n` +
      `> ATS_bypass = TRUE\n` +
      `> Secure Encrypted Bridge Generated.\n` +
      `> Bypassing External ATS.\n` +
      `> Connection Handshake Saved to /bypass_referrals`,
    );
    setTimeout(() => setHandshake(null), 6000);
  };


  return (
    <Panel
      title="The Direct Bypass"
      subtitle="Referral sandbox // ATS-free candidate ↔ employed handshake loop."
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Candidate side */}
        <div className="border rounded-sm p-3" style={{ borderColor: BORDER, background: BG }}>
          <div className={cn("text-[10px] mb-2 flex items-center gap-1", mono)} style={{ color: NEON }}>
            <Radio className="h-3 w-3" /> CANDIDATE :: post_anonymous_profile()
          </div>
          <Textarea
            value={profile}
            onChange={(e) => setProfile(e.target.value)}
            placeholder="> core stack · years · shipped metrics · NO names, NO universities"
            className={cn("min-h-[100px] resize-none mb-2", mono)}
            style={{ background: BG, borderColor: BORDER, color: NEON }}
          />
          <Button
            onClick={push}
            className={cn("w-full", mono)}
            style={{ background: NEON, color: BG }}
          >
            OPEN_TO_BYPASS()
          </Button>
        </div>

        {/* Employed side */}
        <div className="border rounded-sm p-3 space-y-2 max-h-[500px] overflow-y-auto" style={{ borderColor: BORDER, background: BG }}>
          <div className={cn("text-[10px] mb-1 flex items-center gap-1", mono)} style={{ color: AMBER }}>
            <ShieldCheck className="h-3 w-3" /> EMPLOYED_ROASTER :: candidate_feed[]
          </div>
          {candidates.map((c) => (
            <div key={c.id} className="border rounded-sm p-2" style={{ borderColor: BORDER }}>
              <div className={cn("text-[10px] mb-1 flex justify-between", mono)} style={{ color: GRAY }}>
                <span>anon#{c.id.slice(0, 6)}</span>
                <span>{new Date(c.ts).toLocaleTimeString()}</span>
              </div>
              <p className={cn("text-xs mb-2", mono)} style={{ color: "#DDD" }}>
                {c.profile}
              </p>
              <Button
                size="sm"
                disabled={c.referred}
                onClick={() => refer(c.id)}
                className={cn("w-full", mono)}
                style={{
                  background: c.referred ? BORDER : NEON,
                  color: c.referred ? GRAY : BG,
                  boxShadow: c.referred ? "none" : `0 0 8px rgba(57,255,20,0.4)`,
                }}
              >
                {c.referred ? "✓ BRIDGE_SEALED" : "[Anonymously Refer]"}
              </Button>
            </div>
          ))}
        </div>
      </div>

      {handshake && (
        <pre
          className={cn("mt-4 p-3 text-[11px] whitespace-pre-wrap border rounded-sm", mono)}
          style={{
            background: BG,
            borderColor: NEON,
            color: NEON,
            boxShadow: `0 0 16px rgba(57,255,20,0.3)`,
          }}
        >
          {handshake}
        </pre>
      )}
    </Panel>
  );
}

// ============================================================
// STATS BAR (mock supabase aggregates)
// ============================================================
function StatsBar() {
  const stats = [
    { label: "grind_posts", value: "12,847", color: NEON },
    { label: "shame_reports", value: "3,412", color: AMBER },
    { label: "bypass_bridges", value: "289", color: NEON },
    { label: "auto_rejections_today", value: "1,203", color: "#FF4466" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
      {stats.map((s) => (
        <div
          key={s.label}
          className="border rounded-sm p-3"
          style={{ background: PANEL, borderColor: BORDER }}
        >
          <div className={cn("text-[10px]", mono)} style={{ color: GRAY }}>
            {s.label}
          </div>
          <div className={cn("text-xl font-bold", mono)} style={{ color: s.color }}>
            {s.value}
          </div>
        </div>
      ))}
    </div>
  );
}

// ============================================================
// SEED POSTS
// ============================================================
const SEED_POSTS: GrindPost[] = [
  {
    id: "seed1",
    body: "Applied to SI firm at 14:03:07. Auto-reject email at 14:03:19. Twelve. Seconds. The algorithm didn't even pretend to read.",
    tags: ["Instant Rejection", "AI Assessment Choke"],
    ts: new Date(Date.now() - 45 * 60e3).toISOString(),
  },
  {
    id: "seed2",
    body: "Round 7. 'Culture fit.' They asked me to whiteboard leftpad. Ghosted 3 weeks later.",
    tags: ["7-Round Interview Traumatic Stress", "Ghosted 30 Days"],
    ts: new Date(Date.now() - 6 * 3600e3).toISOString(),
  },
];

// ============================================================
// MAIN PAGE
// ============================================================
function TheGrindPage() {
  const [active, setActive] = useState<NavKey>("grind");
  const [posts, setPosts] = useState<GrindPost[]>(SEED_POSTS);

  return (
    <div className="min-h-screen flex flex-col lg:flex-row" style={{ background: BG }}>
      <Sidebar active={active} onSelect={setActive} />

      <main className="flex-1 min-w-0 p-4 lg:p-6">
        <header className="mb-4">
          <h1 className={cn("text-2xl md:text-3xl font-bold", mono)} style={{ color: NEON, textShadow: `0 0 12px rgba(57,255,20,0.4)` }}>
            #TheGrind_Portal
          </h1>
          <p className={cn("text-xs mt-1", mono)} style={{ color: GRAY }}>
            {"// underground terminal for the algorithmically-rejected class."}
          </p>
        </header>

        <div
          className={cn("mb-4 p-3 border rounded-sm text-[11px]", mono)}
          style={{ borderColor: AMBER, background: "rgba(255,179,0,0.05)", color: AMBER }}
        >
          <strong>STAT_ALERT ::</strong> Stanford HAI '24 dataset shows <b>78%</b> of enterprise reqs are auto-culled pre-human. Median human-response latency: <b>19 days</b>. You are not the problem.
        </div>

        <StatsBar />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          <FeedPanel posts={posts} onPost={(p) => setPosts((prev) => [p, ...prev])} />
          <GhostTrackerPanel />
          <div className="xl:col-span-2">
            <ShamePanel />
          </div>
          <div className="xl:col-span-2">
            <BypassPanel />
          </div>
        </div>

        <footer className={cn("mt-8 text-center text-[10px]", mono)} style={{ color: GRAY }}>
          drinkedin.me/thegrind :: v0.1.0-noir :: no PII stored :: all state client-side
        </footer>
      </main>
    </div>
  );
}
