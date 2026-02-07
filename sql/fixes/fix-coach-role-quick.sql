-- Quick Fix: Restore Coach Role
-- Run this in your Supabase SQL Editor
-- Replace 'YOUR_EMAIL@example.com' with the coach's email address

-- Step 1: Find the user and check their current role
SELECT 
  u.id as user_id,
  u.email,
  p.role as current_role,
  u.raw_user_meta_data->>'role' as metadata_role
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.email = 'YOUR_EMAIL@example.com';  -- REPLACE WITH ACTUAL EMAIL

-- Step 2: Update the profile role to 'coach' if it's not already
-- This will update the role for the user found in Step 1
-- UNCOMMENT THE LINES BELOW TO RUN (remove --)
-- UPDATE public.profiles 
-- SET role = 'coach'
-- WHERE id IN (
--   SELECT id FROM auth.users WHERE email = 'YOUR_EMAIL@example.com'  -- REPLACE WITH ACTUAL EMAIL
-- )
-- AND (role IS NULL OR role != 'coach');

-- Step 3: Verify the fix
-- SELECT 
--   u.email,
--   p.role,
--   CASE WHEN p.role = 'coach' THEN '✅ Fixed!' ELSE '❌ Still not coach' END as status
-- FROM auth.users u
-- JOIN public.profiles p ON p.id = u.id
-- WHERE u.email = 'YOUR_EMAIL@example.com';  -- REPLACE WITH ACTUAL EMAIL

-- Alternative: If you know the user ID, use this instead:
-- UPDATE public.profiles 
-- SET role = 'coach'
-- WHERE id = 'USER_ID_HERE'::uuid;
