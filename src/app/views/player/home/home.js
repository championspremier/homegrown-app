// Player Home page scripts
import { initSupabase } from '../../../../auth/config/supabase.js';
import { getAccountContext } from '../../../utils/account-context.js';
import { initCurriculumFocus } from './curriculum-focus.js';
import { showLoader, hideLoader } from '../../../utils/loader.js';

// Calculate solo session duration from session data
function calculateSoloSessionDuration(soloSession) {
  if (!soloSession) return 30; // Default fallback
  
  let totalMinutes = 0;
  
  // Warm-up duration (default 5 minutes)
  totalMinutes += 5;
  
  // Main exercises duration
  if (soloSession.main_exercises && Array.isArray(soloSession.main_exercises)) {
    soloSession.main_exercises.forEach(ex => {
      const exerciseDuration = ex.duration || 3; // 3 min default per set
      const restTime = ex.rest_time || 1; // 1 min rest default between sets
      const sets = ex.sets || 1;
      
      // For each set: exercise duration + rest time (except last set)
      totalMinutes += (exerciseDuration * sets) + (restTime * (sets - 1));
    });
  }
  
  // Finishing/Passing duration (default 5 minutes)
  totalMinutes += 5;
  
  return Math.ceil(totalMinutes);
}

let supabase;
let supabaseReady = false;
let currentWeekStart = new Date();
let selectedDate = new Date();

// Clean up any lingering skeletons
function cleanupSkeletons() {
  const contentArea = document.querySelector('.content-area');
  if (contentArea) {
    const contentSkeleton = contentArea.querySelector('.page-skeleton');
    if (contentSkeleton) {
      contentSkeleton.remove();
    }
    
    // Restore any hidden content
    const hiddenContent = contentArea.querySelectorAll('[data-skeleton-hidden="true"]');
    hiddenContent.forEach(element => {
      element.style.display = '';
      element.removeAttribute('data-skeleton-hidden');
    });
  }
  
  // Remove header skeleton if it exists
  const mainContent = document.querySelector('.main-content');
  if (mainContent) {
    const headerSkeleton = mainContent.querySelector('.skeleton-home-header');
    if (headerSkeleton) {
      headerSkeleton.remove();
    }
  }
}

// Initialize Supabase
async function init() {
  supabase = await initSupabase();
  if (supabase) {
    supabaseReady = true;
    
    // Clean up any lingering skeletons from previous loads
    cleanupSkeletons();
    
    setupEventListeners();
    renderCalendar();
    setupRealtimeSubscriptions();
    loadReservedSessions();
    loadNotifications();
    loadObjectives();
    loadQuizzes();
    setupNotificationBottomSheet();
  } else {
    console.error('Failed to initialize Supabase');
  }
  
  // Initialize curriculum focus display
  initCurriculumFocus();
  
  // Move home-header above top-bar (with delay to ensure DOM is ready)
  // Only move header on home page (this file only loads on home page anyway)
  setTimeout(() => {
    moveHeaderAboveTopBar();
  }, 50);
}

// Move home-header above top-bar in the DOM
let moveHeaderRetryCount = 0;
const MAX_RETRIES = 10;

function moveHeaderAboveTopBar() {
  const mainContent = document.querySelector('.main-content');
  if (!mainContent) {
    // Retry after a short delay if main-content doesn't exist yet
    if (moveHeaderRetryCount < MAX_RETRIES) {
      moveHeaderRetryCount++;
      setTimeout(moveHeaderAboveTopBar, 100);
    }
    return;
  }
  
  // Check if header is already in the correct position (in main-content before top-bar)
  const topBar = document.querySelector('.top-bar');
  const existingHeaderInMain = mainContent ? mainContent.querySelector('.home-header:not(.skeleton-home-header)') : null;
  const contentArea = document.querySelector('.content-area');
  const homeHeaderInContent = contentArea ? contentArea.querySelector('.home-header') : null;
  
  // If header is already in main-content and positioned correctly, remove skeleton and any duplicate in content-area
  if (existingHeaderInMain && topBar && existingHeaderInMain.parentElement === mainContent) {
    const headerIndex = Array.from(mainContent.children).indexOf(existingHeaderInMain);
    const topBarIndex = Array.from(mainContent.children).indexOf(topBar);
    if (headerIndex < topBarIndex) {
      // Header is already in the correct position
      // Remove skeleton header if it exists
      const skeletonHeader = mainContent.querySelector('.skeleton-home-header');
      if (skeletonHeader) {
        skeletonHeader.remove();
      }
      // Remove any duplicate header that might still be in content-area
      if (homeHeaderInContent) {
        console.log('Removing duplicate header from content-area');
        homeHeaderInContent.remove();
      }
      // Remove content skeleton and restore hidden content (e.g. after account switch)
      if (contentArea) {
        const contentSkeleton = contentArea.querySelector('.page-skeleton');
        if (contentSkeleton) {
          contentSkeleton.remove();
        }
        const hiddenContent = contentArea.querySelectorAll('[data-skeleton-hidden="true"]');
        hiddenContent.forEach(element => {
          element.style.display = '';
          element.removeAttribute('data-skeleton-hidden');
        });
      }
      if (typeof window.__showLeaderboard === 'function') {
        window.__showLeaderboard();
      }
      moveHeaderRetryCount = 0;
      return;
    }
  }
  
  // If we have a header in content-area, move it to main-content
  if (homeHeaderInContent && topBar && mainContent) {
    // Remove old header from main-content only if we have a new one to move
    const allHeaders = mainContent.querySelectorAll('.home-header:not(.skeleton-home-header)');
    allHeaders.forEach(header => {
      // Check if it's a direct child of main-content (not inside content-area)
      if (header.parentElement === mainContent) {
        console.log('Removing old header from main-content before moving new one');
        header.remove();
      }
    });
    
    // Make header visible before moving (it was hidden to prevent jump)
    // Reset all hidden styles
    homeHeaderInContent.style.display = '';
    homeHeaderInContent.style.visibility = '';
    homeHeaderInContent.style.opacity = '';
    homeHeaderInContent.style.position = '';
    homeHeaderInContent.style.pointerEvents = '';
    
    // Move home-header to appear before top-bar (replacing skeleton position)
    mainContent.insertBefore(homeHeaderInContent, topBar);
    
    // Remove skeleton header after moving actual header (prevents visual jump)
    const skeletonHeader = mainContent.querySelector('.skeleton-home-header');
    if (skeletonHeader) {
      skeletonHeader.remove();
    }
    
    // Remove content skeleton and restore hidden content now that header is moved and content is ready
    const contentArea = document.querySelector('.content-area');
    if (contentArea) {
      const contentSkeleton = contentArea.querySelector('.page-skeleton');
      if (contentSkeleton) {
        contentSkeleton.remove();
      }
      
      // Restore all content that was hidden for skeleton
      const hiddenContent = contentArea.querySelectorAll('[data-skeleton-hidden="true"]');
      hiddenContent.forEach(element => {
        element.style.display = '';
        element.removeAttribute('data-skeleton-hidden');
      });
    }
    
    if (typeof window.__showLeaderboard === 'function') {
      window.__showLeaderboard();
    }
    
    moveHeaderRetryCount = 0; // Reset on success
    
    // Re-attach account switcher listeners after moving header
    // The elements might have been replaced during the move
    if (window.attachAccountSwitcherListeners) {
      setTimeout(() => {
        console.log('Re-attaching account switcher listeners after header move');
        window.attachAccountSwitcherListeners();
      }, 50);
    }
  } else if (!homeHeader && moveHeaderRetryCount < MAX_RETRIES) {
    // Header not found yet, retry after a short delay
    moveHeaderRetryCount++;
    setTimeout(moveHeaderAboveTopBar, 100);
  } else {
    // Reset retry count if we've exhausted retries
    moveHeaderRetryCount = 0;
  }
}

// Setup event listeners
function setupEventListeners() {
  // Toggle card switching
  document.querySelectorAll('.schedule-toggle-card').forEach(card => {
    card.addEventListener('click', () => {
      const tabName = card.dataset.tab;
      switchTab(tabName);
    });
  });

  // Calendar navigation
  document.getElementById('playerHomeCalendarPrev')?.addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    renderCalendar();
  });

  document.getElementById('playerHomeCalendarNext')?.addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    renderCalendar();
  });

  // Objectives/Quiz Tab functionality
  setupObjectivesQuizTabs();
  
  // Notification bell functionality
  setupNotificationBottomSheet();
  
  // Load reserved sessions immediately (no toggle needed)
  loadReservedSessions();
  
  // Initialize toggle cards state
  const toggleCards = document.querySelector('.schedule-toggle-cards');
  if (toggleCards) {
    toggleCards.classList.add('sessions-active');
  }
}

