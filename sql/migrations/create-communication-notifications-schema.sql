-- ============================================
-- Communication and Notifications Schema
-- ============================================
-- This schema supports:
-- 1. Coach messages/announcements (chat-like interface)
-- 2. Player objectives assignments (In Possession / Out of Possession)
-- 3. Quiz assignments to players
-- 4. Unified notifications system for players/parents
-- ============================================

-- Add keywords column to quiz_questions if it doesn't exist
ALTER TABLE public.quiz_questions 
ADD COLUMN IF NOT EXISTS keywords TEXT[];

-- ============================================
-- COACH MESSAGES TABLE
-- ============================================
-- Stores messages/announcements sent by coaches
CREATE TABLE IF NOT EXISTS public.coach_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Message content
  message_text TEXT NOT NULL,
  attachment_url TEXT, -- For file attachments (optional)
  attachment_name TEXT, -- Original filename
  attachment_size INTEGER, -- Size in bytes
  
  -- Recipient filters
  recipient_type TEXT NOT NULL CHECK (recipient_type IN (
    'all', -- All parents/players/coaches
    'players', -- All players
    'parents', -- All parents
    'coaches' -- All coaches
  )),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for coach messages
CREATE INDEX IF NOT EXISTS idx_coach_messages_coach_id ON public.coach_messages(coach_id);
CREATE INDEX IF NOT EXISTS idx_coach_messages_created_at ON public.coach_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_coach_messages_recipient_type ON public.coach_messages(recipient_type);

-- ============================================
-- PLAYER OBJECTIVES TABLE
-- ============================================
-- Stores objectives assigned to specific players
CREATE TABLE IF NOT EXISTS public.player_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  coach_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Objectives content
  in_possession_objective TEXT,
  out_of_possession_objective TEXT,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  completed_at TIMESTAMP WITH TIME ZONE, -- When player completes objectives
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for player objectives
CREATE INDEX IF NOT EXISTS idx_player_objectives_player_id ON public.player_objectives(player_id);
CREATE INDEX IF NOT EXISTS idx_player_objectives_coach_id ON public.player_objectives(coach_id);
CREATE INDEX IF NOT EXISTS idx_player_objectives_created_at ON public.player_objectives(created_at DESC);

-- Partial unique index to ensure one active objective set per player at a time
CREATE UNIQUE INDEX IF NOT EXISTS idx_player_objectives_one_active_per_player 
ON public.player_objectives(player_id) 
WHERE is_active = true;

-- ============================================
-- QUIZ ASSIGNMENTS TABLE
-- ============================================
-- Links quiz questions to players (assigns quizzes)
CREATE TABLE IF NOT EXISTS public.quiz_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_question_id UUID REFERENCES public.quiz_questions(id) ON DELETE CASCADE NOT NULL,
  player_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  
  -- Assignment details
  assigned_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Coach who assigned
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Player response
  selected_answer INTEGER, -- Index of selected answer (0-based)
  is_correct BOOLEAN,
  answered_at TIMESTAMP WITH TIME ZONE,
  points_awarded DECIMAL(10, 2) DEFAULT 0, -- Points for correct answer
  
  -- Status
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'answered', 'expired')),
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for quiz assignments
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_player_id ON public.quiz_assignments(player_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_quiz_question_id ON public.quiz_assignments(quiz_question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_assignments_status ON public.quiz_assignments(status);

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
-- Unified notification system for players and parents
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Recipient
  recipient_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  recipient_role TEXT NOT NULL CHECK (recipient_role IN ('player', 'parent')),
  
  -- Notification type
  notification_type TEXT NOT NULL CHECK (notification_type IN (
    'solo_session_created',
    'objectives_assigned',
    'announcement',
    'points_awarded',
    'quiz_assigned',
    'milestone_achieved',
    'schedule_change',
    'field_change',
    'cancellation'
  )),
  
  -- Notification content
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}'::jsonb, -- Additional data (e.g., session_id, quiz_id, etc.)
  
  -- Related entities (optional)
  related_entity_type TEXT, -- e.g., 'solo_session', 'quiz', 'objective', 'session'
  related_entity_id UUID,
  
  -- Status
  is_read BOOLEAN DEFAULT false,
  read_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Index for notifications
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_role ON public.notifications(recipient_role);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(notification_type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON public.notifications(recipient_id, is_read) WHERE is_read = false;

-- ============================================
-- RLS POLICIES
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.coach_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_objectives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Coach Messages Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Coaches can create messages" ON public.coach_messages;
DROP POLICY IF EXISTS "Users can view messages for their role" ON public.coach_messages;

-- Coaches can create and view their own messages
CREATE POLICY "Coaches can create messages"
  ON public.coach_messages FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('coach', 'admin')
      AND profiles.id = coach_messages.coach_id
    )
  );

