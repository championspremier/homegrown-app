-- Allow parents to insert into player_curriculum_progress for their linked players
-- (e.g. when parent is viewing as player and completes a tactical video)
-- Existing policy "Players can track own progress" allows player_id = auth.uid() AND role = 'player'.
-- This policy allows parent_id = auth.uid() and player_id in parent_player_relationships.

CREATE POLICY "Parents can insert progress for linked players"
  ON public.player_curriculum_progress FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.parent_player_relationships ppr
      WHERE ppr.parent_id = auth.uid()
        AND ppr.player_id = player_curriculum_progress.player_id
    )
  );
