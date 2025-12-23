-- Fix RLS policies to allow parents to create reservations for their linked players
-- Run this in your Supabase SQL Editor

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Players can create reservations" ON public.session_reservations;

-- Create new policy that allows both players and parents to create reservations
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
  );

-- Also update the SELECT policy to ensure parents can view reservations they created
-- (This should already work, but let's make sure)
DROP POLICY IF EXISTS "Users can view own reservations" ON public.session_reservations;

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
  );

