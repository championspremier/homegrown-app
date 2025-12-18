// Schedule page scripts
import { initSupabase } from '../../../../auth/config/supabase.js';

let supabase;
let supabaseReady = false;
let currentSelectedDate = new Date();
let currentLocationType = null; // 'on-field' or 'virtual'
let currentFilterType = null; // 'Tec Tac', 'Speed Training', 'Strength & Conditioning', etc.
let currentWeekStart = new Date(); // Track current week start for navigation
let individualDatePickerWeekStart = new Date(); // Track week start for individual date picker
let coachCache = {}; // Cache for coach names to avoid repeated fetches
let currentSessionTypeData = null; // Store current session type data for date handlers
let currentCoachAvailability = []; // Store current coach availability for date handlers

// Initialize Supabase
async function init() {
  supabase = await initSupabase();
  if (supabase) {
    supabaseReady = true;
    setupEventListeners();
    updateCalendarHeaders();
  } else {
    console.error('Failed to initialize Supabase');
  }
}

// Setup event listeners
function setupEventListeners() {
  const onFieldOption = document.getElementById('onFieldOption');
  const onFieldHeader = document.getElementById('onFieldHeader');
  const onFieldDropdown = document.getElementById('onFieldDropdown');
  
  const virtualOption = document.getElementById('virtualOption');
  const virtualHeader = document.getElementById('virtualHeader');
  const virtualDropdown = document.getElementById('virtualDropdown');

  // Toggle On-Field dropdown
  if (onFieldHeader && onFieldDropdown) {
    onFieldHeader.addEventListener('click', async (e) => {
      e.stopPropagation();
      const isOpen = onFieldOption.classList.contains('is-open');
      
      // Close virtual if it's open
      if (virtualOption.classList.contains('is-open')) {
        virtualOption.classList.remove('is-open');
        currentLocationType = null;
        // Clean up virtual content when switching away
        cleanupVirtualContent();
      }
      
      // Toggle on-field
      if (isOpen) {
        onFieldOption.classList.remove('is-open');
        currentLocationType = null;
        currentFilterType = null;
      } else {
        onFieldOption.classList.add('is-open');
        currentLocationType = 'on-field';
        currentSelectedDate = new Date(); // Reset to today
        currentFilterType = null;
        // Show filter buttons and calendar
        const filters = document.getElementById('onFieldFilters');
        const calendar = document.getElementById('onFieldCalendarHeader');
        const sessionsList = document.getElementById('onFieldSessionsList');
        const upcomingList = document.getElementById('onFieldUpcomingSessions');
        if (filters) filters.style.display = 'flex';
        if (calendar) calendar.style.display = 'block';
        if (sessionsList) sessionsList.style.display = 'none';
        if (upcomingList) upcomingList.style.display = 'none';
        updateCalendarHeaders();
        await loadAndDisplaySessions('on-field');
      }
    });
  }

  // Toggle Virtual dropdown
  if (virtualHeader && virtualDropdown) {
    virtualHeader.addEventListener('click', async (e) => {
      e.stopPropagation();
      const isOpen = virtualOption.classList.contains('is-open');
      
      // Close on-field if it's open
      if (onFieldOption.classList.contains('is-open')) {
        onFieldOption.classList.remove('is-open');
        currentLocationType = null;
      }
      
      // Toggle virtual
      if (isOpen) {
        virtualOption.classList.remove('is-open');
        currentLocationType = null;
        currentFilterType = null;
        // Clean up virtual content when closing
        cleanupVirtualContent();
      } else {
        virtualOption.classList.add('is-open');
        currentLocationType = 'virtual';
        currentSelectedDate = new Date(); // Reset to today
        currentFilterType = null;
        
        // Clean up any existing virtual content first
        cleanupVirtualContent();
        
        // Show filter buttons only (don't show calendar/sessions until filter is selected)
        const filters = document.getElementById('virtualFilters');
        if (filters) {
          filters.style.display = 'flex';
          // Reset filter buttons
          filters.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        }
        
        // Hide calendar and sessions list initially
        const calendar = document.getElementById('virtualCalendarHeader');
        const sessionsList = document.getElementById('virtualSessionsList');
        const upcomingList = document.getElementById('virtualUpcomingSessions');
        if (calendar) calendar.style.display = 'none';
        if (sessionsList) sessionsList.style.display = 'none';
        if (upcomingList) upcomingList.style.display = 'none';
        
        updateCalendarHeaders();
        // Don't auto-load sessions - wait for filter selection
      }
    });
  }

  // Calendar day click handlers
  setupCalendarDayHandlers('onFieldCalendarHeader', 'on-field');
  setupCalendarDayHandlers('virtualCalendarHeader', 'virtual');
  
  // Filter button handlers
  setupFilterButtons('onFieldFilters', 'on-field');
  setupFilterButtons('virtualFilters', 'virtual');
  
  // Calendar navigation handlers
  setupCalendarNavigation('onFieldPrevWeek', 'onFieldNextWeek', 'onFieldCalendarHeader', 'on-field');
  setupCalendarNavigation('virtualPrevWeek', 'virtualNextWeek', 'virtualCalendarHeader', 'virtual');
}

// Define which sessions are group vs individual
const GROUP_SESSIONS = ['Group Film-Analysis', 'Pro Player Stories (PPS)'];
const INDIVIDUAL_SESSIONS = [
  'Champions Player Progress (CPP)',
  'College Advising',
  'Psychologist',
  'Free Nutrition Consultation'
];

// Cleanup function for virtual content
function cleanupVirtualContent() {
  // Remove individual session booking container
  const existingContainer = document.getElementById('virtualContentContainer');
  if (existingContainer) {
    existingContainer.remove();
  }
  
  // Hide calendar and sessions list
  const calendar = document.getElementById('virtualCalendarHeader');
  const sessionsList = document.getElementById('virtualSessionsList');
  const upcomingList = document.getElementById('virtualUpcomingSessions');
  
  if (calendar) calendar.style.display = 'none';
  if (sessionsList) sessionsList.style.display = 'none';
  if (upcomingList) upcomingList.style.display = 'none';
  
  // Reset selected coach
  selectedCoachId = null;
  currentIndividualSessionType = null;
}

// Setup filter button handlers
function setupFilterButtons(filtersId, locationType) {
  const filters = document.getElementById(filtersId);
  if (!filters) return;
  
  const filterButtons = filters.querySelectorAll('.filter-btn');
  filterButtons.forEach(btn => {
    btn.addEventListener('click', async () => {
      const sessionType = btn.dataset.type;
      
      // Update active state
      filterButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      
      currentFilterType = sessionType;
      
      // Check if this is a group or individual session
      const isGroupSession = GROUP_SESSIONS.includes(sessionType);
      const isIndividualSession = INDIVIDUAL_SESSIONS.includes(sessionType);
      
      // For virtual sessions, populate content right underneath filters
      if (locationType === 'virtual') {
        if (isIndividualSession) {
          // Show individual session booking interface underneath filters
          await showIndividualSessionBooking(sessionType, filters);
        } else if (isGroupSession) {
          // Show regular calendar schedule for group sessions underneath filters
          await showGroupSessionSchedule(locationType, sessionType, filters);
        } else {
          // Other virtual sessions - show upcoming sessions underneath filters
          await showUpcomingSessionsUnderFilters(locationType, sessionType, filters);
        }
      } else {
        // On-field sessions - show upcoming sessions
        const calendarId = locationType === 'on-field' ? 'onFieldCalendarHeader' : 'virtualCalendarHeader';
        const sessionsListId = locationType === 'on-field' ? 'onFieldSessionsList' : 'virtualSessionsList';
        const upcomingListId = locationType === 'on-field' ? 'onFieldUpcomingSessions' : 'virtualUpcomingSessions';
        
        const calendar = document.getElementById(calendarId);
        const sessionsList = document.getElementById(sessionsListId);
        const upcomingList = document.getElementById(upcomingListId);
        
        if (calendar) calendar.style.display = 'none';
        if (sessionsList) sessionsList.style.display = 'none';
        if (upcomingList) {
          upcomingList.style.display = 'flex';
          await loadUpcomingSessions(locationType, sessionType);
        }
      }
    });
  });
}

// Setup calendar navigation
function setupCalendarNavigation(prevBtnId, nextBtnId, headerId, locationType) {
  const prevBtn = document.getElementById(prevBtnId);
  const nextBtn = document.getElementById(nextBtnId);
  
  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event bubbling
      navigateWeek(headerId, locationType, -1);
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent event bubbling
      navigateWeek(headerId, locationType, 1);
    });
  }
}

// Navigate to previous/next week
function navigateWeek(headerId, locationType, direction) {
  // Calculate max weeks forward (4 weeks)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + (4 * 7)); // 4 weeks from today
  
  // Get current week start
  const newWeekStart = new Date(currentWeekStart);
  newWeekStart.setDate(currentWeekStart.getDate() + (direction * 7));
  
  // Check if we're going forward beyond 4 weeks
  if (direction > 0) {
    const weekEnd = new Date(newWeekStart);
    weekEnd.setDate(newWeekStart.getDate() + 6);
    if (weekEnd > maxDate) {
      return; // Don't navigate beyond 4 weeks
    }
  }
  
  currentWeekStart = newWeekStart;
  updateSingleCalendarHeader(headerId, newWeekStart);
  
  // Update navigation button states
  updateNavigationButtons(headerId, locationType);
  
  // Reload sessions for the new week's selected date
  if (currentLocationType === locationType) {
    const selectedDay = currentSelectedDate.getDay();
    const newSelectedDate = new Date(newWeekStart);
    newSelectedDate.setDate(newWeekStart.getDate() + selectedDay);
    currentSelectedDate = newSelectedDate;
    updateSelectedDay(headerId, selectedDay);
    loadAndDisplaySessions(locationType, newSelectedDate);
  }
}

