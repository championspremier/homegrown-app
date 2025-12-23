# Quick Navigation Guide

## Finding Code Quickly

### JavaScript (schedule.js - 3714 lines)

**Calendar & Rendering:**
- `renderCalendar()` - Line 61
- `renderSessionsOnCalendar()` - Line 172
- `generateTimeSlots()` - Line 51
- `getWeekStart()` - Line 43

**Session Management:**
- `loadSessions()` - Line 315
- `handleFormSubmit()` - Line 772
- `editSession()` - Line 1862
- `handleDeleteSession()` - Line 1613

**Sidebar:**
- `openSessionSidebar()` - Line 573
- `closeSessionSidebar()` - Line 641
- `loadCoachesIntoDropdowns()` - Line 684

**Drag & Drop:**
- `handleSessionDrop()` - Line 1554
- Drag handlers in `renderSessionsOnCalendar()` - Lines 284-304

**Individual Sessions:**
- `showIndividualSessionConfig()` - Line 1958
- `saveIndividualSessionConfig()` - Line 2935
- `loadIndividualSessionTypes()` - Line 3384

**Modals:**
- `openEditSessionModal()` - Line 1715
- `saveEditSession()` - Line 1176
- `openRepeatsForeverModal()` - Line 1071

### CSS (schedule.css - 1695 lines)

**Calendar:**
- `.calendar-grid` - Line 203
- `.session-block` - Line 297
- `.day-time-slot` - Line 284

**Sidebar:**
- `.session-sidebar` - Line 372
- `.session-form` - Line 430
- `.form-group` - Line 450

**Modals:**
- `.modal-overlay` - Line 671
- `.edit-session-modal` - Line 700+

**Individual Sessions:**
- `.individual-sessions-view` - Line 1100+
- `.config-panel` - Line 1200+

## Common Tasks

**Want to change how sessions are displayed?**
→ Look at `renderSessionsOnCalendar()` (Line 172) and `.session-block` styles (Line 297)

**Want to modify the sidebar form?**
→ Look at `openSessionSidebar()` (Line 573) and `.session-form` styles (Line 430)

**Want to change drag & drop behavior?**
→ Look at `handleSessionDrop()` (Line 1554) and drag handlers in `renderSessionsOnCalendar()` (Lines 284-304)

**Want to modify individual session configuration?**
→ Look at `showIndividualSessionConfig()` (Line 1958) and related functions

**Want to change calendar navigation?**
→ Look at `renderCalendar()` (Line 61) and event listeners (Lines 382-398)

