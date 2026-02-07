# SQL Scripts

This directory contains all SQL scripts for database setup and fixes.

## Structure

### Migrations (`migrations/`)
Run these scripts in order to set up your database:

1. `supabase-schema.sql` - Base database schema
2. `supabase-migration-parent-player.sql` - Adds parent/player support
3. `supabase-migration-fix-parent-signup.sql` - Fixes for parent signup
4. `supabase-migration-add-phone.sql` - Adds phone number support
5. `supabase-coach-signup.sql` - Adds coach role support

### Fixes (`fixes/`)
Use these scripts to fix specific issues:

- `fix-parent-profile-simple.sql` - Fix missing parent profiles
- `fix-parent-relationship-rls-complete.sql` - Fix RLS policies for relationships
- `fix-profiles-rls-for-parents.sql` - Fix RLS policies for profile access
- `fix-rls-policy-final.sql` - Complete RLS policy fixes
- `supabase-complete-parent-fix.sql` - Complete parent signup fix
- `supabase-fix-parent-signup-complete.sql` - Alternative parent signup fix
- `supabase-trigger-only.sql` - Trigger-only update

## Usage

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the script content
4. Click "Run"

**Important**: Always run migrations in order. Fixes can be run independently as needed.

