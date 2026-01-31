// Coach Dashboard page scripts
import { initSupabase } from '../../../../auth/config/supabase.js';
import { getPointsForSessionType, getCurrentQuarter } from '../../../utils/points.js';

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

// Initialize Supabase
let supabase;
let supabaseReady = false;

// Track past sessions pagination
let pastSessionsLimit = 5;
let allPastSessions = [];

initSupabase().then(client => {
  if (client) {
    supabase = client;
    supabaseReady = true;
    initializeDashboard();
  } else {
    console.error('❌ Supabase client is null');
  }
}).catch(err => {
  console.error('❌ Failed to initialize Supabase:', err);
});

// Hide top-bar for coach dashboard
function hideTopBar() {
  const topBar = document.querySelector('.top-bar');
  if (topBar) {
    topBar.style.display = 'none';
  }
}

// Initialize the dashboard
async function initializeDashboard() {
  hideTopBar();
  setupTabSwitching();
  setupDateRangeSelector();
  await loadCoachName();
  await loadSessions(false, null);
  await loadImportantSection();
  await loadStatsSection();
  setupRealtimeSubscriptions();
  await loadNotifications();
  setupNotificationBottomSheet();
}

// Load coach name
async function loadCoachName() {
  if (!supabaseReady || !supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('first_name')
      .eq('id', session.user.id)
      .single();

    if (error) {
      console.error('Error loading coach name:', error);
      return;
    }

    const coachNameEl = document.getElementById('coachName');
    if (coachNameEl && profile && profile.first_name) {
      coachNameEl.textContent = profile.first_name;
    }
  } catch (error) {
    console.error('Error loading coach name:', error);
  }
}

// Setup tab switching
function setupTabSwitching() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Remove active from all tabs
      tabBtns.forEach(b => b.classList.remove('active'));
      // Add active to clicked tab
      btn.classList.add('active');
      
      const tab = btn.dataset.tab;
      // Reset past sessions limit when switching tabs
      if (tab !== 'past') {
        pastSessionsLimit = 5;
        allPastSessions = [];
      }
      
      if (tab === 'my-day') {
        // Filter to show only sessions where current coach is assigned
        loadSessions(true, null); // true = my day filter, null = today
      } else if (tab === 'past') {
        // Show past sessions (last 30 days)
        loadSessions(false, 'past'); // false = full schedule, 'past' = past dates
      } else {
        // Show all sessions for today
        loadSessions(false, null); // false = full schedule, null = today
      }
    });
  });
}

// Calculate age from birth_year or birth_date
function calculateAge(birthYear, birthDate) {
  const today = new Date();
  let age;
  
  if (birthDate) {
    const birth = new Date(birthDate);
    age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    // Calculate months for half-year precision
    const months = today.getMonth() - birth.getMonth();
    const totalMonths = age * 12 + months;
    return totalMonths / 12;
  } else if (birthYear) {
    age = today.getFullYear() - birthYear;
    // Assume mid-year for birth_year only
    return age + 0.5;
  }
  
  return null;
}

// Determine age group
function getAgeGroup(age) {
  if (age === null || age === undefined) return null;
  
  if (age >= 16) {
    return 'top';
  } else if (age >= 13 && age <= 15.5) {
    return 'older';
  } else if (age >= 10 && age <= 12.5) {
    return 'younger';
  }
  
  return null;
}

// Load today's sessions
async function loadSessions(myDayOnly = false, dateFilter = null) {
  if (!supabaseReady || !supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return;

    // Determine date range based on filter
    let startDate, endDate, dateStr;
    if (dateFilter === 'past') {
      // Past sessions: last 30 days (excluding today)
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      startDate = thirtyDaysAgo;
      endDate = new Date(today);
      endDate.setDate(today.getDate() - 1); // Exclude today
      dateStr = null; // Will use date range query
    } else {
      // Today's sessions
      const today = new Date();
      dateStr = today.toISOString().split('T')[0];
      startDate = today;
      endDate = today;
    }
    
    const coachId = session.user.id;

    // Debug telemetry removed - was causing ERR_CONNECTION_REFUSED errors

    // Build query
    let query = supabase
      .from('sessions')
      .select(`
        *,
        coach:profiles!sessions_coach_id_fkey(
          id,
          first_name,
          last_name
        )
      `);
    
    // Apply date filter
    if (dateFilter === 'past') {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      query = query.gte('session_date', startDateStr).lte('session_date', endDateStr);
    } else {
      query = query.eq('session_date', dateStr);
    }
    
    query = query.eq('status', 'scheduled');

    // Filter for "My day" - only sessions where coach is assigned
    if (myDayOnly) {
      query = query.or(`coach_id.eq.${coachId},assistant_coaches.cs.{${coachId}},goalkeeper_coaches.cs.{${coachId}}`);
    }

    // Order by date (descending for past, ascending for today) and then by time
    if (dateFilter === 'past') {
      query = query.order('session_date', { ascending: false }).order('session_time', { ascending: true });
    } else {
      query = query.order('session_time', { ascending: true });
    }
    
    const { data: sessions, error } = await query;

    if (error) {
      console.error('Error loading sessions:', error);
      return;
    }

    // Don't return early if no group sessions - we still need to check individual bookings
    // Only show empty state if we've checked both group and individual sessions
    const groupSessions = sessions || [];

    // Separate on-field and virtual sessions
    const onFieldSessions = groupSessions.filter(s => s.location_type === 'on-field');
    const virtualSessions = groupSessions.filter(s => s.location_type === 'virtual');

    // Load reservations for all sessions
    const sessionIds = groupSessions.map(s => s.id);
    let reservations = [];
    
    if (sessionIds.length > 0) {
      // For past sessions, include checked-in status; for today, include reserved and checked-in
      const reservationStatusFilter = dateFilter === 'past' 
        ? ['reserved', 'checked-in']
        : ['reserved', 'checked-in'];
      
      // First try without the player join to see if RLS is blocking
      const { data: simpleResData, error: simpleError } = await supabase
        .from('session_reservations')
        .select('*')
        .in('session_id', sessionIds)
        .in('reservation_status', reservationStatusFilter);
      
      // Now try with the player join
      const { data: resData, error: resError } = await supabase
        .from('session_reservations')
        .select(`
          *,
          player:profiles!session_reservations_player_id_fkey(
            id,
            first_name,
            last_name,
            birth_year,
            birth_date,
            positions
          )
        `)
        .in('session_id', sessionIds)
        .in('reservation_status', reservationStatusFilter);

      if (resError) {
        console.error('❌ Error loading reservations:', resError);
      } else {
        reservations = resData || [];
      }
    } else {
      // No group sessions to load reservations for (solo sessions are handled separately)
    }

    // Group reservations by session_id
    const reservationsBySession = {};
    reservations.forEach(res => {
      if (!reservationsBySession[res.session_id]) {
        reservationsBySession[res.session_id] = [];
      }
      reservationsBySession[res.session_id].push(res);
    });

    // Load staff for all sessions (assistant and goalkeeper coaches)
    const allStaffIds = new Set();
    groupSessions.forEach(session => {
      if (session.assistant_coaches) {
        session.assistant_coaches.forEach(id => allStaffIds.add(id));
      }
      if (session.goalkeeper_coaches) {
        session.goalkeeper_coaches.forEach(id => allStaffIds.add(id));
      }
    });

    let staffProfiles = {};
    if (allStaffIds.size > 0) {
      const { data: staff, error: staffError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', Array.from(allStaffIds));
      
      if (!staffError && staff) {
        staff.forEach(profile => {
          staffProfiles[profile.id] = profile;
        });
      }
    }

    // Load individual session bookings
    let individualBookings = [];
    let individualQuery;
    
    if (myDayOnly) {
      // For "My day", only load bookings for this coach
      individualQuery = supabase
        .from('individual_session_bookings')
        .select(`
          *,
          session_type:individual_session_types(
            id,
            name,
            display_name,
            duration_minutes
          ),
          player:profiles!individual_session_bookings_player_id_fkey(
            id,
            first_name,
            last_name,
            birth_year,
            birth_date,
            positions
          ),
          coach:profiles!individual_session_bookings_coach_id_fkey(
            id,
            first_name,
            last_name
          )
        `)
        .eq('coach_id', coachId);
    } else {
      // For "Full schedule" or "Past", load all bookings
      individualQuery = supabase
        .from('individual_session_bookings')
        .select(`
          *,
          session_type:individual_session_types(
            id,
            name,
            display_name,
            duration_minutes
          ),
          player:profiles!individual_session_bookings_player_id_fkey(
            id,
            first_name,
            last_name,
            birth_year,
            birth_date,
            positions
          ),
          coach:profiles!individual_session_bookings_coach_id_fkey(
            id,
            first_name,
            last_name
          )
        `);
    }
    
    // Apply date filter
    if (dateFilter === 'past') {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      individualQuery = individualQuery.gte('booking_date', startDateStr).lte('booking_date', endDateStr);
    } else {
      individualQuery = individualQuery.eq('booking_date', dateStr);
    }
    
    // Apply status filter (for past, include completed too)
    const individualStatusFilter = dateFilter === 'past' 
      ? ['confirmed', 'completed']
      : ['confirmed', 'completed'];
    
    const { data: bookings, error: bookingsError } = await individualQuery
      .in('status', individualStatusFilter)
      .is('cancelled_at', null)
      .order('booking_date', { ascending: false })
      .order('booking_time', { ascending: true });

    if (bookingsError) {
      console.error('Error loading individual bookings:', bookingsError);
    }

    if (!bookingsError && bookings) {
      individualBookings = bookings.map(booking => ({
        id: booking.id,
        session_type: booking.session_type?.display_name || booking.session_type?.name || 'Individual Session',
        session_date: booking.booking_date,
        session_time: booking.booking_time,
        duration_minutes: booking.duration_minutes || booking.session_type?.duration_minutes || 20,
        location_type: 'virtual', // Individual sessions are typically virtual
        attendance_limit: 1,
        current_reservations: 1,
        coach_id: booking.coach_id,
        coach: booking.coach, // Add coach profile
        is_individual: true,
        booking_data: booking
      }));
    }

    // For individual bookings, create reservation-like objects
    individualBookings.forEach(booking => {
      if (booking.booking_data && booking.booking_data.player) {
        if (!reservationsBySession[booking.id]) {
          reservationsBySession[booking.id] = [];
        }
        reservationsBySession[booking.id].push({
          id: booking.booking_data.id,
          session_id: booking.id,
          player_id: booking.booking_data.player.id,
          parent_id: booking.booking_data.parent_id,
          reservation_status: booking.booking_data.checked_in_at ? 'checked-in' : 'reserved',
          checked_in_at: booking.booking_data.checked_in_at,
          player: booking.booking_data.player
        });
      }
    });

    // Load solo session bookings
    const dateFilterStr = dateFilter === 'past' 
      ? `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`
      : dateStr;
    let soloQuery = supabase
      .from('player_solo_session_bookings')
      .select(`
        *,
        solo_session:solo_sessions(
          id,
          title,
          category,
          period,
          skill,
          main_exercises
        ),
        player:profiles!player_solo_session_bookings_player_id_fkey(
          id,
          first_name,
          last_name,
          birth_year,
          birth_date,
          positions
        )
      `);
    
    // Apply date filter for solo bookings
    if (dateFilter === 'past') {
      const startDateStr = startDate.toISOString().split('T')[0];
      const endDateStr = endDate.toISOString().split('T')[0];
      soloQuery = soloQuery.gte('scheduled_date', startDateStr).lte('scheduled_date', endDateStr);
    } else {
      soloQuery = soloQuery.eq('scheduled_date', dateStr);
    }
    
    // For past sessions, include checked-in and denied statuses too
    // For today's sessions, include checked-in so they remain visible until day end
    const statusFilter = dateFilter === 'past' 
      ? ['scheduled', 'completed', 'pending_review', 'checked-in', 'denied']
      : ['scheduled', 'completed', 'pending_review', 'checked-in'];
    
    const { data: soloBookings, error: soloError } = await soloQuery.in('status', statusFilter);

    if (soloError) {
      console.error('❌ Error loading solo bookings:', soloError);
    }

    // Create solo sessions array
    const soloSessions = [];
    if (soloBookings && soloBookings.length > 0) {
      // Fetch missing skills from videos in parallel
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
        // Format skill name for display (e.g., "escape-moves" -> "Escape Moves")
        let sessionType = 'Solo Session';
        
        if (booking.resolvedSkill) {
          sessionType = booking.resolvedSkill
            .split('-')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');
        } else if (booking.solo_session?.title) {
          // Fallback: remove date from title if present
          const title = booking.solo_session.title;
          // Remove date pattern like " - 1/5/2026" or " - 1/5/26"
          sessionType = title.replace(/\s*-\s*\d{1,2}\/\d{1,2}\/\d{2,4}/, '');
        }
        
        const soloSession = {
          id: `solo-${booking.id}`,
          session_type: sessionType,
          session_time: booking.scheduled_time,
          session_date: booking.scheduled_date, // Add date for sorting
          duration_minutes: calculateSoloSessionDuration(booking.solo_session),
          location_type: 'solo',
          is_solo: true,
          solo_booking: booking
        };
        soloSessions.push(soloSession);

        // Create reservation-like object for solo session
        if (!reservationsBySession[soloSession.id]) {
          reservationsBySession[soloSession.id] = [];
        }
        reservationsBySession[soloSession.id].push({
          id: booking.id,
          session_id: soloSession.id,
          player_id: booking.player_id,
          parent_id: booking.parent_id,
          reservation_status: booking.status === 'checked-in' ? 'checked-in' : 
                             booking.status === 'pending_review' ? 'pending_review' : 'reserved',
          checked_in_at: booking.checked_in_at,
          checked_in_by: booking.checked_in_by,
          player: booking.player,
          completion_photo_url: booking.completion_photo_url,
          is_solo: true
        });
      });
    } else {
    }

    // Combine group sessions, individual bookings, and solo sessions
    // Filter out any cancelled sessions (client-side safety check)
    const allSessions = [...onFieldSessions, ...virtualSessions, ...individualBookings, ...soloSessions]
      .filter(session => !cancelledSessionIds.has(session.id))
      .sort((a, b) => {
        if (dateFilter === 'past') {
          // For past sessions, sort by date descending (most recent first), then by time
          const dateA = a.session_date || a.booking_date || '';
          const dateB = b.session_date || b.booking_date || '';
          const dateCompare = dateB.localeCompare(dateA); // Descending
          if (dateCompare !== 0) return dateCompare;
        }
        // Then sort by time (ascending for same date)
        const timeA = a.session_time || a.booking_time || '';
        const timeB = b.session_time || b.booking_time || '';
        return timeA.localeCompare(timeB);
      });
    
    // Show empty state only if we've checked group, individual, AND solo sessions and found nothing
    if (allSessions.length === 0) {
      const container = document.getElementById('sessionsList');
      if (container) {
        container.innerHTML = `
          <div class="empty-state">
            <i class="bx bx-calendar"></i>
            <div>No sessions scheduled for today</div>
          </div>
        `;
      }
      return;
    }
    
    
    // For past tab, limit to 5 sessions initially and store full list
    let sessionsToDisplay = allSessions;
    if (dateFilter === 'past') {
      allPastSessions = allSessions;
      sessionsToDisplay = allSessions.slice(0, pastSessionsLimit);
    } else {
      allPastSessions = [];
      pastSessionsLimit = 5; // Reset limit when not on past tab
    }
    
    renderSessionsList(sessionsToDisplay, reservationsBySession, staffProfiles, dateFilter === 'past' ? allSessions.length : 0);
  } catch (error) {
    console.error('Error loading today sessions:', error);
  }
}

