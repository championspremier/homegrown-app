// ============================================================================
// COACH SCHEDULE - MAIN SCRIPT
// ============================================================================
// This file contains all schedule functionality for coaches.
// For easier navigation, see README.md for a complete code map.
//
// Quick Navigation:
// - Lines 1-40:   Initialization & State
// - Lines 42-312: Calendar Rendering
// - Lines 314-352: Session Loading
// - Lines 354-556: Event Listeners Setup
// - Lines 572-640: Sidebar Management
// - Lines 772-1062: Form Submission
// - Lines 1064-1551: Modals (Repeats Forever, Edit Session)
// - Lines 1553-1611: Drag & Drop
// - Lines 1958-2933: Individual Session Configuration
// - Lines 3384-3713: Individual Session Types Management
// ============================================================================

import { initSupabase } from '../../../../auth/config/supabase.js';

// Initialize Supabase
let supabase;
let supabaseReady = false;

initSupabase().then(client => {
  if (client) {
    supabase = client;
    supabaseReady = true;
    initializeSchedule();
  } else {
    console.error('❌ Supabase client is null');
  }
}).catch(err => {
  console.error('❌ Failed to initialize Supabase:', err);
});

// Calendar state
let currentWeekStart = new Date();
let selectedLocationType = null; // 'on-field' or 'virtual'
let sessions = [];
let draggedSession = null; // Track session being dragged

// Individual session types (for configuration interface)
const INDIVIDUAL_SESSION_TYPES = [
  'Champions Player Progress (CPP)',
  'College Advising',
  'Psychologist',
  'Free Nutrition Consultation'
];

// Initialize the schedule page
function initializeSchedule() {
  setupEventListeners();
  renderCalendar();
  loadSessions();
  loadIndividualSessionTypes();
}

// Set current week to start on Sunday
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day;
  return new Date(d.setDate(diff));
}

// Generate time slots from 5AM to 12AM (midnight)
function generateTimeSlots() {
  const slots = [{ label: 'All-day', time: null }];
  for (let hour = 5; hour <= 23; hour++) {
    const time12 = hour > 12 ? `${hour - 12}pm` : hour === 12 ? '12pm' : `${hour}am`;
    slots.push({ label: time12, time: `${String(hour).padStart(2, '0')}:00` });
  }
  return slots;
}

// Render the calendar grid
function renderCalendar() {
  const calendarGrid = document.getElementById('calendarGrid');
  if (!calendarGrid) return;

  const weekStart = getWeekStart(currentWeekStart);
  const timeSlots = generateTimeSlots();
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Update month display
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                      'July', 'August', 'September', 'October', 'November', 'December'];
  const currentMonth = monthNames[weekStart.getMonth()];
  const currentYear = weekStart.getFullYear();
  document.getElementById('currentMonth').textContent = `${currentMonth} ${currentYear}`;

  // Clear grid
  calendarGrid.innerHTML = '';

  // Create time column
  const timeCol = document.createElement('div');
  timeCol.className = 'time-column';
  timeSlots.forEach(slot => {
    const timeSlot = document.createElement('div');
    timeSlot.className = 'time-slot' + (slot.time === null ? ' all-day' : '');
    timeSlot.textContent = slot.label;
    timeCol.appendChild(timeSlot);
  });
  calendarGrid.appendChild(timeCol);

  // Create day columns
  for (let i = 0; i < 7; i++) {
    const dayDate = new Date(weekStart);
    dayDate.setDate(weekStart.getDate() + i);
    
    const dayCol = document.createElement('div');
    dayCol.className = 'day-column';
    
    // Day header
    const dayHeader = document.createElement('div');
    dayHeader.className = 'day-header';
    const today = new Date();
    if (dayDate.toDateString() === today.toDateString()) {
      dayHeader.classList.add('today');
    }
    dayHeader.innerHTML = `
      <div class="day-name">${days[i]}</div>
      <div class="day-number">${dayDate.getDate()}</div>
    `;
    dayCol.appendChild(dayHeader);

    // Time slots for this day
    timeSlots.forEach((slot, idx) => {
      if (slot.time === null) return; // Skip all-day slot
      
      const timeSlot = document.createElement('div');
      timeSlot.className = 'day-time-slot';
      timeSlot.dataset.date = dayDate.toISOString().split('T')[0];
      timeSlot.dataset.time = slot.time;
      timeSlot.dataset.hour = slot.time.split(':')[0];
      
      // Add click handler to create session (only if not clicking on existing session)
      timeSlot.addEventListener('click', (e) => {
        // Don't create new session if clicking on an existing session block
        if (e.target.closest('.session-block')) {
          return;
        }
        
        // Highlight the corresponding day button in sidebar
        highlightDayButton(dayDate.getDay());
        
        openSessionSidebar('on-field', dayDate, slot.time);
      });

      // Drag and drop handlers for time slots
      timeSlot.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        timeSlot.classList.add('drop-target');
      });

      timeSlot.addEventListener('dragleave', (e) => {
        timeSlot.classList.remove('drop-target');
      });

      timeSlot.addEventListener('drop', async (e) => {
        e.preventDefault();
        timeSlot.classList.remove('drop-target');
        
        if (draggedSession) {
          // Get the new date and time from the drop target
          const newDate = timeSlot.dataset.date;
          const newTime = timeSlot.dataset.time;
          
          console.log('Drop - original date:', draggedSession.originalDate, 'new date:', newDate);
          
          // Show edit modal with new date/time (or move directly if single session)
          await handleSessionDrop(draggedSession, newDate, newTime);
        }
      });
      
      dayCol.appendChild(timeSlot);
    });
    
    calendarGrid.appendChild(dayCol);
  }

  // Render sessions on calendar
  renderSessionsOnCalendar();
}

// Render sessions on the calendar
function renderSessionsOnCalendar() {
  // Remove existing session blocks
  document.querySelectorAll('.session-block').forEach(block => block.remove());

  if (!sessions || sessions.length === 0) {
    console.log('No sessions to render');
    return;
  }

  console.log('Rendering sessions:', sessions.length);

  const weekStart = getWeekStart(currentWeekStart);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);
  
  // Normalize dates to start of day for comparison
  weekStart.setHours(0, 0, 0, 0);
  weekEnd.setHours(23, 59, 59, 999);

  sessions.forEach(session => {
    // Parse session date (handle both string and Date)
    const sessionDate = new Date(session.session_date + 'T00:00:00');
    sessionDate.setHours(0, 0, 0, 0);

    console.log('Session:', {
      id: session.id,
      type: session.session_type,
      date: session.session_date,
      time: session.session_time,
      coach_id: session.coach_id,
      parsedDate: sessionDate.toISOString(),
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString()
    });

    // Check if session is in current week
    if (sessionDate < weekStart || sessionDate > weekEnd) {
      console.log('Session outside current week:', session.session_type);
      return;
    }

    // Calculate day index (0 = Sunday, 6 = Saturday)
    const dayIndex = Math.round((sessionDate - weekStart) / (1000 * 60 * 60 * 24));
    
    if (dayIndex < 0 || dayIndex > 6) {
      console.log('Invalid day index:', dayIndex, 'for session:', session.session_type);
      return;
    }

    const [hours, minutes] = session.session_time.split(':');
    const startHour = parseInt(hours);
    const startMinute = parseInt(minutes);
    const duration = session.duration_minutes;
    
    // Find the time slot element
    const dayColumns = document.querySelectorAll('.day-column');
    if (!dayColumns[dayIndex]) {
      console.log('Day column not found for index:', dayIndex);
      return;
    }

    const timeSlots = dayColumns[dayIndex].querySelectorAll('.day-time-slot');
    const startSlotIndex = startHour - 5; // 5AM is index 0
    
    if (startSlotIndex < 0 || startSlotIndex >= timeSlots.length) {
      console.log('Invalid time slot index:', startSlotIndex, 'for session:', session.session_type, 'hour:', startHour);
      return;
    }

    if (timeSlots[startSlotIndex]) {
      const slot = timeSlots[startSlotIndex];
      
      // Calculate position and height
      const minutesFromStart = startMinute;
      const topOffset = (minutesFromStart / 60) * 60; // 60px per hour
      const height = Math.max((duration / 60) * 60, 40); // Minimum height of 40px
      
      // Format time for display (e.g., "9:00 AM")
      const timeDate = new Date(`2000-01-01T${session.session_time}`);
      const timeString = timeDate.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });

      // Get coach name
      const coachName = session.coach 
        ? `${session.coach.first_name || ''} ${session.coach.last_name || ''}`.trim() || 'Coach'
        : 'Coach';

      // Use abbreviated name for individual sessions, full name for group sessions
      const displayType = session.is_individual && session.session_type_abbrev 
        ? session.session_type_abbrev 
        : session.session_type;

      // Get color for individual sessions
      const sessionColor = session.is_individual && session.color ? session.color : null;

      const sessionBlock = document.createElement('div');
      sessionBlock.className = 'session-block';
      sessionBlock.style.top = `${topOffset}px`;
      sessionBlock.style.height = `${height}px`;
      sessionBlock.draggable = !session.is_individual; // Individual sessions are not draggable
      sessionBlock.dataset.sessionId = session.id;
      sessionBlock.dataset.sessionDate = session.session_date;
      sessionBlock.dataset.sessionTime = session.session_time;
      sessionBlock.dataset.isIndividual = session.is_individual ? 'true' : 'false';
      
      // Apply color for individual sessions
      if (sessionColor) {
        sessionBlock.style.backgroundColor = sessionColor;
        sessionBlock.style.borderLeftColor = sessionColor;
        // Ensure text is readable (use white text on dark colors, dark on light)
        const rgb = hexToRgb(sessionColor);
        const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        sessionBlock.style.color = brightness > 128 ? '#000' : '#fff';
      }
      
      sessionBlock.innerHTML = `
        <div class="session-block-type">${displayType}</div>
        <div class="session-block-time">${timeString}</div>
        <div class="session-block-coach">${coachName}</div>
      `;
      
      // Click handler for editing (group sessions) or viewing details (individual sessions)
      if (!session.is_individual) {
        sessionBlock.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          editSession(session);
        });
      } else {
        // Individual sessions open detail modal
        sessionBlock.style.cursor = 'pointer';
        sessionBlock.addEventListener('click', (e) => {
          e.stopPropagation();
          e.preventDefault();
          showIndividualSessionDetails(session);
        });
      }

      // Drag and drop handlers (only for group sessions)
      if (!session.is_individual) {
        sessionBlock.addEventListener('dragstart', (e) => {
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', session.id);
          sessionBlock.classList.add('dragging');
          // Store the original session data for reference (important for day name display)
          draggedSession = {
            ...session,
            originalDate: session.session_date, // Keep original date
            originalTime: session.session_time  // Keep original time
          };
          console.log('Drag started - original date:', session.session_date, 'day:', new Date(session.session_date).getDay());
        });

        sessionBlock.addEventListener('dragend', (e) => {
          sessionBlock.classList.remove('dragging');
          // Remove drop indicators
          document.querySelectorAll('.day-time-slot').forEach(slot => {
            slot.classList.remove('drop-target');
          });
          draggedSession = null;
        });
      }
      
      slot.style.position = 'relative';
      slot.appendChild(sessionBlock);
      
      console.log('Session rendered:', session.session_type, 'at day', dayIndex, 'time', startHour + ':' + minutes);
    }
  });
}

// Load sessions from database
async function loadSessions() {
  if (!supabaseReady || !supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return;

    // Load all group sessions with coach profile info (all coaches can view all sessions)
    const { data: groupSessions, error: groupError } = await supabase
      .from('sessions')
      .select(`
        *,
        coach:profiles!sessions_coach_id_fkey(
          first_name,
          last_name
        )
      `)
      .order('session_date', { ascending: true })
      .order('session_time', { ascending: true });

    if (groupError) {
      console.error('Error loading group sessions:', groupError);
      return;
    }

    // Load individual session bookings
    const { data: individualBookings, error: individualError } = await supabase
      .from('individual_session_bookings')
      .select(`
        *,
        session_type:individual_session_types(
          id,
          name,
          display_name,
          duration_minutes,
          color
        ),
        coach:profiles!individual_session_bookings_coach_id_fkey(
          first_name,
          last_name
        ),
        player:profiles!individual_session_bookings_player_id_fkey(
          id,
          first_name,
          last_name,
          birth_year,
          birth_date,
          positions
        )
      `)
      .in('status', ['confirmed', 'completed'])
      .is('cancelled_at', null)
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true });

    if (individualError) {
      console.error('Error loading individual session bookings:', individualError);
    }

    // Convert individual bookings to session format
    const individualSessions = (individualBookings || []).map(booking => ({
      id: booking.id,
      session_type: booking.session_type?.display_name || booking.session_type?.name || 'Individual Session',
      session_type_abbrev: abbreviateSessionType(booking.session_type?.display_name || booking.session_type?.name || 'Individual Session'),
      session_date: booking.booking_date,
      session_time: booking.booking_time,
      duration_minutes: booking.duration_minutes || booking.session_type?.duration_minutes || 20,
      location_type: 'virtual',
      coach_id: booking.coach_id,
      coach: booking.coach,
      color: booking.session_type?.color || '#7ed321', // Default color if not set
      is_individual: true,
      booking_data: booking,
      player: booking.player
    }));

    // Combine group sessions and individual sessions
    sessions = [...(groupSessions || []), ...individualSessions];
    
    console.log('Loaded sessions:', {
      group: groupSessions?.length || 0,
      individual: individualSessions.length,
      total: sessions.length
    });
    
    renderSessionsOnCalendar();
  } catch (error) {
    console.error('Error loading sessions:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Create button dropdown
  const createBtn = document.getElementById('createBtn');
  const createDropdown = document.getElementById('createDropdown');
  
  createBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    createDropdown.classList.toggle('show');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!createBtn?.contains(e.target) && !createDropdown?.contains(e.target)) {
      createDropdown?.classList.remove('show');
    }
  });

  // Create option clicks
  document.querySelectorAll('.create-option').forEach(option => {
    option.addEventListener('click', () => {
      const locationType = option.dataset.locationType;
      openSessionSidebar(locationType);
      createDropdown.classList.remove('show');
    });
  });

  // Navigation buttons
  document.getElementById('todayBtn')?.addEventListener('click', () => {
    currentWeekStart = new Date();
    renderCalendar();
    loadSessions();
  });

  document.getElementById('prevWeekBtn')?.addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    renderCalendar();
    loadSessions();
  });

  document.getElementById('nextWeekBtn')?.addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    renderCalendar();
    loadSessions();
  });

  // Sidebar controls
  document.getElementById('sidebarClose')?.addEventListener('click', closeSessionSidebar);
  document.getElementById('cancelBtn')?.addEventListener('click', closeSessionSidebar);
  document.getElementById('sidebarOverlay')?.addEventListener('click', closeSessionSidebar);
  document.getElementById('sidebarDelete')?.addEventListener('click', handleDeleteSession);

  // Tab switching
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });


  // Attendance limit toggle
  const attendanceToggle = document.getElementById('attendanceLimitToggle');
  const attendanceInput = document.getElementById('attendanceLimit');
  attendanceToggle?.addEventListener('change', (e) => {
    attendanceInput.disabled = !e.target.checked;
    if (!e.target.checked) {
      attendanceInput.value = '';
    } else {
      attendanceInput.value = '25';
    }
  });

  // Day selector
  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      // Toggle selection
      btn.classList.toggle('selected');
    });
  });
  
  // Also highlight day when clicking on day header in calendar
  document.querySelectorAll('.day-header').forEach(header => {
    header.addEventListener('click', () => {
      const dayNumber = header.querySelector('.day-number')?.textContent;
      if (dayNumber) {
        // Find which day of week this is
        const weekStart = getWeekStart(currentWeekStart);
        const headerDate = new Date(weekStart);
        const dayIndex = Array.from(header.parentElement.parentElement.children).indexOf(header.parentElement) - 1; // -1 for time column
        if (dayIndex >= 0 && dayIndex < 7) {
          headerDate.setDate(weekStart.getDate() + dayIndex);
          highlightDayButton(headerDate.getDay());
        }
      }
    });
  });

  // Repeats forever modal
  const repeatsForeverBtn = document.getElementById('repeatsForeverBtn');
  const repeatsForeverModal = document.getElementById('repeatsForeverModal');
  const repeatsForeverClose = document.getElementById('repeatsForeverClose');
  const repeatsForeverSave = document.getElementById('repeatsForeverSave');
  const repeatsEndRadios = document.querySelectorAll('input[name="repeatsEnd"]');
  const onDateInput = document.getElementById('onDateInput');
  const afterInput = document.getElementById('afterInput');

  repeatsForeverBtn?.addEventListener('click', () => {
    openRepeatsForeverModal();
  });

  repeatsForeverClose?.addEventListener('click', () => {
    closeRepeatsForeverModal();
  });

  repeatsForeverSave?.addEventListener('click', () => {
    saveRepeatsForeverSettings();
  });

  // Handle radio button changes
  repeatsEndRadios.forEach(radio => {
    radio.addEventListener('change', () => {
      updateRepeatsForeverInputs();
    });
  });

  // Close modal when clicking overlay
  repeatsForeverModal?.addEventListener('click', (e) => {
    if (e.target === repeatsForeverModal) {
      closeRepeatsForeverModal();
    }
  });

  // Session type change handler - detect individual sessions
  const sessionTypeSelect = document.getElementById('sessionType');
  sessionTypeSelect?.addEventListener('change', (e) => {
    const selectedType = e.target.value;
    handleSessionTypeChange(selectedType);
  });

  // View toggle buttons
  const calendarViewBtn = document.getElementById('calendarViewBtn');
  const individualSessionsViewBtn = document.getElementById('individualSessionsViewBtn');
  const calendarContainer = document.getElementById('calendarContainer');
  const individualSessionsSection = document.getElementById('individualSessionsSection');
  
  calendarViewBtn?.addEventListener('click', () => {
    switchView('calendar');
  });
  
  individualSessionsViewBtn?.addEventListener('click', () => {
    switchView('individual');
  });

  // Help button tooltip
  const helpBtn = document.getElementById('helpBtn');
  const helpTooltip = document.getElementById('helpTooltip');
  
  helpBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (helpTooltip) {
      helpTooltip.classList.toggle('show');
    }
  });
  
  // Close tooltip when clicking outside
  document.addEventListener('click', (e) => {
    if (!helpBtn?.contains(e.target) && !helpTooltip?.contains(e.target)) {
      if (helpTooltip) {
        helpTooltip.classList.remove('show');
      }
    }
  });

  // Form submission
  document.getElementById('sessionForm')?.addEventListener('submit', handleFormSubmit);

  // Edit session modal
  const editSessionModal = document.getElementById('editSessionModal');
  const editSessionClose = document.getElementById('editSessionClose');
  const editSessionSave = document.getElementById('editSessionSave');

  editSessionClose?.addEventListener('click', () => {
    closeEditSessionModal();
  });

  editSessionSave?.addEventListener('click', async () => {
    // Prevent double-clicking
    if (editSessionSave.disabled) return;
    editSessionSave.disabled = true;
    try {
      await saveEditSession();
    } finally {
      editSessionSave.disabled = false;
    }
  });

  editSessionModal?.addEventListener('click', (e) => {
    if (e.target === editSessionModal) {
      closeEditSessionModal();
    }
  });
}

