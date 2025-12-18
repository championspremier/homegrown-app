-- Create Coach Profile for Existing User
-- This creates a profile for a user who already exists in auth.users but doesn't have a profile
-- Replace the values below with the actual user's information

-- Step 1: Verify the user exists in auth.users
SELECT 
  id,
  email,
  raw_user_meta_data->>'first_name' as first_name,
  raw_user_meta_data->>'last_name' as last_name,
  raw_user_meta_data->>'role' as metadata_role,
  created_at
FROM auth.users
WHERE id = 'e62889f6-2e72-45de-b765-4440aea5df7d'::uuid;

-- Step 2: Create the profile (replace values as needed)
INSERT INTO public.profiles (
  id,
  role,
  first_name,
  last_name,
  phone_number
)
VALUES (
  'e62889f6-2e72-45de-b765-4440aea5df7d'::uuid,
  'coach',
  'Coach',  -- Replace with actual first name
  'Name',   -- Replace with actual last name
  NULL      -- Replace with phone number if available
)
ON CONFLICT (id) DO UPDATE SET
  role = 'coach',
  first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
  last_name = COALESCE(EXCLUDED.last_name, profiles.last_name);

-- Step 3: Verify the profile was created
SELECT 
  p.id,
  p.role,
  p.first_name,
  p.last_name,
  u.email,
  CASE 
    WHEN p.role = 'coach' THEN '✅ User is a coach'
    ELSE '❌ User role is: ' || COALESCE(p.role, 'NULL') || ' (needs to be "coach")'
  END as status
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.id = 'e62889f6-2e72-45de-b765-4440aea5df7d'::uuid;
