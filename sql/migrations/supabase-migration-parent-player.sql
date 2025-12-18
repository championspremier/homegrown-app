-- Migration: Add parent fields and parent-player relationships
-- Run this in your Supabase SQL Editor

-- 1. Add parent-specific fields to profiles table
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS first_name TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS last_name TEXT;

ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS birth_date DATE;

-- 2. Create parent_player_relationships junction table (many-to-many)
CREATE TABLE IF NOT EXISTS parent_player_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'primary' CHECK (relationship_type IN ('primary', 'secondary')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(parent_id, player_id)
);

-- 3. Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_parent_player_parent ON parent_player_relationships(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_player_player ON parent_player_relationships(player_id);

-- 4. Enable RLS on relationships table
ALTER TABLE parent_player_relationships ENABLE ROW LEVEL SECURITY;

-- 5. Create RLS policies for relationships
-- Parents can view their linked players
CREATE POLICY "Parents can view their linked players"
  ON parent_player_relationships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'parent'
      AND profiles.id = parent_player_relationships.parent_id
    )
  );

-- Players can view their linked parents
CREATE POLICY "Players can view their linked parents"
  ON parent_player_relationships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'player'
      AND profiles.id = parent_player_relationships.player_id
    )
  );

-- Admins can view all relationships
CREATE POLICY "Admins can view all relationships"
  ON parent_player_relationships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can insert relationships
CREATE POLICY "Admins can insert relationships"
  ON parent_player_relationships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can update relationships
CREATE POLICY "Admins can update relationships"
  ON parent_player_relationships FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Admins can delete relationships
CREATE POLICY "Admins can delete relationships"
  ON parent_player_relationships FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- 6. Create function to update updated_at timestamp for relationships
CREATE OR REPLACE FUNCTION update_relationships_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 7. Create trigger to update updated_at
CREATE TRIGGER update_parent_player_relationships_updated_at
  BEFORE UPDATE ON parent_player_relationships
  FOR EACH ROW
  EXECUTE FUNCTION update_relationships_updated_at();

-- 8. Update handle_new_user function to handle both parent and player roles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a basic profile with default role
  -- Additional data will be updated by the client after signup
  INSERT INTO public.profiles (
    id, 
    role, 
    player_name, 
    first_name,
    last_name,
    program_type, 
    competitive_level,
    phone_number,
    birth_date,
    birth_year
  )
  VALUES (
    NEW.id, 
    COALESCE(NEW.raw_user_meta_data->>'role', 'player'),
    COALESCE(NEW.raw_user_meta_data->>'player_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'first_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'last_name', NULL),
    COALESCE(NEW.raw_user_meta_data->>'program_type', ''),
    COALESCE(NEW.raw_user_meta_data->>'competitive_level', ''),
    COALESCE(NEW.raw_user_meta_data->>'phone_number', NULL),
    CASE 
      WHEN NEW.raw_user_meta_data->>'birth_date' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'birth_date')::DATE
      ELSE NULL
    END,
    CASE 
      WHEN NEW.raw_user_meta_data->>'birth_year' IS NOT NULL 
      THEN (NEW.raw_user_meta_data->>'birth_year')::INTEGER
      ELSE NULL
    END
  )
  ON CONFLICT (id) DO UPDATE SET
    player_name = COALESCE(EXCLUDED.player_name, profiles.player_name),
    first_name = COALESCE(EXCLUDED.first_name, profiles.first_name),
    last_name = COALESCE(EXCLUDED.last_name, profiles.last_name),
    program_type = COALESCE(EXCLUDED.program_type, profiles.program_type),
    competitive_level = COALESCE(EXCLUDED.competitive_level, profiles.competitive_level),
    phone_number = COALESCE(EXCLUDED.phone_number, profiles.phone_number),
    birth_date = COALESCE(EXCLUDED.birth_date, profiles.birth_date),
    birth_year = COALESCE(EXCLUDED.birth_year, profiles.birth_year);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

