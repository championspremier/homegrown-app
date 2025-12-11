# Fix: "Database error saving new user" for Parent Signup

## Problem
When parents try to sign up, they get a "Database error saving new user" error. This happens because:
1. The `profiles` table has NOT NULL constraints on `player_name`, `program_type`, and `competitive_level`
2. The `handle_new_user()` trigger function doesn't properly handle parent signups

## Solution

### Step 1: Run the SQL Migration

1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Open the file: `supabase-fix-parent-signup-complete.sql`
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click **Run** (or press Cmd/Ctrl + Enter)

This will:
- ✅ Make `player_name`, `program_type`, and `competitive_level` nullable
- ✅ Update the `handle_new_user()` function to handle both parents and players
- ✅ Recreate the trigger to ensure it's properly set up

### Step 2: Verify the Fix

After running the migration, verify it worked:

```sql
-- Check that columns are now nullable
SELECT column_name, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'profiles' 
AND column_name IN ('player_name', 'program_type', 'competitive_level');

-- Should show: is_nullable = 'YES' for all three columns
```

### Step 3: Test Parent Signup

Try signing up a parent again. The error should be resolved.

## If You Still Get Errors

If you still get errors after running the migration:

1. **Check the Supabase Logs:**
   - Go to **Logs** → **Postgres Logs** in your Supabase Dashboard
   - Look for errors related to `handle_new_user` or `profiles` table

2. **Check the Trigger:**
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
   ```
   Should return one row showing the trigger exists.

3. **Check the Function:**
   ```sql
   SELECT routine_name, routine_definition 
   FROM information_schema.routines 
   WHERE routine_name = 'handle_new_user';
   ```
   Should return the function definition.

4. **Manual Test:**
   Try creating a test parent user directly in the database to see the exact error:
   ```sql
   -- This should work after the migration
   INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data)
   VALUES (
     gen_random_uuid(),
     'test@example.com',
     crypt('testpassword', gen_salt('bf')),
     '{"role": "parent", "first_name": "Test", "last_name": "Parent"}'::jsonb
   );
   ```

## Common Issues

### Issue: "column does not exist"
- **Solution:** Make sure you've run the parent-player migration first (`supabase-migration-parent-player.sql`) to add `first_name`, `last_name`, and `birth_date` columns.

### Issue: "permission denied"
- **Solution:** Make sure you're running the SQL as a database admin/superuser in Supabase.

### Issue: Trigger not firing
- **Solution:** The trigger should be automatically recreated by the migration. If not, manually run:
  ```sql
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
  ```

