-- Grant Leaderboard Function Permissions
-- This grants execute permissions on leaderboard functions to authenticated users
-- Run this in your Supabase SQL Editor

-- Grant execute permission on get_quarterly_leaderboard to authenticated users
GRANT EXECUTE ON FUNCTION public.get_quarterly_leaderboard(INTEGER, INTEGER, INTEGER) TO authenticated;

-- Grant execute permission on get_player_quarterly_points to authenticated users
GRANT EXECUTE ON FUNCTION public.get_player_quarterly_points(UUID, INTEGER, INTEGER) TO authenticated;

-- Grant execute permission on get_player_leaderboard_position to authenticated users
GRANT EXECUTE ON FUNCTION public.get_player_leaderboard_position(UUID, INTEGER, INTEGER) TO authenticated;

-- Verify permissions (optional - uncomment to test)
-- SELECT 
--   p.proname as function_name,
--   pg_get_function_identity_arguments(p.oid) as arguments,
--   r.rolname as granted_to
-- FROM pg_proc p
-- JOIN pg_namespace n ON p.pronamespace = n.oid
-- JOIN pg_proc_acl pa ON p.oid = pa.oid
-- JOIN pg_roles r ON pa.grantee = r.oid
-- WHERE n.nspname = 'public'
--   AND p.proname IN ('get_quarterly_leaderboard', 'get_player_quarterly_points', 'get_player_leaderboard_position')
--   AND r.rolname = 'authenticated';

