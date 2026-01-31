# Supabase RLS Reference

This doc describes the current RLS model for key tables so that DB changes, queries, and edge-function logic assume the right behavior. **Do not rely on policy names**—they may change; only behavior (who can do what) is stable.

---

## `public.points_transactions`

Permissions are enforced through **consolidated policies** (one per command for role `authenticated`). Multiple historical permissive policies were merged into single policies per operation.

### Behavior (authenticated only; do not depend on policy names)

- **SELECT**: Unchanged; players/parents see own/linked player rows; coaches/admins see as defined by existing SELECT policies.
- **INSERT**: Allowed if **any** of:
  - User is coach or admin (e.g. awarding points for check-ins), or
  - User is player inserting **own** row with `session_type = 'HG_TACTICAL_REEL'` (e.g. solo tactical reel completion).
- **UPDATE**: Allowed if **any** of:
  - User is admin, or
  - User is coach and `checked_in_by = auth.uid()` (coach can update points they created).
- **DELETE**: Allowed if **any** of:
  - User is admin, or
  - User is coach and `checked_in_by = auth.uid()` (coach can reverse points they created).

### Fields that matter for RLS

- `player_id` – whose points.
- `checked_in_by` – coach who created the row (for update/delete).
- `session_type` – e.g. `HG_TACTICAL_REEL` for player self-insert.

### JS / Edge functions

- Do **not** reference old policy names (e.g. "Coaches can delete own points", "Players can insert own tactical points") in code or comments.
- Rely only on **behavior**: ensure the calling user is authenticated, has the right `profile.role` (coach/admin/player), and that row fields match (e.g. `checked_in_by = auth.uid()` for coach update/delete).

### Debugging failing queries

1. **Auth**: Is the user `authenticated` or `anon`? Points policies apply to `authenticated`.
2. **Role**: Check `profile.role` (coach / admin / player).
3. **INSERT**: Coach/admin can insert any; player only for own row with `session_type = 'HG_TACTICAL_REEL'`.
4. **UPDATE/DELETE**: Must be admin, or coach with `checked_in_by = auth.uid()`.

---

## Function `search_path` hardening

Supabase/Postgres linter cleanup set `search_path` on several functions to `pg_catalog, public` (no logic or signature changes). Affected functions include:

- `update_sessions_updated_at`, `update_individual_sessions_updated_at`
- `get_user_emails`, `update_session_reservation_count`
- `get_player_quarterly_points`, `get_quarterly_leaderboard`, `get_player_leaderboard_position`
- `check_message_rate_limit`, `create_solo_session_notification`, `calculate_solo_session_duration`
- `create_objectives_notification`, `create_quiz_notification`, `check_objectives_rate_limit`
- `handle_new_user`, `update_updated_at_column`

No JS or edge-function changes are required for this.
