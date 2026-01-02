-- Fix create_booking_for_player function to use 'confirmed' instead of 'reserved'
-- The check constraint only allows: 'confirmed', 'completed', 'cancelled', 'no-show'

CREATE OR REPLACE FUNCTION public.create_booking_for_player(
  p_session_type_id UUID,
  p_coach_id UUID,
  p_player_id UUID,
  p_booking_date DATE,
  p_booking_time TIME,
  p_duration_minutes INTEGER DEFAULT 15
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking_id UUID;
  v_parent_id UUID;
  v_user_role TEXT;
BEGIN
  -- Get the authenticated user's role
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Determine parent_id based on user role
  IF v_user_role = 'parent' THEN
    -- User is logged in as parent
    v_parent_id := auth.uid();
  ELSIF v_user_role = 'player' THEN
    -- User is logged in as player (viewing as parent via account switcher)
    -- Find their parent through the relationship
    SELECT parent_id INTO v_parent_id
    FROM public.parent_player_relationships
    WHERE player_id = auth.uid()
    LIMIT 1;
    
    IF v_parent_id IS NULL THEN
      RAISE EXCEPTION 'Player must be linked to a parent to use this function';
    END IF;
  ELSE
    RAISE EXCEPTION 'Only parents or players linked to parents can use this function';
  END IF;
  
  -- Verify parent and relationship
  IF v_parent_id IS NULL THEN
    RAISE EXCEPTION 'Could not determine parent ID';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM public.parent_player_relationships
    WHERE parent_id = v_parent_id AND player_id = p_player_id
  ) THEN
    RAISE EXCEPTION 'No relationship found';
  END IF;
  
  -- Create the booking with 'confirmed' status (matches check constraint)
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
    v_parent_id,
    p_booking_date,
    p_booking_time,
    p_duration_minutes,
    'confirmed',  -- Changed from 'reserved' to 'confirmed' to match check constraint
    NOW()
  )
  RETURNING id INTO v_booking_id;
  
  RETURN v_booking_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION public.create_booking_for_player(UUID, UUID, UUID, DATE, TIME, INTEGER) TO authenticated;