// Update navigation button states (disable/enable based on limits)
function updateNavigationButtons(headerId, locationType) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + (4 * 7)); // 4 weeks from today
  
  const weekEnd = new Date(currentWeekStart);
  weekEnd.setDate(currentWeekStart.getDate() + 6);
  
  const prevBtnId = locationType === 'on-field' ? 'onFieldPrevWeek' : 'virtualPrevWeek';
  const nextBtnId = locationType === 'on-field' ? 'onFieldNextWeek' : 'virtualNextWeek';
  
  const prevBtn = document.getElementById(prevBtnId);
  const nextBtn = document.getElementById(nextBtnId);
  
  // Next button disabled if we're at 4 weeks limit
  if (nextBtn) {
    if (weekEnd >= maxDate) {
      nextBtn.disabled = true;
    } else {
      nextBtn.disabled = false;
    }
  }
  
  // Previous button is never disabled (unlimited backward)
  if (prevBtn) {
    prevBtn.disabled = false;
  }
}

// Setup calendar day click handlers
function setupCalendarDayHandlers(headerId, locationType) {
  const header = document.getElementById(headerId);
  if (!header) return;
  
  const dayNumbers = header.querySelectorAll('.day-number');
  dayNumbers.forEach(dayNumberEl => {
    dayNumberEl.addEventListener('click', async () => {
      const calendarDay = dayNumberEl.closest('.calendar-day');
      if (!calendarDay) return;
      
      const dayOfWeek = parseInt(calendarDay.dataset.day);
      // Calculate date based on current week start
      const selectedDate = new Date(currentWeekStart);
      selectedDate.setDate(currentWeekStart.getDate() + dayOfWeek);
      
      currentSelectedDate = selectedDate;
      updateSelectedDay(headerId, dayOfWeek);
      await loadAndDisplaySessions(locationType, selectedDate);
    });
  });
}

// Update calendar headers with current week dates
function updateCalendarHeaders() {
  const today = new Date();
  const currentDay = today.getDay();
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - currentDay); // Start from Sunday
  weekStart.setHours(0, 0, 0, 0);
  
  currentWeekStart = weekStart;
  
  // Update both calendar headers
  updateSingleCalendarHeader('onFieldCalendarHeader', weekStart);
  updateSingleCalendarHeader('virtualCalendarHeader', weekStart);
  
  // Update navigation buttons
  updateNavigationButtons('onFieldCalendarHeader', 'on-field');
  updateNavigationButtons('virtualCalendarHeader', 'virtual');
}

// Update a single calendar header
function updateSingleCalendarHeader(headerId, weekStart) {
  const header = document.getElementById(headerId);
  if (!header) return;
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Check if mobile (iPhone size)
  const isMobile = window.innerWidth <= 428;
  const dayLabels = isMobile 
    ? ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'S']  // Shortened for mobile
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];  // Full for desktop
  
  const dayElements = header.querySelectorAll('.calendar-day');
  dayElements.forEach((dayEl, index) => {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + index);
    date.setHours(0, 0, 0, 0);
    const dayNumber = date.getDate();
    const dayNumberEl = dayEl.querySelector('.day-number');
    const dayLabelEl = dayEl.querySelector('.day-label');
    
    if (dayLabelEl) {
      dayLabelEl.textContent = dayLabels[index];
    }
    
    if (dayNumberEl) {
      dayNumberEl.textContent = dayNumber;
    }
    
    // Style past dates with muted color
    if (date < today) {
      dayEl.classList.add('past');
      if (dayLabelEl) dayLabelEl.style.color = 'var(--muted)';
      if (dayNumberEl) dayNumberEl.style.color = 'var(--muted)';
    } else {
      dayEl.classList.remove('past');
      if (dayLabelEl) dayLabelEl.style.color = '';
      if (dayNumberEl) dayNumberEl.style.color = '';
    }
    
    // Highlight today
    if (date.toDateString() === today.toDateString()) {
      dayEl.classList.add('today');
      if (index === 0) {
        // Also highlight Sunday if it's today
        updateSelectedDay(headerId, today.getDay());
      }
    } else {
      dayEl.classList.remove('today');
    }
  });
}

// Update selected day highlight
function updateSelectedDay(headerId, dayOfWeek) {
  const header = document.getElementById(headerId);
  if (!header) return;
  
  const dayNumbers = header.querySelectorAll('.day-number');
  dayNumbers.forEach(dayNumberEl => {
    dayNumberEl.classList.remove('selected');
    const calendarDay = dayNumberEl.closest('.calendar-day');
    if (calendarDay && parseInt(calendarDay.dataset.day) === dayOfWeek) {
      dayNumberEl.classList.add('selected');
    }
  });
}

// Clear coach cache for specific coach IDs or all if none provided
function clearCoachCache(coachIds = null) {
  if (coachIds === null) {
    // Clear entire cache
    coachCache = {};
  } else {
    // Clear cache for specific coach IDs
    if (Array.isArray(coachIds)) {
      coachIds.forEach(id => delete coachCache[id]);
    } else {
      delete coachCache[coachIds];
    }
  }
}

// Load and display sessions
async function loadAndDisplaySessions(locationType, selectedDate = null, customSessionsListId = null, customHeaderId = null) {
  if (!supabaseReady || !supabase) return;
  
  const dateToShow = selectedDate || currentSelectedDate || new Date();
  const dateString = dateToShow.toISOString().split('T')[0];
  
  try {
    // Load sessions for the selected date and location type
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('location_type', locationType)
      .eq('session_date', dateString)
      .eq('status', 'scheduled')
      .order('session_time', { ascending: true });

    if (error) {
      console.error('Error loading sessions:', error);
      return;
    }
    
    // Clear coach cache to ensure fresh data (coach might have changed)
    // This ensures updated coach names are displayed
    if (sessions && sessions.length > 0) {
      const coachIds = sessions.map(s => s.coach_id).filter(Boolean);
      clearCoachCache(coachIds); // Clear cache for coaches in current sessions
    }
    
    // Debug: Log sessions to verify coach_id is present
    if (sessions && sessions.length > 0) {
      console.log('Loaded sessions:', sessions.map(s => ({
        id: s.id,
        session_type: s.session_type,
        coach_id: s.coach_id
      })));
    }

    // Display sessions
    const containerId = locationType === 'on-field' ? 'onFieldSessionsList' : (customSessionsListId || 'virtualSessionsList');
    const headerId = locationType === 'on-field' ? 'onFieldCalendarHeader' : (customHeaderId || 'virtualCalendarHeader');
    const dateDisplayId = locationType === 'on-field' ? 'onFieldSelectedDate' : 'virtualSelectedDate';
    
    await displaySessions(sessions || [], containerId, dateDisplayId, dateToShow, locationType);
    
    // Show calendar header and sessions list
    const header = document.getElementById(headerId);
    const sessionsList = document.getElementById(containerId);
    if (header) header.style.display = 'block';
    if (sessionsList) sessionsList.style.display = 'block';
    
    // Update selected date display
    updateSelectedDateDisplay(dateDisplayId, dateToShow);
    
    // Highlight selected day
    updateSelectedDay(headerId, dateToShow.getDay());
    
  } catch (error) {
    console.error('Error loading sessions:', error);
  }
}

// Display sessions in the list
async function displaySessions(sessions, containerId, dateDisplayId, selectedDate, locationType = null) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  // Determine locationType from containerId if not provided
  if (!locationType) {
    if (containerId.includes('onField')) {
      locationType = 'on-field';
    } else if (containerId.includes('virtual')) {
      locationType = 'virtual';
    }
  }
  
  container.innerHTML = '';
  
  if (locationType === 'on-field') {
    if (sessions.length === 0) {
      container.innerHTML = '<div class="nonFieldSessionsList">No sessions scheduled for this day. Check Virtual Sessions for available options.</div>';
      return;
    }
  } else if (locationType === 'virtual') {
    if (sessions.length === 0) {
      container.innerHTML = '<div class="virtualSessionsList">No sessions scheduled for this day.</div>';
      return;
    }
  }
  
  
  // Create all session elements in parallel
  const sessionElements = await Promise.all(
    sessions.map(session => createSessionElement(session, selectedDate))
  );
  
  sessionElements.forEach(sessionEl => {
    container.appendChild(sessionEl);
  });
}

// Create a session element
async function createSessionElement(session, selectedDate) {
  const sessionEl = document.createElement('div');
  sessionEl.className = 'session-item';
  sessionEl.dataset.sessionId = session.id;
  
  // Format time
  const time = new Date(`2000-01-01T${session.session_time}`);
  const timeString = time.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  // Get coach name - always fetch manually since relationship isn't loading
  let coachName = 'Coach';
  if (session.coach_id) {
    coachName = await fetchCoachName(session.coach_id);
  }
  
  // Calculate spots left
  const spotsLeft = session.attendance_limit - (session.current_reservations || 0);
  const isAvailable = spotsLeft > 0;
  
  // Get location or description
  const locationText = session.location_type === 'on-field' 
    ? (session.location || 'Location TBD')
    : (session.session_type || 'Virtual Session');
  
  // Calculate end time
  const startTime = new Date(`2000-01-01T${session.session_time}`);
  const endTime = new Date(startTime.getTime() + (session.duration_minutes || 90) * 60000);
  const endTimeString = endTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  sessionEl.innerHTML = `
    <div class="session-content">
      <div class="session-time">${timeString} – ${endTimeString}</div>
      <div class="session-title">${session.session_type || 'Session'}</div>
      <div class="session-details">
        <i class="bx bx-map"></i>
        <span>${locationText}</span>
      </div>
      <div class="session-coach">
        <i class="bx bx-user"></i>
        <span>${coachName}</span>
      </div>
      <div class="session-spots">
        <i class="bx bx-group"></i>
        <span>${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left</span>
      </div>
    </div>
    <div class="session-badge ${isAvailable ? 'available' : 'full'}">
      ${isAvailable ? 'AVAILABLE' : 'FULL'}
    </div>
    <button class="session-reserve-btn" type="button">Reserve</button>
  `;
  
  // Add click handler to show session details
  sessionEl.addEventListener('click', (e) => {
    // Don't trigger if clicking the reserve button
    if (e.target.closest('.session-reserve-btn')) {
      e.stopPropagation();
      handleReserveClick(session);
      return;
    }
    showSessionDetails(session);
  });
  
  return sessionEl;
}

