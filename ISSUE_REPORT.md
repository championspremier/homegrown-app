# Issue Report: Player/Parent Session Management

## Summary
After implementing account switcher functionality, several issues have emerged with session reservations and cancellations when logged in as a player vs. parent.

## Issues Identified

### 1. Player Cannot Reserve Group Sessions
**Problem**: When logged in directly as a player (not via account switcher), attempting to reserve a group session fails with RLS errors.

**Root Cause**: 
- Player schedule tries to do a direct INSERT into `session_reservations` table
- RLS policies block direct inserts from players
- Should use `create_reservation_for_player` RPC function instead, but needs parent_id

**Location**: `src/app/views/player/schedule/schedule.js` lines 1136-1156

**Fix Required**: 
- Find player's parent_id from `parent_player_relationships` table
- Use `create_reservation_for_player` RPC function instead of direct insert

---

### 2. Player Bookings Don't Update Parent View
**Problem**: When a player books a session, the parent's home page doesn't update to show the new reservation.

**Root Cause**: 
- No real-time subscriptions in parent home page
- Parent home only loads on page load, not on changes

**Location**: `src/app/views/parent/home/home.js`

**Fix Required**: 
- Add Supabase real-time subscriptions for `session_reservations` and `individual_session_bookings`
- Listen for INSERT and UPDATE events
- Reload reservations when changes occur

---

### 3. Cancellations Not Removing Divs in Player View
**Problem**: When cancelling sessions in player home, the reservation card div doesn't disappear from the screen.

**Root Cause**: 
- The `data-reservation-id` attribute in the HTML might be using session ID instead of reservation ID
- For individual sessions, the reservation_id should be the booking.id, but it might be getting confused with session.id
- The cancellation function might not be finding the correct button/card

**Location**: `src/app/views/player/home/home.js` lines 723-837

**Fix Required**: 
- Verify `reservation_id` is correctly set in `createSessionCard` function
- Ensure cancellation function uses correct ID to find and remove the card
- Add better error handling and logging

---

### 4. Coach Schedule Not Updating on Cancellations
**Problem**: When a parent or player cancels a session, the coach schedule doesn't update in real-time.

**Root Cause**: 
- Real-time subscriptions exist but might not be catching all update patterns
- The filter `reservation_status=eq.cancelled` might be too restrictive
- Need to also listen for `cancelled_at` field changes

**Location**: `src/app/views/coach/schedule/schedule.js` lines 457-536

**Fix Required**: 
- Improve real-time subscription filters
- Listen for both status changes and cancelled_at field updates
- Add DELETE event listeners as backup

---

### 5. Cancellation RPC Function Only Works for Parents
**Problem**: The `cancel_reservation_for_player` RPC function only allows parents to cancel, not players.

**Root Cause**: 
- Function checks `auth.uid()` role and requires it to be 'parent'
- Players trying to cancel get blocked

**Location**: `sql/migrations/create-secure-player-actions.sql` lines 188-264

**Fix Required**: 
- Update function to allow players to cancel their own reservations
- Verify parent-player relationship for players
- Or create a separate player cancellation function

---

## Recommended Fix Order

1. **Fix Player Group Session Reservations** (Issue #1)
   - Highest priority - blocks core functionality
   - Relatively straightforward fix

2. **Fix Cancellation RPC Function** (Issue #5)
   - Enables players to cancel their own sessions
   - Required for Issue #3 fix

3. **Fix Player Cancellation UI** (Issue #3)
   - Depends on Issue #5
   - Improves user experience

4. **Add Real-time Subscriptions to Parent Home** (Issue #2)
   - Improves user experience
   - Ensures data consistency

5. **Improve Coach Schedule Real-time Updates** (Issue #4)
   - Lower priority but important for coaches
   - Ensures coaches see accurate schedule

---

## Technical Notes

- All RPC functions use `SECURITY DEFINER` to bypass RLS
- Account switcher uses `localStorage` to track `hg-user-role` and `selectedPlayerId`
- Real-time subscriptions require proper channel management to avoid memory leaks
- Reservation IDs vs Session IDs: Be careful not to confuse these in the UI

