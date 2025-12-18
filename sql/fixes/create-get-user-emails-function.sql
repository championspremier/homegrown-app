-- Create function to get user emails from auth.users
-- This allows coaches to view emails for staff members
-- Run this in your Supabase SQL Editor

-- Drop function if exists
DROP FUNCTION IF EXISTS public.get_user_emails(UUID[]);

-- Create function to get emails for a list of user IDs
CREATE OR REPLACE FUNCTION public.get_user_emails(user_ids UUID[])
RETURNS TABLE (
  user_id UUID,
  email TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id::UUID as user_id,
    u.email::TEXT as email
  FROM auth.users u
  WHERE u.id = ANY(user_ids);
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_emails(UUID[]) TO authenticated;

-- Test the function (optional - uncomment to test)
-- SELECT * FROM public.get_user_emails(ARRAY['USER_ID_HERE'::UUID]);
