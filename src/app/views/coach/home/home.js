// Coach Dashboard page scripts
import { initSupabase } from '../../../../auth/config/supabase.js';
import { getPointsForSessionType, getCurrentQuarter } from '../../../utils/points.js';

// Initialize Supabase
let supabase;
let supabaseReady = false;

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
  await loadTodaySessions();
  await loadImportantSection();
  await loadStatsSection();
  setupRealtimeSubscriptions();
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
      if (tab === 'my-day') {
        // Filter to show only sessions where current coach is assigned
        loadTodaySessions(true); // true = my day filter
      } else {
        // Show all sessions
        loadTodaySessions(false); // false = full schedule
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
async function loadTodaySessions(myDayOnly = false) {
  if (!supabaseReady || !supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return;

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
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
      `)
      .eq('session_date', todayStr)
      .eq('status', 'scheduled');

    // Filter for "My day" - only sessions where coach is assigned
    if (myDayOnly) {
      query = query.or(`coach_id.eq.${coachId},assistant_coaches.cs.{${coachId}},goalkeeper_coaches.cs.{${coachId}}`);
    }

    const { data: sessions, error } = await query.order('session_time', { ascending: true });

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
      console.log('🔍 Loading reservations for session IDs:', sessionIds);
      
      // First try without the player join to see if RLS is blocking
      const { data: simpleResData, error: simpleError } = await supabase
        .from('session_reservations')
        .select('*')
        .in('session_id', sessionIds)
        .in('reservation_status', ['reserved', 'checked-in']);
      
      console.log('🔍 Simple query (no join) result:', {
        count: simpleResData?.length || 0,
        data: simpleResData,
        error: simpleError
      });
      
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
        .in('reservation_status', ['reserved', 'checked-in']);
      
      console.log('🔍 Query with player join result:', {
        count: resData?.length || 0,
        data: resData,
        error: resError
      });

      if (resError) {
        console.error('❌ Error loading reservations:', resError);
      } else {
        reservations = resData || [];
        console.log('✅ Loaded reservations:', reservations.length, 'reservations found');
        console.log('📋 Reservations by session:', reservations.map(r => ({
          session_id: r.session_id,
          player: r.player ? `${r.player.first_name} ${r.player.last_name}` : 'No player',
          status: r.reservation_status
        })));
      }
    } else {
      console.log('⚠️ No session IDs to load reservations for');
    }

    // Group reservations by session_id
    const reservationsBySession = {};
    reservations.forEach(res => {
      if (!reservationsBySession[res.session_id]) {
        reservationsBySession[res.session_id] = [];
      }
      reservationsBySession[res.session_id].push(res);
    });
    
    console.log('📊 Reservations grouped by session:', Object.keys(reservationsBySession).map(sessionId => ({
      session_id: sessionId,
      count: reservationsBySession[sessionId].length,
      players: reservationsBySession[sessionId].map(r => r.player ? `${r.player.first_name} ${r.player.last_name}` : 'No player')
    })));

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

    // Load individual session bookings for today
    let individualBookings = [];
    if (myDayOnly) {
      // For "My day", only load bookings for this coach
      const { data: bookings, error: bookingsError } = await supabase
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
        .eq('booking_date', todayStr)
        .eq('coach_id', coachId)
        .in('status', ['confirmed', 'completed'])
        .is('cancelled_at', null)  // Also check that cancelled_at is null as additional safety
        .order('booking_time', { ascending: true });

      // Debug telemetry removed - was causing ERR_CONNECTION_REFUSED errors

      if (bookingsError) {
        console.error('Error loading My day bookings:', bookingsError);
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
    } else {
      // For "Full schedule", load all individual bookings
      const { data: bookings, error: bookingsError } = await supabase
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
        .eq('booking_date', todayStr)
        .in('status', ['confirmed', 'completed'])
        .is('cancelled_at', null)  // Also check that cancelled_at is null as additional safety
        .order('booking_time', { ascending: true });

      if (!bookingsError && bookings) {
        individualBookings = bookings.map(booking => ({
          id: booking.id,
          session_type: booking.session_type?.display_name || booking.session_type?.name || 'Individual Session',
          session_date: booking.booking_date,
          session_time: booking.booking_time,
          duration_minutes: booking.duration_minutes || booking.session_type?.duration_minutes || 20,
          location_type: 'virtual',
          attendance_limit: 1,
          current_reservations: 1,
          coach_id: booking.coach_id,
          coach: booking.coach, // Add coach profile
          is_individual: true,
          booking_data: booking
        }));
      }
    }

    // Combine group sessions and individual bookings
    // Filter out any cancelled sessions (client-side safety check)
    const allSessions = [...onFieldSessions, ...virtualSessions, ...individualBookings]
      .filter(session => !cancelledSessionIds.has(session.id))
      .sort((a, b) => {
        const timeA = a.session_time || '';
        const timeB = b.session_time || '';
        return timeA.localeCompare(timeB);
      });
    
    // Show empty state only if we've checked both group and individual sessions and found nothing
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
    
    renderSessionsList(allSessions, reservationsBySession, staffProfiles);
  } catch (error) {
    console.error('Error loading today sessions:', error);
  }
}

// Render sessions as simple list
function renderSessionsList(sessions, reservationsBySession, staffProfiles = {}) {
  const container = document.getElementById('sessionsList');
  if (!container) return;

  if (sessions.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="bx bx-calendar"></i>
        <div>No sessions scheduled for today</div>
      </div>
    `;
    return;
  }

  container.innerHTML = sessions.map(session => {
    const reservations = reservationsBySession[session.id] || [];
    return createSessionListItem(session, reservations);
  }).join('');

  // Attach click listeners to open modal
  attachListEventListeners(sessions, reservationsBySession, staffProfiles);
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

// Attach event listeners to list items
function attachListEventListeners(sessions, reservationsBySession, staffProfiles) {
  document.querySelectorAll('.session-list-item').forEach(item => {
    item.addEventListener('click', () => {
      const sessionId = item.dataset.sessionId;
      const session = sessions.find(s => s.id === sessionId);
      if (session) {
        const reservations = reservationsBySession[session.id] || [];
        console.log('🔍 Opening modal for session:', sessionId);
        console.log('📋 Reservations for this session:', reservations.length, reservations);
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

  // Attach event listeners for modal content
  attachSessionEventListeners([session], { [session.id]: reservations });

  // Close modal handlers
  const closeBtn = document.getElementById('closeModalBtn');
  if (closeBtn) {
    closeBtn.onclick = () => closeSessionModal();
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
  
  // Handle individual sessions differently
  const isIndividual = session.is_individual;
  const location = isIndividual 
    ? 'Virtual Session'
    : (session.location_type === 'on-field' 
      ? session.location || 'Location TBD'
      : 'Virtual Session');
  const locationIcon = isIndividual || session.location_type === 'virtual' ? 'bx-video' : 'bx-map';

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
  const players = reservations.map(res => ({
    ...res.player,
    reservation_status: res.reservation_status,
    reservation_id: res.id,
    checked_in_at: res.checked_in_at
  }));

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
        <div class="session-capacity">${reservations.length} / ${session.attendance_limit}</div>
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
          <div class="players-title">Players</div>
          ${!isIndividual ? `
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
          ${players.length > 0 ? players.map(player => createPlayerItem(player)).join('') : '<div class="empty-state">No players reserved</div>'}
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
function createPlayerItem(player) {
  if (!player) return '';
  
  const age = calculateAge(player.birth_year, player.birth_date);
  const ageGroup = getAgeGroup(age);
  const initials = getInitials(player.first_name, player.last_name);
  const positions = player.positions || [];
  const isCheckedIn = player.reservation_status === 'checked-in';
  // Create comma-separated positions string for data attribute
  const positionsStr = positions.length > 0 ? positions.join(',') : '';
  
  return `
    <div class="player-item" 
         data-player-id="${player.id}"
         data-age-group="${ageGroup || 'unknown'}"
         data-reservation-status="${player.reservation_status}"
         data-reservation-id="${player.reservation_id}"
         data-positions="${positionsStr}">
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
      console.log('Coach check-in:', staffId);
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
          console.log(`Awarded ${points} points to player ${playerId} for ${sessionType}`);
        }
      }
    }

    // Update UI in modal
    const btn = document.querySelector(`.player-check-in-btn[data-reservation-id="${reservationId}"]`);
    if (btn) {
      btn.classList.add('checked-in');
      btn.dataset.action = 'remove';
      btn.textContent = 'Remove Check-in';
    }

    const playerItem = document.querySelector(`.player-item[data-reservation-id="${reservationId}"]`);
    if (playerItem) {
      playerItem.dataset.reservationStatus = 'checked-in';
    }

    // Reload to update list counts
    const activeTab = document.querySelector('.tab-btn.active')?.dataset.tab;
    await loadTodaySessions(activeTab === 'my-day');
  } catch (error) {
    console.error('Error checking in player:', error);
    alert(`Error: ${error.message}`);
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
        // Note: This will only work if RLS allows coaches to update
        const { error: updateError } = await supabase
          .from('points_transactions')
          .update({ status: 'archived' })
          .eq('id', pointsTransaction.id);

        if (updateError) {
          console.warn('Could not remove points transaction. Points may need to be manually adjusted:', updateError);
          alert('Check-in removed, but points could not be reversed. Please contact an admin to adjust points manually.');
        } else {
          console.log('Points transaction archived (not deleted)');
        }
      } else {
        console.log('Points transaction deleted successfully');
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
    await loadTodaySessions(activeTab === 'my-day');
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
    editMenu.style.display = 'flex';
    
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
    editMenu.style.display = 'none';
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
  
  modal.style.display = 'flex';
  
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = 'none';
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
      modal.style.display = 'none';
    };
  }
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
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
  
  modal.style.display = 'flex';
  
  if (closeBtn) {
    closeBtn.onclick = () => {
      modal.style.display = 'none';
    };
  }
  
  if (saveBtn) {
    saveBtn.onclick = async () => {
      if (!dateInput.value || !timeInput.value) {
        alert('Please select both date and time');
        return;
      }
      
      await updateIndividualSessionSchedule(dateInput.value, timeInput.value);
      modal.style.display = 'none';
    };
  }
  
  modal.onclick = (e) => {
    if (e.target === modal) {
      modal.style.display = 'none';
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
    await loadTodaySessions(isMyDay);
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
    await loadTodaySessions(isMyDay);
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
    console.log('Cancellation already in progress, ignoring duplicate call');
    return;
  }
  
  console.log('handleCancelSession called', { currentSessionData, isIndividual: currentSessionData?.is_individual });
  
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
  console.log('Cancelling booking:', bookingId);
  
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
    console.log('✅ Session cancellation update sent successfully:', bookingId);
    
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
    // The loadTodaySessions function already filters out cancelled sessions
    // (it only loads status: ['confirmed', 'completed'])
    // We also filter client-side as a safety measure
    setTimeout(async () => {
      await loadTodaySessions(isMyDay);
      
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
        console.log('New group reservation created, reloading coach home:', payload);
        const activeTab = document.querySelector('.sections-tab.active')?.dataset.tab;
        loadTodaySessions(activeTab === 'my-day');
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
        console.log('Group reservation cancelled, reloading coach home:', payload);
        const activeTab = document.querySelector('.sections-tab.active')?.dataset.tab;
        loadTodaySessions(activeTab === 'my-day');
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
        console.log('New individual booking created, reloading coach home:', payload);
        const activeTab = document.querySelector('.sections-tab.active')?.dataset.tab;
        loadTodaySessions(activeTab === 'my-day');
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
        console.log('Individual booking cancelled, reloading coach home:', payload);
        const activeTab = document.querySelector('.sections-tab.active')?.dataset.tab;
        loadTodaySessions(activeTab === 'my-day');
      }
    )
    .subscribe();
}
