-- Fix RLS policy to allow players to view their own reservations
-- even when a parent is logged in and viewing as that player
-- This fixes the issue where reservations created by parents are not visible to players

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view own reservations" ON public.session_reservations;

-- Create new policy that allows:
-- 1. Players to view their own reservations (player_id = auth.uid())
-- 2. Parents to view reservations for their linked players (parent_id = auth.uid())
-- 3. Players to view their siblings' reservations (when they share the same parent)
-- 4. Players to view their own reservations even when parent is logged in (via relationship check)
CREATE POLICY "Users can view own reservations"
  ON public.session_reservations FOR SELECT
  TO authenticated
  USING (
    -- Players can view their own reservations (when logged in as player)
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
    OR
    -- Allow parents to view reservations for their linked players (even if parent_id doesn't match)
    -- This handles cases where reservations might have been created differently
    -- and ensures parents can always see reservations for their linked players
    (
      EXISTS (
        SELECT 1 FROM public.parent_player_relationships
        WHERE parent_player_relationships.parent_id = auth.uid()
        AND parent_player_relationships.player_id = session_reservations.player_id
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'parent'
        )
      )
    )
  );

