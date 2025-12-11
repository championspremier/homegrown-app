-- Fix RLS Policy for Parent-Player Relationships
-- This allows parents to create relationships during signup
-- Run this in your Supabase SQL Editor

-- Add policy for parents to insert relationships where they are the parent
CREATE POLICY "Parents can create relationships"
  ON parent_player_relationships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'parent'
      AND profiles.id = parent_player_relationships.parent_id
    )
  );

-- Also allow parents to update their own relationships (optional, for future use)
CREATE POLICY "Parents can update their relationships"
  ON parent_player_relationships FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'parent'
      AND profiles.id = parent_player_relationships.parent_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'parent'
      AND profiles.id = parent_player_relationships.parent_id
    )
  );

