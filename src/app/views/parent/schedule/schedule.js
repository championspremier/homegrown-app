// Parent schedule page scripts
import { initSupabase } from '../../../../auth/config/supabase.js';
import { getAccountContext } from '../../../utils/account-context.js';
import { showLoader, hideLoader } from '../../../utils/loader.js';

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
    
    // Wait for layout to be ready before updating calendar headers
    // This ensures container widths are properly calculated on mobile
    // Use multiple requestAnimationFrame calls to ensure layout is fully ready
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Force layout calculation by checking if calendars exist and accessing their dimensions
        const onFieldCalendar = document.getElementById('onFieldCalendarHeader');
        const virtualCalendar = document.getElementById('virtualCalendarHeader');
        if (onFieldCalendar) void onFieldCalendar.offsetWidth;
        if (virtualCalendar) void virtualCalendar.offsetWidth;
        
        setTimeout(() => {
          updateCalendarHeaders();
        }, 100);
      });
    });
    
    setupRealtimeSubscriptions();
    
    // Recalculate calendar when page becomes visible (e.g., when switching back to this page)
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) {
        // Page became visible, recalculate calendar after a short delay
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            // Force layout calculation
            const onFieldCalendar = document.getElementById('onFieldCalendarHeader');
            const virtualCalendar = document.getElementById('virtualCalendarHeader');
            if (onFieldCalendar) void onFieldCalendar.offsetWidth;
            if (virtualCalendar) void virtualCalendar.offsetWidth;
            setTimeout(() => {
              updateCalendarHeaders();
            }, 150);
          });
        });
      }
    });
    
    // Also recalculate when window gains focus (handles tab switching)
    window.addEventListener('focus', () => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Force layout calculation
          const onFieldCalendar = document.getElementById('onFieldCalendarHeader');
          const virtualCalendar = document.getElementById('virtualCalendarHeader');
          if (onFieldCalendar) void onFieldCalendar.offsetWidth;
          if (virtualCalendar) void virtualCalendar.offsetWidth;
          setTimeout(() => {
            updateCalendarHeaders();
          }, 150);
        });
      });
    });
  } else {
    console.error('Failed to initialize Supabase');
  }
}

// Setup event listeners
function setupEventListeners() {
  // Import chevron toggle function
  let toggleChevronIcon;
  import('../../../utils/lucide-icons.js').then(module => {
    toggleChevronIcon = module.toggleChevronIcon;
  });
  const onFieldToggle = document.getElementById('onFieldToggle');
  const onFieldHiddenSchedule = document.getElementById('onFieldHiddenSchedule');
  
  const virtualToggle = document.getElementById('virtualToggle');
  const virtualHiddenSchedule = document.getElementById('virtualHiddenSchedule');

  // Toggle On-Field dropdown
  if (onFieldToggle && onFieldHiddenSchedule) {
    onFieldToggle.addEventListener('click', async (e) => {
      e.stopPropagation();
      const isOpen = onFieldHiddenSchedule.classList.contains('is-open');
      
      // Close virtual if it's open
      if (virtualHiddenSchedule && virtualHiddenSchedule.classList.contains('is-open')) {
        virtualHiddenSchedule.classList.remove('is-open');
        virtualToggle.setAttribute('aria-expanded', 'false');
        if (toggleChevronIcon) {
          toggleChevronIcon(virtualToggle, false);
        } else {
          const { toggleChevronIcon: toggleFn } = await import('../../../utils/lucide-icons.js');
          toggleFn(virtualToggle, false);
        }
        currentLocationType = null;
        // Clean up virtual content when switching away
        cleanupVirtualContent();
      }
      
      // Toggle on-field
      if (isOpen) {
        onFieldHiddenSchedule.classList.remove('is-open');
        onFieldToggle.setAttribute('aria-expanded', 'false');
        if (toggleChevronIcon) {
          toggleChevronIcon(onFieldToggle, false);
        } else {
          const { toggleChevronIcon: toggleFn } = await import('../../../utils/lucide-icons.js');
          toggleFn(onFieldToggle, false);
        }
        currentLocationType = null;
        currentFilterType = null;
      } else {
        onFieldHiddenSchedule.classList.add('is-open');
        onFieldToggle.setAttribute('aria-expanded', 'true');
        if (toggleChevronIcon) {
          toggleChevronIcon(onFieldToggle, true);
        } else {
          const { toggleChevronIcon: toggleFn } = await import('../../../utils/lucide-icons.js');
          toggleFn(onFieldToggle, true);
        }
        currentLocationType = 'on-field';
        currentSelectedDate = new Date(); // Reset to today
        currentFilterType = null;
        // Show filter buttons and calendar
        const filters = document.getElementById('onFieldFilters');
        const calendar = document.getElementById('onFieldCalendarHeader');
        const sessionsList = document.getElementById('onFieldSessionsList');
        const upcomingList = document.getElementById('onFieldUpcomingSessions');
        if (filters) filters.style.display = 'flex';
        if (calendar) {
          calendar.style.display = 'block';
          // Recalculate calendar after it becomes visible to ensure proper sizing on mobile
          // Use multiple requestAnimationFrame calls to ensure layout is fully ready
          // Also force a layout recalculation by accessing offsetWidth
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              // Force layout calculation
              void calendar.offsetWidth;
              setTimeout(() => {
                updateCalendarHeaders();
              }, 100);
            });
          });
        }
        if (sessionsList) sessionsList.style.display = 'none';
        if (upcomingList) upcomingList.style.display = 'none';
        // Reset filter buttons
        if (filters) {
          filters.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        }
        await loadAndDisplaySessions('on-field');
      }
    });
  }

  // Toggle Virtual dropdown
  if (virtualToggle && virtualHiddenSchedule) {
    virtualToggle.addEventListener('click', async (e) => {
      e.stopPropagation();
      const isOpen = virtualHiddenSchedule.classList.contains('is-open');
      
      // Close on-field if it's open
      if (onFieldHiddenSchedule && onFieldHiddenSchedule.classList.contains('is-open')) {
        onFieldHiddenSchedule.classList.remove('is-open');
        onFieldToggle.setAttribute('aria-expanded', 'false');
        if (toggleChevronIcon) {
          toggleChevronIcon(onFieldToggle, false);
        } else {
          const { toggleChevronIcon: toggleFn } = await import('../../../utils/lucide-icons.js');
          toggleFn(onFieldToggle, false);
        }
        currentLocationType = null;
      }
      
      // Toggle virtual
      if (isOpen) {
        virtualHiddenSchedule.classList.remove('is-open');
        virtualToggle.setAttribute('aria-expanded', 'false');
        if (toggleChevronIcon) {
          toggleChevronIcon(virtualToggle, false);
        } else {
          const { toggleChevronIcon: toggleFn } = await import('../../../utils/lucide-icons.js');
          toggleFn(virtualToggle, false);
        }
        currentLocationType = null;
        currentFilterType = null;
        // Clean up virtual content when closing
        cleanupVirtualContent();
      } else {
        virtualHiddenSchedule.classList.add('is-open');
        virtualToggle.setAttribute('aria-expanded', 'true');
        if (toggleChevronIcon) {
          toggleChevronIcon(virtualToggle, true);
        } else {
          const { toggleChevronIcon: toggleFn } = await import('../../../utils/lucide-icons.js');
          toggleFn(virtualToggle, true);
        }
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
  selectedCoachRole = null;
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
  
  // Use same day labels as home page calendar (no mobile shortening)
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  // Get the week row container
  const weekRow = header.querySelector('.calendar-week-row');
  if (!weekRow) return;
  
  // Force layout recalculation before updating
  // Access multiple elements to ensure all dimensions are calculated
  void header.offsetWidth;
  const navigation = header.querySelector('.calendar-navigation');
  if (navigation) {
    void navigation.offsetWidth;
  }
  void weekRow.offsetWidth;
  
  // Update existing day elements (same approach as home page but without rebuilding)
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
    
    // Style past dates - add past class to day-number (matching home page)
    if (date < today) {
      dayEl.classList.remove('past');
      if (dayNumberEl) {
        dayNumberEl.classList.add('past');
      }
    } else {
      dayEl.classList.remove('past');
      if (dayNumberEl) {
        dayNumberEl.classList.remove('past');
      }
    }
    
    // Highlight today - add today class to day-number (matching home page)
    if (date.toDateString() === today.toDateString()) {
      dayEl.classList.remove('today');
      if (dayNumberEl) {
        dayNumberEl.classList.add('today');
      }
      if (index === 0) {
        // Also highlight Sunday if it's today
        updateSelectedDay(headerId, today.getDay());
      }
    } else {
      dayEl.classList.remove('today');
      if (dayNumberEl) {
        dayNumberEl.classList.remove('today');
      }
    }
  });
  
  // Force another layout recalculation after updates
  void weekRow.offsetWidth;
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
  const containerId = locationType === 'on-field' ? 'onFieldSessionsList' : (customSessionsListId || 'virtualSessionsList');
  const container = document.getElementById(containerId);
  if (container) {
    showLoader(container, 'Loading sessions...');
  }
  
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
    
    // Sessions loaded
    if (sessions && sessions.length > 0) {
      // Sessions loaded successfully
    }

    // Display sessions
    const headerId = locationType === 'on-field' ? 'onFieldCalendarHeader' : (customHeaderId || 'virtualCalendarHeader');
    const dateDisplayId = locationType === 'on-field' ? 'onFieldSelectedDate' : 'virtualSelectedDate';
    
    await displaySessions(sessions || [], containerId, dateDisplayId, dateToShow);
    
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
  } finally {
    if (container) hideLoader(container);
  }
}

