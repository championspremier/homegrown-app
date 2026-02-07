-- Add target_positions to solo_sessions for tactical sessions (Option A: position as metadata).
-- NULL or empty = all positions; otherwise array of position strings (e.g. ['Full-Back', 'Winger']).
SET search_path = public;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'solo_sessions' AND column_name = 'target_positions'
  ) THEN
    ALTER TABLE public.solo_sessions
      ADD COLUMN target_positions TEXT[] DEFAULT NULL;
    COMMENT ON COLUMN public.solo_sessions.target_positions IS 'For tactical sessions: positions this session targets (e.g. Full-Back, Winger). NULL = all positions.';
  END IF;
END $$;
