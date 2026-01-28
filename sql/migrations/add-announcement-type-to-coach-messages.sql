-- Add announcement_type to coach_messages for categorizing announcements
-- Icons: time_change (clock-alert), cancellation (ban), popup_session (calendar-check),
-- information (info), veo_link (cctv)

-- coach_messages: add announcement_type column
ALTER TABLE public.coach_messages
  ADD COLUMN IF NOT EXISTS announcement_type TEXT DEFAULT 'information'
  CHECK (announcement_type IN (
    'time_change',
    'cancellation',
    'popup_session',
    'information',
    'veo_link'
  ));

-- Backfill existing rows
UPDATE public.coach_messages SET announcement_type = 'information' WHERE announcement_type IS NULL;

-- notifications: extend notification_type CHECK to allow announcement subtypes
-- Postgres auto-names inline CHECK as {table}_{column}_check; if drop fails, find name with:
--   SELECT conname FROM pg_constraint WHERE conrelid = 'public.notifications'::regclass AND contype = 'c';
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_notification_type_check;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_notification_type_check
  CHECK (notification_type IN (
    'solo_session_created',
    'objectives_assigned',
    'announcement',
    'points_awarded',
    'quiz_assigned',
    'milestone_achieved',
    'schedule_change',
    'field_change',
    'cancellation',
    'time_change',
    'popup_session',
    'information',
    'veo_link'
  ));

COMMENT ON COLUMN public.coach_messages.announcement_type IS 'time_change=clock-alert, cancellation=ban, popup_session=calendar-check, information=info, veo_link=cctv';