// Highlight day button based on day of week (0 = Sunday, 6 = Saturday)
function highlightDayButton(dayOfWeek) {
  // Clear all day button selections
  document.querySelectorAll('.day-btn').forEach(btn => {
    btn.classList.remove('selected');
  });
  
  // Highlight the corresponding day button
  const dayBtn = document.querySelector(`.day-btn[data-day="${dayOfWeek}"]`);
  if (dayBtn) {
    dayBtn.classList.add('selected');
  }
}

// Open session sidebar
async function openSessionSidebar(locationType, date = null, time = null) {
  selectedLocationType = locationType;
  const sidebar = document.getElementById('sessionSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  
  // Reset form
  document.getElementById('sessionForm').reset();
  
  // Hide delete button (only show when editing)
  document.getElementById('sidebarDelete').style.display = 'none';
  
  // Highlight day button if date is provided
  if (date) {
    highlightDayButton(date.getDay());
  }
  
  // Reset repeats forever settings and button text
  repeatsEndSettings = {
    type: 'never',
    endDate: null,
    occurrences: null
  };
  document.getElementById('repeatsForeverBtn').textContent = 'Repeats forever';
  
  // Update location type in form
  updateLocationFields(locationType);
  
  // Update session type options based on location type
  updateSessionTypeOptions(locationType);
  
  // Load and populate coach dropdowns
  await loadCoachesIntoDropdowns();
  
  // Set default values if provided
  if (date) {
    document.getElementById('sessionDate').value = date.toISOString().split('T')[0];
  } else {
    // Default to today
    const today = new Date();
    document.getElementById('sessionDate').value = today.toISOString().split('T')[0];
  }
  
  if (time) {
    const [hours, minutes] = time.split(':');
    document.getElementById('sessionStartTime').value = time;
    // Set end time to 1.5 hours later by default
    const endTime = new Date();
    endTime.setHours(parseInt(hours), parseInt(minutes));
    endTime.setMinutes(endTime.getMinutes() + 90);
    document.getElementById('sessionEndTime').value = 
      `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;
  } else {
    // Default times
    document.getElementById('sessionStartTime').value = '09:00';
    document.getElementById('sessionEndTime').value = '10:30';
  }
  
  // Set default attendance limit
  document.getElementById('attendanceLimitToggle').checked = true;
  document.getElementById('attendanceLimit').disabled = false;
  document.getElementById('attendanceLimit').value = '25';
  
  sidebar.classList.add('open');
  overlay.classList.add('show');
  document.body.style.overflow = 'hidden';
}

// Close session sidebar
function closeSessionSidebar() {
  const sidebar = document.getElementById('sessionSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  sidebar.classList.remove('open');
  overlay.classList.remove('show');
  document.body.style.overflow = '';
  document.getElementById('sessionForm').reset();
  document.getElementById('sessionForm').removeAttribute('data-session-id');
  document.getElementById('sidebarTitle').textContent = 'Create Session';
  selectedLocationType = null;
}

// Switch tabs
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tabName);
  });
  document.querySelectorAll('.tab-content').forEach(content => {
    content.classList.toggle('active', content.dataset.tab === tabName);
  });
}

// Update location fields based on type
function updateLocationFields(locationType) {
  const locationGroup = document.getElementById('locationFieldGroup');
  const zoomGroup = document.getElementById('zoomFieldGroup');
  
  if (locationType === 'on-field') {
    locationGroup.style.display = 'block';
    zoomGroup.style.display = 'none';
    document.getElementById('sessionLocation').required = true;
    document.getElementById('sessionZoomLink').required = false;
    document.getElementById('sessionZoomLink').value = '';
  } else if (locationType === 'virtual') {
    locationGroup.style.display = 'none';
    zoomGroup.style.display = 'block';
    document.getElementById('sessionLocation').required = false;
    document.getElementById('sessionZoomLink').required = true;
    document.getElementById('sessionLocation').value = '';
  }
}

// Load all coaches and populate dropdowns
async function loadCoachesIntoDropdowns() {
  if (!supabaseReady || !supabase) return;
  
  try {
    // Fetch all coaches from profiles table
    const { data: coaches, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('role', 'coach')
      .order('first_name', { ascending: true });
    
    if (error) {
      console.error('Error loading coaches:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      alert(`Error loading coaches: ${error.message}. Please make sure you've run the SQL policy: sql/fixes/allow-coaches-view-other-coaches.sql`);
      return;
    }
    
    console.log('Loaded coaches:', coaches?.length || 0, coaches);
    
    if (!coaches || coaches.length === 0) {
      console.warn('No coaches found. This might be an RLS policy issue.');
      console.warn('Make sure you have run: sql/fixes/allow-coaches-view-other-coaches.sql');
      console.warn('Or run: sql/fixes/fix-all-login-issues.sql (which includes the coach policy)');
    }
    
    // Get dropdown elements
    const mainCoachSelect = document.getElementById('mainCoach');
    const assistantCoachSelect = document.getElementById('assistantCoach');
    const goalkeeperCoachSelect = document.getElementById('goalkeeperCoach');
    
    // Clear existing options (except the first placeholder)
    if (mainCoachSelect) {
      mainCoachSelect.innerHTML = '<option value="">— Select Coach —</option>';
    }
    if (assistantCoachSelect) {
      assistantCoachSelect.innerHTML = '<option value="">— Assistant coach (optional) —</option>';
    }
    if (goalkeeperCoachSelect) {
      goalkeeperCoachSelect.innerHTML = '<option value="">— Goalkeeper coach (optional) —</option>';
    }
    
    // Populate dropdowns with coaches
    coaches?.forEach(coach => {
      const coachName = `${coach.first_name || ''} ${coach.last_name || ''}`.trim() || 'Coach';
      const option = document.createElement('option');
      option.value = coach.id;
      option.textContent = coachName;
      
      if (mainCoachSelect) mainCoachSelect.appendChild(option.cloneNode(true));
      if (assistantCoachSelect) assistantCoachSelect.appendChild(option.cloneNode(true));
      if (goalkeeperCoachSelect) goalkeeperCoachSelect.appendChild(option.cloneNode(true));
    });
  } catch (error) {
    console.error('Error loading coaches:', error);
  }
}

// Update session type options based on location type
function updateSessionTypeOptions(locationType) {
  const sessionTypeSelect = document.getElementById('sessionType');
  const onFieldOptions = ['Tec Tac', 'Speed Training', 'Strength & Conditioning'];
  const virtualOptions = [
    'Champions Player Progress (CPP)',
    'Group Film-Analysis',
    'Pro Player Stories (PPS)',
    'College Advising',
    'Psychologist',
    'Free Nutrition Consultation'
  ];
  
  // Clear existing options
  sessionTypeSelect.innerHTML = '<option value="">Select type</option>';
  
  // Add options based on location type
  const options = locationType === 'on-field' ? onFieldOptions : virtualOptions;
  options.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option;
    opt.textContent = option;
    sessionTypeSelect.appendChild(opt);
  });
}

// Handle form submission
async function handleFormSubmit(e) {
  e.preventDefault();
  
  if (!supabaseReady || !supabase) {
    alert('Supabase not ready. Please try again.');
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      alert('Not logged in');
      return;
    }

    const formData = new FormData(e.target);
    const startTime = formData.get('startTime');
    const endTime = formData.get('endTime');
    
    // Calculate duration
    const [startHours, startMinutes] = startTime.split(':').map(Number);
    const [endHours, endMinutes] = endTime.split(':').map(Number);
    const startTotal = startHours * 60 + startMinutes;
    const endTotal = endHours * 60 + endMinutes;
    let duration = endTotal - startTotal;
    if (duration < 0) duration += 24 * 60; // Handle next day

    // Get selected days for recurring sessions
    const selectedDays = Array.from(document.querySelectorAll('.day-btn.selected'))
      .map(btn => parseInt(btn.dataset.day));

    // Get selected coaches from dropdowns
    const mainCoachId = formData.get('mainCoach');
    console.log('Form submission - mainCoachId from form:', mainCoachId);
    if (!mainCoachId) {
      alert('Please select a main coach for this session.');
      return;
    }
    
    const assistantCoachId = formData.get('assistantCoach');
    const goalkeeperCoachId = formData.get('goalkeeperCoach');
    
    const assistantCoaches = assistantCoachId ? [assistantCoachId] : [];
    const goalkeeperCoaches = goalkeeperCoachId ? [goalkeeperCoachId] : [];

    // Get attendance limit - ensure it's a valid number > 0
    const attendanceLimitInput = formData.get('attendanceLimit');
    const attendanceLimit = attendanceLimitInput && attendanceLimitInput.trim() !== '' 
      ? parseInt(attendanceLimitInput) 
      : 25;
    
    if (attendanceLimit <= 0) {
      alert('Attendance limit must be greater than 0');
      return;
    }

    // Validate required fields
    if (!selectedLocationType) {
      alert('Please select a location type (on-field or virtual)');
      return;
    }

    const sessionData = {
      coach_id: mainCoachId, // Use selected coach from dropdown
      title: formData.get('sessionType'), // Use session_type as title for backwards compatibility
      session_type: formData.get('sessionType'),
      session_date: formData.get('sessionDate'),
      session_time: startTime,
      duration_minutes: duration,
      attendance_limit: attendanceLimit,
      location_type: selectedLocationType,
      location: selectedLocationType === 'on-field' ? (formData.get('location') || null) : null,
      zoom_link: selectedLocationType === 'virtual' ? (formData.get('zoomLink') || null) : null,
      description: formData.get('description') || null,
      assistant_coaches: assistantCoaches,
      goalkeeper_coaches: goalkeeperCoaches,
      status: 'scheduled'
    };

    // Debug: Log the session data and verify coach status
    console.log('Session data with coach_id:', sessionData);
    console.log('coach_id value:', sessionData.coach_id);
    console.log('User ID:', session.user.id);
    
    // Verify user is a coach using get_user_role function (bypasses RLS)
    const { data: userRole, error: roleError } = await supabase
      .rpc('get_user_role', { p_user_id: session.user.id });
    
    if (roleError) {
      console.error('Error checking user role:', roleError);
      // Fallback: try is_coach() function
      const { data: isCoach, error: coachCheckError } = await supabase.rpc('is_coach');
      if (coachCheckError) {
        console.error('Error checking coach status:', coachCheckError);
        alert('Could not verify coach status. Please try again.');
        return;
      }
      console.log('Is coach? (from is_coach function):', isCoach);
      if (!isCoach) {
        alert('You must be logged in as a coach to create sessions.');
        return;
      }
    } else {
      console.log('User role from get_user_role:', userRole);
      if (userRole !== 'coach') {
        alert(`You must be logged in as a coach to create sessions. Your role is: ${userRole || 'unknown'}`);
        return;
      }
    }

    // Check if this is an edit or create
    const sessionId = document.getElementById('sessionForm').dataset.sessionId;
    const isEdit = !!sessionId;

    // Handle recurring sessions (only for new sessions)
    const repeats = formData.get('repeats');
    if (!isEdit && (repeats === 'weekly' || repeats === 'daily' || repeats === 'monthly') && selectedDays.length > 0) {
      // Create multiple sessions for selected days
      const baseDate = new Date(sessionData.session_date);
      const sessionsToCreate = [];
      
      // Determine how many sessions to create based on repeats forever settings
      let maxWeeks = 12; // Default to 12 weeks
      let endDate = null;
      
      if (repeatsEndSettings.type === 'on-date' && repeatsEndSettings.endDate) {
        endDate = new Date(repeatsEndSettings.endDate);
      } else if (repeatsEndSettings.type === 'after' && repeatsEndSettings.occurrences) {
        maxWeeks = Math.ceil(repeatsEndSettings.occurrences / selectedDays.length);
      } else if (repeatsEndSettings.type === 'never') {
        maxWeeks = 52; // One year for "never"
      }
      
      let sessionCount = 0;
      const maxSessions = repeatsEndSettings.type === 'after' && repeatsEndSettings.occurrences 
        ? repeatsEndSettings.occurrences 
        : null;
      
      // Create sessions based on repeat pattern
      for (let week = 0; week < maxWeeks; week++) {
        selectedDays.forEach(day => {
          // Check if we've reached the max occurrences
          if (maxSessions && sessionCount >= maxSessions) {
            return;
          }
          
          const sessionDate = new Date(baseDate);
          if (repeats === 'weekly') {
            sessionDate.setDate(baseDate.getDate() + (week * 7) + (day - baseDate.getDay()));
          } else if (repeats === 'daily') {
            sessionDate.setDate(baseDate.getDate() + (week * 7) + day);
          } else if (repeats === 'monthly') {
            sessionDate.setMonth(baseDate.getMonth() + week);
            sessionDate.setDate(day + 1); // Adjust for day of week
          }
          
          // Check if we've passed the end date
          if (endDate && sessionDate > endDate) {
            return;
          }
          
          sessionsToCreate.push({
            ...sessionData,
            session_date: sessionDate.toISOString().split('T')[0]
          });
          
          sessionCount++;
        });
        
        // Break if we've reached max sessions or passed end date
        if (maxSessions && sessionCount >= maxSessions) {
          break;
        }
        if (endDate && new Date(baseDate.getTime() + (week + 1) * 7 * 24 * 60 * 60 * 1000) > endDate) {
          break;
        }
      }
      
      // Insert all sessions
      const { error } = await supabase
        .from('sessions')
        .insert(sessionsToCreate);
      
      if (error) throw error;
      alert(`Created ${sessionsToCreate.length} session(s) successfully!`);
    } else if (isEdit) {
      // Show confirmation modal for editing (only if recurring, otherwise update directly)
      const session = currentEditingSession || sessions.find(s => s.id === sessionId);
      if (session) {
        const isRecurring = await checkIfRecurringSession(session);
        if (isRecurring) {
          openEditSessionModal(sessionData, sessionId, false, false, true);
          return; // Don't close sidebar yet, wait for modal confirmation
        } else {
          // Single session - update directly
          // Clean up the data - only include valid database fields
          const updateData = {
            coach_id: sessionData.coach_id, // Include coach_id in update
            session_date: sessionData.session_date,
            session_time: sessionData.session_time,
            session_type: sessionData.session_type,
            duration_minutes: sessionData.duration_minutes,
            attendance_limit: sessionData.attendance_limit,
            location_type: sessionData.location_type,
            location: sessionData.location,
            zoom_link: sessionData.zoom_link,
            description: sessionData.description,
            assistant_coaches: sessionData.assistant_coaches || [],
            goalkeeper_coaches: sessionData.goalkeeper_coaches || [],
            status: sessionData.status || 'scheduled'
          };
          
          console.log('Single session update - updateData:', updateData);
          console.log('Single session update - coach_id:', updateData.coach_id);
          console.log('Single session update - sessionId:', sessionId);
          
          // Remove null/undefined values (but NEVER remove coach_id - it's required)
          const coachIdValue = updateData.coach_id; // Preserve coach_id
          Object.keys(updateData).forEach(key => {
            if (updateData[key] === null || updateData[key] === undefined) {
              delete updateData[key];
            }
          });
          // Always ensure coach_id is included
          if (coachIdValue) {
            updateData.coach_id = coachIdValue;
          }
          
          console.log('Single session update - updateData after cleanup:', updateData);
          console.log('Single session update - coach_id after cleanup:', updateData.coach_id);
          
          const { data: updateResult, error } = await supabase
            .from('sessions')
            .update(updateData)
            .eq('id', sessionId)
            .select('id, coach_id, session_type')
            .single();
          
          if (error) {
            console.error('❌ Update error:', error);
            console.error('❌ Update error details:', JSON.stringify(error, null, 2));
            throw error;
          }
          
          console.log('✅ Update response from Supabase:', updateResult);
          console.log('✅ Update successful - coach_id in response:', updateResult?.coach_id);
          console.log('✅ Expected coach_id:', updateData.coach_id);
          
          if (updateResult) {
            console.log('✅ Match:', updateResult.coach_id === updateData.coach_id);
            if (updateResult.coach_id !== updateData.coach_id) {
              console.error('❌ MISMATCH! Update did not persist correctly!');
            }
          }
          
          alert('Session updated successfully!');
          closeSessionSidebar();
          await loadSessions();
          renderSessionsOnCalendar();
          return;
        }
      }
    } else {
      // Single new session
      const { error } = await supabase
        .from('sessions')
        .insert([sessionData]);
      
      if (error) throw error;
      alert('Session created successfully!');
    }
    closeSessionSidebar();
    // Reload sessions and re-render calendar
    await loadSessions();
    renderSessionsOnCalendar();
  } catch (error) {
    console.error('Error creating session:', error);
    console.error('Error details:', {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint
    });
    
    let errorMessage = `Error creating session: ${error.message}`;
    if (error.code === '42501') {
      errorMessage += '\n\nThis is an RLS policy error. Please make sure you have run the fix-sessions-rls-policies.sql migration in Supabase.';
    }
    alert(errorMessage);
  }
}

