// Lightweight client-only city store + merchant directory shared across components.

export type CityKey =
  | "Bangalore"
  | "Gurgaon"
  | "Hyderabad"
  | "Pune"
  | "Mumbai"
  | "Delhi"
  | "Austin"
  | "San Francisco"
  | "London";

export const CITIES: CityKey[] = [
  "Bangalore",
  "Gurgaon",
  "Hyderabad",
  "Pune",
  "Mumbai",
  "Delhi",
  "Austin",
  "San Francisco",
  "London",
];

export type Merchant = {
  id: string;
  name: string;
  area: string;
  deal: string;
  website: string;
  map_query_address: string;
  base_heading: number;
};

export const MERCHANTS: Record<CityKey, Merchant[]> = {
  Bangalore: [
    {
      id: "blr-toit",
      name: "Toit",
      area: "Indiranagar · 100 Feet Road",
      deal: "2+1 on all house crafts for IT pros who flash their DrinkedIn feed.",
      website: "https://toit.in/",
      map_query_address: "Toit Brewpub, 100 Feet Road, Indiranagar, Bangalore",
      base_heading: 47,
    },
    {
      id: "blr-arbor",
      name: "Arbor Brewing Co.",
      area: "Magrath Road · Ashok Nagar",
      deal: "Free pretzel basket with any pitcher before 8 PM.",
      website: "https://arborbrewing.com/",
      map_query_address: "Arbor Brewing Company, Magrath Road, Bangalore",
      base_heading: 31,
    },
    {
      id: "blr-byg",
      name: "Byg Brewski",
      area: "Sarjapur · Outer Ring Rd",
      deal: "Engineers with red CI builds get ₹1 lager refills till 7:30 PM.",
      website: "https://bygbrewski.com/",
      map_query_address: "Byg Brewski Brewing Company, Sarjapur Road, Bangalore",
      base_heading: 56,
    },
    {
      id: "blr-windmills",
      name: "Windmills Craftworks",
      area: "Whitefield · EPIP Zone",
      deal: "Standup ran past noon? 1+1 on Belgian wits till 6 PM.",
      website: "https://windmillscraftworks.com/",
      map_query_address: "Windmills Craftworks, Whitefield, Bangalore",
      base_heading: 24,
    },
  ],
  Gurgaon: [
    {
      id: "ggn-striker",
      name: "Striker Pub & Brewery",
      area: "Cyberhub · DLF Cyber City",
      deal: "1+1 pitchers before 7 PM for anyone showing a red CI build on screen.",
      website: "https://strikerpub.com/",
      map_query_address: "Striker Pub and Brewery, Cyberhub, Gurgaon",
      base_heading: 38,
    },
    {
      id: "ggn-soi7",
      name: "Soi 7 Brewpub",
      area: "Cyberhub · Tower B",
      deal: "Buy 1 get 1 on Thai pints for clock-out crowd 5–7 PM.",
      website: "https://soi7gurgaon.com/",
      map_query_address: "Soi 7 Pub and Brewery, Cyberhub, Gurgaon",
      base_heading: 29,
    },
    {
      id: "ggn-imperfecto",
      name: "Imperfecto Shor",
      area: "Sector 29 · Leisure Valley",
      deal: "Pitcher + nachos combo at ₹999 for any team of 4 engineers.",
      website: "https://imperfecto.in/",
      map_query_address: "Imperfecto Shor, Sector 29, Gurgaon",
      base_heading: 41,
    },
  ],
  Hyderabad: [
    {
      id: "hyd-prost",
      name: "Prost Brewpub",
      area: "HITEC City · Jubilee Enclave",
      deal: "Buy-1-get-1 wheat beers for badge-flashing engineers till 8 PM.",
      website: "https://prostbrewpub.com/",
      map_query_address: "Prost Brewpub, Jubilee Enclave, Hyderabad",
      base_heading: 29,
    },
    {
      id: "hyd-overdose",
      name: "Over The Moon Brewing Co.",
      area: "Gachibowli · Financial District",
      deal: "₹250 IPA pints for the first 40 devs through the door tonight.",
      website: "https://overthemoonbrewing.com/",
      map_query_address: "Over The Moon Brewing Company, Gachibowli, Hyderabad",
      base_heading: 22,
    },
    {
      id: "hyd-heart",
      name: "Heart Cup Coffee Brewpub",
      area: "Kondapur · Botanical Gardens",
      deal: "Free hops appetizer with any 2-pint order before 9 PM.",
      website: "https://heartcupcoffee.com/",
      map_query_address: "Heart Cup Coffee, Kondapur, Hyderabad",
      base_heading: 18,
    },
  ],
  Pune: [
    {
      id: "pnq-ibc",
      name: "Independence Brewing Co.",
      area: "Koregaon Park · Mundhwa Rd",
      deal: "₹199 pints for the next 30 developers through the door.",
      website: "https://independencebrewingcompany.com/",
      map_query_address: "Independence Brewing Company, Koregaon Park, Pune",
      base_heading: 22,
    },
    {
      id: "pnq-effingut",
      name: "Effingut Brewerkz",
      area: "Viman Nagar · Lane 6",
      deal: "Flash standup tonight = 2 free pints for the loser of last sprint.",
      website: "https://effingut.com/",
      map_query_address: "Effingut Brewerkz, Viman Nagar, Pune",
      base_heading: 27,
    },
    {
      id: "pnq-doolally",
      name: "Doolally Taproom",
      area: "Kalyani Nagar · Suyash Park",
      deal: "Free board game + 1+1 saisons every Wed for tech teams of 6+.",
      website: "https://doolally.in/",
      map_query_address: "Doolally Taproom, Kalyani Nagar, Pune",
      base_heading: 19,
    },
  ],
  Mumbai: [
    {
      id: "bom-bse",
      name: "The Bar Stock Exchange",
      area: "BKC · Bandra Kurla Complex",
      deal: "Live ticker pricing on lagers until your sprint ends.",
      website: "https://thebarstockexchange.com/",
      map_query_address: "The Bar Stock Exchange, BKC, Mumbai",
      base_heading: 41,
    },
    {
      id: "bom-toit",
      name: "Toit Mumbai",
      area: "Lower Parel · Kamala Mills",
      deal: "Apricot Ale buy-1-get-1 for the 6 PM tech rush.",
      website: "https://toit.in/",
      map_query_address: "Toit Brewpub, Kamala Mills, Lower Parel, Mumbai",
      base_heading: 33,
    },
    {
      id: "bom-woodside",
      name: "Woodside Inn",
      area: "Colaba · Causeway",
      deal: "House lager pitcher ₹699 every weekday till 8 PM.",
      website: "https://woodsideinn.in/",
      map_query_address: "Woodside Inn, Colaba Causeway, Mumbai",
      base_heading: 21,
    },
  ],
  Delhi: [
    {
      id: "del-social",
      name: "Social Offline",
      area: "Aerocity · Worldmark 1",
      deal: "First round comped for anyone with a failed deploy on their laptop.",
      website: "https://socialoffline.in/",
      map_query_address: "Social Aerocity, Worldmark 1, New Delhi",
      base_heading: 31,
    },
    {
      id: "del-perch",
      name: "Perch Wine & Coffee Bar",
      area: "Khan Market",
      deal: "5–7 PM happy hour: any 2 glasses of wine at ₹999.",
      website: "https://perch.in/",
      map_query_address: "Perch Wine and Coffee Bar, Khan Market, New Delhi",
      base_heading: 17,
    },
    {
      id: "del-sutra",
      name: "Sutra Gastropub",
      area: "Connaught Place · Block N",
      deal: "Engineering teams of 4+ get a free starter platter.",
      website: "https://sutragastropub.com/",
      map_query_address: "Sutra Gastropub, Connaught Place, New Delhi",
      base_heading: 23,
    },
  ],
  // International hubs — venue partnerships ship later; empty for now.
  Austin: [],
  "San Francisco": [],
  London: [],
};

