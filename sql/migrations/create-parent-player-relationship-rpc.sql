-- Create RPC function to create parent-player relationship
-- This function bypasses RLS using SECURITY DEFINER
-- It can be called by the player (who is logged in) to create the relationship with their parent
-- Run this in your Supabase SQL Editor

-- Step 1: Drop existing function if it exists
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN (
    SELECT oid::regprocedure AS func_name
    FROM pg_proc
    WHERE proname = 'create_parent_player_relationship'
    AND pronamespace = 'public'::regnamespace
  ) LOOP
    EXECUTE 'DROP FUNCTION IF EXISTS ' || r.func_name;
  END LOOP;
END $$;

-- Step 2: Create the RPC function
-- Use a simple return type to avoid column name ambiguity
CREATE OR REPLACE FUNCTION public.create_parent_player_relationship(
  p_parent_id UUID,
  p_player_id UUID,
  p_relationship_type TEXT DEFAULT 'primary'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- Verify that the current user is the player (security check)
  IF auth.uid() != p_player_id THEN
    RAISE EXCEPTION 'Only the player can create their own relationship with a parent';
  END IF;

  -- Verify that parent_id exists in profiles table
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_parent_id AND role = 'parent') THEN
    RAISE EXCEPTION 'Parent profile does not exist or is not a parent';
  END IF;

  -- Verify that player_id exists in profiles table
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = p_player_id AND role = 'player') THEN
    RAISE EXCEPTION 'Player profile does not exist or is not a player';
  END IF;

  -- Insert the relationship (bypasses RLS due to SECURITY DEFINER)
  INSERT INTO public.parent_player_relationships (
    parent_id,
    player_id,
    relationship_type
  )
  VALUES (
    p_parent_id,
    p_player_id,
    p_relationship_type
  )
  ON CONFLICT (parent_id, player_id) DO UPDATE SET
    relationship_type = EXCLUDED.relationship_type,
    updated_at = NOW();
  
  -- Return success as JSON
  SELECT jsonb_build_object(
    'success', true,
    'parent_id', p_parent_id,
    'player_id', p_player_id,
    'relationship_type', p_relationship_type
  ) INTO v_result;
  
  RETURN v_result;
END;
$$;

-- Step 3: Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_parent_player_relationship(UUID, UUID, TEXT) TO authenticated;

-- Note: The function now returns JSONB instead of TABLE to avoid column name ambiguity

-- Step 4: Add comment
COMMENT ON FUNCTION public.create_parent_player_relationship(UUID, UUID, TEXT) IS 
'Creates a parent-player relationship. Can only be called by the player (auth.uid() must match p_player_id). Bypasses RLS using SECURITY DEFINER.';
