// Per-hub vernacular dictionary so UI micro-copy swaps "pub" / "happy hour"
// for the locally idiomatic term whenever the active tech hub changes.
//
// Adding a new term:
//   1. Add the key to `Vernacular`.
//   2. Provide values for every hub (or fall back to DEFAULT_VERNACULAR).
//   3. Consume via `useHubVernacular()` in any component.

import { useCurrentCity } from "@/lib/useCurrentCity";
import type { CityKey } from "@/lib/cityStore";

export type Vernacular = {
  /** Generic word for "pub" — e.g. London uses "pub", Amsterdam "brown café". */
  pub: string;
  /** Plural form. */
  pubs: string;
  /** Generic "happy hour" — Berlin uses "Feierabendbier", Stockholm "Fredagsbar". */
  happyHour: string;
  /** Shoutbox composer placeholder (heavily localized — it sets the tone). */
  shoutboxPlaceholder: string;
  /** Trending list title, e.g. "Trending Happy Hours" / "Trending Aperitivo Spots". */
  trendingTitle: string;
  /** "Watering hole" alias used in radar/ticker copy. */
  wateringHole: string;
};

const DEFAULT_VERNACULAR: Vernacular = {
  pub: "pub",
  pubs: "pubs",
  happyHour: "happy hour",
  shoutboxPlaceholder: "Whisper anonymously to the breakroom...",
  trendingTitle: "Trending Happy Hours",
  wateringHole: "watering hole",
};

const PER_HUB: Partial<Record<CityKey, Partial<Vernacular>>> = {
  London: {
    pub: "pub",
    pubs: "pubs",
    happyHour: "post-work pint",
    shoutboxPlaceholder: "Have a moan in the office breakroom, anonymously...",
    trendingTitle: "Trending Post-Work Pints",
    wateringHole: "boozer",
  },
  Dublin: {
    pub: "pub",
    pubs: "pubs",
    happyHour: "after-work session",
    shoutboxPlaceholder: "Pull up a stool and slag off the standup, anonymously...",
    trendingTitle: "Trending After-Work Sessions",
    wateringHole: "local",
  },
  Berlin: {
    pub: "Kneipe",
    pubs: "Kneipen",
    happyHour: "Feierabendbier",
    shoutboxPlaceholder: "Drop an anonymes Geständnis from the Großraumbüro...",
    trendingTitle: "Trending Feierabend Spots",
    wateringHole: "Späti",
  },
  Amsterdam: {
    pub: "brown café",
    pubs: "brown cafés",
    happyHour: "borrel",
    shoutboxPlaceholder: "Fluister anoniem to the koffiekamer...",
    trendingTitle: "Trending Borrel Spots",
    wateringHole: "brown café",
  },
  Paris: {
    pub: "bistro",
    pubs: "bistros",
    happyHour: "apéro",
    shoutboxPlaceholder: "Chuchote anonymement to the open space...",
    trendingTitle: "Trending Apéro Spots",
    wateringHole: "bar à vin",
  },
  "San Francisco": {
    pub: "bar",
    pubs: "bars",
    happyHour: "happy hour",
    shoutboxPlaceholder: "DM the breakroom on the down-low...",
    trendingTitle: "Trending Happy Hours",
    wateringHole: "tap room",
  },
  Austin: {
    pub: "bar",
    pubs: "bars",
    happyHour: "happy hour",
    shoutboxPlaceholder: "Spill the tea on the standup, anonymously...",
    trendingTitle: "Trending Happy Hours",
    wateringHole: "ice house",
  },
};

export function getHubVernacular(city: CityKey): Vernacular {
  return { ...DEFAULT_VERNACULAR, ...(PER_HUB[city] ?? {}) };
}

export function useHubVernacular(): Vernacular {
  const city = useCurrentCity();
  return getHubVernacular(city);
}
