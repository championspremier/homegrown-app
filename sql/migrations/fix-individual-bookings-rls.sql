-- Fix RLS policies to allow parents to create individual session bookings for their linked players
-- Run this in your Supabase SQL Editor

-- Drop existing INSERT policy if it exists
DROP POLICY IF EXISTS "Players can create bookings" ON public.individual_session_bookings;

-- Create new policy that allows both players and parents to create bookings
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
  );

-- Also update the SELECT policy to ensure parents can view bookings they created
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
    -- Coaches can view bookings for their sessions
    coach_id = auth.uid()
  );

