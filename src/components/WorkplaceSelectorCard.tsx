import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ShieldCheck, VenetianMask } from "lucide-react";

const SUGGESTED_COMPANIES = [
  "TCS",
  "Infosys",
  "Wipro",
  "Cognizant",
  "Accenture",
  "HCLTech",
  "Capgemini",
  "Tech Mahindra",
  "Deloitte",
  "EY",
  "PwC",
  "KPMG",
  "Google",
  "Microsoft",
  "Amazon",
  "Meta",
  "Apple",
  "Adobe",
  "Salesforce",
  "Oracle",
  "IBM",
  "SAP",
  "ServiceNow",
  "Atlassian",
  "Stripe",
  "Razorpay",
  "Flipkart",
  "Swiggy",
  "Zomato",
  "Paytm",
  "PhonePe",
  "Freshworks",
  "Zoho",
  "Other / Stealth Startup",
];

type Props = {
  userId: string;
  onSaved: () => void;
};

export function WorkplaceSelectorCard({ userId, onSaved }: Props) {
  const [query, setQuery] = useState("");
  const [zone, setZone] = useState("");
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const wrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return SUGGESTED_COMPANIES.slice(0, 8);
    return SUGGESTED_COMPANIES.filter((c) => c.toLowerCase().includes(q)).slice(
      0,
      8,
    );
  }, [query]);

  async function save() {
    const company = query.trim().slice(0, 80);
    if (!company) {
      toast.error("Pick a company (or 'Other / Stealth Startup').");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as any)
      .from("profiles")
      .update({
        declared_company: company,
        tech_park_zone: zone.trim().slice(0, 80) || null,
      })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save your mask. Try again.");
      return;
    }
    toast.success(`Mask locked: ${company} 🎭`);
    onSaved();
  }

  return (
    <Card className="relative overflow-hidden border-fuchsia-500/30 bg-gradient-to-br from-fuchsia-950/40 via-zinc-950 to-zinc-950 p-4 animate-fade-in shadow-[0_0_28px_-8px_rgba(217,70,239,0.45)]">
      <div className="flex items-start gap-3">
        <div className="size-10 shrink-0 rounded-full grid place-items-center bg-fuchsia-500/15 border border-fuchsia-400/40 text-fuchsia-200">
          <VenetianMask className="size-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-bold uppercase tracking-wider text-fuchsia-200/90">
            Set Your Corporate Mask 🎭
          </div>
          <p className="text-[12.5px] leading-snug text-muted-foreground mt-0.5">
            One-time setup so the radar can cluster you with nearby colleagues —
            anonymously.
          </p>
        </div>
      </div>

      <div ref={wrapRef} className="relative mt-3">
        <label className="block text-[11px] font-semibold text-fuchsia-100/90 mb-1">
          Which company's ecosystem are you surviving today?
        </label>
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="Start typing… e.g. Infosys, Google, Stealth Startup"
          maxLength={80}
          className="bg-zinc-900/80 border-fuchsia-500/30 text-sm"
          autoComplete="off"
        />
        {open && suggestions.length > 0 && (
          <ul
            role="listbox"
            className="absolute z-20 mt-1 w-full max-h-56 overflow-auto rounded-md border border-fuchsia-500/30 bg-zinc-950/95 shadow-xl"
          >
            {suggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  onClick={() => {
                    setQuery(s);
                    setOpen(false);
                  }}
                  className="w-full text-left px-3 py-1.5 text-[12.5px] text-fuchsia-100 hover:bg-fuchsia-500/15 transition"
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3">
        <label className="block text-[11px] font-semibold text-fuchsia-100/90 mb-1">
          Tech park / zone <span className="text-muted-foreground">(optional)</span>
        </label>
        <Input
          value={zone}
          onChange={(e) => setZone(e.target.value)}
          placeholder="e.g. HITEC City, Whitefield, Cessna Business Park"
          maxLength={80}
          className="bg-zinc-900/80 border-fuchsia-500/30 text-sm"
        />
      </div>

      <p className="mt-3 flex items-start gap-2 text-[11px] leading-snug text-fuchsia-200/80">
        <ShieldCheck className="size-3.5 mt-0.5 shrink-0" />
        <span>
          🔒 Privacy Lock: Your choice is used purely to cluster nearby radar
          blips anonymously. Your personal email is never shared, and no
          official corporate networks are ever contacted.
        </span>
      </p>

      <Button
        type="button"
        onClick={save}
        disabled={saving || !query.trim()}
        className="mt-3 w-full bg-fuchsia-500 hover:bg-fuchsia-400 text-zinc-950 font-bold"
      >
        {saving ? "Locking mask…" : "Lock my mask & enter the feed →"}
      </Button>
    </Card>
  );
}