// Render sessions as simple list
function renderSessionsList(sessions, reservationsBySession, staffProfiles = {}, totalPastSessions = 0) {
  const container = document.getElementById('sessionsList');
  if (!container) return;

  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="bx bx-calendar"></i>
        <div>No sessions scheduled</div>
      </div>
    `;
    return;
  }

  const sessionsHTML = sessions.map(session => {
    const reservations = reservationsBySession[session.id] || [];
    return createSessionListItem(session, reservations);
  }).join('');

  // Add "Load more" button if there are more past sessions
  let loadMoreButton = '';
  if (totalPastSessions > 0 && sessions.length < totalPastSessions) {
    const remaining = totalPastSessions - sessions.length;
    const loadCount = Math.min(5, remaining); // Always load 5 at a time (or remaining if less than 5)
    loadMoreButton = `
      <div class="load-more-container">
        <button class="load-more-btn" id="loadMorePastSessions" type="button">
          Load ${loadCount} more session${loadCount !== 1 ? 's' : ''}
        </button>
      </div>
    `;
  }

  container.innerHTML = sessionsHTML + loadMoreButton;

  // Attach click listeners to open modal
  attachListEventListeners(sessions, reservationsBySession, staffProfiles);

  // Attach load more button listener
  if (totalPastSessions > 0) {
    const loadMoreBtn = document.getElementById('loadMorePastSessions');
    if (loadMoreBtn) {
      loadMoreBtn.addEventListener('click', () => {
        loadMorePastSessions();
      });
    }
  }
}

// Create simple session list item
function createSessionListItem(session, reservations) {
  const timeStr = formatTime(session.session_time);
  const endTime = calculateEndTime(session.session_time, session.duration_minutes);
  const endTimeStr = formatTime(endTime);
  
  // Get coach name
  let coachDisplay = '';
  const coach = session.coach;
  if (coach) {
    const coachName = `${coach.first_name || ''} ${coach.last_name || ''}`.trim();
    if (coachName) {
      coachDisplay = `<div class="session-list-coach">With Coach ${coachName}</div>`;
    }
  }
  
  // For individual sessions, show player name instead of "1 attendee"
  let attendeeDisplay = '';
  if (session.is_individual && reservations.length > 0) {
    const player = reservations[0].player;
    if (player) {
      const playerName = `${player.first_name || ''} ${player.last_name || ''}`.trim();
      if (playerName) {
        attendeeDisplay = `<div class="session-list-attendees">${playerName}</div>`;
      }
    }
  } else if (session.is_solo && reservations.length > 0) {
    // For solo sessions, show player name
    const player = reservations[0].player;
    if (player) {
      const playerName = `${player.first_name || ''} ${player.last_name || ''}`.trim();
      if (playerName) {
        attendeeDisplay = `<div class="session-list-attendees">${playerName}</div>`;
      }
    }
  } else if (reservations.length > 0) {
    // For group sessions, show attendee count
    const attendeeCount = reservations.length;
    attendeeDisplay = `<div class="session-list-attendees">${attendeeCount} ${attendeeCount === 1 ? 'attendee' : 'attendees'}</div>`;
  }
  
  return `
    <div class="session-list-item" data-session-id="${session.id}">
      <div class="session-list-info">
        <div class="session-list-title">${session.session_type}</div>
        <div class="session-list-time">${timeStr} - ${endTimeStr}</div>
        ${attendeeDisplay}
        ${coachDisplay}
      </div>
      <i class="bx bx-chevron-right session-list-arrow"></i>
    </div>
  `;
}

// Load more past sessions
function loadMorePastSessions() {
  pastSessionsLimit += 5;
  const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
  if (activeTab === 'past') {
    loadSessions(false, 'past');
  }
}

// Attach event listeners to list items
function attachListEventListeners(sessions, reservationsBySession, staffProfiles) {
  document.querySelectorAll('.session-list-item').forEach(item => {
    item.addEventListener('click', () => {
      const sessionId = item.dataset.sessionId;
      // Search in allPastSessions if available, otherwise use sessions
      const session = allPastSessions.length > 0 
        ? allPastSessions.find(s => s.id === sessionId)
        : sessions.find(s => s.id === sessionId);
      if (session) {
        const reservations = reservationsBySession[session.id] || [];
        openSessionModal(session, reservations, staffProfiles);
      }
    });
  });
}

// Store current session data for editing
let currentSessionData = null;
let currentReservationsData = null;
let currentStaffProfilesData = null;

// Open session modal with detailed view
function openSessionModal(session, reservations, staffProfiles) {
  const modal = document.getElementById('sessionModalOverlay');
  const modalContent = document.getElementById('modalContent');
  const modalTitle = document.getElementById('modalTitle');
  const editBtn = document.getElementById('editSessionBtn');
  
  if (!modal || !modalContent) return;

  // Store session data for editing
  currentSessionData = session;
  currentReservationsData = reservations;
  currentStaffProfilesData = staffProfiles;

  // Update modal title with session name
  if (modalTitle) {
    modalTitle.textContent = session.session_type || 'Session Details';
  }

  // Show edit button (only for individual sessions for now)
  if (editBtn) {
    if (session.is_individual) {
      editBtn.style.display = 'flex';
    } else {
      editBtn.style.display = 'none';
    }
  }

  // Create detailed session card
  const sessionCard = createSessionCard(session, reservations, staffProfiles);
  modalContent.innerHTML = sessionCard;

  // Show modal
  modal.classList.add('show');
  
  // Convert icons in modal to Lucide
  setTimeout(async () => {
    const { initLucideIcons } = await import('../../../utils/lucide-icons.js');
    initLucideIcons(modal);
  }, 0);

  // Attach event listeners for modal content
  attachSessionEventListeners([session], { [session.id]: reservations });

  // Close modal handlers
  const closeBtn = document.getElementById('closeModalBtn');
  if (closeBtn) {
    closeBtn.onclick = () => closeSessionModal();
    // Convert icon to Lucide
    setTimeout(async () => {
      const icon = closeBtn.querySelector('i.bx');
      if (icon) {
        const { replaceBoxiconWithLucide } = await import('../../../utils/lucide-icons.js');
        replaceBoxiconWithLucide(icon, false);
      }
    }, 0);
  }

  modal.onclick = (e) => {
    if (e.target === modal) {
      closeSessionModal();
    }
  };

  // Close on Escape key
  document.addEventListener('keydown', handleModalEscape);
  
  // Setup edit button handler
  if (editBtn) {
    editBtn.onclick = (e) => {
      e.stopPropagation();
      showEditMenu();
    };
  }
}

// Close session modal
function closeSessionModal() {
  const modal = document.getElementById('sessionModalOverlay');
  if (modal) {
    modal.classList.remove('show');
    document.removeEventListener('keydown', handleModalEscape);
  }
}

// Handle Escape key to close modal
function handleModalEscape(e) {
  if (e.key === 'Escape') {
    closeSessionModal();
  }
}

// Create session card HTML
function createSessionCard(session, reservations, staffProfiles = {}) {
  const timeStr = formatTime(session.session_time);
  const endTime = calculateEndTime(session.session_time, session.duration_minutes);
  const endTimeStr = formatTime(endTime);
  
  // Handle individual and solo sessions differently
  const isIndividual = session.is_individual;
  const isSolo = session.is_solo || false;
  const location = isIndividual 
    ? 'Virtual Session'
    : isSolo
    ? 'Solo Session'
    : (session.location_type === 'on-field' 
      ? session.location || 'Location TBD'
      : 'Virtual Session');
  const locationIcon = isIndividual || session.location_type === 'virtual' ? 'bx-video' : 
                      isSolo ? 'bx-football' : 'bx-map';

  // Get staff members (for group sessions)
  let staff = [];
  if (isIndividual) {
    // For individual sessions, add the coach as staff
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
  } else {
    staff = getSessionStaff(session, staffProfiles);
  }
  
  // Get players
  const players = reservations.map(res => {
    const playerData = {
      ...res.player,
      reservation_status: res.reservation_status,
      reservation_id: res.id,
      checked_in_at: res.checked_in_at,
      completion_photo_url: res.completion_photo_url, // Include completion photo for solo sessions
      is_solo: res.is_solo || false, // Include solo flag
      reservation: res // Include full reservation object
    };
    return playerData;
  });

  // Collect all unique positions from players
  const allPositions = new Set();
  players.forEach(player => {
    if (player.positions && Array.isArray(player.positions)) {
      player.positions.forEach(pos => {
        if (pos && pos.trim()) {
          allPositions.add(pos.trim());
        }
      });
    }
  });
  const uniquePositions = Array.from(allPositions).sort();

  // Get coach name for individual sessions
  const coachName = isIndividual && session.coach
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
        ${!isSolo ? `<div class="session-capacity">${reservations.length} / ${session.attendance_limit || 'N/A'}</div>` : ''}
      </div>

      ${staff.length > 0 ? `
        <div class="session-staff">
          ${staff.map(member => `
            <div class="staff-member" data-staff-id="${member.id}" data-staff-role="${member.role}">
              <div class="staff-avatar">
                ${getInitials(member.first_name, member.last_name)}
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
          <div class="players-title">${isSolo ? 'Player' : 'Players'}</div>
          ${!isIndividual && !isSolo ? `
          <div style="display: flex; gap: 12px; align-items: center; justify-content: center; width: 100%;">
            <div class="filter-tabs">
              <button class="filter-tab active" data-filter="all">All</button>
              <button class="filter-tab" data-filter="checked-in">Checked-in</button>
              <button class="filter-tab" data-filter="reserved">Reserved</button>
            </div>
            <button class="check-in-all-btn" data-session-id="${session.id}" type="button" title="Check in all reserved players">
              <i class="bx bx-check-double"></i>
              Check in All
            </button>
            <div class="age-group-selector">
              <button class="age-group-btn" data-session-id="${session.id}">
                <i class="bx bx-group"></i>
                <span>Age Groups</span>
                <i class="bx bx-chevron-down"></i>
              </button>
              <div class="age-group-dropdown" data-session-id="${session.id}">
                <button class="age-group-option active" data-age-group="all">All Ages</button>
                <button class="age-group-option" data-age-group="top">Top (16+)</button>
                <button class="age-group-option" data-age-group="older">Older (13-15.5)</button>
                <button class="age-group-option" data-age-group="younger">Younger (10-12.5)</button>
              </div>
            </div>
            <div class="position-selector">
              <button class="position-btn" data-session-id="${session.id}">
                <i class="bx bx-football"></i>
                <span>Position</span>
                <i class="bx bx-chevron-down"></i>
              </button>
              <div class="position-dropdown" data-session-id="${session.id}">
                <button class="position-option active" data-position="all">All Positions</button>
                ${uniquePositions.map(pos => `
                  <button class="position-option" data-position="${pos}">${pos}</button>
                `).join('')}
              </div>
            </div>
          </div>
          ` : ''}
        </div>
        <div class="players-list" data-session-players="${session.id}">
          ${players.length > 0 ? players.map(player => createPlayerItem(player, player.reservation)).join('') : '<div class="empty-state">No players reserved</div>'}
        </div>
      </div>
    </div>
  `;
}

// Get session staff (coach, assistant coaches, goalkeeper coaches)
function getSessionStaff(session, staffProfiles = {}) {
  const staff = [];
  
  // Main coach
  if (session.coach) {
    staff.push({
      ...session.coach,
      role: 'Coach',
      checkedIn: false // TODO: Implement coach check-in tracking
    });
  }
  
  // Assistant coaches
  if (session.assistant_coaches && Array.isArray(session.assistant_coaches)) {
    session.assistant_coaches.forEach(coachId => {
      const coach = staffProfiles[coachId];
      if (coach) {
        staff.push({
          ...coach,
          role: 'Assistant Coach',
          checkedIn: false // TODO: Implement coach check-in tracking
        });
      }
    });
  }
  
  // Goalkeeper coaches
  if (session.goalkeeper_coaches && Array.isArray(session.goalkeeper_coaches)) {
    session.goalkeeper_coaches.forEach(coachId => {
      const coach = staffProfiles[coachId];
      if (coach) {
        staff.push({
          ...coach,
          role: 'Goalkeeper Coach',
          checkedIn: false // TODO: Implement coach check-in tracking
        });
      }
    });
  }
  
  return staff;
}

// Create player item HTML
function createPlayerItem(player, reservation = null) {
  if (!player) return '';
  
  const age = calculateAge(player.birth_year, player.birth_date);
  const ageGroup = getAgeGroup(age);
  const initials = getInitials(player.first_name, player.last_name);
  const positions = player.positions || [];
  const isCheckedIn = player.reservation_status === 'checked-in';
  const isSolo = reservation?.is_solo || player.is_solo || false;
  const completionPhotoUrl = reservation?.completion_photo_url || player.completion_photo_url;
  // Create comma-separated positions string for data attribute
  const positionsStr = positions.length > 0 ? positions.join(',') : '';
  
  // Solo session layout is different
  if (isSolo && completionPhotoUrl) {
    return `
      <div class="player-item solo-session-item" 
           data-player-id="${player.id}"
           data-age-group="${ageGroup || 'unknown'}"
           data-reservation-status="${player.reservation_status}"
           data-reservation-id="${player.reservation_id}"
           data-positions="${positionsStr}"
           data-is-solo="${isSolo}">
        <div class="solo-player-info-section">
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
          <div class="solo-action-buttons">
            <button class="player-check-in-btn ${isCheckedIn ? 'checked-in' : ''}"
                    data-player-check-in="${player.id}"
                    data-reservation-id="${player.reservation_id}"
                    data-is-solo="${isSolo}"
                    data-action="${isCheckedIn ? 'remove' : 'checkin'}"
                    type="button">
              Check-In
            </button>
            ${!isCheckedIn ? `
              <button class="player-deny-btn"
                      data-player-id="${player.id}"
                      data-reservation-id="${player.reservation_id}"
                      data-is-solo="${isSolo}"
                      type="button">
                Deny
              </button>
            ` : ''}
            <div class="solo-checkin-note">Player solo session must be checked in for points</div>
          </div>
        </div>
        <div class="solo-session-photo-section">
          <img src="${completionPhotoUrl}" alt="Completion photo" class="solo-photo-preview-img">
          <div class="solo-photo-label">Solo Session Completion Photo</div>
        </div>
      </div>
    `;
  }
  
  // Regular player item (non-solo)
  return `
    <div class="player-item" 
         data-player-id="${player.id}"
         data-age-group="${ageGroup || 'unknown'}"
         data-reservation-status="${player.reservation_status}"
         data-reservation-id="${player.reservation_id}"
         data-positions="${positionsStr}"
         data-is-solo="${isSolo}">
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
              data-is-solo="${isSolo}"
              data-action="${isCheckedIn ? 'remove' : 'checkin'}"
              type="button">
        ${isCheckedIn ? 'Remove Check-in' : 'Check-in'}
      </button>
    </div>
  `;
}

// Get initials from name
function getInitials(firstName, lastName) {
  const first = firstName ? firstName.charAt(0).toUpperCase() : '';
  const last = lastName ? lastName.charAt(0).toUpperCase() : '';
  return first + last || '?';
}

// Format time string
function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hours, minutes] = timeStr.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
  return `${displayHour}:${minutes} ${ampm}`;
}

