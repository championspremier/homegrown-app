-- Allow players to create reservations for their siblings when viewing as parent
-- This fixes the issue where a player logged in and viewing as parent cannot create reservations for their siblings

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Players can create reservations" ON public.session_reservations;

-- Create new policy that allows:
-- 1. Players to create their own reservations
-- 2. Parents to create reservations for their linked players
-- 3. Players to create reservations for their siblings (when they share the same parent)
CREATE POLICY "Players can create reservations"
  ON public.session_reservations FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow players to create their own reservations
    (
      player_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'player'
      )
    )
    OR
    -- Allow parents to create reservations for their linked players
    (
      parent_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'parent'
      )
      AND EXISTS (
        SELECT 1 FROM public.parent_player_relationships
        WHERE parent_player_relationships.parent_id = auth.uid()
        AND parent_player_relationships.player_id = session_reservations.player_id
      )
    )
    OR
    -- Allow players to create reservations for their siblings (when they share the same parent)
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
      -- Also set the parent_id to the shared parent
      AND EXISTS (
        SELECT 1 FROM public.parent_player_relationships ppr
        WHERE ppr.player_id = auth.uid()
        AND session_reservations.parent_id = ppr.parent_id
      )
    )
  );

-- Also update individual_session_bookings INSERT policy
DROP POLICY IF EXISTS "Players can create bookings" ON public.individual_session_bookings;

CREATE POLICY "Players can create bookings"
  ON public.individual_session_bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow players to create their own bookings
    (
      player_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'player'
      )
    )
    OR
    -- Allow parents to create bookings for their linked players
    (
      parent_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'parent'
      )
      AND EXISTS (
        SELECT 1 FROM public.parent_player_relationships
        WHERE parent_player_relationships.parent_id = auth.uid()
        AND parent_player_relationships.player_id = individual_session_bookings.player_id
      )
    )
    OR
    -- Allow players to create bookings for their siblings (when they share the same parent)
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
      -- Also set the parent_id to the shared parent
      AND EXISTS (
        SELECT 1 FROM public.parent_player_relationships ppr
        WHERE ppr.player_id = auth.uid()
        AND individual_session_bookings.parent_id = ppr.parent_id
      )
    )
  );