// Repeats Forever Modal Functions
let repeatsEndSettings = {
  type: 'never', // 'never', 'on-date', 'after'
  endDate: null,
  occurrences: null
};

function openRepeatsForeverModal() {
  const modal = document.getElementById('repeatsForeverModal');
  
  // Set current values based on saved settings
  const neverRadio = document.querySelector('input[name="repeatsEnd"][value="never"]');
  const onDateRadio = document.querySelector('input[name="repeatsEnd"][value="on-date"]');
  const afterRadio = document.querySelector('input[name="repeatsEnd"][value="after"]');
  
  if (repeatsEndSettings.type === 'on-date') {
    onDateRadio.checked = true;
    if (repeatsEndSettings.endDate) {
      document.getElementById('repeatsEndDate').value = repeatsEndSettings.endDate;
    }
  } else if (repeatsEndSettings.type === 'after') {
    afterRadio.checked = true;
    if (repeatsEndSettings.occurrences) {
      document.getElementById('repeatsOccurrences').value = repeatsEndSettings.occurrences;
    }
  } else {
    neverRadio.checked = true;
  }
  
  updateRepeatsForeverInputs();
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

function closeRepeatsForeverModal() {
  const modal = document.getElementById('repeatsForeverModal');
  modal.classList.remove('show');
  document.body.style.overflow = '';
}

function updateRepeatsForeverInputs() {
  const selectedValue = document.querySelector('input[name="repeatsEnd"]:checked')?.value;
  const onDateInput = document.getElementById('onDateInput');
  const afterInput = document.getElementById('afterInput');
  
  if (selectedValue === 'on-date') {
    onDateInput.style.display = 'block';
    afterInput.style.display = 'none';
  } else if (selectedValue === 'after') {
    onDateInput.style.display = 'none';
    afterInput.style.display = 'block';
  } else {
    onDateInput.style.display = 'none';
    afterInput.style.display = 'none';
  }
}

function saveRepeatsForeverSettings() {
  const selectedValue = document.querySelector('input[name="repeatsEnd"]:checked')?.value;
  const repeatsForeverBtn = document.getElementById('repeatsForeverBtn');
  
  repeatsEndSettings.type = selectedValue || 'never';
  
  if (selectedValue === 'on-date') {
    const endDate = document.getElementById('repeatsEndDate').value;
    repeatsEndSettings.endDate = endDate;
    repeatsEndSettings.occurrences = null;
    
    // Format date for display (e.g., "12/25/2025")
    if (endDate) {
      const dateObj = new Date(endDate);
      const formattedDate = dateObj.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      repeatsForeverBtn.textContent = `Class ends on ${formattedDate}`;
    } else {
      repeatsForeverBtn.textContent = 'Repeats forever';
    }
  } else if (selectedValue === 'after') {
    const occurrences = parseInt(document.getElementById('repeatsOccurrences').value);
    repeatsEndSettings.occurrences = occurrences || null;
    repeatsEndSettings.endDate = null;
    
    if (occurrences) {
      repeatsForeverBtn.textContent = `Class ends after ${occurrences} ${occurrences === 1 ? 'occurrence' : 'occurrences'}`;
    } else {
      repeatsForeverBtn.textContent = 'Repeats forever';
    }
  } else {
    repeatsEndSettings.endDate = null;
    repeatsEndSettings.occurrences = null;
    repeatsForeverBtn.textContent = 'Repeats forever';
  }
  
      console.log('Repeats forever settings saved:', repeatsEndSettings);
      closeRepeatsForeverModal();
}

// Edit Session Modal Functions
let pendingEditData = null;
let pendingEditSessionId = null;

function closeEditSessionModal() {
  const modal = document.getElementById('editSessionModal');
  modal.classList.remove('show');
  document.body.style.overflow = '';
  pendingEditData = null;
  pendingEditSessionId = null;
}

async function saveEditSession() {
  if (!pendingEditData || !pendingEditSessionId) {
    console.error('No pending edit data or session ID');
    return;
  }
  
  const selectedScope = document.querySelector('input[name="editScope"]:checked')?.value;
  const isDelete = pendingEditData._delete === true;
  
  console.log('Saving edit session:', { selectedScope, isDelete, pendingEditSessionId });
  console.log('pendingEditData.coach_id:', pendingEditData.coach_id);
  
  try {
    if (isDelete) {
      // Handle delete
      if (selectedScope === 'this-session') {
        // Delete only this session
        console.log('Deleting session:', pendingEditSessionId);
        const { data, error } = await supabase
          .from('sessions')
          .delete()
          .eq('id', pendingEditSessionId)
          .select();
        
        if (error) {
          console.error('Delete error:', error);
          alert(`Error deleting session: ${error.message}`);
          throw error;
        }
        
        console.log('Delete result:', data);
        alert('Session deleted successfully!');
      } else if (selectedScope === 'all-day-sessions') {
        // Delete this session and all sessions on the same day of week
        const { data: { session } } = await supabase.auth.getSession();
        const sessionToDelete = currentEditingSession || sessions.find(s => s.id === pendingEditSessionId);
        
        if (!sessionToDelete) {
          console.error('Session not found for delete');
          throw new Error('Session not found');
        }
        
        console.log('Deleting session and all day sessions:', sessionToDelete);
        
        const sessionDate = new Date(sessionToDelete.session_date);
        const dayOfWeek = sessionDate.getDay();
        
        // First delete the current session
        const { error: currentError } = await supabase
          .from('sessions')
          .delete()
          .eq('id', pendingEditSessionId);
        
        if (currentError) {
          console.error('Error deleting current session:', currentError);
          throw currentError;
        }
        
        // Find and delete all other sessions on the same day of week with same type and time
        const { data: allSessions, error: fetchError } = await supabase
          .from('sessions')
          .select('id, session_date, session_time, session_type')
          .eq('coach_id', session.user.id)
          .eq('session_type', sessionToDelete.session_type)
          .eq('session_time', sessionToDelete.session_time);
        
        if (fetchError) {
          console.error('Error fetching sessions to delete:', fetchError);
          throw fetchError;
        }
        
        // Filter sessions that fall on the same day of week
        const sessionsToDelete = allSessions.filter(s => {
          const sDate = new Date(s.session_date);
          return sDate.getDay() === dayOfWeek && s.id !== pendingEditSessionId;
        });
        
        console.log('Sessions to delete:', sessionsToDelete.length);
        
        if (sessionsToDelete.length > 0) {
          const sessionIds = sessionsToDelete.map(s => s.id);
          const { error: deleteError } = await supabase
            .from('sessions')
            .delete()
            .in('id', sessionIds);
          
          if (deleteError) {
            console.error('Error deleting multiple sessions:', deleteError);
            throw deleteError;
          }
        }
        
        alert(`Deleted ${sessionsToDelete.length + 1} session(s) successfully!`);
      }
      
      closeEditSessionModal();
      closeSessionSidebar();
      
      // Clear current editing session
      currentEditingSession = null;
      
      // Wait a moment for database to update
      await new Promise(resolve => setTimeout(resolve, 500));
      
      await loadSessions();
      renderSessionsOnCalendar();
      return;
    }
    
    // Handle update/edit
    if (selectedScope === 'this-session') {
      // Update only this session
      // Clean up the data - only include valid database fields
      const updateData = {
        coach_id: pendingEditData.coach_id, // Include coach_id in update
        session_date: pendingEditData.session_date,
        session_time: pendingEditData.session_time,
        session_type: pendingEditData.session_type,
        duration_minutes: pendingEditData.duration_minutes,
        attendance_limit: pendingEditData.attendance_limit,
        location_type: pendingEditData.location_type,
        location: pendingEditData.location,
        zoom_link: pendingEditData.zoom_link,
        description: pendingEditData.description,
        assistant_coaches: pendingEditData.assistant_coaches || [],
        goalkeeper_coaches: pendingEditData.goalkeeper_coaches || [],
        status: pendingEditData.status || 'scheduled'
      };
      
      console.log('This session update - updateData:', updateData);
      console.log('This session update - coach_id:', updateData.coach_id);
      
      // Remove null/undefined values (but NEVER remove coach_id - it's required)
      const coachIdValue = updateData.coach_id; // Preserve coach_id
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === null || updateData[key] === undefined) {
          delete updateData[key];
        }
      });
      // Always ensure coach_id is included
      if (coachIdValue) {
        updateData.coach_id = coachIdValue;
      }
      
      console.log('This session update - updateData after cleanup:', updateData);
      
      const { error } = await supabase
        .from('sessions')
        .update(updateData)
        .eq('id', pendingEditSessionId);
      
      if (error) {
        console.error('This session update error:', error);
      } else {
        console.log('This session update successful - coach_id should now be:', updateData.coach_id);
      }
      
      if (error) {
        console.error('Update error details:', error);
        throw error;
      }
      alert('Session updated successfully!');
    } else if (selectedScope === 'all-day-sessions') {
      // Update this session and all sessions on the same day of week
      // Use original date if this was a drag operation
      const dateToUse = pendingEditData.originalDate || pendingEditData.session_date;
      const sessionDate = new Date(dateToUse);
      const dayOfWeek = sessionDate.getDay();
      
      // Calculate the day offset if this was a drag operation (moving to different day)
      const isDragOperation = !!pendingEditData.originalDate;
      let dayOffset = 0;
      if (isDragOperation) {
        const originalDate = new Date(pendingEditData.originalDate);
        const newDate = new Date(pendingEditData.session_date);
        
        // Calculate the actual date difference (not just day of week)
        // This ensures we move forward or backward correctly
        const dateDiff = Math.round((newDate - originalDate) / (1000 * 60 * 60 * 24));
        dayOffset = dateDiff;
        
        console.log('Day offset calculation:', {
          originalDate: originalDate.toISOString().split('T')[0],
          newDate: newDate.toISOString().split('T')[0],
          dateDiff,
          dayOffset
        });
      }
      
      // First update the current session
      // Clean up the data - only include valid database fields
      const currentUpdateData = {
        coach_id: pendingEditData.coach_id, // Include coach_id in update
        session_date: pendingEditData.session_date,
        session_time: pendingEditData.session_time,
        session_type: pendingEditData.session_type,
        duration_minutes: pendingEditData.duration_minutes,
        attendance_limit: pendingEditData.attendance_limit,
        location_type: pendingEditData.location_type,
        location: pendingEditData.location,
        zoom_link: pendingEditData.zoom_link,
        description: pendingEditData.description,
        assistant_coaches: pendingEditData.assistant_coaches || [],
        goalkeeper_coaches: pendingEditData.goalkeeper_coaches || [],
        status: pendingEditData.status || 'scheduled'
      };
      
      console.log('All day sessions update - currentUpdateData:', currentUpdateData);
      console.log('All day sessions update - coach_id:', currentUpdateData.coach_id);
      
      // Remove null/undefined values (but NEVER remove coach_id - it's required)
      const coachIdValue = currentUpdateData.coach_id; // Preserve coach_id
      Object.keys(currentUpdateData).forEach(key => {
        if (currentUpdateData[key] === null || currentUpdateData[key] === undefined) {
          delete currentUpdateData[key];
        }
      });
      // Always ensure coach_id is included
      if (coachIdValue) {
        currentUpdateData.coach_id = coachIdValue;
      }
      
      console.log('All day sessions update - currentUpdateData after cleanup:', currentUpdateData);
      
      const { error: currentError } = await supabase
        .from('sessions')
        .update(currentUpdateData)
        .eq('id', pendingEditSessionId);
      
      if (currentError) {
        console.error('Current session update error:', currentError);
      } else {
        console.log('Current session update successful - coach_id should now be:', currentUpdateData.coach_id);
      }
      
      if (currentError) {
        console.error('Current session update error:', currentError);
        throw currentError;
      }
      
      // Note: The duplicate check above was removed - error is already checked
      
      // Then find and update all other sessions on the same day of week with same time and type
      const { data: { session } } = await supabase.auth.getSession();
      const originalSession = currentEditingSession || sessions.find(s => s.id === pendingEditSessionId);
      
      // Use original date/time if this was a drag operation
      const originalDate = pendingEditData.originalDate || originalSession.session_date;
      const originalTime = pendingEditData.originalTime || originalSession.session_time;
      const originalDateObj = new Date(originalDate);
      const originalDayOfWeek = originalDateObj.getDay();
      
      const { data: allSessions, error: fetchError } = await supabase
        .from('sessions')
        .select('id, session_date, session_time, session_type')
        .eq('coach_id', session.user.id)
        .eq('session_type', originalSession.session_type)
        .eq('session_time', originalTime);
      
      if (fetchError) throw fetchError;
      
      // Filter sessions that fall on the same day of week (use original day for recurring)
      const sessionsToUpdate = allSessions.filter(s => {
        const sDate = new Date(s.session_date);
        return sDate.getDay() === originalDayOfWeek && s.id !== pendingEditSessionId;
      });
      
      console.log('Sessions to update:', sessionsToUpdate.length, 'Day offset:', dayOffset);
      
      if (sessionsToUpdate.length > 0) {
        // Update all matching sessions
        // If drag operation, also update their dates by the same day offset
        const updates = {
          coach_id: pendingEditData.coach_id, // Include coach_id in update
          session_time: pendingEditData.session_time,
          duration_minutes: pendingEditData.duration_minutes,
          attendance_limit: pendingEditData.attendance_limit,
          location_type: pendingEditData.location_type,
          location: pendingEditData.location,
          zoom_link: pendingEditData.zoom_link,
          description: pendingEditData.description,
          assistant_coaches: pendingEditData.assistant_coaches || [],
          goalkeeper_coaches: pendingEditData.goalkeeper_coaches || [],
          status: pendingEditData.status || 'scheduled'
        };
        
        console.log('All day sessions - updates object:', updates);
        console.log('All day sessions - coach_id:', updates.coach_id);
        
        // If this was a drag operation, update dates too
        if (isDragOperation && dayOffset !== 0) {
          // Update each session's date by the day offset
          // The offset is the actual date difference, so we apply it directly
          const updatePromises = sessionsToUpdate.map(async (s) => {
            const sDate = new Date(s.session_date);
            const originalSDate = new Date(s.session_date); // Keep original for logging
            sDate.setDate(sDate.getDate() + dayOffset);
            
            console.log('Updating session date:', {
              sessionId: s.id,
              originalDate: originalSDate.toISOString().split('T')[0],
              newDate: sDate.toISOString().split('T')[0],
              offset: dayOffset
            });
            
            const dateUpdate = {
              ...updates,
              session_date: sDate.toISOString().split('T')[0]
            };
            
            // Remove null/undefined values (but NEVER remove coach_id - it's required)
            const coachIdValue = dateUpdate.coach_id; // Preserve coach_id
            Object.keys(dateUpdate).forEach(key => {
              if (dateUpdate[key] === null || dateUpdate[key] === undefined) {
                delete dateUpdate[key];
              }
            });
            // Always ensure coach_id is included
            if (coachIdValue) {
              dateUpdate.coach_id = coachIdValue;
            }
            
            return supabase
              .from('sessions')
              .update(dateUpdate)
              .eq('id', s.id);
          });
          
          const results = await Promise.all(updatePromises);
          const errors = results.filter(r => r.error);
          if (errors.length > 0) {
            console.error('Bulk update errors:', errors);
            throw errors[0].error;
          }
        } else {
          // Regular update (no date change)
          // Remove null/undefined values (but NEVER remove coach_id - it's required)
          const coachIdValue = updates.coach_id; // Preserve coach_id
          Object.keys(updates).forEach(key => {
            if (updates[key] === null || updates[key] === undefined) {
              delete updates[key];
            }
          });
          // Always ensure coach_id is included
          if (coachIdValue) {
            updates.coach_id = coachIdValue;
          }
          
          console.log('All day sessions - updates after cleanup:', updates);
          console.log('All day sessions - coach_id after cleanup:', updates.coach_id);
          
          const sessionIds = sessionsToUpdate.map(s => s.id);
          const { error: updateError } = await supabase
            .from('sessions')
            .update(updates)
            .in('id', sessionIds);
          
          if (updateError) {
            console.error('Bulk update error:', updateError);
            throw updateError;
          }
        }
      }
      
      alert(`Updated ${sessionsToUpdate.length + 1} session(s) successfully!`);
    }
    
    closeEditSessionModal();
    closeSessionSidebar();
    await loadSessions();
    renderSessionsOnCalendar();
  } catch (error) {
    console.error('Error updating session:', error);
    alert(`Error updating session: ${error.message}`);
  }
}