// Load upcoming sessions for a filter type
async function loadUpcomingSessions(locationType, sessionType, customContainerId = null) {
  if (!supabaseReady || !supabase) return;
  
  try {
    const today = new Date();
    const todayString = today.toISOString().split('T')[0];
    
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('location_type', locationType)
      .eq('session_type', sessionType)
      .eq('status', 'scheduled')
      .gte('session_date', todayString)
      .order('session_date', { ascending: true })
      .order('session_time', { ascending: true })
      .limit(4); // Limit to next 4 sessions
    
    if (error) {
      console.error('Error loading upcoming sessions:', error);
      return;
    }
    
    // Clear coach cache to ensure fresh data (coach might have changed)
    if (sessions && sessions.length > 0) {
      const coachIds = sessions.map(s => s.coach_id).filter(Boolean);
      clearCoachCache(coachIds); // Clear cache for coaches in current sessions
    }
    
    const containerId = customContainerId || (locationType === 'on-field' ? 'onFieldUpcomingSessions' : 'virtualUpcomingSessions');
    await displayUpcomingSessions(sessions || [], containerId);
  } catch (error) {
    console.error('Error loading upcoming sessions:', error);
  }
}

// Display upcoming sessions in a row
async function displayUpcomingSessions(sessions, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  if (sessions.length === 0) {
    container.innerHTML = '<div class="no-sessions">No upcoming sessions of this type.</div>';
    return;
  }
  
  // Create all session elements in parallel
  const sessionElements = await Promise.all(
    sessions.map(session => createUpcomingSessionElement(session))
  );
  
  sessionElements.forEach(sessionEl => {
    container.appendChild(sessionEl);
  });
}

// Create a compact session element for upcoming sessions row
async function createUpcomingSessionElement(session) {
  const sessionEl = document.createElement('div');
  sessionEl.className = 'upcoming-session-item';
  
  // Format time
  const time = new Date(`2000-01-01T${session.session_time}`);
  const timeString = time.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  // Calculate end time
  const startTime = new Date(`2000-01-01T${session.session_time}`);
  const endTime = new Date(startTime.getTime() + (session.duration_minutes || 90) * 60000);
  const endTimeString = endTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  // Format date
  const sessionDate = new Date(session.session_date);
  const dateString = sessionDate.toLocaleDateString('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric' 
  });
  
  // Get coach name - always fetch manually since relationship isn't loading
  let coachName = 'Coach';
  if (session.coach_id) {
    coachName = await fetchCoachName(session.coach_id);
  }
  
  // Calculate spots left
  const spotsLeft = session.attendance_limit - (session.current_reservations || 0);
  const isAvailable = spotsLeft > 0;
  
  // Get location
  const locationText = session.location_type === 'on-field' 
    ? (session.location || 'Location TBD')
    : 'Virtual Session';
  
  sessionEl.innerHTML = `
    <div class="upcoming-session-content">
      <div class="upcoming-session-date">${dateString}</div>
      <div class="upcoming-session-time">${timeString} – ${endTimeString}</div>
      <div class="upcoming-session-title">${session.session_type || 'Session'}</div>
      <div class="upcoming-session-location">
        <i class="bx bx-map"></i>
        <span>${locationText}</span>
      </div>
      <div class="upcoming-session-coach">
        <i class="bx bx-user"></i>
        <span>${coachName}</span>
      </div>
      <div class="upcoming-session-spots">
        <i class="bx bx-group"></i>
        <span>${spotsLeft} spot${spotsLeft !== 1 ? 's' : ''} left</span>
      </div>
    </div>
    <div class="upcoming-session-badge ${isAvailable ? 'available' : 'full'}">
      ${isAvailable ? 'AVAILABLE' : 'FULL'}
    </div>
    <button class="upcoming-session-reserve-btn" type="button">Reserve</button>
  `;
  
  // Add click handler for reserve button
  const reserveBtn = sessionEl.querySelector('.upcoming-session-reserve-btn');
  if (reserveBtn) {
    reserveBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      handleReserveClick(session);
    });
  }
  
  // Add click handler to show session details
  sessionEl.addEventListener('click', (e) => {
    // Don't trigger if clicking the reserve button or badge
    if (!e.target.closest('.upcoming-session-reserve-btn') && 
        !e.target.closest('.upcoming-session-badge')) {
      e.preventDefault();
      e.stopPropagation();
      showSessionDetails(session);
    }
  });
  
  return sessionEl;
}

// Show session details modal
async function showSessionDetails(session) {
  const overlay = document.getElementById('sessionModalOverlay');
  const body = document.getElementById('sessionModalBody');
  if (!overlay || !body) return;
  
  // Format time
  const time = new Date(`2000-01-01T${session.session_time}`);
  const timeString = time.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  // Calculate end time
  const startTime = new Date(`2000-01-01T${session.session_time}`);
  const endTime = new Date(startTime.getTime() + (session.duration_minutes || 90) * 60000);
  const endTimeString = endTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
  
  // Format date
  const sessionDate = new Date(session.session_date);
  const dateString = sessionDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    month: 'long', 
    day: 'numeric' 
  });
  
  // Get coach name - always fetch manually since relationship isn't loading
  let coachName = 'Coach';
  if (session.coach_id) {
    coachName = await fetchCoachName(session.coach_id);
  }
  
  // Calculate spots left
  const spotsLeft = session.attendance_limit - (session.current_reservations || 0);
  const isAvailable = spotsLeft > 0;
  
  // Get location
  const locationText = session.location_type === 'on-field' 
    ? (session.location || 'Location TBD')
    : 'Virtual Session';
  
  body.innerHTML = `
    <div class="session-detail-header">
      <div class="session-detail-type">Class</div>
      <div class="session-detail-title">${session.session_type || 'Session'}</div>
    </div>
    
    <div class="session-detail-info">
      <div class="detail-row">
        <div class="detail-item">
          <i class="bx bx-time"></i>
          <span>${timeString} – ${endTimeString}</span>
        </div>
        <div class="detail-item">
          <i class="bx bx-calendar"></i>
          <span>${dateString}</span>
        </div>
      </div>
      <div class="detail-row">
        <div class="detail-item">
          <i class="bx bx-timer"></i>
          <span>${session.duration_minutes || 90} MIN</span>
        </div>
        <div class="detail-item">
          <i class="bx bx-map"></i>
          <span>${locationText}</span>
        </div>
      </div>
    </div>
    
    <div class="session-detail-coaches">
      <div class="coach-item">
        <div class="coach-label">Coach</div>
        <div class="coach-info">
          <div class="coach-avatar">${coachName.split(' ').map(n => n[0]).join('').toUpperCase()}</div>
          <span>${coachName}</span>
        </div>
      </div>
    </div>
    
    <div class="session-detail-policies">
      <div class="policy-item">
        <span class="policy-label">Reservation closes:</span>
        <span class="policy-value">At class start time</span>
      </div>
      <div class="policy-item">
        <span class="policy-label">Late cancel:</span>
        <span class="policy-value">Begins at class start time</span>
      </div>
    </div>
    
    ${session.description ? `
    <div class="session-detail-description">
      <div class="description-label">Description</div>
      <div class="description-text">${session.description}</div>
    </div>
    ` : ''}
    
    <div class="session-detail-footer">
      <div class="session-detail-spots">${spotsLeft} spots left</div>
      <button class="session-detail-reserve-btn" type="button">Reserve</button>
    </div>
  `;
  
  overlay.style.display = 'flex';
  
  // Add close handler
  const closeBtn = document.getElementById('sessionModalClose');
  const reserveBtn = body.querySelector('.session-detail-reserve-btn');
  
  if (closeBtn) {
    closeBtn.onclick = () => {
      overlay.style.display = 'none';
    };
  }
  
  if (reserveBtn) {
    reserveBtn.onclick = () => {
      handleReserveClick(session);
    };
  }
  
  // Close on overlay click
  overlay.onclick = (e) => {
    if (e.target === overlay) {
      overlay.style.display = 'none';
    }
  };
}

// Fetch coach name by ID (fallback when relationship doesn't load)
async function fetchCoachName(coachId) {
  if (!coachId || !supabaseReady || !supabase) return 'Coach';
  
  // Check cache first
  if (coachCache[coachId]) {
    return coachCache[coachId];
  }
  
  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('first_name, last_name')
      .eq('id', coachId)
      .single();
    
    if (error) {
      console.error('Error fetching coach profile:', error);
      return 'Coach';
    }
    
    if (profile) {
      const firstName = profile.first_name || '';
      const lastName = profile.last_name || '';
      const coachName = `${firstName} ${lastName}`.trim() || firstName || lastName || 'Coach';
      coachCache[coachId] = coachName; // Cache it
      return coachName;
    }
  } catch (error) {
    console.error('Error fetching coach name:', error);
  }
  
  return 'Coach';
}

// Handle reserve button click
function handleReserveClick(session) {
  // TODO: Implement reservation logic
  console.log('Reserve clicked for session:', session.id);
  alert('Reservation functionality will be implemented soon!');
}

// Update selected date display
function updateSelectedDateDisplay(displayId, date) {
  const display = document.getElementById(displayId);
  if (!display) return;
  
  const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const dateString = date.toLocaleDateString('en-US', options);
  display.textContent = dateString;
}