// Calculate end time
function calculateEndTime(startTime, durationMinutes) {
  if (!startTime) return '';
  const [hours, minutes] = startTime.split(':').map(Number);
  const startTotal = hours * 60 + minutes;
  const endTotal = startTotal + durationMinutes;
  const endHours = Math.floor(endTotal / 60) % 24;
  const endMins = endTotal % 60;
  return `${String(endHours).padStart(2, '0')}:${String(endMins).padStart(2, '0')}`;
}

// Render empty state
function renderEmptyState(containerId, message) {
  const container = document.getElementById(containerId);
  if (!container) return;
  
  container.innerHTML = `
    <div class="empty-state">
      <i class="bx bx-calendar"></i>
      <div>${message}</div>
    </div>
  `;
}

// Attach event listeners for modal content
function attachSessionEventListeners(sessions, reservationsBySession) {
  // Filter tabs (status filters)
  document.querySelectorAll('.filter-tab').forEach(tab => {
    tab.addEventListener('click', (e) => {
      const sessionCard = e.target.closest('.session-card');
      if (!sessionCard) return;
      
      const sessionId = sessionCard.dataset.sessionId;
      const filter = e.target.dataset.filter;
      
      // Update active tab
      sessionCard.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
      e.target.classList.add('active');
      
      // Filter players by status
      filterPlayersByStatus(sessionId, filter);
    });
  });

  // Age group dropdown
  document.querySelectorAll('.age-group-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sessionId = btn.dataset.sessionId;
      const dropdown = document.querySelector(`.age-group-dropdown[data-session-id="${sessionId}"]`);
      if (dropdown) {
        dropdown.classList.toggle('show');
      }
    });
  });

  // Age group options
  document.querySelectorAll('.age-group-option').forEach(option => {
    option.addEventListener('click', (e) => {
      const sessionId = option.closest('.age-group-dropdown').dataset.sessionId;
      const ageGroup = option.dataset.ageGroup;
      
      // Update active option
      const dropdown = option.closest('.age-group-dropdown');
      dropdown.querySelectorAll('.age-group-option').forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
      
      // Update button text
      const btn = document.querySelector(`.age-group-btn[data-session-id="${sessionId}"]`);
      if (btn) {
        const text = option.textContent;
        btn.querySelector('span').textContent = text;
      }
      
      // Close dropdown
      dropdown.classList.remove('show');
      
      // Filter players by age group
      filterPlayersByAgeGroup(sessionId, ageGroup);
    });
  });

  // Position dropdown
  document.querySelectorAll('.position-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const sessionId = btn.dataset.sessionId;
      const dropdown = document.querySelector(`.position-dropdown[data-session-id="${sessionId}"]`);
      if (dropdown) {
        dropdown.classList.toggle('show');
      }
    });
  });

  // Position options
  document.querySelectorAll('.position-option').forEach(option => {
    option.addEventListener('click', (e) => {
      const sessionId = option.closest('.position-dropdown').dataset.sessionId;
      const position = option.dataset.position;
      
      // Update active option
      const dropdown = option.closest('.position-dropdown');
      dropdown.querySelectorAll('.position-option').forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
      
      // Update button text
      const btn = document.querySelector(`.position-btn[data-session-id="${sessionId}"]`);
      if (btn) {
        const text = option.textContent;
        btn.querySelector('span').textContent = text;
      }
      
      // Close dropdown
      dropdown.classList.remove('show');
      
      // Filter players by position
      filterPlayersByPosition(sessionId, position);
    });
  });

  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.age-group-selector')) {
      document.querySelectorAll('.age-group-dropdown').forEach(dropdown => {
        dropdown.classList.remove('show');
      });
    }
    if (!e.target.closest('.position-selector')) {
      document.querySelectorAll('.position-dropdown').forEach(dropdown => {
        dropdown.classList.remove('show');
      });
    }
  });

  // Player check-in buttons
  document.querySelectorAll('.player-check-in-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const playerId = e.target.dataset.playerCheckIn;
      const reservationId = e.target.dataset.reservationId;
      const action = e.target.dataset.action; // 'checkin' or 'remove'
      
      if (action === 'remove') {
        await removeCheckIn(reservationId, playerId);
      } else {
        await checkInPlayer(reservationId, playerId);
      }
    });
  });

  // Check in all button (group sessions only)
  document.querySelectorAll('.check-in-all-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const button = e.target.closest('.check-in-all-btn') || e.target;
      const sessionId = button.dataset.sessionId;
      if (sessionId) {
        await checkInAllPlayers(sessionId);
      }
    });
  });

  // Staff check-in buttons
  document.querySelectorAll('.check-in-btn[data-staff-check-in]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const staffId = e.target.dataset.staffCheckIn;
      // TODO: Implement coach check-in
    });
  });
}

