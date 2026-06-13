import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Beer } from "lucide-react";

// Public, free QR generator — no extra dependency required.
function qrUrl(payload: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(payload)}`;
}

const FALLBACK_URL = "https://tokenlens.co.in/";

type Props = {
  authorUserId?: string | null;
  authorName: string;
};

export default function BeerTipPopover({ authorUserId, authorName }: Props) {
  const [open, setOpen] = useState(false);
  const [vpa, setVpa] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !authorUserId) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any).rpc("get_user_tip_address", {
        p_user_id: authorUserId,
      });
      if (cancelled) return;
      setVpa(typeof data === "string" ? data : null);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, authorUserId]);

  const target =
    vpa && vpa.trim()
      ? `upi://pay?pa=${encodeURIComponent(vpa.trim())}&pn=${encodeURIComponent(authorName)}&am=50&cu=INR&tn=${encodeURIComponent("DrinkedIn beer fund 🍺")}`
      : FALLBACK_URL;
  const hasVpa = !!(vpa && vpa.trim());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-300 hover:text-amber-200 hover:scale-105 transition-transform"
          aria-label="Buy them a beer"
        >
          <Beer className="size-3.5 animate-pulse" />
          Buy them a Beer 🍺
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-3 border-amber-400/40 bg-gradient-to-br from-amber-950/40 via-card to-card">
        <div className="text-[10px] uppercase tracking-wider font-bold text-amber-300 mb-2">
          Peer Appreciation Wallet
        </div>
        <div className="rounded-md bg-white p-2 flex items-center justify-center">
          <img
            src={qrUrl(target)}
            alt="UPI QR for sending a tip"
            width={200}
            height={200}
            loading="lazy"
            className="rounded"
          />
        </div>
        <p className="text-[11px] leading-snug text-foreground/90 mt-2">
          Think this colleague's boss is a nightmare? Scan to send a{" "}
          <span className="font-bold text-amber-200">₹50 tip</span> directly to
          their beer fund.
        </p>
        <p className="text-[10px] text-muted-foreground/80 mt-1.5">
          {hasVpa
            ? `Tips route to @${authorName}'s linked UPI.`
            : "Author hasn't linked a UPI yet — tip routes to the DrinkedIn engineering beer budget. ☕"}
        </p>
      </PopoverContent>
    </Popover>
  );
}
