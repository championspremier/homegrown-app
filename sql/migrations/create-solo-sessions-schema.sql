-- ============================================
-- Solo Sessions Database Schema
-- ============================================
-- This schema supports:
-- 1. Solo session videos (individual exercises)
-- 2. Structured solo sessions (Warm-Up → Main Exercises → Finishing/Passing)
-- 3. Quiz questions
-- 4. Player curriculum progress tracking
-- ============================================

-- Solo Session Videos Table
-- Stores individual video exercises that can be used in solo sessions
CREATE TABLE IF NOT EXISTS public.solo_session_videos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  video_url TEXT NOT NULL,
  thumbnail_url TEXT,
  period TEXT CHECK (period IN ('build-out', 'middle-third', 'final-third', 'wide-play')),
  category TEXT CHECK (category IN ('technical', 'physical', 'mental', 'tactical')),
  skill TEXT, -- e.g., 'turning', 'first-touch', 'passing'
  sub_skill TEXT, -- e.g., 'on-ground', 'half-volley', 'weak-foot'
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER, -- duration in seconds
  keywords TEXT[], -- array for search and matching with objectives
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  order_index INTEGER DEFAULT 0,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Solo Sessions Table
-- Structured sessions created by coaches (Warm-Up → Main Exercises → Finishing/Passing)
CREATE TABLE IF NOT EXISTS public.solo_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES public.profiles(id) NOT NULL,
  title TEXT NOT NULL,
  period TEXT CHECK (period IN ('build-out', 'middle-third', 'final-third', 'wide-play')),
  category TEXT CHECK (category IN ('technical', 'physical', 'mental', 'tactical')),
  skill TEXT,
  sub_skill TEXT,
  warm_up_video_id UUID REFERENCES public.solo_session_videos(id),
  main_exercises JSONB NOT NULL DEFAULT '[]'::jsonb, -- array of video IDs: [{"video_id": "...", "order": 1}, ...]
  finishing_or_passing_video_id UUID REFERENCES public.solo_session_videos(id),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Quiz Questions Table