// Show upcoming sessions underneath filters
async function showUpcomingSessionsUnderFilters(locationType, sessionType, filtersContainer) {
  // Remove any existing content containers (individual sessions or other content)
  const existingContainer = document.getElementById('virtualContentContainer');
  if (existingContainer) {
    existingContainer.remove();
  }
  
  // Hide existing calendar and sessions list if visible
  const calendar = document.getElementById('virtualCalendarHeader');
  const sessionsList = document.getElementById('virtualSessionsList');
  if (calendar) calendar.style.display = 'none';
  if (sessionsList) sessionsList.style.display = 'none';
  
  // Create content container right after filters
  const contentContainer = document.createElement('div');
  contentContainer.id = 'virtualContentContainer';
  contentContainer.className = 'virtual-content-container';
  
  // Insert after filters
  if (filtersContainer && filtersContainer.parentNode) {
    filtersContainer.parentNode.insertBefore(contentContainer, filtersContainer.nextSibling);
  }
  
  // Create upcoming sessions container
  const upcomingContainer = document.createElement('div');
  upcomingContainer.className = 'upcoming-sessions-list';
  upcomingContainer.id = 'virtualUpcomingSessionsInline';
  contentContainer.appendChild(upcomingContainer);
  
  // Load and display upcoming sessions
  await loadUpcomingSessions(locationType, sessionType, 'virtualUpcomingSessionsInline');
}

// Show group session schedule (regular calendar view) underneath filters
async function showGroupSessionSchedule(locationType, sessionType, filtersContainer) {
  // Remove any existing individual session content containers
  const existingContainer = document.getElementById('virtualContentContainer');
  if (existingContainer) {
    existingContainer.remove();
  }
  
  // Use existing calendar header and sessions list elements
  const calendar = document.getElementById('virtualCalendarHeader');
  const sessionsList = document.getElementById('virtualSessionsList');
  const upcomingList = document.getElementById('virtualUpcomingSessions');
  
  // Hide upcoming sessions if visible
  if (upcomingList) upcomingList.style.display = 'none';
  
  // Show existing calendar header
  if (calendar) {
    calendar.style.display = 'block';
    updateCalendarHeaders('virtualCalendarHeader');
  }
  
  // Show existing sessions list
  if (sessionsList) {
    sessionsList.style.display = 'block';
  }
  
  // Load and display sessions for today using existing elements
  await loadAndDisplaySessions(locationType, new Date());
}

// Show individual session booking interface underneath filters
async function showIndividualSessionBooking(sessionType, filtersContainer) {
  // Reset selected coach when switching sessions
  selectedCoachId = null;
  
  // Hide existing calendar and sessions list (only used for group sessions)
  const calendar = document.getElementById('virtualCalendarHeader');
  const sessionsList = document.getElementById('virtualSessionsList');
  const upcomingList = document.getElementById('virtualUpcomingSessions');
  
  if (calendar) calendar.style.display = 'none';
  if (sessionsList) sessionsList.style.display = 'none';
  if (upcomingList) upcomingList.style.display = 'none';
  
  // Remove any existing content containers
  const existingContainer = document.getElementById('virtualContentContainer');
  if (existingContainer) {
    existingContainer.remove();
  }
  
  // Create content container right after filters
  const contentContainer = document.createElement('div');
  contentContainer.id = 'virtualContentContainer';
  contentContainer.className = 'virtual-content-container';
  
  // Insert after filters
  if (filtersContainer && filtersContainer.parentNode) {
    filtersContainer.parentNode.insertBefore(contentContainer, filtersContainer.nextSibling);
  }
  
  // Create individual booking container with row layout
  const bookingContainer = document.createElement('div');
  bookingContainer.id = 'individualSessionBooking';
  bookingContainer.className = 'individual-session-booking';
  contentContainer.appendChild(bookingContainer);
  
  await renderIndividualSessionBooking(sessionType, bookingContainer);
}

// Render individual session booking interface (row layout)
async function renderIndividualSessionBooking(sessionType, container) {
  // Row layout with header and content side by side
  container.innerHTML = `
    <div class="individual-booking-row">
      <div class="individual-booking-header">
        <h2>${sessionType}</h2>
      </div>
      <div class="individual-booking-content">
        <div class="staff-selection">
          <label>Choose staff.</label>
          <div class="staff-input" id="staffSelector">
            <i class="bx bx-user"></i>
            <span>Any available</span>
            <i class="bx bx-chevron-down"></i>
          </div>
        </div>
        <div class="date-selection" id="individualDatePicker"></div>
        <div class="time-slots" id="individualTimeSlots"></div>
      </div>
    </div>
    <div class="individual-booking-footer" id="individualBookingFooter" style="display: none;">
      <div class="booking-summary" id="bookingSummary"></div>
      <button class="confirm-btn" id="confirmBookingBtn">Confirm</button>
    </div>
  `;
  
  // Setup event listeners
  setupIndividualBookingListeners(sessionType);
  
  // Load available coaches and time slots
  await loadIndividualSessionAvailability(sessionType);
}

// Setup event listeners for individual booking
function setupIndividualBookingListeners(sessionType) {
  const staffSelector = document.getElementById('staffSelector');
  const confirmBtn = document.getElementById('confirmBookingBtn');
  
  if (staffSelector) {
    staffSelector.addEventListener('click', () => {
      showCoachSelectionModal(sessionType);
    });
  }
  
  if (confirmBtn) {
    confirmBtn.addEventListener('click', () => {
      handleIndividualBookingConfirmation(sessionType);
    });
  }
}

// Store selected coach and session type for booking
let selectedCoachId = null;
let currentIndividualSessionType = null;

