-- Fix Missing Coach Profile
-- This creates a profile in public.profiles for a user who exists in auth.users
-- The user ID is: e62889f6-2e72-45de-b765-4440aea5df7d

-- Step 1: Check if profile exists in public.profiles
SELECT 
  id,
  role,
  first_name,
  last_name,
  phone_number
FROM public.profiles
WHERE id = 'e62889f6-2e72-45de-b765-4440aea5df7d'::uuid;

-- Step 2: Create the profile from auth.users metadata if it doesn't exist
INSERT INTO public.profiles (
  id,
  role,
  first_name,
  last_name,
  phone_number
)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'role', 'coach')::text,
  u.raw_user_meta_data->>'first_name',
  u.raw_user_meta_data->>'last_name',
  u.raw_user_meta_data->>'phone_number'
FROM auth.users u
WHERE u.id = 'e62889f6-2e72-45de-b765-4440aea5df7d'::uuid
  AND NOT EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = u.id
  )
ON CONFLICT (id) DO UPDATE SET
  role = COALESCE(EXCLUDED.role, profiles.role),
  first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
  last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
  phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number);

-- Step 3: Ensure role is set to 'coach'
UPDATE public.profiles
SET role = 'coach'
WHERE id = 'e62889f6-2e72-45de-b765-4440aea5df7d'::uuid
  AND (role IS NULL OR role != 'coach');

-- Step 4: Verify the profile was created/updated
SELECT 
  p.id,
  p.role,
  p.first_name,
  p.last_name,
  p.phone_number,
  u.email,
  CASE 
    WHEN p.role = 'coach' THEN '✅ Profile exists and role is coach'
    ELSE '❌ Profile exists but role is: ' || COALESCE(p.role, 'NULL')
  END as status
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.id = 'e62889f6-2e72-45de-b765-4440aea5df7d'::uuid;
