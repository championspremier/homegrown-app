-- Allow player-only accounts to book individual sessions
-- This updates the RPC function and RLS policies to support players without linked parent accounts

-- ============================================
-- UPDATE RPC FUNCTION: create_individual_booking_for_player
-- ============================================
CREATE OR REPLACE FUNCTION public.create_individual_booking_for_player(
  p_session_type_id UUID,
  p_coach_id UUID,
  p_player_id UUID,
  p_parent_id UUID,
  p_booking_date DATE,
  p_booking_time TIME,
  p_duration_minutes INTEGER DEFAULT 15
)
RETURNS TABLE(id UUID, session_type_id UUID, coach_id UUID, player_id UUID, parent_id UUID, booking_date DATE, booking_time TIME, duration_minutes INTEGER, status TEXT, created_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
#variable_conflict use_column
DECLARE
  v_booking_id UUID;
  v_actual_parent_id UUID;
  v_user_role TEXT;
BEGIN
  -- Get the authenticated user's role
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Determine actual parent_id based on user role
  IF v_user_role = 'parent' THEN
    -- User is logged in as parent
    v_actual_parent_id := auth.uid();
    
    -- Verify the provided parent_id matches
    IF p_parent_id IS NOT NULL AND p_parent_id != v_actual_parent_id THEN
      RAISE EXCEPTION 'Parent ID mismatch';
    END IF;
  ELSIF v_user_role = 'player' THEN
    -- User is logged in as player
    -- Check if the player has a linked parent
    SELECT parent_id INTO v_actual_parent_id
    FROM public.parent_player_relationships
    WHERE player_id = auth.uid()
    LIMIT 1;
    
    IF v_actual_parent_id IS NULL THEN
      -- Player is not linked to a parent, allow them to book for themselves
      IF p_player_id != auth.uid() THEN
        RAISE EXCEPTION 'Player not linked to a parent can only book for themselves';
      END IF;
      -- Set parent_id to NULL for player-only bookings
      v_actual_parent_id := NULL;
    ELSE
      -- Player has a parent, verify the provided parent_id matches
      IF p_parent_id IS NOT NULL AND p_parent_id != v_actual_parent_id THEN
        RAISE EXCEPTION 'Parent ID does not match player relationship';
      END IF;
    END IF;
  ELSE
    RAISE EXCEPTION 'Only parents or players can use this function';
  END IF;
  
  -- If a parent_id is determined (meaning player has a parent or user is a parent), 
  -- verify the relationship exists between the parent and the target player
  IF v_actual_parent_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.parent_player_relationships
    WHERE parent_id = v_actual_parent_id
    AND player_id = p_player_id
  ) THEN
    RAISE EXCEPTION 'No relationship found between parent and player';
  END IF;
  
  -- Verify the player exists and is actually a player
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_player_id
    AND role = 'player'
  ) THEN
    RAISE EXCEPTION 'Invalid player ID';
  END IF;
  
  -- Create the booking
  INSERT INTO public.individual_session_bookings (
    session_type_id,
    coach_id,
    player_id,
    parent_id,
    booking_date,
    booking_time,
    duration_minutes,
    status,
    created_at
  ) VALUES (
    p_session_type_id,
    p_coach_id,
    p_player_id,
    v_actual_parent_id,
    p_booking_date,
    p_booking_time,
    p_duration_minutes,
    'confirmed',
    NOW()
  )
  RETURNING id INTO v_booking_id;
  
  -- Return the created booking
  RETURN QUERY
  SELECT 
    booking.id,
    booking.session_type_id,
    booking.coach_id,
    booking.player_id,
    booking.parent_id,
    booking.booking_date,
    booking.booking_time,
    booking.duration_minutes,
    booking.status::TEXT,
    booking.created_at
  FROM public.individual_session_bookings booking
  WHERE booking.id = v_booking_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_individual_booking_for_player(UUID, UUID, UUID, UUID, DATE, TIME, INTEGER) TO authenticated;

