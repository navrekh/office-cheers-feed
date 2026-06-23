// Centralized post/comment types and merchant→post adapter.
// Extracted from src/routes/index.tsx during the June 2026 prune pass.

import type { CityKey, Merchant } from "@/lib/cityStore";

export type Post = {
  id: string;
  author_name: string;
  author_headline: string;
  body_text: string;
  cheers_count: number;
  created_at: string;
  claim_ticket?: string;
  post_type?: "user" | "merchant";
  merchant_website?: string;
  map_query_address?: string;
  user_id?: string | null;
  is_hidden?: boolean;
  attached_visual_url?: string | null;
  is_in_tribunal?: boolean;
  valid_votes?: number;
  misconduct_votes?: number;
};

export type Comment = {
  id: string;
  post_id: string;
  author_name: string;
  body_text: string;
  created_at: string;
};

export function merchantToPost(m: Merchant, city: CityKey): Post {
  return {
    id: `merchant-${m.id}`,
    author_name: m.name,
    author_headline: `Verified Pub Partner 🛡️ · ${m.area} · ${city}`,
    body_text: `🔥 Tonight's Happy Hour Alert\n\n${m.deal}\n\nShow this DrinkedIn feed at the bar to redeem.`,
    cheers_count: m.base_heading * 3,
    created_at: new Date().toISOString(),
    post_type: "merchant",
    merchant_website: m.website,
    map_query_address: m.map_query_address,
  };
}