// Handle session drop (drag and drop)
async function handleSessionDrop(session, newDate, newTime) {
  // Check if this is part of a recurring series FIRST
  const isRecurring = await checkIfRecurringSession(session);
  
  // If single session, move directly without modal
  if (!isRecurring) {
    try {
      const updateData = {
        session_date: newDate,
        session_time: newTime
      };
      
      const { error } = await supabase
        .from('sessions')
        .update(updateData)
        .eq('id', session.id);
      
      if (error) {
        console.error('Error moving session:', error);
        alert(`Error moving session: ${error.message}`);
        return;
      }
      
      // Reload and re-render
      await loadSessions();
      renderSessionsOnCalendar();
      return;
    } catch (error) {
      console.error('Error moving single session:', error);
      alert(`Error moving session: ${error.message}`);
      return;
    }
  }
  
  // For recurring sessions, show modal
  // Create updated session data with new date/time
  const updatedSessionData = {
    coach_id: session.coach_id, // Preserve coach_id when dragging
    session_date: newDate,
    session_time: newTime,
    session_type: session.session_type,
    duration_minutes: session.duration_minutes,
    attendance_limit: session.attendance_limit,
    location_type: session.location_type,
    location: session.location,
    zoom_link: session.zoom_link,
    description: session.description,
    assistant_coaches: session.assistant_coaches,
    goalkeeper_coaches: session.goalkeeper_coaches,
    status: session.status,
    originalDate: session.originalDate || session.session_date, // Keep original date for day name
    originalTime: session.originalTime || session.session_time
  };

  // Show edit modal with new date/time
  openEditSessionModal(updatedSessionData, session.id, true, false, true);
}

// Handle delete session
function handleDeleteSession() {
  if (!currentEditingSession) {
    console.error('No session to delete');
    return;
  }
  console.log('Opening delete modal for session:', currentEditingSession.id);
  openEditSessionModal({ _delete: true }, currentEditingSession.id, false, true);
}

// Check if a session is part of a recurring series
async function checkIfRecurringSession(session) {
  try {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession || !authSession.user) return false;

    // Find sessions with same type, time, and day of week
    const sessionDate = new Date(session.session_date);
    const dayOfWeek = sessionDate.getDay();
    
    const { data: similarSessions, error } = await supabase
      .from('sessions')
      .select('id, session_date, session_time, session_type')
      .eq('coach_id', authSession.user.id)
      .eq('session_type', session.session_type)
      .eq('session_time', session.session_time);
    
    if (error) {
      console.error('Error checking recurring sessions:', error);
      return false;
    }
    
    // Check if there are other sessions on the same day of week
    const recurringSessions = similarSessions.filter(s => {
      const sDate = new Date(s.session_date);
      return sDate.getDay() === dayOfWeek && s.id !== session.id;
    });
    
    return recurringSessions.length > 0;
  } catch (error) {
    console.error('Error checking recurring sessions:', error);
    return false;
  }
}

// Get all recurring session dates for a given session
async function getRecurringSessionDates(sessionId, originalDate) {
  try {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession || !authSession.user) return [];

    const session = currentEditingSession || sessions.find(s => s.id === sessionId);
    if (!session) return [];

    const originalDateObj = new Date(originalDate);
    const dayOfWeek = originalDateObj.getDay();
    
    const { data: allSessions, error } = await supabase
      .from('sessions')
      .select('id, session_date, session_time, session_type')
      .eq('coach_id', authSession.user.id)
      .eq('session_type', session.session_type)
      .eq('session_time', session.session_time)
      .order('session_date', { ascending: true });
    
    if (error) {
      console.error('Error fetching recurring sessions:', error);
      return [];
    }
    
    // Filter sessions that fall on the same day of week
    const recurringSessions = allSessions.filter(s => {
      const sDate = new Date(s.session_date);
      return sDate.getDay() === dayOfWeek;
    });
    
    return recurringSessions.map(s => s.session_date).sort();
  } catch (error) {
    console.error('Error getting recurring dates:', error);
    return [];
  }
}

// Update the recurring dates list in the modal
async function updateRecurringDatesList(sessionId, originalDate) {
  const datesList = document.getElementById('recurringDatesList');
  const dates = await getRecurringSessionDates(sessionId, originalDate);
  
  if (dates.length > 0) {
    // Format dates as "10/1, 10/8, 10/15..."
    const formattedDates = dates.map(date => {
      const d = new Date(date);
      return `${d.getMonth() + 1}/${d.getDate()}`;
    }).join(', ');
    
    datesList.textContent = formattedDates;
    datesList.style.display = 'block';
  } else {
    datesList.style.display = 'none';
  }
}