// Load individual session availability
async function loadIndividualSessionAvailability(sessionType) {
  if (!supabaseReady || !supabase) return;
  
  currentIndividualSessionType = sessionType;
  
  try {
    // First, get the session type ID from the database
    const { data: sessionTypeData, error: typeError } = await supabase
      .from('individual_session_types')
      .select('id, name, duration_minutes, time_slot_granularity_minutes, general_availability, buffer_before_minutes, buffer_after_minutes')
      .eq('name', sessionType)
      .eq('is_active', true)
      .maybeSingle(); // Use maybeSingle instead of single to handle 0 rows gracefully
    
    if (typeError) {
      console.error('Error loading session type:', typeError);
      alert(`Error loading session type: ${typeError.message}. Please ensure the session type exists and is active.`);
      return;
    }
    
    if (!sessionTypeData) {
      console.error('Session type not found:', sessionType);
      alert(`Session type "${sessionType}" not found or is not active. Please create it in the coach schedule first.`);
      return;
    }
    
    // Load coaches who have availability for this session type
    const { data: coachAvailability, error: coachError } = await supabase
      .from('coach_individual_availability')
      .select(`
        id,
        coach_id,
        availability,
        is_available,
        coach:profiles!coach_individual_availability_coach_id_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .eq('session_type_id', sessionTypeData.id)
      .eq('is_available', true);
    
    if (coachError) {
      console.error('Error loading coach availability:', coachError);
      console.error('Coach availability error details:', {
        message: coachError.message,
        code: coachError.code,
        details: coachError.details,
        hint: coachError.hint
      });
    } else {
      console.log('Loaded coach availability for', sessionType, ':', coachAvailability);
      console.log('Number of coaches with availability:', coachAvailability?.length || 0);
    }
    
    // Store session type data and coach availability globally
    currentSessionTypeData = sessionTypeData;
    currentCoachAvailability = coachAvailability || [];
    
    // Store session type data and coach availability globally
    currentSessionTypeData = sessionTypeData;
    currentCoachAvailability = coachAvailability || [];
    
    // Render date picker and time slots
    await renderDatePickerAndTimeSlots(sessionTypeData, sessionType, coachAvailability || []);
    
  } catch (error) {
    console.error('Error loading individual session availability:', error);
    const timeSlots = document.getElementById('individualTimeSlots');
    if (timeSlots) {
      timeSlots.innerHTML = '<div class="no-slots">Error loading session availability. Please try again.</div>';
    }
  }
}

// Render date picker and generate time slots
async function renderDatePickerAndTimeSlots(sessionTypeData, sessionTypeName, coachAvailability) {
  const datePicker = document.getElementById('individualDatePicker');
  const timeSlots = document.getElementById('individualTimeSlots');
  
  if (!datePicker || !timeSlots) return;
  
  // Render weekly date picker
  renderWeeklyDatePicker(datePicker);
  
  // Generate time slots for selected date (today by default)
  const selectedDateNumber = datePicker.querySelector('.day-number.selected');
  let selectedDate;
  if (selectedDateNumber) {
    const calendarDay = selectedDateNumber.closest('.calendar-day');
    if (calendarDay && calendarDay.dataset.date) {
      // Parse as local date to avoid timezone issues
      const dateStr = calendarDay.dataset.date; // Format: "YYYY-MM-DD"
      const [year, month, day] = dateStr.split('-').map(Number);
      selectedDate = new Date(year, month - 1, day); // month is 0-indexed
    } else {
      selectedDate = new Date();
    }
  } else {
    selectedDate = new Date();
  }
  await generateTimeSlots(selectedDate, sessionTypeData, coachAvailability, timeSlots);
  
  // Setup date selection handlers
  setupDateSelectionHandlers(sessionTypeData, coachAvailability);
}

// Render weekly date picker
function renderWeeklyDatePicker(container) {
  const today = new Date();
  // Normalize today to local date
  const localToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  
  // Initialize week start if not set, or normalize existing to Sunday
  if (!individualDatePickerWeekStart || isNaN(individualDatePickerWeekStart.getTime())) {
    individualDatePickerWeekStart = new Date(localToday);
    individualDatePickerWeekStart.setDate(localToday.getDate() - localToday.getDay()); // Start of week (Sunday)
    // Normalize week start to local date
    individualDatePickerWeekStart = new Date(individualDatePickerWeekStart.getFullYear(), individualDatePickerWeekStart.getMonth(), individualDatePickerWeekStart.getDate());
  } else {
    // Ensure existing week start is normalized to Sunday
    const currentDay = individualDatePickerWeekStart.getDay(); // 0 = Sunday, 1 = Monday, etc.
    if (currentDay !== 0) {
      // Adjust to the previous Sunday
      individualDatePickerWeekStart.setDate(individualDatePickerWeekStart.getDate() - currentDay);
      // Normalize to local date
      individualDatePickerWeekStart = new Date(individualDatePickerWeekStart.getFullYear(), individualDatePickerWeekStart.getMonth(), individualDatePickerWeekStart.getDate());
    }
  }
  
  // Check if mobile (iPhone size)
  const isMobile = window.innerWidth <= 428;
  const days = isMobile 
    ? ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'S']  // Shortened for mobile
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];  // Full for desktop
  const dayNumbers = [];
  
  for (let i = 0; i < 7; i++) {
    const date = new Date(individualDatePickerWeekStart);
    date.setDate(individualDatePickerWeekStart.getDate() + i);
    // Normalize to local date to avoid timezone issues
    const localDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const actualDayOfWeek = localDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    // Use the actual day of week to get the correct label, not just the index
    const dayLabel = days[actualDayOfWeek];
    const isPast = localDate < localToday;
    
    dayNumbers.push({
      day: dayLabel,
      number: localDate.getDate(),
      date: localDate,
      isToday: localDate.toDateString() === localToday.toDateString(),
      isPast: isPast
    });
  }
  
  // Find today's index
  const todayIndex = dayNumbers.findIndex(d => d.isToday);
  const selectedIndex = todayIndex >= 0 ? todayIndex : 0;
  
  // Calculate max date (4 weeks from today) - use local date
  const maxDate = new Date(localToday);
  maxDate.setDate(localToday.getDate() + (4 * 7));
  const weekEnd = new Date(individualDatePickerWeekStart);
  weekEnd.setDate(individualDatePickerWeekStart.getDate() + 6);
  const canGoNext = weekEnd < maxDate;
  
  // Get selected date for display
  const selectedDate = dayNumbers[selectedIndex]?.date || localToday;
  const dateDisplayStr = selectedDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  container.innerHTML = `
    <div class="calendar-header-container">
      <button class="calendar-nav-btn" id="individualDatePickerPrev" type="button">
        <i class="bx bx-chevron-left"></i>
      </button>
      <div class="calendar-week-row">
        ${dayNumbers.map((day, index) => {
          // Format date as YYYY-MM-DD using local date components to avoid timezone issues
          const year = day.date.getFullYear();
          const month = String(day.date.getMonth() + 1).padStart(2, '0');
          const dayNum = String(day.date.getDate()).padStart(2, '0');
          const dateStr = `${year}-${month}-${dayNum}`;
          return `
          <div class="calendar-day" data-date="${dateStr}">
            <div class="day-label">${day.day}</div>
            <div class="day-number ${day.isToday ? 'today' : ''} ${day.isPast ? 'past' : ''} ${index === selectedIndex ? 'selected' : ''}">${day.number}</div>
          </div>
        `;
        }).join('')}
      </div>
      <button class="calendar-nav-btn" id="individualDatePickerNext" type="button" ${!canGoNext ? 'disabled' : ''}>
        <i class="bx bx-chevron-right"></i>
      </button>
    </div>
    <div class="selected-date-display" id="individualSelectedDate">${dateDisplayStr}</div>
  `;
  
  // Setup navigation handlers
  setupIndividualDatePickerNavigation();
}

// Setup individual date picker navigation
function setupIndividualDatePickerNavigation() {
  const prevBtn = document.getElementById('individualDatePickerPrev');
  const nextBtn = document.getElementById('individualDatePickerNext');
  
  if (prevBtn) {
    prevBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigateIndividualDatePicker(-1);
    });
  }
  
  if (nextBtn) {
    nextBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      navigateIndividualDatePicker(1);
    });
  }
}

// Navigate individual date picker week
async function navigateIndividualDatePicker(direction) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + (4 * 7)); // 4 weeks from today
  
  // Get new week start
  const newWeekStart = new Date(individualDatePickerWeekStart);
  newWeekStart.setDate(individualDatePickerWeekStart.getDate() + (direction * 7));
  
  // Normalize to local date and ensure it's a Sunday
  const normalizedWeekStart = new Date(newWeekStart.getFullYear(), newWeekStart.getMonth(), newWeekStart.getDate());
  const dayOfWeek = normalizedWeekStart.getDay(); // 0 = Sunday
  if (dayOfWeek !== 0) {
    // Adjust to the previous Sunday
    normalizedWeekStart.setDate(normalizedWeekStart.getDate() - dayOfWeek);
  }
  
  // Check if we're going forward beyond 4 weeks
  if (direction > 0) {
    const weekEnd = new Date(normalizedWeekStart);
    weekEnd.setDate(normalizedWeekStart.getDate() + 6);
    if (weekEnd > maxDate) {
      return; // Don't navigate beyond 4 weeks
    }
  }
  
  individualDatePickerWeekStart = normalizedWeekStart;
  
  // Re-render the date picker
  const datePicker = document.getElementById('individualDatePicker');
  if (datePicker) {
    // Store currently selected date before re-rendering
    const selectedDayEl = datePicker.querySelector('.calendar-day.selected');
    let selectedDate = null;
    if (selectedDayEl) {
      selectedDate = new Date(selectedDayEl.dataset.date);
    }
    
    renderWeeklyDatePicker(datePicker);
    
    // Re-setup date selection handlers with stored data
    if (currentSessionTypeData) {
      setupDateSelectionHandlers(currentSessionTypeData, currentCoachAvailability);
    }
    
    // Re-setup date selection handlers and maintain selection
    const sessionType = currentIndividualSessionType;
    if (sessionType && selectedDate) {
      // Find the same date in the new week or select today
      // Format date as YYYY-MM-DD using local date components
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const dayNum = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${dayNum}`;
      const newSelectedDay = datePicker.querySelector(`[data-date="${dateStr}"]`);
      if (newSelectedDay) {
        const dayNumber = newSelectedDay.querySelector('.day-number');
        if (dayNumber) {
          dayNumber.classList.add('selected');
          // Update date display
          const dateDisplay = document.getElementById('individualSelectedDate');
          if (dateDisplay) {
            const dateDisplayStr = selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
            dateDisplay.textContent = dateDisplayStr;
          }
          // Trigger to reload time slots
          dayNumber.click();
        }
      } else {
        // If date not in current week, select today
        const todayEl = datePicker.querySelector('.day-number.today');
        if (todayEl) {
          todayEl.classList.add('selected');
          todayEl.click();
        }
      }
    } else {
      // Update date display for initially selected date
      const selectedDayNumber = datePicker.querySelector('.day-number.selected');
      if (selectedDayNumber) {
        const calendarDay = selectedDayNumber.closest('.calendar-day');
        if (calendarDay && calendarDay.dataset.date) {
          // Parse as local date to avoid timezone issues
          const dateStr = calendarDay.dataset.date; // Format: "YYYY-MM-DD"
          const [year, month, day] = dateStr.split('-').map(Number);
          const selectedDate = new Date(year, month - 1, day); // month is 0-indexed
          const dateDisplay = document.getElementById('individualSelectedDate');
          if (dateDisplay) {
            const dateDisplayStr = selectedDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            });
            dateDisplay.textContent = dateDisplayStr;
          }
          // Generate time slots for initially selected date
          if (currentSessionTypeData) {
            const timeSlots = document.getElementById('individualTimeSlots');
            if (timeSlots) {
              await generateTimeSlots(selectedDate, currentSessionTypeData, currentCoachAvailability, timeSlots);
            }
          }
        }
      }
    }
  }
}

// Setup date selection handlers
function setupDateSelectionHandlers(sessionTypeData, coachAvailability) {
  // Store for use in date click handlers
  currentSessionTypeData = sessionTypeData;
  currentCoachAvailability = coachAvailability || [];
  
  const datePicker = document.getElementById('individualDatePicker');
  if (!datePicker) return;
  
  // Attach listeners to day-number elements
  const newDateDays = datePicker.querySelectorAll('.day-number');
  newDateDays.forEach(dayNumberEl => {
    dayNumberEl.addEventListener('click', async () => {
      // Update selected state
      newDateDays.forEach(d => d.classList.remove('selected'));
      dayNumberEl.classList.add('selected');
      
      // Get selected date from parent calendar-day - parse as local date to avoid timezone issues
      const calendarDay = dayNumberEl.closest('.calendar-day');
      if (!calendarDay || !calendarDay.dataset.date) return;
      
      const dateStr = calendarDay.dataset.date; // Format: "YYYY-MM-DD"
      const [year, month, day] = dateStr.split('-').map(Number);
      const selectedDate = new Date(year, month - 1, day); // month is 0-indexed
      
      // Update date display
      const dateDisplay = document.getElementById('individualSelectedDate');
      if (dateDisplay) {
        const dateDisplayStr = selectedDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        });
        dateDisplay.textContent = dateDisplayStr;
      }
      
      const timeSlots = document.getElementById('individualTimeSlots');
      
      // Use stored session type data and coach availability (they may have been updated)
      await generateTimeSlots(selectedDate, currentSessionTypeData, currentCoachAvailability, timeSlots);
    });
  });
}

