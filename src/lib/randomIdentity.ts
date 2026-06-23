// Random satirical identities + small string helpers used across the landing feed.
// Extracted from src/routes/index.tsx during the 3,661-line cleanup pass.

export const RANDOM_FIRST = ["Brittany", "Chad", "Devon", "Marcus", "Priya", "Ainsley", "Trent", "Kelsey", "Jordan", "Avery", "Skyler", "Hunter"];
export const RANDOM_LAST = ["Sullivan", "Hollows", "Volkov", "Park", "Reyes", "Lambert", "O'Brien", "Ngata", "Whitaker", "Stein", "Vasquez", "Bloom"];

export const RANDOM_TITLES = [
  "Principal Synergy Drinker",
  "Chief Hangover Officer",
  "VP of Liquid Infrastructure",
  "Director of Strategic Pours",
  "Head of Pint-Driven Development",
  "Senior Manager, After-Hours Alignment",
  "Lead Evangelist, Craft Brew Operations",
  "Distinguished Fellow of Post-Mortem Cocktails",
  "Chief of Staff to the Open Bar",
  "Global Lead, Mandatory Fun",
  "Staff Engineer of Liquid Refactoring",
  "Fractional CFO (Chief Fermentation Officer)",
];

export const RANDOM_COMMENT_NAMES = ["Anonymous Intern", "Casey from Comms", "Mid-Level Manager", "Recruiter Bot 9000", "Probably-A-VP"];

export function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomIdentity() {
  return {
    name: `${pick(RANDOM_FIRST)} ${pick(RANDOM_LAST)}`,
    headline: pick(RANDOM_TITLES),
  };
}

export function timeAgo(iso: string) {
  const diff = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function hashStr(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

export function snippetOf(s: string): string {
  const clean = s.replace(/«di-meta»[\s\S]*?«\/di-meta»/g, "").trim();
  return clean.length > 60 ? clean.slice(0, 57) + "…" : clean || "(visual post)";
}