// Filter players by status (All, Checked-in, Reserved)
function filterPlayersByStatus(sessionId, filter) {
  const playersList = document.querySelector(`.players-list[data-session-players="${sessionId}"]`);
  if (!playersList) return;
  
  const playerItems = playersList.querySelectorAll('.player-item');
  const activeAgeGroup = getActiveAgeGroup(sessionId);
  const activePosition = getActivePosition(sessionId);
  
  playerItems.forEach(item => {
    const ageGroup = item.dataset.ageGroup;
    const status = item.dataset.reservationStatus;
    const positions = item.dataset.positions || '';
    let show = true;
    
    // Apply status filter
    switch (filter) {
      case 'all':
        show = true;
        break;
      case 'checked-in':
        show = status === 'checked-in';
        break;
      case 'reserved':
        show = status === 'reserved';
        break;
    }
    
    // Apply age group filter if one is selected
    if (show && activeAgeGroup && activeAgeGroup !== 'all') {
      show = ageGroup === activeAgeGroup;
    }
    
    // Apply position filter if one is selected
    if (show && activePosition && activePosition !== 'all') {
      const playerPositions = positions.split(',').map(p => p.trim());
      show = playerPositions.includes(activePosition);
    }
    
    item.style.display = show ? 'flex' : 'none';
  });
}

// Filter players by age group
function filterPlayersByAgeGroup(sessionId, ageGroup) {
  const playersList = document.querySelector(`.players-list[data-session-players="${sessionId}"]`);
  if (!playersList) return;
  
  const playerItems = playersList.querySelectorAll('.player-item');
  const activeStatus = getActiveStatus(sessionId);
  const activePosition = getActivePosition(sessionId);
  
  playerItems.forEach(item => {
    const itemAgeGroup = item.dataset.ageGroup;
    const status = item.dataset.reservationStatus;
    const positions = item.dataset.positions || '';
    let show = true;
    
    // Apply age group filter
    if (ageGroup !== 'all') {
      show = itemAgeGroup === ageGroup;
    }
    
    // Apply status filter if one is selected
    if (show && activeStatus && activeStatus !== 'all') {
      show = status === activeStatus;
    }
    
    // Apply position filter if one is selected
    if (show && activePosition && activePosition !== 'all') {
      const playerPositions = positions.split(',').map(p => p.trim());
      show = playerPositions.includes(activePosition);
    }
    
    item.style.display = show ? 'flex' : 'none';
  });
}

// Filter players by position
function filterPlayersByPosition(sessionId, position) {
  const playersList = document.querySelector(`.players-list[data-session-players="${sessionId}"]`);
  if (!playersList) return;
  
  const playerItems = playersList.querySelectorAll('.player-item');
  const activeStatus = getActiveStatus(sessionId);
  const activeAgeGroup = getActiveAgeGroup(sessionId);
  
  playerItems.forEach(item => {
    const ageGroup = item.dataset.ageGroup;
    const status = item.dataset.reservationStatus;
    const positions = item.dataset.positions || '';
    let show = true;
    
    // Apply position filter
    if (position !== 'all') {
      const playerPositions = positions.split(',').map(p => p.trim());
      show = playerPositions.includes(position);
    }
    
    // Apply status filter if one is selected
    if (show && activeStatus && activeStatus !== 'all') {
      show = status === activeStatus;
    }
    
    // Apply age group filter if one is selected
    if (show && activeAgeGroup && activeAgeGroup !== 'all') {
      show = ageGroup === activeAgeGroup;
    }
    
    item.style.display = show ? 'flex' : 'none';
  });
}

// Get active age group filter
function getActiveAgeGroup(sessionId) {
  const dropdown = document.querySelector(`.age-group-dropdown[data-session-id="${sessionId}"]`);
  if (!dropdown) return null;
  const active = dropdown.querySelector('.age-group-option.active');
  return active ? active.dataset.ageGroup : 'all';
}

// Get active status filter
function getActiveStatus(sessionId) {
  const sessionCard = document.querySelector(`.session-card[data-session-id="${sessionId}"]`);
  if (!sessionCard) return null;
  const active = sessionCard.querySelector('.filter-tab.active');
  return active ? active.dataset.filter : 'all';
}

// Get active position filter
function getActivePosition(sessionId) {
  const dropdown = document.querySelector(`.position-dropdown[data-session-id="${sessionId}"]`);
  if (!dropdown) return null;
  const active = dropdown.querySelector('.position-option.active');
  return active ? active.dataset.position : 'all';
}