// Switch between Sessions and Reservations tabs
function switchTab(tabName) {
  const toggleCards = document.querySelector('.schedule-toggle-cards');
  const myScheduleCard = document.getElementById('myScheduleToggle');
  const reservationsCard = document.getElementById('reservationsToggle');
  
  // Update toggle cards
  document.querySelectorAll('.schedule-toggle-card').forEach(card => {
    card.classList.toggle('active', card.dataset.tab === tabName);
  });
  
  // Add class to container for CSS targeting
  if (toggleCards) {
    toggleCards.classList.toggle('sessions-active', tabName === 'sessions');
    toggleCards.classList.toggle('reservations-active', tabName === 'reservations');
  }

  // Update tab content
  document.querySelectorAll('.schedule-tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}TabContent`);
  });

  // Show/hide calendar based on tab
  const calendar = document.getElementById('playerHomeCalendar');
  const emptyMessageEl = document.getElementById('sessionsEmptyMessage');
  if (calendar) {
    if (tabName === 'sessions') {
      calendar.style.display = 'flex';
      // Recalculate calendar after it becomes visible to ensure proper sizing on mobile
      requestAnimationFrame(() => {
        renderCalendar();
      });
      // Show empty message if sessions tab is active (will be updated by renderSessionsList)
      if (emptyMessageEl) {
        emptyMessageEl.style.display = 'block';
      }
    } else {
      calendar.style.display = 'none';
      // Hide empty message when switching to reservations
      if (emptyMessageEl) {
        emptyMessageEl.style.display = 'none';
      }
    }
  }

  // Load data for the active tab
  if (tabName === 'sessions') {
    loadReservedSessions();
  } else if (tabName === 'reservations') {
    loadReservations();
  }
}

// Render calendar
function renderCalendar() {
  const weekRow = document.getElementById('playerHomeCalendarWeek');
  if (!weekRow) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get week start (Sunday)
  const weekStart = new Date(currentWeekStart);
  const dayOfWeek = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);

  weekRow.innerHTML = '';

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  for (let i = 0; i < 7; i++) {
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + i);
    date.setHours(0, 0, 0, 0);

    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const isToday = date.toDateString() === today.toDateString();
    const isPast = date < today;
    const isSelected = date.toDateString() === selectedDate.toDateString();

    const dayEl = document.createElement('div');
    dayEl.className = 'calendar-day';
    dayEl.dataset.date = dateStr;
    dayEl.innerHTML = `
      <div class="day-label">${dayLabels[i]}</div>
      <div class="day-number ${isToday ? 'today' : ''} ${isPast ? 'past' : ''} ${isSelected ? 'selected' : ''}">${date.getDate()}</div>
    `;

    dayEl.addEventListener('click', () => {
      selectedDate = date;
      renderCalendar();
      loadReservedSessions();
    });

    weekRow.appendChild(dayEl);
  }
}

