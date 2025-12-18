-- Check All Coaches in Database
-- Run this to see how many coaches exist and verify their roles
-- Run this in your Supabase SQL Editor

-- Step 1: Count all coaches
SELECT 
  COUNT(*) as total_coaches,
  COUNT(CASE WHEN first_name IS NOT NULL THEN 1 END) as coaches_with_first_name,
  COUNT(CASE WHEN last_name IS NOT NULL THEN 1 END) as coaches_with_last_name
FROM public.profiles
WHERE role = 'coach';

-- Step 2: List all coaches with their details
SELECT 
  p.id,
  p.role,
  p.first_name,
  p.last_name,
  p.phone_number,
  u.email,
  p.created_at,
  CASE 
    WHEN p.first_name IS NULL AND p.last_name IS NULL THEN '⚠️ Missing name'
    WHEN p.first_name IS NULL THEN '⚠️ Missing first name'
    WHEN p.last_name IS NULL THEN '⚠️ Missing last name'
    ELSE '✅ Complete'
  END as profile_status
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'coach'
ORDER BY p.first_name, p.last_name;

-- Step 3: Check if any users have role='coach' in metadata but not in profiles
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'role' as metadata_role,
  p.role as profile_role,
  CASE 
    WHEN p.role IS NULL THEN '❌ No profile exists'
    WHEN p.role != 'coach' THEN '❌ Profile role is: ' || p.role || ' (should be "coach")'
    ELSE '✅ Profile role is correct'
  END as status
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.raw_user_meta_data->>'role' = 'coach'
   OR p.role = 'coach'
ORDER BY u.email;

-- Step 4: If you find coaches with wrong role, fix them:
-- UPDATE public.profiles 
-- SET role = 'coach'
-- WHERE id IN (
--   SELECT id FROM auth.users 
--   WHERE raw_user_meta_data->>'role' = 'coach'
-- )
-- AND (role IS NULL OR role != 'coach');
