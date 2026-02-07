-- Quiz answer: one-time, rate limit 15/day, points awarded, backend enforces correct/incorrect.
-- Players call submit_quiz_answer; backend updates quiz_assignments and awards points when correct.

CREATE OR REPLACE FUNCTION public.submit_quiz_answer(
  p_assignment_id UUID,
  p_selected_answer INTEGER
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_player_id UUID;
  v_status TEXT;
  v_quiz_question_id UUID;
  v_correct_answer INTEGER;
  v_is_correct BOOLEAN;
  v_points_awarded DECIMAL(10,2) := 0;
  v_answered_today INTEGER;
  v_quarter_year INTEGER;
  v_quarter_number INTEGER;
BEGIN
  -- Caller must be authenticated
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;

  -- Load assignment and enforce ownership + status
  SELECT qa.player_id, qa.status, qa.quiz_question_id
    INTO v_player_id, v_status, v_quiz_question_id
  FROM public.quiz_assignments qa
  WHERE qa.id = p_assignment_id;

  IF v_player_id IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'assignment_not_found');
  END IF;

  -- Caller must be the player OR a parent of that player (account switcher)
  IF v_player_id != auth.uid() AND NOT EXISTS (
    SELECT 1 FROM public.parent_player_relationships
    WHERE parent_id = auth.uid() AND player_id = v_player_id
  ) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'forbidden');
  END IF;

  IF v_status != 'assigned' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'already_answered');
  END IF;

  -- Rate limit: max 15 quiz answers per player (assignment owner) per day
  SELECT count(*)::INTEGER INTO v_answered_today
  FROM public.quiz_assignments
  WHERE player_id = v_player_id
    AND status = 'answered'
    AND answered_at >= date_trunc('day', now());

  IF v_answered_today >= 15 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'rate_limit', 'message', 'Maximum 15 quiz answers per day.');
  END IF;

  -- Get correct answer from question
  SELECT correct_answer INTO v_correct_answer
  FROM public.quiz_questions
  WHERE id = v_quiz_question_id;

  v_is_correct := (v_correct_answer = p_selected_answer);
  IF v_is_correct THEN
    v_points_awarded := 1;
  END IF;

  -- Update assignment (one-time answer)
  UPDATE public.quiz_assignments
  SET
    selected_answer = p_selected_answer,
    is_correct = v_is_correct,
    answered_at = now(),
    status = 'answered',
    points_awarded = v_points_awarded
  WHERE id = p_assignment_id;

  -- Award points when correct (insert into points_transactions)
  IF v_is_correct AND v_points_awarded > 0 THEN
    v_quarter_year := extract(year FROM now())::INTEGER;
    v_quarter_number := extract(quarter FROM now())::INTEGER;

    INSERT INTO public.points_transactions (
      player_id,
      points,
      session_type,
      session_id,
      quarter_year,
      quarter_number,
      checked_in_at,
      status
    ) VALUES (
      v_player_id,
      v_points_awarded,
      'Quiz',
      p_assignment_id,
      v_quarter_year,
      v_quarter_number,
      now(),
      'active'
    );
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'is_correct', v_is_correct,
    'points_awarded', v_points_awarded,
    'correct_answer', v_correct_answer
  );
END;
$$;

-- Allow authenticated users (players) to call this
GRANT EXECUTE ON FUNCTION public.submit_quiz_answer(UUID, INTEGER) TO authenticated;

COMMENT ON FUNCTION public.submit_quiz_answer(UUID, INTEGER) IS
  'Submit a quiz answer. Enforces one-time answer, 15/day rate limit, and awards points for correct answers.';
