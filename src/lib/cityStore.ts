// Lightweight client-only city store shared across components.
// No external state lib — uses localStorage + window events.

export type CityKey =
  | "Bangalore"
  | "Gurgaon"
  | "Hyderabad"
  | "Pune"
  | "Mumbai"
  | "Delhi";

export const CITIES: CityKey[] = [
  "Bangalore",
  "Gurgaon",
  "Hyderabad",
  "Pune",
  "Mumbai",
  "Delhi",
];

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