// Generate time slots based on availability
async function generateTimeSlots(selectedDate, sessionTypeData, coachAvailability, container) {
  if (!container) return;
  
  container.innerHTML = '<div class="loading-slots">Loading available times...</div>';
  
  // Normalize date to local time to avoid timezone issues
  // Create a new date using local year, month, day to ensure correct day of week
  const localDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  
  // Get day of week (0 = Sunday, 6 = Saturday)
  const dayOfWeek = localDate.getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];
  
  // Debug logging
  console.log('Date calculation for time slots:', {
    originalDate: selectedDate.toString(),
    localDate: localDate.toString(),
    dayOfWeek,
    dayName,
    dateStr: `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`
  });
  
  // Check if we have session type data
  if (!sessionTypeData) {
    container.innerHTML = '<div class="no-slots">Session type not configured. Please create and configure this session type in the coach schedule.</div>';
    return;
  }
  
  // Get general availability from session type
  const generalAvailability = sessionTypeData.general_availability || {};
  const dayAvailability = generalAvailability[dayName] || {};
  
  console.log('Availability check:', {
    dayName,
    dayAvailability,
    generalAvailability
  });
  
  // Default time slot granularity (in minutes)
  const granularity = sessionTypeData.time_slot_granularity_minutes || 20;
  const duration = sessionTypeData.duration_minutes || 20;
  
  // Format date string for logging (using local date components)
  const logYear = selectedDate.getFullYear();
  const logMonth = String(selectedDate.getMonth() + 1).padStart(2, '0');
  const logDay = String(selectedDate.getDate()).padStart(2, '0');
  const logDateStr = `${logYear}-${logMonth}-${logDay}`;
  
  console.log('Generating time slots for:', {
    date: logDateStr,
    dayName,
    dayAvailability,
    coachAvailabilityCount: coachAvailability?.length || 0,
    selectedCoachId,
    granularity,
    duration
  });
  
  // Get available time slots
  const availableSlots = [];
  
  if (!selectedCoachId) {
    // Show all available coaches' time slots combined (any coach)
    if (coachAvailability && coachAvailability.length > 0) {
      // Use coach-specific availability from all coaches
      coachAvailability.forEach(coach => {
        const coachAvail = coach.availability || {};
        const coachDayAvail = coachAvail[dayName] || dayAvailability;
        
        if (coachDayAvail.available) {
          // Get coach's time ranges
          let coachRanges = [];
          if (coachDayAvail.timeRanges && Array.isArray(coachDayAvail.timeRanges)) {
            coachRanges = coachDayAvail.timeRanges;
          } else if (coachDayAvail.start && coachDayAvail.end) {
            // Single time range (backward compatibility)
            coachRanges = [{ start: coachDayAvail.start, end: coachDayAvail.end }];
          }
          
          // Intersect coach ranges with general availability
          if (coachRanges.length > 0 && dayAvailability.available && dayAvailability.start && dayAvailability.end) {
            const generalStart = parseTime(dayAvailability.start);
            const generalEnd = parseTime(dayAvailability.end);
            
            coachRanges.forEach(range => {
              const coachStart = parseTime(range.start);
              const coachEnd = parseTime(range.end);
              
              if (coachStart && coachEnd && generalStart && generalEnd) {
                // Find intersection
                const intersectionStart = coachStart > generalStart ? coachStart : generalStart;
                const intersectionEnd = coachEnd < generalEnd ? coachEnd : generalEnd;
                
                // Only use if there's a valid intersection
                if (intersectionStart < intersectionEnd) {
                  const startStr = formatTimeFromDate(intersectionStart);
                  const endStr = formatTimeFromDate(intersectionEnd);
                  const coachSlots = generateSlotsForTimeRange(
                    startStr,
                    endStr,
                    granularity,
                    duration
                  );
                  
                  // Merge slots (avoid duplicates)
                  coachSlots.forEach(slot => {
                    if (!availableSlots.find(s => s.time === slot.time)) {
                      availableSlots.push(slot);
                    }
                  });
                }
              }
            });
          } else if (coachRanges.length > 0) {
            // No general availability restriction, use coach ranges directly
            coachRanges.forEach(range => {
              if (range.start && range.end) {
                const coachSlots = generateSlotsForTimeRange(
                  range.start,
                  range.end,
                  granularity,
                  duration
                );
                
                // Merge slots (avoid duplicates)
                coachSlots.forEach(slot => {
                  if (!availableSlots.find(s => s.time === slot.time)) {
                    availableSlots.push(slot);
                  }
                });
              }
            });
          }
        }
      });
    } else {
      // Fallback to general availability if no coach availability
      if (dayAvailability.available && dayAvailability.start && dayAvailability.end) {
        availableSlots.push(...generateSlotsForTimeRange(
          dayAvailability.start,
          dayAvailability.end,
          granularity,
          duration
        ));
      }
    }
  } else {
    // Use specific coach's availability
    const selectedCoach = coachAvailability?.find(c => c.coach_id === selectedCoachId);
    if (selectedCoach) {
      const coachAvail = selectedCoach.availability || {};
      const coachDayAvail = coachAvail[dayName] || dayAvailability;
      
      if (coachDayAvail.available) {
        // Get coach's time ranges
        let coachRanges = [];
        if (coachDayAvail.timeRanges && Array.isArray(coachDayAvail.timeRanges)) {
          coachRanges = coachDayAvail.timeRanges;
        } else if (coachDayAvail.start && coachDayAvail.end) {
          // Single time range (backward compatibility)
          coachRanges = [{ start: coachDayAvail.start, end: coachDayAvail.end }];
        }
        
        // Intersect coach ranges with general availability
        if (coachRanges.length > 0 && dayAvailability.available && dayAvailability.start && dayAvailability.end) {
          const generalStart = parseTime(dayAvailability.start);
          const generalEnd = parseTime(dayAvailability.end);
          
          coachRanges.forEach(range => {
            const coachStart = parseTime(range.start);
            const coachEnd = parseTime(range.end);
            
            if (coachStart && coachEnd && generalStart && generalEnd) {
              // Find intersection
              const intersectionStart = coachStart > generalStart ? coachStart : generalStart;
              const intersectionEnd = coachEnd < generalEnd ? coachEnd : generalEnd;
              
              // Only use if there's a valid intersection
              if (intersectionStart < intersectionEnd) {
                const startStr = formatTimeFromDate(intersectionStart);
                const endStr = formatTimeFromDate(intersectionEnd);
                availableSlots.push(...generateSlotsForTimeRange(
                  startStr,
                  endStr,
                  granularity,
                  duration
                ));
              }
            }
          });
        } else if (coachRanges.length > 0) {
          // No general availability restriction, use coach ranges directly
          coachRanges.forEach(range => {
            if (range.start && range.end) {
              availableSlots.push(...generateSlotsForTimeRange(
                range.start,
                range.end,
                granularity,
                duration
              ));
            }
          });
        }
      }
    }
  }
  
  // Sort slots by time
  availableSlots.sort((a, b) => a.time.localeCompare(b.time));
  
  // Check for existing bookings to mark slots as unavailable
  const bookedSlots = await getBookedSlots(selectedDate, sessionTypeData.id);
  
  console.log('Available slots before booking check:', availableSlots.length);
  
  // Get buffer times from session type
  const bufferBefore = sessionTypeData.buffer_before_minutes || 0;
  const bufferAfter = sessionTypeData.buffer_after_minutes || 0;
  
  console.log('Buffer settings:', { bufferBefore, bufferAfter, bookedSlotsCount: bookedSlots.length });
  
  // Apply buffers to booked slots - mark slots as unavailable if they conflict
  const unavailableSlots = new Set();
  bookedSlots.forEach(bookedTime => {
    const [bookedHours, bookedMinutes] = bookedTime.split(':').map(Number);
    const bookedStart = new Date(selectedDate);
    bookedStart.setHours(bookedHours, bookedMinutes, 0, 0);
    
    // Mark buffer before (slots that end during buffer before)
    if (bufferBefore > 0) {
      const bufferStart = new Date(bookedStart.getTime() - bufferBefore * 60000);
      availableSlots.forEach(slot => {
        const [slotHours, slotMinutes] = slot.time.split(':').map(Number);
        const slotStart = new Date(selectedDate);
        slotStart.setHours(slotHours, slotMinutes, 0, 0);
        const slotEnd = new Date(slotStart.getTime() + duration * 60000);
        
        // If slot ends during buffer before, mark as unavailable
        if (slotEnd > bufferStart && slotEnd <= bookedStart) {
          unavailableSlots.add(slot.time);
        }
      });
    }
    
    // Mark buffer after (slots that start during buffer after)
    if (bufferAfter > 0) {
      const bookedEnd = new Date(bookedStart.getTime() + duration * 60000);
      const bufferEnd = new Date(bookedEnd.getTime() + bufferAfter * 60000);
      availableSlots.forEach(slot => {
        const [slotHours, slotMinutes] = slot.time.split(':').map(Number);
        const slotStart = new Date(selectedDate);
        slotStart.setHours(slotHours, slotMinutes, 0, 0);
        
        // If slot starts during buffer after, mark as unavailable
        if (slotStart >= bookedEnd && slotStart < bufferEnd) {
          unavailableSlots.add(slot.time);
        }
      });
    }
    
    // Mark the booked slot itself
    unavailableSlots.add(bookedTime);
  });
  
  // Apply minimum booking notice (e.g., 8 hours before)
  const minBookingNoticeHours = sessionTypeData.minimum_booking_notice_hours || 8;
  const now = new Date();
  
  availableSlots.forEach(slot => {
    const [slotHours, slotMinutes] = slot.time.split(':').map(Number);
    const slotStart = new Date(selectedDate);
    slotStart.setHours(slotHours, slotMinutes, 0, 0);
    
    // Calculate hours until slot start
    const hoursUntilSlot = (slotStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    // If slot is less than minimum booking notice hours away, mark as unavailable
    if (hoursUntilSlot < minBookingNoticeHours) {
      unavailableSlots.add(slot.time);
    }
  });
  
  // Render time slots
  console.log('Final available slots after buffer and minimum notice check:', availableSlots.length - unavailableSlots.size);
  
  if (availableSlots.length === 0) {
    container.innerHTML = '<div class="no-slots">No available time slots for this day. Please check coach availability settings.</div>';
    return;
  }
  
  if (unavailableSlots.size > 0) {
    console.log('Unavailable slots (booked, in buffer, or too soon):', Array.from(unavailableSlots));
  }
  
  container.innerHTML = availableSlots.map(slot => {
    const isBooked = unavailableSlots.has(slot.time);
    return `
      <button class="time-slot-btn ${isBooked ? 'booked' : ''}" 
              data-time="${slot.time}" 
              ${isBooked ? 'disabled' : ''}
              type="button">
        ${slot.displayTime}
      </button>
    `;
  }).join('');
  
  // Setup time slot click handlers
  setupTimeSlotHandlers();
}

