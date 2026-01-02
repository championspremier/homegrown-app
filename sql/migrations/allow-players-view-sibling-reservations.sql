-- Allow players to view their siblings' reservations when viewing as parent
-- This fixes the issue where a player logged in and viewing as parent can only see their own reservations

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view own reservations" ON public.session_reservations;

-- Create new policy that allows:
-- 1. Players to view their own reservations
-- 2. Parents to view reservations for their linked players
-- 3. Players to view their siblings' reservations (when they share the same parent)
CREATE POLICY "Users can view own reservations"
  ON public.session_reservations FOR SELECT
  TO authenticated
  USING (
    -- Players can view their own reservations
    player_id = auth.uid()
    OR
    -- Parents can view reservations they created for their linked players
    (
      parent_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.parent_player_relationships
        WHERE parent_player_relationships.parent_id = auth.uid()
        AND parent_player_relationships.player_id = session_reservations.player_id
      )
    )
    OR
    -- Players can view their siblings' reservations (when they share the same parent)
    (
      EXISTS (
        SELECT 1 FROM public.parent_player_relationships ppr1
        WHERE ppr1.player_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.parent_player_relationships ppr2
          WHERE ppr2.parent_id = ppr1.parent_id
          AND ppr2.player_id = session_reservations.player_id
        )
      )
    )
  );

-- Also update individual_session_bookings SELECT policy
DROP POLICY IF EXISTS "Users can view own bookings" ON public.individual_session_bookings;

CREATE POLICY "Users can view own bookings"
  ON public.individual_session_bookings FOR SELECT
  TO authenticated
  USING (
    -- Players can view their own bookings
    player_id = auth.uid()
    OR
    -- Parents can view bookings they created for their linked players
    (
      parent_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.parent_player_relationships
        WHERE parent_player_relationships.parent_id = auth.uid()
        AND parent_player_relationships.player_id = individual_session_bookings.player_id
      )
    )
    OR
    -- Players can view their siblings' bookings (when they share the same parent)
    (
      EXISTS (
        SELECT 1 FROM public.parent_player_relationships ppr1
        WHERE ppr1.player_id = auth.uid()
        AND EXISTS (
          SELECT 1 FROM public.parent_player_relationships ppr2
          WHERE ppr2.parent_id = ppr1.parent_id
          AND ppr2.player_id = individual_session_bookings.player_id
        )
      )
    )
    OR
    -- Coaches can view bookings for their sessions
    coach_id = auth.uid()
  );