// Display sessions in the list
async function displaySessions(sessions, containerId, dateDisplayId, selectedDate) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = '';
  
  if (sessions.length === 0) {
    container.innerHTML = '<div class="no-sessions">No sessions scheduled for this day.</div>';
    return;
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
  
  // Description line
  const descriptionLine = session.location_type === 'on-field'
    ? `${session.session_type || 'Session'} • ${locationText}`
    : `${session.session_type || 'Session'}`;
  
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
    month: 'long', 
    day: 'numeric' 
  });
  
  // Check if session is in the past
  const now = new Date();
  const sessionDateTime = new Date(`${session.session_date}T${session.session_time}`);
  const isPast = sessionDateTime < now;
  
  sessionEl.innerHTML = `
    <div class="session-content ${isPast ? 'past-session' : ''}">
      <div class="session-time">${timeString} – ${endTimeString}</div>
      <div class="session-title">${session.session_type || 'Session'}</div>
      <div class="session-details">
        <i class="bx bx-map"></i>
        ${session.zoom_link && session.location_type === 'virtual'
          ? `<a href="${session.zoom_link}" target="_blank" rel="noopener noreferrer" class="zoom-link" style="color: var(--accent); text-decoration: underline; cursor: pointer;" onclick="event.stopPropagation();">${locationText}</a>`
          : INDIVIDUAL_SESSIONS.includes(session.session_type) 
            ? `<a href="#" class="individual-session-link" data-session-type="${session.session_type}" style="color: var(--accent); text-decoration: underline; cursor: pointer;">${locationText}</a>`
            : `<span>${locationText}</span>`
        }
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
    <div class="session-badge ${isAvailable && !isPast ? 'available' : 'full'}">
      ${isPast ? 'PAST' : (isAvailable ? 'AVAILABLE' : 'FULL')}
    </div>
    <button class="session-reserve-btn" type="button" ${isPast ? 'disabled' : ''}>Reserve</button>
  `;
  
  // Add click handler to show session details
  sessionEl.addEventListener('click', (e) => {
    // Handle individual session link click
    if (e.target.closest('.individual-session-link')) {
      e.stopPropagation();
      const sessionType = e.target.closest('.individual-session-link').dataset.sessionType;
      if (sessionType) {
        // Navigate to individual session booking
        const virtualToggle = document.getElementById('virtualToggle');
        if (virtualToggle) {
          virtualToggle.click();
          // Wait a bit for the filters to load, then select the session type
          setTimeout(() => {
            const sessionTypeBtn = Array.from(document.querySelectorAll('.filter-btn')).find(btn => 
              btn.textContent.trim() === sessionType
            );
            if (sessionTypeBtn) {
              sessionTypeBtn.click();
            }
          }, 300);
        }
      }
      return;
    }
    
    // Don't trigger if clicking the reserve button
    if (e.target.closest('.session-reserve-btn')) {
      e.stopPropagation();
      const sessionDateTime = new Date(`${session.session_date}T${session.session_time}`);
      if (sessionDateTime < new Date()) {
        alert('This session has already passed and cannot be reserved.');
        return;
      }
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
    const now = new Date();
    const todayString = now.toISOString().split('T')[0];
    
    // Get sessions that are scheduled and not cancelled
    const { data: sessions, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('location_type', locationType)
      .eq('session_type', sessionType)
      .eq('status', 'scheduled') // Only scheduled sessions
      .neq('status', 'cancelled') // Exclude cancelled sessions
      .gte('session_date', todayString) // Today or future
      .order('session_date', { ascending: true })
      .order('session_time', { ascending: true })
      .limit(10); // Get more to filter by time
    
    if (error) {
      console.error('Error loading upcoming sessions:', error);
      return;
    }
    
    // Filter out past sessions (check both date and time)
    const futureSessions = (sessions || []).filter(session => {
      const sessionDate = new Date(session.session_date);
      const [hours, minutes] = session.session_time.split(':').map(Number);
      sessionDate.setHours(hours, minutes, 0, 0);
      
      // Only include sessions that are in the future
      return sessionDate > now;
    }).slice(0, 4); // Limit to 4 sessions
    
    // Clear coach cache to ensure fresh data (coach might have changed)
    if (futureSessions && futureSessions.length > 0) {
      const coachIds = futureSessions.map(s => s.coach_id).filter(Boolean);
      clearCoachCache(coachIds); // Clear cache for coaches in current sessions
    }
    
    const containerId = customContainerId || (locationType === 'on-field' ? 'onFieldUpcomingSessions' : 'virtualUpcomingSessions');
    await displayUpcomingSessions(futureSessions || [], containerId);
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
  
  // Format date - parse in local timezone to avoid date shifts
  // session_date is a DATE string like "2026-01-02", parse it as local time
  const [year, month, day] = session.session_date.split('-').map(Number);
  const sessionDate = new Date(year, month - 1, day); // month is 0-indexed
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
    if (!e.target.closest('.upcoming-session-reserve-btn')) {
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
          ${session.zoom_link && session.location_type === 'virtual'
            ? `<a href="${session.zoom_link}" target="_blank" rel="noopener noreferrer" class="zoom-link" style="color: var(--accent); text-decoration: underline; cursor: pointer;" onclick="event.stopPropagation();">${locationText}</a>`
            : INDIVIDUAL_SESSIONS.includes(session.session_type)
              ? `<a href="#" class="individual-session-link" data-session-type="${session.session_type}" style="color: var(--accent); text-decoration: underline; cursor: pointer;">${locationText}</a>`
              : `<span>${locationText}</span>`
          }
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
  
  // Handle individual session link clicks in modal
  const individualLinks = body.querySelectorAll('.individual-session-link');
  individualLinks.forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const sessionType = link.dataset.sessionType;
      if (sessionType) {
        // Close modal first
        overlay.style.display = 'none';
        // Navigate to individual session booking
        const virtualToggle = document.getElementById('virtualToggle');
        if (virtualToggle) {
          virtualToggle.click();
          // Wait a bit for the filters to load, then select the session type
          setTimeout(() => {
            const sessionTypeBtn = Array.from(document.querySelectorAll('.filter-btn')).find(btn => 
              btn.textContent.trim() === sessionType
            );
            if (sessionTypeBtn) {
              sessionTypeBtn.click();
            }
          }, 300);
        }
      }
    });
  });
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
async function handleReserveClick(session) {
  if (!supabaseReady || !supabase) {
    alert('System not ready. Please try again.');
    return;
  }

  try {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession || !authSession.user) {
      alert('Please log in to reserve a session.');
      return;
    }

    // Get the actual parent ID (handles account switcher)
    const currentRole = localStorage.getItem('hg-user-role');
    const selectedPlayerId = localStorage.getItem('selectedPlayerId');
    
    console.log('Parent schedule - handleReserveClick:', {
      currentRole,
      selectedPlayerId,
      userId: authSession.user.id
    });
    
    // Check if the logged-in user is actually a player
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authSession.user.id)
      .single();
    
    const isLoggedInAsPlayer = profile?.role === 'player';
    const isViewingAsParent = currentRole === 'parent';
    const isViewingAsPlayer = currentRole === 'player';
    
    let actualParentId = authSession.user.id;
    let playerIdToReserve = null;
    
    // If logged in as parent and viewing as player (via account switcher)
    if (!isLoggedInAsPlayer && isViewingAsPlayer && selectedPlayerId) {
      // Parent is viewing as a specific player - use that player's ID
      actualParentId = authSession.user.id; // Parent's ID
      playerIdToReserve = selectedPlayerId; // Selected player's ID
      console.log('Parent viewing as player - using playerId:', playerIdToReserve, 'parentId:', actualParentId);
    }
    // If logged in as player and viewing as parent (via account switcher)
    else if (isLoggedInAsPlayer && isViewingAsParent) {
      // Find their parent through the relationship
      const { data: relationship } = await supabase
        .from('parent_player_relationships')
        .select('parent_id')
        .eq('player_id', authSession.user.id)
        .single();
      
      if (relationship) {
        actualParentId = relationship.parent_id;
      } else {
        alert('No parent account linked.');
        return;
      }
      
      // If a specific player is selected via account switcher, use that
      if (selectedPlayerId) {
        playerIdToReserve = selectedPlayerId;
      }
    } 
    // If logged in as player and viewing as player (direct player login)
    else if (isLoggedInAsPlayer && isViewingAsPlayer) {
      // Logged in directly as a player (not via account switcher)
      // They should only be able to reserve for themselves
      playerIdToReserve = authSession.user.id;
      
      // Find their parent for the parent_id field
      const { data: relationship } = await supabase
        .from('parent_player_relationships')
        .select('parent_id')
        .eq('player_id', authSession.user.id)
        .single();
      
      if (relationship) {
        actualParentId = relationship.parent_id;
      } else {
        alert('No parent account linked.');
        return;
      }
    }
    
    // If we have a specific player ID to reserve for, use it directly
    if (playerIdToReserve) {
      await createReservation(session, playerIdToReserve, actualParentId);
      return;
    }

    // If logged in as parent and viewing as player but no selectedPlayerId, 
    // this shouldn't happen, but handle it gracefully
    if (!isLoggedInAsPlayer && isViewingAsPlayer && !selectedPlayerId) {
      console.error('Parent viewing as player but no selectedPlayerId found. currentRole:', currentRole, 'selectedPlayerId:', selectedPlayerId);
      alert('Please select a player from the account switcher first.');
      return;
    }

    // Otherwise, get linked players using the actual parent ID
    const { data: relationships, error: relError } = await supabase
      .from('parent_player_relationships')
      .select(`
        player_id,
        player:profiles!parent_player_relationships_player_id_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .eq('parent_id', actualParentId);

    if (relError) {
      console.error('Error loading linked players:', relError);
      alert('Error loading linked players.');
      return;
    }

    if (!relationships || relationships.length === 0) {
      alert('No linked players found. Please link a player account first.');
      return;
    }

    // If only one player, reserve directly
    if (relationships.length === 1) {
      const playerId = relationships[0].player_id;
      await createReservation(session, playerId, actualParentId);
      return;
    }

    // Multiple players - show selection modal
    showPlayerSelectionModal(session, relationships, actualParentId);
  } catch (error) {
    console.error('Error reserving session:', error);
    alert(`Error: ${error.message}`);
  }
}

// Show player selection modal for individual sessions (one at a time)
function showIndividualSessionPlayerSelection(relationships, sessionType, sessionTypeData, coachId, selectedDate, selectedTime, selectedSlot) {
  const overlay = document.createElement('div');
  overlay.className = 'player-selection-modal-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: var(--surface);
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  `;

  modal.innerHTML = `
    <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: var(--text);">
      Select Player
    </h3>
    <p style="margin: 0 0 20px 0; font-size: 14px; color: var(--muted);">
      Choose which player should be booked for this individual session.
    </p>
    <div class="player-selection-list" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
      ${relationships.map(rel => `
        <label style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; transition: background 0.2s;">
          <input type="radio" name="player-select" value="${rel.player_id}" style="width: 18px; height: 18px; cursor: pointer;">
          <span style="font-size: 14px; color: var(--text);">
            ${rel.player?.first_name || ''} ${rel.player?.last_name || ''}
          </span>
        </label>
      `).join('')}
    </div>
    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button class="cancel-btn" style="padding: 10px 20px; background: transparent; border: 1px solid var(--border); border-radius: 6px; color: var(--text); cursor: pointer;">
        Cancel
      </button>
      <button class="confirm-btn" style="padding: 10px 20px; background: var(--accent); border: none; border-radius: 6px; color: var(--text); cursor: pointer; font-weight: 500;">
        Book Session
      </button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Handle cancel
  modal.querySelector('.cancel-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  // Handle confirm
  modal.querySelector('.confirm-btn').addEventListener('click', async () => {
    const selected = modal.querySelector('input[name="player-select"]:checked');
    
    if (!selected) {
      alert('Please select a player.');
      return;
    }

    const playerId = selected.value;
    document.body.removeChild(overlay);

    // Create booking with selected player
    await createIndividualBooking(sessionType, sessionTypeData, coachId, playerId, selectedDate, selectedTime);
  });

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
}

// Show player selection modal for parents with multiple players (for group sessions)
function showPlayerSelectionModal(session, relationships, parentId) {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'player-selection-modal-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.6);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  const modal = document.createElement('div');
  modal.style.cssText = `
    background: var(--surface);
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  `;

  modal.innerHTML = `
    <h3 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: var(--text);">
      Select Player(s) to Reserve
    </h3>
    <p style="margin: 0 0 20px 0; font-size: 14px; color: var(--muted);">
      Choose which player(s) should be reserved for this session.
    </p>
    <div class="player-selection-list" style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
      ${relationships.map(rel => `
        <label style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--border); border-radius: 8px; cursor: pointer; transition: background 0.2s;">
          <input type="checkbox" value="${rel.player_id}" style="width: 18px; height: 18px; cursor: pointer;">
          <span style="font-size: 14px; color: var(--text);">
            ${rel.player.first_name} ${rel.player.last_name}
          </span>
        </label>
      `).join('')}
    </div>
    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button class="cancel-btn" style="padding: 10px 20px; background: transparent; border: 1px solid var(--border); border-radius: 6px; color: var(--text); cursor: pointer;">
        Cancel
      </button>
      <button class="confirm-btn" style="padding: 10px 20px; background: var(--accent); border: none; border-radius: 6px; color: var(--text); cursor: pointer; font-weight: 500;">
        Reserve
      </button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Handle cancel
  modal.querySelector('.cancel-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  // Handle confirm
  modal.querySelector('.confirm-btn').addEventListener('click', async () => {
    const selected = Array.from(modal.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => cb.value);

    if (selected.length === 0) {
      alert('Please select at least one player.');
      return;
    }

    document.body.removeChild(overlay);

    // Create reservations for selected players
    for (const playerId of selected) {
      await createReservation(session, playerId, parentId);
    }
  });

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
}

// Create reservation using secure database function
async function createReservation(session, playerId, parentId) {
  try {
    // Check if player already has a reservation
    // Use the RPC function's built-in check, but also check client-side if possible
    const { data: existingReservations, error: checkError } = await supabase
      .from('session_reservations')
      .select('id, reservation_status')
      .eq('session_id', session.id)
      .eq('player_id', playerId)
      .in('reservation_status', ['reserved', 'checked-in'])
      .limit(1);

    // If we can check and find an existing reservation, prevent duplicate
    if (!checkError && existingReservations && existingReservations.length > 0) {
      alert('This player already has a reservation for this session.');
      return;
    }

    // If there's an RLS error (can't check due to permissions), we'll rely on the RPC function
    // to handle the duplicate check, but log it for debugging
    if (checkError && checkError.code !== 'PGRST116') {
      console.warn('Could not check existing reservation (may be due to RLS):', checkError);
      // Continue anyway - the RPC function will handle duplicate prevention
    }

    // Check if session has available spots
    if (session.current_reservations >= session.attendance_limit) {
      alert('This session is full.');
      return;
    }

    // Use secure database function to create reservation
    // This function verifies the parent-player relationship and handles RLS
    const { data: reservationId, error } = await supabase.rpc('create_reservation_for_player', {
      p_session_id: session.id,
      p_player_id: playerId,
      p_reservation_status: 'reserved'
    });

    if (error) {
      console.error('Error creating reservation:', error);
      
      // Handle duplicate key error specifically (from database constraint or RPC function check)
      if (error.code === '23505' || 
          error.code === 'P0001' || // PostgreSQL exception code
          error.message?.includes('duplicate key') || 
          error.message?.includes('already exists') ||
          error.message?.includes('already has a reservation')) {
        alert('This player already has a reservation for this session. Please refresh the page to see updated reservations.');
        // Reload sessions to show the existing reservation
        const selectedDate = document.querySelector('.calendar-day.selected')?.dataset.date;
        if (selectedDate && typeof loadAndDisplaySessions === 'function') {
          await loadAndDisplaySessions();
        } else if (typeof loadUpcomingSessions === 'function') {
          await loadUpcomingSessions(null, null);
        }
        // Also reload parent home reservations
        if (typeof loadReservedSessions === 'function') {
          await loadReservedSessions();
        }
        if (typeof loadReservations === 'function') {
          await loadReservations();
        }
        return;
      }
      
      alert(`Error: ${error.message || 'Failed to create reservation'}`);
      return;
    }

    if (!reservationId) {
      alert('Failed to create reservation. Please try again.');
      return;
    }

    // Update session reservation count
    await supabase
      .from('sessions')
      .update({ current_reservations: session.current_reservations + 1 })
      .eq('id', session.id);

    alert('Session reserved successfully!');
    
    // Reload sessions to update UI
    const selectedDate = document.querySelector('.calendar-day.selected')?.dataset.date;
    if (selectedDate) {
      await loadUpcomingSessions(null, null);
    }
  } catch (error) {
    console.error('Error creating reservation:', error);
    alert(`Error: ${error.message}`);
  }
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
    // Recalculate calendar after it becomes visible to ensure proper sizing on mobile
    // Use multiple requestAnimationFrame calls to ensure layout is fully ready
    // Also force a layout recalculation by accessing offsetWidth
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        // Force layout calculation
        void calendar.offsetWidth;
        setTimeout(() => {
          updateCalendarHeaders();
        }, 100);
      });
    });
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
  selectedCoachRole = null;
  
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
  
  // #region agent log
  // #endregion
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
let selectedCoachRole = null; // "Coach", "Current Pro", etc. for booking summary
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
    // Only show coaches who have actual availability data set (not just is_available=true)
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
      .eq('is_available', true)
      .not('availability', 'is', null);
    
    // Filter to only include coaches with actual availability data (at least one day with available: true)
    const coachesWithAvailability = (coachAvailability || []).filter(coach => {
      const avail = coach.availability || {};
      const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      return days.some(day => {
        const dayAvail = avail[day];
        return dayAvail && dayAvail.available === true && 
               ((dayAvail.start && dayAvail.end) || (dayAvail.timeRanges && Array.isArray(dayAvail.timeRanges) && dayAvail.timeRanges.length > 0));
      });
    });
    
    if (coachError) {
      console.error('Error loading coach availability:', coachError);
      console.error('Coach availability error details:', {
        message: coachError.message,
        code: coachError.code,
        details: coachError.details,
        hint: coachError.hint
      });
    } else {
      // Coach availability loaded
    }
    
    // Store session type data and coach availability globally
    currentSessionTypeData = sessionTypeData;
    currentCoachAvailability = coachesWithAvailability;
    
    // Render date picker and time slots
    await renderDatePickerAndTimeSlots(sessionTypeData, sessionType, coachesWithAvailability);
    
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
  
  // Calculate max date (4 weeks from today)
  const maxDate = new Date(today);
  maxDate.setDate(today.getDate() + (4 * 7));
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
    const selectedDayNumber = datePicker.querySelector('.day-number.selected');
    let selectedDate = null;
    if (selectedDayNumber) {
      const calendarDay = selectedDayNumber.closest('.calendar-day');
      if (calendarDay && calendarDay.dataset.date) {
        const dateStr = calendarDay.dataset.date;
        const [year, month, day] = dateStr.split('-').map(Number);
        selectedDate = new Date(year, month - 1, day);
      }
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
}


