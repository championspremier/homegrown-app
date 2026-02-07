-- Fix RLS policies to allow players without parent accounts to create reservations
-- This ensures player-only accounts (leads) can reserve sessions for themselves

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Players can create reservations" ON public.session_reservations;

-- Create new policy that allows:
-- 1. Players to create their own reservations (with or without parent_id)
-- 2. Parents to create reservations for their linked players
-- 3. Players to create reservations for their siblings (when they share the same parent)
CREATE POLICY "Players can create reservations"
  ON public.session_reservations FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow players to create their own reservations (parent_id can be NULL for player-only accounts)
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

-- Update SELECT policy to allow players to view their own reservations (even with NULL parent_id)
DROP POLICY IF EXISTS "Users can view own reservations" ON public.session_reservations;

CREATE POLICY "Users can view own reservations"
  ON public.session_reservations FOR SELECT
  TO authenticated
  USING (
    -- Players can view their own reservations (regardless of parent_id)
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
  );

