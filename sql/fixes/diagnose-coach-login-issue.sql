-- Diagnose Coach Login Issue
-- Run this in your Supabase SQL Editor to check why a coach account isn't working
-- Replace 'YOUR_EMAIL@example.com' with the coach's email address

-- Step 1: Check if the get_user_role function exists
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname = 'get_user_role';

-- Step 2: Find the user by email
SELECT 
  id as user_id,
  email,
  raw_user_meta_data->>'role' as metadata_role,
  created_at
FROM auth.users
WHERE email = 'YOUR_EMAIL@example.com';  -- REPLACE WITH ACTUAL EMAIL

-- Step 3: Check the profile for this user
-- Replace 'USER_ID_FROM_STEP_2' with the ID from Step 2
SELECT 
  p.id,
  p.role,
  p.first_name,
  p.last_name,
  p.phone_number,
  u.email,
  CASE 
    WHEN p.role = 'coach' THEN '✅ User is a coach'
    WHEN p.role IS NULL THEN '❌ Role is NULL - needs to be set to "coach"'
    ELSE '❌ User role is: ' || p.role || ' (needs to be "coach")'
  END as status
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'YOUR_EMAIL@example.com';  -- REPLACE WITH ACTUAL EMAIL

-- Step 4: Check RLS policies on profiles table
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY policyname;

-- Step 5: If role is not 'coach', fix it (UNCOMMENT TO RUN)
-- Replace 'USER_ID_FROM_STEP_2' with the ID from Step 2
-- UPDATE public.profiles 
-- SET role = 'coach' 
-- WHERE id = 'USER_ID_FROM_STEP_2'::uuid;

-- Step 6: Verify the fix
-- SELECT id, role, first_name, last_name
-- FROM public.profiles
-- WHERE id = 'USER_ID_FROM_STEP_2'::uuid;
