-- Add 'merch' announcement type (icon: shirt/tag for merchandise)
-- Extend coach_messages and notifications to allow 'merch'

-- coach_messages: add 'merch' to announcement_type CHECK
ALTER TABLE public.coach_messages DROP CONSTRAINT IF EXISTS coach_messages_announcement_type_check;
ALTER TABLE public.coach_messages
  ADD CONSTRAINT coach_messages_announcement_type_check
  CHECK (announcement_type IN (
    'time_change',
    'cancellation',
    'popup_session',
    'information',
    'veo_link',
    'merch'
  ));

-- notifications: add 'merch' to notification_type CHECK
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
    'veo_link',
    'merch'
  ));

COMMENT ON COLUMN public.coach_messages.announcement_type IS 'information=info/yellow, cancellation=red, merch=shirt/blue, popup_session=pro-player/green, time_change=red, veo_link=green';