// Check in player
async function checkInPlayer(reservationId, playerId) {
  if (!supabaseReady || !supabase) {
    alert('Supabase not ready');
    return;
  }

  try {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession || !authSession.user) {
      alert('Not logged in');
      return;
    }

    // Verify user is coach or admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authSession.user.id)
      .single();

    if (profileError || !profile) {
      alert('Error: Could not verify user role');
      return;
    }

    if (profile.role !== 'coach' && profile.role !== 'admin') {
      alert('Error: Only coaches and admins can check in players');
      return;
    }

    // Check if this is a solo session booking
    const isSolo = document.querySelector(`.player-check-in-btn[data-reservation-id="${reservationId}"]`)?.dataset.isSolo === 'true';
    
    if (isSolo) {
      // Handle solo session check-in
      const { data: soloBooking, error: soloError } = await supabase
        .from('player_solo_session_bookings')
        .select(`
          *,
          solo_session:solo_sessions(
            id,
            title,
            category
          )
        `)
        .eq('id', reservationId)
        .single();

      if (soloError || !soloBooking) {
        alert(`Error: ${soloError?.message || 'Could not load solo booking'}`);
        return;
      }

      if (!soloBooking.completion_photo_url) {
        alert('Player must upload a completion photo before check-in.');
        return;
      }

      // Update solo booking status
      const { error: updateError } = await supabase
        .from('player_solo_session_bookings')
        .update({
          status: 'checked-in',
          checked_in_at: new Date().toISOString(),
          checked_in_by: authSession.user.id
        })
        .eq('id', reservationId);

      if (updateError) {
        alert(`Error: ${updateError.message}`);
        return;
      }

      // Award points for solo session (8 points default)
      const points = 8; // Solo sessions get 8 points
      const { year, quarter } = getCurrentQuarter();
      
      const { error: pointsError } = await supabase
        .from('points_transactions')
        .insert({
          player_id: playerId,
          points: points,
          session_type: 'Solo Session',
          session_id: soloBooking.solo_session_id,
          reservation_id: reservationId,
          checked_in_by: authSession.user.id,
          checked_in_at: new Date().toISOString(),
          quarter_year: year,
          quarter_number: quarter,
          status: 'active'
        });

      if (pointsError) {
        console.error('Error awarding points:', pointsError);
        // Don't fail check-in if points fail
      } else {
        // Create notification for points awarded
        await createPointsNotification(playerId, points, 'Solo Session', soloBooking.solo_session_id);
      }

      // Update UI
      const btn = document.querySelector(`.player-check-in-btn[data-reservation-id="${reservationId}"]`);
      if (btn) {
        btn.classList.add('checked-in');
        btn.dataset.action = 'remove';
        btn.textContent = 'Remove Check-in';
        // Hide deny button if it exists
        const denyBtn = document.querySelector(`.player-deny-btn[data-reservation-id="${reservationId}"]`);
        if (denyBtn) {
          denyBtn.style.display = 'none';
        }
      }

      const playerItem = document.querySelector(`.player-item[data-reservation-id="${reservationId}"]`);
      if (playerItem) {
        playerItem.dataset.reservationStatus = 'checked-in';
      }

      // Reload
      const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
      const isMyDay = activeTab === 'my-day';
      const isPast = activeTab === 'past';
      await loadSessions(isMyDay, isPast ? 'past' : null);
      return;
    }

    // Check if this is an individual session booking or group session reservation
    const { data: groupReservation } = await supabase
      .from('session_reservations')
      .select(`
        id,
        session_id,
        session:sessions!session_reservations_session_id_fkey(
          id,
          session_type,
          location_type
        )
      `)
      .eq('id', reservationId)
      .single();

    let sessionType = null;
    let locationType = null;
    let sessionId = null;

    if (groupReservation) {
      // Group session reservation
      sessionType = groupReservation.session?.session_type;
      locationType = groupReservation.session?.location_type;
      sessionId = groupReservation.session_id;
      
      const { error } = await supabase
        .from('session_reservations')
        .update({
          reservation_status: 'checked-in',
          checked_in_at: new Date().toISOString(),
          checked_in_by: authSession.user.id
        })
        .eq('id', reservationId);
      
      if (error) {
        console.error('Error checking in player:', error);
        alert(`Error: ${error.message}`);
        return;
      }
    } else {
      // Individual session booking
      const { data: individualBooking, error: bookingError } = await supabase
        .from('individual_session_bookings')
        .select(`
          id,
          session_type_id,
          session_type:individual_session_types!individual_session_bookings_session_type_id_fkey(
            id,
            name,
            display_name
          )
        `)
        .eq('id', reservationId)
        .single();

      if (bookingError || !individualBooking) {
        console.error('Error loading individual booking:', bookingError);
        alert(`Error: ${bookingError?.message || 'Could not load booking details'}`);
        return;
      }

      sessionType = individualBooking.session_type?.name || individualBooking.session_type?.display_name;
      locationType = 'virtual'; // Individual sessions are always virtual
      sessionId = individualBooking.id;

      const { error } = await supabase
        .from('individual_session_bookings')
        .update({
          checked_in_at: new Date().toISOString()
        })
        .eq('id', reservationId);
      
      if (error) {
        console.error('Error checking in player:', error);
        alert(`Error: ${error.message}`);
        return;
      }
    }

    // Award points if session type is valid
    if (sessionType) {
      const points = getPointsForSessionType(sessionType, locationType);
      if (points > 0) {
        const { year, quarter } = getCurrentQuarter();
        
        const { error: pointsError } = await supabase
          .from('points_transactions')
          .insert({
            player_id: playerId,
            points: points,
            session_type: sessionType,
            session_id: sessionId,
            reservation_id: reservationId,
            checked_in_by: authSession.user.id,
            checked_in_at: new Date().toISOString(),
            quarter_year: year,
            quarter_number: quarter,
            status: 'active'
          });

        if (pointsError) {
          console.error('Error awarding points:', pointsError);
          // Don't fail the check-in if points fail, just log it
        } else {
        }
      }
    }

    // Update UI in modal
    const btn = document.querySelector(`.player-check-in-btn[data-reservation-id="${reservationId}"]`);
    if (btn) {
      btn.classList.add('checked-in');
      btn.dataset.action = 'remove';
      btn.textContent = 'Remove Check-in';
      // Hide deny button if it exists
      const denyBtn = document.querySelector(`.player-deny-btn[data-reservation-id="${reservationId}"]`);
      if (denyBtn) {
        denyBtn.style.display = 'none';
      }
    }

    const playerItem = document.querySelector(`.player-item[data-reservation-id="${reservationId}"]`);
    if (playerItem) {
      playerItem.dataset.reservationStatus = 'checked-in';
    }

    // Reload to update list counts
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
    const isMyDay = activeTab === 'my-day';
    const isPast = activeTab === 'past';
    await loadSessions(isMyDay, isPast ? 'past' : null);
  } catch (error) {
    console.error('Error checking in player:', error);
    alert(`Error: ${error.message}`);
  }
}

// Deny solo session
async function denySoloSession(reservationId, playerId) {
  if (!supabaseReady || !supabase) {
    alert('Supabase not ready');
    return;
  }

  try {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession || !authSession.user) {
      alert('Not logged in');
      return;
    }

    // Verify user is coach or admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authSession.user.id)
      .single();

    if (profileError || !profile) {
      alert('Error: Could not verify user role');
      return;
    }

    if (profile.role !== 'coach' && profile.role !== 'admin') {
      alert('Error: Only coaches and admins can deny solo sessions');
      return;
    }

    // Update solo booking status to 'denied'
    const { error: updateError } = await supabase
      .from('player_solo_session_bookings')
      .update({
        status: 'denied',
        denied_at: new Date().toISOString(),
        denied_by: authSession.user.id
      })
      .eq('id', reservationId);

    if (updateError) {
      alert(`Error: ${updateError.message}`);
      return;
    }

    // TODO: Send notification to player that session was denied
    // This could be done via a notifications table or email
    
    alert('Solo session denied. Player will be notified to submit another photo.');

    // Reload the session list to reflect changes
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
    const isMyDay = activeTab === 'my-day';
    const isPast = activeTab === 'past';
    await loadSessions(isMyDay, isPast ? 'past' : null);
  } catch (error) {
    console.error('Error denying solo session:', error);
    alert(`Error: ${error.message || 'Failed to deny solo session'}`);
  }
}

// Check in all reserved players for a group session
async function checkInAllPlayers(sessionId) {
  if (!supabaseReady || !supabase) {
    alert('Supabase not ready');
    return;
  }

  try {
    // Get all reserved players for this session
    const playersList = document.querySelector(`.players-list[data-session-players="${sessionId}"]`);
    if (!playersList) {
      alert('Could not find players list');
      return;
    }

    const reservedPlayers = Array.from(playersList.querySelectorAll('.player-item[data-reservation-status="reserved"]'));
    
    if (reservedPlayers.length === 0) {
      alert('No reserved players to check in');
      return;
    }

    // Confirm action
    const confirmed = confirm(`Check in all ${reservedPlayers.length} reserved player(s)?`);
    if (!confirmed) return;

    // Check in each player
    let successCount = 0;
    let errorCount = 0;

    for (const playerItem of reservedPlayers) {
      const reservationId = playerItem.dataset.reservationId;
      const playerId = playerItem.dataset.playerId;
      
      if (reservationId && playerId) {
        try {
          await checkInPlayer(reservationId, playerId);
          successCount++;
        } catch (error) {
          console.error(`Error checking in player ${playerId}:`, error);
          errorCount++;
        }
      }
    }

    if (errorCount > 0) {
      alert(`Checked in ${successCount} player(s). ${errorCount} error(s) occurred.`);
    } else {
      alert(`Successfully checked in ${successCount} player(s).`);
    }
  } catch (error) {
    console.error('Error checking in all players:', error);
    alert(`Error: ${error.message}`);
  }
}

