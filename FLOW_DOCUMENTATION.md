# Homegrown App - Complete Flow Documentation

**Last Updated:** [Date]  
**Version:** 1.0  
**Status:** Planning Phase

---

## Table of Contents

1. [Overview](#overview)
2. [User Roles](#user-roles)
3. [Signup Flow](#signup-flow)
4. [Reservation Flow](#reservation-flow)
5. [Evaluation Flow](#evaluation-flow)
6. [Onboarding Flow](#onboarding-flow)
7. [Notification Flows](#notification-flows)
8. [Coach Workflows](#coach-workflows)
9. [Parent Workflows](#parent-workflows)
10. [Solo Session Flow](#solo-session-flow)
11. [Points System Flow](#points-system-flow)
12. [Database State Transitions](#database-state-transitions)

---

## Overview

This document outlines all user flows, system interactions, and state transitions for the Homegrown app. Each flow includes:
- **Trigger**: What initiates the flow
- **Steps**: Sequential actions
- **System Actions**: Backend/database changes
- **Notifications**: Emails/SMS sent
- **State Changes**: Database field updates
- **UI Updates**: Frontend changes
- **Edge Cases**: Error handling and exceptions

---

## User Roles

### Player
- Can sign up, reserve sessions, view schedule, submit solo videos
- Receives notifications about reservations and reminders

### Parent
- Linked to player account
- Receives welcome email on signup
- Can view child's schedule
- Receives notifications about child's sessions

### Coach
- Receives new lead notifications (email + SMS)
- Can create sessions
- Can check in players
- Can verify solo videos
- Can award points
- Views reserved players widget

### Admin
- Can create sessions
- Can manage all users
- Can view analytics
- Can manage plans and pricing

---

## Signup Flow

### Trigger
Player fills out signup form in `login-signup.html`

### Steps

#### 1. Player Submits Signup Form
**User Action:**
- Fills out: Email, Password, Player Name, Program Type, Team Name, Birth Year, Competitive Level, Positions, Referral Source
- Clicks "Sign Up" button

**System Actions:**
- Validate form data (client-side)
- Create user in Supabase Auth (`supabase.auth.signUp()`)
- Store form data in `user_metadata`
- Wait for session to be established
- Database trigger creates basic profile in `profiles` table
- Update profile with complete form data

**Database Changes:**
```sql
-- profiles table
INSERT INTO profiles (
  id, player_name, program_type, team_name, birth_year, 
  competitive_level, positions, referral_source, role
) VALUES (...);

-- Set initial state
lead_status = 'new'
first_session_completed = FALSE
evaluation_completed = FALSE
offer_sent = FALSE
```

#### 2. Create Lead in Zoho CRM
**System Actions:**
- Call Zoho CRM API to create new lead
- Map Supabase profile fields to Zoho lead fields
- Store Zoho lead ID in `profiles.zoho_lead_id`

**Zoho Lead Fields:**
- First Name: `player_name` (first part)
- Last Name: `player_name` (last part)
- Email: `auth.users.email`
- Phone: `profiles.phone_number` (if provided)
- Lead Source: `referral_source`
- Lead Status: "New"
- Custom Fields:
  - Birth Year
  - Competitive Level
  - Positions
  - Program Type
  - Team Name

#### 3. Send Parent Welcome Email
**System Actions:**
- Trigger Zoho email template: "Parent Welcome Email"
- Send to: `auth.users.email` (player's email, which is parent's email)

**Email Template:**
```
Subject: Welcome to Champions Premier!

Hey {{customer.first_name}},

Thanks for your interest! We love learning about new ballers of our community that we can help. We will be in touch with you soon about how Champions Premier's evaluation process occurs. Looking forward to working with you at #thebestofthebest environment in the DMV!🏆

📲 Download our app to view our online and on-field schedule:

Champions Premier App 📲

{{client.company}}
```

#### 4. Send Coach Notifications
**System Actions:**
- Trigger Zoho email template: "Coach New Lead Email"
- Trigger Zoho SMS template: "Coach New Lead SMS"
- Send to: All coaches (or assigned coach)

**Email Template:**
```
Subject: New Lead - [Player Name]

New Lead

Here's the details about your new lead. We set 'em up, you knock 'em down!

Lead

Name: [Player Name]
Email: [Email]
Phone: [Phone]
Program Type: [Program Type]
Competitive Level: [Competitive Level]
Positions: [Positions]

Details

View Lead Profile: [Link to Zoho lead]
```

**SMS Template:**
```
Hi [Coach Name],

We have a new lead - follow these steps:

🚨GOAL: Get them to a session virtually, on field or HD & give them something for FREE.🚨

1. Send them the "🌐Web-Lead | First Text" OR "💬Web Chat Box Lead | First Text"

2. Give them a call and use this script: [Link to call script]

Player: [Player Name]
Email: [Email]
Phone: [Phone]
```

#### 5. Redirect to Player Dashboard
**System Actions:**
- Redirect to `../../index.html` (player view)
- Load home page with schedule widget

**UI Updates:**
- Show player dashboard
- Schedule widget shows available sessions
- No reservations yet (first-time user)

### Edge Cases
- **Email confirmation required**: If Supabase requires email confirmation, delay notifications until email is verified
- **Zoho API failure**: Log error, continue with signup, retry Zoho sync later
- **Duplicate email**: Show error, prevent signup
- **Invalid form data**: Show validation errors, prevent submission

### Success Criteria
- ✅ User created in Supabase
- ✅ Profile created in database
- ✅ Lead created in Zoho CRM
- ✅ Parent welcome email sent
- ✅ Coach email + SMS sent
- ✅ User redirected to dashboard

---

## Reservation Flow

### Trigger
Player clicks "Reserve" button on a session in the schedule widget

### Steps

#### 1. Player Selects Activity
**User Action:**
- Navigates to Schedule page
- Clicks "On-Field" or "Virtual" option
- Clicks specific activity (e.g., "Tec Tac", "CPP")

**UI Updates:**
- Schedule widget appears below activity selection
- Shows available sessions for next 2-4 weeks
- Each session displays: Date, Time, Location/Zoom, Coach, Spots Left

#### 2. Player Clicks "Reserve"
**User Action:**
- Clicks "Reserve" button on desired session

**System Actions:**
- Check if session has available spots (`sessions.current_reservations < sessions.max_capacity`)
- Check if player already has reservation for this session (prevent double-booking)
- Check if this is player's first session (`profiles.first_session_completed = FALSE`)

**Database Changes:**
```sql
-- Create reservation
INSERT INTO reservations (
  session_id, player_id, parent_id, reservation_status
) VALUES (...);

-- Update session capacity
UPDATE sessions 
SET current_reservations = current_reservations + 1
WHERE id = [session_id];

-- If first session, mark for diamond indicator
-- (Diamond shown in UI based on profiles.first_session_completed = FALSE)
```

#### 3. Create Notification Queue Entries
**System Actions:**
- Create email notification for confirmation
- Create email notification for 2-hour reminder
- Create SMS notification for 2-hour reminder

**Database Changes:**
```sql
-- Confirmation email (send immediately)
INSERT INTO notification_queue (
  reservation_id, notification_type, notification_template,
  recipient_email, scheduled_send_at, status
) VALUES (
  [reservation_id], 'email', 'reservation-confirmation',
  [player_email], NOW(), 'pending'
);

-- Reminder email (send 2 hours before session)
INSERT INTO notification_queue (
  reservation_id, notification_type, notification_template,
  recipient_email, scheduled_send_at, status
) VALUES (
  [reservation_id], 'email', 'reminder-2h-before',
  [player_email], [session_time - 2 hours], 'pending'
);

-- Reminder SMS (send 2 hours before session)
INSERT INTO notification_queue (
  reservation_id, notification_type, notification_template,
  recipient_phone, scheduled_send_at, status
) VALUES (
  [reservation_id], 'sms', 'reminder-2h-before',
  [player_phone], [session_time - 2 hours], 'pending'
);
```

#### 4. Send Confirmation Notification
**System Actions:**
- Process notification queue (immediate send)
- Send confirmation email to player
- If parent email exists, send to parent as well

**Email Template (On-Field):**
```
Subject: Your Tec Tac Session Reservation Confirmed

Hi [Player Name],

You've reserved a Tec Tac session:
📅 Date: [Date]
⏰ Time: [Time]
📍 Location: [Location]
👨‍🏫 Coach: [Coach Name]

We'll send you a reminder 2 hours before your session.
```

**Email Template (Virtual):**
```
Subject: Your CPP Session Reservation Confirmed

Hi [Player Name],

You've reserved a Champions Player Progress (CPP) session:
📅 Date: [Date]
⏰ Time: [Time]
🔗 Zoom Link: [Zoom Link]
👨‍🏫 Coach: [Coach Name]

We'll send you a reminder 2 hours before your session.
```

#### 5. Update UI
**UI Updates:**
- Show confirmation modal: "Reservation confirmed! You'll receive email/text reminders."
- Update schedule widget to show "Reserved" badge on that session
- Update home widget to show reservation
- If first session, show diamond indicator (💎) next to reservation

**Real-Time Updates:**
- Supabase Realtime subscription updates:
  - Player home widget
  - Parent dashboard (if linked)
  - Coach "Reserved Players" widget

### Edge Cases
- **Session full**: Show error "This session is full. Please select another time."
- **Already reserved**: Show error "You already have a reservation for this session."
- **Past session date**: Prevent reservation, show error
- **No phone number**: Skip SMS notification, only send email
- **Notification queue failure**: Log error, retry later

### Success Criteria
- ✅ Reservation created in database
- ✅ Session capacity updated
- ✅ Confirmation email sent
- ✅ Notification queue entries created
- ✅ UI updated with reservation
- ✅ Real-time updates propagated

---

## Evaluation Flow

### Trigger
Player attends their first session (on-field or virtual)

### Steps

#### 1. Session Occurs
**User Action:**
- Player attends session at scheduled time/location

**System Actions:**
- Session status remains "scheduled" until coach checks in players

#### 2. Coach Checks In Player
**User Action:**
- Coach navigates to Coach Dashboard
- Views "Reserved Players" widget for the session
- Clicks "Check In" button next to player's name

**System Actions:**
- Update reservation status to "checked-in"
- Record check-in timestamp
- Record coach who checked in player

**Database Changes:**
```sql
UPDATE reservations
SET 
  reservation_status = 'checked-in',
  checked_in_at = NOW(),
  checked_in_by = [coach_user_id]
WHERE id = [reservation_id];
```

#### 3. Award Points
**System Actions:**
- Calculate points based on session activity type
- Insert into points history
- Update player's weekly points total

**Database Changes:**
```sql
-- Get points value from session
SELECT points_value FROM sessions WHERE id = [session_id];

-- Insert into points history
INSERT INTO points_history (
  player_id, session_id, reservation_id, points,
  activity_type, week_start, earned_at
) VALUES (
  [player_id], [session_id], [reservation_id], [points_value],
  [activity_type], [monday_of_week], NOW()
);

-- Update reservation
UPDATE reservations
SET points_awarded = [points_value]
WHERE id = [reservation_id];
```

**Points Values:**
- Tec Tac: 6 points
- Speed Training: 5 points
- Strength & Conditioning: 5 points
- CPP: 10 points
- Film Analysis: 4 points
- Nutrition: 7 points
- Psychologist: 8 points
- PPS: 4 points
- College Advising: 8 points

#### 4. Mark First Session Complete
**System Actions:**
- If this is player's first session, mark as complete
- Update lead status in Zoho CRM

**Database Changes:**
```sql
-- Check if this is first session
UPDATE profiles
SET first_session_completed = TRUE
WHERE id = [player_id] AND first_session_completed = FALSE;

-- Update Zoho lead status
-- (via API call to Zoho CRM)
```

**Zoho CRM Update:**
- Lead Status: "Evaluated"
- Custom Field: "First Session Completed" = TRUE

#### 5. Send Offer Email
**System Actions:**
- If first session completed, send offer email
- Mark offer as sent in database

**Database Changes:**
```sql
UPDATE profiles
SET 
  evaluation_completed = TRUE,
  offer_sent = TRUE
WHERE id = [player_id];
```

**Email Template:**
```
Subject: We'd Love to Have [Player Name] Join Champions Premier!

Hi [Parent First Name],

I really enjoyed our conversation, and I am extremely excited to offer [Player Name] a spot at Champions Premier! Please review our Champions Premier Plans & Services document & video below. This dives deeper into who we are and what we do for our players and families. Our goal is to get your account set up on the best plan for your son's development. Looking forward to speaking with you soon and seeing [Player Name] at his next session as an official member of our Champions Premier family!

Enter your email
Password: Champion

CLICK HERE FOR VIDEO
CLICK HERE FOR DOCSEND

Best,
[Coach Name]
```

### Edge Cases
- **Player no-show**: Coach marks as "no-show", no points awarded
- **Late cancel**: Coach marks as "late-cancel", no points awarded
- **Multiple coaches**: Record which coach checked in player
- **Points calculation error**: Log error, manual review required

### Success Criteria
- ✅ Player checked in
- ✅ Points awarded
- ✅ Points history recorded
- ✅ First session marked complete (if applicable)
- ✅ Offer email sent (if first session)
- ✅ Zoho lead status updated

---

## Onboarding Flow

### Trigger
Parent/Player accepts offer and selects a plan

### Steps

#### 1. Parent Reviews Plans
**User Action:**
- Receives offer email
- Clicks link to view plans document/video
- Reviews plan options

**Available Plans:**
- **Homegrown (App Only)**:
  - Starter: $19/month
  - Yearly: $99/year
- **Champions Premier (Hybrid)**:
  - Premier: $349/month
  - Pro: $299/month (quarterly)
  - Champion: $249/month (annual)
- **Virtual Program**:
  - Premier Virtual: $120/month
  - Elite Virtual: $80/month (paid upfront)

#### 2. Parent Selects Plan
**User Action:**
- Clicks "Sign Up" on desired plan
- Redirected to payment/plan selection page

**System Actions:**
- Store selected plan in profile
- Update Zoho lead status to "Converted"
- Create subscription record (if using payment system)

**Database Changes:**
```sql
UPDATE profiles
SET 
  plan_type = [selected_plan],
  lead_status = 'converted'
WHERE id = [player_id];
```

#### 3. Process Payment
**System Actions:**
- Integrate with payment processor (Stripe, etc.)
- Process payment based on plan
- Create subscription record

**Database Changes:**
```sql
-- Create subscription record
INSERT INTO subscriptions (
  player_id, plan_type, status, start_date, 
  billing_cycle, amount
) VALUES (...);
```

#### 4. Activate Account
**System Actions:**
- Grant access based on plan type
- Update user permissions
- Send welcome email with plan details

**Database Changes:**
```sql
UPDATE profiles
SET account_active = TRUE
WHERE id = [player_id];
```

#### 5. Send Welcome Email
**Email Template:**
```
Subject: Welcome to Champions Premier, [Player Name]!

Hi [Parent First Name],

Welcome to the Champions Premier family! [Player Name]'s account has been activated on the [Plan Name] plan.

Here's what's included:
[List of plan features]

Your next steps:
1. Download the Champions Premier app
2. Log in with your credentials
3. Schedule your first session

If you have any questions, don't hesitate to reach out!

Best,
Champions Premier Team
```

### Edge Cases
- **Payment failure**: Show error, allow retry
- **Plan selection cancelled**: Keep lead status as "Evaluated", allow retry later
- **Invalid plan**: Show error, prevent selection

### Success Criteria
- ✅ Plan selected and stored
- ✅ Payment processed (if applicable)
- ✅ Account activated
- ✅ Access granted based on plan
- ✅ Welcome email sent
- ✅ Zoho lead marked as "Converted"

---

## Notification Flows

### 2-Hour Reminder Flow

#### Trigger
Scheduled time reaches 2 hours before session start time

#### Steps

##### 1. Cron Job / Scheduled Function
**System Actions:**
- Edge Function or cron job runs every 5 minutes
- Queries `notification_queue` for pending notifications where `scheduled_send_at <= NOW()`
- Processes each notification

##### 2. Send Reminder Email
**System Actions:**
- Fetch reservation details
- Fetch session details
- Send email via Zoho API

**Email Template (On-Field):**
```
Subject: Reminder: Your Tec Tac Session Starts in 2 Hours

Hi [Player Name],

⏰ Your session starts in 2 hours!

📅 Date: [Date]
⏰ Time: [Time]
📍 Location: [Location]
👨‍🏫 Coach: [Coach Name]

See you soon!
```

**Email Template (Virtual):**
```
Subject: Reminder: Your CPP Session Starts in 2 Hours

Hi [Player Name],

⏰ Your session starts in 2 hours!

📅 Date: [Date]
⏰ Time: [Time]
🔗 Zoom Link: [Zoom Link]
👨‍🏫 Coach: [Coach Name]

See you soon!
```

##### 3. Send Reminder SMS
**System Actions:**
- Send SMS via Zoho SMS API

**SMS Template (On-Field):**
```
Tec Tac session in 2h! [Time] at [Location] with [Coach Name]
```

**SMS Template (Virtual):**
```
CPP session in 2h! [Time] - Zoom: [Zoom Link] with [Coach Name]
```

##### 4. Update Notification Queue
**Database Changes:**
```sql
UPDATE notification_queue
SET 
  status = 'sent',
  sent_at = NOW()
WHERE id = [notification_id];
```

### Edge Cases
- **Notification already sent**: Skip, mark as sent
- **Session cancelled**: Cancel pending notifications
- **Reservation cancelled**: Cancel pending notifications
- **SMS/Email failure**: Mark as failed, retry later

---

## Coach Workflows

### Create Session Flow

#### Trigger
Coach navigates to Coach Dashboard and clicks "Create Session"

#### Steps

##### 1. Coach Fills Session Form
**User Action:**
- Selects activity type (Tec Tac, Speed Training, etc.)
- Selects session type (on-field, virtual, solo)
- Sets date and time
- Sets duration
- If on-field: Enters location
- If virtual: Enters Zoom link
- Sets max capacity
- Selects coach (self or other)

**System Actions:**
- Validate form data
- Check coach permissions

##### 2. Create Session
**Database Changes:**
```sql
INSERT INTO sessions (
  activity_type, session_type, scheduled_date, scheduled_time,
  duration_minutes, location, zoom_link, coach_id, max_capacity,
  points_value, status
) VALUES (...);
```

**Points Value Calculation:**
- Automatically set based on `activity_type` using points map

##### 3. Session Appears in Schedules
**System Actions:**
- Session immediately available in:
  - Player schedule page
  - Parent dashboard
  - Coach dashboard

**Real-Time Updates:**
- Supabase Realtime broadcasts new session to all subscribers

### Check-In Player Flow

#### Trigger
Coach clicks "Check In" button next to player name

#### Steps

##### 1. Coach Clicks Check In
**User Action:**
- Views "Reserved Players" widget
- Clicks "Check In" for specific player

##### 2. Update Reservation Status
**Database Changes:**
```sql
UPDATE reservations
SET 
  reservation_status = 'checked-in',
  checked_in_at = NOW(),
  checked_in_by = [coach_user_id]
WHERE id = [reservation_id];
```

##### 3. Award Points
**System Actions:**
- Calculate points from session
- Insert into points history
- Update weekly totals

##### 4. Update UI
**UI Updates:**
- Player name moves from "Reserved" to "Checked In" list
- Points displayed next to player name
- Real-time update to player's dashboard

### Mark No-Show / Late Cancel Flow

#### Trigger
Coach clicks "No Show" or "Late Cancel" button

#### Steps

##### 1. Coach Selects Status
**User Action:**
- Clicks "No Show" or "Late Cancel" button

##### 2. Update Reservation Status
**Database Changes:**
```sql
UPDATE reservations
SET reservation_status = 'no-show' -- or 'late-cancel'
WHERE id = [reservation_id];
```

**Note:** No points awarded for no-show or late cancel

---

## Parent Workflows

### View Child's Schedule

#### Trigger
Parent logs into parent dashboard

#### Steps

##### 1. Parent Logs In
**System Actions:**
- Authenticate parent
- Fetch linked player(s)
- Load parent dashboard

##### 2. Display Schedule Widget
**System Actions:**
- Query reservations for linked player(s)
- Display in schedule widget (same as player home widget)
- Show all upcoming sessions

**UI Updates:**
- Weekly calendar view
- Reservations displayed on selected day
- Diamond indicator for first session

### Receive Notifications

#### Trigger
Child reserves session or session reminder

#### Steps

##### 1. Child Reserves Session
**System Actions:**
- If `profiles.parent_email` exists, send confirmation email
- Include same information as player email

##### 2. Session Reminder
**System Actions:**
- Send 2-hour reminder email to parent (if email on file)
- Send 2-hour reminder SMS to parent (if phone on file)

---

## Solo Session Flow

### Trigger
Player navigates to Solo page and schedules solo training

### Steps

#### 1. Player Schedules Solo Session
**User Action:**
- Selects date for solo session
- Selects training type
- Clicks "Schedule"

**System Actions:**
- Create session with `session_type = 'solo'`
- Create reservation

#### 2. Player Completes Training
**User Action:**
- Goes to field/training location
- Completes training
- Records video

#### 3. Player Submits Video
**User Action:**
- Uploads video to Solo page
- Submits for coach review

**System Actions:**
- Upload video to Supabase Storage
- Store video URL in reservation

**Database Changes:**
```sql
UPDATE reservations
SET 
  video_submission_url = [storage_url],
  video_submitted_at = NOW()
WHERE id = [reservation_id];
```

#### 4. Coach Reviews Video
**User Action:**
- Coach views video in Coach Dashboard
- Verifies player actually went to field
- Clicks "Verify" or "Reject"

**System Actions:**
- If verified: Award points, mark as checked-in
- If rejected: Request resubmission

**Database Changes:**
```sql
UPDATE reservations
SET 
  video_verified = TRUE,
  reservation_status = 'checked-in',
  checked_in_at = NOW(),
  points_awarded = [points_value]
WHERE id = [reservation_id];
```

---

## Points System Flow

### Points Award Rules

#### On-Field Sessions
- **Tec Tac**: 6 points
- **Speed Training**: 5 points
- **Strength & Conditioning**: 5 points

#### Virtual Sessions
- **CPP**: 10 points
- **Film Analysis**: 4 points
- **Nutrition**: 7 points
- **Psychologist**: 8 points
- **PPS**: 4 points
- **College Advising**: 8 points

### Points Calculation Flow

#### Trigger
Coach checks in player or verifies solo video

#### Steps

##### 1. Get Points Value
**System Actions:**
- Query `sessions.points_value` for the session
- Or use points map based on `sessions.activity_type`

##### 2. Insert Points History
**Database Changes:**
```sql
INSERT INTO points_history (
  player_id, session_id, reservation_id, points,
  activity_type, week_start, earned_at
) VALUES (
  [player_id], [session_id], [reservation_id], [points_value],
  [activity_type], [monday_of_current_week], NOW()
);
```

##### 3. Update Weekly Totals
**System Actions:**
- Calculate weekly total for current week
- Update leaderboard (if applicable)
- Display in player dashboard

### Weekly Points Reset

#### Trigger
New week starts (Monday)

#### Steps

##### 1. Calculate Previous Week Totals
**System Actions:**
- Query all points for previous week
- Calculate totals per player
- Store in weekly summary table

##### 2. Reset Current Week
**System Actions:**
- New week starts, points reset to 0
- Previous week totals archived

---

## Database State Transitions

### Profile States

```
NEW SIGNUP
  ↓
lead_status: 'new'
first_session_completed: FALSE
evaluation_completed: FALSE
offer_sent: FALSE
  ↓
[First Session Reserved]
  ↓
[First Session Attended & Checked In]
  ↓
first_session_completed: TRUE
lead_status: 'evaluated'
  ↓
[Offer Email Sent]
  ↓
offer_sent: TRUE
  ↓
[Plan Selected]
  ↓
lead_status: 'converted'
plan_type: [selected_plan]
account_active: TRUE
```

### Reservation States

```
RESERVATION CREATED
  ↓
reservation_status: 'reserved'
  ↓
[Session Occurs]
  ↓
[Coach Checks In]
  ↓
reservation_status: 'checked-in'
points_awarded: [points_value]
  ↓
[OR Coach Marks No-Show]
  ↓
reservation_status: 'no-show'
points_awarded: 0
```

### Session States

```
SESSION CREATED
  ↓
status: 'scheduled'
current_reservations: 0
  ↓
[Players Reserve]
  ↓
current_reservations: [count]
  ↓
[Session Date/Time Arrives]
  ↓
[Coach Checks In Players]
  ↓
[Session Ends]
  ↓
status: 'completed'
```

---

## Integration Points

### Zoho CRM Integration

#### API Endpoints Used
- `POST /crm/v3/Leads` - Create lead
- `PUT /crm/v3/Leads/{id}` - Update lead
- `POST /mail/send` - Send email
- `POST /sms/send` - Send SMS

#### Webhook Endpoints
- Lead status changed → Update Supabase profile
- Lead converted → Activate account

### Supabase Integration

#### Tables Used
- `profiles` - User profiles
- `sessions` - Training sessions
- `reservations` - Player reservations
- `points_history` - Points tracking
- `notification_queue` - Notification scheduling

#### Realtime Subscriptions
- `reservations` table changes → Update dashboards
- `sessions` table changes → Update schedule widgets

---

## Error Handling

### Common Errors

#### Signup Errors
- **Email already exists**: Show error, prevent signup
- **Zoho API failure**: Log error, continue signup, retry later
- **Database error**: Rollback, show error, prevent signup

#### Reservation Errors
- **Session full**: Show error, suggest alternative times
- **Already reserved**: Show error, prevent double-booking
- **Past date**: Show error, prevent reservation

#### Notification Errors
- **Email send failure**: Retry 3 times, then mark as failed
- **SMS send failure**: Retry 3 times, then mark as failed
- **Invalid phone/email**: Skip notification, log warning

---

## Future Enhancements

### Phase 2 Features
- [ ] Payment processing integration
- [ ] Subscription management
- [ ] Advanced analytics dashboard
- [ ] Mobile app (React Native)
- [ ] Push notifications

### Phase 3 Features
- [ ] Video analysis tools
- [ ] Performance tracking
- [ ] Social features (player connections)
- [ ] Coach-player messaging
- [ ] Parent-coach communication

---

## Notes

- All times are stored in UTC, converted to user's timezone in UI
- Email templates use Zoho template variables
- SMS templates are plain text (160 character limit)
- Points are calculated server-side to prevent manipulation
- All database operations use Row Level Security (RLS) policies
- Real-time updates use Supabase Realtime subscriptions

---

**Document Owner:** [Your Name]  
**Review Date:** [Date]  
**Next Review:** [Date + 30 days]

