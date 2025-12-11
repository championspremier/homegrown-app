# Deploy Edge Function Guide

## Issue: `command not found: supabase`

If you're getting this error, you need to install the Supabase CLI or use `npx` to run it without installation.

## Option 1: Use npx (No Installation Required)

Run the deployment command with `npx`:

```bash
npx supabase functions deploy sync-to-notion
```

This will download and run the Supabase CLI temporarily without installing it globally.

## Option 2: Install Supabase CLI Globally

### macOS (using Homebrew)
```bash
brew install supabase/tap/supabase
```

### macOS (using npm)
```bash
npm install -g supabase
```

### Verify Installation
```bash
supabase --version
```

## Option 3: Use Supabase Dashboard

You can also deploy Edge Functions directly from the Supabase Dashboard:

1. Go to your Supabase project dashboard
2. Navigate to **Edge Functions** in the left sidebar
3. Click **Create a new function**
4. Name it `sync-to-notion`
5. Copy the contents of `supabase/functions/sync-to-notion/index.ts` into the editor
6. Click **Deploy**

## After Installation: Deploy the Function

Once you have the CLI installed or are using npx:

1. **Login to Supabase** (if not already logged in):
   ```bash
   npx supabase login
   ```
   or
   ```bash
   supabase login
   ```

2. **Link your project** (if not already linked):
   ```bash
   npx supabase link --project-ref your-project-ref
   ```
   You can find your project ref in your Supabase dashboard URL: `https://supabase.com/dashboard/project/YOUR_PROJECT_REF`

3. **Set Environment Variables**:
   ```bash
   npx supabase secrets set NOTION_API_KEY=your_notion_api_key
   npx supabase secrets set NOTION_DATABASE_ID=your_notion_database_id
   ```

4. **Deploy the Function**:
   ```bash
   npx supabase functions deploy sync-to-notion
   ```

## Troubleshooting

- **"Project not found"**: Make sure you're logged in and have linked the correct project
- **"Function already exists"**: The function will be updated, not recreated
- **"Environment variables not set"**: Make sure you've set `NOTION_API_KEY` and `NOTION_DATABASE_ID` using the secrets command above

## Verify Deployment

After deployment, you should see a success message with the function URL. You can also check in your Supabase Dashboard under **Edge Functions** to see the deployed function.

