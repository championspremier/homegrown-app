-- Fix RLS policy to allow parents to view ALL bookings for their linked players
-- This fixes the issue where bookings created directly by players (without parent_id set)
-- are not visible to parents when logged in directly
-- Also allows players to view ALL bookings for coaches they can book with (for time slot availability)

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view own bookings" ON public.individual_session_bookings;

-- Create new policy that allows:
-- 1. Players to view their own bookings
-- 2. Parents to view ALL bookings for their linked players (regardless of who created them)
-- 3. Players to view their siblings' bookings (when they share the same parent)
-- 4. Players to view ALL bookings for coaches they can book with (for time slot availability checking)
-- 5. Coaches to view bookings for their sessions
CREATE POLICY "Users can view own bookings"
  ON public.individual_session_bookings FOR SELECT
  TO authenticated
  USING (
    -- Players can view their own bookings
    player_id = auth.uid()
    OR
    -- Parents can view ALL bookings for their linked players (regardless of parent_id)
    -- This allows parents to see bookings created directly by players
    (
      EXISTS (
        SELECT 1 FROM public.parent_player_relationships
        WHERE parent_player_relationships.parent_id = auth.uid()
        AND parent_player_relationships.player_id = individual_session_bookings.player_id
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE profiles.id = auth.uid()
          AND profiles.role = 'parent'
        )
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
    -- Players can view ALL bookings for coaches they can book with
    -- This is for time slot availability checking - if any player books a slot,
    -- the coach is unavailable for that time for all players
    (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE profiles.id = auth.uid()
        AND profiles.role = 'player'
      )
      AND EXISTS (
        SELECT 1 FROM public.coach_individual_availability
        WHERE coach_individual_availability.coach_id = individual_session_bookings.coach_id
        AND coach_individual_availability.session_type_id = individual_session_bookings.session_type_id
      )
    )
    OR
    -- Coaches can view bookings for their sessions
    coach_id = auth.uid()
  );

