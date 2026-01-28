-- ============================================
-- Allow NULL skill in skill_thumbnails for season-level thumbnails
-- ============================================
-- This allows uploading thumbnails for seasons (in-season/off-season) 
-- without requiring a specific skill selection
-- ============================================

-- Make skill nullable to support season-level thumbnails
ALTER TABLE public.skill_thumbnails
  ALTER COLUMN skill DROP NOT NULL;

-- Update the unique index to handle NULL skill values
DROP INDEX IF EXISTS idx_skill_thumbnails_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_thumbnails_unique 
ON public.skill_thumbnails(
  category, 
  COALESCE(skill, ''), 
  COALESCE(sub_skill, ''), 
  COALESCE(period, '')
);