// Load reserved sessions (group and individual)
async function loadReservedSessions() {
  if (!supabaseReady || !supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return;

    // Get account context to determine correct player ID
    const context = await getAccountContext();
    if (!context) {
      console.warn('Could not get account context');
      return;
    }
    
    // Get the correct player ID for this view
    const playerId = context.getPlayerIdForAction();
    if (!playerId) {
      console.warn('Could not determine player ID');
      return;
    }
    
    const container = document.getElementById('sessionsListContainer');
    if (!container) return;

    container.innerHTML = '';
    showLoader(container, 'Loading sessions...');

    // Load group session reservations
    // Don't use !inner - we want to see all reservations even if session RLS blocks the relationship
    // We'll handle null sessions separately
    const { data: groupReservations, error: groupError } = await supabase
      .from('session_reservations')
      .select(`
        *,
        session:sessions(
          id,
          session_type,
          session_date,
          session_time,
          duration_minutes,
          location_type,
          location,
          zoom_link,
          coach_id,
          attendance_limit,
          current_reservations,
          coach:profiles!sessions_coach_id_fkey(
            first_name,
            last_name
          )
        )
      `)
      .eq('player_id', playerId)
      .in('reservation_status', ['reserved', 'checked-in']);

    // If session relationship failed due to RLS, try to load sessions separately
    if (groupReservations && groupReservations.length > 0) {
      const reservationsWithNullSessions = groupReservations.filter(r => !r.session);
      if (reservationsWithNullSessions.length > 0) {
        // Try to load session data separately for reservations where session is null
        const sessionIds = reservationsWithNullSessions.map(r => r.session_id).filter(Boolean);
        if (sessionIds.length > 0) {
          const { data: sessions, error: sessionsError } = await supabase
            .from('sessions')
            .select(`
              id,
              session_type,
              session_date,
              session_time,
              duration_minutes,
              location_type,
              location,
              zoom_link,
              coach_id,
              attendance_limit,
              current_reservations,
              coach:profiles!sessions_coach_id_fkey(
                first_name,
                last_name
              )
            `)
            .in('id', sessionIds);

          if (!sessionsError && sessions) {
            // Map sessions to reservations
            const sessionMap = new Map(sessions.map(s => [s.id, s]));
            groupReservations.forEach(reservation => {
              if (!reservation.session && sessionMap.has(reservation.session_id)) {
                reservation.session = sessionMap.get(reservation.session_id);
              }
            });
          }
        }
      }
    }

    if (groupError) {
      console.error('Error loading group reservations:', groupError);
    }

    // Load individual session bookings
    // Use the same playerId we determined above (handles account switcher)
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
        )
      `)
      .eq('player_id', playerId)
      .in('status', ['confirmed', 'completed'])
      .neq('status', 'cancelled')
      .is('cancelled_at', null)
      .order('booking_date', { ascending: true })
      .order('booking_time', { ascending: true });

    if (individualError) {
      console.error('Error loading individual bookings:', individualError);
    }

    // Combine and format sessions
    const allSessions = [];

    // Add group sessions
    // Filter out reservations where session is null (RLS might block some)
    if (groupReservations) {
      groupReservations.forEach(reservation => {
        // Only add if session data exists (reservation was successfully joined with session)
        if (reservation.session && reservation.session.id) {
          allSessions.push({
            id: reservation.session.id,
            reservation_id: reservation.id,
            session_type: reservation.session.session_type,
            session_date: reservation.session.session_date,
            session_time: reservation.session.session_time,
            duration_minutes: reservation.session.duration_minutes || 90,
            location_type: reservation.session.location_type,
            location: reservation.session.location,
            zoom_link: reservation.session.zoom_link,
            coach: reservation.session.coach,
            coach_id: reservation.session.coach_id,
            is_individual: false,
            reservation_status: reservation.reservation_status
          });
        } else {
          // Session data missing due to RLS - this is expected and handled by loading sessions separately
          // No need to log as warning since it's handled gracefully
        }
      });
    }

    // Add individual sessions
    if (individualBookings) {
      individualBookings.forEach(booking => {
        allSessions.push({
          id: booking.id,
          reservation_id: booking.id,
          session_type: booking.session_type?.display_name || booking.session_type?.name || 'Individual Session',
          session_date: booking.booking_date,
          session_time: booking.booking_time,
          duration_minutes: booking.duration_minutes || booking.session_type?.duration_minutes || 20,
          location_type: 'virtual',
          location: null,
          zoom_link: booking.zoom_link,
          coach: booking.coach,
          coach_id: booking.coach_id,
          is_individual: true,
          reservation_status: 'reserved',
          color: booking.session_type?.color
        });
      });
    }

    // Load solo session bookings (future only)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    const { data: soloBookings, error: soloError } = await supabase
      .from('player_solo_session_bookings')
      .select(`
        *,
        solo_session:solo_sessions(
          id,
          title,
          category,
          period,
          skill,
          sub_skill,
          main_exercises
        )
      `)
      .eq('player_id', playerId)
      .in('status', ['scheduled', 'completed', 'pending_review', 'checked-in', 'denied'])
      .gte('scheduled_date', todayStr);

    if (soloError) {
      console.error('Error loading solo bookings:', soloError);
    }

    // Add solo sessions - fetch missing skills from videos if needed
    if (soloBookings && soloBookings.length > 0) {
      const bookingsWithSkills = await Promise.all(
        soloBookings.map(async (booking) => {
          let skillToUse = booking.solo_session?.skill;
          
          // If skill is null, try to get it from the first main exercise video
          if (!skillToUse && booking.solo_session?.main_exercises && 
              Array.isArray(booking.solo_session.main_exercises) && 
              booking.solo_session.main_exercises.length > 0) {
            const firstExercise = booking.solo_session.main_exercises[0];
            if (firstExercise?.video_id) {
              const { data: video } = await supabase
                .from('solo_session_videos')
                .select('skill')
                .eq('id', firstExercise.video_id)
                .single();
              
              if (video?.skill) {
                skillToUse = video.skill;
              }
            }
          }
          
          return { ...booking, resolvedSkill: skillToUse };
        })
      );
      
      bookingsWithSkills.forEach(booking => {
        allSessions.push({
          id: booking.id,
          reservation_id: booking.id,
          session_type: booking.solo_session?.title || 'Solo Session',
          session_date: booking.scheduled_date,
          session_time: booking.scheduled_time,
          duration_minutes: calculateSoloSessionDuration(booking.solo_session),
          location_type: 'solo',
          location: null,
          zoom_link: null,
          coach: null,
          coach_id: null,
          is_individual: false,
          is_solo: true,
          reservation_status: booking.status,
          solo_booking: booking,
          completion_photo_url: booking.completion_photo_url,
          skill: booking.resolvedSkill || booking.solo_session?.skill
        });
      });
    }

    // Sort by date and time first
    allSessions.sort((a, b) => {
      const dateCompare = a.session_date.localeCompare(b.session_date);
      if (dateCompare !== 0) return dateCompare;
      return a.session_time.localeCompare(b.session_time);
    });

    // Show calendar for sessions tab
    const calendar = document.getElementById('playerHomeCalendar');
    if (calendar) {
      calendar.style.display = 'flex';
    }

    // Filter by selected date if a date is selected
    const filteredSessions = selectedDate
      ? allSessions.filter(s => {
          const sessionDate = new Date(s.session_date + 'T00:00:00');
          sessionDate.setHours(0, 0, 0, 0);
          const selected = new Date(selectedDate);
          selected.setHours(0, 0, 0, 0);
          return sessionDate.toDateString() === selected.toDateString();
        })
      : allSessions;

    // Render sessions
    renderSessionsList(filteredSessions, container);

  } catch (error) {
    console.error('Error loading reserved sessions:', error);
    const container = document.getElementById('sessionsListContainer');
    if (container) {
      container.innerHTML = '<div class="error-state">Error loading sessions. Please try again.</div>';
    }
  } finally {
    const container = document.getElementById('sessionsListContainer');
    if (container) hideLoader(container);
  }
}

// Render sessions list
function renderSessionsList(sessions, container) {
  if (!container) return;

  // Update toggle card badge with count
  const isReservationsTab = container.id === 'reservationsListContainer';
  const badgeEl = isReservationsTab 
    ? document.getElementById('reservationsBadge')
    : document.getElementById('myScheduleBadge');
  const toggleCard = isReservationsTab
    ? document.getElementById('reservationsToggle')
    : document.getElementById('myScheduleToggle');

  if (sessions.length === 0) {
    // Hide badge when empty
    if (badgeEl) {
      badgeEl.style.display = 'none';
    }
    
    // Show "No Sessions Reserved" under calendar for sessions tab
    if (!isReservationsTab) {
      const emptyMessageEl = document.getElementById('sessionsEmptyMessage');
      if (emptyMessageEl && toggleCard?.classList.contains('active')) {
        emptyMessageEl.textContent = 'No Sessions Reserved Today';
        emptyMessageEl.style.display = 'block';
      } else if (emptyMessageEl) {
        emptyMessageEl.style.display = 'none';
      }
    }
    
    container.innerHTML = '';
    return;
  }
  
  // Hide empty message when there are sessions
  if (!isReservationsTab) {
    const emptyMessageEl = document.getElementById('sessionsEmptyMessage');
    if (emptyMessageEl) {
      emptyMessageEl.style.display = 'none';
    }
  }

  // Show count badge when there are sessions
  if (badgeEl && toggleCard?.classList.contains('active')) {
    badgeEl.textContent = `${sessions.length}`;
    badgeEl.style.display = 'block';
    badgeEl.style.color = '';
    badgeEl.style.background = '';
  } else if (badgeEl && !toggleCard?.classList.contains('active')) {
    // Show count even when inactive (smaller, less prominent)
    badgeEl.textContent = `${sessions.length}`;
    badgeEl.style.display = 'block';
  }

  container.innerHTML = sessions.map(session => createSessionCard(session)).join('');

  // Attach cancel handlers
  container.querySelectorAll('.cancel-reservation-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const reservationId = btn.dataset.reservationId;
      const isIndividual = btn.dataset.isIndividual === 'true';
      const isSolo = btn.dataset.isSolo === 'true';
      await cancelReservation(reservationId, isIndividual, isSolo);
    });
  });

  // Attach photo upload handlers for solo sessions (Add Photo, Change Photo, denied – upload again)
  container.querySelectorAll('.solo-photo-upload-btn, .solo-photo-change-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const bookingId = btn.dataset.bookingId;
      const fileInput = container.querySelector(`.solo-photo-input[data-booking-id="${bookingId}"]`);
      if (fileInput) {
        fileInput.click();
      }
    });
  });

  // Photo Loaded button: show tooltip on click (native title shows on hover; click can focus for a11y)
  container.querySelectorAll('.solo-photo-loaded-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const tooltipEl = btn.closest('.solo-photo-loaded-pending')?.querySelector('.solo-photo-tooltip-text');
      if (tooltipEl) {
        tooltipEl.style.visibility = tooltipEl.style.visibility === 'hidden' ? '' : 'visible';
        tooltipEl.style.fontWeight = '600';
        setTimeout(() => {
          tooltipEl.style.fontWeight = '';
        }, 500);
      }
    });
  });

  // Handle photo file selection
  container.querySelectorAll('.solo-photo-input').forEach(input => {
    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const bookingId = input.dataset.bookingId;
      await uploadSoloSessionPhoto(bookingId, file);
    });
  });
}

// Create session card HTML
function createSessionCard(session) {
  const time = new Date(`2000-01-01T${session.session_time}`);
  const timeString = time.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });

  const startTime = new Date(`2000-01-01T${session.session_time}`);
  const endTime = new Date(startTime.getTime() + (session.duration_minutes || 90) * 60000);
  const endTimeString = endTime.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });

  // Format date as "December 12th, 2025"
  let dateString = '';
  if (session.session_date) {
    // Parse date in local timezone to avoid date shifts
    // session_date is a DATE string like "2026-01-02", parse it as local time
    const [year, month, day] = session.session_date.split('-').map(Number);
    const sessionDate = new Date(year, month - 1, day); // month is 0-indexed
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const dayNum = sessionDate.getDate();
    const monthName = months[sessionDate.getMonth()];
    const yearNum = sessionDate.getFullYear();
    
    // Add ordinal suffix (st, nd, rd, th)
    const getOrdinalSuffix = (n) => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return s[(v - 20) % 10] || s[v] || s[0];
    };
    
    dateString = `${monthName} ${dayNum}${getOrdinalSuffix(dayNum)}, ${yearNum}`;
  }

  const coachName = session.coach
    ? `${session.coach.first_name || ''} ${session.coach.last_name || ''}`.trim() || 'Coach'
    : 'Coach';

  const locationText = session.location_type === 'on-field'
    ? (session.location || 'Location TBD')
    : (session.zoom_link && session.location_type === 'virtual'
      ? 'Virtual Session'
      : session.session_type);

  const locationDisplay = session.zoom_link && session.location_type === 'virtual'
    ? `<a href="${session.zoom_link}" target="_blank" rel="noopener noreferrer" class="zoom-link">${locationText}</a>`
    : locationText;

  // Handle solo sessions with picture upload
  if (session.is_solo) {
    const hasPhoto = session.completion_photo_url;
    const status = session.reservation_status;
    const statusBadge = status === 'pending_review' ? 'PENDING REVIEW' :
                       status === 'checked-in' ? 'COMPLETED' :
                       status === 'denied' ? 'UPLOAD AGAIN' :
                       'SCHEDULED';
    
    // Get skill from session object or fallback to solo_booking
    // Check multiple possible locations for the skill
    let skill = session.skill;
    
    // If skill not directly on session, try to get it from solo_booking
    if (!skill && session.solo_booking?.solo_session?.skill) {
      skill = session.solo_booking.solo_session.skill;
    }
    
    // Format skill name for display (e.g., "escape-moves" -> "Escape Moves")
    let skillDisplayName;
    if (skill) {
      skillDisplayName = skill.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
    } else {
      // If no skill, don't use session_type as it might contain dates like "Technical Session - 1/5/2026"
      // Instead, try to get category from solo_session or use a generic name
      const category = session.solo_booking?.solo_session?.category || 
                      (session.solo_booking && session.solo_booking.solo_session && session.solo_booking.solo_session.category);
      if (category) {
        skillDisplayName = category.charAt(0).toUpperCase() + category.slice(1) + ' Session';
      } else {
        // Last resort: try to extract from title if it's a simple format
        const title = session.solo_booking?.solo_session?.title || session.session_type || '';
        if (title && !title.includes('-') && !title.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
          // Title doesn't contain date, use it
          skillDisplayName = title;
        } else {
          skillDisplayName = 'Solo Session';
        }
      }
    }

    return `
      <div class="reserved-session-card solo-session-card" data-session-id="${session.id}" data-booking-id="${session.reservation_id}">
        <div class="solo-session-top-row">
          <div class="solo-session-info">
            <div class="session-time">${dateString ? `${dateString} • ${timeString}` : timeString}</div>
            <div class="session-title">${skillDisplayName}</div>
          </div>
          <div class="session-badge-container">
            ${status === 'checked-in' || status === 'pending_review' ? `<div class="session-badge ${status === 'checked-in' ? 'completed' : 'pending'}">${statusBadge}</div>` : ''}
            ${status === 'denied' ? `<div class="session-badge session-badge-denied">${statusBadge}</div>` : ''}
            <button class="cancel-reservation-btn" 
                    data-reservation-id="${session.reservation_id}" 
                    data-is-solo="true"
                    type="button">
              Cancel
            </button>
          </div>
        </div>
        <div class="solo-session-photo-section">
          ${status === 'denied' ? `
            <div class="solo-photo-upload solo-photo-denied">
              <button class="solo-photo-upload-btn" type="button" data-booking-id="${session.reservation_id}">
                <i class="bx bx-camera"></i>
                <span>Photo denied – upload again</span>
              </button>
              <p class="solo-photo-instructions">Coach requested a new photo. Take another picture of cones and ball on a field.</p>
            </div>
          ` : hasPhoto && status === 'pending_review' ? `
            <div class="solo-photo-loaded-pending">
              <button class="solo-photo-loaded-btn" type="button" data-booking-id="${session.reservation_id}" title="Waiting for coach to check in" aria-label="Photo loaded, waiting for coach to check in">
                <i class="bx bx-check-circle"></i>
                <span>Photo Loaded</span>
              </button>
              <p class="solo-photo-tooltip-text" aria-hidden="true">Waiting for coach to check in</p>
            </div>
          ` : hasPhoto ? `
            <div class="solo-photo-preview">
              <img src="${session.completion_photo_url}" alt="Completion photo" class="solo-photo-img">
              <button class="solo-photo-change-btn" type="button" data-booking-id="${session.reservation_id}">
                <i class="bx bx-refresh"></i> Change Photo
              </button>
            </div>
          ` : `
            <div class="solo-photo-upload">
              <button class="solo-photo-upload-btn" type="button" data-booking-id="${session.reservation_id}">
                <i class="bx bx-camera"></i>
                <span>Add Photo</span>
              </button>
              <p class="solo-photo-instructions">Take a picture of cones and ball on a field, in the backyard or at home to get your points</p>
            </div>
          `}
          <input type="file" accept="image/*" capture="environment" class="solo-photo-input" data-booking-id="${session.reservation_id}" style="display: none;">
        </div>
      </div>
    `;
  }

  return `
    <div class="reserved-session-card" data-session-id="${session.id}">
      <div class="session-card-content">
        <div class="session-time">${dateString ? `${dateString} • ${timeString}` : timeString}</div>
        <div class="session-title">${session.session_type}</div>
        <div class="session-details">
          <i class="bx bx-map"></i>
          <span>${locationDisplay}</span>
        </div>
        <div class="session-coach">
          <i class="bx bx-user"></i>
          <span>${coachName}</span>
        </div>
      </div>
      <div class="session-badge-container">
      </div>
      <button class="cancel-reservation-btn" 
              data-reservation-id="${session.reservation_id}" 
              data-is-individual="${session.is_individual}"
              type="button">
        Cancel
      </button>
    </div>
  `;
}

// Load reservations (for Reservations tab - shows only future sessions, no calendar)
async function loadReservations() {
  if (!supabaseReady || !supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return;

    // Get account context to determine correct player ID
    const context = await getAccountContext();
    if (!context) {
      console.warn('Could not get account context');
      return;
    }
    
    // Get the correct player ID for this view
    const playerId = context.getPlayerIdForAction();
    if (!playerId) {
      console.warn('Could not determine player ID');
      return;
    }
    
    const container = document.getElementById('reservationsListContainer');
    if (!container) return;

    // Hide calendar for reservations tab
    const calendar = document.getElementById('playerHomeCalendar');
    if (calendar) {
      calendar.style.display = 'none';
    }

    container.innerHTML = '';
    showLoader(container, 'Loading reservations...');

    // Get today's date for filtering future sessions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Load group session reservations (future only)
    const { data: groupReservations, error: groupError } = await supabase
      .from('session_reservations')
      .select(`
        *,
        session:sessions(
          id,
          session_type,
          session_date,
          session_time,
          duration_minutes,
          location_type,
          location,
          zoom_link,
          coach_id,
          attendance_limit,
          current_reservations,
          coach:profiles!sessions_coach_id_fkey(
            first_name,
            last_name
          )
        )
      `)
      .eq('player_id', playerId)
      .in('reservation_status', ['reserved', 'checked-in']);

    // Filter for future sessions in JavaScript
    const futureGroupReservations = groupReservations?.filter(reservation => {
      if (!reservation.session) return false;
      const sessionDate = new Date(reservation.session.session_date);
      sessionDate.setHours(0, 0, 0, 0);
      return sessionDate >= today;
    }) || [];

    if (groupError) {
      console.error('Error loading group reservations:', groupError);
    }

    // Load individual session bookings (future only)
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
        )
      `)
      .eq('player_id', playerId)
      .in('status', ['confirmed', 'completed'])
      .is('cancelled_at', null)
      .gte('booking_date', todayStr);

    if (individualError) {
      console.error('Error loading individual bookings:', individualError);
    }

    // Combine and format sessions
    const allSessions = [];

    // Add group sessions
    if (futureGroupReservations) {
      futureGroupReservations.forEach(reservation => {
        if (reservation.session) {
          allSessions.push({
            id: reservation.session.id,
            reservation_id: reservation.id,
            session_type: reservation.session.session_type,
            session_date: reservation.session.session_date,
            session_time: reservation.session.session_time,
            duration_minutes: reservation.session.duration_minutes || 90,
            location_type: reservation.session.location_type,
            location: reservation.session.location,
            zoom_link: reservation.session.zoom_link,
            coach: reservation.session.coach,
            coach_id: reservation.session.coach_id,
            is_individual: false,
            reservation_status: reservation.reservation_status
          });
        }
      });
    }

    // Add individual sessions
    if (individualBookings) {
      individualBookings.forEach(booking => {
        allSessions.push({
          id: booking.id,
          reservation_id: booking.id,
          session_type: booking.session_type?.display_name || booking.session_type?.name || 'Individual Session',
          session_date: booking.booking_date,
          session_time: booking.booking_time,
          duration_minutes: booking.duration_minutes || booking.session_type?.duration_minutes || 20,
          location_type: 'virtual',
          location: null,
          zoom_link: booking.zoom_link,
          coach: booking.coach,
          coach_id: booking.coach_id,
          is_individual: true,
          reservation_status: 'reserved',
          color: booking.session_type?.color
        });
      });
    }

    // Load solo session bookings (future only)
    const { data: soloBookings, error: soloError } = await supabase
      .from('player_solo_session_bookings')
      .select(`
        *,
        solo_session:solo_sessions(
          id,
          title,
          category,
          period,
          skill,
          sub_skill,
          main_exercises
        )
      `)
      .eq('player_id', playerId)
      .in('status', ['scheduled', 'completed', 'pending_review', 'checked-in', 'denied'])
      .gte('scheduled_date', todayStr);

    if (soloError) {
      console.error('Error loading solo bookings:', soloError);
    }

    // Add solo sessions - fetch missing skills from videos if needed
    if (soloBookings && soloBookings.length > 0) {
      const bookingsWithSkills = await Promise.all(
        soloBookings.map(async (booking) => {
          let skillToUse = booking.solo_session?.skill;
          
          // If skill is null, try to get it from the first main exercise video
          if (!skillToUse && booking.solo_session?.main_exercises && 
              Array.isArray(booking.solo_session.main_exercises) && 
              booking.solo_session.main_exercises.length > 0) {
            const firstExercise = booking.solo_session.main_exercises[0];
            if (firstExercise?.video_id) {
              const { data: video } = await supabase
                .from('solo_session_videos')
                .select('skill')
                .eq('id', firstExercise.video_id)
                .single();
              
              if (video?.skill) {
                skillToUse = video.skill;
              }
            }
          }
          
          return { ...booking, resolvedSkill: skillToUse };
        })
      );
      
      bookingsWithSkills.forEach(booking => {
        allSessions.push({
          id: booking.id,
          reservation_id: booking.id,
          session_type: booking.solo_session?.title || 'Solo Session',
          session_date: booking.scheduled_date,
          session_time: booking.scheduled_time,
          duration_minutes: calculateSoloSessionDuration(booking.solo_session),
          location_type: 'solo',
          location: null,
          zoom_link: null,
          coach: null,
          coach_id: null,
          is_individual: false,
          is_solo: true,
          reservation_status: booking.status,
          solo_booking: booking,
          completion_photo_url: booking.completion_photo_url,
          skill: booking.resolvedSkill || booking.solo_session?.skill || null
        });
      });
    }

    // Sort by date and time
    allSessions.sort((a, b) => {
      const dateCompare = a.session_date.localeCompare(b.session_date);
      if (dateCompare !== 0) return dateCompare;
      return a.session_time.localeCompare(b.session_time);
    });

    // Render sessions
    renderSessionsList(allSessions, container);

  } catch (error) {
    console.error('Error loading reservations:', error);
    const container = document.getElementById('reservationsListContainer');
    if (container) {
      container.innerHTML = '<div class="error-state">Error loading reservations. Please try again.</div>';
    }
  } finally {
    const container = document.getElementById('reservationsListContainer');
    if (container) hideLoader(container);
  }
}

