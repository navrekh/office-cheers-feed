import { useEffect, useRef, useState } from "react";

const PERSONAS = [
  "Anon_TCS_Lead",
  "Capgemini_Ghost",
  "Wipro_Survivor",
  "Infosys_Refugee",
  "Deloitte_Defector",
  "HCL_Zombie",
  "Accenture_Scout",
  "Google_Burnout",
  "Meta_Maverick",
  "Stripe_Stealth",
];

const CONFESSIONS = [
  "Manager just scheduled a 5:45 PM 'quick sync' on a Friday. I am no longer of this earth. 💀",
  "Production is on fire, the on-call rotation has ghosted, and I am updating LinkedIn between alerts.",
  "Just told my standup I'm 'aligning stakeholders' — translation: drinking cold brew & staring at Jira.",
  "HR sent a 17-slide deck on 'mandatory fun'. I'm filing it under evidence.",
  "PIP rumored. Side-hustle accelerated. Toit at 7. 🍺",
  "Took a half-day to 'work from a quieter location'. Location is the brewpub.",
  "Quarterly review just rated me 'meets expectations'. I expected a raise. We disagree.",
  "Bro this sprint review was scheduled DURING happy hour. Sociopathic.",
  "Senior dev rage-quit mid-PR review. We are now a Jira-driven survival game.",
  "Sent a 4-paragraph Slack reply. The actual answer was 'no'.",
];

