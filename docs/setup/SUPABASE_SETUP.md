# Supabase Setup Guide

## Step 1: Create Supabase Project

1. Go to https://app.supabase.com
2. Create a new project
3. Wait for the project to finish setting up

## Step 2: Get Your Credentials

1. Go to **Settings** → **API**
2. Copy your:
   - **Project URL** (e.g., `https://xxxxx.supabase.co`)
   - **anon/public key** (starts with `eyJ...`)

## Step 3: Update Config File

Edit `src/auth/config/supabase.js` and replace:
- `YOUR_SUPABASE_URL` with your Project URL
- `YOUR_SUPABASE_ANON_KEY` with your anon/public key

## Step 4: Create Database Schema

1. Go to **SQL Editor** in Supabase dashboard
2. Copy and paste the contents of `supabase-schema.sql`
3. Click **Run** to create the `profiles` table

## Step 5: Set Up Notion Integration (Optional)

### Option A: Supabase Edge Function (Recommended)

**Note:** All commands below are run in your **terminal** (Cursor terminal or any command line), NOT in the Supabase web dashboard.

1. **Install Supabase CLI** (choose one method):

   **Option 1: Using Homebrew (Recommended for macOS)**
   ```bash
   # First install Homebrew if you don't have it:
   /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
   
   # Then install Supabase CLI:
   brew install supabase/tap/supabase
   ```

   **Option 2: Using npx (No installation needed)**
   - You can use `npx supabase` instead of `supabase` for all commands
   - Example: `npx supabase link --project-ref zponnwrmgqrvrypyqxaj`

2. **Link your project**:
   - Get your Project Reference ID from Supabase dashboard (Settings → General → Reference ID)
   - In terminal, run:
   ```bash
   supabase link --project-ref zponnwrmgqrvrypyqxaj
   ```
   - Or if using npx: `npx supabase link --project-ref zponnwrmgqrvrypyqxaj`
   - This will prompt you to log in to Supabase - follow the instructions

3. **Get Notion API credentials**:
   - Go to https://www.notion.so/my-integrations
   - Create a new integration
   - Copy the **Internal Integration Token**
   - Share your Notion database with the integration

4. **Get Notion Database ID**:
   - Open your Notion database
   - Copy the ID from the URL (the part after the last `/` and before `?`)



5. **Set environment variables** (in terminal):
   ```bash
   supabase secrets set NOTION_API_KEY=your_notion_token
   supabase secrets set NOTION_DATABASE_ID=your_database_id
   ```
   - Replace `your_notion_token` with your Notion Integration Token
   - Replace `your_database_id` with your Notion Database ID
   - **If using npx**: Prefix each command with `npx` (e.g., `npx supabase secrets set ...`)

6. **Deploy the Edge Function** (in terminal):
   ```bash
   supabase functions deploy sync-to-notion
   ```
   - **If using npx**: `npx supabase functions deploy sync-to-notion`

### Option B: Zapier Integration

1. Create a Zap: **Supabase** → **Notion**
2. Trigger: New row in `profiles` table
3. Action: Create page in Notion database
4. Map fields accordingly

## Step 6: Test the Flow

1. Start from `unlock.html`
2. Slide to unlock → redirects to `login-signup.html`
3. Fill out signup form → creates account in Supabase
4. After signup → redirects to `index.html` (player view)

## Authentication Flow

```
unlock.html → login-signup.html → index.html (player view)
```

- **Unlock**: Slide to unlock screen
- **Login/Signup**: Authentication page
- **Player View**: Main app (default role)

## Future: Role-Based Routing

Once you have coach/admin/parent views, update the redirect in `login-signup.js`:

```javascript
const role = profile?.role || 'player';
window.location.href = `../../app/views/${role}/dashboard.html`;
```

## Troubleshooting

- **"Authentication service is not ready"**: Check that Supabase credentials are set correctly
- **"Profile creation failed"**: Make sure you've run the SQL schema
- **"Notion sync failed"**: This is non-critical - data is still saved in Supabase
- **CORS errors**: Make sure your Supabase project allows requests from your domain

