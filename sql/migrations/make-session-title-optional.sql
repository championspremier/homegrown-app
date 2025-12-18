-- Make Session Title Optional
-- This makes the title column nullable (we're removing it from the UI)
-- Run this in your Supabase SQL Editor

-- Make title nullable
ALTER TABLE public.sessions 
ALTER COLUMN title DROP NOT NULL;

-- Set a default value for existing sessions that might have NULL title
UPDATE public.sessions 
SET title = session_type 
WHERE title IS NULL;

-- Note: We're keeping the column in the database for backwards compatibility
-- but it's no longer used in the UI. Sessions will be identified by type instead.
-- The title will be set to the session_type value automatically.
