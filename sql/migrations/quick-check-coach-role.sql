-- Quick Check: Verify Your Coach Role
-- Run this to check if your profile has role = 'coach'

-- Option 1: Check by email (replace with your email)
SELECT 
  p.id,
  p.role,
  p.first_name,
  p.last_name,
  u.email,
  CASE 
    WHEN p.role = 'coach' THEN '✅ You are a coach'
    ELSE '❌ Your role is: ' || p.role || ' (needs to be "coach")'
  END as status
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE u.email = 'your-email@example.com';  -- REPLACE WITH YOUR EMAIL

-- Option 2: List all coaches (to see if you're in the list)
SELECT 
  p.id,
  p.role,
  p.first_name,
  p.last_name,
  u.email
FROM public.profiles p
JOIN auth.users u ON u.id = p.id
WHERE p.role = 'coach';

-- Option 3: If your role is not 'coach', update it (replace with your user ID)
-- First, find your user ID from Option 1, then uncomment and run:
-- UPDATE public.profiles 
-- SET role = 'coach' 
-- WHERE id = 'YOUR_USER_ID_HERE'::uuid;
