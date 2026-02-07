# Real-Time Update Implementation Plan

## Overview
This document outlines the comprehensive real-time update system that ensures all views update automatically when sessions are created, cancelled, or modified.

## Update Flow

### When a Session is Reserved/Cancelled:
1. **Backend (Supabase)** - Database change occurs
2. **Real-time Subscriptions** - All subscribed clients receive the change
3. **Frontend Updates** - Each view reloads its relevant data

## Views That Need Real-Time Updates

### 1. Player Home (`src/app/views/player/home/`)
- **My Schedule Tab**: Shows all reserved sessions (group + individual)
- **Reservations Tab**: Shows only future reserved sessions
- **Updates Needed**: INSERT/UPDATE/DELETE on `session_reservations` and `individual_session_bookings`

### 2. Parent Home (`src/app/views/parent/home/`)
- **My Schedule Tab**: Shows all linked players' reserved sessions
- **Reservations Tab**: Shows only future reserved sessions for all linked players
- **Updates Needed**: INSERT/UPDATE/DELETE on `session_reservations` and `individual_session_bookings`
- **Filtering**: Must filter by linked player IDs

### 3. Player Schedule (`src/app/views/player/schedule/`)
- **Time Slots**: Individual session time slots must update when bookings are created/cancelled
- **Updates Needed**: INSERT/UPDATE/DELETE on `individual_session_bookings`
- **Action**: Regenerate time slots for the selected date when changes occur

### 4. Parent Schedule (`src/app/views/parent/schedule/`)
- **Time Slots**: Individual session time slots must update when bookings are created/cancelled
- **Updates Needed**: INSERT/UPDATE/DELETE on `individual_session_bookings`
- **Action**: Regenerate time slots for the selected date when changes occur

### 5. Coach Schedule (`src/app/views/coach/schedule/`)
- **Calendar View**: Shows all sessions (group + individual)
- **Updates Needed**: INSERT/UPDATE/DELETE on `session_reservations` and `individual_session_bookings`
- **Action**: Reload all sessions when changes occur

### 6. Coach Home (`src/app/views/coach/home/`)
- **My Day Tab**: Shows sessions for the specific coach
- **Full Schedule Tab**: Shows all sessions
- **Updates Needed**: INSERT/UPDATE/DELETE on `session_reservations` and `individual_session_bookings`
- **Action**: Reload sessions when changes occur

## Implementation Strategy

### Channel Naming Convention
- `player-home-reservations` - Player home page
- `parent-home-reservations` - Parent home page
- `player-schedule-slots` - Player schedule time slots
- `parent-schedule-slots` - Parent schedule time slots
- `coach-schedule-sessions` - Coach schedule
- `coach-home-sessions` - Coach home

### Filtering Strategy
- **Player Views**: Filter by `player_id = auth.uid()` or `selectedPlayerId`
- **Parent Views**: Filter by `parent_id = auth.uid()` or linked player IDs
- **Coach Views**: Filter by `coach_id = auth.uid()` or session staff assignments

### Time Slot Regeneration
- When a booking is created/cancelled, check if:
  1. The booking is for the currently selected date
  2. The booking is for the currently selected session type
  3. The booking is for the currently selected coach (if applicable)
- If all conditions match, regenerate time slots

## Database Functions

### `create_reservation_for_player`
- Already has duplicate check
- Returns reservation ID on success
- Raises exception on duplicate

### `cancel_reservation_for_player`
- Works for both parents and players
- Updates reservation status to 'cancelled'
- Returns boolean success

## Error Handling

### Duplicate Reservations
- RPC function checks before insert
- If reservation exists but is cancelled, update it instead
- Frontend shows user-friendly error message
- Frontend reloads to show existing reservation

### Real-time Subscription Failures
- Log errors but don't block UI
- Fall back to manual refresh if needed
- Show user notification if updates fail

## Testing Checklist

- [ ] Player reserves group session → Updates in player home, parent home, coach schedule, coach home
- [ ] Player reserves individual session → Updates in player home, parent home, time slots, coach schedule, coach home
- [ ] Parent reserves session for player → Updates in all views
- [ ] Player cancels session → Updates in all views, time slots regenerate
- [ ] Parent cancels session → Updates in all views, time slots regenerate
- [ ] Coach cancels session → Updates in all views
- [ ] Account switcher works with real-time updates
- [ ] Time slots update correctly when bookings change
- [ ] No duplicate reservations can be created
- [ ] Cancelled reservations don't show in future lists