// Remove check-in for a player
async function removeCheckIn(reservationId, playerId) {
  if (!supabaseReady || !supabase) {
    alert('Supabase not ready');
    return;
  }

  try {
    const { data: { session: authSession } } = await supabase.auth.getSession();
    if (!authSession || !authSession.user) {
      alert('Not logged in');
      return;
    }

    // Verify user is coach or admin
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', authSession.user.id)
      .single();

    if (profileError || !profile) {
      alert('Error: Could not verify user role');
      return;
    }

    if (profile.role !== 'coach' && profile.role !== 'admin') {
      alert('Error: Only coaches and admins can remove check-ins');
      return;
    }

    // Check if this is an individual session booking or group session reservation
    // Use maybeSingle() to avoid errors if not found
    const { data: groupReservation, error: groupResError } = await supabase
      .from('session_reservations')
      .select('id, session_id')
      .eq('id', reservationId)
      .maybeSingle();

    if (groupReservation && !groupResError) {
      // Group session reservation - update back to reserved
      const { error } = await supabase
        .from('session_reservations')
        .update({
          reservation_status: 'reserved',
          checked_in_at: null,
          checked_in_by: null
        })
        .eq('id', reservationId);
      
      if (error) {
        console.error('Error removing check-in:', error);
        alert(`Error: ${error.message}`);
        return;
      }
    } else {
      // Individual session booking - clear checked_in_at
      const { data: individualBooking, error: bookingCheckError } = await supabase
        .from('individual_session_bookings')
        .select('id')
        .eq('id', reservationId)
        .maybeSingle();
      
      if (bookingCheckError || !individualBooking) {
        console.error('Error: Could not find reservation or booking:', bookingCheckError);
        alert('Error: Could not find the reservation or booking to remove check-in from');
        return;
      }
      
      const { error } = await supabase
        .from('individual_session_bookings')
        .update({
          checked_in_at: null
        })
        .eq('id', reservationId);
      
      if (error) {
        console.error('Error removing check-in:', error);
        alert(`Error: ${error.message}`);
        return;
      }
    }

    // Try to remove points transaction
    // First, find the points transaction for this check-in
    const { data: pointsTransaction, error: pointsFindError } = await supabase
      .from('points_transactions')
      .select('id, status, checked_in_by')
      .eq('reservation_id', reservationId)
      .eq('player_id', playerId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (pointsTransaction && !pointsFindError) {
      // Try to delete the points transaction
      // This will work if the coach created it (checked_in_by = auth.uid())
      const { error: deleteError } = await supabase
        .from('points_transactions')
        .delete()
        .eq('id', pointsTransaction.id);

      if (deleteError) {
        console.error('Error deleting points transaction:', deleteError);
        // If delete fails (e.g., coach didn't create it), try to update status
        // Update succeeds only if coach created the row (checked_in_by = auth.uid()) or user is admin
        const { error: updateError } = await supabase
          .from('points_transactions')
          .update({ status: 'archived' })
          .eq('id', pointsTransaction.id);

        if (updateError) {
          console.warn('Could not remove points transaction. Points may need to be manually adjusted:', updateError);
          alert('Check-in removed, but points could not be reversed. Please contact an admin to adjust points manually.');
        } else {
        }
      } else {
      }
    } else if (pointsFindError) {
      console.warn('Error finding points transaction:', pointsFindError);
    }

    // Update UI in modal
    const btn = document.querySelector(`.player-check-in-btn[data-reservation-id="${reservationId}"]`);
    if (btn) {
      btn.classList.remove('checked-in');
      btn.dataset.action = 'checkin';
      btn.textContent = 'Check-in';
    }

    const playerItem = document.querySelector(`.player-item[data-reservation-id="${reservationId}"]`);
    if (playerItem) {
      playerItem.dataset.reservationStatus = 'reserved';
    }

    // Reload to update list counts
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
    const isMyDay = activeTab === 'my-day';
    const isPast = activeTab === 'past';
    await loadSessions(isMyDay, isPast ? 'past' : null);
  } catch (error) {
    console.error('Error removing check-in:', error);
    alert(`Error: ${error.message}`);
  }
}

// Date range state
let currentDateRange = 'month-to-date';

// Setup date range selector
function setupDateRangeSelector() {
  const btn = document.getElementById('dateRangeBtn');
  const dropdown = document.getElementById('dateRangeDropdown');
  const options = document.querySelectorAll('.date-range-option');

  if (!btn || !dropdown) return;

  // Toggle dropdown
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('show');
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!btn.contains(e.target) && !dropdown.contains(e.target)) {
      dropdown.classList.remove('show');
    }
  });

  // Handle option selection
  options.forEach(option => {
    option.addEventListener('click', () => {
      const range = option.dataset.range;
      currentDateRange = range;
      
      // Update button text
      const rangeText = option.textContent;
      document.getElementById('dateRangeText').textContent = rangeText;
      
      // Update active state
      options.forEach(opt => opt.classList.remove('active'));
      option.classList.add('active');
      
      // Close dropdown
      dropdown.classList.remove('show');
      
      // Reload stats with new date range
      loadStatsSection();
    });
  });

  // Set initial active state
  const initialOption = document.querySelector(`.date-range-option[data-range="${currentDateRange}"]`);
  if (initialOption) {
    initialOption.classList.add('active');
  }
}

// Get date range dates
function getDateRangeDates(range) {
  const today = new Date();
  const start = new Date();
  
  switch (range) {
    case 'today':
      start.setHours(0, 0, 0, 0);
      return { start, end: today };
    
    case 'month-to-date':
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      return { start, end: today };
    
    case 'quarter-to-date':
      const quarter = Math.floor(today.getMonth() / 3);
      start.setMonth(quarter * 3, 1);
      start.setHours(0, 0, 0, 0);
      return { start, end: today };
    
    case 'year-to-date':
      start.setMonth(0, 1);
      start.setHours(0, 0, 0, 0);
      return { start, end: today };
    
    default:
      return { start, end: today };
  }
}

// Load Important section
async function loadImportantSection() {
  if (!supabaseReady || !supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return;

    const container = document.getElementById('importantCards');
    if (!container) return;

    // TODO: Load actual data from database
    // For now, using placeholder data
    const importantData = [
      {
        title: 'At Risk',
        value: '0',
        subtitle: 'Last 7 days',
        icon: 'bx-error-circle',
        avatars: []
      },
      {
        title: 'Expiring Plans',
        value: '0',
        subtitle: 'Next 30 days',
        icon: 'bx-calendar',
        avatars: []
      },
      {
        title: 'Cancellation Requests',
        value: '0',
        icon: 'bx-flag',
        avatars: []
      },
      {
        title: 'Celebrations',
        value: '0',
        subtitle: 'Next 7 days',
        icon: 'bx-party',
        avatars: []
      }
    ];

    container.innerHTML = importantData.map(item => {
      const avatarsHtml = item.avatars && item.avatars.length > 0
        ? `<div class="important-card-avatars">
            ${item.avatars.slice(0, 3).map(avatar => `
              <div class="important-avatar">${avatar}</div>
            `).join('')}
            ${item.avatars.length > 3 ? `<div class="important-avatar more">${item.avatars.length - 3}+</div>` : ''}
          </div>`
        : '';

      return `
        <div class="important-card">
          <div class="important-card-left">
            <div class="important-card-icon">
              <i class="bx ${item.icon}"></i>
            </div>
            <div class="important-card-info">
              <div class="important-card-title">${item.title}</div>
              <div class="important-card-value">${item.value}</div>
              ${item.subtitle ? `<div class="important-card-subtitle">${item.subtitle}</div>` : ''}
            </div>
          </div>
          ${avatarsHtml}
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading important section:', error);
  }
}

// Load Stats section
async function loadStatsSection() {
  if (!supabaseReady || !supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return;

    const container = document.getElementById('statsCards');
    if (!container) return;

    const { start, end } = getDateRangeDates(currentDateRange);

    // TODO: Load actual stats from database based on date range
    // For now, using placeholder data
    const statsData = [
      {
        title: 'Leads',
        value: '0',
        change: { value: '0%', type: 'positive' }
      },
      {
        title: 'Check-ins',
        value: '0',
        change: { value: '0%', type: 'negative' }
      },
      {
        title: 'New Memberships',
        value: '0',
        change: { value: '0%', type: 'positive' }
      }
    ];

    container.innerHTML = statsData.map(stat => {
      const changeIcon = stat.change.type === 'positive' ? 'bx-up-arrow-alt' : 'bx-down-arrow-alt';
      
      return `
        <div class="stat-card">
          <div class="stat-card-title">${stat.title}</div>
          <div class="stat-card-value">${stat.value}</div>
          <div class="stat-card-change ${stat.change.type}">
            <i class="bx ${changeIcon}"></i>
            <span>${stat.change.value}</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading stats section:', error);
  }
}

// Track if edit menu handlers are set up to prevent duplicates
let editMenuHandlersSetup = false;

// Show edit menu
function showEditMenu() {
  const editMenu = document.getElementById('editMenuOverlay');
  if (editMenu) {
    editMenu.classList.add('is-open');
    editMenu.setAttribute('aria-hidden', 'false');
    
    // Close menu when clicking outside (only set once)
    if (!editMenuHandlersSetup) {
      editMenu.onclick = (e) => {
        if (e.target === editMenu) {
          hideEditMenu();
        }
      };
    }
    
    // Setup menu item handlers (only once to prevent duplicates)
    if (!editMenuHandlersSetup) {
      const changeStaffBtn = document.getElementById('changeStaffBtn');
      const rescheduleBtn = document.getElementById('rescheduleBtn');
      const cancelBtn = document.getElementById('cancelSessionBtn');
      
      if (changeStaffBtn) {
        changeStaffBtn.onclick = (e) => {
          e.stopPropagation();
          hideEditMenu();
          showChangeStaffModal();
        };
      }
      
      if (rescheduleBtn) {
        rescheduleBtn.onclick = (e) => {
          e.stopPropagation();
          hideEditMenu();
          showRescheduleModal();
        };
      }
      
      if (cancelBtn) {
        cancelBtn.onclick = (e) => {
          e.stopPropagation();
          hideEditMenu();
          handleCancelSession();
        };
      }
      
      editMenuHandlersSetup = true;
    }
  }
}

// Hide edit menu
function hideEditMenu() {
  const editMenu = document.getElementById('editMenuOverlay');
  if (editMenu) {
    editMenu.classList.remove('is-open');
    editMenu.setAttribute('aria-hidden', 'true');
  }
}

// Show change staff modal
async function showChangeStaffModal() {
  if (!currentSessionData || !currentSessionData.is_individual) return;
  
  const modal = document.getElementById('changeStaffOverlay');
  const content = document.getElementById('changeStaffContent');
  const closeBtn = document.getElementById('closeChangeStaffBtn');
  const saveBtn = document.getElementById('saveStaffBtn');
  
  if (!modal || !content) return;
  
  // Load available coaches for this session type
  const sessionTypeId = currentSessionData.booking_data?.session_type_id;
  if (!sessionTypeId) {
    alert('Error: Could not determine session type');
    return;
  }
  
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
    .eq('is_available', true)
    .not('availability', 'is', null);
  
  if (error) {
    console.error('Error loading coaches:', error);
    alert('Error loading available coaches');
    return;
  }
  
  const currentCoachId = currentSessionData.coach_id;
  const coaches = (coachAvailability || []).map(c => c.coach).filter(Boolean);
  
  content.innerHTML = coaches.map(coach => {
    const isSelected = coach.id === currentCoachId;
    const initials = `${coach.first_name?.charAt(0) || ''}${coach.last_name?.charAt(0) || ''}`.toUpperCase();
    return `
      <div class="change-staff-item">
        <input type="radio" name="selectedStaff" value="${coach.id}" id="staff-${coach.id}" ${isSelected ? 'checked' : ''}>
        <div class="staff-avatar">${initials}</div>
        <div class="staff-info">
          <div class="staff-name">${coach.first_name} ${coach.last_name}</div>
        </div>
      </div>
    `;
  }).join('');
  
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');

  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    };
  }

  if (saveBtn) {
    saveBtn.onclick = async () => {
      const selected = document.querySelector('input[name="selectedStaff"]:checked');
      if (!selected) {
        alert('Please select a coach');
        return;
      }

      const newCoachId = selected.value;
      await updateIndividualSessionCoach(newCoachId);
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    };
  }

  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
  };
}

