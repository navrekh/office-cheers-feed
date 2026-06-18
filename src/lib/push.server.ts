/**
 * Server-only push sender. Uses the `web-push` library which signs the
 * VAPID JWT and encrypts the payload per RFC 8291. Loaded lazily inside
 * server-fn handlers — never at module scope of a client-reachable file.
 */
import webpush from "web-push";
import { VAPID_PUBLIC_KEY, VAPID_DEFAULT_SUBJECT } from "./push.config";

let configured = false;

function configure() {
  if (configured) return;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey) {
    throw new Error(
      "VAPID_PRIVATE_KEY is not set. Push notifications won't send until the secret is added.",
    );
  }
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || VAPID_DEFAULT_SUBJECT,
    VAPID_PUBLIC_KEY,
    privateKey,
  );
  configured = true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
};

export type Subscription = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

/**
 * Send a single push. Returns { ok, gone } where `gone` indicates the
 * subscription is dead (404/410) and the caller should delete it.
 */
export async function sendPushToSubscription(
  sub: Subscription,
  payload: PushPayload,
): Promise<{ ok: boolean; gone: boolean; status?: number; error?: string }> {
  configure();
  try {
    await webpush.sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth },
      },
      JSON.stringify(payload),
      { TTL: 60 * 60 * 24 }, // 24h
    );
    return { ok: true, gone: false };
  } catch (err: any) {
    const status = err?.statusCode as number | undefined;
    const gone = status === 404 || status === 410;
    return { ok: false, gone, status, error: err?.body || err?.message };
  }
}