// Cancel reservation
async function cancelReservation(reservationId, isIndividual, isSolo = false) {
  if (!supabaseReady || !supabase) return;

  if (!confirm('Are you sure you want to cancel this reservation?')) {
    return;
  }

  try {
    if (isSolo) {
      // Cancel solo session booking
      const { error } = await supabase
        .from('player_solo_session_bookings')
        .update({ status: 'cancelled' })
        .eq('id', reservationId);

      if (error) throw error;
    } else {
      // Use RPC function to cancel (works for both parent and player)
      const { data: cancelled, error: rpcError } = await supabase.rpc('cancel_reservation_for_player', {
        p_reservation_id: reservationId,
        p_is_individual: isIndividual
      });

      if (rpcError) {
        console.error('Error cancelling reservation:', rpcError);
        alert(`Error: ${rpcError.message || 'Failed to cancel reservation'}`);
        return;
      }

      if (!cancelled) {
        alert('Failed to cancel reservation. Please try again.');
        return;
      }

      // If group reservation, update session reservation count
      if (!isIndividual) {
        const { data: reservation } = await supabase
          .from('session_reservations')
          .select('session_id')
          .eq('id', reservationId)
          .single();

        if (reservation) {
          const { data: session } = await supabase
            .from('sessions')
            .select('current_reservations')
            .eq('id', reservation.session_id)
            .single();

          if (session && session.current_reservations > 0) {
            await supabase
              .from('sessions')
              .update({ current_reservations: session.current_reservations - 1 })
              .eq('id', reservation.session_id);
          }
        }
      }
    }

    // Remove the reservation card from the DOM immediately
    const btn = document.querySelector(`button[data-reservation-id="${reservationId}"]`);
    if (btn) {
      const reservationCard = btn.closest('.reserved-session-card');
      if (reservationCard) {
        reservationCard.remove();
        // Reservation card removed
      } else {
        // Button found but could not find parent card
      }
    } else {
      // Could not find cancel button
      // Try to find by session ID as fallback
      const allCards = document.querySelectorAll('.reserved-session-card');
      for (const card of allCards) {
        const cardBtn = card.querySelector(`button[data-reservation-id="${reservationId}"]`);
        if (cardBtn) {
          card.remove();
          // Reservation card removed using fallback
          break;
        }
      }
    }
    
    alert('Reservation cancelled successfully!');
    
    // Reload based on current tab to ensure UI is in sync
    const activeTab = document.querySelector('.schedule-toggle-card.active')?.dataset.tab;
    if (activeTab === 'reservations') {
      await loadReservations();
    } else {
      await loadReservedSessions();
    }
  } catch (error) {
    console.error('Error cancelling reservation:', error);
    alert(`Error: ${error.message}`);
  }
}