export const FLASH_DEALS: Record<CityKey, string> = {
  Bangalore:
    "⚡ FLASH DEAL at Toit Indiranagar: Server crashed at a major tech park? First 50 developers to show their terminal screen get a free stout — right now.",
  Gurgaon:
    "⚡ CYBERHUB SPECIAL: Concurrency errors on your production branch? Show this screen at Striker for 1+1 on pitchers before 7 PM.",
  Hyderabad:
    "⚡ HITEC CITY: Stuck on a Jira sprint? Prost Brewpub is pouring buy-1-get-1 wheat beers for badge-flashing engineers till 8 PM.",
  Pune:
    "⚡ KOREGAON PARK: Standup ran 90 minutes? Independence Brewing Co. is dropping ₹199 pints for the next 30 developers through the door.",
  Mumbai:
    "⚡ BKC FLASH: PRs piling up? The Bar Stock Exchange just crashed lager prices — live ticker pricing until your sprint ends.",
  Delhi:
    "⚡ AEROCITY: Deployment failed at 6 PM? Social Offline is comping the first round for anyone with a red CI build on screen.",
  Austin:
    "⚡ SILICON HILLS: Build red on main? Roll into Domain for $4 craft pints — sprint guilt absolved by 6 PM.",
  "San Francisco":
    "⚡ SOMA FLASH: PagerDuty buzzing again? Mission Bay taprooms are pouring half-off IPAs until your incident clears.",
  London:
    "⚡ SHOREDITCH: Sprint review went sideways? Silicon Roundabout pubs are dropping £4 pints for the post-standup crowd.",
};

const KEY = "drinkedin.selectedCity";
const EVT = "drinkedin:city-change";

export function getSelectedCity(): CityKey {
  if (typeof window === "undefined") return "Bangalore";
  const v = window.localStorage.getItem(KEY) as CityKey | null;
  return v && CITIES.includes(v) ? v : "Bangalore";
}

export function setSelectedCity(city: CityKey) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, city);
  window.dispatchEvent(new CustomEvent(EVT, { detail: city }));
}

export function subscribeCity(cb: (c: CityKey) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<CityKey>).detail);
  window.addEventListener(EVT, handler);
  return () => window.removeEventListener(EVT, handler);
}

// --- Google Maps deep-link helper (works on desktop + mobile native apps) ---
export function mapsDirectionsUrl(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// --- Ad preview highlight pulse (Sponsor & Claim modal → sidebar slot) ---
const PREVIEW_EVT = "drinkedin:ad-preview";

export function triggerAdPreview(ms = 4000) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(PREVIEW_EVT, { detail: ms }));
}

export function subscribeAdPreview(cb: (ms: number) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<number>).detail ?? 4000);
  window.addEventListener(PREVIEW_EVT, handler);
  return () => window.removeEventListener(PREVIEW_EVT, handler);
}
