-- NEW: Run this ONLY if you've already set up the profiles table and RLS policies
-- This adds the trigger function and trigger to auto-create profiles on signup

-- Create function to automatically create profile when user signs up
-- This bypasses RLS issues during signup by using SECURITY DEFINER
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

-- Drop existing trigger if it exists (to avoid conflicts)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to call the function when a new user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