const REPLIES = [
  "This is the most accurate description of my Tuesday.",
  "Saving this for my exit interview. 📌",
  "Production is on fire and so are we. 🔥",
  "Going to ghost the 4pm. Trust.",
  "Same energy in my standup today. 🫠",
  "Take a half-day. The system is broken. We are the system.",
  "Big mood. Cold one slid your way. 🍻",
  "Bro this is my entire career.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Hidden internal "Founder God Mode" telemetry deck.
 *
 * Activation:
 *  - Ctrl + Shift + L (or ⌘ + Shift + L on macOS)
 *  - 5 rapid clicks on the brand logo, which dispatches the
 *    `drinkedin:godmode-bump` window event handled below.
 *
 * Fully decoupled: this component only mounts an overlay when active. When
 * inactive it renders nothing, touches no storage, and emits no events. The
 * traffic-surge action fires `drinkedin:godmode-surge-post` events that the
 * live feed listens for to inject simulated posts — no DB writes.
 */
export default function GodModeDeck() {
  const [active, setActive] = useState(false);
  const [tickDb, setTickDb] = useState(4.82);
  const [tickTemp, setTickTemp] = useState(44);
  const [surging, setSurging] = useState(false);
  const [surgeCount, setSurgeCount] = useState(0);
  const clickCountRef = useRef(0);
  const clickResetRef = useRef<number | null>(null);

  // Activation listeners (keyboard + logo-bump bridge)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const combo =
        (e.ctrlKey || e.metaKey) &&
        e.shiftKey &&
        (e.key === "L" || e.key === "l");
      if (combo) {
        e.preventDefault();
        setActive((v) => !v);
      } else if (e.key === "Escape" && active) {
        setActive(false);
      }
    }
    function onBump() {
      clickCountRef.current += 1;
      if (clickResetRef.current) window.clearTimeout(clickResetRef.current);
      clickResetRef.current = window.setTimeout(() => {
        clickCountRef.current = 0;
      }, 1500);
      if (clickCountRef.current >= 5) {
        clickCountRef.current = 0;
        setActive((v) => !v);
      }
    }
    window.addEventListener("keydown", onKey);
    window.addEventListener("drinkedin:godmode-bump", onBump);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("drinkedin:godmode-bump", onBump);
      if (clickResetRef.current) window.clearTimeout(clickResetRef.current);
    };
  }, [active]);

  // Live telemetry tickers (only run while overlay is open)
  useEffect(() => {
    if (!active) return;
    const id = window.setInterval(() => {
      setTickDb((v) =>
        Math.max(1.2, Math.min(9.9, v + (Math.random() - 0.5) * 0.8))
      );
      setTickTemp(() => 42 + Math.floor(Math.random() * 6)); // 42 – 47
    }, 700);
    return () => window.clearInterval(id);
  }, [active]);

  async function triggerSurge() {
    if (surging) return;
    setSurging(true);
    setSurgeCount(0);
    // 10 posts spread over ~5s; each post also fires a fake reply ping.
    for (let i = 0; i < 10; i++) {
      const author = pick(PERSONAS);
      window.dispatchEvent(
        new CustomEvent("drinkedin:godmode-surge-post", {
          detail: {
            id: `god-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
            author_name: author,
            author_headline: "📟 God-Mode Injected · Synthetic Load",
            body_text: pick(CONFESSIONS),
          },
        })
      );
      // Bell pulse via existing reply bridge.
      window.dispatchEvent(
        new CustomEvent("drinkedin:post-reply", {
          detail: {
            postId: `god-${i}`,
            persona: author,
            text: pick(REPLIES),
            snippet: "📟 GOD MODE: synthetic traffic surge",
          },
        })
      );
      window.dispatchEvent(new CustomEvent("drinkedin:ai-chat-message"));
      setSurgeCount((c) => c + 1);
      await new Promise((r) => setTimeout(r, 500));
    }
    setSurging(false);
  }

  if (!active) return null;

  return (
    <div
      role="dialog"
      aria-label="DrinkedIn God Mode Telemetry Deck"
      className="fixed inset-0 z-[200] grid place-items-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={(e) => {
        if (e.target === e.currentTarget) setActive(false);
      }}
    >
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-black/95 text-emerald-400 border border-emerald-500/30 font-mono p-6 rounded-3xl backdrop-blur-2xl shadow-[0_0_50px_rgba(16,185,129,0.25)] animate-scale-in">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-5 pb-4 border-b border-emerald-500/20">
          <div>
            <h2 className="text-[13px] tracking-[0.25em] font-bold text-emerald-300">
              📟 DRINKEDIN ADVANCED TELEMETRY SYSTEMS
            </h2>
            <p className="text-[10.5px] text-emerald-500/70 mt-1">
              // GOD MODE ACTIVE — internal founder console · session{" "}
              <span className="text-emerald-300">{Date.now().toString(36).toUpperCase()}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setActive(false)}
            className="text-[10.5px] uppercase tracking-wider px-3 py-1.5 rounded-lg border border-emerald-500/40 hover:bg-emerald-500/10 transition"
          >
            ❌ Close Terminal
          </button>
        </div>

        {/* Monitors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
          <Monitor title="💾 DATABASE WRITE VELOCITY" value={`${tickDb.toFixed(2)} ops/sec`} hint="postgres · primary · eu-west-1" />
          <Monitor
            title="🌐 ACTIVE SOCKET MESH NODES"
            value="8 Nodes"
            hint="IN-PUN · IN-BLR · IN-HYD · US-SFO · US-AUS · UK-LON · DE-BER · CN-SZX"
          />
          <Monitor title="🔥 SERVER INTEL TEMPERATURE" value={`${tickTemp}°C`} hint="thermals nominal · fan curve auto" />
        </div>

        {/* Live log strip */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.03] p-3 mb-5 text-[10.5px] leading-relaxed space-y-0.5">
          <div>[{new Date().toLocaleTimeString([], { hour12: false })}] ▸ realtime channel <span className="text-emerald-300">posts-feed</span> · OK</div>
          <div>[{new Date().toLocaleTimeString([], { hour12: false })}] ▸ rls policy <span className="text-emerald-300">posts.is_hidden = false</span> · enforced</div>
          <div>[{new Date().toLocaleTimeString([], { hour12: false })}] ▸ surge injector · {surging ? <span className="text-amber-300 animate-pulse">PUMPING ({surgeCount}/10)</span> : <span className="text-emerald-300">idle</span>}</div>
        </div>

        {/* Master control */}
        <button
          type="button"
          onClick={triggerSurge}
          disabled={surging}
          className="w-full text-[12px] font-bold tracking-wider uppercase rounded-2xl px-4 py-3.5 border border-rose-400/60 bg-gradient-to-b from-rose-600 to-rose-700 text-white shadow-[0_0_30px_rgba(244,63,94,0.55)] hover:brightness-110 active:scale-[0.99] transition disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {surging
            ? `⚡ INJECTING TRAFFIC SURGE… (${surgeCount}/10)`
            : "⚡ EMULATE VIRAL TRAFFIC SURGE (+50 USER REPLIES)"}
        </button>

        <p className="text-[10px] text-emerald-500/60 mt-3 text-center">
          ESC or click outside to dismiss. Activation: Ctrl+Shift+L · 5× logo tap.
        </p>
      </div>
    </div>
  );
}

function Monitor({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/[0.04] p-3.5 shadow-[inset_0_0_22px_rgba(16,185,129,0.08)]">
      <div className="text-[9.5px] tracking-[0.18em] font-bold text-emerald-300/80">{title}</div>
      <div className="mt-1.5 text-[22px] font-black tabular-nums text-emerald-200 drop-shadow-[0_0_10px_rgba(16,185,129,0.55)]">
        {value}
      </div>
      <div className="mt-1 text-[10px] text-emerald-500/70 leading-snug break-words">{hint}</div>
    </div>
  );
}