// Show reschedule modal
function showRescheduleModal() {
  if (!currentSessionData || !currentSessionData.is_individual) return;
  
  const modal = document.getElementById('rescheduleOverlay');
  const dateInput = document.getElementById('rescheduleDate');
  const timeInput = document.getElementById('rescheduleTime');
  const closeBtn = document.getElementById('closeRescheduleBtn');
  const saveBtn = document.getElementById('saveRescheduleBtn');
  
  if (!modal || !dateInput || !timeInput) return;
  
  // Set current date and time
  const currentDate = currentSessionData.session_date || currentSessionData.booking_data?.booking_date;
  const currentTime = currentSessionData.session_time || currentSessionData.booking_data?.booking_time;
  
  if (currentDate) {
    dateInput.value = currentDate;
  }
  
  if (currentTime) {
    // Convert 24h time to input format (HH:MM)
    timeInput.value = currentTime;
  }
  
  // Enable save button when both inputs have values
  const updateSaveButton = () => {
    if (saveBtn) {
      saveBtn.disabled = !dateInput.value || !timeInput.value;
    }
  };
  
  dateInput.addEventListener('change', updateSaveButton);
  timeInput.addEventListener('change', updateSaveButton);
  updateSaveButton();
  
  modal.classList.add('is-open');
  modal.setAttribute('aria-hidden', 'false');

  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    };
  }

  if (saveBtn) {
    saveBtn.onclick = async () => {
      if (!dateInput.value || !timeInput.value) {
        alert('Please select both date and time');
        return;
      }

      await updateIndividualSessionSchedule(dateInput.value, timeInput.value);
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    };
  }

  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.classList.remove('is-open');
      modal.setAttribute('aria-hidden', 'true');
    }
  };
}

// Update individual session coach
async function updateIndividualSessionCoach(newCoachId) {
  if (!currentSessionData || !currentSessionData.is_individual) return;
  
  const bookingId = currentSessionData.id;
  
  try {
    const { error } = await supabase
      .from('individual_session_bookings')
      .update({ coach_id: newCoachId })
      .eq('id', bookingId);
    
    if (error) {
      console.error('Error updating coach:', error);
      alert(`Error updating coach: ${error.message}`);
      return;
    }
    
    alert('Coach updated successfully!');
    closeSessionModal();
    
    // Preserve the active tab state when reloading
    const activeTab = document.querySelector('.tab-btn.active');
    const isMyDay = activeTab && activeTab.dataset.tab === 'my-day';
    const isPast = activeTab && activeTab.dataset.tab === 'past';
    await loadSessions(isMyDay, isPast ? 'past' : null);
  } catch (error) {
    console.error('Error updating coach:', error);
    alert(`Error: ${error.message}`);
  }
}

// Update individual session schedule
async function updateIndividualSessionSchedule(newDate, newTime) {
  if (!currentSessionData || !currentSessionData.is_individual) return;
  
  const bookingId = currentSessionData.id;
  
  try {
    const { error } = await supabase
      .from('individual_session_bookings')
      .update({ 
        booking_date: newDate,
        booking_time: newTime
      })
      .eq('id', bookingId);
    
    if (error) {
      console.error('Error rescheduling:', error);
      alert(`Error rescheduling: ${error.message}`);
      return;
    }
    
    alert('Session rescheduled successfully!');
    closeSessionModal();
    
    // Preserve the active tab state when reloading
    const activeTab = document.querySelector('.tab-btn.active');
    const isMyDay = activeTab && activeTab.dataset.tab === 'my-day';
    const isPast = activeTab && activeTab.dataset.tab === 'past';
    await loadSessions(isMyDay, isPast ? 'past' : null);
  } catch (error) {
    console.error('Error rescheduling:', error);
    alert(`Error: ${error.message}`);
  }
}

// Track if cancellation is in progress to prevent multiple calls
let isCancelling = false;

// Track cancelled session IDs to filter them out client-side (safety measure)
const cancelledSessionIds = new Set();

// Handle cancel session
async function handleCancelSession() {
  // Prevent multiple simultaneous cancellations
  if (isCancelling) {
    return;
  }
  
  if (!currentSessionData) {
    console.error('No current session data');
    alert('Error: No session data found');
    return;
  }
  
  if (!currentSessionData.is_individual) {
    console.error('Session is not individual', currentSessionData);
    alert('Error: This function only works for individual sessions');
    return;
  }
  
  if (!confirm('Are you sure you want to cancel this session? This action cannot be undone.')) {
    return;
  }
  
  // Set flag to prevent duplicate calls
  isCancelling = true;
  
  const bookingId = currentSessionData.id;
  // Add to cancelled set immediately to prevent it from showing up
  cancelledSessionIds.add(bookingId);
  
  try {
    // Update status to cancelled
    // Also set cancelled_at timestamp for tracking
    // Note: We don't use .select() here because RLS policies may prevent reading cancelled bookings
    const { error } = await supabase
      .from('individual_session_bookings')
      .update({ 
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', bookingId);
    
    if (error) {
      console.error('Error cancelling session:', error);
      alert(`Error cancelling session: ${error.message}`);
      // Remove from cancelled set if update failed
      cancelledSessionIds.delete(bookingId);
      isCancelling = false; // Reset flag on error
      return;
    }
    
    // If no error, the update succeeded
    // RLS policies may prevent us from reading the cancelled booking back,
    // but the update itself should have worked
    // If update succeeded, immediately remove the session from the UI
    const sessionListItem = document.querySelector(`.session-list-item[data-session-id="${bookingId}"]`);
    if (sessionListItem) {
      sessionListItem.style.transition = 'opacity 0.2s, transform 0.2s';
      sessionListItem.style.opacity = '0';
      sessionListItem.style.transform = 'translateX(-20px)';
      setTimeout(() => {
        sessionListItem.remove();
      }, 200);
    }
    
    // Close modal and edit menu
    closeSessionModal();
    hideEditMenu();
    
    // Clear current session data
    currentSessionData = null;
    currentReservationsData = null;
    currentStaffProfilesData = null;
    
    // Preserve the active tab state when reloading
    const activeTab = document.querySelector('.tab-btn.active');
    const isMyDay = activeTab && activeTab.dataset.tab === 'my-day';
    
    // Reload sessions after a delay to ensure database is updated
    // The loadSessions function already filters out cancelled sessions
    // (it only loads status: ['confirmed', 'completed'])
    // We also filter client-side as a safety measure
    setTimeout(async () => {
      const isPast = activeTab === 'past';
      await loadSessions(isMyDay, isPast ? 'past' : null);
      
      // Double-check: remove any cancelled sessions that might have slipped through
      const container = document.getElementById('sessionsList');
      if (container) {
        cancelledSessionIds.forEach(cancelledId => {
          const item = container.querySelector(`.session-list-item[data-session-id="${cancelledId}"]`);
          if (item) {
            item.remove();
          }
        });
        
        // Check if list is now empty and show empty state
        const remainingItems = container.querySelectorAll('.session-list-item');
        if (remainingItems.length === 0) {
          container.innerHTML = `
            <div class="empty-state">
              <i class="bx bx-calendar"></i>
              <div>No sessions scheduled for today</div>
            </div>
          `;
        }
      }
      
      // Reset flag after reload
      isCancelling = false;
    }, 500);
    
    alert('Session cancelled successfully!');
    
    // TODO: Send cancellation emails to client and coach
    // await sendCancellationEmails(currentSessionData);
    
  } catch (error) {
    console.error('Error cancelling session:', error);
    alert(`Error: ${error.message}`);
    // Remove from cancelled set if error occurred
    cancelledSessionIds.delete(bookingId);
    isCancelling = false; // Reset flag on error
  }
}

// Setup real-time subscriptions to update coach home when sessions change
function setupRealtimeSubscriptions() {
  if (!supabase || !supabaseReady) return;

  // Subscribe to group session reservations changes
  const groupReservationsChannel = supabase
    .channel('coach-home-group-reservations')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'session_reservations'
      },
      (payload) => {
        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
        const isMyDay = activeTab === 'my-day';
        const isPast = activeTab === 'past';
        loadSessions(isMyDay, isPast ? 'past' : null);
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
      (payload) => {
        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
        const isMyDay = activeTab === 'my-day';
        const isPast = activeTab === 'past';
        loadSessions(isMyDay, isPast ? 'past' : null);
      }
    )
    .subscribe();

  // Subscribe to individual session bookings changes
  const individualBookingsChannel = supabase
    .channel('coach-home-individual-bookings')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'individual_session_bookings'
      },
      (payload) => {
        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
        const isMyDay = activeTab === 'my-day';
        const isPast = activeTab === 'past';
        loadSessions(isMyDay, isPast ? 'past' : null);
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
      (payload) => {
        const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
        const isMyDay = activeTab === 'my-day';
        const isPast = activeTab === 'past';
        loadSessions(isMyDay, isPast ? 'past' : null);
      }
    )
    .subscribe();
}

// Store current notifications for mark all as read
let currentNotifications = [];

const COACH_READ_MESSAGE_IDS_KEY = 'hg-coach-read-message-ids';

