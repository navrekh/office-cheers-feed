import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  CreditCard, Clock, CheckCircle2, ReceiptText, Smartphone, ExternalLink, Send,
} from "lucide-react";

type Props = { userId: string; pubName: string | null };

const UPI_PAYEE = "9740068614@axl"; // configurable UPI VPA
const UPI_NAME = "DrinkedIn Sponsorship";
const UPI_AMOUNT = 599;
const RENEWAL_URL = "https://rzp.io/rzp/qFoLyja";
const WHATSAPP_URL = "https://wa.me/919740068614?text=Hi%20DrinkedIn%2C%20I%27ve%20renewed%20my%20sponsorship.";

function buildUpiLink(note: string) {
  const params = new URLSearchParams({
    pa: UPI_PAYEE,
    pn: UPI_NAME,
    am: String(UPI_AMOUNT),
    cu: "INR",
    tn: note,
  });
  return `upi://pay?${params.toString()}`;
}

function qrUrl(payload: string) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&margin=4&data=${encodeURIComponent(payload)}`;
}

function fmtDate(d: Date) {
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
}

export default function BillingTab({ userId, pubName }: Props) {
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [activatedAt, setActivatedAt] = useState<string | null>(null);
  const [isActive, setIsActive] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!pubName) return;
    let cancelled = false;
    (async () => {
      const { data } = await (supabase as any)
        .from("merchant_deals")
        .select("expires_at, activated_at, is_active")
        .ilike("pub_name", pubName)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setExpiresAt(data?.expires_at ?? null);
      setActivatedAt(data?.activated_at ?? null);
      setIsActive(!!data?.is_active);
    })();
    return () => { cancelled = true; };
  }, [pubName]);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);

  const totalMs = 7 * 24 * 3600_000;
  const remainingMs = expiresAt ? Math.max(0, new Date(expiresAt).getTime() - now) : 0;
  const elapsedMs = expiresAt ? Math.min(totalMs, totalMs - remainingMs) : 0;
  const pct = expiresAt ? Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100)) : 0;
  const hoursLeft = Math.floor(remainingMs / 3600_000);
  const expired = !expiresAt || remainingMs <= 0 || !isActive;
  const renewSoon = !expired && hoursLeft <= 36;

  const invoices = useMemo(() => buildMockInvoices(activatedAt), [activatedAt]);

  const upiNote = `DrinkedIn Renewal · ${pubName || "Merchant"} · ${userId.slice(0, 8)}`;
  const upiLink = buildUpiLink(upiNote);

  async function notifyAdmin() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("billing_requests").insert({
        user_id: userId,
        pub_name: pubName,
        amount_inr: UPI_AMOUNT,
        status: "pending",
        note: upiNote,
      });
      if (error) throw error;
      toast.success("Payment notification sent to headquarters! 🚀", {
        description: "Our verification desk will audit the UPI ledger and keep your live radar blips running without a millisecond of downtime.",
      });
    } catch (e: any) {
      toast.error("Couldn't notify HQ", { description: e?.message ?? "Try again in a sec." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Component A — Current Plan Status */}
      <Card className="p-5 border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-zinc-900 to-zinc-950">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <CreditCard className="size-4 text-amber-300" />
              <h2 className="text-sm font-bold uppercase tracking-wider">Current Plan</h2>
            </div>
            <div className="text-2xl font-extrabold text-amber-100">Weekly Sponsored Tier</div>
            <div className="text-[12px] text-muted-foreground mt-0.5">
              ₹{UPI_AMOUNT} / week · 168 hours of hyper-local radar visibility
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold border ${
              expired
                ? "border-red-400/50 bg-red-500/20 text-red-100"
                : "border-emerald-400/50 bg-emerald-500/20 text-emerald-100"
            }`}
          >
            <span className={`size-1.5 rounded-full ${expired ? "bg-red-400" : "bg-emerald-400 animate-pulse"}`} />
            {expired ? "Expired" : "Live"}
          </span>
        </div>

        <div className="mt-4">
          <div className="flex items-center justify-between text-[11px] mb-1.5">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="size-3" />
              {expired ? "Slot ended" : `${hoursLeft}h of 168h remaining`}
            </span>
            <span className="font-mono text-amber-200">{Math.round(pct)}%</span>
          </div>
          <div className="h-2 rounded-full bg-zinc-800 overflow-hidden">
            <div
              className={`h-full transition-[width] duration-500 ${
                expired
                  ? "bg-red-500"
                  : renewSoon
                    ? "bg-gradient-to-r from-amber-500 to-red-500"
                    : "bg-gradient-to-r from-emerald-400 to-amber-400"
              }`}
              style={{ width: `${pct}%` }}
            />
          </div>
          {expiresAt && (
            <p className="text-[10px] text-muted-foreground mt-1.5 font-mono">
              Activated {activatedAt ? new Date(activatedAt).toLocaleString() : "—"} · Expires {new Date(expiresAt).toLocaleString()}
            </p>
          )}
        </div>
      </Card>

      {/* Component B — Invoice Ledger */}
      <Card className="p-5 border-border bg-zinc-950/60">
        <div className="flex items-center gap-2 mb-3">
          <ReceiptText className="size-4 text-sky-300" />
          <h2 className="text-sm font-bold uppercase tracking-wider">Invoice Ledger</h2>
        </div>
        <div className="overflow-x-auto -mx-2">
          <table className="w-full text-[12px]">
            <thead>
              <tr className="text-left text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="px-2 py-2">Date</th>
                <th className="px-2 py-2">Invoice ID</th>
                <th className="px-2 py-2">Amount</th>
                <th className="px-2 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((row, i) => (
                <tr
                  key={row.id}
                  className={`border-b border-border/60 ${i % 2 === 0 ? "bg-zinc-900/30" : ""}`}
                >
                  <td className="px-2 py-2.5 font-mono text-foreground/90">{row.date}</td>
                  <td className="px-2 py-2.5 font-mono text-amber-200">{row.id}</td>
                  <td className="px-2 py-2.5 font-semibold">₹{row.amount.toFixed(2)}</td>
                  <td className="px-2 py-2.5">
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 border border-emerald-400/40 text-emerald-200 px-2 py-0.5 text-[10px] font-bold">
                      <CheckCircle2 className="size-3" /> Paid Successfully ✔️
                    </span>
                  </td>
                </tr>
              ))}
              {invoices.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-2 py-6 text-center text-muted-foreground text-[12px]">
                    No invoices yet — your first ledger entry posts after launch.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Renewal QR + Notify */}
      <Card
        className={`p-5 ${
          renewSoon || expired
            ? "border-red-400/50 bg-gradient-to-br from-red-500/10 via-amber-500/5 to-zinc-950"
            : "border-amber-400/30 bg-zinc-950/60"
        }`}
      >
        <div className="flex items-center gap-2 mb-1">
          <Smartphone className="size-4 text-amber-300" />
          <h2 className="text-sm font-bold uppercase tracking-wider">
            Instant Subscription Renewal Manager 🍻
          </h2>
        </div>
        <p className="text-[11px] text-muted-foreground mb-4">
          {expired
            ? "Your slot expired — scan to instantly republish your radar pings."
            : renewSoon
              ? "Slot wraps in under 36 hours. Renew now to avoid a gap."
              : "Pre-pay for next week anytime — additional days are added to your current expiry."}
        </p>

        <div className="grid md:grid-cols-[auto_1fr] gap-5 items-start">
          <div className="rounded-lg border border-amber-400/30 bg-white p-3 mx-auto md:mx-0">
            <img
              src={qrUrl(upiLink)}
              alt="UPI renewal QR code"
              width={240}
              height={240}
              loading="lazy"
              className="block"
            />
            <p className="text-[10px] text-zinc-700 text-center mt-1 font-mono break-all">
              {UPI_PAYEE}
            </p>
          </div>
          <div className="space-y-3">
            <p className="text-[12px] leading-relaxed text-foreground/90">
              Scan this custom UPI QR via <strong>GooglePay</strong>, <strong>PhonePe</strong>, or <strong>Paytm</strong> to seamlessly extend your hyper-local ad visibility for another 7 days (168 hours).
            </p>
            <div className="grid sm:grid-cols-2 gap-2">
              <Button
                asChild
                className="bg-gradient-to-r from-amber-500 to-amber-400 hover:brightness-110 text-amber-950 font-bold h-10"
              >
                <a href={upiLink}>
                  <Smartphone className="size-4 mr-1.5" />
                  Open UPI App
                </a>
              </Button>
              <Button asChild variant="outline" className="h-10 border-amber-400/40 hover:bg-amber-500/10">
                <a href={RENEWAL_URL} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="size-4 mr-1.5" />
                  Pay via Razorpay
                </a>
              </Button>
              <Button
                onClick={notifyAdmin}
                disabled={submitting}
                className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 font-bold h-10 sm:col-span-2"
              >
                <Send className="size-4 mr-1.5" />
                {submitting ? "Notifying HQ…" : "I've Made the Payment 📲"}
              </Button>
              <Button asChild variant="ghost" className="h-9 sm:col-span-2 text-[11px] text-muted-foreground hover:text-foreground">
                <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  Or ping the WhatsApp business hub →
                </a>
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground">
              Amount: <span className="font-mono text-amber-200">₹{UPI_AMOUNT}.00</span> · Reference: <span className="font-mono">{upiNote}</span>
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}

/* Mock past invoices derived from current activation date */
function buildMockInvoices(activatedAt: string | null) {
  if (!activatedAt) return [];
  const base = new Date(activatedAt);
  const rows: { id: string; date: string; amount: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const d = new Date(base.getTime() - i * 7 * 24 * 3600_000);
    rows.push({
      id: `INV-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`,
      date: fmtDate(d),
      amount: 599,
    });
  }
  return rows;
}