// Open edit session modal (handles edit, drop, and delete modes)
async function openEditSessionModal(sessionData, sessionId, isDrop = false, isDelete = false, isRecurring = null) {
  console.log('openEditSessionModal - sessionData:', sessionData);
  console.log('openEditSessionModal - coach_id:', sessionData.coach_id);
  pendingEditData = sessionData;
  pendingEditSessionId = sessionId;
  
  const modal = document.getElementById('editSessionModal');
  const modalTitle = modal.querySelector('h3');
  const saveBtn = document.getElementById('editSessionSave');
  
  // Check if recurring (if not already provided)
  if (isRecurring === null && !isDelete) {
    const session = currentEditingSession || sessions.find(s => s.id === sessionId);
    if (session) {
      isRecurring = await checkIfRecurringSession(session);
    }
  }
  
  // If single session and not delete, skip modal and update directly
  if (!isRecurring && !isDelete && !isDrop) {
    // Single session edit - update directly without modal
    try {
      // Clean up the data - only include valid database fields
      const updateData = {
        coach_id: sessionData.coach_id, // Include coach_id in update
        session_date: sessionData.session_date,
        session_time: sessionData.session_time,
        session_type: sessionData.session_type,
        duration_minutes: sessionData.duration_minutes,
        attendance_limit: sessionData.attendance_limit,
        location_type: sessionData.location_type,
        location: sessionData.location,
        zoom_link: sessionData.zoom_link,
        description: sessionData.description,
        assistant_coaches: sessionData.assistant_coaches || [],
        goalkeeper_coaches: sessionData.goalkeeper_coaches || [],
        status: sessionData.status || 'scheduled'
      };
      
      // Remove null/undefined values
      Object.keys(updateData).forEach(key => {
        if (updateData[key] === null || updateData[key] === undefined) {
          delete updateData[key];
        }
      });
      
      const { error } = await supabase
        .from('sessions')
        .update(updateData)
        .eq('id', sessionId);
      
      if (error) {
        console.error('Direct update error:', error);
        throw error;
      }
      
      alert('Session updated successfully!');
      closeSessionSidebar();
      await loadSessions();
      renderSessionsOnCalendar();
      return;
    } catch (error) {
      console.error('Error updating session:', error);
      alert(`Error updating session: ${error.message}`);
      return;
    }
  }
  
  if (isDelete) {
    modalTitle.textContent = 'Delete Session';
    saveBtn.textContent = 'Delete';
    saveBtn.classList.add('delete-btn');
    
    // Get session data for delete
    const sessionForDelete = currentEditingSession || sessions.find(s => s.id === sessionId);
    if (!sessionForDelete) {
      console.error('Session not found for delete');
      return;
    }
    
    const sessionDate = new Date(sessionForDelete.session_date);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[sessionDate.getDay()];
    
    document.getElementById('editSessionInfo').textContent = 
      `Delete this session (${sessionForDelete.session_type} on ${dayName}, ${sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })})`;
    document.getElementById('thisSessionLabel').textContent = 'Delete this session';
    document.getElementById('allDaySessionsLabel').textContent = `Delete this and all ${dayName} sessions`;
    document.getElementById('recurringDatesList').style.display = 'none';
  } else {
    modalTitle.textContent = isDrop ? 'Move Session' : 'Edit Session';
    saveBtn.textContent = 'Save';
    saveBtn.classList.remove('delete-btn');
    
    // For drag and drop, always use the ORIGINAL date to determine the day name
    // This ensures we show the correct day (e.g., Friday) even if dropped on a different day
    let dateToUse;
    if (isDrop && sessionData.originalDate) {
      dateToUse = sessionData.originalDate;
    } else if (isDrop && currentEditingSession) {
      dateToUse = currentEditingSession.session_date;
    } else {
      dateToUse = sessionData.session_date || currentEditingSession?.session_date;
    }
    
    const sessionDate = new Date(dateToUse);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const dayName = dayNames[sessionDate.getDay()];
    
    const timeString = new Date(`2000-01-01T${sessionData.session_time || currentEditingSession?.session_time}`).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
    
    const actionText = isDrop ? 'Move' : 'Edit';
    const displayDate = sessionDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    
    document.getElementById('editSessionInfo').textContent = 
      `${actionText} only this session (${timeString} ${sessionData.session_type || currentEditingSession?.session_type} on ${dayName}, ${displayDate})`;
    document.getElementById('thisSessionLabel').textContent = isDrop ? 'Move this session' : 'This session';
    
    // Update recurring sessions label and dates list
    const allDayLabel = document.getElementById('allDaySessionsLabel');
    const datesList = document.getElementById('recurringDatesList');
    
    if (isDrop) {
      allDayLabel.textContent = 'Move this and all recurring sessions';
      // Show dates list for recurring sessions
      const originalDate = sessionData.originalDate || currentEditingSession?.session_date || sessionData.session_date;
      await updateRecurringDatesList(sessionId, originalDate);
    } else {
      allDayLabel.textContent = `This and all ${dayName} sessions`;
      datesList.style.display = 'none';
    }
  }
  
  // Reset to "This session" option
  document.querySelector('input[name="editScope"][value="this-session"]').checked = true;
  
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

// Edit session
let currentEditingSession = null;

function editSession(session) {
  console.log('Editing session:', session);
  console.log('Editing session - current coach_id:', session.coach_id);
  currentEditingSession = session;
  selectedLocationType = session.location_type;
  
  // Update sidebar title
  document.getElementById('sidebarTitle').textContent = 'Edit Session';
  
  // Show delete button
  document.getElementById('sidebarDelete').style.display = 'block';
  
  // Populate form with session data
  document.getElementById('sessionType').value = session.session_type;
  document.getElementById('sessionDate').value = session.session_date; // Date is now editable
  
  // Parse and set times
  const [hours, minutes] = session.session_time.split(':');
  document.getElementById('sessionStartTime').value = session.session_time;
  
  // Calculate end time from duration
  const endTime = new Date();
  endTime.setHours(parseInt(hours), parseInt(minutes));
  endTime.setMinutes(endTime.getMinutes() + session.duration_minutes);
  document.getElementById('sessionEndTime').value = 
    `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`;
  
  // Set location fields
  if (session.location_type === 'on-field') {
    document.getElementById('sessionLocation').value = session.location || '';
  } else {
    document.getElementById('sessionZoomLink').value = session.zoom_link || '';
  }
  
  // Set attendance limit
  if (session.attendance_limit) {
    document.getElementById('attendanceLimitToggle').checked = true;
    document.getElementById('attendanceLimit').disabled = false;
    document.getElementById('attendanceLimit').value = session.attendance_limit;
  }
  
  // Set description
  document.getElementById('sessionDescription').value = session.description || '';
  
  // Update location fields visibility
  updateLocationFields(session.location_type);
  
  // Load coaches and set selected values
  loadCoachesIntoDropdowns().then(() => {
    // Set selected coach values after dropdowns are populated
    if (session.coach_id) {
      document.getElementById('mainCoach').value = session.coach_id;
    }
    if (session.assistant_coaches && session.assistant_coaches.length > 0) {
      document.getElementById('assistantCoach').value = session.assistant_coaches[0];
    }
    if (session.goalkeeper_coaches && session.goalkeeper_coaches.length > 0) {
      document.getElementById('goalkeeperCoach').value = session.goalkeeper_coaches[0];
    }
  });
  
  // Store session ID for update
  document.getElementById('sessionForm').dataset.sessionId = session.id;
  
  // Check if this is an individual session and show appropriate interface
  if (INDIVIDUAL_SESSION_TYPES.includes(session.session_type) && session.location_type === 'virtual') {
    showIndividualSessionConfig(session.session_type, session.id);
  } else {
    // Open sidebar for regular sessions
    const sidebar = document.getElementById('sessionSidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.add('open');
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

// Handle session type change in form
async function handleSessionTypeChange(selectedType) {
  // Only show individual session config if:
  // 1. Virtual location type is selected
  // 2. An individual session type is selected
  // 3. We're creating a new session (not editing)
  if (selectedLocationType === 'virtual' && INDIVIDUAL_SESSION_TYPES.includes(selectedType)) {
    const sessionId = document.getElementById('sessionForm').dataset.sessionId;
    if (!sessionId) {
      // New session - show individual session configuration
      showIndividualSessionConfig(selectedType);
    }
  } else {
    // Hide individual session config if switching away
    hideIndividualSessionConfig();
  }
}

// Show individual session configuration interface
async function showIndividualSessionConfig(sessionType, sessionId = null, existingData = null) {
  // Hide the regular sidebar
  const sidebar = document.getElementById('sessionSidebar');
  const overlay = document.getElementById('sidebarOverlay');
  if (sidebar) sidebar.classList.remove('open');
  if (overlay) overlay.classList.remove('show');
  
  // Create or show individual session config container
  let configContainer = document.getElementById('individualSessionConfig');
  if (!configContainer) {
    configContainer = document.createElement('div');
    configContainer.id = 'individualSessionConfig';
    configContainer.className = 'individual-session-config';
    document.body.appendChild(configContainer);
  }
  
  configContainer.style.display = 'block';
  await renderIndividualSessionConfig(sessionType, sessionId, configContainer, existingData);
}

// Hide individual session configuration interface
function hideIndividualSessionConfig() {
  const configContainer = document.getElementById('individualSessionConfig');
  if (configContainer) {
    configContainer.style.display = 'none';
  }
}

// Render individual session configuration interface
async function renderIndividualSessionConfig(sessionType, sessionId, container, existingData = null) {
  if (!supabaseReady || !supabase) return;
  
  try {
    // Use existing data if provided (for editing from table)
    let sessionTypeData = existingData;
    
    // If editing by ID, load by ID
    if (!sessionTypeData && sessionId) {
      const { data: existingType, error: fetchError } = await supabase
        .from('individual_session_types')
        .select('*')
        .eq('id', sessionId)
        .single();
      
      if (!fetchError && existingType) {
        sessionTypeData = existingType;
        sessionType = existingType.name; // Update sessionType for display
      }
    }
    
    // Only try to load from database by name if we have existingData or sessionId
    // (i.e., we're editing, not creating new)
    if (!sessionTypeData && sessionType && (existingData || sessionId)) {
      const { data: existingType, error: fetchError } = await supabase
        .from('individual_session_types')
        .select('*')
        .eq('name', sessionType)
        .single();
      
      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error fetching session type:', fetchError);
      } else if (existingType) {
        sessionTypeData = existingType;
      }
    }
    
    // Render the configuration interface with tabs
    container.innerHTML = `
      <div class="config-overlay"></div>
      <div class="config-panel" data-session-type-id="${sessionTypeData?.id || sessionId || ''}">
        <div class="config-header">
          <h2>Appointment type</h2>
          <div class="config-header-actions">
            <button class="config-close-btn" id="configCloseBtn" type="button">Close</button>
            <button class="config-save-btn" id="configSaveBtn" type="button">Save</button>
          </div>
        </div>
        
        <div class="config-tabs">
          <button class="config-tab-btn active" data-tab="details">Details</button>
          <button class="config-tab-btn" data-tab="settings">Settings</button>
          <button class="config-tab-btn" data-tab="notifications">Notifications</button>
        </div>
        
        <div class="config-content">
          <!-- Details Tab -->
          <div class="config-tab-content active" data-tab="details">
            <div class="config-form-group">
              <label for="configName">Name</label>
              <input type="text" id="configName" value="${sessionTypeData?.display_name || sessionType}" />
            </div>
            
            <div class="config-form-group">
              <label for="configColor">Color</label>
              <div class="color-picker">
                <input type="color" id="configColor" value="${sessionTypeData?.color || '#7ed321'}" />
                <span class="color-value">${sessionTypeData?.color || '#7ed321'}</span>
              </div>
            </div>
            
            <div class="config-form-group">
              <label for="configDuration">Duration</label>
              <div class="duration-input">
                <input type="number" id="configDuration" value="${sessionTypeData?.duration_minutes || 20}" min="1" />
                <span>minutes</span>
              </div>
            </div>
            
            <div class="config-form-group">
              <label>Staff</label>
              <p class="config-hint">Set who appointments can be booked with</p>
              <div class="staff-tags" id="configStaffTags">
                <!-- Staff will be loaded here -->
              </div>
              <button type="button" class="add-staff-btn" id="addStaffBtn">+ Add staff</button>
            </div>
            
            <div class="config-form-group">
              <label>General availability</label>
              <p class="config-hint">Set when appointments should be regularly available</p>
              <div class="availability-schedule" id="configAvailabilitySchedule">
                <!-- Availability will be rendered here -->
              </div>
            </div>
            
            <div class="config-form-group">
              <label>Booking Link</label>
              <p class="config-hint">Players and parents can book this session type from the Schedule page</p>
              <div class="booking-link-info">
                <a href="#" class="booking-link-preview" onclick="return false;" style="color: var(--accent); text-decoration: underline; cursor: default;">
                  Schedule → Virtual → ${sessionTypeData?.display_name || sessionType}
                </a>
              </div>
            </div>
          </div>
          
          <!-- Settings Tab -->
          <div class="config-tab-content" data-tab="settings">
            <div class="config-section">
              <h3>Player/Parent Info</h3>
              
              <div class="config-form-group">
                <label for="configZoomLink">Zoom Link</label>
                <input type="url" id="configZoomLink" name="zoomLink" placeholder="Zoom Link (https://zoom.us/j/...)" value="${sessionTypeData?.zoom_link || ''}">
                <p class="config-hint" style="margin-top: 4px; font-size: 0.85rem; color: var(--muted);">
                  Add the Zoom meeting link. Players and parents will be able to click this link to join the session.
                </p>
              </div>
              
              <div class="config-form-group">
                <label for="configDescription">Description / Session Plan</label>
                <textarea id="configDescription" name="description" rows="6" placeholder="Enter session description and plan...">${sessionTypeData?.description || ''}</textarea>
                <p class="config-hint" style="margin-top: 4px; font-size: 0.85rem; color: var(--muted);">
                  Include Meeting ID and Passcode here if needed for the Zoom session.
                </p>
              </div>
            </div>

            <div class="config-section">
              <h3>Adjusted availability</h3>
              <p class="config-hint">Limit the time slots clients can select when they are self-booking</p>
              
              <div class="config-form-group">
                <label for="configMinBookingNotice" class="required">Minimum booking notice</label>
                <select id="configMinBookingNotice">
                  <option value="1" ${sessionTypeData?.minimum_booking_notice_hours === 1 ? 'selected' : ''}>1 hour before</option>
                  <option value="2" ${sessionTypeData?.minimum_booking_notice_hours === 2 ? 'selected' : ''}>2 hours before</option>
                  <option value="4" ${sessionTypeData?.minimum_booking_notice_hours === 4 ? 'selected' : ''}>4 hours before</option>
                  <option value="8" ${sessionTypeData?.minimum_booking_notice_hours === 8 || !sessionTypeData ? 'selected' : ''}>8 hours before</option>
                  <option value="24" ${sessionTypeData?.minimum_booking_notice_hours === 24 ? 'selected' : ''}>1 day before</option>
                </select>
              </div>
              
              <div class="config-form-group">
                <label for="configBufferBefore" class="required">Buffer before appointment</label>
                <select id="configBufferBefore">
                  <option value="0" ${sessionTypeData?.buffer_before_minutes === 0 || !sessionTypeData ? 'selected' : ''}>No buffer</option>
                  <option value="5" ${sessionTypeData?.buffer_before_minutes === 5 ? 'selected' : ''}>5 minutes</option>
                  <option value="10" ${sessionTypeData?.buffer_before_minutes === 10 ? 'selected' : ''}>10 minutes</option>
                  <option value="15" ${sessionTypeData?.buffer_before_minutes === 15 ? 'selected' : ''}>15 minutes</option>
                  <option value="30" ${sessionTypeData?.buffer_before_minutes === 30 ? 'selected' : ''}>30 minutes</option>
                </select>
                <p class="config-hint-small">Time before your appointment (e.g. setup)</p>
              </div>
              
              <div class="config-form-group">
                <label for="configBufferAfter" class="required">Buffer after appointment</label>
                <select id="configBufferAfter">
                  <option value="0" ${sessionTypeData?.buffer_after_minutes === 0 || !sessionTypeData ? 'selected' : ''}>No buffer</option>
                  <option value="5" ${sessionTypeData?.buffer_after_minutes === 5 ? 'selected' : ''}>5 minutes</option>
                  <option value="10" ${sessionTypeData?.buffer_after_minutes === 10 ? 'selected' : ''}>10 minutes</option>
                  <option value="15" ${sessionTypeData?.buffer_after_minutes === 15 ? 'selected' : ''}>15 minutes</option>
                  <option value="30" ${sessionTypeData?.buffer_after_minutes === 30 ? 'selected' : ''}>30 minutes</option>
                </select>
                <p class="config-hint-small">Time after your appointment (e.g. clean up)</p>
              </div>
            </div>
            
            <div class="config-section">
              <h3>Booking settings</h3>
              <p class="config-hint">Manage the experience for your clients when they self-book</p>
              
              <div class="config-form-group">
                <label for="configTimeSlotGranularity" class="required">Time slot granularity</label>
                <select id="configTimeSlotGranularity">
                  <option value="15" ${sessionTypeData?.time_slot_granularity_minutes === 15 ? 'selected' : ''}>15 min</option>
                  <option value="20" ${sessionTypeData?.time_slot_granularity_minutes === 20 || !sessionTypeData ? 'selected' : ''}>20 min</option>
                  <option value="30" ${sessionTypeData?.time_slot_granularity_minutes === 30 ? 'selected' : ''}>30 min</option>
                  <option value="60" ${sessionTypeData?.time_slot_granularity_minutes === 60 ? 'selected' : ''}>60 min</option>
                </select>
              </div>
            </div>
            
            <div class="config-section">
              <h3>Late cancel</h3>
              <p class="config-hint">If a client cancels on short-notice, they will lose the session</p>
              
              <div class="config-form-group">
                <label for="configMinNoticeKeep" class="required">Minimum notice to keep session</label>
                <select id="configMinNoticeKeep">
                  <option value="1" selected>1 hour before</option>
                  <option value="2">2 hours before</option>
                  <option value="4">4 hours before</option>
                  <option value="24">1 day before</option>
                </select>
              </div>
            </div>
            
          </div>
          
          <!-- Notifications Tab -->
          <div class="config-tab-content" data-tab="notifications">
            <div class="config-section">
              <h3>Booking confirmation</h3>
              
              <div class="config-form-group">
                <label class="config-toggle-label">
                  <input type="checkbox" id="configEmailConfirmation" ${sessionTypeData?.booking_confirmation_email_subject ? 'checked' : ''} />
                  <span>Notify a client when an appointment is booked</span>
                </label>
              </div>
              
              <div id="configEmailFields" style="${sessionTypeData?.booking_confirmation_email_subject ? '' : 'display: none;'}">
                <div class="config-form-group">
                  <label for="configEmailSubject">Subject</label>
                  <input type="text" id="configEmailSubject" value="${sessionTypeData?.booking_confirmation_email_subject || 'Client First name and Appointment Name'}" />
                </div>
                
                <div class="config-form-group">
                  <label for="configEmailBody">Message</label>
                  <textarea id="configEmailBody" rows="10">${sessionTypeData?.booking_confirmation_email_body || 'Hi Client First name,\n\nYour Appointment Name appointment with Staff First name has been confirmed for Appointment Time on Appointment Date.'}</textarea>
                </div>
              </div>
            </div>
            
            <div class="config-section">
              <h3>Reminders</h3>
              <p class="config-hint">Notify a client when they have an upcoming appointment</p>
              
              <div class="config-form-group">
                <label class="config-toggle-label">
                  <input type="checkbox" id="configEmailReminder" ${sessionTypeData?.reminder_email_subject ? 'checked' : ''} />
                  <span>Email</span>
                </label>
              </div>
              
              <div id="configReminderFields" style="${sessionTypeData?.reminder_email_subject ? '' : 'display: none;'}">
                <div class="config-form-group">
                  <label for="configReminderTiming">Timing</label>
                  <div class="timing-input">
                    <input type="number" id="configReminderTiming" value="${sessionTypeData?.reminder_timing_hours || 24}" min="1" />
                    <select id="configReminderUnit">
                      <option value="hours" selected>hours before</option>
                      <option value="days">days before</option>
                    </select>
                  </div>
                </div>
                
                <div class="config-form-group">
                  <label for="configReminderSubject">Subject</label>
                  <input type="text" id="configReminderSubject" value="${sessionTypeData?.reminder_email_subject || 'Client First name and Appointment Name'}" />
                </div>
                
                <div class="config-form-group">
                  <label for="configReminderBody">Message</label>
                  <textarea id="configReminderBody" rows="8">${sessionTypeData?.reminder_email_body || 'You have an upcoming appointment for Appointment Name on Appointment Date at Appointment Time.'}</textarea>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Determine if we're creating new or editing
    // We're editing if sessionId or existingData was provided to this function
    const isEditing = sessionId || existingData;
    
    // Setup event listeners
    setupIndividualConfigListeners(sessionType, sessionId, sessionTypeData, isEditing);
    
    // Load staff and availability only if explicitly editing (sessionId or existingData provided)
    // Not when creating new (even if a session type with that name exists in DB)
    if (isEditing) {
      await loadConfigStaff(sessionType, sessionTypeData?.id || sessionId);
      // Load coach-specific availability for People tab
      await loadPeopleAvailability(sessionTypeData?.id || sessionId);
    } else {
      // For new sessions, People tab will be empty until staff is added
      renderPeopleAvailability([]);
    }
    renderAvailabilitySchedule(sessionTypeData?.general_availability || {});
    
  } catch (error) {
    console.error('Error rendering individual session config:', error);
  }
}

// Setup event listeners for individual session config
function setupIndividualConfigListeners(sessionType, sessionId, sessionTypeData, isEditing = false) {
  const closeBtn = document.getElementById('configCloseBtn');
  const saveBtn = document.getElementById('configSaveBtn');
  const overlay = document.querySelector('.config-overlay');
  const tabBtns = document.querySelectorAll('.config-tab-btn');
  const emailConfirmationToggle = document.getElementById('configEmailConfirmation');
  const emailReminderToggle = document.getElementById('configEmailReminder');
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      hideIndividualSessionConfig();
    });
  }
  
  if (overlay) {
    overlay.addEventListener('click', () => {
      hideIndividualSessionConfig();
    });
  }
  
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      await saveIndividualSessionConfig(sessionType, sessionId, sessionTypeData);
    });
  }
  
  // Tab switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchConfigTab(tab);
      
      // When switching to People tab, update it with current staff
      if (tab === 'people') {
        const sessionTypeId = document.querySelector('.config-panel')?.dataset?.sessionTypeId;
        if (sessionTypeId) {
          loadPeopleAvailability(sessionTypeId);
        } else {
          // For new sessions, render based on current staff tags
          const staffTags = document.querySelectorAll('.staff-tag');
          const coaches = Array.from(staffTags).map(tag => {
            const coachId = tag.dataset.coachId;
            const coachName = tag.querySelector('span')?.textContent || 'Unknown Coach';
            return {
              coach_id: coachId,
              coach_name: coachName,
              availability: {}
            };
          });
          renderPeopleAvailability(coaches);
        }
      }
    });
  });
  
  // Email toggles
  if (emailConfirmationToggle) {
    emailConfirmationToggle.addEventListener('change', (e) => {
      const emailFields = document.getElementById('configEmailFields');
      if (emailFields) {
        emailFields.style.display = e.target.checked ? 'block' : 'none';
      }
    });
  }
  
  if (emailReminderToggle) {
    emailReminderToggle.addEventListener('change', (e) => {
      const reminderFields = document.getElementById('configReminderFields');
      if (reminderFields) {
        reminderFields.style.display = e.target.checked ? 'block' : 'none';
      }
    });
  }
  
  // Color picker
  const colorInput = document.getElementById('configColor');
  const colorValue = document.querySelector('.color-value');
  if (colorInput && colorValue) {
    colorInput.addEventListener('input', (e) => {
      colorValue.textContent = e.target.value;
    });
  }
  
  // Staff dropdown - show when clicking on staff tags container or add-staff button
  const staffTags = document.getElementById('configStaffTags');
  const addStaffBtn = document.getElementById('addStaffBtn');
  
  const showStaffDropdown = async (e) => {
    // Don't show dropdown if clicking on an existing staff tag or remove button
    if (e.target.closest('.staff-tag') || e.target.closest('.remove-staff-btn')) {
      return;
    }
    
    e.stopPropagation(); // Prevent event bubbling
    
    // Close any existing dropdown
    const existingDropdown = document.getElementById('staffDropdown');
    if (existingDropdown) {
      existingDropdown.remove();
    }
    
    // Load all coaches
    const allCoaches = await loadAllCoaches();
    if (!allCoaches || allCoaches.length === 0) {
      alert('No coaches available. Add coaches in the People tab.');
      return;
    }
    
    // Get already selected coach IDs
    const selectedCoachIds = new Set();
    if (staffTags) {
      staffTags.querySelectorAll('.staff-tag').forEach(tag => {
        const coachId = tag.dataset.coachId;
        if (coachId) {
          selectedCoachIds.add(coachId);
        }
      });
    }
    
    // Filter out already selected coaches
    const availableCoaches = allCoaches.filter(coach => !selectedCoachIds.has(coach.id));
    
    if (availableCoaches.length === 0) {
      alert('All coaches have been added.');
      return;
    }
    
    // Create dropdown
    const dropdown = document.createElement('div');
    dropdown.id = 'staffDropdown';
    dropdown.className = 'staff-dropdown';
    
    // Position dropdown relative to the clicked element
    // Use e.currentTarget if available, otherwise use the button or staff tags container
    const targetElement = e.currentTarget || e.target.closest('.add-staff-btn') || staffTags;
    if (!targetElement) {
      console.error('Cannot determine target element for dropdown positioning');
      return;
    }
    
    const rect = targetElement.getBoundingClientRect();
    dropdown.style.position = 'fixed';
    dropdown.style.top = `${rect.bottom + 5}px`;
    dropdown.style.left = `${rect.left}px`;
    dropdown.style.zIndex = '10000';
    dropdown.style.maxWidth = '300px';
    dropdown.style.minWidth = '200px';
    
    // Adjust position if dropdown would go off-screen
    const dropdownWidth = 250; // Approximate width
    const dropdownHeight = Math.min(availableCoaches.length * 42 + 8, 300); // Approximate height
    
    if (rect.left + dropdownWidth > window.innerWidth) {
      dropdown.style.left = `${window.innerWidth - dropdownWidth - 10}px`;
    }
    
    if (rect.bottom + dropdownHeight > window.innerHeight) {
      dropdown.style.top = `${rect.top - dropdownHeight - 5}px`;
    }
    
    // Create dropdown content
    dropdown.innerHTML = `
      <div class="staff-dropdown-content">
        ${availableCoaches.map(coach => {
          const coachName = `${coach.first_name || ''} ${coach.last_name || ''}`.trim();
          return `
            <div class="staff-dropdown-item" data-coach-id="${coach.id}">
              ${coachName}
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    // Add click handlers for each coach
    dropdown.querySelectorAll('.staff-dropdown-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        const coachId = item.dataset.coachId;
        const coach = availableCoaches.find(c => c.id === coachId);
        if (coach) {
          addStaffTag(coach);
          dropdown.remove();
        }
      });
    });
    
    document.body.appendChild(dropdown);
    
    // Close dropdown when clicking outside
    const closeDropdown = (e) => {
      if (!dropdown.contains(e.target) && 
          e.target !== targetElement && 
          e.target !== addStaffBtn &&
          !addStaffBtn?.contains(e.target) &&
          !staffTags?.contains(e.target)) {
        dropdown.remove();
        document.removeEventListener('click', closeDropdown);
      }
    };
    
    // Use setTimeout to avoid immediate closure
    setTimeout(() => {
      document.addEventListener('click', closeDropdown);
    }, 0);
  };
  
  if (staffTags) {
    staffTags.addEventListener('click', showStaffDropdown);
  }
  
  if (addStaffBtn) {
    addStaffBtn.addEventListener('click', showStaffDropdown);
  }
}

// Switch config tabs
function switchConfigTab(tab) {
  const tabBtns = document.querySelectorAll('.config-tab-btn');
  const tabContents = document.querySelectorAll('.config-tab-content');
  
  tabBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });
  
  tabContents.forEach(content => {
    content.classList.toggle('active', content.dataset.tab === tab);
  });
}

// Load all coaches from database
async function loadAllCoaches() {
  if (!supabaseReady || !supabase) return [];
  
  try {
    const { data: allCoaches, error: allError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .eq('role', 'coach');
    
    if (allError) {
      console.error('Error loading coaches:', allError);
      return [];
    }
    
    return allCoaches || [];
  } catch (error) {
    console.error('Error loading coaches:', error);
    return [];
  }
}

// Add a staff tag for a selected coach
function addStaffTag(coach) {
  const staffTags = document.getElementById('configStaffTags');
  if (!staffTags) return;
  
  // Check if coach is already added
  const existingTag = staffTags.querySelector(`[data-coach-id="${coach.id}"]`);
  if (existingTag) return;
  
  // Remove "no-staff" message if present
  const noStaffMsg = staffTags.querySelector('.no-staff');
  if (noStaffMsg) {
    noStaffMsg.remove();
  }
  
  // Create staff tag
  const coachName = `${coach.first_name || ''} ${coach.last_name || ''}`.trim();
  const tag = document.createElement('div');
  tag.className = 'staff-tag';
  tag.dataset.coachId = coach.id;
  tag.innerHTML = `
    <span>${coachName}</span>
    <button type="button" class="remove-staff-btn" data-coach-id="${coach.id}">
      <i class="bx bx-x"></i>
    </button>
  `;
  
  // Setup remove button
  const removeBtn = tag.querySelector('.remove-staff-btn');
  if (removeBtn) {
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      tag.remove();
      
      // Show "no-staff" message if no tags remain
      if (staffTags.querySelectorAll('.staff-tag').length === 0) {
        staffTags.innerHTML = '<p class="no-staff">No staff available. Add staff in the People tab.</p>';
      }
      
      // Update People tab when staff is removed
      updatePeopleTabAfterStaffChange();
    });
  }
  
  staffTags.appendChild(tag);
  
  // Update People tab when staff is added
  updatePeopleTabAfterStaffChange();
}

// Update People tab when staff is added or removed
function updatePeopleTabAfterStaffChange() {
  const configPanel = document.querySelector('.config-panel');
  if (!configPanel) return;
  
  const peopleTab = document.querySelector('.config-tab-content[data-tab="people"]');
  if (!peopleTab) return;
  
  // Get session type ID from the panel's data attribute or from the current editing context
  const sessionTypeId = configPanel.dataset.sessionTypeId;
  if (sessionTypeId) {
    loadPeopleAvailability(sessionTypeId);
  } else {
    // If no sessionTypeId yet (creating new), just render based on current staff tags
    const staffTags = document.querySelectorAll('.staff-tag');
    const coaches = Array.from(staffTags).map(tag => {
      const coachId = tag.dataset.coachId;
      const coachName = tag.querySelector('span')?.textContent || 'Unknown Coach';
      return {
        coach_id: coachId,
        coach_name: coachName,
        availability: {}
      };
    });
    renderPeopleAvailability(coaches);
  }
}

// Load staff for configuration (when editing existing session)
async function loadConfigStaff(sessionType, sessionTypeId) {
  if (!supabaseReady || !supabase) return;
  
  console.log('loadConfigStaff called with:', { sessionType, sessionTypeId });
  
  try {
    // Load coaches who are available for this session type
    // When editing, only show coaches that are actually selected (have availability entries)
    let coaches = [];
    if (sessionTypeId) {
      console.log('Loading coaches for session type ID:', sessionTypeId);
      const { data: coachAvailability, error } = await supabase
        .from('coach_individual_availability')
        .select(`
          coach_id,
          coach:profiles!coach_individual_availability_coach_id_fkey(
            id,
            first_name,
            last_name
          )
        `)
        .eq('session_type_id', sessionTypeId)
        .eq('is_available', true);
      
      console.log('Coach availability query result:', { coachAvailability, error });
      
      if (!error && coachAvailability) {
        coaches = coachAvailability.map(c => c.coach).filter(Boolean);
        console.log('Filtered coaches:', coaches);
      }
    }
    
    // Only load all coaches as potential staff if we're creating new (not editing)
    // When editing, we only want to show the coaches that are already selected
    if (!sessionTypeId) {
      console.log('No sessionTypeId, loading all coaches for new session');
      const allCoaches = await loadAllCoaches();
      if (allCoaches && allCoaches.length > 0) {
        // Merge and deduplicate
        const coachMap = new Map();
        allCoaches.forEach(c => {
          coachMap.set(c.id, c);
        });
        coaches.forEach(c => {
          coachMap.set(c.id, c);
        });
        coaches = Array.from(coachMap.values());
      }
    }
    
    console.log('Final coaches to render:', coaches);
    
    // Render staff tags
    const staffTags = document.getElementById('configStaffTags');
    if (staffTags) {
      if (coaches.length === 0) {
        staffTags.innerHTML = '<p class="no-staff">No staff available. Add staff in the People tab.</p>';
      } else {
        staffTags.innerHTML = coaches.map(coach => {
          const coachName = `${coach.first_name || ''} ${coach.last_name || ''}`.trim();
          return `
            <div class="staff-tag" data-coach-id="${coach.id}" data-original="true">
              <span>${coachName}</span>
              <button type="button" class="remove-staff-btn" data-coach-id="${coach.id}">
                <i class="bx bx-x"></i>
              </button>
            </div>
          `;
        }).join('');
        
        // Setup remove buttons
        staffTags.querySelectorAll('.remove-staff-btn').forEach(btn => {
          btn.addEventListener('click', (e) => {
            e.stopPropagation();
            btn.closest('.staff-tag').remove();
            
            // Show "no-staff" message if no tags remain
            if (staffTags.querySelectorAll('.staff-tag').length === 0) {
              staffTags.innerHTML = '<p class="no-staff">No staff available. Add staff in the People tab.</p>';
            }
          });
        });
      }
    }
  } catch (error) {
    console.error('Error loading config staff:', error);
  }
}

// Render availability schedule
function renderAvailabilitySchedule(availability) {
  const schedule = document.getElementById('configAvailabilitySchedule');
  if (!schedule) return;
  
  const days = [
    { key: 'sunday', label: 'Sunday', abbr: 'Sun' },
    { key: 'monday', label: 'Monday', abbr: 'Mon' },
    { key: 'tuesday', label: 'Tuesday', abbr: 'Tue' },
    { key: 'wednesday', label: 'Wednesday', abbr: 'Wed' },
    { key: 'thursday', label: 'Thursday', abbr: 'Thu' },
    { key: 'friday', label: 'Friday', abbr: 'Fri' },
    { key: 'saturday', label: 'Saturday', abbr: 'Sat' }
  ];
  
  schedule.innerHTML = days.map(day => {
    const dayAvail = availability[day.key] || {};
    const isAvailable = dayAvail.available !== false;
    const startTime = dayAvail.start || '9:00 AM';
    const endTime = dayAvail.end || '5:00 PM';
    
    return `
      <div class="availability-day">
        <label class="availability-day-label">
          <input type="checkbox" class="day-available-toggle" data-day="${day.key}" ${isAvailable ? 'checked' : ''} />
          <span>${day.label}</span>
        </label>
        ${isAvailable ? `
          <div class="availability-time-inputs">
            <input type="time" class="availability-start" data-day="${day.key}" value="${convertTo24Hour(startTime)}" />
            <span>to</span>
            <input type="time" class="availability-end" data-day="${day.key}" value="${convertTo24Hour(endTime)}" />
          </div>
        ` : `
          <span class="unavailable-label">Unavailable</span>
        `}
      </div>
    `;
  }).join('');
  
  // Setup toggle handlers
  schedule.querySelectorAll('.day-available-toggle').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const dayRow = e.target.closest('.availability-day');
      const timeInputs = dayRow.querySelector('.availability-time-inputs');
      const unavailableLabel = dayRow.querySelector('.unavailable-label');
      
      if (e.target.checked) {
        if (!timeInputs) {
          const dayKey = e.target.dataset.day;
          const dayData = days.find(d => d.key === dayKey);
          const timeInputsHtml = `
            <div class="availability-time-inputs">
              <input type="time" class="availability-start" data-day="${dayKey}" value="09:00" />
              <span>to</span>
              <input type="time" class="availability-end" data-day="${dayKey}" value="17:00" />
            </div>
          `;
          if (unavailableLabel) {
            unavailableLabel.insertAdjacentHTML('afterend', timeInputsHtml);
            unavailableLabel.remove();
          } else {
            dayRow.insertAdjacentHTML('beforeend', timeInputsHtml);
          }
        }
      } else {
        if (timeInputs) {
          timeInputs.remove();
          if (!unavailableLabel) {
            dayRow.insertAdjacentHTML('beforeend', '<span class="unavailable-label">Unavailable</span>');
          }
        }
      }
    });
  });
}

// Load coach-specific availability for People tab
async function loadPeopleAvailability(sessionTypeId) {
  if (!supabaseReady || !supabase || !sessionTypeId) {
    renderPeopleAvailability([]);
    return;
  }
  
  try {
    // Get staff IDs from staff tags
    const staffTags = document.querySelectorAll('.staff-tag');
    const staffIds = Array.from(staffTags).map(tag => tag.dataset.coachId).filter(Boolean);
    
    if (staffIds.length === 0) {
      renderPeopleAvailability([]);
      return;
    }
    
    // Load coach availability data
    const { data: coachAvailability, error } = await supabase
      .from('coach_individual_availability')
      .select(`
        coach_id,
        availability,
        coach:profiles!coach_individual_availability_coach_id_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .eq('session_type_id', sessionTypeId)
      .in('coach_id', staffIds);
    
    if (error) {
      console.error('Error loading coach availability:', error);
      renderPeopleAvailability([]);
      return;
    }
    
    // Map to include all staff, even if they don't have availability set yet
    const coachesWithAvailability = staffIds.map(coachId => {
      const existing = coachAvailability?.find(a => a.coach_id === coachId);
      
      // Get coach name from availability data or staff tag
      let coachName = 'Unknown Coach';
      if (existing?.coach) {
        coachName = `${existing.coach.first_name || ''} ${existing.coach.last_name || ''}`.trim() || 'Unknown Coach';
      } else {
        // Fallback to staff tag text
        const staffTag = Array.from(staffTags).find(t => t.dataset.coachId === coachId);
        if (staffTag) {
          coachName = staffTag.querySelector('span')?.textContent || 'Unknown Coach';
        }
      }
      
      return {
        coach_id: coachId,
        coach_name: coachName,
        availability: existing?.availability || {}
      };
    });
    
    renderPeopleAvailability(coachesWithAvailability);
  } catch (error) {
    console.error('Error loading people availability:', error);
    renderPeopleAvailability([]);
  }
}

// Render coach-specific availability in People tab
function renderPeopleAvailability(coaches) {
  const container = document.getElementById('peopleAvailabilityContainer');
  if (!container) return;
  
  if (coaches.length === 0) {
    container.innerHTML = '<p class="no-coaches-message">Add staff in the Details tab to set their availability.</p>';
    return;
  }
  
  container.innerHTML = coaches.map(coach => {
    const coachAvailability = coach.availability || {};
    
    return `
      <div class="coach-availability-section" data-coach-id="${coach.coach_id}">
        <h4 class="coach-name">${coach.coach_name}</h4>
        <div class="coach-availability-schedule" data-coach-id="${coach.coach_id}">
          ${renderCoachAvailabilitySchedule(coachAvailability)}
        </div>
      </div>
    `;
  }).join('');
  
  // Setup toggle handlers for each coach's availability
  container.querySelectorAll('.coach-availability-schedule .day-available-toggle').forEach(toggle => {
    toggle.addEventListener('change', (e) => {
      const dayRow = e.target.closest('.availability-day');
      const timeInputs = dayRow.querySelector('.availability-time-inputs');
      const unavailableLabel = dayRow.querySelector('.unavailable-label');
      
      if (e.target.checked) {
        if (!timeInputs) {
          const dayKey = e.target.dataset.day;
          const timeInputsHtml = `
            <div class="availability-time-inputs">
              <input type="time" class="availability-start" data-day="${dayKey}" value="09:00" />
              <span>to</span>
              <input type="time" class="availability-end" data-day="${dayKey}" value="17:00" />
            </div>
          `;
          if (unavailableLabel) {
            unavailableLabel.insertAdjacentHTML('afterend', timeInputsHtml);
            unavailableLabel.remove();
          } else {
            dayRow.insertAdjacentHTML('beforeend', timeInputsHtml);
          }
        }
      } else {
        if (timeInputs) {
          timeInputs.remove();
          if (!unavailableLabel) {
            dayRow.insertAdjacentHTML('beforeend', '<span class="unavailable-label">Unavailable</span>');
          }
        }
      }
    });
  });
}

// Render availability schedule for a specific coach
function renderCoachAvailabilitySchedule(availability) {
  const days = [
    { key: 'sunday', label: 'Sunday', abbr: 'Sun' },
    { key: 'monday', label: 'Monday', abbr: 'Mon' },
    { key: 'tuesday', label: 'Tuesday', abbr: 'Tue' },
    { key: 'wednesday', label: 'Wednesday', abbr: 'Wed' },
    { key: 'thursday', label: 'Thursday', abbr: 'Thu' },
    { key: 'friday', label: 'Friday', abbr: 'Fri' },
    { key: 'saturday', label: 'Saturday', abbr: 'Sat' }
  ];
  
  return days.map(day => {
    const dayAvail = availability[day.key] || {};
    const isAvailable = dayAvail.available !== false;
    const startTime = dayAvail.start || '9:00 AM';
    const endTime = dayAvail.end || '5:00 PM';
    
    return `
      <div class="availability-day">
        <label class="availability-day-label">
          <input type="checkbox" class="day-available-toggle" data-day="${day.key}" ${isAvailable ? 'checked' : ''} />
          <span>${day.label}</span>
        </label>
        ${isAvailable ? `
          <div class="availability-time-inputs">
            <input type="time" class="availability-start" data-day="${day.key}" value="${convertTo24Hour(startTime)}" />
            <span>to</span>
            <input type="time" class="availability-end" data-day="${day.key}" value="${convertTo24Hour(endTime)}" />
          </div>
        ` : `
          <span class="unavailable-label">Unavailable</span>
        `}
      </div>
    `;
  }).join('');
}

// Convert 12-hour time to 24-hour format
function convertTo24Hour(time12) {
  if (!time12) return '09:00';
  
  // Try 24-hour format first
  const match24 = time12.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return time12;
  }
  
  // Try 12-hour format
  const match12 = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1]);
    const minutes = match12[2];
    const period = match12[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
  
  return '09:00';
}

// Save individual session configuration
async function saveIndividualSessionConfig(sessionType, sessionId, existingData) {
  console.log('=== SAVE INDIVIDUAL SESSION CONFIG CALLED ===');
  console.log('Parameters:', { sessionType, sessionId, existingData });
  
  if (!supabaseReady || !supabase) {
    console.error('Supabase not ready!');
    return;
  }
  
  try {
    // Collect form data
    const nameInput = document.getElementById('configName');
    const colorInput = document.getElementById('configColor');
    const durationInput = document.getElementById('configDuration');
    
    if (!nameInput || !colorInput || !durationInput) {
      console.error('Required form fields not found!');
      alert('Error: Configuration form is not properly loaded. Please try again.');
      return;
    }
    
    const name = nameInput.value;
    const color = colorInput.value;
    const duration = parseInt(durationInput.value);
    
    // If sessionType is not provided, use the name from the form
    const finalSessionType = sessionType || name;
    
    console.log('Form data collected:', { name, color, duration, finalSessionType });
    const minBookingNotice = parseInt(document.getElementById('configMinBookingNotice').value);
    const bufferBefore = parseInt(document.getElementById('configBufferBefore').value);
    const bufferAfter = parseInt(document.getElementById('configBufferAfter').value);
    const timeSlotGranularity = parseInt(document.getElementById('configTimeSlotGranularity').value);
    
    // Collect availability
    const availability = {};
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    days.forEach(day => {
      const toggle = document.querySelector(`.day-available-toggle[data-day="${day}"]`);
      if (toggle && toggle.checked) {
        const startInput = document.querySelector(`.availability-start[data-day="${day}"]`);
        const endInput = document.querySelector(`.availability-end[data-day="${day}"]`);
        availability[day] = {
          available: true,
          start: startInput ? convertTo12Hour(startInput.value) : '9:00 AM',
          end: endInput ? convertTo12Hour(endInput.value) : '5:00 PM'
        };
      } else {
        availability[day] = { available: false };
      }
    });
    
    // Collect notification settings
    const emailConfirmationEnabled = document.getElementById('configEmailConfirmation').checked;
    const emailSubject = emailConfirmationEnabled ? document.getElementById('configEmailSubject').value : null;
    const emailBody = emailConfirmationEnabled ? document.getElementById('configEmailBody').value : null;
    
    const emailReminderEnabled = document.getElementById('configEmailReminder').checked;
    const reminderTiming = emailReminderEnabled ? parseInt(document.getElementById('configReminderTiming').value) : null;
    const reminderUnit = emailReminderEnabled ? document.getElementById('configReminderUnit').value : null;
    const reminderSubject = emailReminderEnabled ? document.getElementById('configReminderSubject').value : null;
    const reminderBody = emailReminderEnabled ? document.getElementById('configReminderBody').value : null;
    
    const reminderTimingHours = reminderTiming && reminderUnit === 'hours' ? reminderTiming : 
                                 reminderTiming && reminderUnit === 'days' ? reminderTiming * 24 : 24;
    
    // Collect zoom link and description
    const zoomLinkInput = document.getElementById('configZoomLink');
    const descriptionInput = document.getElementById('configDescription');
    const zoomLink = zoomLinkInput ? zoomLinkInput.value.trim() || null : null;
    const description = descriptionInput ? descriptionInput.value.trim() || null : null;
    
    // Collect staff
    const staffTags = document.querySelectorAll('.staff-tag');
    const staffIds = Array.from(staffTags).map(tag => tag.dataset.coachId).filter(Boolean);
    
    console.log('Saving individual session config:', {
      sessionType,
      sessionId,
      staffIds,
      staffIdsLength: staffIds.length,
      hasExistingData: !!existingData,
      existingDataId: existingData?.id
    });
    
    // Save or update session type
    if (existingData && existingData.id) {
      // Update existing
      console.log('Updating existing session type:', existingData.id);
      const updateData = {
        display_name: name,
        color: color,
        duration_minutes: duration,
        minimum_booking_notice_hours: minBookingNotice,
        buffer_before_minutes: bufferBefore,
        buffer_after_minutes: bufferAfter,
        time_slot_granularity_minutes: timeSlotGranularity,
        general_availability: availability,
        booking_confirmation_email_subject: emailSubject,
        booking_confirmation_email_body: emailBody,
        reminder_timing_hours: reminderTimingHours,
        reminder_email_subject: reminderSubject,
        reminder_email_body: reminderBody,
        description: description,
        updated_at: new Date().toISOString()
      };
      
      // Only include zoom_link if the column exists (we'll add it via migration if needed)
      if (zoomLink !== null) {
        updateData.zoom_link = zoomLink;
      }
      
      const { data: updatedData, error } = await supabase
        .from('individual_session_types')
        .update(updateData)
        .eq('id', existingData.id)
        .select()
        .single();
      
      if (error) {
        console.error('Error updating session type:', error);
        throw error;
      }
      
      console.log('Successfully updated session type:', updatedData);
      
      // Only update coach availability if staff has actually changed
      // Get the original staff list from when the config was opened
      const originalStaffTags = document.querySelectorAll('.staff-tag[data-original="true"]');
      const originalStaffIds = Array.from(originalStaffTags)
        .map(tag => tag.dataset.coachId)
        .filter(Boolean);
      const originalStaffSet = new Set(originalStaffIds);
      const currentStaffSet = new Set(staffIds);
      
      // Check if staff has changed
      // If we had original staff loaded, compare sets
      // If no original staff but we have staff now, that means staff was added
      // If we had original staff but none now, that means staff was removed
      let staffChanged = false;
      if (originalStaffTags.length > 0) {
        // Had original staff - check if it changed
        staffChanged = originalStaffIds.length !== staffIds.length ||
          !originalStaffIds.every(id => currentStaffSet.has(id)) ||
          !staffIds.every(id => originalStaffSet.has(id));
      } else if (staffIds.length > 0) {
        // No original staff but we have staff now - staff was added
        staffChanged = true;
      }
      // If no original staff and no current staff, staffChanged stays false
      
      // Only update coach availability if staff has explicitly changed
      // This prevents accidentally deleting availability when just editing times/settings
      const shouldUpdateAvailability = staffChanged;
      
      if (shouldUpdateAvailability) {
        console.log('Staff or availability changed, updating coach availability:', { staffChanged, availabilityModified });
        
        // First, remove availability for coaches that are no longer selected
        // Get all current availability entries for this session type
        const { data: currentAvailability, error: currentError } = await supabase
          .from('coach_individual_availability')
          .select('coach_id')
          .eq('session_type_id', existingData.id);
        
        if (!currentError && currentAvailability) {
          const currentCoachIds = new Set(currentAvailability.map(a => a.coach_id));
          const selectedCoachIds = new Set(staffIds);
          
          // Find coaches to remove (in current but not in selected)
          const coachesToRemove = Array.from(currentCoachIds).filter(id => !selectedCoachIds.has(id));
          
          if (coachesToRemove.length > 0) {
            console.log('Attempting to delete availability for coaches:', coachesToRemove);
            const { data: deletedData, error: deleteError } = await supabase
              .from('coach_individual_availability')
              .delete()
              .eq('session_type_id', existingData.id)
              .in('coach_id', coachesToRemove)
              .select();
            
            if (deleteError) {
              console.error('Error removing coach availability:', deleteError);
              console.error('Delete error details:', {
                code: deleteError.code,
                message: deleteError.message,
                details: deleteError.details,
                hint: deleteError.hint
              });
              // Don't throw - continue with upsert even if delete fails
              // The upsert will handle updating the selected coaches
            } else {
              console.log('Successfully removed availability for coaches:', deletedData);
              console.log('Deleted count:', deletedData?.length || 0);
              if (!deletedData || deletedData.length === 0) {
                console.warn('Delete returned no rows - this might indicate an RLS policy issue. Please ensure the DELETE policy exists for coach_individual_availability.');
              }
            }
          }
        }
        
        // Create/update coach availability entries for selected staff
        if (staffIds.length > 0) {
          console.log('Creating/updating coach availability for staff:', staffIds);
          
          // Load existing availability to preserve it if not modified
          const { data: existingAvailability, error: availLoadError } = await supabase
            .from('coach_individual_availability')
            .select('coach_id, availability')
            .eq('session_type_id', existingData.id)
            .in('coach_id', staffIds);
          
          const existingAvailabilityMap = new Map();
          if (!availLoadError && existingAvailability) {
            existingAvailability.forEach(a => {
              existingAvailabilityMap.set(a.coach_id, a.availability);
            });
          }
          
          // Collect coach-specific availability from People tab
          const coachAvailabilityEntries = staffIds.map(coachId => {
            const coachSection = document.querySelector(`.coach-availability-section[data-coach-id="${coachId}"]`);
            let coachAvailability = {};
            
            if (coachSection) {
              const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
              days.forEach(day => {
                const toggle = coachSection.querySelector(`.day-available-toggle[data-day="${day}"]`);
                if (toggle && toggle.checked) {
                  const startInput = coachSection.querySelector(`.availability-start[data-day="${day}"]`);
                  const endInput = coachSection.querySelector(`.availability-end[data-day="${day}"]`);
                  coachAvailability[day] = {
                    available: true,
                    start: startInput ? convertTo12Hour(startInput.value) : '9:00 AM',
                    end: endInput ? convertTo12Hour(endInput.value) : '5:00 PM'
                  };
                } else {
                  coachAvailability[day] = { available: false };
                }
              });
            } else {
              // If no section found, preserve existing availability
              coachAvailability = existingAvailabilityMap.get(coachId) || {};
            }
            
            return {
              coach_id: coachId,
              session_type_id: existingData.id,
              is_available: true,
              availability: coachAvailability
            };
          });
          
          const { data: availData, error: availError } = await supabase
            .from('coach_individual_availability')
            .upsert(coachAvailabilityEntries, { onConflict: 'coach_id,session_type_id' })
            .select();
          
          if (availError) {
            console.error('Error creating/updating coach availability:', availError);
          } else {
            console.log('Successfully created/updated coach availability:', availData);
          }
        } else {
          // If no staff selected, don't delete existing availability - just leave it as is
          console.log('No staff selected, preserving existing coach availability');
        }
      } else {
        console.log('Staff and availability unchanged, skipping coach availability update');
      }
    } else {
      // Check if a session type with this name already exists
      const { data: existingType, error: checkError } = await supabase
        .from('individual_session_types')
        .select('id')
        .eq('name', finalSessionType)
        .maybeSingle();
      
      let sessionTypeId;
      let data;
      
      if (existingType && existingType.id) {
        // Update existing session type
        console.log('Updating existing individual session type:', {
          id: existingType.id,
          name: finalSessionType,
          display_name: name,
          duration_minutes: duration
        });
        
        const updateDataForExisting = {
          display_name: name,
          color: color,
          duration_minutes: duration,
          minimum_booking_notice_hours: minBookingNotice,
          buffer_before_minutes: bufferBefore,
          buffer_after_minutes: bufferAfter,
          time_slot_granularity_minutes: timeSlotGranularity,
          general_availability: availability,
          booking_confirmation_email_subject: emailSubject,
          booking_confirmation_email_body: emailBody,
          reminder_timing_hours: reminderTimingHours,
          reminder_email_subject: reminderSubject,
          reminder_email_body: reminderBody,
          description: description,
          is_active: true
        };
        
        // Only include zoom_link if the column exists
        if (zoomLink !== null) {
          updateDataForExisting.zoom_link = zoomLink;
        }
        
        const { data: updateData, error: updateError } = await supabase
          .from('individual_session_types')
          .update(updateDataForExisting)
          .eq('id', existingType.id)
          .select()
          .single();
        
        if (updateError) {
          console.error('Error updating individual session type:', updateError);
          throw updateError;
        }
        
        console.log('Successfully updated individual session type:', updateData);
        data = updateData;
        sessionTypeId = updateData.id;
      } else {
        // Create new
        console.log('Creating new individual session type:', {
          name: sessionType,
          display_name: name,
          duration_minutes: duration
        });
        
        const insertDataObj = {
          name: finalSessionType,
          display_name: name,
          color: color,
          duration_minutes: duration,
          minimum_booking_notice_hours: minBookingNotice,
          buffer_before_minutes: bufferBefore,
          buffer_after_minutes: bufferAfter,
          time_slot_granularity_minutes: timeSlotGranularity,
          general_availability: availability,
          booking_confirmation_email_subject: emailSubject,
          booking_confirmation_email_body: emailBody,
          reminder_timing_hours: reminderTimingHours,
          reminder_email_subject: reminderSubject,
          reminder_email_body: reminderBody,
          description: description
        };
        
        // Only include zoom_link if the column exists
        if (zoomLink !== null) {
          insertDataObj.zoom_link = zoomLink;
        }
        
        const { data: insertData, error: insertError } = await supabase
          .from('individual_session_types')
          .insert(insertDataObj)
          .select()
          .single();
        
        if (insertError) {
          console.error('Error creating individual session type:', insertError);
          throw insertError;
        }
        
        console.log('Successfully created individual session type:', insertData);
        data = insertData;
        sessionTypeId = insertData.id;
      }
      
      // Create coach availability entries for selected staff
      if (staffIds.length > 0 && data && data.id) {
        console.log('Creating coach availability for staff:', staffIds);
        
        // Collect coach-specific availability from People tab
        const coachAvailabilityEntries = staffIds.map(coachId => {
          const coachSection = document.querySelector(`.coach-availability-section[data-coach-id="${coachId}"]`);
          const coachAvailability = {};
          
          if (coachSection) {
            const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
            days.forEach(day => {
              const toggle = coachSection.querySelector(`.day-available-toggle[data-day="${day}"]`);
              if (toggle && toggle.checked) {
                const startInput = coachSection.querySelector(`.availability-start[data-day="${day}"]`);
                const endInput = coachSection.querySelector(`.availability-end[data-day="${day}"]`);
                coachAvailability[day] = {
                  available: true,
                  start: startInput ? convertTo12Hour(startInput.value) : '9:00 AM',
                  end: endInput ? convertTo12Hour(endInput.value) : '5:00 PM'
                };
              } else {
                coachAvailability[day] = { available: false };
              }
            });
          }
          
          return {
            coach_id: coachId,
            session_type_id: data.id,
            is_available: true,
            availability: coachAvailability
          };
        });
        
        const { data: availData, error: availError } = await supabase
          .from('coach_individual_availability')
          .upsert(coachAvailabilityEntries, { onConflict: 'coach_id,session_type_id' })
          .select();
        
        if (availError) {
          console.error('Error creating coach availability:', availError);
        } else {
          console.log('Successfully created coach availability:', availData);
        }
      } else if (data) {
        // If no staff selected, create a placeholder entry so it shows in the table
        // This allows the session type to appear even without staff assigned yet
        const { data: { session } } = await supabase.auth.getSession();
        if (session && session.user) {
          console.log('No staff selected, creating default availability for current coach:', session.user.id);
          // Use the current user (coach) as the default staff
          const { data: availData, error: availError } = await supabase
            .from('coach_individual_availability')
            .upsert({
              coach_id: session.user.id,
              session_type_id: data.id,
              is_available: true
            }, { onConflict: 'coach_id,session_type_id' })
            .select();
          
          if (availError) {
            console.error('Error creating default coach availability:', availError);
          } else {
            console.log('Successfully created default coach availability:', availData);
          }
        } else {
          console.warn('No user session found, cannot create default coach availability');
        }
      }
    }
    
    console.log('=== SAVE COMPLETED SUCCESSFULLY ===');
    alert('Individual session configuration saved successfully!');
    hideIndividualSessionConfig();
    
    // Switch to individual sessions view if not already there
    const individualSessionsViewBtn = document.getElementById('individualSessionsViewBtn');
    if (individualSessionsViewBtn && !individualSessionsViewBtn.classList.contains('active')) {
      console.log('Switching to individual sessions view...');
      switchView('individual');
    } else {
      // If already in individual view, just reload
      console.log('Already in individual sessions view, reloading...');
      await loadIndividualSessionTypes();
    }
    
    // Reload sessions if needed
    await loadSessions();
    
  } catch (error) {
    console.error('=== ERROR SAVING INDIVIDUAL SESSION CONFIG ===');
    console.error('Error details:', error);
    alert(`Error saving configuration: ${error.message}`);
  }
}

// Convert 24-hour time to 12-hour format
function convertTo12Hour(time24) {
  if (!time24) return '9:00 AM';
  
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

// ============================================
// VIEW TOGGLE
// ============================================

// Switch between calendar and individual sessions view
function switchView(view) {
  const calendarViewBtn = document.getElementById('calendarViewBtn');
  const individualSessionsViewBtn = document.getElementById('individualSessionsViewBtn');
  const calendarContainer = document.getElementById('calendarContainer');
  const individualSessionsSection = document.getElementById('individualSessionsSection');
  
  if (view === 'calendar') {
    if (calendarViewBtn) calendarViewBtn.classList.add('active');
    if (individualSessionsViewBtn) individualSessionsViewBtn.classList.remove('active');
    if (calendarContainer) calendarContainer.style.display = 'block';
    if (individualSessionsSection) individualSessionsSection.style.display = 'none';
  } else if (view === 'individual') {
    if (calendarViewBtn) calendarViewBtn.classList.remove('active');
    if (individualSessionsViewBtn) individualSessionsViewBtn.classList.add('active');
    if (calendarContainer) calendarContainer.style.display = 'none';
    if (individualSessionsSection) individualSessionsSection.style.display = 'flex';
    // Reload individual session types when switching to this view
    loadIndividualSessionTypes();
  }
}

// ============================================
// INDIVIDUAL SESSION TYPES MANAGEMENT
// ============================================

// Load and display individual session types
// Only show session types that have been configured (have staff assigned)
async function loadIndividualSessionTypes() {
  if (!supabaseReady || !supabase) {
    console.log('Supabase not ready, cannot load individual session types');
    return;
  }
  
  try {
    console.log('Loading individual session types...');
    
    // First, let's check if there are any session types at all
    const { data: allTypes, error: allError } = await supabase
      .from('individual_session_types')
      .select('id, name, display_name, is_active')
      .eq('is_active', true);
    
    console.log('All active session types:', allTypes);
    
    // Get session types - use left join so we show all types, even without availability
    // But we'll filter to only show types that have at least one availability entry
    const { data: sessionTypes, error } = await supabase
      .from('individual_session_types')
      .select(`
        *,
        coach_availability:coach_individual_availability(
          id,
          coach_id,
          is_available
        )
      `)
      .eq('is_active', true)
      .order('display_name', { ascending: true });
    
    console.log('Session types with availability (before filtering):', sessionTypes);
    
    // Filter to only show types that have at least one available coach
    const filteredTypes = (sessionTypes || []).filter(type => {
      const hasAvailableCoach = type.coach_availability && 
        Array.isArray(type.coach_availability) && 
        type.coach_availability.some(avail => avail.is_available === true);
      console.log(`Type "${type.display_name || type.name}": hasAvailableCoach = ${hasAvailableCoach}`, type.coach_availability);
      return hasAvailableCoach;
    });
    
    console.log('Filtered session types:', filteredTypes);
    
    if (error) {
      console.error('Error loading individual session types:', error);
      console.error('Error details:', {
        message: error.message,
        code: error.code,
        details: error.details,
        hint: error.hint
      });
      return;
    }
    
    // Remove the nested coach_availability from the display data
    const cleanedTypes = filteredTypes.map(type => {
      const { coach_availability, ...rest } = type;
      return rest;
    });
    
    console.log('Cleaned session types for display:', cleanedTypes);
    
    renderIndividualSessionTypesTable(cleanedTypes);
  } catch (error) {
    console.error('Error loading individual session types:', error);
  }
}

// Render individual session types table
function renderIndividualSessionTypesTable(sessionTypes) {
  const tbody = document.getElementById('sessionsTableBody');
  const emptyState = document.getElementById('emptyState');
  
  if (!tbody) return;
  
  if (sessionTypes.length === 0) {
    tbody.innerHTML = '';
    if (emptyState) emptyState.style.display = 'block';
    return;
  }
  
  if (emptyState) emptyState.style.display = 'none';
  
  tbody.innerHTML = sessionTypes.map(type => {
    const colorStyle = type.color ? `background-color: ${type.color}` : '';
    return `
      <tr data-session-type-id="${type.id}">
        <td>
          <div class="session-type-row">
            <div class="session-type-name">
              <span class="color-indicator" style="${colorStyle}"></span>
              <span>${type.display_name || type.name}</span>
            </div>
            <div class="session-type-duration">
              <span class="duration-label">Duration</span>
              <span class="duration-value">${type.duration_minutes} min</span>
            </div>
          </div>
        </td>
        <td class="actions-cell">
          <div class="actions-menu-container">
            <button class="actions-menu-btn" type="button" data-session-type-id="${type.id}" aria-label="Actions">
              <i class="bx bx-dots-vertical-rounded"></i>
            </button>
            <div class="actions-menu" id="actionsMenu_${type.id}" style="display: none;">
              <button class="menu-item" data-action="info" data-session-type-id="${type.id}">
                <span>Info</span>
              </button>
              <button class="menu-item" data-action="edit" data-session-type-id="${type.id}">
                <span>Edit</span>
              </button>
              <button class="menu-item" data-action="duplicate" data-session-type-id="${type.id}">
                <span>Duplicate</span>
              </button>
              <button class="menu-item menu-item-danger" data-action="delete" data-session-type-id="${type.id}">
                <span>Delete</span>
              </button>
            </div>
          </div>
        </td>
      </tr>
    `;
  }).join('');
  
  // Setup action menu handlers
  setupActionsMenuHandlers(sessionTypes);
}

// Setup action menu handlers
function setupActionsMenuHandlers(sessionTypes) {
  // Close all menus when clicking outside
  const closeMenusOnOutsideClick = (e) => {
    if (!e.target.closest('.actions-menu-container') && !e.target.closest('.actions-menu')) {
      document.querySelectorAll('.actions-menu').forEach(menu => {
        menu.style.display = 'none';
        menu.classList.remove('show');
      });
    }
  };
  
  // Remove any existing listeners to avoid duplicates
  document.removeEventListener('click', closeMenusOnOutsideClick);
  document.addEventListener('click', closeMenusOnOutsideClick);
  
  // Toggle menu on button click
  document.querySelectorAll('.actions-menu-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sessionTypeId = btn.dataset.sessionTypeId;
      const menu = document.getElementById(`actionsMenu_${sessionTypeId}`);
      
      if (!menu) return;
      
      // Close all other menus
      document.querySelectorAll('.actions-menu').forEach(m => {
        if (m.id !== menu.id) {
          m.style.display = 'none';
          m.classList.remove('show');
        }
      });
      
      // Toggle this menu
      const isVisible = menu.style.display === 'block' || menu.classList.contains('show');
      if (isVisible) {
        menu.style.display = 'none';
        menu.classList.remove('show');
      } else {
        // Close all other menus first
        document.querySelectorAll('.actions-menu').forEach(m => {
          if (m.id !== menu.id) {
            m.style.display = 'none';
            m.classList.remove('show');
          }
        });
        
        menu.style.display = 'block';
        menu.classList.add('show');
        
        // Position menu to the left of the button (right edge of menu aligns with right edge of button)
        menu.style.right = '0';
        menu.style.left = 'auto';
        menu.style.transform = 'translateX(calc(-100% + 32px))';
        
        // Position below button
        const rect = btn.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Check if menu would overflow bottom edge
        if (rect.bottom + 200 > viewportHeight) {
          menu.style.top = 'auto';
          menu.style.bottom = '100%';
          menu.style.marginTop = '0';
          menu.style.marginBottom = '4px';
        } else {
          menu.style.top = 'calc(100% + 4px)';
          menu.style.bottom = 'auto';
          menu.style.marginTop = '4px';
          menu.style.marginBottom = '0';
        }
      }
    });
  });
  
  // Handle menu item clicks
  document.querySelectorAll('.menu-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      const sessionTypeId = item.dataset.sessionTypeId;
      const sessionType = sessionTypes.find(st => st.id === sessionTypeId);
      
      if (!sessionType) return;
      
      // Close menu
      const menu = document.getElementById(`actionsMenu_${sessionTypeId}`);
      if (menu) {
        menu.style.display = 'none';
        menu.classList.remove('show');
      }
      
      switch (action) {
        case 'info':
          showSessionTypeInfo(sessionType);
          break;
        case 'edit':
          await editSessionType(sessionType);
          break;
        case 'duplicate':
          await duplicateSessionType(sessionType);
          break;
        case 'delete':
          await deleteSessionType(sessionType);
          break;
      }
    });
  });
}

