-- ============================================
-- Test: Check if skill_thumbnails allows NULL skill
-- ============================================
-- Run this to verify the migration was applied
-- ============================================

-- Check if skill column allows NULL
SELECT 
    column_name,
    is_nullable,
    data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'skill_thumbnails'
  AND column_name = 'skill';

-- Try to insert a test record with NULL skill (will fail if migration not run)
-- This is just a test - we'll roll it back
BEGIN;

INSERT INTO public.skill_thumbnails (
    category,
    skill,
    period,
    thumbnail_url,
    created_by
) VALUES (
    'physical',
    NULL,  -- This should work if migration was run
    'in-season',
    'test-path',
    auth.uid()
);

-- If we get here, the insert worked - roll it back
ROLLBACK;

-- If you see an error about "null value in column 'skill' violates not-null constraint",
-- then the migration has NOT been run yet.
