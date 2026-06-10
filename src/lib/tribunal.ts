import { supabase } from "@/integrations/supabase/client";

export async function reportPost(postId: string): Promise<{ ok: boolean; error?: string }> {
  const { error } = await (supabase as any).rpc("report_post", { p_post_id: postId });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export type TribunalResult = {
  valid_votes: number;
  misconduct_votes: number;
  is_hidden: boolean;
};

export async function tribunalVote(
  postId: string,
  vote: "valid" | "misconduct"
): Promise<{ ok: boolean; data?: TribunalResult; error?: string }> {
  const { data, error } = await (supabase as any).rpc("tribunal_vote", {
    p_post_id: postId,
    p_vote: vote,
  });
  if (error) return { ok: false, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  return { ok: true, data: row as TribunalResult };
}
