import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Save (upsert) a browser push subscription for the signed-in user.
 * The endpoint is unique — re-subscribing replaces the prior row.
 */
export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { endpoint: string; p256dh: string; auth: string; userAgent?: string }) => {
    if (!input?.endpoint || !input?.p256dh || !input?.auth) {
      throw new Error("endpoint, p256dh and auth are required");
    }
    return {
      endpoint: String(input.endpoint),
      p256dh: String(input.p256dh),
      auth: String(input.auth),
      userAgent: input.userAgent ? String(input.userAgent).slice(0, 400) : undefined,
    };
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("push_subscriptions")
      .upsert(
        {
          user_id: userId,
          endpoint: data.endpoint,
          p256dh: data.p256dh,
          auth: data.auth,
          user_agent: data.userAgent ?? null,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      );
    if (error) {
      console.error("[savePushSubscription]", error);
      throw new Error("Could not save push subscription");
    }
    return { ok: true };
  });

/** Delete one of the caller's push subscriptions by endpoint. */
export const deletePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { endpoint: string }) => ({
    endpoint: String(input?.endpoint || ""),
  }))
  .handler(async ({ data, context }) => {
    if (!data.endpoint) return { ok: true };
    const { error } = await context.supabase
      .from("push_subscriptions")
      .delete()
      .eq("user_id", context.userId)
      .eq("endpoint", data.endpoint);
    if (error) throw new Error("Could not remove subscription");
    return { ok: true };
  });

/**
 * Record a visit to a public dossier and (if it's a new visit) fan out
 * a web push notification to all the owner's registered devices.
 * Anonymous visitors are allowed — they just don't get attribution.
 */
export const recordProfileVisit = createServerFn({ method: "POST" })
  .inputValidator((input: { handle: string; via?: "web" | "qr" | "link" }) => ({
    handle: String(input?.handle || "").trim().slice(0, 64),
    via: (input?.via === "qr" || input?.via === "link" ? input.via : "web") as
      | "web"
      | "qr"
      | "link",
  }))
  .handler(async ({ data }) => {
    if (!data.handle) return { ok: false, recorded: false, notified: 0 };

    // We need both a user-context client (to record the visit under RLS)
    // and an admin client (to read subscriptions across users for fan-out).
    // Try authenticated first; if there's no bearer token, fall back to anon.
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env.SUPABASE_URL!;
    const pub = process.env.SUPABASE_PUBLISHABLE_KEY!;

    // Forward caller's bearer token if present
    const { getRequestHeader } = await import("@tanstack/react-start/server");
    let authHeader: string | null = null;
    try {
      authHeader = getRequestHeader("authorization") ?? null;
    } catch {}

    const userClient = createClient(url, pub, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
      global: authHeader ? { headers: { Authorization: authHeader } } : undefined,
    });

    const { data: rpc, error } = await (userClient as any).rpc("record_profile_visit", {
      p_handle: data.handle,
      p_via: data.via,
    });
    if (error) {
      console.error("[recordProfileVisit] rpc error", error);
      return { ok: false, recorded: false, notified: 0 };
    }
    const row = Array.isArray(rpc) ? rpc[0] : rpc;
    if (!row?.is_new) {
      return { ok: true, recorded: false, notified: 0 };
    }

    // New visit — fire pushes to owner's devices.
    let notified = 0;
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: subs } = await supabaseAdmin
        .from("push_subscriptions")
        .select("endpoint, p256dh, auth")
        .eq("user_id", row.owner_id);

      if (subs && subs.length > 0) {
        const { sendPushToSubscription } = await import("./push.server");
        const visitor = row.visitor_handle ? `@${row.visitor_handle}` : "A stranger";
        const payload = {
          title: "🕵️ Dossier decoded",
          body: `${visitor} just opened your Spy Dossier.`,
          url: "/profile",
          tag: "dossier-visit",
        };
        const results = await Promise.all(
          subs.map((s: any) => sendPushToSubscription(s, payload)),
        );
        notified = results.filter((r) => r.ok).length;

        // Cleanup dead subscriptions
        const dead = subs.filter((_: any, i: number) => results[i].gone).map((s: any) => s.endpoint);
        if (dead.length > 0) {
          await supabaseAdmin.from("push_subscriptions").delete().in("endpoint", dead);
        }
      }
    } catch (e) {
      // Never fail the visit record because pushes failed
      console.error("[recordProfileVisit] push fan-out error", e);
    }

    return { ok: true, recorded: true, notified };
  });

/** Pull the signed-in user's recent visit log. */
export const getRecentVisits = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await (context.supabase as any).rpc("get_recent_visits", {
      p_limit: 25,
    });
    if (error) {
      console.error("[getRecentVisits]", error);
      return [] as Array<{ id: string; visitor_handle: string | null; via: string; created_at: string }>;
    }
    return (data ?? []) as Array<{
      id: string;
      visitor_handle: string | null;
      via: string;
      created_at: string;
    }>;
  });
