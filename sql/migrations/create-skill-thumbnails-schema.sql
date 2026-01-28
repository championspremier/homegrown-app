-- ============================================
-- Skill Thumbnails Database Schema
-- ============================================
-- Stores thumbnail images for skills/sub-skills
-- These thumbnails are displayed on skill cards in the player solo view
-- ============================================

-- Skill Thumbnails Table
CREATE TABLE IF NOT EXISTS public.skill_thumbnails (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category TEXT NOT NULL CHECK (category IN ('technical', 'physical', 'mental', 'tactical')),
  skill TEXT NOT NULL, -- e.g., 'first-touch', 'escape-moves', 'turning'
  sub_skill TEXT, -- Optional: e.g., 'on-ground', 'fake-shots'
  period TEXT CHECK (period IN ('build-out', 'middle-third', 'final-third', 'wide-play', 'all', 'in-season', 'off-season')),
  thumbnail_url TEXT NOT NULL, -- Path in storage bucket
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_skill_thumbnails_category_skill ON public.skill_thumbnails(category, skill);
CREATE INDEX IF NOT EXISTS idx_skill_thumbnails_period ON public.skill_thumbnails(period);

-- Unique index to ensure one thumbnail per skill/sub-skill/period combination
-- Uses COALESCE to handle NULL values in sub_skill and period
CREATE UNIQUE INDEX IF NOT EXISTS idx_skill_thumbnails_unique 
ON public.skill_thumbnails(
  category, 
  skill, 
  COALESCE(sub_skill, ''), 
  COALESCE(period, '')
);

-- RLS Policies
ALTER TABLE public.skill_thumbnails ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Coaches can create skill thumbnails" ON public.skill_thumbnails;
DROP POLICY IF EXISTS "Anyone can view skill thumbnails" ON public.skill_thumbnails;
DROP POLICY IF EXISTS "Coaches can update skill thumbnails" ON public.skill_thumbnails;
DROP POLICY IF EXISTS "Coaches can delete skill thumbnails" ON public.skill_thumbnails;

-- Coaches can create skill thumbnails
CREATE POLICY "Coaches can create skill thumbnails"
  ON public.skill_thumbnails FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- Anyone can view skill thumbnails
CREATE POLICY "Anyone can view skill thumbnails"
  ON public.skill_thumbnails FOR SELECT
  TO authenticated
  USING (true);

-- Coaches can update skill thumbnails
CREATE POLICY "Coaches can update skill thumbnails"
  ON public.skill_thumbnails FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- Coaches can delete skill thumbnails
CREATE POLICY "Coaches can delete skill thumbnails"
  ON public.skill_thumbnails FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.skill_thumbnails TO authenticated;

