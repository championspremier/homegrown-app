-- Create Missing Coach Profile
-- This creates a profile for a coach account that exists in auth.users but not in profiles
-- Run this in your Supabase SQL Editor

-- Step 1: Check which coaches are missing profiles
SELECT 
  u.id,
  u.email,
  u.raw_user_meta_data->>'role' as metadata_role,
  u.raw_user_meta_data->>'first_name' as metadata_first_name,
  u.raw_user_meta_data->>'last_name' as metadata_last_name,
  u.raw_user_meta_data->>'phone_number' as metadata_phone,
  p.id as profile_exists
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE u.raw_user_meta_data->>'role' = 'coach'
  AND p.id IS NULL;

-- Step 2: Create profiles for missing coaches
-- This will create a profile for any coach in auth.users that doesn't have one
INSERT INTO public.profiles (
  id,
  role,
  first_name,
  last_name,
  phone_number,
  created_at,
  updated_at
)
SELECT 
  u.id,
  'coach'::text as role,
  COALESCE(
    u.raw_user_meta_data->>'first_name',
    SPLIT_PART(u.email, '@', 1) -- Use email prefix as fallback
  ) as first_name,
  COALESCE(
    u.raw_user_meta_data->>'last_name',
    '' -- Empty if not available
  ) as last_name,
  u.raw_user_meta_data->>'phone_number' as phone_number,
  u.created_at,
  NOW()
FROM auth.users u
WHERE u.raw_user_meta_data->>'role' = 'coach'
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
  )
ON CONFLICT (id) DO NOTHING; -- Don't error if profile already exists

-- Step 3: Verify the profiles were created
SELECT 
  p.id,
  p.role,
  p.first_name,
  p.last_name,
  p.phone_number,
  u.email,
  CASE 
    WHEN p.role = 'coach' THEN '✅ Coach profile exists'
    ELSE '❌ Profile role is: ' || COALESCE(p.role, 'NULL')
  END as status
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'coach'
ORDER BY p.first_name, p.last_name;
