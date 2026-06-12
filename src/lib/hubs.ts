// Global tech-hub network configuration. Owns the canonical metadata for
// every city DrinkedIn lights up across — coordinates, neighborhood zones,
// currency hint, and a region grouping for the sleek hub-switcher dropdown.
//
// This file is the single source of truth for hub coordinates and zones.
// The legacy CITIES array in cityStore.ts now mirrors HUBS.map(h => h.city).

import type { CityKey } from "@/lib/cityStore";

export type RegionKey = "India" | "North America" | "Europe";

export type Hub = {
  city: CityKey;
  country: string;
  flag: string;
  region: RegionKey;
  currency: "INR" | "USD" | "GBP" | "EUR";
  /** Hub centroid — useful for radar default origin when geo is denied. */
  coords: { lat: number; lng: number };
  /** Localized neighborhood / tech-park zones used by the burnout leaderboard. */
  zones: string[];
  /** IANA timezones we pattern-match against `Intl.DateTimeFormat().resolvedOptions().timeZone`. */
  timezones: string[];
};

export const HUBS: Hub[] = [
  // ---- India ----
  {
    city: "Bangalore",
    country: "India",
    flag: "🇮🇳",
    region: "India",
    currency: "INR",
    coords: { lat: 12.9716, lng: 77.5946 },
    zones: ["Indiranagar", "Whitefield", "Koramangala", "HSR Layout", "Marathahalli"],
    timezones: ["Asia/Kolkata", "Asia/Calcutta"],
  },
  {
    city: "Pune",
    country: "India",
    flag: "🇮🇳",
    region: "India",
    currency: "INR",
    coords: { lat: 18.5204, lng: 73.8567 },
    zones: [
      "Hinjawadi Infotech Park",
      "Magarpatta Cybercity",
      "Koregaon Park",
      "Kalyani Nagar",
    ],
    timezones: ["Asia/Kolkata"],
  },
  {
    city: "Gurgaon",
    country: "India",
    flag: "🇮🇳",
    region: "India",
    currency: "INR",
    coords: { lat: 28.4595, lng: 77.0266 },
    zones: ["Cyber City", "Udyog Vihar", "Sector 29", "Golf Course Road"],
    timezones: ["Asia/Kolkata"],
  },
  {
    city: "Hyderabad",
    country: "India",
    flag: "🇮🇳",
    region: "India",
    currency: "INR",
    coords: { lat: 17.385, lng: 78.4867 },
    zones: ["HITEC City", "Gachibowli", "Kondapur", "Madhapur"],
    timezones: ["Asia/Kolkata"],
  },
  {
    city: "Mumbai",
    country: "India",
    flag: "🇮🇳",
    region: "India",
    currency: "INR",
    coords: { lat: 19.076, lng: 72.8777 },
    zones: ["BKC", "Lower Parel", "Andheri East", "Powai"],
    timezones: ["Asia/Kolkata"],
  },
  {
    city: "Delhi",
    country: "India",
    flag: "🇮🇳",
    region: "India",
    currency: "INR",
    coords: { lat: 28.6139, lng: 77.209 },
    zones: ["Aerocity", "Connaught Place", "Nehru Place", "Khan Market"],
    timezones: ["Asia/Kolkata"],
  },
  // ---- North America ----
  {
    city: "Austin",
    country: "USA",
    flag: "🇺🇸",
    region: "North America",
    currency: "USD",
    coords: { lat: 30.2672, lng: -97.7431 },
    zones: ["Downtown", "Silicon Hills", "Domain"],
    timezones: ["America/Chicago"],
  },
  {
    city: "San Francisco",
    country: "USA",
    flag: "🇺🇸",
    region: "North America",
    currency: "USD",
    coords: { lat: 37.7749, lng: -122.4194 },
    zones: ["SOMA", "Financial District", "Mission Bay"],
    timezones: ["America/Los_Angeles"],
  },
  // ---- Europe ----
  {
    city: "London",
    country: "UK",
    flag: "🇬🇧",
    region: "Europe",
    currency: "GBP",
    coords: { lat: 51.5074, lng: -0.1278 },
    zones: ["Silicon Roundabout / Shoreditch", "Canary Wharf"],
    timezones: ["Europe/London"],
  },
];

export const HUB_BY_CITY: Record<CityKey, Hub> = Object.fromEntries(
  HUBS.map((h) => [h.city, h]),
) as Record<CityKey, Hub>;

export const REGIONS: RegionKey[] = ["India", "North America", "Europe"];

/**
 * Best-effort default hub detection. Reads the browser timezone first,
 * then falls back to language-locale heuristics, then to Bangalore.
 * Pure: safe to call during SSR (returns "Bangalore" without window).
 */
export function detectDefaultHub(): CityKey {
  if (typeof window === "undefined") return "Bangalore";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const match = HUBS.find((h) => h.timezones.includes(tz));
    if (match) return match.city;
  } catch { /* ignore */ }
  try {
    const lang = (navigator.language || "").toLowerCase();
    if (lang.startsWith("en-gb")) return "London";
    if (lang.startsWith("en-us")) return "San Francisco";
  } catch { /* ignore */ }
  return "Bangalore";
}
