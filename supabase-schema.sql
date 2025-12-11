-- Supabase Database Schema for Homegrown App
-- Run this in your Supabase SQL Editor

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  player_name TEXT NOT NULL,
  program_type TEXT NOT NULL CHECK (program_type IN ('On-field Program', 'The Virtual Program', 'Homegrown App')),
  team_name TEXT,
  birth_year INTEGER CHECK (birth_year >= 2000 AND birth_year <= 2016),
  competitive_level TEXT NOT NULL CHECK (competitive_level IN (
    'MLS Next Homegrown',
    'MLS Next Academy',
    'ECNL',
    'ECNL RL',
    'NCSL',
    'NAL',
    'EDP',
    'Other'
  )),
  positions TEXT[],
  referral_source TEXT CHECK (referral_source IN (
    'Facebook',
    'Instagram',
    'Tik Tok',
    'Coach',
    'Referral',
    'Google',
    'Other'
  )),
  phone_number TEXT,
  zoho_lead_id TEXT,
  role TEXT DEFAULT 'player' CHECK (role IN ('player', 'coach', 'parent', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies
-- Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Users can insert their own profile (during signup)
CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_profiles_role ON profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_competitive_level ON profiles(competitive_level);
CREATE INDEX IF NOT EXISTS idx_profiles_zoho_lead_id ON profiles(zoho_lead_id);

-- Create function to automatically create profile when user signs up
-- This bypasses RLS issues during signup by using SECURITY DEFINER
-- It creates a basic profile that can be updated later with form data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create a basic profile with default role
  -- Additional data (player_name, etc.) will be updated by the client after signup
  INSERT INTO public.profiles (id, role, player_name, program_type, competitive_level)
  VALUES (
    NEW.id, 
    'player',
    COALESCE(NEW.raw_user_meta_data->>'player_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'program_type', ''),
    COALESCE(NEW.raw_user_meta_data->>'competitive_level', '')
  )
  ON CONFLICT (id) DO UPDATE SET
    player_name = COALESCE(EXCLUDED.player_name, profiles.player_name),
    program_type = COALESCE(EXCLUDED.program_type, profiles.program_type),
    competitive_level = COALESCE(EXCLUDED.competitive_level, profiles.competitive_level);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to call the function when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

