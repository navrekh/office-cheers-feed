import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export type TopPost = {
  id: string;
  body_text: string;
  cheers_count: number;
  comment_count: number;
  created_at: string;
};

export const getProfileTopPosts = createServerFn({ method: "GET" })
  .inputValidator((input: { handle: string }) => input)
  .handler(async ({ data }): Promise<TopPost[]> => {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return [];
    const client = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data: rows, error } = await (client as any).rpc("get_profile_top_posts", {
      p_handle: data.handle,
      p_limit: 3,
    });
    if (error || !rows) return [];
    return rows as TopPost[];
  });
