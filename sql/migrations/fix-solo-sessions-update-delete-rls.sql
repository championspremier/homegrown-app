-- ============================================
-- Fix RLS Policies for solo_sessions UPDATE and DELETE
-- ============================================
-- This migration fixes the RLS policies to allow coaches to update and delete their own sessions
-- Run this in your Supabase SQL Editor
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Coaches can update own sessions" ON public.solo_sessions;
DROP POLICY IF EXISTS "Coaches can delete own sessions" ON public.solo_sessions;
DROP POLICY IF EXISTS "Admins can delete any solo sessions" ON public.solo_sessions;

-- Coaches can update their own sessions (with WITH CHECK clause)
CREATE POLICY "Coaches can update own sessions"
  ON public.solo_sessions FOR UPDATE
  TO authenticated
  USING (
    coach_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  )
  WITH CHECK (
    coach_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role IN ('coach', 'admin')
    )
  );

-- Coaches can delete their own sessions
-- Admins can delete any session
CREATE POLICY "Coaches can delete own sessions"
  ON public.solo_sessions FOR DELETE
  TO authenticated
  USING (
    (
      coach_id = auth.uid() AND
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role IN ('coach', 'admin')
      )
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND role = 'admin'
      )
    )
  );