// Show session type info
function showSessionTypeInfo(sessionType) {
  const info = `
    Name: ${sessionType.display_name || sessionType.name}
    Duration: ${sessionType.duration_minutes} minutes
    Color: ${sessionType.color || '#7ed321'}
    Active: ${sessionType.is_active ? 'Yes' : 'No'}
    Created: ${new Date(sessionType.created_at).toLocaleDateString()}
  `;
  alert(info);
}

// Edit session type
async function editSessionType(sessionType) {
  await showIndividualSessionConfig(sessionType.name, sessionType.id, sessionType);
}

// Duplicate session type
async function duplicateSessionType(sessionType) {
  if (!supabaseReady || !supabase) return;
  
  try {
    const { data: newType, error } = await supabase
      .from('individual_session_types')
      .insert({
        name: `${sessionType.name} (Copy)`,
        display_name: `${sessionType.display_name} (Copy)`,
        duration_minutes: sessionType.duration_minutes,
        color: sessionType.color,
        description: sessionType.description,
        general_availability: sessionType.general_availability,
        minimum_booking_notice_hours: sessionType.minimum_booking_notice_hours,
        buffer_before_minutes: sessionType.buffer_before_minutes,
        buffer_after_minutes: sessionType.buffer_after_minutes,
        time_slot_granularity_minutes: sessionType.time_slot_granularity_minutes,
        booking_confirmation_email_subject: sessionType.booking_confirmation_email_subject,
        booking_confirmation_email_body: sessionType.booking_confirmation_email_body,
        reminder_email_subject: sessionType.reminder_email_subject,
        reminder_email_body: sessionType.reminder_email_body,
        reminder_timing_hours: sessionType.reminder_timing_hours,
        is_active: true
      })
      .select()
      .single();
    
    if (error) {
      console.error('Error duplicating session type:', error);
      alert(`Error duplicating session type: ${error.message}`);
      return;
    }
    
    // Reload the table
    await loadIndividualSessionTypes();
    alert('Session type duplicated successfully!');
  } catch (error) {
    console.error('Error duplicating session type:', error);
    alert(`Error: ${error.message}`);
  }
}