// Upload solo session completion photo
async function uploadSoloSessionPhoto(bookingId, file) {
  if (!supabaseReady || !supabase) {
    alert('System not ready. Please try again.');
    return;
  }

  try {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession || !authSession.user) {
      alert('Please log in to upload photos.');
      return;
    }

      // Get account context
      const { getAccountContext } = await import('../../../utils/account-context.js');
    const context = await getAccountContext();
    if (!context) {
      alert('Could not load account information.');
      return;
    }

    const playerId = context.getPlayerIdForAction();
    if (!playerId) {
      alert('Could not determine player ID.');
      return;
    }

    // Upload to storage: solo-session-photos/{authenticatedUserId}/{bookingId}.{ext}
    // Use authenticated user ID for RLS compliance (parent or player)
    // The booking table links this to the correct player
    const authenticatedUserId = authSession.user.id;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${bookingId}.${fileExt}`;
    const filePath = `${authenticatedUserId}/${fileName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('solo-session-photos')
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('solo-session-photos')
      .getPublicUrl(filePath);

    // Update booking with photo URL and status
    const { error: updateError } = await supabase
      .from('player_solo_session_bookings')
      .update({
        completion_photo_url: publicUrl,
        status: 'pending_review'
      })
      .eq('id', bookingId);

    if (updateError) throw updateError;

    // Reload reservations to show updated status
    await loadReservations();
    
    alert('Photo uploaded successfully! Waiting for coach review.');
  } catch (error) {
    console.error('Error uploading photo:', error);
    alert(`Error: ${error.message || 'Failed to upload photo'}`);
  }
}

// Setup real-time subscriptions to listen for reservation changes
async function setupRealtimeSubscriptions() {
  if (!supabaseReady || !supabase) return;

  // Import account context
  const { getAccountContext } = await import('../../../utils/account-context.js');
  const context = await getAccountContext();
  if (!context) {
    console.warn('Could not get account context for real-time subscriptions');
    return;
  }

  const playerId = context.getPlayerIdForAction();
  if (!playerId) {
    console.warn('No player ID to subscribe to');
    return;
  }

  // Subscribe to group session reservations changes
  const groupReservationsChannel = supabase
    .channel('player-home-group-reservations-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'session_reservations'
      },
      async (payload) => {
        // Only reload if this reservation is for the current player
        if (payload.new && payload.new.player_id === playerId) {
          // Reload based on current tab
          const activeTab = document.querySelector('.schedule-toggle-card.active')?.dataset.tab;
          if (activeTab === 'reservations') {
            await loadReservations();
          } else {
            await loadReservedSessions();
          }
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'session_reservations',
        filter: 'reservation_status=eq.cancelled'
      },
      async (payload) => {
        // Only reload if this reservation is for the current player
        if (payload.new && payload.new.player_id === playerId) {
          // Reload based on current tab
          const activeTab = document.querySelector('.schedule-toggle-card.active')?.dataset.tab;
          if (activeTab === 'reservations') {
            await loadReservations();
          } else {
            await loadReservedSessions();
          }
        }
      }
    )
    .subscribe();

  // Subscribe to individual session bookings changes
  const individualBookingsChannel = supabase
    .channel('player-home-individual-bookings-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'individual_session_bookings'
      },
      async (payload) => {
        // Only reload if this booking is for the current player
        if (payload.new && payload.new.player_id === playerId) {
          // Reload based on current tab
          const activeTab = document.querySelector('.schedule-toggle-card.active')?.dataset.tab;
          if (activeTab === 'reservations') {
            await loadReservations();
          } else {
            await loadReservedSessions();
          }
        }
      }
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'individual_session_bookings',
        filter: 'status=eq.cancelled'
      },
      async (payload) => {
        // Only reload if this booking is for the current player
        if (payload.new && payload.new.player_id === playerId) {
          // Reload based on current tab
          const activeTab = document.querySelector('.schedule-toggle-card.active')?.dataset.tab;
          if (activeTab === 'reservations') {
            await loadReservations();
          } else {
            await loadReservedSessions();
          }
        }
      }
    )
    .subscribe();
}

// Load current objectives for the player (blank until coach sends)
async function loadObjectives() {
  if (!supabaseReady || !supabase) return;

  const container = document.getElementById('objectivesContent');
  if (!container) return;

  showLoader(container, 'Loading objectives...');

  try {
    const context = await getAccountContext();
    if (!context) return;

    const playerId = context.getPlayerIdForAction();
    if (!playerId) return;

    const { data: objective, error } = await supabase
      .from('player_objectives')
      .select(`
        id,
        in_possession_objective,
        out_of_possession_objective,
        created_at,
        coach:coach_id(first_name, last_name)
      `)
      .eq('player_id', playerId)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading objectives:', error);
      container.innerHTML = '<div class="objectives-empty"><p>Unable to load objectives.</p></div>';
      return;
    }

    if (!objective) {
      container.innerHTML = `
        <div class="objectives-empty">
          <i class="bx bx-target-lock" style="font-size: 48px; opacity: 0.5; margin-bottom: 12px;"></i>
          <p>No objectives yet</p>
          <p class="objectives-empty-hint">Your coach will assign objectives here.</p>
        </div>
      `;
      return;
    }

    const coach = objective.coach || objective.coach_id;
    const coachName = coach
      ? [coach.first_name, coach.last_name].filter(Boolean).join(' ') || 'Coach'
      : 'Coach';
    const dateStr = objective.created_at
      ? new Date(objective.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
      : '';

    const inPoss = (objective.in_possession_objective || '').trim();
    const outPoss = (objective.out_of_possession_objective || '').trim();

    container.innerHTML = `
      <div class="objectives-loaded">
        <div class="objectives-header">
          <div class="coach-info"><h5>From: ${escapeHtml(coachName)}</h5></div>
          <div class="date-info"><h5>${escapeHtml(dateStr)}</h5></div>
        </div>
        ${inPoss || outPoss ? `
          <div class="objective-item"><h4>In Possession</h4><h5>${escapeHtml(inPoss || '—')}</h5></div>
          <div class="objective-item"><h4>Out Of Possession</h4><h5>${escapeHtml(outPoss || '—')}</h5></div>
        ` : '<p class="objectives-no-detail">No objectives detail.</p>'}
      </div>
    `;
  } catch (err) {
    console.error('Error in loadObjectives:', err);
    if (container) {
      container.innerHTML = '<div class="objectives-empty"><p>Unable to load objectives.</p></div>';
    }
  }
}

