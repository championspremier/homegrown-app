-- Fix RLS policies for individual_session_bookings to allow player-only accounts
-- This allows players without linked parent accounts to create and view their own bookings

-- Drop existing INSERT policy
DROP POLICY IF EXISTS "Players can create bookings" ON public.individual_session_bookings;

-- Create new policy that allows:
-- 1. Players to create their own bookings (with or without a parent_id)
-- 2. Parents to create bookings for their linked players
-- 3. Players to create bookings for their siblings (when they share the same parent)
CREATE POLICY "Players can create bookings"
  ON public.individual_session_bookings FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow players to create their own bookings (player-only or player with parent)
    (
      player_id = auth.uid()
      AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'player'
      )
      AND (
        parent_id IS NULL -- For player-only accounts
        OR EXISTS (
          SELECT 1 FROM public.parent_player_relationships
          WHERE parent_player_relationships.player_id = auth.uid()
          AND parent_player_relationships.parent_id = individual_session_bookings.parent_id
        )
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

-- Also update the SELECT policy to ensure players can view their own bookings
-- regardless of whether they have a parent_id or not.
DROP POLICY IF EXISTS "Users can view own bookings" ON public.individual_session_bookings;

CREATE POLICY "Users can view own bookings"
  ON public.individual_session_bookings FOR SELECT
  TO authenticated
  USING (
    -- Players can view their own bookings (player-only or player with parent)
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
    -- Players can view bookings for their siblings (when they share the same parent)
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