function getReadMessageIds() {
  try {
    const raw = sessionStorage.getItem(COACH_READ_MESSAGE_IDS_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch {
    return new Set();
  }
}

function persistReadMessageIds(ids) {
  try {
    sessionStorage.setItem(COACH_READ_MESSAGE_IDS_KEY, JSON.stringify([...ids]));
  } catch (e) {
    console.warn('Could not persist read message ids', e);
  }
}

// Load notifications for coach
async function loadNotifications() {
  if (!supabaseReady || !supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const coachId = session.user.id;
    const readMsgIds = getReadMessageIds();

    // Get direct notifications for coaches
    const { data: directNotifications, error: directError } = await supabase
      .from('notifications')
      .select('*')
      .eq('recipient_id', coachId)
      .in('recipient_role', ['coach', 'admin'])
      .order('created_at', { ascending: false })
      .limit(50);

    // Get messages sent to coaches or all (with coach name for date line)
    const { data: messages, error: messagesError } = await supabase
      .from('coach_messages')
      .select('*, coach:profiles!coach_messages_coach_id_fkey(first_name, last_name)')
      .in('recipient_type', ['coaches', 'all'])
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(20);

    // Combine notifications and messages
    const allNotifications = [];
    
    // Add direct notifications
    if (directNotifications && !directError) {
      allNotifications.push(...directNotifications);
    }
    
    // Convert messages to notification format; apply persisted read state
    if (messages && !messagesError) {
      messages.forEach(msg => {
        const id = `msg-${msg.id}`;
        const annType = msg.announcement_type || 'information';
        const linkUrl = (msg.link_url || (msg.message_text && (msg.message_text.match(/https?:\/\/[^\s<>"\u201c\u201d]+/i) || [])[0]?.replace(/[.,;:!?)]+$/, ''))) || null;
        const attachmentUrl = msg.attachment_url || null;
        const attachmentType = msg.attachment_type || (msg.attachment_name && /\.(mp4|webm|mov|avi)(\?|$)/i.test(msg.attachment_name) ? 'video' : attachmentUrl ? 'photo' : null) || null;
        const coachName = msg.coach ? [msg.coach.first_name, msg.coach.last_name].filter(Boolean).join(' ') : '';
        allNotifications.push({
          id,
          notification_type: annType,
          title: 'New Announcement',
          message: msg.message_text,
          created_at: msg.created_at,
          is_read: readMsgIds.has(id),
          data: {
            message_id: msg.id,
            recipient_type: msg.recipient_type,
            announcement_type: annType,
            attachment_url: attachmentUrl,
            attachment_type: attachmentType,
            link_url: linkUrl,
            coach_name: coachName
          }
        });
      });
    }
    
    // Sort by created_at descending
    allNotifications.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    const error = directError || messagesError;
    if (error) {
      console.error('Error loading notifications:', error);
      return;
    }

    currentNotifications = allNotifications;
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
    item.addEventListener('click', async () => {
      const notificationId = item.dataset.notificationId;
      const wasUnread = item.classList.contains('unread');
      
      await markNotificationAsRead(notificationId);
      item.classList.remove('unread');
      item.classList.add('read');
      const dot = item.querySelector('.notification-dot');
      if (dot) dot.remove();
      
      // Reload only for real notifications (msg- items are updated in memory by markNotificationAsRead)
      if (wasUnread && !String(notificationId).startsWith('msg-')) {
        await loadNotifications();
      }
    });
  });
}

// Mark all notifications as read (real notifications via API; message items in memory + sessionStorage)
async function markAllNotificationsAsRead() {
  if (!supabaseReady || !supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return;

    const unreadReal = currentNotifications.filter(n => !n.is_read && !n.id.startsWith('msg-'));
    const unreadMsg = currentNotifications.filter(n => !n.is_read && n.id.startsWith('msg-'));

    // Mark all message items as read in memory and persist
    const readIds = getReadMessageIds();
    unreadMsg.forEach(n => {
      n.is_read = true;
      n.read_at = new Date().toISOString();
      readIds.add(n.id);
    });
    if (unreadMsg.length > 0) persistReadMessageIds(readIds);

    // Mark real notifications via API
    if (unreadReal.length > 0) {
      const notificationIds = unreadReal.map(n => n.id);
      await supabase
        .from('notifications')
        .update({ 
          is_read: true,
          read_at: new Date().toISOString()
        })
        .in('id', notificationIds);
    }

    // Update in-memory list and UI
    currentNotifications.forEach(n => { if (!n.is_read) n.is_read = true; });
    updateNotificationBell(currentNotifications);
    renderNotifications(currentNotifications);

    // Reload to sync with server (real notifications)
    await loadNotifications();
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
  }
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

// Get icon for notification type (announcement subtypes: time_change=clock-alert, cancellation=ban, popup_session=calendar-check, information=info, veo_link=cctv)
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

// Mark notification as read (only real notifications; message items use id "msg-{uuid}" and are not in notifications table)
async function markNotificationAsRead(notificationId) {
  if (!notificationId) return;
  if (notificationId.startsWith('msg-')) {
    const notif = currentNotifications.find(n => n.id === notificationId);
    if (notif) {
      notif.is_read = true;
      notif.read_at = new Date().toISOString();
      const ids = getReadMessageIds();
      ids.add(notificationId);
      persistReadMessageIds(ids);
      updateNotificationBell(currentNotifications);
    }
    return;
  }
  if (!supabaseReady || !supabase) return;
  try {
    await supabase
      .from('notifications')
      .update({ 
        is_read: true,
        read_at: new Date().toISOString()
      })
      .eq('id', notificationId);
  } catch (error) {
    console.error('Error marking notification as read:', error);
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

// Setup Notification Bottom Sheet
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

  if (lightbox) {
    lightbox.querySelector('.notification-media-lightbox-backdrop')?.addEventListener('click', closeNotificationMediaLightbox);
    lightbox.querySelector('.notification-media-lightbox-close')?.addEventListener('click', closeNotificationMediaLightbox);
    lightbox.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeNotificationMediaLightbox(); });
  }
  
  const FULL_HEIGHT = Math.floor(window.innerHeight * 0.7);
  const MIN_HEIGHT = 200;
  
  let isDragging = false;
  let startY = 0;
  let startHeight = 0;
  let isSheetOpen = false;
  
  function openNotificationSheet() {
    isSheetOpen = true;
    bottomSheet.style.display = 'flex';
    bottomSheet.style.height = `${FULL_HEIGHT}px`;
    bottomSheet.dataset.level = '2';
    
    requestAnimationFrame(() => {
      bottomSheet.style.opacity = '1';
      bottomSheet.style.transform = 'translateY(0)';
    });
  }
  
  function closeNotificationSheet() {
    isSheetOpen = false;
    bottomSheet.style.opacity = '0';
    bottomSheet.style.transform = 'translateY(100%)';
    setTimeout(() => {
      bottomSheet.style.display = 'none';
    }, 300);
  }
  
  notificationBell.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    if (!isSheetOpen) {
      openNotificationSheet();
    } else {
      closeNotificationSheet();
    }
  });
  
  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      closeNotificationSheet();
    });
  }
  
  if (handle) {
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
      if (finalHeight <= MIN_HEIGHT) {
        closeNotificationSheet();
      } else {
        bottomSheet.style.height = `${FULL_HEIGHT}px`;
      }
      if (e.cancelable) {
        e.preventDefault();
      }
      e.stopPropagation();
    }, { passive: false });
    
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      const deltaY = e.clientY - startY;
      if (deltaY > 0) {
        const newHeight = Math.max(MIN_HEIGHT, startHeight - deltaY);
        bottomSheet.style.height = `${newHeight}px`;
      }
    };
    
    const handleMouseUp = () => {
      if (!isDragging) return;
      isDragging = false;
      const finalHeight = bottomSheet.offsetHeight;
      if (finalHeight <= MIN_HEIGHT) {
        closeNotificationSheet();
      } else {
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
    if (backdropTimeout) {
      clearTimeout(backdropTimeout);
      backdropTimeout = null;
    }
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    if (notificationBell.contains(e.target) || 
        bottomSheet.contains(e.target) ||
        e.target === notificationBell ||
        (markAllReadBtn && (markAllReadBtn.contains(e.target) || e.target === markAllReadBtn))) {
      return;
    }
    if (isSheetOpen) {
      backdropTimeout = setTimeout(() => {
        closeNotificationSheet();
      }, 100);
    }
  });
  
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && 
        bottomSheet.style.display !== 'none' && 
        bottomSheet.style.display) {
      closeNotificationSheet();
    }
  });
  
  // Mark all as read button - single handler via onclick (avoids duplicate listeners when nav back to home)
  setTimeout(() => {
    const markAllReadBtn = document.getElementById('markAllReadBtn');
    if (markAllReadBtn) {
      if (markAllReadBtn.dataset.listenerAttached === '1') return;
      markAllReadBtn.dataset.listenerAttached = '1';
      markAllReadBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        await markAllNotificationsAsRead();
      });
    }
  }, 100);
}

// Create notification for points awarded
async function createPointsNotification(playerId, points, sessionType, sessionId) {
  if (!supabaseReady || !supabase) return;

  try {
    // Create notification for player
    await supabase
      .from('notifications')
      .insert({
        recipient_id: playerId,
        recipient_role: 'player',
        notification_type: 'points_awarded',
        title: 'Points Awarded',
        message: `You've been awarded ${points} points for ${sessionType}`,
        data: {
          points: points,
          session_type: sessionType,
          session_id: sessionId
        },
        related_entity_type: 'points',
        related_entity_id: null
      });

    // Also notify parent if exists
    const { data: relationships } = await supabase
      .from('parent_player_relationships')
      .select('parent_id, player:profiles!parent_player_relationships_player_id_fkey(first_name, last_name)')
      .eq('player_id', playerId)
      .limit(1)
      .single();

    if (relationships) {
      await supabase
        .from('notifications')
        .insert({
          recipient_id: relationships.parent_id,
          recipient_role: 'parent',
          notification_type: 'points_awarded',
          title: `Points Awarded to ${relationships.player?.first_name || ''} ${relationships.player?.last_name || ''}`,
          message: `${relationships.player?.first_name || 'Your player'} has been awarded ${points} points for ${sessionType}`,
          data: {
            points: points,
            session_type: sessionType,
            session_id: sessionId,
            player_id: playerId
          },
          related_entity_type: 'points',
          related_entity_id: null
        });
    }
  } catch (error) {
    console.error('Error creating points notification:', error);
  }
}