// Load quizzes for the current player (assignments + question details)
async function loadQuizzes() {
  if (!supabaseReady || !supabase) return;

  const container = document.querySelector('.quiz-content');
  if (!container) return;

  showLoader(container, 'Loading quizzes...');

  try {
    const context = await getAccountContext();
    if (!context) return;

    const playerId = context.getPlayerIdForAction();
    if (!playerId) return;

    const { data: rawAssignments, error } = await supabase
      .from('quiz_assignments')
      .select(`
        id,
        status,
        assigned_at,
        selected_answer,
        is_correct,
        quiz_question_id,
        quiz_questions (
          question,
          options,
          correct_answer,
          period,
          category
        )
      `)
      .eq('player_id', playerId)
      .eq('status', 'assigned')
      .order('assigned_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error loading quizzes:', error);
      container.innerHTML = '<div class="quiz-empty">Unable to load quizzes.</div>';
      return;
    }

    // Show each question only once: keep one assignment per quiz_question_id (earliest)
    const seen = new Set();
    const assignments = (rawAssignments || []).filter((a) => {
      const qid = a.quiz_question_id;
      if (seen.has(qid)) return false;
      seen.add(qid);
      return true;
    });

    renderQuizzes(assignments, container);
  } catch (err) {
    console.error('Error in loadQuizzes:', err);
    if (container) {
      container.innerHTML = '<div class="quiz-empty">Unable to load quizzes.</div>';
    }
  } finally {
    if (container) hideLoader(container);
  }
}

