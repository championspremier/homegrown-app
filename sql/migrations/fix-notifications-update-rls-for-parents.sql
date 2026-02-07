-- Allow parents to update (mark as read) notifications for their linked players.
-- Previously UPDATE only allowed recipient_id = auth.uid(); parents can SELECT
-- notifications where recipient is a linked player but could not UPDATE them.

DROP POLICY IF EXISTS "Users can update their notifications" ON public.notifications;

CREATE POLICY "Users can update their notifications"
  ON public.notifications FOR UPDATE
  TO authenticated
  USING (
    recipient_id = auth.uid() OR
    (
      recipient_role = 'player' AND
      EXISTS (
        SELECT 1 FROM public.parent_player_relationships
        WHERE parent_id = auth.uid()
        AND player_id = notifications.recipient_id
      )
    )
  )
  WITH CHECK (
    recipient_id = auth.uid() OR
    (
      recipient_role = 'player' AND
      EXISTS (
        SELECT 1 FROM public.parent_player_relationships
        WHERE parent_id = auth.uid()
        AND player_id = notifications.recipient_id
      )
    )
  );