// Generate time slots for a time range
function generateSlotsForTimeRange(startTime, endTime, granularity, duration) {
  const slots = [];
  
  // Parse start and end times (format: "HH:MM" or "HH:MM AM/PM")
  const start = parseTime(startTime);
  const end = parseTime(endTime);
  
  if (!start || !end) return slots;
  
  let currentTime = new Date(start);
  
  while (currentTime < end) {
    const slotEnd = new Date(currentTime.getTime() + duration * 60000);
    
    if (slotEnd <= end) {
      const hours = currentTime.getHours();
      const minutes = currentTime.getMinutes();
      const time24 = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
      const displayTime = formatTime12Hour(hours, minutes);
      
      slots.push({
        time: time24,
        displayTime: displayTime
      });
    }
    
    // Move to next slot
    currentTime.setMinutes(currentTime.getMinutes() + granularity);
  }
  
  return slots;
}

// Parse time string (handles both 24h and 12h formats)
function parseTime(timeStr) {
  if (!timeStr) return null;
  
  // Try 24h format first (HH:MM)
  const match24 = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1]);
    const minutes = parseInt(match24[2]);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
  
  // Try 12h format (HH:MM AM/PM)
  const match12 = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1]);
    const minutes = parseInt(match12[2]);
    const period = match12[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }
  
  return null;
}

// Format time as 12-hour
function formatTime12Hour(hours, minutes) {
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

// Format Date object to 12-hour time string
function formatTimeFromDate(date) {
  if (!date) return null;
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

// Get booked slots for a date
async function getBookedSlots(date, sessionTypeId) {
  if (!supabaseReady || !supabase || !sessionTypeId) return [];
  
  try {
    // Format date as YYYY-MM-DD using local date components to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    const { data: bookings, error } = await supabase
      .from('individual_session_bookings')
      .select('booking_time')
      .eq('session_type_id', sessionTypeId)
      .eq('booking_date', dateString)
      .eq('status', 'confirmed');
    
    if (error) {
      console.error('Error loading booked slots:', error);
      return [];
    }
    
    return (bookings || []).map(b => b.booking_time);
  } catch (error) {
    console.error('Error getting booked slots:', error);
    return [];
  }
}

// Setup time slot click handlers
function setupTimeSlotHandlers() {
  const timeSlotBtns = document.querySelectorAll('.time-slot-btn:not(.booked)');
  timeSlotBtns.forEach(btn => {
    btn.addEventListener('click', async () => {
      // Check if a coach is selected
      if (!selectedCoachId) {
        // Show modal to choose a coach
        await showCoachSelectionModal(currentIndividualSessionType);
        return;
      }
      
      // Remove previous selection
      timeSlotBtns.forEach(b => b.classList.remove('selected'));
      
      // Select this slot
      btn.classList.add('selected');
      
      // Update booking summary and show footer
      updateBookingSummary();
    });
  });
}

// Update booking summary
function updateBookingSummary() {
  const selectedSlot = document.querySelector('.time-slot-btn.selected');
  const selectedDateNumber = document.querySelector('.day-number.selected');
  const footer = document.getElementById('individualBookingFooter');
  const summary = document.getElementById('bookingSummary');
  
  if (!selectedSlot || !selectedDateNumber || !footer || !summary) return;
  
  const selectedTime = selectedSlot.dataset.time;
  // Get selected date from parent calendar-day - parse as local date to avoid timezone issues
  const calendarDay = selectedDateNumber.closest('.calendar-day');
  if (!calendarDay || !calendarDay.dataset.date) return;
  
  const dateStr = calendarDay.dataset.date; // Format: "YYYY-MM-DD"
  const [year, month, day] = dateStr.split('-').map(Number);
  const selectedDate = new Date(year, month - 1, day); // month is 0-indexed
  
  const dateDisplayStr = selectedDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const timeStr = formatTime12Hour(
    parseInt(selectedTime.split(':')[0]),
    parseInt(selectedTime.split(':')[1])
  );
  
  let coachName = 'Any available';
  if (selectedCoachId) {
    // Get coach name from the staff selector or coach option
    const coachElement = document.querySelector(`[data-coach-id="${selectedCoachId}"]`);
    if (coachElement) {
      // Try to get the span text (for staff tags) or the text content without the remove button
      const span = coachElement.querySelector('span');
      if (span) {
        coachName = span.textContent.trim();
      } else {
        // Fallback to textContent but remove any button text
        coachName = coachElement.textContent.trim();
        // Remove common button characters
        coachName = coachName.replace(/[×✕✖]/g, '').trim();
      }
    } else {
      // Try to get from coach availability data
      const coach = currentCoachAvailability?.find(c => c.coach_id === selectedCoachId);
      if (coach && coach.coach) {
        coachName = `${coach.coach.first_name || ''} ${coach.coach.last_name || ''}`.trim();
      }
    }
  }
  
  summary.innerHTML = `
    <div><strong>${currentIndividualSessionType}</strong></div>
    <div>${dateDisplayStr} at ${timeStr}</div>
    <div>With ${coachName}</div>
  `;
  
  footer.style.display = 'flex';
}

// Show coach selection modal (bottom sheet)
async function showCoachSelectionModal(sessionType) {
  if (!supabaseReady || !supabase) return;
  
  try {
    // Get session type ID
    const { data: sessionTypeData, error: typeError } = await supabase
      .from('individual_session_types')
      .select('id, name')
      .eq('name', sessionType)
      .single();
    
    if (typeError || !sessionTypeData) {
      console.error('Error loading session type:', typeError);
      return;
    }
    
    // Load available coaches
    const { data: coachAvailability, error: coachError } = await supabase
      .from('coach_individual_availability')
      .select(`
        id,
        coach_id,
        coach:profiles!coach_individual_availability_coach_id_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .eq('session_type_id', sessionTypeData.id)
      .eq('is_available', true);
    
    if (coachError) {
      console.error('Error loading coaches:', coachError);
      console.error('Coach error details:', {
        message: coachError.message,
        code: coachError.code,
        details: coachError.details,
        hint: coachError.hint
      });
      alert(`Error loading coaches: ${coachError.message}. Please check console for details.`);
      return;
    }
    
    console.log('Loaded coach availability:', coachAvailability);
    console.log('Number of available coaches:', coachAvailability?.length || 0);
    
    // Create or show modal
    let modal = document.getElementById('coachSelectionModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'coachSelectionModal';
      modal.className = 'coach-selection-modal';
      document.body.appendChild(modal);
    }
    
    // Render modal content
    const coaches = coachAvailability || [];
    modal.innerHTML = `
      <div class="coach-modal-overlay"></div>
      <div class="coach-modal-content">
        <div class="coach-option ${!selectedCoachId ? 'selected' : ''}" data-coach-id="">
          <i class="bx bx-user"></i>
          <span>Any available</span>
          <div class="radio-btn ${!selectedCoachId ? 'checked' : ''}"></div>
        </div>
        ${coaches.map(coach => {
          const coachName = `${coach.coach?.first_name || ''} ${coach.coach?.last_name || ''}`.trim();
          const isSelected = selectedCoachId === coach.coach_id;
          return `
            <div class="coach-option ${isSelected ? 'selected' : ''}" data-coach-id="${coach.coach_id}">
              <div class="coach-avatar">${coachName.charAt(0).toUpperCase()}</div>
              <span>${coachName}</span>
              <div class="radio-btn ${isSelected ? 'checked' : ''}"></div>
            </div>
          `;
        }).join('')}
      </div>
    `;
    
    modal.style.display = 'block';
    
    // Setup event listeners
    const overlay = modal.querySelector('.coach-modal-overlay');
    const coachOptions = modal.querySelectorAll('.coach-option');
    
    overlay.addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    coachOptions.forEach(option => {
      option.addEventListener('click', async () => {
        const coachId = option.dataset.coachId || null;
        selectedCoachId = coachId;
        
        // Update staff selector display
        const staffSelector = document.getElementById('staffSelector');
        if (staffSelector) {
          const span = staffSelector.querySelector('span');
          if (span) {
            if (coachId) {
              const coachName = option.querySelector('span').textContent;
              span.textContent = coachName;
            } else {
              span.textContent = 'Any available';
            }
          }
        }
        
        // Reload time slots for selected coach
        const selectedDateNumber = document.querySelector('.day-number.selected');
        if (selectedDateNumber) {
          const calendarDay = selectedDateNumber.closest('.calendar-day');
          if (calendarDay && calendarDay.dataset.date) {
            const dateStr = calendarDay.dataset.date;
            const [year, month, day] = dateStr.split('-').map(Number);
            const selectedDate = new Date(year, month - 1, day);
            await reloadTimeSlotsForCoach(selectedDate, sessionType);
          }
        }
        
        // If a time slot was already selected, update the booking summary
        const selectedSlot = document.querySelector('.time-slot-btn.selected');
        if (selectedSlot) {
          updateBookingSummary();
        }
        
        // Close modal
        modal.style.display = 'none';
      });
    });
    
  } catch (error) {
    console.error('Error showing coach selection modal:', error);
  }
}

// Reload time slots when coach selection changes (simplified version)
async function reloadTimeSlotsForCoach(selectedDate, sessionType) {
  if (!supabaseReady || !supabase || !currentIndividualSessionType) return;
  
  try {
    // Get session type data
    const { data: sessionTypeData, error: typeError } = await supabase
      .from('individual_session_types')
      .select('*')
      .eq('name', sessionType)
      .eq('is_active', true)
      .maybeSingle();
    
    if (typeError || !sessionTypeData) {
      console.error('Error reloading session type:', typeError);
      const timeSlots = document.getElementById('individualTimeSlots');
      if (timeSlots) {
        timeSlots.innerHTML = '<div class="no-slots">Error loading session type. Please try again.</div>';
      }
      return;
    }
    
    // Update stored session type data
    currentSessionTypeData = sessionTypeData;
    
    // Reload coach availability
    const { data: coachAvailability, error: coachError } = await supabase
      .from('coach_individual_availability')
      .select(`
        id,
        coach_id,
        availability,
        is_available
      `)
      .eq('session_type_id', sessionTypeData.id)
      .eq('is_available', true);
    
    if (coachError) {
      console.error('Error reloading coach availability:', coachError);
    }
    
    // Update stored coach availability
    currentCoachAvailability = coachAvailability || [];
    
    // Regenerate time slots
    const timeSlots = document.getElementById('individualTimeSlots');
    if (timeSlots) {
      await generateTimeSlots(selectedDate, sessionTypeData, coachAvailability || [], timeSlots);
    }
  } catch (error) {
    console.error('Error reloading time slots:', error);
  }
}

// Reload time slots when coach selection changes
async function reloadTimeSlotsForSelectedCoach(sessionType, sessionTypeId, selectedDate) {
  if (!supabaseReady || !supabase) return;
  
  try {
    // Reload session type data
    const { data: sessionTypeData, error: typeError } = await supabase
      .from('individual_session_types')
      .select('id, name, duration_minutes, time_slot_granularity_minutes, general_availability')
      .eq('id', sessionTypeId)
      .single();
    
    if (typeError || !sessionTypeData) {
      console.error('Error reloading session type:', typeError);
      return;
    }
    
    // Reload coach availability
    const { data: coachAvailability, error: coachError } = await supabase
      .from('coach_individual_availability')
      .select(`
        id,
        coach_id,
        availability,
        is_available,
        coach:profiles!coach_individual_availability_coach_id_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .eq('session_type_id', sessionTypeId)
      .eq('is_available', true);
    
    if (coachError) {
      console.error('Error reloading coach availability:', coachError);
    }
    
    // Regenerate time slots
    const timeSlots = document.getElementById('individualTimeSlots');
    if (timeSlots) {
      await generateTimeSlots(selectedDate, sessionTypeData, coachAvailability || [], timeSlots);
    }
  } catch (error) {
    console.error('Error reloading time slots:', error);
  }
}

// Handle individual booking confirmation
async function handleIndividualBookingConfirmation(sessionType) {
  if (!supabaseReady || !supabase) return;
  
  const selectedSlot = document.querySelector('.time-slot-btn.selected');
  const selectedDateNumber = document.querySelector('.day-number.selected');
  
  if (!selectedSlot || !selectedDateNumber) {
    alert('Please select a date and time slot');
    return;
  }
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      alert('Not logged in');
      return;
    }
    
    // Get session type ID
    const { data: sessionTypeData, error: typeError } = await supabase
      .from('individual_session_types')
      .select('id, name, duration_minutes')
      .eq('name', sessionType)
      .single();
    
    if (typeError || !sessionTypeData) {
      alert('Error: Session type not found');
      return;
    }
    
    // Determine coach_id (use selected coach or assign later)
    let coachId = selectedCoachId;
    if (!coachId) {
      // If "Any available", we need to assign a coach
      // For now, we'll need to implement coach assignment logic
      alert('Please select a specific coach');
      return;
    }
    
    // Player ID
    const playerId = session.user.id;
    
    // Get selected date from parent calendar-day - parse as local date to avoid timezone issues
    const calendarDay = selectedDateNumber.closest('.calendar-day');
    if (!calendarDay || !calendarDay.dataset.date) {
      alert('Error: Could not determine selected date');
      return;
    }
    
    const dateStr = calendarDay.dataset.date; // Format: "YYYY-MM-DD"
    const [year, month, day] = dateStr.split('-').map(Number);
    const selectedDate = new Date(year, month - 1, day); // month is 0-indexed
    const selectedTime = selectedSlot.dataset.time;
    
    // Check minimum booking notice
    const minBookingNoticeHours = sessionTypeData.minimum_booking_notice_hours || 8;
    const [slotHours, slotMinutes] = selectedTime.split(':').map(Number);
    const slotStart = new Date(selectedDate);
    slotStart.setHours(slotHours, slotMinutes, 0, 0);
    const now = new Date();
    const hoursUntilSlot = (slotStart.getTime() - now.getTime()) / (1000 * 60 * 60);
    
    if (hoursUntilSlot < minBookingNoticeHours) {
      alert(`This session must be booked at least ${minBookingNoticeHours} hours in advance. Please select a later time slot.`);
      return;
    }
    
    // Use the dateStr directly since it's already in YYYY-MM-DD format
    const dateString = dateStr;
    
    // Create booking
    const { data: booking, error: bookingError } = await supabase
      .from('individual_session_bookings')
      .insert({
        session_type_id: sessionTypeData.id,
        coach_id: coachId,
        player_id: playerId,
        booking_date: dateString,
        booking_time: selectedTime,
        duration_minutes: sessionTypeData.duration_minutes,
        status: 'confirmed'
      })
      .select()
      .single();
    
    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      alert(`Error creating booking: ${bookingError.message}`);
      return;
    }
    
    // Show confirmation screen
    await showBookingConfirmation(booking, sessionTypeData, selectedDate, selectedTime, coachId);
    
  } catch (error) {
    console.error('Error confirming booking:', error);
    alert(`Error: ${error.message}`);
  }
}

