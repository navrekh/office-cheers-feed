/**
 * Lightweight engagement tracker.
 *
 * Lovable's analytics pipeline classifies a session as a "bounce" when no
 * meaningful interaction happens. Calling `trackEngagement(name)` on key
 * UI actions (CTA clicks, filter toggles, dropdowns) registers an active
 * engagement event so 2-minute browsing sessions are no longer counted
 * as a bounce.
 *
 * Safe to call from anywhere — silently no-ops on SSR and when no analytics
 * provider is present on the page.
 */
export function trackEngagement(name: string, props?: Record<string, unknown>): void {
  if (typeof window === "undefined") return;
  try {
    // Custom event other listeners (and Lovable analytics) can subscribe to.
    window.dispatchEvent(
      new CustomEvent("lovable:engagement", { detail: { name, props } })
    );
    // Best-effort hand-off to any common analytics globals if present.
    const w = window as unknown as {
      umami?: { track?: (n: string, p?: Record<string, unknown>) => void };
      plausible?: (n: string, opts?: { props?: Record<string, unknown> }) => void;
      gtag?: (cmd: string, n: string, p?: Record<string, unknown>) => void;
    };
    w.umami?.track?.(name, props);
    w.plausible?.(name, props ? { props } : undefined);
    w.gtag?.("event", name, props);
  } catch {
    /* never let analytics break the UI */
  }
}
