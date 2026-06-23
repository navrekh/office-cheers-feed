// Client-side spam guard + happy-hour helper, extracted from src/routes/index.tsx
// during the 3,661-line cleanup pass. Pure utilities — no React, no JSX.

const RATE_KEY = "drinkedin.rate.posts";
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 2;

export function checkRateLimit(): { ok: boolean; retryInMs: number } {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    const now = Date.now();
    const arr: number[] = raw ? JSON.parse(raw) : [];
    const recent = arr.filter((t) => now - t < RATE_WINDOW_MS);
    if (recent.length >= RATE_MAX) {
      const retry = RATE_WINDOW_MS - (now - recent[0]);
      return { ok: false, retryInMs: Math.max(retry, 30_000) };
    }
    return { ok: true, retryInMs: 0 };
  } catch {
    return { ok: true, retryInMs: 0 };
  }
}

export function recordPostTimestamp() {
  try {
    const raw = localStorage.getItem(RATE_KEY);
    const arr: number[] = raw ? JSON.parse(raw) : [];
    arr.push(Date.now());
    const trimmed = arr.slice(-10);
    localStorage.setItem(RATE_KEY, JSON.stringify(trimmed));
  } catch {}
}

export function sanitizePostBody(raw: string): { ok: boolean; reason?: string; clean: string } {
  const clean = raw.trim();
  if (!clean) return { ok: false, reason: "Empty post — even silence costs HR money.", clean };
  if (/(.)\1{6,}/.test(clean)) return { ok: false, reason: "Repetitive character spam detected. Sober up the keyboard.", clean };
  if (clean.length < 2) return { ok: false, reason: "Too short to be a hot take.", clean };
  return { ok: true, clean };
}

export function isHappyHourNow(d: Date = new Date()): boolean {
  const minutes = d.getHours() * 60 + d.getMinutes();
  return minutes >= 16 * 60 + 30 && minutes < 18 * 60;
}