-- Everyone can view messages based on recipient_type
CREATE POLICY "Users can view messages for their role"
  ON public.coach_messages FOR SELECT
  TO authenticated
  USING (
    is_active = true AND (
      recipient_type = 'all' OR
      (recipient_type = 'players' AND EXISTS (
        SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'player'
      )) OR
      (recipient_type = 'parents' AND EXISTS (
        SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'parent'
      )) OR
      (recipient_type = 'coaches' AND EXISTS (
        SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role IN ('coach', 'admin')
      ))
    )
  );

-- Player Objectives Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Coaches can create objectives" ON public.player_objectives;
DROP POLICY IF EXISTS "Players can view their objectives" ON public.player_objectives;
DROP POLICY IF EXISTS "Coaches can update objectives" ON public.player_objectives;

-- Coaches can create objectives for players
CREATE POLICY "Coaches can create objectives"
  ON public.player_objectives FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('coach', 'admin')
      AND profiles.id = player_objectives.coach_id
    )
  );

-- Players can view their own objectives
CREATE POLICY "Players can view their objectives"
  ON public.player_objectives FOR SELECT
  TO authenticated
  USING (
    player_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.parent_player_relationships
      WHERE parent_id = auth.uid()
      AND player_id = player_objectives.player_id
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('coach', 'admin')
    )
  );

-- Coaches can update objectives
CREATE POLICY "Coaches can update objectives"
  ON public.player_objectives FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('coach', 'admin')
      AND profiles.id = player_objectives.coach_id
    )
  );

-- Quiz Assignments Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Coaches can create quiz assignments" ON public.quiz_assignments;
DROP POLICY IF EXISTS "Players can view their quiz assignments" ON public.quiz_assignments;
DROP POLICY IF EXISTS "Players can answer quizzes" ON public.quiz_assignments;

-- Coaches can create quiz assignments
CREATE POLICY "Coaches can create quiz assignments"
  ON public.quiz_assignments FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('coach', 'admin')
    )
  );

-- Players can view and update their own quiz assignments
CREATE POLICY "Players can view their quiz assignments"
  ON public.quiz_assignments FOR SELECT
  TO authenticated
  USING (
    player_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.parent_player_relationships
      WHERE parent_id = auth.uid()
      AND player_id = quiz_assignments.player_id
    ) OR
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('coach', 'admin')
    )
  );

-- Players can update their quiz assignments (answer quizzes)
CREATE POLICY "Players can answer quizzes"
  ON public.quiz_assignments FOR UPDATE
  TO authenticated
  USING (
    player_id = auth.uid() AND status = 'assigned'
  )
  WITH CHECK (
    player_id = auth.uid()
  );

-- Notifications Policies
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;
DROP POLICY IF EXISTS "Coaches can create notifications" ON public.notifications;

-- Users can view their own notifications
CREATE POLICY "Users can view their notifications"
  ON public.notifications FOR SELECT
  TO authenticated
  USING (
    recipient_id = auth.uid() OR
    -- Parents can view notifications for their linked players
    (
      recipient_role = 'player' AND
      EXISTS (
        SELECT 1 FROM public.parent_player_relationships
        WHERE parent_id = auth.uid()
        AND player_id = notifications.recipient_id
      )
    )
  );