// Show booking confirmation screen
async function showBookingConfirmation(booking, sessionTypeData, selectedDate, selectedTime, coachId) {
  // Hide booking interface
  const bookingContainer = document.getElementById('individualSessionBooking');
  if (bookingContainer) {
    bookingContainer.style.display = 'none';
  }
  
  // Get coach and player info
  const { data: coachProfile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', coachId)
    .single();
  
  const { data: { session } } = await supabase.auth.getSession();
  const { data: playerProfile } = await supabase
    .from('profiles')
    .select('first_name, last_name')
    .eq('id', booking.player_id)
    .single();
  
  const coachName = coachProfile 
    ? `${coachProfile.first_name || ''} ${coachProfile.last_name || ''}`.trim()
    : 'Coach';
  
  const playerName = playerProfile
    ? `${playerProfile.first_name || ''} ${playerProfile.last_name || ''}`.trim()
    : 'Player';
  
  // Format date and time
  const dateStr = selectedDate.toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  
  const [hours, minutes] = selectedTime.split(':').map(Number);
  const startTimeStr = formatTime12Hour(hours, minutes);
  const endTime = new Date(selectedDate);
  endTime.setHours(hours, minutes + sessionTypeData.duration_minutes);
  const endTimeStr = formatTime12Hour(endTime.getHours(), endTime.getMinutes());
  
  // Create confirmation container
  const contentContainer = document.getElementById('virtualContentContainer');
  if (!contentContainer) return;
  
  contentContainer.innerHTML = `
    <div class="booking-confirmation">
      <div class="confirmation-icon">👍</div>
      <h2>Reservation confirmed</h2>
      
      <div class="confirmation-card">
        <div class="confirmation-title">${sessionTypeData.display_name || sessionTypeData.name}</div>
        <div class="confirmation-date">${dateStr}</div>
        <div class="confirmation-time">${startTimeStr} – ${endTimeStr}</div>
        
        <div class="confirmation-participants">
          <div class="participant-info">
            <div class="participant-label">Reserved for:</div>
            <div class="participant-avatar">${playerName.charAt(0).toUpperCase()}</div>
            <div class="participant-name">${playerName}</div>
          </div>
          
          <div class="participant-info">
            <div class="participant-label">With staff:</div>
            <div class="participant-avatar">${coachName.charAt(0).toUpperCase()}</div>
            <div class="participant-name">${coachName}</div>
          </div>
        </div>
      </div>
      
      <div class="confirmation-actions">
        <button class="book-another-btn" id="bookAnotherBtn" type="button">Book another session</button>
        <a href="#" class="back-to-reservations" id="backToReservations">Back to reservations</a>
      </div>
    </div>
  `;
  
  // Setup action buttons
  const bookAnotherBtn = document.getElementById('bookAnotherBtn');
  const backToReservations = document.getElementById('backToReservations');
  
  if (bookAnotherBtn) {
    bookAnotherBtn.addEventListener('click', () => {
      // Reload the booking interface
      const filters = document.getElementById('virtualFilters');
      if (filters) {
        const activeBtn = filters.querySelector('.filter-btn.active');
        if (activeBtn) {
          showIndividualSessionBooking(activeBtn.dataset.type, filters);
        }
      }
    });
  }
  
  if (backToReservations) {
    backToReservations.addEventListener('click', (e) => {
      e.preventDefault();
      // Hide confirmation and show filters
      contentContainer.innerHTML = '';
      const filters = document.getElementById('virtualFilters');
      if (filters) {
        filters.style.display = 'flex';
        // Clear active state
        filters.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
      }
    });
  }
}

// Update day labels on window resize
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    // Re-update calendar headers to adjust day labels for mobile/desktop
    if (currentWeekStart) {
      updateSingleCalendarHeader('onFieldCalendarHeader', currentWeekStart);
      updateSingleCalendarHeader('virtualCalendarHeader', currentWeekStart);
    }
  }, 250);
});

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
