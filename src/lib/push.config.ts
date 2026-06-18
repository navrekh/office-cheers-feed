/**
 * VAPID public key — safe to expose in the browser (this is its purpose).
 * The matching PRIVATE key lives ONLY as the VAPID_PRIVATE_KEY server secret.
 */
export const VAPID_PUBLIC_KEY =
  "BEl2rKRvOI-RTI8ANHTekQbwrjSi-_lF3WpVxBD-gKnHgYxOCU1dfInC8HSkzxlySxcZaYqkgq9Pf1nQFh2sK8U";

/** Default contact for VAPID subject — overridable via VAPID_SUBJECT secret. */
export const VAPID_DEFAULT_SUBJECT = "mailto:hello@drinkedin.me";

/** Convert URL-safe base64 VAPID key into a Uint8Array for PushManager.subscribe. */
export function urlBase64ToUint8Array(base64: string): Uint8Array {
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const padded = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(padded);
  const arr = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; ++i) arr[i] = raw.charCodeAt(i);
  return arr;
}
