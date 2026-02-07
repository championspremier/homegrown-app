-- Verify Coach Profile
-- Run this to check if your profile has role = 'coach'

-- Step 1: Find your user ID from auth.users by email
-- Replace 'your-email@example.com' with your actual coach login email
SELECT 
  id as user_id,
  email,
  raw_user_meta_data->>'role' as metadata_role,
  created_at
FROM auth.users
WHERE email = 'your-email@example.com';

-- Step 2: Check your profile in the profiles table (with email from auth.users)
-- Replace 'your-email@example.com' with your actual coach login email
SELECT 
  p.id,
  p.role,
  p.first_name,
  p.last_name,
  p.phone_number,
  u.email,
  p.created_at,
  p.updated_at
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'your-email@example.com';

-- Alternative: Check by user ID (use this if you know your user ID)
-- Replace 'USER_ID_HERE' with your actual user ID from Step 1
-- SELECT 
--   p.id,
--   p.role,
--   p.first_name,
--   p.last_name,
--   p.phone_number,
--   u.email,
--   p.created_at,
--   p.updated_at
-- FROM public.profiles p
-- JOIN auth.users u ON u.id = p.id
-- WHERE p.id = 'USER_ID_HERE'::uuid;

-- Step 3: If role is not 'coach', update it
-- Replace 'USER_ID_FROM_STEP_1' with your actual user ID
-- UNCOMMENT THE LINE BELOW TO UPDATE (remove --)
-- UPDATE public.profiles SET role = 'coach' WHERE id = 'USER_ID_FROM_STEP_1'::uuid;

-- Step 4: Verify the is_coach() function exists and is correct
SELECT 
  proname as function_name,
  prosrc as function_source
FROM pg_proc
WHERE proname = 'is_coach';

-- Step 5: Check if the RLS policies exist
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'sessions'
ORDER BY policyname;
