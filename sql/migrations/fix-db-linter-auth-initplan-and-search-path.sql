-- =============================================================================
-- Fix Supabase/Postgres linter warnings (auth_rls_initplan, function_search_path_mutable, multiple_permissive_policies)
-- No schema/column/index/data changes. No RLS logic changes. No function body changes.
-- =============================================================================

BEGIN;

-- -----------------------------------------------------------------------------
-- TASK A — auth_rls_initplan (performance)
-- -----------------------------------------------------------------------------
-- Rewrite RLS policies so auth.uid(), auth.role(), auth.email(), auth.jwt(),
-- current_setting(...) are evaluated once per query using (select auth.uid()) etc.
-- Apply ONLY inside USING and WITH CHECK; logic unchanged.
-- Policy names and table/role/action come from linter JSON; expand below per your
-- auth_rls_initplan output. Example pattern:
--   CREATE POLICY "..." ON public.tbl FOR ... TO ...
--   USING ( (select auth.uid()) = user_id )
--   WITH CHECK ( (select auth.uid()) = user_id );
-- If no policies were flagged, this section is a no-op.

-- placeholder: paste ALTER POLICY ... DROP / CREATE OR REPLACE POLICY with
-- (select auth.uid()) etc. for each flagged policy here


-- -----------------------------------------------------------------------------
-- TASK B — function_search_path_mutable (security)
-- -----------------------------------------------------------------------------
-- Set search_path = pg_catalog, public for each flagged function.
-- Uses pg_proc to get actual argument types; no guessing.

DO $$
DECLARE
  r RECORD;
  func_names TEXT[] := ARRAY[
    'update_sessions_updated_at',
    'update_individual_sessions_updated_at',
    'get_user_emails',
    'update_session_reservation_count',
    'get_player_quarterly_points',
    'get_quarterly_leaderboard',
    'get_player_leaderboard_position',
    'check_message_rate_limit',
    'create_solo_session_notification',
    'calculate_solo_session_duration',
    'create_objectives_notification',
    'create_quiz_notification',
    'check_objectives_rate_limit',
    'handle_new_user',
    'update_updated_at_column'
  ];
BEGIN
  FOR r IN
    SELECT p.proname,
           pg_catalog.pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_catalog.pg_proc p
    JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = ANY(func_names)
  LOOP
    EXECUTE format(
      'ALTER FUNCTION public.%I(%s) SET search_path = pg_catalog, public;',
      r.proname,
      r.args
    );
  END LOOP;
END $$;


-- -----------------------------------------------------------------------------
-- TASK C — multiple_permissive_policies
-- -----------------------------------------------------------------------------
-- Do NOT modify or merge policies. Future refactor note only.
-- Listed: table | role | command | policy names (from linter multiple_permissive_policies output).
-- Add rows below when you have the linter JSON.

-- /* multiple_permissive_policies — refactor note (paste from linter output):
--    table: ? | role: ? | command: ? | policies: ?
-- */


COMMIT;
