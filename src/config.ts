/**
 * Centralized production config for DrinkedIn.
 *
 * Any domain migration (custom domain swap, TokenLens rebrand, etc.) only
 * needs to be made HERE — never hardcode these URLs elsewhere in the app.
 */

export const SITE_URL = "https://drinkedin.me" as const;
export const TOKENLENS_URL = "https://tokenlens.co.in/" as const;

export const SITE = {
  name: "DrinkedIn",
  url: SITE_URL,
  shareUrl: (postId: string) => `${SITE_URL}/?post=${postId}`,
  trackUrl: (ticket: string) => `${SITE_URL}/track/${ticket}`,
} as const;

export const TOKENLENS = {
  url: TOKENLENS_URL,
  label: "TokenLens",
} as const;

/**
 * Safe runtime mode detection. Vite injects import.meta.env.MODE on both the
 * client and during SSR, so the Supabase real-time client channel listeners
 * keep working in either mode — we never branch on `window`/`process` here.
 */
export const IS_PROD = import.meta.env.MODE === "production";
export const IS_DEV = import.meta.env.DEV === true;