// Render quiz assignments into the quiz panel (only unasked questions; one per question)
function renderQuizzes(assignments, container) {
  if (!container) return;

  if (!assignments || assignments.length === 0) {
    container.innerHTML = `
      <div class="quiz-empty">
        <i class="bx bx-question-mark" style="font-size: 48px; opacity: 0.5; margin-bottom: 12px;"></i>
        <p>No quizzes yet</p>
        <p class="quiz-empty-hint">Your coach will assign quizzes here.</p>
      </div>
    `;
    return;
  }

  const list = assignments.map((a) => {
    const q = Array.isArray(a.quiz_questions) ? a.quiz_questions[0] : a.quiz_questions;
    const question = (q && q.question) || 'Question';
    const options = Array.isArray(q?.options) ? q.options : [];
    const correctIdx = q && typeof q.correct_answer === 'number' ? q.correct_answer : -1;

    const optionsHtml = options.map((opt, i) => `
      <button type="button" class="quiz-option-btn" data-assignment-id="${a.id}" data-option-index="${i}" data-correct-index="${correctIdx}">
        ${escapeHtml(String(opt))}
      </button>
    `).join('');

    return `
      <div class="quiz-card" data-assignment-id="${a.id}" data-correct-index="${correctIdx}">
        <div class="quiz-question-wrap">
          <div class="quiz-question">${escapeHtml(question)}</div>
        </div>
        <div class="quiz-options">${optionsHtml}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = `<div class="quiz-list">${list}</div>`;
}

async function handleQuizOptionClick(e) {
  const btn = e.target.closest('.quiz-option-btn');
  if (!btn || btn.disabled) return;

  const card = btn.closest('.quiz-card');
  if (!card) return;

  const assignmentId = card.dataset.assignmentId;
  const optionIndex = parseInt(btn.dataset.optionIndex, 10);
  const correctIndex = parseInt(card.dataset.correctIndex ?? '-1', 10);
  if (!assignmentId || isNaN(optionIndex)) return;

  // One-time answer: disable all options on this card immediately
  card.querySelectorAll('.quiz-option-btn').forEach((b) => { b.disabled = true; });

  const result = await submitQuizAnswer(assignmentId, optionIndex);
  if (!result) return;

  showQuizFeedback(card, optionIndex, correctIndex, result.is_correct, result.correct_answer);
}

async function submitQuizAnswer(assignmentId, selectedAnswerIndex) {
  if (!supabaseReady || !supabase) return null;

  const { data, error } = await supabase.rpc('submit_quiz_answer', {
    p_assignment_id: assignmentId,
    p_selected_answer: selectedAnswerIndex
  });

  if (error) {
    console.error('Error submitting quiz answer:', error);
    if (error.message && /rate_limit|15/i.test(error.message)) {
      alert('Maximum 15 quiz answers per day. Try again tomorrow.');
    } else {
      alert(error.message || 'Could not submit answer.');
    }
    return null;
  }

  const parsed = typeof data === 'string' ? JSON.parse(data) : (data || {});
  if (!parsed.ok) {
    const msg = parsed.message || parsed.error || 'Could not submit answer.';
    if (parsed.error === 'rate_limit') alert('Maximum 15 quiz answers per day. Try again tomorrow.');
    else if (parsed.error !== 'already_answered') alert(msg);
    return null;
  }

  return {
    is_correct: !!parsed.is_correct,
    points_awarded: Number(parsed.points_awarded) || 0,
    correct_answer: parsed.correct_answer
  };
}

function showQuizFeedback(card, selectedIndex, correctIndex, isCorrect, correctAnswerFromServer) {
  const correctIdx = correctAnswerFromServer != null ? correctAnswerFromServer : correctIndex;
  const optionsContainer = card.querySelector('.quiz-options');
  if (!optionsContainer) return;

  // Icon on top-right of quiz-card (green check if correct, red x if incorrect)
  // Use inline SVG so it always shows regardless of icon font loading
  const icon = isCorrect
    ? '<span class="quiz-feedback-icon quiz-feedback-correct" role="img" aria-label="Correct">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>' +
      '</span>'
    : '<span class="quiz-feedback-icon quiz-feedback-incorrect" role="img" aria-label="Incorrect">' +
      '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>' +
      '</span>';
  card.classList.add('quiz-card-with-feedback');
  card.insertAdjacentHTML('afterbegin', icon);

  // Green border on correct option; if incorrect, red border on selected option
  const options = optionsContainer.querySelectorAll('.quiz-option-btn');
  options.forEach((opt, i) => {
    opt.classList.remove('quiz-option-correct', 'quiz-option-incorrect');
    if (i === correctIdx) opt.classList.add('quiz-option-correct');
    if (!isCorrect && i === selectedIndex) opt.classList.add('quiz-option-incorrect');
  });

  setTimeout(() => {
    loadQuizzes();
  }, 5000);
}

// Initialize on page load
// Setup Objectives/Quiz Tabs (Material-UI style)
function setupObjectivesQuizTabs() {
  const tabButtons = document.querySelectorAll('.tab-button[data-tab]');
  const tabPanels = document.querySelectorAll('.tab-panel');
  
  // Hide all panels initially
  tabPanels.forEach(panel => {
    panel.classList.remove('active');
  });
  
  // Remove active from all buttons initially
  tabButtons.forEach(btn => {
    btn.classList.remove('active');
    btn.setAttribute('aria-selected', 'false');
  });
  
  tabButtons.forEach(button => {
    button.addEventListener('click', (e) => {
      const targetTab = button.dataset.tab;
      
      // Update active state on buttons
      tabButtons.forEach(btn => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      });
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');
      
      // Hide all panels first
      tabPanels.forEach(panel => {
        panel.classList.remove('active');
      });
      
      // Show the selected panel
      const targetPanel = document.getElementById(`${targetTab}-panel`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }

      if (targetTab === 'quiz') {
        loadQuizzes();
      } else if (targetTab === 'objectives') {
        loadObjectives();
      }
    });
  });

  // One-time event delegation for quiz answer clicks (container is .quiz-content)
  const quizContent = document.querySelector('.quiz-content');
  if (quizContent && !quizContent.dataset.quizClickBound) {
    quizContent.dataset.quizClickBound = '1';
    quizContent.addEventListener('click', handleQuizOptionClick);
  }
}

// Store current notifications for mark all as read
let currentNotifications = [];

// Load notifications for player
async function loadNotifications() {
  if (!supabaseReady || !supabase) return;

  try {
    const context = await getAccountContext();
    if (!context) return;

    const playerId = context.getPlayerIdForAction();
    if (!playerId) return;

    const { data: notifications, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', playerId)
      .eq('recipient_role', 'player')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading notifications:', error);
      return;
    }

    currentNotifications = notifications || [];
    renderNotifications(currentNotifications);
    updateNotificationBell(currentNotifications);
  } catch (error) {
    console.error('Error in loadNotifications:', error);
  }
}

// Render notifications in the bottom sheet
function renderNotifications(notifications) {
  const container = document.querySelector('.notification-content');
  if (!container) return;

  if (notifications.length === 0) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; color: var(--muted);">
        <i class="bx bx-bell-off" style="font-size: 48px; margin-bottom: 16px; opacity: 0.5;"></i>
        <p>No notifications yet</p>
      </div>
    `;
    return;
  }

  const notificationsHtml = notifications.map(notif => {
    const date = new Date(notif.created_at);
    const dateStr = date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const isRead = notif.is_read;
    const icon = getNotificationIcon(notif.notification_type);
    const d = (typeof notif.data === 'object' && notif.data !== null) ? notif.data : {};
    const linkUrl = d.link_url && /^https?:\/\//i.test(String(d.link_url)) ? d.link_url : null;
    const attRaw = d.attachment_url != null ? String(d.attachment_url).trim() : '';
    const attUrlSafe = attRaw && !/javascript:/i.test(attRaw) && (/^https?:\/\//i.test(attRaw) || attRaw.startsWith('/'));
    const attUrl = attUrlSafe ? attRaw : null;
    const attType = (d.attachment_type || 'photo').toLowerCase();
    let attHtml = '';
    const attUrlEsc = attUrl ? attUrl.replace(/"/g, '&quot;') : '';
    if (attUrl && (attType === 'photo' || attType === 'image')) {
      attHtml = `<div class="notification-attachment notification-attachment-media" data-attachment-url="${attUrlEsc}" data-attachment-type="photo"><img src="${attUrlEsc}" alt="" class="notification-attachment-img" loading="lazy" /></div>`;
    } else if (attUrl && attType === 'video') {
      attHtml = `<div class="notification-attachment notification-attachment-media" data-attachment-url="${attUrlEsc}" data-attachment-type="video"><div class="notification-attachment-video" title="Video"><i class="bx bx-video"></i></div></div>`;
    } else if (linkUrl) {
      attHtml = `<div class="notification-attachment"><a href="${String(linkUrl)}" target="_blank" rel="noopener noreferrer" class="notification-attachment-link" title="Link"><i class="bx bx-link"></i></a></div>`;
    }

    const typeClass = (notif.notification_type || 'information').replace(/[^a-z0-9_]/g, '_');
    const typeTitle = getNotificationTypeTitle(notif.notification_type, notif.title);
    const titleRed = typeClass === 'cancellation' || typeClass === 'time_change';
    const coachName = (d.coach_name != null && String(d.coach_name).trim()) ? String(d.coach_name).trim() : '';
    const dateLine = coachName ? `${escapeHtml(coachName)} · ${dateStr}` : dateStr;
    return `
      <div class="notification-item ${isRead ? 'read' : 'unread'}" data-notification-id="${notif.id}">
        <div class="notification-icon notification-icon--${typeClass}">${icon}</div>
        <div class="notification-content-text">
          <div class="notification-title${titleRed ? ' notification-title--red' : ''}">${escapeHtml(typeTitle)}</div>
          <div class="notification-message">${escapeHtml(notif.message)}</div>
          <div class="notification-date">${escapeHtml(dateLine)}</div>
        </div>
        ${attHtml}
        ${!isRead ? '<div class="notification-dot"></div>' : ''}
      </div>
    `;
  }).join('');

  container.innerHTML = notificationsHtml;

  // Add click handlers to mark as read
  container.querySelectorAll('.notification-item').forEach(item => {
    item.addEventListener('click', async (e) => {
      e.stopPropagation();
      const notificationId = item.dataset.notificationId;
      const wasUnread = item.classList.contains('unread');
      
      if (!wasUnread) return; // Already read, no need to update
      
      const { error } = await markNotificationAsRead(notificationId);
      
      if (error) {
        console.error('Failed to mark notification as read:', error);
        return; // Don't update UI if database update failed
      }
      
      item.classList.remove('unread');
      item.classList.add('read');
      const dot = item.querySelector('.notification-dot');
      if (dot) dot.remove();
      
      // Update badge count immediately
      const bell = document.getElementById('notificationBell');
      if (bell) {
        const badge = bell.querySelector('.notification-badge');
        if (badge) {
          const currentCount = parseInt(badge.textContent) || 0;
          const newCount = Math.max(0, currentCount - 1);
          if (newCount > 0) {
            badge.textContent = newCount > 99 ? '99+' : newCount;
          } else {
            badge.remove();
          }
        }
      }
      
      // Also update the currentNotifications array
      const notif = currentNotifications.find(n => n.id === notificationId);
      if (notif) {
        notif.is_read = true;
      }
    });
  });
}

// Announcement type → display title (matches coach Communicate dropdown)
function getNotificationTypeTitle(type, fallbackTitle) {
  const titles = {
    information: 'Information',
    time_change: 'Time change',
    cancellation: 'Cancellation',
    popup_session: 'Additional Session',
    veo_link: 'Veo Link',
    merch: 'Merch',
    announcement: 'Information'
  };
  return titles[type] != null ? titles[type] : (fallbackTitle || 'Announcement');
}

// Get icon for notification type (announcement subtypes: time_change, cancellation, popup_session, information, veo_link, merch)
function getNotificationIcon(type) {
  const icons = {
    'solo_session_created': '<i class="bx bx-football"></i>',
    'objectives_assigned': '<i class="bx bx-target-lock"></i>',
    'announcement': '<i class="bx bx-message-rounded"></i>',
    'points_awarded': '<i class="bx bx-trophy"></i>',
    'quiz_assigned': '<i class="bx bx-question-mark"></i>',
    'milestone_achieved': '<i class="bx bx-star"></i>',
    'schedule_change': '<i class="bx bx-calendar"></i>',
    'field_change': '<i class="bx bx-map"></i>',
    'cancellation': '<i class="bx bx-block"></i>',
    'time_change': '<i class="bx bx-alarm"></i>',
    'popup_session': '<i class="bx bx-calendar-check"></i>',
    'information': '<i class="bx bx-info-circle"></i>',
    'veo_link': '<i class="bx bx-video"></i>',
    'merch': '<i class="bx bx-purchase-tag"></i>'
  };
  return icons[type] || '<i class="bx bx-bell"></i>';
}

// Mark notification as read
async function markNotificationAsRead(notificationId) {
  if (!supabaseReady || !supabase) {
    return { error: new Error('Supabase not ready') };
  }

  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId)
      .select();
    
    if (error) {
      console.error('Error marking notification as read:', error);
      return { error };
    }
    
    console.log('Notification marked as read:', data);
    return { data, error: null };
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return { error };
  }
}

// Update notification bell badge
function updateNotificationBell(notifications) {
  const bell = document.getElementById('notificationBell');
  if (!bell) return;

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const badge = bell.querySelector('.notification-badge') || document.createElement('span');
  
  if (unreadCount > 0) {
    badge.className = 'notification-badge';
    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
    if (!bell.querySelector('.notification-badge')) {
      bell.appendChild(badge);
    }
  } else {
    const existingBadge = bell.querySelector('.notification-badge');
    if (existingBadge) {
      existingBadge.remove();
    }
  }
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Open notification media lightbox (photo/video + full notification info)
// data: { url, type, title, message, date, typeClass }
function openNotificationMediaLightbox(data) {
  const lb = document.getElementById('notificationMediaLightbox');
  if (!lb) return;
  const img = lb.querySelector('.notification-media-lightbox-img');
  const vid = lb.querySelector('.notification-media-lightbox-video');
  const meta = lb.querySelector('.notification-media-lightbox-meta');
  const metaIcon = lb.querySelector('.notification-media-lightbox-icon');
  const metaTitle = lb.querySelector('.notification-media-lightbox-title');
  const metaMessage = lb.querySelector('.notification-media-lightbox-message');
  const metaDate = lb.querySelector('.notification-media-lightbox-date');
  if (!img || !vid) return;
  img.style.display = 'none';
  vid.style.display = 'none';
  vid.pause();
  vid.removeAttribute('src');
  const url = data.url;
  const type = (data.type || 'photo').toLowerCase();
  const isVideo = type === 'video';
  if (isVideo) {
    vid.src = url;
    vid.style.display = 'block';
  } else {
    img.src = url;
    img.style.display = 'block';
  }
  if (meta && metaIcon && metaTitle && metaMessage && metaDate) {
    const typeClass = (data.typeClass || 'information').replace(/[^a-z0-9_]/g, '_');
    metaIcon.className = 'notification-media-lightbox-icon notification-icon notification-icon--' + typeClass;
    metaIcon.innerHTML = getNotificationIcon(data.typeClass || 'information');
    metaTitle.textContent = data.title || '';
    metaTitle.className = 'notification-media-lightbox-title' + (typeClass === 'cancellation' || typeClass === 'time_change' ? ' notification-title--red' : '');
    metaMessage.textContent = data.message || '';
    metaDate.textContent = data.date || '';
    meta.style.display = 'flex';
  }
  lb.style.display = 'flex';
  lb.querySelector('.notification-media-lightbox-close')?.focus();
}

// Close notification media lightbox
function closeNotificationMediaLightbox() {
  const lb = document.getElementById('notificationMediaLightbox');
  if (!lb) return;
  lb.style.display = 'none';
  const img = lb.querySelector('.notification-media-lightbox-img');
  const vid = lb.querySelector('.notification-media-lightbox-video');
  const meta = lb.querySelector('.notification-media-lightbox-meta');
  if (img) { img.removeAttribute('src'); img.style.display = 'none'; }
  if (vid) { vid.pause(); vid.removeAttribute('src'); vid.style.display = 'none'; }
  if (meta) meta.style.display = 'none';
}

// Setup Notification Bottom Sheet (opens directly to full height)
function setupNotificationBottomSheet() {
  const notificationBell = document.getElementById('notificationBell');
  const bottomSheet = document.getElementById('notificationBottomSheet');
  const closeBtn = document.getElementById('notificationCloseBtn');
  const handle = bottomSheet?.querySelector('.notification-bottom-sheet-handle');
  const content = bottomSheet?.querySelector('.notification-content');
  const lightbox = document.getElementById('notificationMediaLightbox');

  if (!notificationBell || !bottomSheet) return;

  // Ensure mark-all-read is in the header row with close btn (fix cached HTML that had it inside content)
  const markAllReadBtn = document.getElementById('markAllReadBtn');
  let header = bottomSheet.querySelector('.notification-bottom-sheet-header');
  const sheetContent = bottomSheet.querySelector('.notification-bottom-sheet-content');
  if (markAllReadBtn && sheetContent && sheetContent.contains(markAllReadBtn)) {
    if (!header) {
      header = document.createElement('div');
      header.className = 'notification-bottom-sheet-header';
      bottomSheet.insertBefore(header, sheetContent);
      header.appendChild(markAllReadBtn);
      if (closeBtn) header.appendChild(closeBtn);
    } else {
      header.insertBefore(markAllReadBtn, header.firstChild);
    }
  }

  // Delegated click: open lightbox when clicking photo/video in notifications (capture so we run before “mark read”)
  if (content && !content.dataset.mediaLightboxDelegate) {
    content.dataset.mediaLightboxDelegate = '1';
    content.addEventListener('click', (e) => {
      if (e.target.closest('.notification-attachment-link')) return;
      const item = e.target.closest('.notification-item');
      if (!item) return;
      const media = item.querySelector('.notification-attachment-media');
      if (!media) return;
      const url = media.dataset.attachmentUrl;
      const type = (media.dataset.attachmentType || 'photo').toLowerCase();
      if (!url || !/^(photo|video|image)$/.test(type)) return;
      e.stopPropagation();
      e.preventDefault();
      const iconEl = item.querySelector('.notification-icon[class*="notification-icon--"]');
      const typeClass = iconEl ? (iconEl.className.match(/notification-icon--([a-z0-9_]+)/) || [])[1] || 'information' : 'information';
      const titleEl = item.querySelector('.notification-title');
      const messageEl = item.querySelector('.notification-message');
      const dateEl = item.querySelector('.notification-date');
      openNotificationMediaLightbox({
        url,
        type,
        typeClass,
        title: titleEl ? titleEl.textContent.trim() : '',
        message: messageEl ? messageEl.textContent.trim() : '',
        date: dateEl ? dateEl.textContent.trim() : ''
      });
    }, true);
  }

  // Lightbox close: backdrop and close button
  if (lightbox) {
    lightbox.querySelector('.notification-media-lightbox-backdrop')?.addEventListener('click', closeNotificationMediaLightbox);
    lightbox.querySelector('.notification-media-lightbox-close')?.addEventListener('click', closeNotificationMediaLightbox);
    lightbox.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNotificationMediaLightbox(); });
  }
  
  // Full height - 70% of viewport
  const FULL_HEIGHT = Math.floor(window.innerHeight * 0.7);
  const MIN_HEIGHT = 200; // Minimum height before closing
  
  let isDragging = false;
  let startY = 0;
  let startHeight = 0;
  let isSheetOpen = false;
  
  // Function to open notification bottom sheet
  function openNotificationSheet() {
    isSheetOpen = true;
    bottomSheet.style.display = 'flex';
    bottomSheet.style.height = `${FULL_HEIGHT}px`;
    bottomSheet.dataset.level = '2';
    
    // Animate in
    requestAnimationFrame(() => {
      bottomSheet.style.opacity = '1';
      bottomSheet.style.transform = 'translateY(0)';
    });
  }
  
  // Function to close notification bottom sheet
  function closeNotificationSheet() {
    isSheetOpen = false;
    bottomSheet.style.opacity = '0';
    bottomSheet.style.transform = 'translateY(100%)';
    setTimeout(() => {
      bottomSheet.style.display = 'none';
    }, 300);
  }
  
  // Notification bell click handler
  notificationBell.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isSheetOpen) {
      openNotificationSheet();
    } else {
      // If already open, close it
      closeNotificationSheet();
    }
  });
  
  // Close button handler
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      closeNotificationSheet();
    });
  }
  
  // Draggable bottom sheet functionality - drag down to close
  if (handle) {
    // Touch events for mobile
    handle.addEventListener('touchstart', (e) => {
      if (e.cancelable) {
        e.preventDefault();
      }
      isDragging = true;
      startY = e.touches[0].clientY;
      startHeight = bottomSheet.offsetHeight;
      e.stopPropagation();
    }, { passive: false });
    
    handle.addEventListener('touchmove', (e) => {
      if (!isDragging) return;
      const deltaY = e.touches[0].clientY - startY;
      // Only allow dragging down (positive deltaY)
      if (deltaY > 0) {
        const newHeight = Math.max(MIN_HEIGHT, startHeight - deltaY);
        bottomSheet.style.height = `${newHeight}px`;
      }
      if (e.cancelable) {
        e.preventDefault();
      }
      e.stopPropagation();
    }, { passive: false });
    
    handle.addEventListener('touchend', (e) => {
      if (!isDragging) return;
      isDragging = false;
      const finalHeight = bottomSheet.offsetHeight;
      // If dragged below minimum, close it
      if (finalHeight <= MIN_HEIGHT) {
        closeNotificationSheet();
      } else {
        // Otherwise snap back to full height
        bottomSheet.style.height = `${FULL_HEIGHT}px`;
      }
      if (e.cancelable) {
        e.preventDefault();
      }
      e.stopPropagation();
    }, { passive: false });
    
    // Mouse events for desktop
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const deltaY = e.clientY - startY;
      // Only allow dragging down (positive deltaY)
      if (deltaY > 0) {
        const newHeight = Math.max(MIN_HEIGHT, startHeight - deltaY);
        bottomSheet.style.height = `${newHeight}px`;
      }
    };
    
    const handleMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      const finalHeight = bottomSheet.offsetHeight;
      // If dragged below minimum, close it
      if (finalHeight <= MIN_HEIGHT) {
        closeNotificationSheet();
      } else {
        // Otherwise snap back to full height
        bottomSheet.style.height = `${FULL_HEIGHT}px`;
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    handle.addEventListener('mousedown', (e) => {
      isDragging = true;
      startY = e.clientY;
      startHeight = bottomSheet.offsetHeight;
      e.preventDefault();
      e.stopPropagation();
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });
  }
  
  // Close on backdrop click (click outside the sheet)
  // Use a small delay to prevent immediate closing when bell is clicked
  let backdropTimeout = null;
  document.addEventListener('click', (e) => {
    // Clear any pending backdrop close
    if (backdropTimeout) {
      clearTimeout(backdropTimeout);
      backdropTimeout = null;
    }
    
    // Don't close if clicking on the bell, mark all read button, or inside the sheet
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    if (notificationBell.contains(e.target) || 
        bottomSheet.contains(e.target) ||
        e.target === notificationBell ||
        (markAllReadBtn && (markAllReadBtn.contains(e.target) || e.target === markAllReadBtn))) {
      return;
    }
    
    // Only close if sheet is actually open
    if (isSheetOpen) {
      backdropTimeout = setTimeout(() => {
        closeNotificationSheet();
      }, 100);
    }
  });
  
  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && 
        bottomSheet.style.display !== 'none' && 
        bottomSheet.style.display) {
      closeNotificationSheet();
    }
  });
  
  // Mark all as read button - set up with a delay to ensure DOM is ready
  setTimeout(() => {
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    if (markAllReadBtn) {
      // Remove any existing onclick handlers first
      markAllReadBtn.onclick = null;
      markAllReadBtn.onclick = async function(e) {
        e.stopPropagation();
        e.preventDefault();
        console.log('Mark all as read button clicked');
        
        if (!supabaseReady || !supabase) {
          console.log('Supabase not ready');
          return;
        }

        try {
          const context = await getAccountContext();
          if (!context) {
            console.log('No context');
            return;
          }

          const playerId = context.getPlayerIdForAction();
          if (!playerId) {
            console.log('No player ID');
            return;
          }

          // Get all unread notifications
          const unreadNotifications = currentNotifications.filter(n => !n.is_read);
          console.log('Unread notifications:', unreadNotifications.length);
          
          if (unreadNotifications.length === 0) {
            // Update badge to zero if no unread
            const bell = document.getElementById('notificationBell');
            if (bell) {
              const badge = bell.querySelector('.notification-badge');
              if (badge) badge.remove();
            }
            return;
          }

          // Mark all as read
          const notificationIds = unreadNotifications.map(n => n.id);
          console.log('Marking notifications as read:', notificationIds);
          
          const { data, error } = await supabase
            .from('notifications')
            .update({ 
              is_read: true,
              read_at: new Date().toISOString()
            })
            .in('id', notificationIds)
            .select();

          if (error) {
            console.error('Error updating notifications:', error);
            throw error;
          }

          console.log('Notifications updated:', data);

          // Update badge to zero immediately
          const bell = document.getElementById('notificationBell');
          if (bell) {
            const badge = bell.querySelector('.notification-badge');
            if (badge) badge.remove();
          }

          // Update currentNotifications array
          currentNotifications.forEach(n => {
            if (!n.is_read) n.is_read = true;
          });

          // Reload notifications to update UI
          await loadNotifications();
        } catch (error) {
          console.error('Error marking all notifications as read:', error);
        }
      };
    } else {
      console.warn('Mark all read button not found');
    }
  }, 100);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
