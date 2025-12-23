# Email Notifications for Session Cancellations

## Overview
This document outlines the plan for implementing email notifications when sessions are cancelled, using Zoho API integration.

## Implementation Options

### Option 1: Supabase Edge Function (Recommended)
**Pros:**
- Server-side execution (secure API keys)
- Can be triggered via database triggers or API calls
- No client-side API key exposure
- Can handle complex logic and retries

**Cons:**
- Requires Supabase Edge Function setup
- Additional deployment step

### Option 2: Direct Zoho API from Client
**Pros:**
- Simpler initial setup
- No server-side code needed

**Cons:**
- API keys exposed in client code (security risk)
- Not recommended for production

## Recommended Approach: Supabase Edge Function

### Step 1: Set Up Zoho API Credentials

1. **Create Zoho API Application:**
   - Go to https://api-console.zoho.com/
   - Create a new application
   - Note down: Client ID, Client Secret, Refresh Token

2. **Store Credentials Securely:**
   - Add to Supabase Secrets (not in code):
     ```
     ZOHO_CLIENT_ID=your_client_id
     ZOHO_CLIENT_SECRET=your_client_secret
     ZOHO_REFRESH_TOKEN=your_refresh_token
     ZOHO_FROM_EMAIL=noreply@yourdomain.com
     ```

### Step 2: Create Supabase Edge Function

**File: `supabase/functions/send-cancellation-email/index.ts`**

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const ZOHO_API_URL = 'https://mail.zoho.com/api/accounts/{accountId}/messages'

serve(async (req) => {
  try {
    // Get credentials from environment
    const zohoClientId = Deno.env.get('ZOHO_CLIENT_ID')
    const zohoClientSecret = Deno.env.get('ZOHO_CLIENT_SECRET')
    const zohoRefreshToken = Deno.env.get('ZOHO_REFRESH_TOKEN')
    const fromEmail = Deno.env.get('ZOHO_FROM_EMAIL')

    // Parse request body
    const { sessionData, recipientType } = await req.json()

    // Get access token from Zoho
    const tokenResponse = await fetch('https://accounts.zoho.com/oauth/v2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        refresh_token: zohoRefreshToken,
        client_id: zohoClientId,
        client_secret: zohoClientSecret,
        grant_type: 'refresh_token'
      })
    })

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Determine recipient email based on type
    let recipientEmail = ''
    let recipientName = ''
    
    if (recipientType === 'player') {
      recipientEmail = sessionData.player_email
      recipientName = `${sessionData.player_first_name} ${sessionData.player_last_name}`
    } else if (recipientType === 'parent') {
      recipientEmail = sessionData.parent_email
      recipientName = `${sessionData.parent_first_name} ${sessionData.parent_last_name}`
    } else if (recipientType === 'coach') {
      recipientEmail = sessionData.coach_email
      recipientName = `${sessionData.coach_first_name} ${sessionData.coach_last_name}`
    }

    // Format session date/time
    const sessionDate = new Date(sessionData.session_date)
    const sessionTime = sessionData.session_time
    const formattedDate = sessionDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })

    // Create email content
    const emailSubject = `Session Cancelled: ${sessionData.session_type}`
    const emailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2>Session Cancellation Notice</h2>
          <p>Dear ${recipientName},</p>
          <p>We regret to inform you that the following session has been cancelled:</p>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Session Type:</strong> ${sessionData.session_type}</p>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Time:</strong> ${sessionTime}</p>
            ${sessionData.coach_name ? `<p><strong>Coach:</strong> ${sessionData.coach_name}</p>` : ''}
          </div>
          <p>If you have any questions or would like to reschedule, please contact us.</p>
          <p>Best regards,<br>Your Team</p>
        </body>
      </html>
    `

    // Send email via Zoho API
    const emailResponse = await fetch(ZOHO_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Zoho-oauthtoken ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fromAddress: fromEmail,
        toAddress: recipientEmail,
        subject: emailSubject,
        content: emailBody,
        contentType: 'html'
      })
    })

    if (!emailResponse.ok) {
      throw new Error(`Zoho API error: ${emailResponse.statusText}`)
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Email sent successfully' }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

### Step 3: Update Coach Home to Call Edge Function

**In `src/app/views/coach/home/home.js`:**

Add this function after `handleCancelSession`:

```javascript
// Send cancellation emails (to be implemented)
async function sendCancellationEmails(sessionData) {
  if (!supabaseReady || !supabase) return;
  
  try {
    // Get player and parent information
    const bookingData = sessionData.booking_data;
    if (!bookingData || !bookingData.player) return;
    
    // Get coach information
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return;
    
    const { data: coachProfile } = await supabase
      .from('profiles')
      .select('first_name, last_name, email')
      .eq('id', session.user.id)
      .single();
    
    // Get parent information if exists
    let parentProfile = null;
    if (bookingData.parent_id) {
      const { data: parent } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', bookingData.parent_id)
        .single();
      parentProfile = parent;
    }
    
    // Prepare email data
    const emailData = {
      sessionData: {
        session_type: sessionData.session_type,
        session_date: sessionData.session_date,
        session_time: sessionData.session_time,
        player_email: bookingData.player.email || '',
        player_first_name: bookingData.player.first_name || '',
        player_last_name: bookingData.player.last_name || '',
        parent_email: parentProfile?.email || '',
        parent_first_name: parentProfile?.first_name || '',
        parent_last_name: parentProfile?.last_name || '',
        coach_email: coachProfile?.email || '',
        coach_first_name: coachProfile?.first_name || '',
        coach_last_name: coachProfile?.last_name || '',
        coach_name: coachProfile ? `${coachProfile.first_name} ${coachProfile.last_name}` : 'Coach'
      }
    };
    
    // Send email to player (if they have an email)
    if (emailData.sessionData.player_email) {
      await supabase.functions.invoke('send-cancellation-email', {
        body: { ...emailData, recipientType: 'player' }
      });
    }
    
    // Send email to parent (if exists and has email)
    if (emailData.sessionData.parent_email) {
      await supabase.functions.invoke('send-cancellation-email', {
        body: { ...emailData, recipientType: 'parent' }
      });
    }
    
    // Send email to coach
    if (emailData.sessionData.coach_email) {
      await supabase.functions.invoke('send-cancellation-email', {
        body: { ...emailData, recipientType: 'coach' }
      });
    }
    
  } catch (error) {
    console.error('Error sending cancellation emails:', error);
    // Don't block cancellation if email fails
  }
}
```

Then update `handleCancelSession` to call it:

```javascript
// After successful cancellation update:
await sendCancellationEmails(currentSessionData);
```

### Step 4: Deploy Edge Function

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref your-project-ref

# Deploy the function
supabase functions deploy send-cancellation-email
```

