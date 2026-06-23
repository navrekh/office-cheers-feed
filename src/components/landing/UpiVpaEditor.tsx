import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

export function UpiVpaEditor({
  userId,
  initial,
  onSaved,
}: {
  userId: string;
  initial: string | null;
  onSaved: () => void;
}) {
  const [vpa, setVpa] = useState(initial ?? "");
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    setVpa(initial ?? "");
  }, [initial]);

  async function save() {
    const clean = vpa.trim();
    if (clean && !/^[a-z0-9._-]{2,}@[a-z]{2,}$/i.test(clean)) {
      toast.error("That doesn't look like a UPI VPA (e.g. yourname@upi).");
      return;
    }
    setSaving(true);
    const { error } = await (supabase as unknown as {
      from: (t: string) => {
        update: (v: Record<string, unknown>) => {
          eq: (col: string, val: string) => Promise<{ error: { message: string } | null }>;
        };
      };
    })
      .from("profiles")
      .update({ upi_vpa: clean || null })
      .eq("id", userId);
    setSaving(false);
    if (error) {
      toast.error("Couldn't save your tip handle. Try again in a sec.");
      return;
    }
    toast.success("Beer fund handle saved 🍺");
    onSaved();
  }

  return (
    <div className="mt-3 rounded-md border border-amber-400/30 bg-amber-500/5 p-2.5">
      <label className="text-[10px] uppercase tracking-wider font-bold text-amber-200/90">
        Beer-Fund UPI VPA
      </label>
      <p className="text-[10px] text-muted-foreground mb-1.5">
        Optional. Lets colleagues tip you ₹50 via the "Buy them a Beer 🍺" QR.
      </p>
      <div className="flex gap-1.5">
        <Input
          value={vpa}
          onChange={(e) => setVpa(e.target.value)}
          placeholder="yourname@upi"
          maxLength={120}
          className="h-8 text-[12px]"
        />
        <Button
          type="button"
          size="sm"
          onClick={save}
          disabled={saving || vpa === (initial ?? "")}
          className="h-8 px-3 bg-amber-500 hover:bg-amber-400 text-amber-950 text-[11px] font-bold"
        >
          {saving ? "…" : "Save"}
        </Button>
      </div>
    </div>
  );
}

export default UpiVpaEditor;
