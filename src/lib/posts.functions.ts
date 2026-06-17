import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

const UUID = z.string().uuid();

export type SharedPost = {
  id: string;
  author_name: string;
  author_headline: string;
  body_text: string;
  cheers_count: number;
  created_at: string;
};

export const getPostById = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => ({ id: UUID.parse(input.id) }))
  .handler(async ({ data }): Promise<SharedPost | null> => {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data: row, error } = await supabase
      .from("posts")
      .select("id, author_name, author_headline, body_text, cheers_count, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) {
      console.error("[getPostById]", error);
      return null;
    }
    return (row as SharedPost) ?? null;
  });
