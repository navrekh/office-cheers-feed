import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "crypto";

// Razorpay Payment Link webhook → extends a merchant's 7-day ad slot.
//
// Setup (one-time):
//   1. In Razorpay Dashboard → Settings → Webhooks, add:
//        URL:     https://<your-domain>/api/public/webhooks/razorpay
//        Events:  payment_link.paid  (and optionally payment.captured)
//        Secret:  any strong random string → save it as RAZORPAY_WEBHOOK_SECRET
//   2. When generating a Payment Link for a merchant, set the link's
//      `notes` to: { pub_name: "<their pub>", city: "<their city>" }.
//      The webhook uses those to find and extend the right deal row.
//
// What it does on `payment_link.paid`:
//   • verifies the HMAC signature on the raw body (timing-safe)
//   • logs a row in `advertiser_leads` for follow-up / audit
//   • if `notes.pub_name` matches an active deal, extends its `expires_at`
//     by 7 days from now and re-activates it.

export const Route = createFileRoute("/api/public/webhooks/razorpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) {
          return new Response("Webhook secret not configured", { status: 500 });
        }

        const signature = request.headers.get("x-razorpay-signature") ?? "";
        const raw = await request.text();

        const expected = createHmac("sha256", secret).update(raw).digest("hex");
        const a = Buffer.from(signature);
        const b = Buffer.from(expected);
        if (a.length !== b.length || !timingSafeEqual(a, b)) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: any;
        try {
          payload = JSON.parse(raw);
        } catch {
          return new Response("Bad JSON", { status: 400 });
        }

        const event: string = payload?.event ?? "";
        if (event !== "payment_link.paid" && event !== "payment.captured") {
          return new Response("ok", { status: 200 });
        }

        const linkEntity =
          payload?.payload?.payment_link?.entity ??
          payload?.payload?.payment?.entity ??
          {};
        const paymentEntity = payload?.payload?.payment?.entity ?? {};
        const notes: Record<string, string> = linkEntity.notes ?? paymentEntity.notes ?? {};
        const pubName = (notes.pub_name ?? "").trim();
        const city = (notes.city ?? "").trim();
        const email: string =
          paymentEntity.email ?? linkEntity.customer?.email ?? "";
        const contact: string =
          paymentEntity.contact ?? linkEntity.customer?.contact ?? "";
        const amountPaise: number =
          paymentEntity.amount ?? linkEntity.amount_paid ?? 0;

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        // Always log the inbound payment for manual reconciliation.
        await supabaseAdmin.from("advertiser_leads").insert({
          pub_name: pubName || "(unknown)",
          city: city || "(unknown)",
          contact_info: JSON.stringify({
            email,
            contact,
            amount_inr: amountPaise / 100,
            razorpay_payment_id: paymentEntity.id ?? null,
            razorpay_link_id: linkEntity.id ?? null,
            event,
          }),
        });

        // If we have a pub_name, extend the matching active deal by 7 days.
        if (pubName) {
          const renewedAt = new Date();
          const expiresAt = new Date(renewedAt.getTime() + 7 * 24 * 60 * 60 * 1000);

          let query = supabaseAdmin
            .from("merchant_deals")
            .update({
              is_active: true,
              activated_at: renewedAt.toISOString(),
              expires_at: expiresAt.toISOString(),
            })
            .ilike("pub_name", pubName);
          if (city) query = query.ilike("city", city);

          const { error } = await query;
          if (error) {
            console.error("[razorpay-webhook] extend failed", error);
            return new Response("Logged but extend failed", { status: 202 });
          }
        }

        return new Response("ok", { status: 200 });
      },
    },
  },
});
