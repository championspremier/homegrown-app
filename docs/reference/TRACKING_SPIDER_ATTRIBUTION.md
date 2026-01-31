# Tracking Spider Chart: Point Attribution

The spider chart measures **how many times** a player was exposed to a coaching point in each technical, tactical, physical, and mental aspect. Session types align with `src/app/utils/points.js` (POINTS_MAP).

## Legend math

- **Raw value** = **count of completed sessions** (or curriculum completions) per axis in the current quarter. Each completed session adds **1** to the relevant axis, not the actual points value.
- **Scores** are normalized to 0–10: `score = min(10, raw * (10 / min(maxRaw, 20)))` (20 sessions in one axis = 10 on the scale).
- Legend shows the **score** (0–10) per axis. Coach-only axes show "—" when no rating exists.

## Session type → pillar (1 per session)

| Session type | Pillar | Attribution |
|-------------|--------|-------------|
| **Tec Tac** | Tactical | +1 to period by `checked_in_at` date (build-out, middle-third, final-third, wide-play). |
| **Champions Player Progress (CPP)** | Tactical | Same: +1 to period by date. |
| **HG_TACTICAL_REEL** | Tactical | +1 to period from `player_curriculum_progress` (tactical) per qualifying watch; not counted from points_transactions to avoid double-count. |
| **Strength & Conditioning** | Physical | +1 to Strength, +1 to Conditioning. |
| **Speed Training**, **HG_SPEED** | Physical | +1 to Sprint Form (speed). |
| **Solo Session** | Technical | +1 to axis from `solo_sessions.skill` (escape-moves, first-touch, etc.); else Ball Mastery. |
| **HG_TECHNICAL** | Technical | +1 to axis from `solo_sessions.skill` if `session_id` in solo_sessions; else Ball Mastery. |
| **Psychologist** | Mental | +1 to Psychologist. |
| **HG_MENTAL** | Mental | +1 to Solo. |
| **Solo Session** (category=mental) | Mental | +1 to Solo (from `solo_sessions.category`). |
| **Quiz** | (future) | Can attribute by quiz category when added. |
| **Objective** | (future) | By keyword extraction (see below). |

## Curriculum progress

Each completion (row) adds **1** to the matching axis:

- **Tactical**: `category='tactical'` → +1 to `period` (build-out, etc.).
- **Technical**: `category='technical'` → +1 to `skill` axis (first-touch, escape-moves, ball-mastery, turning, passing).
- **Physical**: `category='physical'` → +1 to axis via `skillToAxis` (e.g. lower-body → Strength, speed → Sprint Form).
- **Mental**: `category='mental'` → +1 to Solo.

## Mental pillar axes

- **Solo** – Mental solo sessions (HG_MENTAL, or Solo Session with `solo_sessions.category='mental'`) and mental curriculum completions.
- **Psychologist** – Check-ins for Psychologist sessions.
- **Maturity, Socially, Work Ethic** – Coach-only (greyed until coach ratings exist).

## Future: Quiz and objective keyword extraction

Objectives (and optionally quizzes) can drive axis attribution by **keywords** (e.g. “Create contact” → physical, “Sprint” → Sprint Form, “shuffle the feet” → Coordination). See doc for implementation options.
