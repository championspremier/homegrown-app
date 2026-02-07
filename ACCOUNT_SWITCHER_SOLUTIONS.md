# Account Switcher Solutions - Security Analysis

## Problem Statement
When a parent uses the account switcher to "become" a player, the Supabase auth session remains the parent's session. RLS policies check `auth.uid()`, which causes issues when:
1. A player logs in directly and tries to use account switcher
2. Actions need to be performed "as" the player but authenticated as parent
3. We need to maintain security while allowing parent-to-player switching

## Current Implementation
- Uses `localStorage` to track `hg-current-role` and `selectedPlayerId`
- RLS policies already allow parents to act on behalf of linked players
- But direct player logins can't fully "switch" to parent view

---

## Solution 1: Database Functions with SECURITY DEFINER ⭐ **RECOMMENDED**

### How It Works
- Create PostgreSQL functions that run with elevated privileges (`SECURITY DEFINER`)
- Functions verify parent-player relationships internally
- Functions perform actions on behalf of players while authenticated as parent

### Pros
✅ **Most Secure**: Relationship verification happens in database, can't be bypassed  
✅ **No Auth Changes**: Works with existing Supabase auth  
✅ **Audit Trail**: All actions traceable to parent who performed them  
✅ **RLS Bypass**: Functions can insert/update data that RLS would normally block  
✅ **Centralized Logic**: All security checks in one place  

### Cons
❌ Requires creating functions for each action type  
❌ Slightly more complex than direct RLS  
❌ Need to maintain function code  

### Implementation
See `sql/migrations/create-secure-player-actions.sql`

**Usage Example:**
```javascript
// Instead of direct insert:
const { error } = await supabase
  .from('session_reservations')
  .insert({ session_id, player_id, parent_id });

// Use function:
const { data, error } = await supabase.rpc('create_reservation_for_player', {
  p_session_id: sessionId,
  p_player_id: playerId
});
```

---

## Solution 2: Enhanced RLS Policies (Current + Improvements)

### How It Works
- Improve existing RLS policies to handle all edge cases
- Add policies that check relationships more comprehensively
- Ensure policies work for both parent→player and player→parent scenarios

### Pros
✅ **No Code Changes**: Works with existing Supabase client calls  
✅ **Database-Level**: Security enforced at database level  
✅ **Simple**: Just update SQL policies  

### Cons
❌ **Limited**: Can't fully "become" another user in RLS  
❌ **Complex Policies**: Policies can become very complex  
❌ **Performance**: Multiple EXISTS checks can be slow  
❌ **Still Uses auth.uid()**: Can't truly switch identity  

### Implementation
Already partially done in:
- `sql/migrations/fix-parent-reservations-rls.sql`
- `sql/migrations/fix-individual-bookings-rls.sql`

**What's Missing:**
- Policies for player→parent switching (if needed)
- Policies for viewing player data when logged in as player

---

## Solution 3: Supabase Edge Functions

### How It Works
- Create server-side Edge Functions that run with service role
- Functions verify relationships and perform actions
- Client calls Edge Functions instead of direct database

### Pros
✅ **Full Control**: Can implement any security logic  
✅ **Service Role**: Bypasses RLS completely  
✅ **Scalable**: Can handle complex business logic  
✅ **External APIs**: Can integrate with other services  

### Cons
❌ **Complexity**: Requires separate deployment and maintenance  
❌ **Latency**: Additional network hop  
❌ **Cost**: Edge Functions have usage costs  
❌ **Overkill**: May be too complex for this use case  

### Implementation
Would require:
1. Creating Edge Functions in Supabase
2. Updating client code to call functions
3. Deploying and maintaining functions

---

## Solution 4: JWT Custom Claims

### How It Works
- Add custom claims to JWT indicating "acting as" player ID
- Modify RLS policies to check both `auth.uid()` and custom claim
- Use Supabase Auth hooks to add claims

### Pros
✅ **Flexible**: Can encode multiple pieces of info in JWT  
✅ **Standard**: Uses JWT standard claims  
✅ **Fast**: No additional database queries  

### Cons
❌ **Complex Setup**: Requires Auth hooks and JWT modification  
❌ **Security Risk**: Claims can be manipulated if not signed properly  
❌ **Limited**: Can't change JWT without re-authentication  
❌ **Not Recommended**: Supabase doesn't easily support custom claims  

### Implementation
Would require:
1. Supabase Auth Webhook to modify JWT
2. Custom RLS functions to read JWT claims
3. Client-side logic to request claim updates

---

## Solution 5: Separate Player Auth Accounts

### How It Works
- Create separate Supabase auth accounts for each player
- Parents can "impersonate" players by logging in as them
- Use secure token exchange or password sharing

### Pros
✅ **True Switching**: Actually authenticates as player  
✅ **Simple RLS**: Policies just check `auth.uid()`  
✅ **Full Access**: Players have full access to their data  

### Cons
❌ **Security Risk**: Password sharing or token exchange is risky  
❌ **Complex Auth**: Requires managing multiple auth sessions  
❌ **User Confusion**: Multiple accounts per family  
❌ **Not Recommended**: Goes against security best practices  

### Implementation
Would require:
1. Creating auth accounts for all players
2. Secure way to exchange/login as player
3. Managing multiple sessions

---

## Recommendation: **Solution 1 (Database Functions)**

### Why?
1. **Security**: Relationship verification in database, can't be bypassed
2. **Simplicity**: Works with existing auth, no complex setup
3. **Maintainability**: Centralized security logic
4. **Performance**: Single database call instead of multiple RLS checks
5. **Audit Trail**: All actions clearly traceable

### Migration Path
1. ✅ Create database functions (see `create-secure-player-actions.sql`)
2. Update client code to use functions instead of direct inserts
3. Keep RLS policies as backup security layer
4. Test thoroughly with both parent and player accounts

### Example Migration
```javascript
// OLD (direct insert - may fail with RLS):
const { error } = await supabase
  .from('session_reservations')
  .insert({
    session_id: sessionId,
    player_id: selectedPlayerId,
    parent_id: session.user.id
  });

// NEW (using function - always works):
const { data, error } = await supabase.rpc('create_reservation_for_player', {
  p_session_id: sessionId,
  p_player_id: selectedPlayerId
});
```

---

## Security Considerations

### All Solutions Must:
1. ✅ Verify parent-player relationship exists
2. ✅ Verify authenticated user is actually a parent
3. ✅ Verify player ID is valid and is actually a player
4. ✅ Log all actions for audit trail
5. ✅ Prevent privilege escalation

### Database Functions Solution Provides:
- ✅ Relationship verification in database (can't be bypassed)
- ✅ Role verification (parent must be parent)
- ✅ Player verification (player must be player)
- ✅ Audit trail (parent_id stored in all records)
- ✅ No privilege escalation (functions only do what they're designed for)

---

## Next Steps

1. **Review** `sql/migrations/create-secure-player-actions.sql`
2. **Test** functions in Supabase SQL Editor
3. **Update** client code to use functions (start with one action type)
4. **Monitor** for any issues
5. **Expand** to other action types as needed

