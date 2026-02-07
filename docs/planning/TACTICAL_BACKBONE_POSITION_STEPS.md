# Tactical Backbone + Position Metadata: Next Steps

This doc outlines the implementation we're doing: move tactical drill keywords into curriculum-backbone, add **position as metadata** on keywords (Option A), and update solo-create tactical flow.

---

## 1. Backbone: tactical keyword structure

- **Where:** `src/app/utils/curriculum-backbone.js`
- **What:** Replace each period's empty `tactical: {}` with the same shape as current `DRILL_KEYWORDS.tactical[period]`:
  - **Phases:** `attacking`, `defending`, `transition-a-to-d`, `transition-d-to-a`
  - **Per phase:** keyword keys → `{ keyword, synonyms, positions?: string[] }`
- **Position metadata:** Each keyword gets optional `positions: ['Full-Back', 'Winger']`. Omitted or empty = "all positions". You can go line-by-line later to set positions per keyword.
- **Data size:** Tactical keyword data is large. We will put it in a **separate data file** (`tactical-keywords-data.js`) and have backbone **import** it and assign to each period's `tactical` so backbone stays readable.

---

## 2. Position constants

- **Where:** In `curriculum-backbone.js` (or a small shared constant).
- **What:**
  - **Canonical list** (same as signup): `['GK', 'Central Defender', 'Full-Back', 'Mid-Defensive', 'Mid-Offensive', 'Winger', 'Forward']`
  - **Optional groups** for UI: e.g. `{ gk: ['GK'], defense: ['Central Defender', 'Full-Back'], midfield: ['Mid-Defensive', 'Mid-Offensive'], forwards: ['Forward', 'Winger'] }`
- **Used by:** Solo-create position dropdown; keyword filtering (include keyword if `positions` is empty or includes selected position / any in group).

---

## 3. Backbone API for tactical

- **Where:** `src/app/utils/curriculum-backbone.js`
- **New exports:**
  - `getPhasesForPeriod(period)` → array of phase keys for that period's tactical data.
  - `getTacticalKeywordsForPeriodAndPhase(period, phase, positionFilter?)` → array of `{ keyword, synonyms, positions?, phase }`. If `positionFilter` is provided (single position string or group key), filter to keywords where `positions` is empty or includes that position (or any in group).
- **Existing drill-keywords.js:** Update `getPhasesForPeriod` and `getKeywordsForPeriodAndPhase` to **call backbone** for tactical data so solo-create and any other callers keep working. Add optional third argument `positionFilter` to `getKeywordsForPeriodAndPhase` and pass through to backbone.

---

## 4. Solo-create: tactical flow (1 → 2 → 3 → 4)

- **Current:** 1. Period → 2. Phase → 3. Keywords (no position).
- **New:** 1. Period → 2. Phase → **3. Position** (dropdown: "All positions" or by group or individual) → 4. Keywords (filtered by position when not "All").
- **Changes:**
  - After phase dropdown, add **position** dropdown (options: "All positions", then optionally groups, then the 7 individual positions using the canonical list).
  - When loading keywords: call `getKeywordsForPeriodAndPhase(period, phase, position)` (or equivalent with position filter). If position is "All", pass no filter; otherwise pass selected position (or expand group to positions and filter).
  - When opening the "add drill" modal for tactical, persist selected position and pass it into the keyword loader so the grid shows filtered keywords.
  - When **saving** a tactical drill video (solo_session_videos) we can optionally store `target_positions` on the video; when **saving** the session (solo_sessions), store `target_positions` on the session (see step 5).

---

## 5. Storing target_positions

- **Session level:** Add `target_positions` to the payload when creating/updating a tactical solo_session. Value: `null` or `[]` = "all positions"; otherwise array of position strings, e.g. `['Full-Back', 'Winger']`.
- **Database:** Add a migration to add column `target_positions TEXT[] DEFAULT NULL` to `solo_sessions`. Used only for `category = 'tactical'`.
- **Optional:** Per-video `target_positions` on `solo_session_videos` for tactical videos — can be added later; for now session-level is enough so coaches can assign a tactical session to specific positions.

---

## 6. Drill-keywords: tactical from backbone

- **drill-keywords.js:** For `getPhasesForPeriod(period)` and `getKeywordsForPeriodAndPhase(period, phase, positionFilter?)`, **delegate to backbone** when reading tactical data (import from curriculum-backbone and call the new functions). Technical/physical/mental stay in drill-keywords for now (no change).
- **drill-keywords-restructured.js:** Can later re-export tactical from backbone or be deprecated for tactical; for this implementation we focus on drill-keywords.js (used by solo-create) and backbone as source of truth.

---

## 7. Order of implementation

1. Create **tactical-keywords-data.js** with full tactical keyword tree (copy from drill-keywords-restructured), add optional `positions: []` to each keyword (empty = all).
2. Add **position constants** and **tactical API** (`getPhasesForPeriod`, `getTacticalKeywordsForPeriodAndPhase`) to curriculum-backbone; backbone imports tactical data and assigns to each period's `tactical`.
3. Update **curriculum-backbone.js** so each period has `tactical: <imported data>`.
4. Update **drill-keywords.js** to use backbone for tactical (getPhasesForPeriod, getKeywordsForPeriodAndPhase with optional position).
5. Update **solo-create**: add position dropdown to tactical flow; filter keywords by position; pass position when loading keywords; save `target_positions` when saving tactical session.
6. Add **migration** for `solo_sessions.target_positions` and include it in session create/update for tactical.

---

## 8. What you can do after implementation

- **Line-by-line positions:** In `src/app/utils/drill-keywords-restructured.js`, in the tactical section, add optional `positions: ['Full-Back']` or `positions: ['Winger', 'Forward']` etc. to any keyword that should be position-specific. Omit or leave without `positions` = all positions. `tactical-keywords-data.js` derives from that file and uses `item.positions ?? []`, so your edits flow through to backbone and solo-create.
