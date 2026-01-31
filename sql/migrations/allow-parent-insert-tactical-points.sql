-- Allow parents to insert into points_transactions for HG_TACTICAL_REEL when acting on behalf of a linked player
-- (e.g. parent viewing as player in Solo and completing a tactical video).
-- The existing "Players can insert own tactical points" policy allows auth.uid() = player_id AND role = 'player'.
-- This policy allows parent_id = auth.uid() and player_id in parent_player_relationships for HG_TACTICAL_REEL only.
-- Idempotent: DROP IF EXISTS before CREATE. Uses (select auth.uid()) for auth_rls_initplan / linter.

SET search_path = public;

DROP POLICY IF EXISTS "Parents can insert tactical points for linked players" ON public.points_transactions;

CREATE POLICY "Parents can insert tactical points for linked players"
  ON public.points_transactions FOR INSERT
  TO authenticated
  WITH CHECK (
    session_type = 'HG_TACTICAL_REEL'
    AND EXISTS (
      SELECT 1 FROM public.parent_player_relationships ppr
      WHERE ppr.parent_id = (SELECT auth.uid())
        AND ppr.player_id = points_transactions.player_id
    )
  );
