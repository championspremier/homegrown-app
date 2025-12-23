# Coach Schedule - Code Organization

This document helps you quickly find code sections in the large schedule files.

## File Structure

```
coach/schedule/
├── schedule.html          # Main HTML template
├── schedule.js            # Main JavaScript (3714 lines)
├── schedule.css           # Main CSS (1695 lines)
└── modules/               # Organized modules
    ├── js/                # JavaScript modules
    │   ├── state.js      # Shared state and Supabase initialization
    │   ├── calendar.js   # Calendar rendering and navigation
    │   ├── sessions.js   # Session CRUD operations
    │   ├── sidebar.js    # Sidebar form management
    │   ├── drag-drop.js  # Drag and drop functionality
    │   ├── modals.js     # Modal dialogs
    │   ├── individual-sessions.js  # Individual session configuration
    │   ├── events.js     # Event listeners setup
    │   └── utils.js      # Utility functions
    └── css/              # CSS modules
        ├── calendar.css  # Calendar grid and layout
        ├── sessions.css  # Session blocks styling
        ├── sidebar.css   # Sidebar form styling
        ├── modals.css    # Modal dialogs styling
        └── individual-sessions.css  # Individual session config styling
```

## JavaScript Code Map (schedule.js)

### Lines 1-40: Initialization
- Supabase setup
- State variables
- `initializeSchedule()`

### Lines 42-312: Calendar Rendering
- `getWeekStart()` - Calculate week start date
- `generateTimeSlots()` - Generate time slots (5AM-12AM)
- `renderCalendar()` - Render calendar grid
- `renderSessionsOnCalendar()` - Render session blocks on calendar

### Lines 314-352: Session Loading
- `loadSessions()` - Load sessions from database

### Lines 354-556: Event Listeners
- `setupEventListeners()` - All event listener setup

### Lines 558-570: Day Button Highlighting
- `highlightDayButton()` - Highlight day in sidebar

### Lines 572-640: Sidebar Management
- `openSessionSidebar()` - Open/create session sidebar
- `closeSessionSidebar()` - Close sidebar
- `switchTab()` - Switch between Details/Settings tabs
- `updateLocationFields()` - Update location fields based on type
- `loadCoachesIntoDropdowns()` - Load coaches into dropdowns
- `updateSessionTypeOptions()` - Update session type options

### Lines 772-1062: Form Submission
- `handleFormSubmit()` - Handle session form submission

### Lines 1064-1163: Repeats Forever Modal
- `openRepeatsForeverModal()`
- `closeRepeatsForeverModal()`
- `updateRepeatsForeverInputs()`
- `saveRepeatsForeverSettings()`

### Lines 1164-1551: Edit Session Modal
- `closeEditSessionModal()`
- `saveEditSession()` - Save edited session

### Lines 1553-1611: Drag and Drop
- `handleSessionDrop()` - Handle session drop on calendar

### Lines 1613-1621: Delete Session
- `handleDeleteSession()` - Delete session handler

### Lines 1623-1713: Recurring Sessions
- `checkIfRecurringSession()` - Check if session is recurring
- `getRecurringSessionDates()` - Get all dates for recurring session
- `updateRecurringDatesList()` - Update recurring dates in modal

### Lines 1715-1858: Edit Session Modal (Open)
- `openEditSessionModal()` - Open edit modal with options

### Lines 1860-1938: Edit Session
- `editSession()` - Edit session handler

### Lines 1940-1956: Session Type Change
- `handleSessionTypeChange()` - Handle session type selection

### Lines 1958-2461: Individual Session Configuration
- `showIndividualSessionConfig()` - Show config interface
- `hideIndividualSessionConfig()` - Hide config interface
- `renderIndividualSessionConfig()` - Render config UI
- `setupIndividualConfigListeners()` - Setup config event listeners

### Lines 2463-2475: Config Tabs
- `switchConfigTab()` - Switch config tabs

### Lines 2477-2546: Staff Management
- `loadAllCoaches()` - Load all coaches
- `addStaffTag()` - Add staff tag to config
- `updatePeopleTabAfterStaffChange()` - Update people tab

### Lines 2577-2665: Load Config Staff
- `loadConfigStaff()` - Load staff for configuration

### Lines 2667-2742: Availability Rendering
- `renderAvailabilitySchedule()` - Render availability schedule

### Lines 2744-2933: People Availability
- `loadPeopleAvailability()` - Load coach availability
- `renderPeopleAvailability()` - Render availability in People tab
- `renderCoachAvailabilitySchedule()` - Render coach-specific schedule

### Lines 2909-2933: Time Conversion
- `convertTo24Hour()` - Convert 12-hour to 24-hour time

### Lines 2935-3341: Save Individual Session Config
- `saveIndividualSessionConfig()` - Save individual session configuration

### Lines 3343-3355: Time Conversion
- `convertTo12Hour()` - Convert 24-hour to 12-hour time

### Lines 3357-3382: View Switching
- `switchView()` - Switch between Calendar and Individual Sessions views

### Lines 3384-3453: Individual Session Types
- `loadIndividualSessionTypes()` - Load individual session types
- `renderIndividualSessionTypesTable()` - Render types table

### Lines 3515-3713: Actions Menu
- `setupActionsMenuHandlers()` - Setup actions menu
- `showSessionTypeInfo()` - Show session type info
- `editSessionType()` - Edit session type
- `duplicateSessionType()` - Duplicate session type
- `deleteSessionType()` - Delete session type

## CSS Code Map (schedule.css)

### Lines 1-100: Page Layout
- `.schedule-page` - Main page container
- `.calendar-header` - Calendar header
- `.calendar-nav` - Navigation buttons
- `.calendar-actions` - Action buttons

### Lines 100-370: Calendar Grid
- `.calendar-grid` - Calendar grid container
- `.time-column` - Time column
- `.day-column` - Day columns
- `.day-time-slot` - Time slots
- `.session-block` - Session blocks

### Lines 372-700: Sidebar
- `.session-sidebar` - Sidebar container
- `.sidebar-header` - Sidebar header
- `.session-form` - Form styling
- `.form-group` - Form groups

### Lines 700-1100: Modals
- `.edit-session-modal` - Edit session modal
- `.repeats-forever-modal` - Repeats forever modal

### Lines 1100-1400: Individual Session Config
- `.individual-sessions-view` - Individual sessions view
- `.config-panel` - Configuration panel
- `.config-tabs` - Configuration tabs

### Lines 1400-1695: Actions and Utilities
- `.actions-menu` - Actions menu
- Various utility classes

## Quick Reference

**Need to modify calendar rendering?** → Lines 42-312 in schedule.js
**Need to modify session creation?** → Lines 772-1062 in schedule.js
**Need to modify sidebar?** → Lines 572-640 in schedule.js
**Need to modify drag & drop?** → Lines 1553-1611 in schedule.js
**Need to modify individual sessions?** → Lines 1958-2933 in schedule.js