// Setup date selection handlers
function setupDateSelectionHandlers(sessionTypeData, coachAvailability) {
  // Store for use in date click handlers
  currentSessionTypeData = sessionTypeData;
  currentCoachAvailability = coachAvailability || [];
  
  const datePicker = document.getElementById('individualDatePicker');
  if (!datePicker) return;
  
  // Remove existing listeners to avoid duplicates
  // No need to clone - we're attaching to day-number elements directly
  
  // Re-query after cloning - attach listeners to day-number elements
  const newDateDays = datePicker.querySelectorAll('.day-number');
  newDateDays.forEach(dayNumberEl => {
    dayNumberEl.addEventListener('click', async () => {
      // Update selected state
      newDateDays.forEach(d => d.classList.remove('selected'));
      dayNumberEl.classList.add('selected');
      // Hide booking footer when changing date (user didn't confirm)
      const footer = document.getElementById('individualBookingFooter');
      if (footer) footer.style.display = 'none';
      
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
      
      // Use stored session type data and coach availability
      await generateTimeSlots(selectedDate, currentSessionTypeData, currentCoachAvailability, timeSlots);
    });
  });
}

// Generate time slots based on availability
async function generateTimeSlots(selectedDate, sessionTypeData, coachAvailability, container) {
  if (!container) return;
  
  container.innerHTML = '<div class="loading-slots">Loading available times...</div>';
  
  // Check if we have session type data
  if (!sessionTypeData) {
    container.innerHTML = '<div class="no-slots">Session type not configured. Please create and configure this session type in the coach schedule.</div>';
    return;
  }
  
  // Normalize date to local time to avoid timezone issues
  // Create a new date using local year, month, day to ensure correct day of week
  const localDate = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
  
  // Get day of week (0 = Sunday, 6 = Saturday)
  const dayOfWeek = localDate.getDay();
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayName = dayNames[dayOfWeek];
  
  // Debug logging
  // Calculate date for time slots
  console.log('Date calculation for time slots:', {
    originalDate: selectedDate.toString(),
    localDate: localDate.toString(),
    dayOfWeek,
    dayName,
    dateStr: `${localDate.getFullYear()}-${String(localDate.getMonth() + 1).padStart(2, '0')}-${String(localDate.getDate()).padStart(2, '0')}`
  });
  
  // Get general availability from session type
  const generalAvailability = sessionTypeData.general_availability || {};
  const dayAvailability = generalAvailability[dayName] || {};
  
  // Check availability
  console.log('Availability check:', {
    dayName,
    dayAvailability,
    generalAvailability
  });
  
  // Default time slot granularity (in minutes)
  const granularity = sessionTypeData.time_slot_granularity_minutes || 20;
  const duration = sessionTypeData.duration_minutes || 20;
  
  // Get available time slots
  const availableSlots = [];
  
  console.log('🔄 generateTimeSlots - selectedCoachId:', selectedCoachId, 'coachAvailability count:', coachAvailability?.length || 0);
  
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
                  
                  // Merge slots (avoid duplicates) and track which coach each slot belongs to
                  coachSlots.forEach(slot => {
                    const existingSlot = availableSlots.find(s => s.time === slot.time);
                    if (!existingSlot) {
                      // Add coach_id to slot for tracking
                      availableSlots.push({ ...slot, coach_id: coach.coach_id });
                    } else {
                      // If slot already exists, add this coach to the list of coaches available for this slot
                      if (!existingSlot.coach_ids) {
                        existingSlot.coach_ids = [existingSlot.coach_id || coach.coach_id];
                        delete existingSlot.coach_id;
                      }
                      if (!existingSlot.coach_ids.includes(coach.coach_id)) {
                        existingSlot.coach_ids.push(coach.coach_id);
                      }
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
                
                // Merge slots (avoid duplicates) and track which coach each slot belongs to
                coachSlots.forEach(slot => {
                  const existingSlot = availableSlots.find(s => s.time === slot.time);
                  if (!existingSlot) {
                    // Add coach_id to slot for tracking
                    availableSlots.push({ ...slot, coach_id: coach.coach_id });
                  } else {
                    // If slot already exists, add this coach to the list of coaches available for this slot
                    if (!existingSlot.coach_ids) {
                      existingSlot.coach_ids = [existingSlot.coach_id || coach.coach_id];
                      delete existingSlot.coach_id;
                    }
                    if (!existingSlot.coach_ids.includes(coach.coach_id)) {
                      existingSlot.coach_ids.push(coach.coach_id);
                    }
                  }
                });
              }
            });
          }
        }
      });
      
      // Fallback to general availability if no coach availability was found
      if (availableSlots.length === 0 && dayAvailability.available && dayAvailability.start && dayAvailability.end) {
        const generalSlots = generateSlotsForTimeRange(
          dayAvailability.start,
          dayAvailability.end,
          granularity,
          duration
        );
        // For general availability, we don't know which coaches, so don't add coach tracking
        availableSlots.push(...generalSlots);
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
        
        // Intersect coach ranges with general availability (if general availability exists)
        // If no general availability, use coach ranges directly
        if (coachRanges.length > 0) {
          if (dayAvailability.available && dayAvailability.start && dayAvailability.end) {
            // General availability exists - intersect with coach ranges
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
          } else {
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
  }
  
  // Sort slots by time
  availableSlots.sort((a, b) => a.time.localeCompare(b.time));
  
  // Available slots calculated
  
  // Check for existing bookings to mark slots as unavailable
  // When "Any available" is selected, we need to check bookings per coach
  let bookedSlotsByCoach = {};
  if (!selectedCoachId) {
    // For "Any available", get bookings for each coach separately
    for (const coach of coachAvailability || []) {
      const coachBookings = await getBookedSlots(selectedDate, sessionTypeData.id, coach.coach_id);
      if (coachBookings.length > 0) {
        bookedSlotsByCoach[coach.coach_id] = coachBookings;
      }
    }
  } else {
    // For specific coach, get bookings for that coach only
    const bookings = await getBookedSlots(selectedDate, sessionTypeData.id, selectedCoachId);
    if (bookings.length > 0) {
      bookedSlotsByCoach[selectedCoachId] = bookings;
    }
  }
  
  // Get buffer times from session type
  const bufferBefore = sessionTypeData.buffer_before_minutes || 0;
  const bufferAfter = sessionTypeData.buffer_after_minutes || 0;
  
  // Buffer settings applied
  
  // Apply buffers to booked slots - mark slots as unavailable if they conflict
  // For "Any available", only mark a slot unavailable if ALL coaches for that slot are booked
  const unavailableSlots = new Set();
  
  // Process bookings per coach
  if (!selectedCoachId) {
    // For "Any available", mark slots unavailable only if ALL coaches for that slot are booked
    // For buffers, we'll apply them per coach - if a coach has a booking, mark buffer slots
    // as unavailable only if ALL coaches for those buffer slots are also booked
    availableSlots.forEach(slot => {
      const slotCoachIds = slot.coach_ids || (slot.coach_id ? [slot.coach_id] : []);
      if (slotCoachIds.length === 0) return;
      
      // Check if all coaches for this slot have this time booked
      const allCoachesBooked = slotCoachIds.every(cid => {
        const coachBookings = bookedSlotsByCoach[cid] || [];
        return coachBookings.includes(slot.time);
      });
      
      if (allCoachesBooked) {
        unavailableSlots.add(slot.time);
      }
    });
    
    // Apply buffers for "Any available" - simplified: only mark buffer slots unavailable
    // if they conflict with a booking AND the slot belongs to the coach with the booking
    // OR if all coaches for that buffer slot are booked
    Object.entries(bookedSlotsByCoach).forEach(([coachId, bookedTimes]) => {
      bookedTimes.forEach(bookedTime => {
        const [bookedHours, bookedMinutes] = bookedTime.split(':').map(Number);
        const bookedStart = new Date(selectedDate);
        bookedStart.setHours(bookedHours, bookedMinutes, 0, 0);
        const bookedEnd = new Date(bookedStart.getTime() + duration * 60000);
        
        // Mark buffer before - any slot that overlaps with the buffer period before the booking
        if (bufferBefore > 0) {
          const bufferStart = new Date(bookedStart.getTime() - bufferBefore * 60000);
          availableSlots.forEach(slot => {
            const [slotHours, slotMinutes] = slot.time.split(':').map(Number);
            const slotStart = new Date(selectedDate);
            slotStart.setHours(slotHours, slotMinutes, 0, 0);
            const slotEnd = new Date(slotStart.getTime() + duration * 60000);
            
            // Slot overlaps with buffer if: slotStart < bookedStart && slotEnd > bufferStart
            if (slotStart < bookedStart && slotEnd > bufferStart) {
              const slotCoachIds = slot.coach_ids || (slot.coach_id ? [slot.coach_id] : []);
              // Mark unavailable if this slot belongs to the coach with the booking
              // OR if all coaches for this slot are booked
              if (slotCoachIds.includes(coachId)) {
                // This slot belongs to the coach with the booking, so mark it unavailable
                unavailableSlots.add(slot.time);
              } else if (slotCoachIds.length > 0) {
                // Check if all coaches for this slot are booked
                const allSlotCoachesBooked = slotCoachIds.every(cid => {
                  const coachBookings = bookedSlotsByCoach[cid] || [];
                  return coachBookings.includes(slot.time);
                });
                if (allSlotCoachesBooked) {
                  unavailableSlots.add(slot.time);
                }
              }
            }
          });
        }
        
        // Mark buffer after - any slot that overlaps with the buffer period after the booking
        if (bufferAfter > 0) {
          const bufferEnd = new Date(bookedEnd.getTime() + bufferAfter * 60000);
          availableSlots.forEach(slot => {
            const [slotHours, slotMinutes] = slot.time.split(':').map(Number);
            const slotStart = new Date(selectedDate);
            slotStart.setHours(slotHours, slotMinutes, 0, 0);
            const slotEnd = new Date(slotStart.getTime() + duration * 60000);
            
            // Slot overlaps with buffer if: slotStart < bufferEnd && slotEnd > bookedEnd
            if (slotStart < bufferEnd && slotEnd > bookedEnd) {
              const slotCoachIds = slot.coach_ids || (slot.coach_id ? [slot.coach_id] : []);
              // Mark unavailable if this slot belongs to the coach with the booking
              // OR if all coaches for this slot are booked
              if (slotCoachIds.includes(coachId)) {
                // This slot belongs to the coach with the booking, so mark it unavailable
                unavailableSlots.add(slot.time);
              } else if (slotCoachIds.length > 0) {
                // Check if all coaches for this slot are booked
                const allSlotCoachesBooked = slotCoachIds.every(cid => {
                  const coachBookings = bookedSlotsByCoach[cid] || [];
                  return coachBookings.includes(slot.time);
                });
                if (allSlotCoachesBooked) {
                  unavailableSlots.add(slot.time);
                }
              }
            }
          });
        }
      });
    });
  } else {
    // For specific coach, use original logic
    Object.entries(bookedSlotsByCoach).forEach(([coachId, bookedTimes]) => {
      bookedTimes.forEach(bookedTime => {
        const [bookedHours, bookedMinutes] = bookedTime.split(':').map(Number);
        const bookedStart = new Date(selectedDate);
        bookedStart.setHours(bookedHours, bookedMinutes, 0, 0);
        
        // Mark buffer before - any slot that overlaps with the buffer period before the booking
        if (bufferBefore > 0) {
          const bufferStart = new Date(bookedStart.getTime() - bufferBefore * 60000);
          availableSlots.forEach(slot => {
            const [slotHours, slotMinutes] = slot.time.split(':').map(Number);
            const slotStart = new Date(selectedDate);
            slotStart.setHours(slotHours, slotMinutes, 0, 0);
            const slotEnd = new Date(slotStart.getTime() + duration * 60000);
            // Slot overlaps with buffer if: slotStart < bookedStart && slotEnd > bufferStart
            if (slotStart < bookedStart && slotEnd > bufferStart) {
              unavailableSlots.add(slot.time);
            }
          });
        }
        
        // Mark buffer after - any slot that overlaps with the buffer period after the booking
        if (bufferAfter > 0) {
          const bookedEnd = new Date(bookedStart.getTime() + duration * 60000);
          const bufferEnd = new Date(bookedEnd.getTime() + bufferAfter * 60000);
          availableSlots.forEach(slot => {
            const [slotHours, slotMinutes] = slot.time.split(':').map(Number);
            const slotStart = new Date(selectedDate);
            slotStart.setHours(slotHours, slotMinutes, 0, 0);
            const slotEnd = new Date(slotStart.getTime() + duration * 60000);
            // Slot overlaps with buffer if: slotStart < bufferEnd && slotEnd > bookedEnd
            if (slotStart < bufferEnd && slotEnd > bookedEnd) {
              unavailableSlots.add(slot.time);
            }
          });
        }
        
        // Mark the booked slot itself
        unavailableSlots.add(bookedTime);
      });
    });
  }
  
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
  
  // Calculate available slots after filtering
  const finalAvailableSlots = availableSlots.filter(slot => !unavailableSlots.has(slot.time));
  
  // Render time slots
  // Final available slots calculated
  
  // #region agent log
  const totalBookedSlots = Object.values(bookedSlotsByCoach).reduce((sum, bookings) => sum + bookings.length, 0);
  // #endregion
  
  // Check if there are any available slots after filtering
  if (finalAvailableSlots.length === 0) {
    container.innerHTML = '<div class="no-slots">No available time slots for this day. Please check coach availability settings.</div>';
    return;
  }
  
  if (unavailableSlots.size > 0) {
    // Unavailable slots filtered
  }
  
  container.innerHTML = finalAvailableSlots.map(slot => {
    return `
      <button class="time-slot-btn" 
              data-time="${slot.time}" 
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
// IMPORTANT: This checks ALL bookings for the coach/session type/date, regardless of which player booked it.
// Coach availability is universal - if one player books a slot, the coach is unavailable for all players.
async function getBookedSlots(date, sessionTypeId, coachId = null) {
  if (!supabaseReady || !supabase || !sessionTypeId) return [];
  
  try {
    // Format date as YYYY-MM-DD using local date components to avoid timezone issues
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    
    // Get the coach ID to check (required for time slot availability)
    const coachToCheck = coachId || selectedCoachId;
    if (!coachToCheck) {
      // No coach selected, can't determine availability
      return [];
    }
    
    // Query ALL bookings for this coach/session type/date
    // We don't filter by player_id because coach availability is universal
    // If any player books a slot with this coach, the coach is unavailable for that time
    let query = supabase
      .from('individual_session_bookings')
      .select('booking_time')
      .eq('session_type_id', sessionTypeId)
      .eq('booking_date', dateString)
      .eq('coach_id', coachToCheck) // Filter by coach (coach availability is universal)
      .eq('status', 'confirmed')
      .is('cancelled_at', null);
    
    const { data: bookings, error } = await query;
    
    if (error) {
      console.error('Error loading booked slots:', error);
      return [];
    }
    
    // Normalize booking_time to HH:MM format (remove seconds if present)
    return (bookings || []).map(b => {
      const time = b.booking_time || '';
      // If time includes seconds (HH:MM:SS), remove them
      if (time.length === 8 && time.includes(':')) {
        return time.substring(0, 5); // Return HH:MM
      }
      return time;
    });
  } catch (error) {
    console.error('Error getting booked slots:', error);
    return [];
  }
}

// Setup time slot click handlers
function setupTimeSlotHandlers() {
  // Remove existing listeners to prevent duplicates
  const timeSlotBtns = document.querySelectorAll('.time-slot-btn:not(.booked)');
  timeSlotBtns.forEach(btn => {
    // Clone and replace to remove all event listeners
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    newBtn.addEventListener('click', async () => {
      // Remove previous selection
      document.querySelectorAll('.time-slot-btn').forEach(b => b.classList.remove('selected'));
      
      // Select this slot first (so it's selected when coach is chosen)
      newBtn.classList.add('selected');
      
      // Ensure a date is selected - if not, select today's date
      const selectedDateNumber = document.querySelector('.day-number.selected');
      if (!selectedDateNumber) {
        // Find today's date in the calendar
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const todayElement = document.querySelector(`.calendar-day[data-date="${todayStr}"] .day-number`);
        if (todayElement) {
          document.querySelectorAll('.day-number').forEach(d => d.classList.remove('selected'));
          todayElement.classList.add('selected');
        }
      }
      
      // Check if a coach is selected
      if (!selectedCoachId) {
        // Show modal to choose a coach
        // The time slot is already selected, so after coach selection, updateBookingSummary will be called
        await showCoachSelectionModal(currentIndividualSessionType);
        return;
      }
      
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
  
  let staffLine = 'Any available';
  if (selectedCoachId) {
    let coachName = '';
    const coachElement = document.querySelector(`[data-coach-id="${selectedCoachId}"]`);
    if (coachElement) {
      const nameEl = coachElement.querySelector('.coach-card-name');
      if (nameEl) {
        coachName = nameEl.textContent.trim();
      } else {
        const span = coachElement.querySelector('span');
        if (span) {
          coachName = span.textContent.trim();
        } else {
          coachName = coachElement.textContent.trim().replace(/[×✕✖]/g, '').trim();
        }
      }
    }
    if (!coachName) {
      const coach = currentCoachAvailability?.find(c => c.coach_id === selectedCoachId);
      if (coach && coach.coach) {
        coachName = `${coach.coach.first_name || ''} ${coach.coach.last_name || ''}`.trim();
      }
    }
    const role = selectedCoachRole || 'Coach';
    staffLine = coachName ? `${role} ${coachName}` : 'Any available';
  }
  
  summary.innerHTML = `
    <div><strong>${currentIndividualSessionType}</strong></div>
    <div>${dateDisplayStr} at ${timeStr}</div>
    <div>${staffLine}</div>
  `;
  
  footer.style.display = 'flex';
}

// Day names for availability (index 0 = Sunday to match Date.getDay())
const AVAILABILITY_DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

// True if coach has availability on the given day
function coachAvailableOnDay(coach, dayName) {
  const avail = coach.availability || {};
  const dayAvail = avail[dayName];
  if (!dayAvail || dayAvail.available !== true) return false;
  return (dayAvail.start && dayAvail.end) ||
    (dayAvail.timeRanges && Array.isArray(dayAvail.timeRanges) && dayAvail.timeRanges.length > 0);
}

// Show coach selection modal (bottom sheet). If a date is selected, only coaches available that day are shown.
async function showCoachSelectionModal(sessionType) {
  if (!supabaseReady || !supabase) return;
  
  try {
    // Get currently selected date from individual booking date picker (if any)
    let selectedDayName = null;
    let selectedDateLabel = null;
    const selectedDateNumber = document.querySelector('#individualDatePicker .day-number.selected');
    if (selectedDateNumber) {
      const calendarDay = selectedDateNumber.closest('.calendar-day');
      if (calendarDay?.dataset?.date) {
        const [year, month, day] = calendarDay.dataset.date.split('-').map(Number);
        const selectedDate = new Date(year, month - 1, day);
        selectedDayName = AVAILABILITY_DAY_NAMES[selectedDate.getDay()];
        selectedDateLabel = selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
      }
    }

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
    
    // Load available coaches with actual availability data
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
          last_name,
          coach_role,
          profile_photo_url,
          team_logos
        )
      `)
      .eq('session_type_id', sessionTypeData.id)
      .eq('is_available', true)
      .not('availability', 'is', null);
    
    // Filter to coaches with at least one day of availability
    let coachesWithAvailability = (coachAvailability || []).filter(coach => {
      const avail = coach.availability || {};
      return AVAILABILITY_DAY_NAMES.some(day => {
        const dayAvail = avail[day];
        return dayAvail && dayAvail.available === true && 
               ((dayAvail.start && dayAvail.end) || (dayAvail.timeRanges && Array.isArray(dayAvail.timeRanges) && dayAvail.timeRanges.length > 0));
      });
    });

    // If a date is selected, show only coaches available on that day
    if (selectedDayName) {
      coachesWithAvailability = coachesWithAvailability.filter(coach => coachAvailableOnDay(coach, selectedDayName));
    }
    
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
    
    // Coach availability loaded
    
    // Create or show modal
    let modal = document.getElementById('coachSelectionModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'coachSelectionModal';
      modal.className = 'coach-selection-modal';
      document.body.appendChild(modal);
    }
    
    // Render modal content (only coaches available on selected day when a date is chosen)
    const coaches = coachesWithAvailability || [];
    modal.innerHTML = `
      <div class="coach-modal-overlay"></div>
      <div class="coach-modal-content">
        <div class="coach-modal-header">
          <h2>Select a Coach</h2>
          ${selectedDateLabel ? `<p class="coach-modal-date-hint">${selectedDateLabel}</p>` : ''}
          ${selectedDayName && coaches.length === 0 ? `<p class="coach-modal-no-coaches">No coaches available on this day. Select another date.</p>` : ''}
          <div class="coach-modal-filter">
            <select id="coachRoleFilter" class="coach-role-filter-select">
              <option value="all">All Coaches</option>
              <option value="Coach">Coach</option>
              <option value="Current Pro">Current Pro</option>
              <option value="Ex-Pro">Ex-Pro</option>
              <option value="GK Current Pro">GK Current Pro</option>
              <option value="GK Ex-Pro">GK Ex-Pro</option>
            </select>
          </div>
        </div>
        <div class="coach-cards-container">
          <div class="coach-card ${!selectedCoachId ? 'selected' : ''}" data-coach-id="">
            <div class="coach-card-avatar">
              <i class="bx bx-user"></i>
            </div>
            <div class="coach-card-name">Any available</div>
            <div class="coach-card-role">Any Coach</div>
            <div class="coach-card-selected-indicator ${!selectedCoachId ? 'visible' : ''}">
              <i class="bx bx-check-circle"></i>
            </div>
          </div>
          ${coaches.map(coach => {
            const coachName = `${coach.coach?.first_name || ''} ${coach.coach?.last_name || ''}`.trim();
            const initials = coachName.split(' ').map(n => n.charAt(0)).join('').toUpperCase() || 'C';
            const isSelected = selectedCoachId === coach.coach_id;
            const coachRole = coach.coach?.coach_role || 'Coach';
            const profilePhotoUrl = coach.coach?.profile_photo_url;
            const teamLogos = coach.coach?.team_logos || [];
            const isCurrentPro = coachRole === 'Current Pro' || coachRole === 'GK Current Pro';
            
            return `
              <div class="coach-card ${isSelected ? 'selected' : ''}" data-coach-id="${coach.coach_id}">
                ${profilePhotoUrl 
                  ? `<img src="${profilePhotoUrl}" alt="${coachName}" class="coach-card-photo" />`
                  : `<div class="coach-card-avatar">${initials}</div>`
                }
                <div class="coach-card-name">
                  ${coachName}
                  ${isCurrentPro ? '<i class="bx bx-check-circle coach-verified-badge"></i>' : ''}
                </div>
                <div class="coach-card-role">${coachRole}</div>
                ${teamLogos.length > 0 ? `
                  <div class="coach-card-teams">
                    ${teamLogos.map(logo => `
                      <img src="${logo}" alt="Team logo" class="team-logo" />
                    `).join('')}
                  </div>
                ` : ''}
                <div class="coach-card-selected-indicator ${isSelected ? 'visible' : ''}">
                  <i class="bx bx-check-circle"></i>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
    
    modal.style.display = 'block';
    
    // Setup event listeners
    const overlay = modal.querySelector('.coach-modal-overlay');
    const coachCards = modal.querySelectorAll('.coach-card');
    
    overlay.addEventListener('click', () => {
      modal.style.display = 'none';
    });
    
    // Setup role filter
    const roleFilter = modal.querySelector('#coachRoleFilter');
    if (roleFilter) {
      roleFilter.addEventListener('change', (e) => {
        const selectedRole = e.target.value;
        filterCoachesByRole(selectedRole, coachCards);
      });
    }
    
    coachCards.forEach(card => {
      card.addEventListener('click', async () => {
        const coachId = card.dataset.coachId || null;
        selectedCoachId = coachId;
        const roleEl = card.querySelector('.coach-card-role');
        selectedCoachRole = roleEl ? roleEl.textContent.trim() || null : null;
        if (!coachId) selectedCoachRole = null;
        
        // Update selected state
        coachCards.forEach(c => {
          c.classList.remove('selected');
          const indicator = c.querySelector('.coach-card-selected-indicator');
          if (indicator) indicator.classList.remove('visible');
        });
        card.classList.add('selected');
        const indicator = card.querySelector('.coach-card-selected-indicator');
        if (indicator) indicator.classList.add('visible');
        
        // Update staff selector display
        const staffSelector = document.getElementById('staffSelector');
        if (staffSelector) {
          const icon = staffSelector.querySelector('i:first-child');
          const span = staffSelector.querySelector('span');
          const existingPhoto = staffSelector.querySelector('img.staff-photo');
          const existingAvatar = staffSelector.querySelector('.staff-avatar');
          
          if (coachId) {
            // Get coach photo or avatar from card
            const coachPhoto = card.querySelector('.coach-card-photo');
            const coachAvatar = card.querySelector('.coach-card-avatar');
            const coachNameEl = card.querySelector('.coach-card-name');
            const coachName = coachNameEl ? coachNameEl.textContent.replace(/\s*✓\s*/g, '').trim() : 'Coach';
            
            // Remove existing photo/avatar if any
            if (existingPhoto) existingPhoto.remove();
            if (existingAvatar) existingAvatar.remove();
            
            // Hide the default icon
            if (icon) icon.style.display = 'none';
            
            // Add photo or avatar
            if (coachPhoto) {
              const photo = coachPhoto.cloneNode(true);
              photo.className = 'staff-photo';
              photo.style.width = '22px';
              photo.style.height = '22px';
              photo.style.borderRadius = '50%';
              photo.style.objectFit = 'cover';
              staffSelector.insertBefore(photo, span);
            } else if (coachAvatar) {
              const avatar = coachAvatar.cloneNode(true);
              avatar.className = 'staff-avatar';
              avatar.style.width = '22px';
              avatar.style.height = '22px';
              avatar.style.borderRadius = '50%';
              avatar.style.display = 'flex';
              avatar.style.alignItems = 'center';
              avatar.style.justifyContent = 'center';
              avatar.style.fontSize = '10px';
              avatar.style.background = 'var(--accent)';
              avatar.style.color = 'var(--text)';
              staffSelector.insertBefore(avatar, span);
            }
            
            // Update name
            if (span) span.textContent = coachName;
          } else {
            // Reset to "Any available"
            // Remove existing photo/avatar
            if (existingPhoto) existingPhoto.remove();
            if (existingAvatar) existingAvatar.remove();
            
            // Show the default icon
            if (icon) icon.style.display = 'block';
            
            // Update name
            if (span) span.textContent = 'Any available';
          }
        }
        
        // Reload time slots for selected coach
        // Try to get selected date from calendar
        let selectedDate = null;
        const selectedDateNumber = document.querySelector('.day-number.selected');
        if (selectedDateNumber) {
          const calendarDay = selectedDateNumber.closest('.calendar-day');
          if (calendarDay && calendarDay.dataset.date) {
            const dateStr = calendarDay.dataset.date;
            const [year, month, day] = dateStr.split('-').map(Number);
            selectedDate = new Date(year, month - 1, day);
          }
        }
        
        // If no date selected, use today or the first date in the calendar
        if (!selectedDate) {
          const firstDateNumber = document.querySelector('.day-number');
          if (firstDateNumber) {
            const calendarDay = firstDateNumber.closest('.calendar-day');
            if (calendarDay && calendarDay.dataset.date) {
              const dateStr = calendarDay.dataset.date;
              const [year, month, day] = dateStr.split('-').map(Number);
              selectedDate = new Date(year, month - 1, day);
            }
          }
        }
        
        // If still no date, use today
        if (!selectedDate) {
          selectedDate = new Date();
          selectedDate.setHours(0, 0, 0, 0);
        }
        
        console.log('🔄 Reloading time slots for coach:', coachId || 'Any available', 'on date:', selectedDate);
        const prevSelectedTime = document.querySelector('.time-slot-btn.selected')?.dataset?.time;
        await reloadTimeSlotsForCoach(selectedDate, sessionType);
        
        // Re-apply time selection and show footer if we had one before regenerate
        if (prevSelectedTime) {
          const btn = document.querySelector(`.time-slot-btn[data-time="${prevSelectedTime}"]:not(.booked)`);
          if (btn) {
            btn.classList.add('selected');
            updateBookingSummary();
          }
        }
        
        // Close modal
        modal.style.display = 'none';
      });
    });
    
  } catch (error) {
    console.error('Error showing coach selection modal:', error);
  }
}

// Filter coaches by role
function filterCoachesByRole(selectedRole, coachCards) {
  coachCards.forEach(card => {
    // Always show "Any available" option
    if (!card.dataset.coachId) {
      card.style.display = 'flex';
      return;
    }
    
    // For other coaches, check their role
    const roleElement = card.querySelector('.coach-card-role');
    if (roleElement) {
      const coachRole = roleElement.textContent.trim();
      if (selectedRole === 'all' || coachRole === selectedRole) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    }
  });
}

// Reload time slots when coach selection changes (simplified version)
async function reloadTimeSlotsForCoach(selectedDate, sessionType) {
  if (!supabaseReady || !supabase || !currentIndividualSessionType) return;
  
  try {
    console.log('🔄 reloadTimeSlotsForCoach called with:', {
      selectedDate,
      sessionType,
      selectedCoachId,
      currentIndividualSessionType
    });
    
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
    
    console.log('🔄 Regenerating time slots with selectedCoachId:', selectedCoachId);
    
    // Regenerate time slots - this will use the updated selectedCoachId global variable
    const timeSlots = document.getElementById('individualTimeSlots');
    if (timeSlots) {
      await generateTimeSlots(selectedDate, sessionTypeData, coachAvailability || [], timeSlots);
    } else {
      console.error('❌ Time slots container not found');
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
  
  const confirmBtn = document.getElementById('confirmBookingBtn');
  const originalConfirmText = confirmBtn?.textContent || 'Confirm';
  if (confirmBtn) {
    confirmBtn.disabled = true;
    confirmBtn.textContent = 'Confirming...';
  }

  const selectedSlot = document.querySelector('.time-slot-btn.selected');
  const selectedDateNumber = document.querySelector('.day-number.selected');
  
  if (!selectedSlot || !selectedDateNumber) {
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = originalConfirmText; }
    alert('Please select a date and time slot');
    return;
  }
  
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = originalConfirmText; }
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
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = originalConfirmText; }
      alert('Error: Session type not found');
      return;
    }
    
    // Determine coach_id (use selected coach or assign later)
    let coachId = selectedCoachId;
    if (!coachId) {
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = originalConfirmText; }
      alert('Please select a specific coach');
      return;
    }
    
    // Determine player_id and parent_id
    // Check both the actual profile role AND the current view role (for account switcher)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', session.user.id)
      .single();
    
    if (profileError || !profile) {
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = originalConfirmText; }
      alert('Error: User profile not found');
      return;
    }
    
    // Check if we're viewing as parent or player (account switcher)
    const currentRole = localStorage.getItem('hg-user-role');
    const selectedPlayerId = localStorage.getItem('selectedPlayerId');
    const isViewingAsParent = currentRole === 'parent';
    const isViewingAsPlayer = currentRole === 'player';
    
    let playerId = null;
    let parentId = null;
    let actualParentId = session.user.id; // Default to logged-in user
    
    // If logged in as parent and viewing as player (via account switcher)
    if (profile.role === 'parent' && isViewingAsPlayer && selectedPlayerId) {
      // Parent is viewing as a specific player - use that player's ID
      parentId = session.user.id; // Parent's ID
      actualParentId = session.user.id;
      playerId = selectedPlayerId; // Selected player's ID
      console.log('Parent viewing as player (individual) - using playerId:', playerId, 'parentId:', parentId);
    }
    // If logged in as player but viewing as parent, find the parent ID
    else if (profile.role === 'player' && isViewingAsParent) {
      const { data: relationship } = await supabase
        .from('parent_player_relationships')
        .select('parent_id')
        .eq('player_id', session.user.id)
        .single();
      
      if (relationship) {
        actualParentId = relationship.parent_id;
        parentId = relationship.parent_id;
      }
    } else if (profile.role === 'parent') {
      parentId = session.user.id;
      actualParentId = session.user.id;
    } else if (profile.role === 'player') {
      playerId = session.user.id;
    }
    
    // If we have a parent ID (either logged in as parent or viewing as parent), get linked players
    // But skip if we already have a playerId from account switcher
    // Also skip if playerId is already set (e.g., for player-only accounts)
    if ((parentId || isViewingAsParent) && !playerId) {
      // For parents (or players viewing as parent), get the linked player(s)
      const { data: relationships, error: relError } = await supabase
        .from('parent_player_relationships')
        .select(`
          player_id,
          player:profiles!parent_player_relationships_player_id_fkey(
            id,
            first_name,
            last_name
          )
        `)
        .eq('parent_id', actualParentId);
      
      if (relError || !relationships || relationships.length === 0) {
        // If player-only account (no parent relationship), allow them to book for themselves
        if (profile.role === 'player' && !parentId) {
          playerId = session.user.id;
          parentId = null; // Explicitly set to null for player-only accounts
        } else {
          if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = originalConfirmText; }
          alert('No linked players found. Please link a player account first.');
          return;
        }
      } else {
        // For individual sessions, only allow one player at a time
        if (relationships.length === 1) {
          playerId = relationships[0].player_id;
        } else {
          // Show player selection modal for multiple players (radio buttons - one at a time)
          const selectedTime = selectedSlot.dataset.time;
          const calendarDay = selectedDateNumber.closest('.calendar-day');
          const dateStr = calendarDay?.dataset.date;
          if (!dateStr) {
            if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = originalConfirmText; }
            alert('Error: Could not determine selected date');
            return;
          }
          const [year, month, day] = dateStr.split('-').map(Number);
          const selectedDate = new Date(year, month - 1, day);
          if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = originalConfirmText; }
          showIndividualSessionPlayerSelection(relationships, sessionType, sessionTypeData, coachId, selectedDate, selectedTime, selectedSlot);
          return;
        }
      }
    }
    
    // Parse as local date to avoid timezone issues
    // Get selected date from parent calendar-day - parse as local date to avoid timezone issues
    const calendarDay = selectedDateNumber.closest('.calendar-day');
    if (!calendarDay || !calendarDay.dataset.date) {
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = originalConfirmText; }
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
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = originalConfirmText; }
      alert(`This session must be booked at least ${minBookingNoticeHours} hours in advance. Please select a later time slot.`);
      return;
    }
    
    // Use the dateStr directly since it's already in YYYY-MM-DD format
    const dateString = dateStr;
    
    // Check for existing bookings that would conflict (same coach, date, time, or within buffer)
    const bufferBefore = sessionTypeData.buffer_before_minutes || 0;
    const bufferAfter = sessionTypeData.buffer_after_minutes || 0;
    const duration = sessionTypeData.duration_minutes || 20;
    
    const [selectedHours, selectedMinutes] = selectedTime.split(':').map(Number);
    const selectedStart = new Date(selectedDate);
    selectedStart.setHours(selectedHours, selectedMinutes, 0, 0);
    const selectedEnd = new Date(selectedStart.getTime() + duration * 60000);
    const conflictStart = new Date(selectedStart.getTime() - bufferBefore * 60000);
    const conflictEnd = new Date(selectedEnd.getTime() + bufferAfter * 60000);
    
    // Check for conflicting bookings
    const { data: existingBookings, error: conflictError } = await supabase
      .from('individual_session_bookings')
      .select('booking_time, duration_minutes')
      .eq('coach_id', coachId)
      .eq('booking_date', dateString)
      .eq('status', 'confirmed');
    
    if (conflictError) {
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = originalConfirmText; }
      console.error('Error checking for conflicts:', conflictError);
      alert('Error checking for existing bookings. Please try again.');
      return;
    }
    
    // Check if any existing booking conflicts with the selected time (including buffers)
    if (existingBookings && existingBookings.length > 0) {
      for (const existing of existingBookings) {
        const [existingHours, existingMinutes] = existing.booking_time.split(':').map(Number);
        const existingStart = new Date(selectedDate);
        existingStart.setHours(existingHours, existingMinutes, 0, 0);
        const existingDuration = existing.duration_minutes || duration;
        const existingEnd = new Date(existingStart.getTime() + existingDuration * 60000);
        const existingConflictStart = new Date(existingStart.getTime() - bufferBefore * 60000);
        const existingConflictEnd = new Date(existingEnd.getTime() + bufferAfter * 60000);
        
        // Check if times overlap (including buffers)
        if ((selectedStart < existingConflictEnd && selectedEnd > existingConflictStart) ||
            (existingStart < conflictEnd && existingEnd > conflictStart)) {
          if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = originalConfirmText; }
          alert('This time slot is already booked or conflicts with an existing booking (including buffer time). Please select a different time.');
          return;
        }
      }
    }
    
    // #region agent log
    // #endregion
    
    // Use secure database function to create booking
    // This function verifies the parent-player relationship and handles RLS
    // Use the new function that accepts parent_id and returns the full booking
    // parentId can be null for player-only accounts
    if (!playerId) {
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = originalConfirmText; }
      alert('Error: Could not determine player ID. Please try again.');
      return;
    }
    
    const { data: rpcResult, error: bookingError } = await supabase.rpc('create_individual_booking_for_player', {
      p_session_type_id: sessionTypeData.id,
      p_coach_id: coachId,
      p_player_id: playerId,
      p_parent_id: parentId, // Can be null for player-only accounts
      p_booking_date: dateString,
      p_booking_time: selectedTime,
      p_duration_minutes: sessionTypeData.duration_minutes
    });
    
    // #region agent log
    // #endregion
    
    if (bookingError) {
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = originalConfirmText; }
      console.error('Error creating booking:', bookingError);
      alert(`Error creating booking: ${bookingError.message || 'Failed to create booking'}`);
      return;
    }
    
    // The RPC function returns a TABLE, so rpcResult is an array
    const booking = rpcResult && rpcResult.length > 0 ? rpcResult[0] : null;
    
    if (!booking) {
      if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = originalConfirmText; }
      alert('Failed to create booking. Please try again.');
      return;
    }
    
    // Show confirmation screen (replaces DOM so Confirm button is removed)
    await showBookingConfirmation(booking, sessionTypeData, selectedDate, selectedTime, coachId);
    
  } catch (error) {
    console.error('Error confirming booking:', error);
    if (confirmBtn) { confirmBtn.disabled = false; confirmBtn.textContent = originalConfirmText; }
    alert(`Error: ${error.message}`);
  }
}

