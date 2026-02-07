-- Allow parents to cancel reservations they created for their linked players
-- Run this in your Supabase SQL Editor

-- Drop existing UPDATE policy if it exists
DROP POLICY IF EXISTS "Players can cancel own reservations" ON public.session_reservations;

-- Create new policy that allows both players and parents to cancel reservations
CREATE POLICY "Players and parents can cancel reservations"
  ON public.session_reservations FOR UPDATE
  TO authenticated
  USING (
    -- Players can cancel their own reservations
    (
      player_id = auth.uid()
      AND reservation_status IN ('reserved', 'checked-in')
    )
    OR
    -- Parents can cancel reservations they created for their linked players
    (
      parent_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.parent_player_relationships
        WHERE parent_player_relationships.parent_id = auth.uid()
        AND parent_player_relationships.player_id = session_reservations.player_id
      )
      AND reservation_status IN ('reserved', 'checked-in')
    )
  )
  WITH CHECK (
    -- Same conditions for the updated row
    (
      player_id = auth.uid()
    )
    OR
    (
      parent_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.parent_player_relationships
        WHERE parent_player_relationships.parent_id = auth.uid()
        AND parent_player_relationships.player_id = session_reservations.player_id
      )
    )
  );

