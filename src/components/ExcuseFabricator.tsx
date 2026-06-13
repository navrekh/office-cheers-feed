import { useState } from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type ScenarioKey = "crash" | "raise" | "email" | "slack";

const SCENARIOS: { key: ScenarioKey; label: string; response: string }[] = [
  {
    key: "crash",
    label: "Situation 1: Explaining a Friday afternoon server crash",
    response:
      "I didn't crash the server; I aggressively stress-tested our recovery architecture in a real-world scenario to ensure maximum cross-functional readiness on Monday morning.",
  },
  {
    key: "raise",
    label: "Situation 2: Asking for a raise during a hiring freeze",
    response:
      "While I respect the macroeconomic optimization framework of our current hiring freeze, my core deliverables have achieved an escape velocity that requires a proportional calibration of my financial liquidity parameters.",
  },
  {
    key: "email",
    label: "Situation 3: Politely saying 'This meeting could have been an email'",
    response:
      "I have reviewed our synchronization agenda and determined that our alignment velocity can be maximized by transitioning this baseline telemetry into an asynchronous textual format to protect developer sprint capacity.",
  },
  {
    key: "slack",
    label: "Situation 4: Explaining why your active status on Slack was offline for 3 hours",
    response:
      "My status wasn't offline; I was performing a deep-focus hardware-detached cognitive refactoring sprint to resolve architectural roadblocks without terminal distractions.",
  },
];

export default function ExcuseFabricator() {
  const [scenario, setScenario] = useState<ScenarioKey | "">("");
  const [fabricatedText, setFabricatedText] = useState("");
  const [copied, setCopied] = useState(false);

  const fabricate = () => {
    if (!scenario) {
      toast.error("Pick a corporate situation first.");
      return;
    }
    const match = SCENARIOS.find((s) => s.key === scenario);
    setFabricatedText(match?.response ?? "");
    setCopied(false);
  };

  const copyShield = () => {
    if (!fabricatedText) return;
    try {
      navigator.clipboard?.writeText(fabricatedText).catch(() => {});
    } catch {}
    setCopied(true);
    toast("🛡️ Shield activated! Drop this into your manager's thread and stay off the grid.", {
      duration: 2600,
    });
    window.setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="bg-[#0d0d0d]/90 backdrop-blur-xl border border-[#1f1f1f] rounded-2xl p-5 shadow-2xl">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400 animate-pulse shadow-[0_0_8px_rgba(232,121,249,0.8)]" />
        <h3 className="text-[11px] font-extrabold tracking-[0.22em] text-fuchsia-300 uppercase">
          🔮 The Corporate Matrix Excuse Fabricator
        </h3>
      </div>

      <Select value={scenario} onValueChange={(v) => setScenario(v as ScenarioKey)}>
        <SelectTrigger className="bg-[#141414] border border-[#222] text-[12px] text-white/85 rounded-xl h-10">
          <SelectValue placeholder="Choose your corporate emergency..." />
        </SelectTrigger>
        <SelectContent className="bg-[#0d0d0d] border-[#222] text-white">
          {SCENARIOS.map((s) => (
            <SelectItem key={s.key} value={s.key} className="text-[12px]">
              {s.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <button
        type="button"
        onClick={fabricate}
        className="mt-3 w-full text-[12px] font-bold uppercase tracking-wider rounded-xl px-3 py-2.5 border border-amber-400/50 bg-gradient-to-b from-amber-500/20 to-amber-500/[0.05] text-amber-200 hover:bg-amber-500/30 hover:border-amber-300/70 transition-all duration-200"
      >
        🔥 Fabricate Corporate Shield
      </button>

      {fabricatedText && (
        <div className="bg-black/50 border border-amber-500/20 text-amber-500 rounded-xl p-3 font-mono text-xs mt-3 animate-fade-in">
          <p className="leading-relaxed whitespace-pre-wrap">{fabricatedText}</p>
          <div className="mt-2 pt-2 border-t border-amber-500/15 flex justify-end">
            <button
              type="button"
              onClick={copyShield}
              className="text-[10.5px] font-bold uppercase tracking-wider text-amber-300 hover:text-amber-100 transition-colors"
            >
              {copied ? "✅ Copied!" : "📋 Copy Corporate Shield"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
