import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type PublicProfile = {
  id: string;
  handle: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  github_url: string | null;
  twitter_url: string | null;
  website_url: string | null;
  pub_name: string | null;
  role: string;
  created_at: string;
};

export const getPublicProfile = createServerFn({ method: "GET" })
  .inputValidator((input: { handle: string }) => ({
    handle: String(input.handle || "").trim().slice(0, 64),
  }))
  .handler(async ({ data }): Promise<PublicProfile | null> => {
    if (!data.handle) return null;
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: row, error } = await (supabase as any).rpc("get_public_profile", {
      p_handle: data.handle,
    });
    if (error) {
      console.error("[getPublicProfile]", error);
      return null;
    }
    const rec = Array.isArray(row) ? row[0] : row;
    return (rec as PublicProfile) ?? null;
  });
