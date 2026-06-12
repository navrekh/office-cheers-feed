// Lightweight metadata envelope tucked into a post's body_text so we don't
// need a schema migration to support GIFs + vibe headers.
//
// Format (single line, parsed-then-stripped on render):
//   «di-meta»{"v":"liquid-lunch","g":"https://media.giphy.com/..."}«/di-meta»\n<actual body>
//
// Forward compatible: if a real `attached_visual_url` / `vibe` column is added
// later, swap the parser, leave the renderer untouched.

const OPEN = "«di-meta»";
const CLOSE = "«/di-meta»";

export type PostMeta = {
  vibe?: string;
  gif?: string;
  /** Tribal office-rivalry tag — author's self-declared company mask. */
  company?: string;
};

export function encodePostMeta(meta: PostMeta, body: string): string {
  const clean: PostMeta = {};
  if (meta.vibe) clean.vibe = meta.vibe;
  if (meta.gif) clean.gif = meta.gif;
  if (meta.company) clean.company = meta.company;
  if (!clean.vibe && !clean.gif && !clean.company) return body;
  const packed = JSON.stringify({ v: clean.vibe, g: clean.gif, c: clean.company });
  return `${OPEN}${packed}${CLOSE}\n${body}`;
}

export function decodePostMeta(raw: string): { meta: PostMeta; body: string } {
  if (!raw || !raw.startsWith(OPEN)) return { meta: {}, body: raw };
  const end = raw.indexOf(CLOSE);
  if (end < 0) return { meta: {}, body: raw };
  const json = raw.slice(OPEN.length, end);
  let parsed: any = {};
  try {
    parsed = JSON.parse(json);
  } catch {
    return { meta: {}, body: raw };
  }
  const rest = raw.slice(end + CLOSE.length).replace(/^\n/, "");
  const meta: PostMeta = {};
  if (typeof parsed?.v === "string") meta.vibe = parsed.v;
  if (typeof parsed?.g === "string" && /^https:\/\//i.test(parsed.g)) {
    meta.gif = parsed.g;
  }
  if (typeof parsed?.c === "string" && parsed.c.length < 80) {
    meta.company = parsed.c;
  }
  return { meta, body: rest };
}
