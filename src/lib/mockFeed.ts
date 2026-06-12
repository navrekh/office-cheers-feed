// Simulated Corporate Pulse engine — mock identities, headlines, and post templates.
// Every generated post uses an id prefixed with "sim-" so the UI can transparently
// flag it as a parody profile and the cheers handler can skip the live RPC.

export const MOCK_NAMES: string[] = [
  "Arjun M.",
  "Sarah K.",
  "Devon T.",
  "Priya R.",
  "Vikram S.",
  "Hannah L.",
  "Marcus W.",
  "Aiko N.",
  "Tomás G.",
  "Brittany O.",
  "Chen H.",
  "Rohan B.",
  "Olivia P.",
  "Kwame A.",
  "Linnea V.",
  "Felipe R.",
  "Anya D.",
  "Jordan F.",
  "Mei-Ling Z.",
  "Trevor J.",
];

export const MOCK_HEADLINES: string[] = [
  "Staff PowerPoint Orchestrator | Ex-FAANG",
  "Principal Backlog Observer | Agile Evangelist",
  "Lead Coffee-to-Code Converter",
  "VP of Middle Management Linearity",
  "Senior Incident Response Denier",
  "Director of Calendar Tetris",
  "Head of Slack Emoji Strategy",
  "Chief Vibes Officer (Self-Appointed)",
  "Distinguished Engineer, Meeting Stretching",
  "Global Lead, Synergy Theatre",
  "Principal Architect of Vague Roadmaps",
  "VP, Quarterly Pivot Operations",
  "Senior Manager, Performative Productivity",
  "Staff SRE, On-Call Avoidance",
  "Lead Recruiter, Ghosting Specialist",
  "Director of Stakeholder Smoothing",
  "Principal Product Vibe-Setter",
  "Head of Open-Floor-Plan Survival",
  "Fractional CMO of LinkedIn Posting",
  "Chief Standup Filibusterer",
];

export const MOCK_POSTS: string[] = [
  "Just approved a budget for an AI tool no one knows how to use. Celebrating with a double IPA.",
  "Our standup turned into a 90-minute lecture on synergy. Liquid lunch initialized.",
  "Nothing says 'Q3 Success' like drinking cheap wine out of a coffee mug during an all-hands call.",
  "Manager said 'let's circle back' three times in one Zoom. Circled back to the bar.",
  "Promoted to Senior Vibes Engineer. Same salary, new title, free office beer Friday.",
  "Spent 2 hours on a deck that will be read for 4 seconds. Reward = pinot noir.",
  "Our retro identified 14 action items. Took ownership of exactly one: opening this bottle.",
  "Skipped the 'optional' all-hands. Voluntary happy hour attendance: 100%.",
  "Got a calendar invite titled 'Quick Sync 🚨'. Opened a stout immediately.",
  "Q4 OKRs dropped. So did I, straight onto a barstool.",
  "Reorg #3 this year. My career ladder is now a career corkscrew.",
  "Submitted my expense report. Suspiciously close to 'team building budget'.",
  "PIP'd a project, not a person. Toasting the difference.",
  "Slack notification at 11pm. Replying with 👍 from the pub.",
  "Layoffs hit the floor below. We hit the bar after.",
  "Hiring manager asked where I see myself in 5 years. 'Closer to last call,' I said.",
  "Quarterly business review = quarterly drinking review.",
  "Our new VP introduced himself with a 47-slide vision deck. We need a stronger pour.",
  "Engineering on-call rotation has me drinking decaf cocktails. Tragic.",
  "Marketing rebranded the company colors. Mood: amber lager.",
  "Customer success keeps escalating. I keep escalating my whiskey order.",
  "Wrote 'as per my last email' four times today. Earned this Negroni.",
  "Fired off a thought leadership post that's 80% buzzwords. Cheers to engagement bait.",
  "Sales kickoff in Vegas. Sober kickoff in 3, 2, 1… nope.",
  "Got volun-told to lead a working group. The work? Group drinking.",
  "Our roadmap is so blue-sky it requires sunscreen and tequila.",
  "Performance review used the phrase 'opportunity for growth.' So is this margarita.",
  "Recruiter said 'we move fast.' Cool, so does this pint.",
  "Adopted a new productivity framework called 'Beer-Driven Development.'",
  "If you can read this, you should be at happy hour by now.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export type SimulatedPost = {
  id: string;
  author_name: string;
  author_headline: string;
  body_text: string;
  cheers_count: number;
  created_at: string;
};

let seq = 0;
function nextSimId(): string {
  seq += 1;
  return `sim-${Date.now().toString(36)}-${seq}-${Math.random().toString(36).slice(2, 7)}`;
}

export function isSimulatedPost(post: { id: string }): boolean {
  return typeof post.id === "string" && post.id.startsWith("sim-");
}

export function generateSimulatedPost(opts?: { createdAt?: Date }): SimulatedPost {
  return {
    id: nextSimId(),
    author_name: pick(MOCK_NAMES),
    author_headline: pick(MOCK_HEADLINES),
    body_text: pick(MOCK_POSTS),
    cheers_count: Math.floor(Math.random() * 480) + 12,
    created_at: (opts?.createdAt ?? new Date()).toISOString(),
  };
}

/**
 * Fisher-Yates (Knuth) in-place shuffle. Returns a NEW array so callers can
 * safely store the result in component state without mutating their source.
 */
export function shuffleArray<T>(input: readonly T[]): T[] {
  const out = input.slice();
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Rolling relative offset (in minutes ago) for the i-th post in a freshly
 * shuffled feed of `total` items. The first three slots are pinned to ~1m,
 * ~5m, ~14m so the top of the feed always feels seconds-fresh on page load;
 * the remainder eases out smoothly to a maximum of 180 minutes (3h).
 */
function rollingMinutesAgo(i: number, total: number): number {
  const PINNED = [1, 5, 14];
  if (i < PINNED.length) return PINNED[i] + Math.random() * 0.8;
  const MAX = 180;
  const start = PINNED[PINNED.length - 1];
  const remaining = Math.max(1, total - PINNED.length);
  // Ease-out curve so later items spread toward 3h without crowding.
  const t = (i - PINNED.length + 1) / remaining;
  const eased = Math.pow(t, 0.85);
  const base = start + eased * (MAX - start);
  const jitter = (Math.random() - 0.5) * 3;
  return Math.min(MAX, Math.max(start + 0.5, base + jitter));
}

/**
 * Seed a freshly shuffled historical timeline (default 30 items) whose
 * timestamps roll forward from "just now" up to a 3h ceiling — so every page
 * load greets the visitor with a hyper-active, freshly-published feed.
 */
export function generateHistoricalSimulatedFeed(count = 30): SimulatedPost[] {
  const now = Date.now();
  // Build raw posts first, then Fisher-Yates shuffle for true sequence randomness.
  const raw = Array.from({ length: count }).map(() => generateSimulatedPost());
  const shuffled = shuffleArray(raw);
  return shuffled.map((post, i) => {
    const minutesAgo = rollingMinutesAgo(i, count);
    const createdAt = new Date(now - minutesAgo * 60 * 1000);
    return { ...post, created_at: createdAt.toISOString() };
  });
}

