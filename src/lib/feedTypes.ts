// Centralized post/comment types.
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
  parent_id?: string | null;
};
