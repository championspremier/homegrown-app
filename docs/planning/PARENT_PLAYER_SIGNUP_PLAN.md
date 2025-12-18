# Parent-Player Signup Implementation Plan

## Overview
This plan implements a role-based signup system that distinguishes between Parent and Player signups, with support for many-to-many relationships and admin management capabilities.

## Architecture

### Database Schema Changes

#### 1. Update `profiles` table
Add parent-specific fields:
- `first_name TEXT` (for parents)
- `last_name TEXT` (for parents)
- `birth_date DATE` (for parents, instead of birth_year)
- Keep existing `player_name` for players
- Keep existing `birth_year` for players

#### 2. Create `parent_player_relationships` table
Many-to-many junction table:
```sql
CREATE TABLE parent_player_relationships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  player_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  relationship_type TEXT DEFAULT 'primary' CHECK (relationship_type IN ('primary', 'secondary')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(parent_id, player_id)
);

CREATE INDEX idx_parent_player_parent ON parent_player_relationships(parent_id);
CREATE INDEX idx_parent_player_player ON parent_player_relationships(player_id);
```

#### 3. RLS Policies for relationships
- Parents can view their linked players
- Players can view their linked parents
- Admins can view/edit all relationships

## UI/UX Changes

### Login-Signup Page Flow

#### Step 1: Role Selection (New)
When user clicks "Sign Up", show a role selector before the form:
- Two large buttons/cards:
  - "I'm a Parent" - Creates parent account + player account
  - "I'm a Player" - Creates only player account

#### Step 2: Conditional Form Display

**If "Parent" selected:**
- Show parent information section:
  - First Name (required)
  - Last Name (required)
  - Email (required) - for parent account
  - Phone Number (optional)
  - Birth Date (required) - date picker
  - Password (required) - for parent account
- Show player information section (all existing fields):
  - Player Name (required)
  - Email (required) - for player account (can be different from parent)
  - Password (required) - for player account
  - Program Type, Team Name, Birth Year, Competitive Level, Positions, Referral Source

**If "Player" selected:**
- Show only player information section (current form)
- No parent fields

## Implementation Details

### Files to Modify

#### 1. `supabase-schema.sql`
- Add parent fields to `profiles` table
- Create `parent_player_relationships` table
- Update `handle_new_user()` trigger to handle both roles
- Add RLS policies for relationships

#### 2. `src/auth/login-signup/login-signup.html`
- Add role selector UI (two buttons/cards) before signup form
- Add parent information fields (conditionally visible)
- Add separate email/password fields for player when parent is selected
- Structure: Role Selector → Parent Fields (if parent) → Player Fields

#### 3. `src/auth/login-signup/login-signup.css`
- Style role selector (two large cards/buttons)
- Style parent information section
- Add conditional visibility classes
- Ensure smooth transitions between sections

#### 4. `src/auth/login-signup/login-signup.js`
- Add role selection state management
- Show/hide form sections based on role
- Update signup logic:
  - **Parent signup**: Create parent auth account → create player auth account → link in relationships table
  - **Player signup**: Create player auth account only
- Handle form validation for both scenarios
- Update Notion sync to handle parent + player data

#### 5. `supabase/functions/sync-to-notion/index.ts`
- Update to handle parent signups (create separate Notion entries for parent and player)
- Or create linked entries if Notion supports relationships
- **Update**: Changed from `Birth Year` (select) to `Birth Date` (date) property
  - Convert `birthYear` to `birthDate` format (YYYY-MM-DD) on client-side
  - Edge Function accepts both `birthDate` (preferred) and `birthYear` (fallback) for backwards compatibility
  - Notion property type changed from `select` to `date`

### Signup Flow Logic

#### Parent Signup Flow:
1. User selects "I'm a Parent"
2. Fill parent info (first_name, last_name, email, phone, birth_date, password)
3. Fill player info (player_name, email, password, all other fields)
4. On submit:
   - Create parent auth account with `role='parent'`
   - Create parent profile in `profiles` table
   - Create player auth account with `role='player'`
   - Create player profile in `profiles` table
   - Create relationship in `parent_player_relationships` table
   - Sync both to Notion (if applicable)
   - Redirect parent to parent dashboard (or player dashboard with parent view)

#### Player Signup Flow:
1. User selects "I'm a Player"
2. Fill player info (current form)
3. On submit:
   - Create player auth account with `role='player'`
   - Create player profile in `profiles` table
   - Sync to Notion
   - Redirect to player dashboard

## Admin View (Future)

### Admin Capabilities
- View all parent-player relationships
- Create new relationships (link existing accounts)
- Delete relationships (unlink accounts)
- Edit both parent and player profiles
- Reassign players to different parents

### Admin UI Structure
- Table/list view of all relationships
- Search/filter by parent name, player name, email
- Actions: Link, Unlink, Edit Parent, Edit Player

## Data Flow Diagram

```
Signup Start
    │
    ├─→ Role Selection
    │   ├─→ "Parent" → Parent Form + Player Form → Create 2 Accounts → Link Relationship
    │   └─→ "Player" → Player Form → Create 1 Account
    │
    └─→ Login → Authenticate → Load Dashboard Based on Role
```

## Migration Strategy

1. **Phase 1: Database**
   - Run SQL migrations to add parent fields and relationships table
   - Update existing profiles if needed

2. **Phase 2: UI**
   - Add role selector to signup page
   - Add conditional form fields
   - Style new components

3. **Phase 3: Logic**
   - Update signup JavaScript
   - Test parent signup (creates 2 accounts)
   - Test player signup (creates 1 account)
   - Test relationship linking

4. **Phase 4: Integration**
   - Update Notion sync
   - Update Zoho sync (if applicable)
   - Test end-to-end flows

5. **Phase 5: Admin (Future)**
   - Create admin UI for relationship management
   - Add admin permissions/RLS policies

## Testing Checklist

- [ ] Parent signup creates parent account
- [ ] Parent signup creates player account
- [ ] Parent signup creates relationship link
- [ ] Player signup creates only player account
- [ ] Parent can log in and see linked players
- [ ] Player can log in independently
- [ ] Notion sync works for both parent and player signups
- [ ] Form validation works for both flows
- [ ] Role selector UI is clear and intuitive
- [ ] Mobile responsive design works

## Notes

- Parent and player accounts are completely separate (different emails, passwords)
- A parent can have multiple players (many-to-many)
- A player can have multiple parents (many-to-many)
- When a parent signs up with a player, both accounts are created immediately
- Players can sign up independently and be linked to parents later (via admin)
- Admin can manage all relationships in the admin dashboard

