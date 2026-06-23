-- =====================================================================
-- 1. SECURITY DEFINER function lockdown
-- =====================================================================
-- Pattern: revoke from PUBLIC/anon/authenticated, then re-grant explicitly.

-- ---- Trigger-only functions: no client should call these directly ----
REVOKE EXECUTE ON FUNCTION public.handle_new_user()                       FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at()                      FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.merchant_deals_set_lifespan()           FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_role_self_escalation()          FROM PUBLIC, anon, authenticated;

-- ---- RLS helper: called by the policy engine; needs authenticated ----
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;

-- ---- Auth-required RPCs (signed-in users only) ----
REVOKE EXECUTE ON FUNCTION public.increment_cheers(uuid)                                           FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.increment_cheers(uuid)                                           TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_venue_vibe(uuid, double precision, double precision, double precision) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.submit_venue_vibe(uuid, double precision, double precision, double precision) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.delete_post_by_ticket(text)                                      FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.delete_post_by_ticket(text)                                      TO authenticated;

REVOKE EXECUTE ON FUNCTION public.report_post(uuid)                                                FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.report_post(uuid)                                                TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_recent_visits(integer)                                       FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_recent_visits(integer)                                       TO authenticated;

REVOKE EXECUTE ON FUNCTION public.increment_heading_there(uuid)                                    FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.increment_heading_there(uuid)                                    TO authenticated;

REVOKE EXECUTE ON FUNCTION public.claim_first_admin()                                              FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.claim_first_admin()                                              TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role)                                   FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_set_role(uuid, app_role)                                   TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_set_deal_active(uuid, boolean)                             FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_set_deal_active(uuid, boolean)                             TO authenticated;

REVOKE EXECUTE ON FUNCTION public.claim_merchant_role(text)                                        FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.claim_merchant_role(text)                                        TO authenticated;

REVOKE EXECUTE ON FUNCTION public.admin_approve_lead(uuid, text, integer)                          FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.admin_approve_lead(uuid, text, integer)                          TO authenticated;

REVOKE EXECUTE ON FUNCTION public.check_in_at_deal(uuid, double precision, double precision)       FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.check_in_at_deal(uuid, double precision, double precision)       TO authenticated;

REVOKE EXECUTE ON FUNCTION public.cast_poll_vote(text, text)                                       FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.cast_poll_vote(text, text)                                       TO authenticated;

REVOKE EXECUTE ON FUNCTION public.get_user_tip_address(uuid)                                       FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_user_tip_address(uuid)                                       TO authenticated;

REVOKE EXECUTE ON FUNCTION public.submit_testimonial(text, text)                                   FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.submit_testimonial(text, text)                                   TO authenticated;

REVOKE EXECUTE ON FUNCTION public.tribunal_vote(uuid, text)                                        FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.tribunal_vote(uuid, text)                                        TO authenticated;

-- ---- Public-read RPCs (anon + authenticated) ----
REVOKE EXECUTE ON FUNCTION public.get_public_profile(text)            FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_public_profile(text)            TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_poll_counts(text)               FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_poll_counts(text)               TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_city_status(text)               FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_city_status(text)               TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_profile_metrics(text)           FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_profile_metrics(text)           TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.get_profile_testimonials(text)      FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.get_profile_testimonials(text)      TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.vote_for_city(text, text)           FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.vote_for_city(text, text)           TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.cast_metric_vote(text, text, text)  FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.cast_metric_vote(text, text, text)  TO anon, authenticated;

REVOKE EXECUTE ON FUNCTION public.record_profile_visit(text, text)    FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION public.record_profile_visit(text, text)    TO anon, authenticated;

-- =====================================================================
-- 2. Tighten the permissive check_ins INSERT policy
-- =====================================================================
DROP POLICY IF EXISTS "Anyone can insert a check-in beacon" ON public.check_ins;

CREATE POLICY "Signed-in users insert their own check-in"
  ON public.check_ins
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());