-- Questions created by coaches, linked to curriculum structure
CREATE TABLE IF NOT EXISTS public.quiz_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES public.profiles(id) NOT NULL,
  question TEXT NOT NULL,
  options JSONB NOT NULL, -- array of answer options: ["Option 1", "Option 2", ...]
  correct_answer INTEGER NOT NULL, -- index in options array (0-based)
  explanation TEXT, -- explanation shown after answering
  period TEXT CHECK (period IN ('build-out', 'middle-third', 'final-third', 'wide-play')),
  category TEXT CHECK (category IN ('technical', 'physical', 'mental', 'tactical')),
  skill TEXT,
  difficulty_level TEXT CHECK (difficulty_level IN ('beginner', 'intermediate', 'advanced')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Player Curriculum Progress Table
-- Tracks which curriculum content players have completed
CREATE TABLE IF NOT EXISTS public.player_curriculum_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID REFERENCES public.profiles(id) NOT NULL,
  period TEXT NOT NULL CHECK (period IN ('build-out', 'middle-third', 'final-third', 'wide-play')),
  category TEXT NOT NULL CHECK (category IN ('technical', 'physical', 'mental', 'tactical')),
  skill TEXT,
  sub_skill TEXT,
  session_type TEXT NOT NULL CHECK (session_type IN ('virtual', 'on-field', 'solo')),
  session_id UUID, -- reference to specific session (can be null for general progress)
  video_id UUID REFERENCES public.solo_session_videos(id), -- for solo video completions
  points_earned DECIMAL(10,2) DEFAULT 0,
  completed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(player_id, session_id, video_id) -- prevent duplicate tracking
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_solo_videos_period_category ON public.solo_session_videos(period, category);
CREATE INDEX IF NOT EXISTS idx_solo_videos_skill ON public.solo_session_videos(skill);
CREATE INDEX IF NOT EXISTS idx_solo_videos_keywords ON public.solo_session_videos USING GIN(keywords);
CREATE INDEX IF NOT EXISTS idx_solo_sessions_coach ON public.solo_sessions(coach_id);
CREATE INDEX IF NOT EXISTS idx_solo_sessions_period_category ON public.solo_sessions(period, category);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_coach ON public.quiz_questions(coach_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_period_category ON public.quiz_questions(period, category);
CREATE INDEX IF NOT EXISTS idx_curriculum_progress_player ON public.player_curriculum_progress(player_id);
CREATE INDEX IF NOT EXISTS idx_curriculum_progress_period_category ON public.player_curriculum_progress(period, category);
CREATE INDEX IF NOT EXISTS idx_curriculum_progress_session_type ON public.player_curriculum_progress(session_type);

-- RLS Policies
ALTER TABLE public.solo_session_videos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.solo_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_curriculum_progress ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Coaches can create solo videos" ON public.solo_session_videos;
DROP POLICY IF EXISTS "Anyone can view solo videos" ON public.solo_session_videos;
DROP POLICY IF EXISTS "Coaches can update own videos" ON public.solo_session_videos;
DROP POLICY IF EXISTS "Coaches can create solo sessions" ON public.solo_sessions;
DROP POLICY IF EXISTS "Anyone can view solo sessions" ON public.solo_sessions;
DROP POLICY IF EXISTS "Coaches can update own sessions" ON public.solo_sessions;
DROP POLICY IF EXISTS "Coaches can create quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Anyone can view quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Coaches can update own quiz questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Players can track own progress" ON public.player_curriculum_progress;
DROP POLICY IF EXISTS "Players can view own progress" ON public.player_curriculum_progress;

-- Coaches can create and manage their own videos
CREATE POLICY "Coaches can create solo videos"
  ON public.solo_session_videos FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- Anyone can view active videos
CREATE POLICY "Anyone can view solo videos"
  ON public.solo_session_videos FOR SELECT
  TO authenticated
  USING (true);

-- Coaches can update their own videos
CREATE POLICY "Coaches can update own videos"
  ON public.solo_session_videos FOR UPDATE
  TO authenticated
  USING (
    created_by = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- Coaches can create and manage their own sessions
CREATE POLICY "Coaches can create solo sessions"
  ON public.solo_sessions FOR INSERT
  TO authenticated
  WITH CHECK (
    coach_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- Anyone can view active sessions
CREATE POLICY "Anyone can view solo sessions"
  ON public.solo_sessions FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Coaches can update their own sessions
CREATE POLICY "Coaches can update own sessions"
  ON public.solo_sessions FOR UPDATE
  TO authenticated
  USING (
    coach_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- Coaches can create and manage their own quiz questions
CREATE POLICY "Coaches can create quiz questions"
  ON public.quiz_questions FOR INSERT
  TO authenticated
  WITH CHECK (
    coach_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- Anyone can view active quiz questions
CREATE POLICY "Anyone can view quiz questions"
  ON public.quiz_questions FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Coaches can update their own quiz questions
CREATE POLICY "Coaches can update own quiz questions"
  ON public.quiz_questions FOR UPDATE
  TO authenticated
  USING (
    coach_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- Players can insert their own progress
CREATE POLICY "Players can track own progress"
  ON public.player_curriculum_progress FOR INSERT
  TO authenticated
  WITH CHECK (
    player_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'player'
    )
  );

-- Players can view their own progress
CREATE POLICY "Players can view own progress"
  ON public.player_curriculum_progress FOR SELECT
  TO authenticated
  USING (
    player_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.parent_player_relationships ppr
      WHERE ppr.parent_id = auth.uid() AND ppr.player_id = player_curriculum_progress.player_id
    )
  );

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON public.solo_session_videos TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.solo_sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.quiz_questions TO authenticated;
GRANT SELECT, INSERT ON public.player_curriculum_progress TO authenticated;