// Delete session type
async function deleteSessionType(sessionType) {
  if (!confirm(`Are you sure you want to delete "${sessionType.display_name || sessionType.name}"? This action cannot be undone.`)) {
    return;
  }
  
  if (!supabaseReady || !supabase) return;
  
  try {
    // Soft delete by setting is_active to false
    const { error } = await supabase
      .from('individual_session_types')
      .update({ is_active: false })
      .eq('id', sessionType.id);
    
    if (error) {
      console.error('Error deleting session type:', error);
      alert(`Error deleting session type: ${error.message}`);
      return;
    }
    
    // Reload the table
    await loadIndividualSessionTypes();
    alert('Session type deleted successfully!');
  } catch (error) {
    console.error('Error deleting session type:', error);
    alert(`Error: ${error.message}`);
  }
}

// ============================================
// HELPER FUNCTIONS FOR INDIVIDUAL SESSIONS
// ============================================

// Abbreviate session type name (e.g., "Champions Player Progress (CPP)" -> "CPP")
function abbreviateSessionType(typeName) {
  if (!typeName) return typeName;
  
  // Check if there's an abbreviation in parentheses
  const match = typeName.match(/\(([^)]+)\)/);
  if (match) {
    return match[1]; // Return the abbreviation
  }
  
  // If no abbreviation, return first letters of each word
  return typeName
    .split(' ')
    .map(word => word.charAt(0).toUpperCase())
    .join('')
    .substring(0, 5); // Limit to 5 characters
}

