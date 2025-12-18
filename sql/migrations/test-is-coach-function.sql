-- Test the is_coach() function
-- NOTE: The SQL Editor runs without auth context, so auth.uid() will be null
-- To test properly, you need to check from the application or use a specific user ID

-- Test 1: Check if function exists
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as arguments,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname = 'is_coach';

-- Test 2: Check all coach profiles
-- This will show you all users with role = 'coach'
SELECT id, role, first_name, last_name, phone_number
FROM public.profiles 
WHERE role = 'coach';

-- Test 3: Find your user ID from auth.users
-- Replace 'your-email@example.com' with your actual email
SELECT id, email, created_at
FROM auth.users
WHERE email = 'your-email@example.com';

-- Test 4: Check if a specific user is a coach
-- Replace 'USER_ID_HERE' with your actual user ID from Test 3
SELECT 
  id,
  role,
  first_name,
  last_name,
  CASE WHEN role = 'coach' THEN true ELSE false END as is_coach
FROM public.profiles
WHERE id = 'USER_ID_HERE'::uuid;

-- Test 5: Test the function with a specific user ID (requires modifying function temporarily)
-- This won't work as-is, but shows what we need to test
-- The function uses auth.uid() which is null in SQL Editor
