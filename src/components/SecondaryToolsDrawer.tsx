import { lazy, Suspense, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import ErrorBoundary from "@/components/ErrorBoundary";
import { Loader2, Wrench, ChevronRight } from "lucide-react";

// Lazy-loaded — none of these ship in the initial chunk
const RoastMyManager = lazy(() => import("@/components/RoastMyManager"));
const ExcuseFabricator = lazy(() => import("@/components/ExcuseFabricator"));
const RumorMillBracket = lazy(() => import("@/components/RumorMillBracket"));
const WhistleblowerSafeHouse = lazy(() => import("@/components/WhistleblowerSafeHouse"));
const BurnoutTelemetry = lazy(() => import("@/components/BurnoutTelemetry"));
const BurnoutLeaderboard = lazy(() => import("@/components/BurnoutLeaderboard"));
const LayoffLeaderboard = lazy(() => import("@/components/LayoffLeaderboard"));
const OfficeDramaPolls = lazy(() => import("@/components/OfficeDramaPolls"));
const GlobalTimezoneMatrix = lazy(() => import("@/components/GlobalTimezoneMatrix"));
const MidnightLeakDigest = lazy(() => import("@/components/MidnightLeakDigest"));
const GlobalEscapeSimulator = lazy(() => import("@/components/GlobalEscapeSimulator"));
const TrendingEscapeClusters = lazy(() => import("@/components/TrendingEscapeClusters"));
const AnonymousFeedbackTerminal = lazy(() => import("@/components/AnonymousFeedbackTerminal"));

type Tool = {
  id: string;
  eyebrow: string;
  title: string;
  blurb: string;
  render: () => JSX.Element;
};

const TOOLS: Tool[] = [
  { id: "roast", eyebrow: "🎭 INSTANT REVENGE", title: "Roast My Manager", blurb: "Type their name. Receive a surgical, HR-unsafe roast.", render: () => <RoastMyManager /> },
  { id: "excuse", eyebrow: "🤥 ESCAPE HATCH", title: "Excuse Fabricator", blurb: "One-click alibi for skipping the 4:45 PM 'quick sync'.", render: () => <ExcuseFabricator /> },
  { id: "rumor", eyebrow: "🔥 OFFICE GOSSIP", title: "Rumor Mill Bracket", blurb: "March-madness, but every team is a workplace conspiracy.", render: () => <RumorMillBracket /> },
  { id: "safehouse", eyebrow: "🤫 STRICTLY OFF THE RECORD", title: "Whistleblower Safe-House", blurb: "Drop the leak. No names, no IPs, no Slack screenshots traced back.", render: () => <WhistleblowerSafeHouse /> },
  { id: "burnout", eyebrow: "📈 SUFFERING STATS", title: "Burnout Telemetry & Leaderboards", blurb: "Live rankings of corporate decay. Are you winning?", render: () => (
      <div className="space-y-3">
        <BurnoutTelemetry />
        <BurnoutLeaderboard />
        <LayoffLeaderboard />
      </div>
    ) },
  { id: "polls", eyebrow: "🗳️ MORE BALLOTS", title: "Office Drama Polls", blurb: "Settle the petty wars. Anonymously, of course.", render: () => <OfficeDramaPolls /> },
  { id: "global", eyebrow: "🌐 EVERYONE'S COOKED", title: "Around the world right now", blurb: "Timezones, leaks, escapes, and trending clusters of burnout.", render: () => (
      <div className="space-y-3">
        <GlobalTimezoneMatrix />
        <MidnightLeakDigest />
        <GlobalEscapeSimulator />
        <TrendingEscapeClusters />
      </div>
    ) },
  { id: "feedback", eyebrow: "📨 ANON DROPBOX", title: "Anonymous Feedback Terminal", blurb: "Tell us what's broken. Or what's funny. We can't see who you are.", render: () => <AnonymousFeedbackTerminal /> },
];

function ToolFallback() {
  return (
    <div className="grid place-items-center py-10 text-amber-300/70">
      <Loader2 className="size-5 animate-spin" />
    </div>
  );
}

export function SecondaryToolsDrawer() {
  const [open, setOpen] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = TOOLS.find((t) => t.id === activeId) ?? null;

  return (
    <>
      {/* Trigger card — replaces the 9 sprawling HomeSections */}
      <section className="rounded-2xl border border-amber-400/30 bg-gradient-to-br from-neutral-950 via-neutral-950 to-amber-950/10 p-5 shadow-[0_0_40px_rgba(251,191,36,0.06)]">
        <div className="flex items-start gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-amber-400/30 bg-amber-500/10 text-amber-300">
            <Wrench className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-300/80">
              🧰 BREAKROOM TOOLBELT
            </div>
            <h2 className="mt-1 text-lg font-black text-amber-50">
              {TOOLS.length} more chaos tools live in the drawer
            </h2>
            <p className="mt-1 text-xs text-neutral-400">
              Roast generator · Excuse fabricator · Rumor brackets · Burnout leaderboards · Anonymous feedback terminal · and more.
            </p>
            <button
              onClick={() => setOpen(true)}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-amber-400 px-4 py-2 text-xs font-black uppercase tracking-wider text-neutral-950 hover:bg-amber-300 transition shadow-lg shadow-amber-500/20"
            >
              Open the toolbelt <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
      </section>

      <Sheet open={open} onOpenChange={(v) => { setOpen(v); if (!v) setActiveId(null); }}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl overflow-y-auto border-l border-amber-400/20 bg-neutral-950 text-amber-50 p-0"
        >
          <SheetHeader className="border-b border-amber-400/15 bg-gradient-to-b from-amber-950/20 to-transparent px-5 py-4">
            <SheetTitle className="text-amber-100 font-black tracking-tight flex items-center gap-2">
              <Wrench className="size-4 text-amber-300" /> Breakroom Toolbelt
            </SheetTitle>
            <SheetDescription className="text-[11px] text-neutral-400">
              {active ? "Tap ← to pick another tool." : "Pick a tool — each one loads on demand."}
            </SheetDescription>
          </SheetHeader>

          {!active ? (
            <ul className="p-4 space-y-2">
              {TOOLS.map((t) => (
                <li key={t.id}>
                  <button
                    onClick={() => setActiveId(t.id)}
                    className="group w-full text-left rounded-xl border border-neutral-800 bg-neutral-950/70 p-3 transition hover:border-amber-400/50 hover:bg-amber-500/5"
                  >
                    <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/80">
                      {t.eyebrow}
                    </div>
                    <div className="mt-1 flex items-center justify-between gap-2">
                      <div className="text-sm font-bold text-amber-50">{t.title}</div>
                      <ChevronRight className="size-4 text-neutral-600 group-hover:text-amber-300 transition" />
                    </div>
                    <div className="mt-0.5 text-[11px] text-neutral-500">{t.blurb}</div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="p-4 space-y-3">
              <button
                onClick={() => setActiveId(null)}
                className="text-[11px] font-bold uppercase tracking-wider text-amber-300/80 hover:text-amber-200 transition"
              >
                ← All tools
              </button>
              <div className="rounded-xl border border-amber-400/20 bg-neutral-950/80 p-3">
                <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/80">
                  {active.eyebrow}
                </div>
                <h3 className="mt-1 text-base font-black text-amber-50">{active.title}</h3>
                <p className="text-[11px] text-neutral-500">{active.blurb}</p>
              </div>
              <ErrorBoundary label={active.title} message={`${active.title} is reconnecting…`}>
                <Suspense fallback={<ToolFallback />}>
                  {active.render()}
                </Suspense>
              </ErrorBoundary>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

export default SecondaryToolsDrawer;