### Step 5: Set Environment Variables

In Supabase Dashboard:
1. Go to Project Settings → Edge Functions
2. Add secrets:
   - `ZOHO_CLIENT_ID`
   - `ZOHO_CLIENT_SECRET`
   - `ZOHO_REFRESH_TOKEN`
   - `ZOHO_FROM_EMAIL`

## Alternative: Database Trigger Approach

Instead of calling from client, you could set up a database trigger:

```sql
-- Create a function to send email on cancellation
CREATE OR REPLACE FUNCTION notify_session_cancellation()
RETURNS TRIGGER AS $$
BEGIN
  -- Only trigger on status change to 'cancelled'
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    -- Call edge function via HTTP
    PERFORM net.http_post(
      url := 'https://your-project.supabase.co/functions/v1/send-cancellation-email',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
      ),
      body := jsonb_build_object(
        'sessionData', row_to_json(NEW),
        'recipientType', 'player'
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
CREATE TRIGGER on_session_cancelled
  AFTER UPDATE ON individual_session_bookings
  FOR EACH ROW
  EXECUTE FUNCTION notify_session_cancellation();
```

## Testing

1. Test with a test email address first
2. Verify emails are received
3. Check Zoho API logs for any errors
4. Test with actual user accounts

## Next Steps (When Ready)

1. ✅ Set up Zoho API account and get credentials
2. ✅ Create Supabase Edge Function
3. ✅ Add email templates (HTML)
4. ✅ Test email sending
5. ✅ Deploy to production
6. ✅ Monitor email delivery rates
7. ✅ Add email preferences (opt-in/opt-out)

## Notes

- Consider adding email templates for different scenarios
- Add retry logic for failed email sends
- Consider using a queue system for high volume
- Add logging/monitoring for email delivery
- Consider adding email preferences table for users

