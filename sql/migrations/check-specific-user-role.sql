-- Check Specific User Role
-- Replace the user ID below with: e62889f6-2e72-45de-b765-4440aea5df7d

-- Check the user's profile
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

-- Test the is_coach() function with this specific user
-- Note: This won't work in SQL Editor (no auth context), but shows the logic
SELECT 
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = 'e62889f6-2e72-45de-b765-4440aea5df7d'::uuid
    AND role = 'coach'
  ) as should_be_coach;

-- If the role is not 'coach', update it:
-- UPDATE public.profiles 
-- SET role = 'coach' 
-- WHERE id = 'e62889f6-2e72-45de-b765-4440aea5df7d'::uuid;