// Helper function to create individual booking (extracted for reuse)
async function createIndividualBooking(sessionType, sessionTypeData, coachId, playerId, selectedDate, selectedTime) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      alert('Not logged in');
      return;
    }
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    // Check if we're viewing as parent (account switcher) or actually logged in as parent
    const currentRole = localStorage.getItem('hg-user-role');
    const isViewingAsParent = currentRole === 'parent';
    
    // Determine parent ID - either logged in as parent or viewing as parent
    let parentId = null;
    if (profile?.role === 'parent') {
      parentId = session.user.id;
    } else if (profile?.role === 'player' && isViewingAsParent) {
      // Player viewing as parent - find the parent ID
      const { data: relationship } = await supabase
        .from('parent_player_relationships')
        .select('parent_id')
        .eq('player_id', session.user.id)
        .single();
      
      if (relationship) {
        parentId = relationship.parent_id;
      }
    }
    
    // Format date - handle both Date object and string
    let dateString;
    if (selectedDate instanceof Date) {
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      dateString = `${year}-${month}-${day}`;
    } else {
      dateString = selectedDate; // Assume it's already in YYYY-MM-DD format
    }
    
    // Use RPC function for parents (logged in or viewing as parent) to bypass RLS, or direct insert for players
    let booking;
    let bookingError;
    
    if (parentId && (profile?.role === 'parent' || isViewingAsParent)) {
      // Parent booking for player - use RPC function
      // Pass parent_id for validation (function will verify it matches the logged-in user)
      const { data: rpcResult, error: rpcError } = await supabase.rpc('create_individual_booking_for_player', {
        p_session_type_id: sessionTypeData.id,
        p_coach_id: coachId,
        p_player_id: playerId,
        p_parent_id: parentId,
        p_booking_date: dateString,
        p_booking_time: selectedTime,
        p_duration_minutes: sessionTypeData.duration_minutes
      });
      
      if (rpcError) {
        bookingError = rpcError;
      } else if (rpcResult && rpcResult.length > 0) {
        booking = rpcResult[0];
      } else {
        bookingError = { message: 'No booking returned from RPC function' };
      }
    } else {
      // Player booking directly - use direct insert
      const { data: insertResult, error: insertError } = await supabase
        .from('individual_session_bookings')
        .insert({
          session_type_id: sessionTypeData.id,
          coach_id: coachId,
          player_id: playerId,
          parent_id: parentId,
          booking_date: dateString,
          booking_time: selectedTime,
          duration_minutes: sessionTypeData.duration_minutes,
          status: 'confirmed'
        })
        .select()
        .single();
      
      booking = insertResult;
      bookingError = insertError;
    }
    
    if (bookingError) {
      console.error('Error creating booking:', bookingError);
      alert(`Error creating booking: ${bookingError.message || 'Failed to create booking'}`);
      return;
    }
    
    if (!booking) {
      alert('Failed to create booking. Please try again.');
      return;
    }
    
    // Show confirmation screen
    await showBookingConfirmation(booking, sessionTypeData, selectedDate, selectedTime, coachId);
  } catch (error) {
    console.error('Error creating booking:', error);
    alert(`Error: ${error.message}`);
  }
}

