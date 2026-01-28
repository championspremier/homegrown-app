-- Allow players without parent accounts to create reservations for themselves
-- This fixes the issue where player-only accounts (leads) cannot reserve sessions

-- ============================================
-- FUNCTION: Create reservation for player (updated to support player-only accounts)
-- ============================================
CREATE OR REPLACE FUNCTION public.create_reservation_for_player(
  p_session_id UUID,
  p_player_id UUID,
  p_reservation_status TEXT DEFAULT 'reserved'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER -- Runs with elevated privileges
SET search_path = public
AS $$
DECLARE
  v_reservation_id UUID;
  v_parent_id UUID;
  v_user_role TEXT;
  v_existing_status TEXT;
  v_player_has_parent BOOLEAN;
BEGIN
  -- Get the authenticated user's ID and role
  SELECT role INTO v_user_role
  FROM public.profiles
  WHERE id = auth.uid();
  
  -- Determine parent_id based on user role
  IF v_user_role = 'parent' THEN
    -- User is logged in as parent
    v_parent_id := auth.uid();
    
    -- Verify the relationship exists between the parent and the target player
    IF NOT EXISTS (
      SELECT 1 FROM public.parent_player_relationships
      WHERE parent_id = v_parent_id
      AND player_id = p_player_id
    ) THEN
      RAISE EXCEPTION 'No relationship found between parent and player';
    END IF;
    
  ELSIF v_user_role = 'player' THEN
    -- User is logged in as player
    -- Check if player has a parent
    SELECT EXISTS (
      SELECT 1 FROM public.parent_player_relationships
      WHERE player_id = auth.uid()
    ) INTO v_player_has_parent;
    
    IF v_player_has_parent THEN
      -- Player has a parent - find their parent through the relationship
      SELECT parent_id INTO v_parent_id
      FROM public.parent_player_relationships
      WHERE player_id = auth.uid()
      LIMIT 1;
      
      -- If reserving for themselves, use their parent
      -- If reserving for someone else, verify relationship
      IF p_player_id = auth.uid() THEN
        -- Player reserving for themselves - use their parent
        -- v_parent_id already set above
      ELSE
        -- Player reserving for someone else - verify relationship
        IF NOT EXISTS (
          SELECT 1 FROM public.parent_player_relationships
          WHERE parent_id = v_parent_id
          AND player_id = p_player_id
        ) THEN
          RAISE EXCEPTION 'No relationship found between parent and player';
        END IF;
      END IF;
    ELSE
      -- Player has no parent (player-only account)
      -- Only allow if they're reserving for themselves
      IF p_player_id != auth.uid() THEN
        RAISE EXCEPTION 'Players without parent accounts can only reserve sessions for themselves';
      END IF;
      
      -- Set parent_id to NULL for player-only accounts
      v_parent_id := NULL;
    END IF;
    
  ELSE
    RAISE EXCEPTION 'Only parents or players can use this function';
  END IF;
  
  -- Verify the player exists and is actually a player
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_player_id
    AND role = 'player'
  ) THEN
    RAISE EXCEPTION 'Invalid player ID';
  END IF;
  
  -- Check if reservation already exists (prevent duplicates)
  -- Check for ANY reservation (including cancelled ones) to avoid unique constraint violation
  -- Use SECURITY DEFINER to bypass RLS and ensure we can see all reservations
  SELECT id, reservation_status INTO v_reservation_id, v_existing_status
  FROM public.session_reservations
  WHERE session_id = p_session_id
  AND player_id = p_player_id
  LIMIT 1;
  
  IF v_reservation_id IS NOT NULL THEN
    -- Reservation exists - check if it's active
    IF v_existing_status IN ('reserved', 'checked-in') THEN
      RAISE EXCEPTION USING 
        ERRCODE = 'P0001',
        MESSAGE = 'This player already has a reservation for this session';
    ELSE
      -- Reservation exists but is cancelled - update it instead of creating new one
      UPDATE public.session_reservations
      SET reservation_status = p_reservation_status,
          parent_id = v_parent_id,
          updated_at = NOW()
      WHERE id = v_reservation_id;
      
      -- Verify the update succeeded
      IF NOT FOUND THEN
        RAISE EXCEPTION USING 
          ERRCODE = 'P0002',
          MESSAGE = 'Failed to update existing reservation';
      END IF;
      
      RETURN v_reservation_id;
    END IF;
  END IF;
  
  -- No existing reservation - create new one
  -- Use ON CONFLICT to handle race conditions where reservation might be created
  -- between the SELECT check and the INSERT
  INSERT INTO public.session_reservations (
    session_id,
    player_id,
    parent_id,
    reservation_status,
    created_at
  ) VALUES (
    p_session_id,
    p_player_id,
    v_parent_id,
    p_reservation_status,
    NOW()
  )
  ON CONFLICT (session_id, player_id) 
  DO UPDATE SET
    reservation_status = p_reservation_status,
    parent_id = v_parent_id,
    updated_at = NOW()
  WHERE session_reservations.reservation_status IN ('cancelled')
  RETURNING id INTO v_reservation_id;
  
  -- If the conflict update didn't match (reservation is active), raise exception
  IF v_reservation_id IS NULL THEN
    RAISE EXCEPTION USING 
      ERRCODE = 'P0001',
      MESSAGE = 'This player already has a reservation for this session';
  END IF;
  
  RETURN v_reservation_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_reservation_for_player(UUID, UUID, TEXT) TO authenticated;