// Convert hex color to RGB
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
}

// Show individual session details modal
async function showIndividualSessionDetails(session) {
  if (!session || !session.is_individual) return;
  
  // Get or create modal
  let modal = document.getElementById('individualSessionModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'individualSessionModal';
    modal.className = 'session-modal-overlay';
    modal.innerHTML = `
      <div class="session-modal">
        <div class="modal-header">
          <h3 class="modal-title" id="individualSessionModalTitle">Session Details</h3>
          <div style="display: flex; gap: 8px; align-items: center;">
            <div class="edit-btn-tooltip-container" style="position: relative;">
              <button class="modal-edit-btn" id="individualSessionEditBtn" type="button" style="display: flex;">
                <i class="bx bx-edit"></i>
              </button>
              <span class="edit-btn-tooltip" id="individualSessionEditTooltip">Edit in dashboard</span>
            </div>
            <button class="modal-close" id="individualSessionCloseBtn">
              <i class="bx bx-x"></i>
            </button>
          </div>
        </div>
        <div class="modal-content" id="individualSessionModalContent">
          <!-- Session card will be inserted here -->
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    
    // Setup close handlers
    const closeBtn = document.getElementById('individualSessionCloseBtn');
    if (closeBtn) {
      closeBtn.onclick = () => closeIndividualSessionModal();
    }
    
    modal.onclick = (e) => {
      if (e.target === modal) {
        closeIndividualSessionModal();
      }
    };
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && modal.classList.contains('show')) {
        closeIndividualSessionModal();
      }
    });
  }
  
  // Load player data and create reservations array
  const reservations = [];
  if (session.player) {
    reservations.push({
      id: session.id,
      player: session.player,
      reservation_status: 'reserved',
      checked_in_at: session.booking_data?.checked_in_at || null
    });
  }
  
  // Create staff profiles object
  const staffProfiles = {};
  if (session.coach) {
    staffProfiles[session.coach_id] = session.coach;
  }
  
  // Update modal title
  const modalTitle = document.getElementById('individualSessionModalTitle');
  if (modalTitle) {
    modalTitle.textContent = session.session_type || 'Session Details';
  }
  
  // Update tooltip with session type abbreviation
  const tooltip = document.getElementById('individualSessionEditTooltip');
  if (tooltip) {
    const sessionTypeAbbrev = session.session_type_abbrev || abbreviateSessionType(session.session_type) || 'session';
    tooltip.textContent = `Edit ${sessionTypeAbbrev} in dashboard`;
  }
  
  // Create session card (reuse logic from home.js)
  const sessionCard = createIndividualSessionCard(session, reservations, staffProfiles);
  const modalContent = document.getElementById('individualSessionModalContent');
  if (modalContent) {
    modalContent.innerHTML = sessionCard;
  }
  
  // Show modal
  modal.classList.add('show');
  document.body.style.overflow = 'hidden';
}

// Close individual session modal
function closeIndividualSessionModal() {
  const modal = document.getElementById('individualSessionModal');
  if (modal) {
    modal.classList.remove('show');
    document.body.style.overflow = '';
  }
}

// Create session card for individual sessions (similar to home.js)
function createIndividualSessionCard(session, reservations, staffProfiles = {}) {
  const timeStr = formatTimeForModal(session.session_time);
  const endTime = calculateEndTimeForModal(session.session_time, session.duration_minutes);
  const endTimeStr = formatTimeForModal(endTime);
  
  const location = 'Virtual Session';
  const locationIcon = 'bx-video';

  // Get staff members (coach)
  let staff = [];
  if (session.coach_id) {
    const coach = staffProfiles[session.coach_id] || session.coach;
    if (coach) {
      staff.push({
        ...coach,
        role: 'Coach',
        checkedIn: false
      });
    }
  }
  
  // Get players
  const players = reservations.map(res => ({
    ...res.player,
    reservation_status: res.reservation_status,
    reservation_id: res.id,
    checked_in_at: res.checked_in_at
  }));

  // Get coach name
  const coachName = session.coach
    ? `${session.coach.first_name || ''} ${session.coach.last_name || ''}`.trim() || 'Coach'
    : null;

  return `
    <div class="session-card" data-session-id="${session.id}">
      <div class="session-header">
        <div>
          <div class="session-time">${timeStr} - ${endTimeStr}</div>
          <div class="session-location">
            <i class="bx ${locationIcon}"></i>
            <span>${location}</span>
          </div>
        </div>
        <div class="session-capacity">${reservations.length} / ${session.attendance_limit || 1}</div>
      </div>

      ${staff.length > 0 ? `
        <div class="session-staff">
          ${staff.map(member => `
            <div class="staff-member" data-staff-id="${member.id}" data-staff-role="${member.role}">
              <div class="staff-avatar">
                ${getInitialsForModal(member.first_name, member.last_name)}
              </div>
              <div class="staff-info">
                <div class="staff-name">${member.first_name} ${member.last_name}</div>
                <div class="staff-role">${member.role}</div>
              </div>
              <button class="check-in-btn ${member.checkedIn ? 'checked-in' : ''}" 
                      data-staff-check-in="${member.id}"
                      ${member.checkedIn ? 'disabled' : ''}>
                ${member.checkedIn ? 'Checked In' : 'Check-in'}
              </button>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <div class="session-players">
        <div class="players-header">
          <div class="players-title">Players</div>
        </div>
        <div class="players-list" data-session-players="${session.id}">
          ${players.length > 0 ? players.map(player => createPlayerItemForModal(player)).join('') : '<div class="empty-state">No players reserved</div>'}
        </div>
      </div>
    </div>
  `;
}

// Helper functions for modal
function formatTimeForModal(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const min = minutes || '00';
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${min} ${period}`;
}

function calculateEndTimeForModal(startTime, durationMinutes) {
  if (!startTime || !durationMinutes) return startTime;
  const [hours, minutes] = startTime.split(':').map(Number);
  const startDate = new Date();
  startDate.setHours(hours, minutes, 0, 0);
  startDate.setMinutes(startDate.getMinutes() + durationMinutes);
  const endHours = String(startDate.getHours()).padStart(2, '0');
  const endMinutes = String(startDate.getMinutes()).padStart(2, '0');
  return `${endHours}:${endMinutes}`;
}

function getInitialsForModal(firstName, lastName) {
  const first = firstName ? firstName.charAt(0).toUpperCase() : '';
  const last = lastName ? lastName.charAt(0).toUpperCase() : '';
  return first + last || '?';
}

function createPlayerItemForModal(player) {
  if (!player) return '';
  
  const initials = getInitialsForModal(player.first_name, player.last_name);
  const positions = player.positions || [];
  const isCheckedIn = player.reservation_status === 'checked-in';
  
  return `
    <div class="player-item" 
         data-player-id="${player.id}"
         data-reservation-status="${player.reservation_status}"
         data-reservation-id="${player.reservation_id}">
      <div class="player-avatar">
        ${initials}
      </div>
      <div class="player-info">
        <span class="player-name">${player.first_name} ${player.last_name}</span>
        ${positions.length > 0 ? `
          <div class="player-positions">
            ${positions.map(pos => `<span class="position-badge">${pos}</span>`).join('')}
          </div>
        ` : ''}
      </div>
      <button class="player-check-in-btn ${isCheckedIn ? 'checked-in' : ''}"
              data-player-check-in="${player.id}"
              data-reservation-id="${player.reservation_id}"
              ${isCheckedIn ? 'disabled' : ''}>
        ${isCheckedIn ? 'Checked In' : 'Check-in'}
      </button>
    </div>
  `;
}

