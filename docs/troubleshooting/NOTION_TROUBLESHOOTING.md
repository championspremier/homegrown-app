# Notion Integration Troubleshooting Guide

## Why is my Notion database not populating?

The signup flow tries to sync data to Notion via a Supabase Edge Function. Here are the most common issues and how to fix them:

## Step 1: Check Browser Console

1. Open your browser's Developer Tools (F12 or Cmd+Option+I)
2. Go to the **Console** tab
3. Try signing up a new user
4. Look for error messages starting with:
   - `❌ Notion sync failed:`
   - `❌ Edge Function error:`
   - `Error syncing to Notion:`

## Common Issues & Solutions

### Issue 1: Edge Function Not Deployed

**Symptoms:**
- Console shows: `Edge Function error: Function not found` or `404`
- Console shows: `Function 'sync-to-notion' does not exist`

**Solution:**
1. Open terminal in your project directory
2. Make sure you're linked to Supabase:
   ```bash
   supabase link --project-ref YOUR_PROJECT_REF
   # Or with npx:
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```
3. Deploy the Edge Function:
   ```bash
   supabase functions deploy sync-to-notion
   # Or with npx:
   npx supabase functions deploy sync-to-notion
   ```
4. Wait for deployment to complete
5. Try signing up again

### Issue 2: Environment Variables Not Set

**Symptoms:**
- Console shows: `Notion API credentials not configured`
- Console shows: `Edge Function error: Missing environment variables`

**Solution:**
1. Get your Notion API credentials:
   - Go to https://www.notion.so/my-integrations
   - Create a new integration (or use existing)
   - Copy the **Internal Integration Token**
   - Share your Notion database with the integration

2. Get your Notion Database ID:
   - Open your Notion database
   - Copy the ID from the URL (the part after the last `/` and before `?`)
   - Example: `https://www.notion.so/YOUR_WORKSPACE/DATABASE_ID?v=...`

3. Set the environment variables in Supabase:
   ```bash
   supabase secrets set NOTION_API_KEY=your_notion_token_here
   supabase secrets set NOTION_DATABASE_ID=your_database_id_here
   # Or with npx:
   npx supabase secrets set NOTION_API_KEY=your_notion_token_here
   npx supabase secrets set NOTION_DATABASE_ID=your_database_id_here
   ```

4. Try signing up again

### Issue 3: Notion Database Properties Don't Match ⚠️ **YOUR CURRENT ISSUE**

**Symptoms:**
- Console shows: `"Property Name" is not a property that exists`
- Console shows: `validation_error` from Notion API
- Error lists multiple properties that don't exist
- Example error: `"Program Type is not a property that exists. Team Name is not a property that exists..."`

**What This Means:**
The property names in your Edge Function don't match the actual property names in your Notion database. Property names are **case-sensitive** and must match exactly.

**Solution - Option A: Update Edge Function to Match Your Notion Database (Recommended)**

1. **Find Your Actual Property Names:**
   - Open your Notion database
   - Look at the column headers - these are your property names
   - **Write down the EXACT names** (including capitalization and spaces)
   - Example: If your column is "program type" (lowercase), use "program type", not "Program Type"

2. **Check Property Types:**
   - In Notion, click on each property/column
   - Note the property type:
     - **Title** = `title` (usually the first column)
     - **Select** = `select` (dropdown with options)
     - **Multi-select** = `multi_select` (multiple checkboxes)
     - **Number** = `number` (numeric value)
     - **Text** = `rich_text` (plain text)
     - **Email** = `email` (email address)
     - **Date** = `date` (date picker)

3. **Update the Edge Function:**
   - Open `supabase/functions/sync-to-notion/index.ts`
   - Find the `properties` object (around line 54)
   - Update each property name to match your Notion database exactly
   - Update property types if needed (e.g., if "Birth Year" is a select in Notion, change from `number` to `select`)

