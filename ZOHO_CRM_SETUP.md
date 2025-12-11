# Zoho CRM Setup Guide

**Last Updated:** [Date]  
**Purpose:** Complete guide for setting up Zoho CRM integration with Homegrown app

---

## Table of Contents

1. [Overview](#overview)
2. [Step 1: Create Zoho CRM Account](#step-1-create-zoho-crm-account)
3. [Step 2: Set Up Custom Fields](#step-2-set-up-custom-fields)
4. [Step 3: Create Email Templates](#step-3-create-email-templates)
5. [Step 4: Create SMS Templates](#step-4-create-sms-templates)
6. [Step 5: Set Up Automation Workflows](#step-5-set-up-automation-workflows)
7. [Step 6: Get API Credentials](#step-6-get-api-credentials)
8. [Step 7: Configure Supabase Edge Function](#step-7-configure-supabase-edge-function)
9. [Step 8: Test Integration](#step-8-test-integration)
10. [Troubleshooting](#troubleshooting)

---

## Overview

Zoho CRM will handle:
- **Lead Management**: Track players through the funnel (new → contacted → evaluated → converted)
- **Email Notifications**: Send automated emails to parents and coaches
- **SMS Notifications**: Send SMS reminders to coaches
- **Contact Management**: Store and sync player/parent contact information

### Integration Flow

```
Player Signs Up
  ↓
Supabase creates profile
  ↓
Edge Function calls Zoho API
  ↓
Zoho creates lead
  ↓
Zoho automation triggers
  ↓
Parent email sent
Coach email + SMS sent
```

---

## Step 1: Create Zoho CRM Account

### 1.1 Sign Up for Zoho CRM

1. Go to https://www.zoho.com/crm/
2. Click **"Start Free Trial"** or **"Sign Up"**
3. Choose a plan:
   - **Free Plan**: Up to 3 users, basic features
   - **Standard Plan**: $14/user/month (recommended for production)
   - **Professional Plan**: $23/user/month (advanced features)

### 1.2 Complete Setup

1. Enter your organization details
2. Verify your email address
3. Set up your first user (this will be the admin account)
4. Choose your data center location (US, EU, IN, AU, etc.)

### 1.3 Access Your CRM

1. Log in at https://crm.zoho.com
2. You'll see the Zoho CRM dashboard
3. Navigate to **Settings** (gear icon in top right)

---

## Step 2: Set Up Custom Fields

### 2.1 Navigate to Custom Fields

1. Go to **Settings** → **Customization** → **Modules** → **Leads**
2. Click **"Fields"** tab
3. Click **"Create New Field"**

### 2.2 Create Required Custom Fields

Create the following custom fields in the **Leads** module:

#### Field 1: Player Name
- **Field Label**: `Player Name`
- **Field Type**: `Text`
- **Required**: Yes
- **API Name**: `Player_Name` (auto-generated)

#### Field 2: Birth Year
- **Field Label**: `Birth Year`
- **Field Type**: `Number`
- **Required**: No
- **API Name**: `Birth_Year`

#### Field 3: Competitive Level
- **Field Label**: `Competitive Level`
- **Field Type**: `Pick List`
- **Values**:
  - MLS Next Homegrown
  - MLS Next Academy
  - ECNL
  - ECNL RL
  - NCSL
  - NAL
  - EDP
  - Other
- **API Name**: `Competitive_Level`

#### Field 4: Position
- **Field Label**: `Positions`
- **Field Type**: `Multi-Select Pick List`
- **Values**:
  - GK
  - Central Defender
  - Mid-Defensive
  - Mid-Offensive
  - Winger
  - Full-Back
  - Forward
- **API Name**: `Positions`

#### Field 5: Program Type
- **Field Label**: `Program Type`
- **Field Type**: `Pick List`
- **Values**:
  - On-field Program
  - The Virtual Program
  - Homegrown App
- **API Name**: `Program_Type`

#### Field 6: Team Name
- **Field Label**: `Team Name`
- **Field Type**: `Text`
- **Required**: No
- **API Name**: `Team_Name`

#### Field 7: First Session Completed
- **Field Label**: `First Session Completed`
- **Field Type**: `Checkbox`
- **Default Value**: Unchecked
- **API Name**: `First_Session_Completed`

#### Field 8: Plan Type
- **Field Label**: `Plan Type`
- **Field Type**: `Pick List`
- **Values**:
  - Homegrown Starter
  - Homegrown Yearly
  - Premier
  - Pro
  - Champion
  - Virtual Premier
  - Virtual Elite
- **API Name**: `Plan_Type`

### 2.3 Update Lead Status Values

1. Go to **Settings** → **Customization** → **Modules** → **Leads**
2. Click **"Fields"** tab
3. Find **"Lead Status"** field (default field)
4. Click **"Edit"**
5. Ensure these status values exist:
   - New
   - Contacted
   - Evaluated
   - Offered
   - Converted
   - Not Interested

---

## Step 3: Create Email Templates

### 3.1 Navigate to Email Templates

1. Go to **Settings** → **Templates** → **Email Templates**
2. Click **"Create Template"**

### 3.2 Template 1: Parent Welcome Email

**Template Name**: `Parent Welcome Email`

**Subject**: `Welcome to Champions Premier!`

**Body**:
```
Hey {{Leads.First_Name}},

Thanks for your interest! We love learning about new ballers of our community that we can help. We will be in touch with you soon on how Champions Premier's free evaluation process occurs. Looking forward to working with you at #thebestofthebest environment in the US!🏆

📲 Download our app to view our virtual and on-field schedule:

Champions Premier App 📲

Champions Premier
```

**Variables Used**:
- `{{Leads.First_Name}}` - Parent's first name

**Save** the template.

### 3.3 Template 2: Coach New Lead Email

**Template Name**: `Coach New Lead Email`

**Subject**: `New Lead - {{Leads.Player_Name}}`

**Body**:
```
New Lead

Here's the details about your new lead. We set 'em up, you knock 'em down!

Lead

Name: {{Leads.Player_Name}}
Email: {{Leads.Email}}
Phone: {{Leads.Phone}}
Program Type: {{Leads.Program_Type}}
Competitive Level: {{Leads.Competitive_Level}}
Positions: {{Leads.Positions}}

Details

View Lead Profile: {{Leads.LEADID}}
```

**Variables Used**:
- `{{Leads.Player_Name}}`
- `{{Leads.Email}}`
- `{{Leads.Phone}}`
- `{{Leads.Program_Type}}`
- `{{Leads.Competitive_Level}}`
- `{{Leads.Positions}}`
- `{{Leads.LEADID}}`

**Save** the template.

### 3.4 Template 3: Offer Spot Email

**Template Name**: `Offer Spot Email`

**Subject**: `We'd Love to Have {{Leads.Player_Name}} Join Champions Premier!`

**Body**:
```
Hi {{Leads.First_Name}},

I really enjoyed our conversation, and I am extremely excited to offer {{Leads.Player_Name}} a spot at Champions Premier! Please review our Champions Premier Plans & Services document & video below. This dives deeper into who we are and what we do for our players and families. Our goal is to get your account set up on the best plan for your son's development. Looking forward to speaking with you soon and seeing {{Leads.Player_Name}} at his next session as an official member of our Champions Premier family!

Enter your email
Password: Champion

CLICK HERE FOR VIDEO
[Your video link here]

CLICK HERE FOR DOCSEND
[Your DocSend link here]

Best,
{{Users.First_Name}}
```

**Variables Used**:
- `{{Leads.First_Name}}`
- `{{Leads.Player_Name}}`
- `{{Users.First_Name}}` - Coach's first name

**Save** the template.

---

## Step 4: Create SMS Templates

### 4.1 Enable SMS in Zoho

1. Go to **Settings** → **Channels** → **SMS**
2. If not already enabled, click **"Enable SMS"**
3. You may need to purchase SMS credits or set up a Twilio integration

### 4.2 Template: Coach New Lead SMS

**Template Name**: `Coach New Lead SMS`

**Message**:
```
Hi {{Users.First_Name}},

We have a new lead - follow these steps:

🚨GOAL: Get them to a session virtually, on field or HD & give them something for FREE.🚨

1. Send them the "🌐Web-Lead | First Text" OR "💬Web Chat Box Lead | First Text"

2. Give them a call and use this script: [Link to call script]

Player: {{Leads.Player_Name}}
Email: {{Leads.Email}}
Phone: {{Leads.Phone}}
```

**Note**: SMS has a 160 character limit. You may need to shorten this or send multiple messages.

**Variables Used**:
- `{{Users.First_Name}}`
- `{{Leads.Player_Name}}`
- `{{Leads.Email}}`
- `{{Leads.Phone}}`

**Save** the template.

---

## Step 5: Set Up Automation Workflows

### 5.1 Navigate to Workflows

1. Go to **Settings** → **Automation** → **Workflows**
2. Click **"Create Workflow"**

### 5.2 Workflow 1: New Lead → Send Parent Email

**Workflow Name**: `New Lead - Send Parent Welcome Email`

**Trigger**:
- **When**: Record is created
- **Module**: Leads
- **Condition**: Lead Status = "New"

**Actions**:
1. **Send Email**
   - **To**: `{{Leads.Email}}`
   - **Template**: "Parent Welcome Email"
   - **From**: Your organization email

**Save** and **Activate** the workflow.

### 5.3 Workflow 2: New Lead → Notify Coaches

**Workflow Name**: `New Lead - Notify Coaches`

**Trigger**:
- **When**: Record is created
- **Module**: Leads
- **Condition**: Lead Status = "New"

**Actions**:
1. **Send Email**
   - **To**: All users in "Coaches" role (or specific coach emails)
   - **Template**: "Coach New Lead Email"
   - **From**: Your organization email

2. **Send SMS** (if enabled)
   - **To**: Coach phone numbers
   - **Template**: "Coach New Lead SMS"

**Save** and **Activate** the workflow.

### 5.4 Workflow 3: First Session Completed → Send Offer

**Workflow Name**: `First Session - Send Offer Email`

**Trigger**:
- **When**: Field is updated
- **Module**: Leads
- **Field**: First Session Completed
- **Condition**: First Session Completed = True AND Lead Status = "Evaluated"

**Actions**:
1. **Update Record**
   - Set Lead Status = "Offered"

2. **Send Email**
   - **To**: `{{Leads.Email}}`
   - **Template**: "Offer Spot Email"
   - **From**: Assigned coach email

**Save** and **Activate** the workflow.

---

## Step 6: Get API Credentials

### 6.1 Create Zoho API Client

1. Go to https://api-console.zoho.com/
2. Click **"Add Client"**
3. Select **"Server-based Applications"**
4. Fill in:
   - **Client Name**: `Homegrown App Integration`
   - **Homepage URL**: `https://your-domain.com` (or `http://localhost:8000` for development)
   - **Authorized Redirect URIs**: 
     - `https://your-domain.com/auth/callback`
     - `http://localhost:8000/auth/callback` (for development)
5. Click **"Create"**

### 6.2 Generate Access Token

1. After creating the client, you'll see:
   - **Client ID**: `1000.XXXXXXXXXX`
   - **Client Secret**: `XXXXXXXXXXXXXXXXXXXXXXXX`

2. **Generate Refresh Token**:
   - Use Zoho's OAuth playground: https://api-console.zoho.com/
   - Or use this URL (replace `YOUR_CLIENT_ID`):
     ```
     https://accounts.zoho.com/oauth/v2/auth?scope=ZohoCRM.modules.ALL,ZohoCRM.settings.ALL&client_id=YOUR_CLIENT_ID&response_type=code&access_type=offline&redirect_uri=http://localhost:8000/auth/callback
     ```
   - Authorize the application
   - Copy the `code` from the redirect URL
   - Exchange code for refresh token using:
     ```bash
     curl -X POST https://accounts.zoho.com/oauth/v2/token \
       -d "grant_type=authorization_code" \
       -d "client_id=YOUR_CLIENT_ID" \
       -d "client_secret=YOUR_CLIENT_SECRET" \
       -d "redirect_uri=http://localhost:8000/auth/callback" \
       -d "code=CODE_FROM_REDIRECT"
     ```
   - Save the **Refresh Token** (starts with `1000.`)

### 6.3 Save Credentials Securely

You'll need these values for the Supabase Edge Function:
- **Client ID**: `1000.XXXXXXXXXX`
- **Client Secret**: `XXXXXXXXXXXXXXXXXXXXXXXX`
- **Refresh Token**: `1000.XXXXXXXXXXXXXXXXXXXXXXXX`
- **API Domain**: `https://www.zohoapis.com` (or your data center URL)

---

## Step 7: Configure Supabase Edge Function

### 7.1 Create Edge Function

Create a new Edge Function: `supabase/functions/sync-to-zoho/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ZOHO_CLIENT_ID = Deno.env.get('ZOHO_CLIENT_ID')
const ZOHO_CLIENT_SECRET = Deno.env.get('ZOHO_CLIENT_SECRET')
const ZOHO_REFRESH_TOKEN = Deno.env.get('ZOHO_REFRESH_TOKEN')
const ZOHO_API_DOMAIN = Deno.env.get('ZOHO_API_DOMAIN') || 'https://www.zohoapis.com'

interface LeadData {
  playerName: string
  email: string
  phone?: string
  programType: string
  teamName?: string
  birthYear: number
  competitiveLevel: string
  positions: string[]
  referralSource?: string
}

// Get access token from refresh token
async function getAccessToken(): Promise<string> {
  const response = await fetch(`${ZOHO_API_DOMAIN.replace('/crm', '')}/oauth/v2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: ZOHO_REFRESH_TOKEN!,
      client_id: ZOHO_CLIENT_ID!,
      client_secret: ZOHO_CLIENT_SECRET!,
      grant_type: 'refresh_token',
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to get access token: ${error}`)
  }

  const data = await response.json()
  return data.access_token
}

// Create lead in Zoho CRM
async function createZohoLead(accessToken: string, data: LeadData): Promise<string> {
  // Split player name into first and last name
  const nameParts = data.playerName.trim().split(' ')
  const firstName = nameParts[0] || ''
  const lastName = nameParts.slice(1).join(' ') || ''

  const leadData = {
    data: [{
      First_Name: firstName,
      Last_Name: lastName,
      Email: data.email,
      Phone: data.phone || '',
      Lead_Status: 'New',
      Lead_Source: data.referralSource || 'Website',
      // Custom fields
      Player_Name: data.playerName,
      Birth_Year: data.birthYear,
      Competitive_Level: data.competitiveLevel,
      Positions: data.positions.join(', '),
      Program_Type: data.programType,
      Team_Name: data.teamName || '',
      First_Session_Completed: false,
    }],
  }

  const response = await fetch(`${ZOHO_API_DOMAIN}/crm/v3/Leads`, {
    method: 'POST',
    headers: {
      'Authorization': `Zoho-oauthtoken ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(leadData),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to create Zoho lead: ${error}`)
  }

  const result = await response.json()
  return result.data[0].details.id
}

serve(async (req) => {
  // CORS headers
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    })
  }

  try {
    const data: LeadData = await req.json()

    // Validate required fields
    if (!data.playerName || !data.email || !data.programType) {
      throw new Error('Missing required fields')
    }

    // Get access token
    const accessToken = await getAccessToken()

    // Create lead in Zoho
    const leadId = await createZohoLead(accessToken, data)

    return new Response(
      JSON.stringify({ success: true, leadId }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  } catch (error) {
    console.error('Error syncing to Zoho:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )
  }
})
```

### 7.2 Set Environment Variables

In your terminal, run:

```bash
# Set Zoho credentials
supabase secrets set ZOHO_CLIENT_ID=your_client_id
supabase secrets set ZOHO_CLIENT_SECRET=your_client_secret
supabase secrets set ZOHO_REFRESH_TOKEN=your_refresh_token
supabase secrets set ZOHO_API_DOMAIN=https://www.zohoapis.com
```

### 7.3 Deploy Edge Function

```bash
supabase functions deploy sync-to-zoho
```

### 7.4 Update Database Schema

Add `phone_number` and `zoho_lead_id` to the profiles table:

```sql
-- Add phone number field
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_number TEXT;

-- Add Zoho lead ID field
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS zoho_lead_id TEXT;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_zoho_lead_id ON profiles(zoho_lead_id);
```

---

## Step 8: Test Integration

### 8.1 Test Signup Flow

1. Go to your signup page
2. Fill out the form (including phone number)
3. Submit the form
4. Check:
   - ✅ Lead created in Zoho CRM
   - ✅ Parent welcome email sent
   - ✅ Coach email sent
   - ✅ Coach SMS sent (if enabled)
   - ✅ `zoho_lead_id` stored in Supabase profile

### 8.2 Verify in Zoho CRM

1. Log into Zoho CRM
2. Go to **Leads** module
3. Find the new lead
4. Verify all custom fields are populated correctly
5. Check **Activities** tab for sent emails

### 8.3 Test Workflows

1. Manually update a lead's **First Session Completed** to `True`
2. Verify the offer email is sent automatically
3. Check that Lead Status updates to "Offered"

---

## Troubleshooting

### Issue: "Invalid Grant" Error

**Solution**: 
- Refresh token may have expired
- Regenerate refresh token using OAuth flow
- Update `ZOHO_REFRESH_TOKEN` secret

### Issue: Custom Fields Not Appearing

**Solution**:
- Verify field API names match exactly (case-sensitive)
- Check that fields are added to Leads module
- Ensure fields are not marked as "Read Only"

### Issue: Emails Not Sending

**Solution**:
- Check workflow is activated
- Verify email templates exist
- Check Zoho email sending limits
- Verify sender email is verified in Zoho

### Issue: SMS Not Sending

**Solution**:
- Verify SMS is enabled in Zoho
- Check SMS credits/balance
- Verify phone numbers are in correct format
- Check Twilio integration (if using)

### Issue: API Rate Limits

**Solution**:
- Zoho has rate limits (varies by plan)
- Implement retry logic with exponential backoff
- Consider batching requests
- Upgrade Zoho plan if needed

---

## Next Steps

1. ✅ Set up Zoho CRM account
2. ✅ Configure custom fields
3. ✅ Create email/SMS templates
4. ✅ Set up automation workflows
5. ✅ Get API credentials
6. ✅ Deploy Edge Function
7. ✅ Test integration
8. ⏭️ Update `login-signup.js` to call Zoho Edge Function
9. ⏭️ Add error handling and retry logic
10. ⏭️ Set up monitoring and alerts

---

## Additional Resources

- [Zoho CRM API Documentation](https://www.zoho.com/crm/developer/docs/api/v3/overview.html)
- [Zoho OAuth Guide](https://www.zoho.com/crm/developer/docs/api/v3/oauth-overview.html)
- [Zoho Workflow Automation](https://help.zoho.com/portal/en/kb/crm/automation/workflows/articles/workflow-rules)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)

---

**Document Owner:** [Your Name]  
**Last Reviewed:** [Date]  
**Next Review:** [Date + 30 days]