-- Users can update their own notifications (mark as read)
CREATE POLICY "Users can update their notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Coaches and admins can create notifications
CREATE POLICY "Coaches can create notifications"
  ON public.notifications FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('coach', 'admin')
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Function to create notification for solo session
CREATE OR REPLACE FUNCTION create_solo_session_notification(
  p_solo_session_id UUID,
  p_player_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_session_data JSONB;
BEGIN
  -- Get session data
  SELECT jsonb_build_object(
    'solo_session_id', ss.id,
    'title', ss.title,
    'period', ss.period,
    'category', ss.category,
    'skill', ss.skill,
    'duration', calculate_solo_session_duration(ss.id)
  ) INTO v_session_data
  FROM public.solo_sessions ss
  WHERE ss.id = p_solo_session_id;
  
  -- Create notification
  INSERT INTO public.notifications (
    recipient_id,
    recipient_role,
    notification_type,
    title,
    message,
    data,
    related_entity_type,
    related_entity_id
  ) VALUES (
    p_player_id,
    'player',
    'solo_session_created',
    'New Solo Session Available',
    'A new solo session has been created for you: ' || (v_session_data->>'title'),
    v_session_data,
    'solo_session',
    p_solo_session_id
  )
  RETURNING id INTO v_notification_id;
  
  -- Also notify parent if exists
  INSERT INTO public.notifications (
    recipient_id,
    recipient_role,
    notification_type,
    title,
    message,
    data,
    related_entity_type,
    related_entity_id
  )
  SELECT 
    ppr.parent_id,
    'parent',
    'solo_session_created',
    'New Solo Session for ' || profiles.first_name || ' ' || profiles.last_name,
    'A new solo session has been created for ' || profiles.first_name || ': ' || (v_session_data->>'title'),
    v_session_data,
    'solo_session',
    p_solo_session_id
  FROM public.parent_player_relationships ppr
  JOIN public.profiles ON profiles.id = ppr.player_id
  WHERE ppr.player_id = p_player_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to calculate solo session duration (helper)
CREATE OR REPLACE FUNCTION calculate_solo_session_duration(p_session_id UUID)
RETURNS INTEGER AS $$
DECLARE
  v_duration INTEGER := 0;
BEGIN
  -- Warm-up: 5 minutes
  v_duration := v_duration + 5;
  
  -- Main exercises: sum of all exercise durations
  SELECT COALESCE(
    SUM(
      (COALESCE((ex->>'duration')::INTEGER, 3) * COALESCE((ex->>'sets')::INTEGER, 1)) +
      (COALESCE((ex->>'rest_time')::INTEGER, 1) * GREATEST(COALESCE((ex->>'sets')::INTEGER, 1) - 1, 0))
    ),
    0
  ) INTO v_duration
  FROM public.solo_sessions ss,
  jsonb_array_elements(ss.main_exercises) AS ex
  WHERE ss.id = p_session_id;
  
  -- Finishing/Passing: 5 minutes
  v_duration := v_duration + 5;
  
  RETURN v_duration;
END;
$$ LANGUAGE plpgsql;

-- Function to create notification for objectives
CREATE OR REPLACE FUNCTION create_objectives_notification(
  p_objective_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_objective RECORD;
BEGIN
  -- Get objective data
  SELECT * INTO v_objective
  FROM public.player_objectives
  WHERE id = p_objective_id;
  
  -- Create notification for player
  INSERT INTO public.notifications (
    recipient_id,
    recipient_role,
    notification_type,
    title,
    message,
    data,
    related_entity_type,
    related_entity_id
  ) VALUES (
    v_objective.player_id,
    'player',
    'objectives_assigned',
    'New Objectives Assigned',
    'Your coach has assigned new objectives for you to focus on.',
    jsonb_build_object(
      'objective_id', p_objective_id,
      'in_possession', v_objective.in_possession_objective,
      'out_of_possession', v_objective.out_of_possession_objective
    ),
    'objective',
    p_objective_id
  )
  RETURNING id INTO v_notification_id;
  
  -- Also notify parent if exists
  INSERT INTO public.notifications (
    recipient_id,
    recipient_role,
    notification_type,
    title,
    message,
    data,
    related_entity_type,
    related_entity_id
  )
  SELECT 
    ppr.parent_id,
    'parent',
    'objectives_assigned',
    'New Objectives for ' || profiles.first_name || ' ' || profiles.last_name,
    'New objectives have been assigned to ' || profiles.first_name || '.',
    jsonb_build_object(
      'objective_id', p_objective_id,
      'player_id', v_objective.player_id,
      'in_possession', v_objective.in_possession_objective,
      'out_of_possession', v_objective.out_of_possession_objective
    ),
    'objective',
    p_objective_id
  FROM public.parent_player_relationships ppr
  JOIN public.profiles ON profiles.id = ppr.player_id
  WHERE ppr.player_id = v_objective.player_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to create notification for quiz assignment
CREATE OR REPLACE FUNCTION create_quiz_notification(
  p_quiz_assignment_id UUID
)
RETURNS UUID AS $$
DECLARE
  v_notification_id UUID;
  v_assignment RECORD;
  v_question RECORD;
BEGIN
  -- Get assignment and question data
  SELECT qa.*, qq.question INTO v_assignment
  FROM public.quiz_assignments qa
  JOIN public.quiz_questions qq ON qq.id = qa.quiz_question_id
  WHERE qa.id = p_quiz_assignment_id;
  
  -- Create notification for player
  INSERT INTO public.notifications (
    recipient_id,
    recipient_role,
    notification_type,
    title,
    message,
    data,
    related_entity_type,
    related_entity_id
  ) VALUES (
    v_assignment.player_id,
    'player',
    'quiz_assigned',
    'New Quiz Available',
    'A new quiz question has been assigned to you: ' || LEFT(v_assignment.question, 50) || '...',
    jsonb_build_object(
      'quiz_assignment_id', p_quiz_assignment_id,
      'quiz_question_id', v_assignment.quiz_question_id
    ),
    'quiz',
    v_assignment.quiz_question_id
  )
  RETURNING id INTO v_notification_id;
  
  RETURN v_notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check message rate limit (3 per coach)
CREATE OR REPLACE FUNCTION check_message_rate_limit(p_coach_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_today_start TIMESTAMP WITH TIME ZONE;
BEGIN
  v_today_start := DATE_TRUNC('day', NOW());
  
  SELECT COUNT(*) INTO v_count
  FROM public.coach_messages
  WHERE coach_id = p_coach_id
  AND created_at >= v_today_start;
  
  RETURN v_count < 3;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check objectives rate limit (once per week per player)
CREATE OR REPLACE FUNCTION check_objectives_rate_limit(
  p_coach_id UUID,
  p_player_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_week_start TIMESTAMP WITH TIME ZONE;
BEGIN
  v_week_start := DATE_TRUNC('week', NOW());
  
  SELECT COUNT(*) INTO v_count
  FROM public.player_objectives
  WHERE coach_id = p_coach_id
  AND player_id = p_player_id
  AND created_at >= v_week_start;
  
  RETURN v_count = 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