4. **Example Fix:**
   If your Notion database has:
   - "Player Name" (Title) ✅ matches
   - "program type" (Select) ← lowercase 't'!
   - "Team" (Text) ← different name!
   - "Birth Year" (Select) ← not Number!
   - "Competitive level" (Select) ← lowercase 'l'!
   - "Position" (Multi-select) ← singular, not plural!
   - "How did you hear about us?" (Select) ← different name!
   - "Email Address" (Email) ← different name!
   - "Date Signed Up" (Date) ← different name!

   Then update the Edge Function like this:
   ```typescript
   properties: {
     'Player Name': {  // Must match exactly
       title: [{ text: { content: data.playerName } }]
     },
     'program type': {  // lowercase 't' to match Notion
       select: { name: data.programType }
     },
     'Team': {  // Different name
       rich_text: data.teamName ? [{ text: { content: data.teamName } }] : []
     },
     'Birth Year': {  // Changed from number to select
       select: { name: String(data.birthYear) }  // Convert to string
     },
     'Competitive level': {  // lowercase 'l'
       select: { name: data.competitiveLevel }
     },
     'Position': {  // singular, not plural
       multi_select: positionOptions
     },
     'How did you hear about us?': {  // Different name
       select: data.referralSource ? { name: data.referralSource } : { name: 'Other' }
     },
     'Email Address': {  // Different name
       email: data.email
     },
     'Date Signed Up': {  // Different name
       date: { start: new Date().toISOString().split('T')[0] }
     }
   }
   ```

5. **Redeploy:**
   ```bash
   supabase functions deploy sync-to-notion
   ```

**Solution - Option B: Rename Properties in Notion (Alternative)**

If you prefer to keep the Edge Function as-is, rename your Notion database properties to match:
- `Player Name` (Title property)
- `Program Type` (Select property)
- `Team Name` (Rich Text property)
- `Birth Year` (Select property - change from Number to Select if needed)
- `Competitive Level` (Select property)
- `Positions` (Multi-select property)
- `Referral Source` (Select property)
- `Email` (Email property)
- `Signup Date` (Date property) - optional

### Issue 4: Notion Integration Not Shared with Database

**Symptoms:**
- Console shows: `Notion API error: object_not_found`
- Console shows: `Database not found`

**Solution:**
1. Open your Notion database
2. Click the **...** menu (top right)
3. Click **Add connections** or **Connections**
4. Select your integration
5. Make sure it has access to the database
6. Try signing up again

### Issue 5: CORS Errors

**Symptoms:**
- Console shows: `CORS policy` errors
- Console shows: `Access-Control-Allow-Origin` errors

**Solution:**
The Edge Function should handle CORS automatically. If you see CORS errors:
1. Make sure the Edge Function is deployed correctly
2. Check that you're using the latest version of the function
3. Redeploy the function:
   ```bash
   supabase functions deploy sync-to-notion
   ```

## Testing the Edge Function Manually

You can test the Edge Function directly to see what's happening:

1. Go to your Supabase dashboard
2. Navigate to **Edge Functions** → **sync-to-notion**
3. Click **Invoke function**
4. Use this test payload:
   ```json
   {
     "playerName": "Test Player",
     "programType": "On-field Program",
     "teamName": "Test Team",
     "birthYear": 2010,
     "competitiveLevel": "ECNL",
     "positions": ["Forward", "Winger"],
     "referralSource": "Google",
     "email": "test@example.com"
   }
   ```
5. Check the response for errors

## Quick Checklist

- [ ] Edge Function is deployed (`supabase functions deploy sync-to-notion`)
- [ ] Environment variables are set (`NOTION_API_KEY` and `NOTION_DATABASE_ID`)
- [ ] Notion integration is shared with the database
- [ ] Notion database has all required properties with correct names
- [ ] Browser console shows no errors (or only non-critical warnings)
- [ ] Tested Edge Function manually in Supabase dashboard

## Still Not Working?

1. **Check Supabase Logs:**
   - Go to Supabase dashboard → **Edge Functions** → **sync-to-notion** → **Logs**
   - Look for error messages

2. **Check Notion API Status:**
   - Make sure Notion API is accessible
   - Check if there are any rate limits

3. **Verify Data Format:**
   - Check browser console for the data being sent
   - Compare with what Notion expects

4. **Test with Direct API Call:**
   - Temporarily uncomment Option B in `login-signup.js`
   - Set up a Notion webhook URL
   - Test if direct API works

## Important Notes

- **Notion sync is non-critical**: Even if Notion sync fails, the user account is still created in Supabase
- **Data is saved in Supabase**: Your source of truth is Supabase, Notion is just for convenience
- **Check console logs**: The updated code now provides detailed error messages