// Show booking confirmation screen
async function showBookingConfirmation(booking, sessionTypeData, selectedDate, selectedTime, coachId) {
  const bookingContainer = document.getElementById('individualSessionBooking');
  const contentContainer = document.getElementById('virtualContentContainer');

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
  
  const confirmationHTML = `
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

  const confirmationParent = contentContainer || bookingContainer;
  if (!confirmationParent) return;

  if (bookingContainer) bookingContainer.style.display = 'none';
  if (contentContainer) {
    contentContainer.innerHTML = confirmationHTML;
  } else {
    bookingContainer.innerHTML = confirmationHTML;
    bookingContainer.style.display = 'block';
  }
  
  await regenerateTimeSlotsAfterBooking(selectedDate, sessionTypeData, coachId);
  
  const bookAnotherBtn = confirmationParent.querySelector('#bookAnotherBtn');
  const backToReservations = confirmationParent.querySelector('#backToReservations');
  
  if (bookAnotherBtn) {
    bookAnotherBtn.addEventListener('click', async () => {
      const filters = document.getElementById('virtualFilters');
      if (filters) {
        const activeBtn = filters.querySelector('.filter-btn.active');
        if (activeBtn) {
          await showIndividualSessionBooking(activeBtn.dataset.type, filters);
        }
      }
    });
  }
  
  if (backToReservations) {
    backToReservations.addEventListener('click', (e) => {
      e.preventDefault();
      confirmationParent.innerHTML = '';
      const filters = document.getElementById('virtualFilters');
      if (filters) {
        filters.style.display = 'flex';
        filters.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      }
      if (bookingContainer && !contentContainer) {
        bookingContainer.style.display = 'none';
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

// Regenerate time slots after a booking is made
async function regenerateTimeSlotsAfterBooking(selectedDate, sessionTypeData, coachId) {
  // Get the time slots container
  const timeSlots = document.getElementById('individualTimeSlots');
  if (!timeSlots || !currentSessionTypeData || !currentCoachAvailability) return;
  
  // Get the currently selected date
  const selectedDateNumber = document.querySelector('.day-number.selected');
  let dateToUse = selectedDate;
  
  if (selectedDateNumber) {
    const calendarDay = selectedDateNumber.closest('.calendar-day');
    if (calendarDay && calendarDay.dataset.date) {
      const dateStr = calendarDay.dataset.date;
      const [year, month, day] = dateStr.split('-').map(Number);
      dateToUse = new Date(year, month - 1, day);
    }
  }
  
  // Regenerate time slots with updated bookings
  await generateTimeSlots(dateToUse, currentSessionTypeData, currentCoachAvailability, timeSlots);
}

// Setup real-time subscriptions (stub - real-time handled in home page)
function setupRealtimeSubscriptions() {
  // Real-time subscriptions are handled in parent/home/home.js
  // This is just a stub to prevent errors
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Also recalculate calendar when page is shown (handles page navigation)
// This ensures calendar is recalculated when switching back to schedule page
window.addEventListener('pageshow', (event) => {
  // Only recalculate if we're on the schedule page and calendar exists
  if (event.persisted || document.visibilityState === 'visible') {
    const onFieldCalendar = document.getElementById('onFieldCalendarHeader');
    const virtualCalendar = document.getElementById('virtualCalendarHeader');
    if (onFieldCalendar || virtualCalendar) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          // Force layout calculation
          if (onFieldCalendar) void onFieldCalendar.offsetWidth;
          if (virtualCalendar) void virtualCalendar.offsetWidth;
          setTimeout(() => {
            updateCalendarHeaders();
          }, 150);
        });
      });
    }
  }
});
