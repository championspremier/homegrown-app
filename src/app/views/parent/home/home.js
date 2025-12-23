// Parent Home page scripts
import { initSupabase } from '../../../../auth/config/supabase.js';

let supabase;
let supabaseReady = false;
let currentWeekStart = new Date();
let selectedDate = new Date();
let linkedPlayers = []; // Store linked players for showing names

// Initialize Supabase
async function init() {
  supabase = await initSupabase();
  if (supabase) {
    supabaseReady = true;
    await loadLinkedPlayers();
    setupEventListeners();
    renderCalendar();
    loadReservedSessions();
  } else {
    console.error('Failed to initialize Supabase');
  }
}

// Load linked players
async function loadLinkedPlayers() {
  if (!supabaseReady || !supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return;

    const { data: relationships, error } = await supabase
      .from('parent_player_relationships')
      .select(`
        player_id,
        player:profiles!parent_player_relationships_player_id_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .eq('parent_id', session.user.id);

    if (error) {
      console.error('Error loading linked players:', error);
      return;
    }

    linkedPlayers = (relationships || []).map(rel => ({
      id: rel.player_id,
      name: rel.player ? `${rel.player.first_name || ''} ${rel.player.last_name || ''}`.trim() : 'Player',
      ...rel.player
    }));

  } catch (error) {
    console.error('Error loading linked players:', error);
  }
}

// Setup event listeners
function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.schedule-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const tabName = tab.dataset.tab;
      switchTab(tabName);
    });
  });

  // Calendar navigation
  document.getElementById('parentHomeCalendarPrev')?.addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    renderCalendar();
  });

  document.getElementById('parentHomeCalendarNext')?.addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() + 7);
    renderCalendar();
  });

  // Schedule toggle
  const btn = document.getElementById('scheduleToggle');
  const panel = document.getElementById('hiddenSchedule');
  if (btn && panel) {
    const icon = btn.querySelector('i');
    const setOpen = (open) => {
      panel.classList.toggle('is-open', open);
      btn.setAttribute('aria-expanded', String(open));
      if (icon) {
        icon.classList.toggle('bx-chevron-down', open);
        icon.classList.toggle('bx-chevron-up', !open);
      }
    };

    setOpen(true);

    btn.addEventListener('click', () => {
      const openNow = panel.classList.contains('is-open');
      setOpen(!openNow);
      if (!openNow) {
        loadReservedSessions();
      }
    });
  }
}

// Switch between Sessions and Reservations tabs
function switchTab(tabName) {
  // Update tab buttons
  document.querySelectorAll('.schedule-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  // Update tab content
  document.querySelectorAll('.schedule-tab-content').forEach(content => {
    content.classList.toggle('active', content.id === `${tabName}TabContent`);
  });

  // Show/hide calendar based on tab
  const calendar = document.getElementById('parentHomeCalendar');
  if (calendar) {
    if (tabName === 'sessions') {
      calendar.style.display = 'flex';
    } else {
      calendar.style.display = 'none';
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
  const weekRow = document.getElementById('parentHomeCalendarWeek');
  if (!weekRow) return;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get week start (Sunday) - ensure we're working with a fresh date
  const weekStart = new Date(currentWeekStart);
  const dayOfWeek = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - dayOfWeek);
  weekStart.setHours(0, 0, 0, 0);
  
  // Update currentWeekStart to the calculated week start
  currentWeekStart = new Date(weekStart);

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

// Load reserved sessions (group and individual) for all linked players
async function loadReservedSessions() {
  if (!supabaseReady || !supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return;

    const parentId = session.user.id;
    const container = document.getElementById('sessionsListContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading-state">Loading sessions...</div>';

    // Get all linked player IDs
    const playerIds = linkedPlayers.map(p => p.id);
    
    if (playerIds.length === 0) {
      container.innerHTML = '<div class="empty-state">No linked players found</div>';
      return;
    }

    // Load group session reservations for all linked players
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
        ),
        player:profiles!session_reservations_player_id_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .in('player_id', playerIds)
      .in('reservation_status', ['reserved', 'checked-in'])
      .neq('reservation_status', 'cancelled');

    if (groupError) {
      console.error('Error loading group reservations:', groupError);
    }

    // Load individual session bookings for all linked players
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
          last_name
        )
      `)
      .in('player_id', playerIds)
      .in('status', ['confirmed', 'completed'])
      .neq('status', 'cancelled')
      .is('cancelled_at', null);

    if (individualError) {
      console.error('Error loading individual bookings:', individualError);
    }

    // Combine and format sessions
    // For group sessions, we'll group by session_id to combine multiple players
    const groupSessionsMap = new Map(); // session_id -> session object with array of players
    const allSessions = [];

    // Add group sessions - group by session_id
    if (groupReservations) {
      groupReservations.forEach(reservation => {
        if (reservation.session) {
          const player = reservation.player;
          const playerName = player ? `${player.first_name || ''} ${player.last_name || ''}`.trim() : null;
          const sessionId = reservation.session.id;
          
          if (groupSessionsMap.has(sessionId)) {
            // Add player to existing session
            const existingSession = groupSessionsMap.get(sessionId);
            existingSession.player_names.push(playerName);
            existingSession.reservation_ids.push(reservation.id);
            existingSession.player_ids.push(reservation.player_id);
            // Store mapping of reservation_id -> player_name
            if (!existingSession.reservation_player_map) {
              existingSession.reservation_player_map = {};
            }
            existingSession.reservation_player_map[reservation.id] = playerName;
          } else {
            // Create new session entry
            const reservationPlayerMap = {};
            reservationPlayerMap[reservation.id] = playerName;
            
            groupSessionsMap.set(sessionId, {
              id: reservation.session.id,
              reservation_id: reservation.id, // Keep first one for cancel button
              reservation_ids: [reservation.id], // Store all reservation IDs
              reservation_player_map: reservationPlayerMap, // Map reservation_id -> player_name
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
              reservation_status: reservation.reservation_status,
              player_id: reservation.player_id,
              player_ids: [reservation.player_id],
              player_name: playerName,
              player_names: [playerName]
            });
          }
        }
      });
    }

    // Add grouped group sessions to allSessions
    groupSessionsMap.forEach(session => {
      allSessions.push(session);
    });

    // Add individual sessions
    if (individualBookings) {
      individualBookings.forEach(booking => {
        const player = booking.player;
        const playerName = player ? `${player.first_name || ''} ${player.last_name || ''}`.trim() : null;
        
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
          color: booking.session_type?.color,
          player_id: booking.player_id,
          player_name: playerName
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
    const calendar = document.getElementById('parentHomeCalendar');
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
  }
}

// Render sessions list
function renderSessionsList(sessions, container) {
  if (!container) return;

  if (sessions.length === 0) {
    container.innerHTML = '<div class="empty-state">No reserved sessions</div>';
    return;
  }

  container.innerHTML = sessions.map(session => createSessionCard(session)).join('');

  // Attach cancel handlers
  container.querySelectorAll('.cancel-reservation-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const reservationId = btn.dataset.reservationId;
      const isIndividual = btn.dataset.isIndividual === 'true';
      
      // Check if this is a group session with multiple players
      // Get the session card to check for multiple reservations
      const sessionCard = btn.closest('.reserved-session-card');
      const reservationIdsStr = sessionCard?.dataset.reservationIds;
      const reservationPlayerMapStr = sessionCard?.dataset.reservationPlayerMap;
      
      // If multiple reservations (group session with multiple players), show selection modal
      if (reservationIdsStr && reservationIdsStr.trim() !== '' && reservationIdsStr !== 'null' && reservationIdsStr !== '[' && reservationIdsStr.length > 2) {
        try {
          const reservationIds = JSON.parse(reservationIdsStr);
          if (Array.isArray(reservationIds) && reservationIds.length > 1) {
            // Parse reservation-player mapping
            let reservationPlayerMap = {};
            if (reservationPlayerMapStr && reservationPlayerMapStr.trim() !== '' && reservationPlayerMapStr !== 'null') {
              try {
                reservationPlayerMap = JSON.parse(reservationPlayerMapStr);
              } catch (err) {
                console.warn('Error parsing reservation-player map:', err);
              }
            }
            
            // Show modal to select which player(s) to cancel
            await showCancelSelectionModal(reservationIds, isIndividual, sessionCard, reservationPlayerMap);
            return;
          }
        } catch (err) {
          // Invalid JSON - treat as single reservation
          console.warn('Error parsing reservation IDs, treating as single:', err, 'String was:', reservationIdsStr);
        }
      }
      
      // Single reservation - proceed directly
      await cancelReservation(reservationId, isIndividual);
    });
  });
}

// Create session card HTML (with player name for parents)
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
    const sessionDate = new Date(session.session_date + 'T00:00:00');
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                    'July', 'August', 'September', 'October', 'November', 'December'];
    const day = sessionDate.getDate();
    const month = months[sessionDate.getMonth()];
    const year = sessionDate.getFullYear();
    
    // Add ordinal suffix (st, nd, rd, th)
    const getOrdinalSuffix = (n) => {
      const s = ['th', 'st', 'nd', 'rd'];
      const v = n % 100;
      return s[(v - 20) % 10] || s[v] || s[0];
    };
    
    dateString = `${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
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

  // Show player name(s) if available (for parents with linked accounts)
  // For group sessions, show all player names next to each other
  let playerNameDisplay = '';
  if (session.player_names && session.player_names.length > 0) {
    // Filter out null/undefined names and join them
    const validNames = session.player_names.filter(name => name);
    if (validNames.length > 0) {
      playerNameDisplay = `<div class="session-player-name">${validNames.join(', ')}</div>`;
    }
  } else if (session.player_name) {
    playerNameDisplay = `<div class="session-player-name">${session.player_name}</div>`;
  }

  // Store reservation-player mapping as data attribute
  const reservationPlayerMapStr = session.reservation_player_map ? JSON.stringify(session.reservation_player_map) : '';
  const reservationIdsStr = session.reservation_ids ? JSON.stringify(session.reservation_ids) : '';

  return `
    <div class="reserved-session-card" 
         data-session-id="${session.id}" 
         data-reservation-ids="${reservationIdsStr}"
         data-reservation-player-map="${reservationPlayerMapStr}">
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
        ${playerNameDisplay}
        <div class="session-badge reserved">RESERVED</div>
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

    const parentId = session.user.id;
    const container = document.getElementById('reservationsListContainer');
    if (!container) return;

    // Hide calendar for reservations tab
    const calendar = document.getElementById('parentHomeCalendar');
    if (calendar) {
      calendar.style.display = 'none';
    }

    container.innerHTML = '<div class="loading-state">Loading reservations...</div>';

    // Get all linked player IDs
    const playerIds = linkedPlayers.map(p => p.id);
    
    if (playerIds.length === 0) {
      container.innerHTML = '<div class="empty-state">No linked players found</div>';
      return;
    }

    // Get today's date for filtering future sessions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Load group session reservations for all linked players
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
        ),
        player:profiles!session_reservations_player_id_fkey(
          id,
          first_name,
          last_name
        )
      `)
      .in('player_id', playerIds)
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

    // Use filtered reservations
    const filteredGroupReservations = futureGroupReservations;

    // Load individual session bookings for all linked players (future only)
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
          last_name
        )
      `)
      .in('player_id', playerIds)
      .in('status', ['confirmed', 'completed'])
      .is('cancelled_at', null)
      .gte('booking_date', todayStr);

    if (individualError) {
      console.error('Error loading individual bookings:', individualError);
    }

    // Combine and format sessions (same grouping logic as loadReservedSessions)
    const groupSessionsMap = new Map();
    const allSessions = [];

    // Add group sessions - group by session_id
    if (filteredGroupReservations) {
      filteredGroupReservations.forEach(reservation => {
        if (reservation.session) {
          const player = reservation.player;
          const playerName = player ? `${player.first_name || ''} ${player.last_name || ''}`.trim() : null;
          const sessionId = reservation.session.id;
          
          if (groupSessionsMap.has(sessionId)) {
            const existingSession = groupSessionsMap.get(sessionId);
            existingSession.player_names.push(playerName);
            existingSession.reservation_ids.push(reservation.id);
            existingSession.player_ids.push(reservation.player_id);
            // Store mapping of reservation_id -> player_name
            if (!existingSession.reservation_player_map) {
              existingSession.reservation_player_map = {};
            }
            existingSession.reservation_player_map[reservation.id] = playerName;
          } else {
            const reservationPlayerMap = {};
            reservationPlayerMap[reservation.id] = playerName;
            
            groupSessionsMap.set(sessionId, {
              id: reservation.session.id,
              reservation_id: reservation.id,
              reservation_ids: [reservation.id],
              reservation_player_map: reservationPlayerMap, // Map reservation_id -> player_name
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
              reservation_status: reservation.reservation_status,
              player_id: reservation.player_id,
              player_ids: [reservation.player_id],
              player_name: playerName,
              player_names: [playerName]
            });
          }
        }
      });
    }

    // Add grouped group sessions to allSessions
    groupSessionsMap.forEach(session => {
      allSessions.push(session);
    });

    // Add individual sessions
    if (individualBookings) {
      individualBookings.forEach(booking => {
        const player = booking.player;
        const playerName = player ? `${player.first_name || ''} ${player.last_name || ''}`.trim() : null;
        
        allSessions.push({
          id: booking.id,
          reservation_id: booking.id,
          reservation_ids: [booking.id],
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
          color: booking.session_type?.color,
          player_id: booking.player_id,
          player_ids: [booking.player_id],
          player_name: playerName,
          player_names: [playerName]
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
  }
}

// Cancel reservation
async function cancelReservation(reservationId, isIndividual) {
  if (!supabaseReady || !supabase) return;

  if (!confirm('Are you sure you want to cancel this reservation?')) {
    return;
  }

  try {
    if (isIndividual) {
      // Cancel individual session booking
      // Don't use .select() as RLS might block it - just check for errors
      const { error } = await supabase
        .from('individual_session_bookings')
        .update({ 
          status: 'cancelled',
          cancelled_at: new Date().toISOString()
        })
        .eq('id', reservationId);

      if (error) {
        console.error('Error cancelling booking:', error);
        // Check if it's an RLS error
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          alert('You do not have permission to cancel this booking. Please contact support.');
        } else {
          alert(`Error: ${error.message}`);
        }
        return;
      }
      
      // If no error, assume update succeeded (RLS would have blocked it if not allowed)
      console.log('Booking cancellation update sent (no error)');
    } else {
      // Cancel group session reservation
      // Don't use .select() as RLS might block it - just check for errors
      const { error } = await supabase
        .from('session_reservations')
        .update({ reservation_status: 'cancelled' })
        .eq('id', reservationId);

      if (error) {
        console.error('Error cancelling reservation:', error);
        // Check if it's an RLS error
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          alert('You do not have permission to cancel this reservation. Please contact support.');
        } else {
          alert(`Error: ${error.message}`);
        }
        return;
      }
      
      // If no error, assume update succeeded (RLS would have blocked it if not allowed)
      console.log('Reservation cancellation update sent (no error)');

      // Update session reservation count
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

    // Remove the reservation card from the DOM immediately
    const btn = document.querySelector(`button[data-reservation-id="${reservationId}"]`);
    if (btn) {
      const reservationCard = btn.closest('.reserved-session-card');
      if (reservationCard) {
        reservationCard.remove();
        console.log('Reservation card removed from DOM:', reservationId);
      } else {
        console.warn('Button found but could not find parent .reserved-session-card');
      }
    } else {
      console.warn('Could not find cancel button with reservation-id:', reservationId);
      // Try to find by session ID as fallback
      const allCards = document.querySelectorAll('.reserved-session-card');
      for (const card of allCards) {
        const cardBtn = card.querySelector(`button[data-reservation-id="${reservationId}"]`);
        if (cardBtn) {
          card.remove();
          console.log('Reservation card removed using fallback method');
          break;
        }
      }
    }
    
    alert('Reservation cancelled successfully!');
    
    // Reload based on current tab to ensure UI is in sync
    const activeTab = document.querySelector('.schedule-tab.active')?.dataset.tab;
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

// Show modal to select which player(s) to cancel
async function showCancelSelectionModal(reservationIds, isIndividual, sessionCard, reservationPlayerMap = {}) {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'cancel-selection-modal-overlay';
  overlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
  `;

  const modal = document.createElement('div');
  modal.className = 'cancel-selection-modal';
  modal.style.cssText = `
    background: var(--surface);
    border-radius: 12px;
    padding: 24px;
    max-width: 500px;
    width: 90%;
    max-height: 80vh;
    overflow-y: auto;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  `;

  // Build player list with reservation IDs
  const playerList = reservationIds.map(reservationId => ({
    reservationId,
    playerName: reservationPlayerMap[reservationId] || 'Player'
  }));

  modal.innerHTML = `
    <div style="margin-bottom: 20px;">
      <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: var(--text);">Cancel Reservation</h3>
      <p style="margin: 0; font-size: 14px; color: var(--muted);">Select which player(s) to cancel:</p>
    </div>
    <div class="player-selection-list" style="margin-bottom: 20px;">
      ${playerList.map(({ reservationId, playerName }) => `
        <label style="display: flex; align-items: center; gap: 12px; padding: 12px; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 8px; cursor: pointer; transition: background 0.2s;">
          <input type="checkbox" value="${reservationId}" checked style="width: 18px; height: 18px; cursor: pointer;">
          <span style="flex: 1; font-size: 14px; color: var(--text);">${playerName}</span>
        </label>
      `).join('')}
    </div>
    <div style="display: flex; gap: 12px; justify-content: flex-end;">
      <button class="cancel-modal-btn" style="padding: 10px 20px; background: transparent; border: 1px solid var(--border); border-radius: 6px; color: var(--text); cursor: pointer; font-size: 14px;">
        Cancel
      </button>
      <button class="cancel-all-btn" style="padding: 10px 20px; background: var(--accent); border: none; border-radius: 6px; color: var(--text); cursor: pointer; font-size: 14px; font-weight: 500;">
        Cancel All
      </button>
      <button class="confirm-cancel-btn" style="padding: 10px 20px; background: var(--accent); border: none; border-radius: 6px; color: var(--text); cursor: pointer; font-size: 14px; font-weight: 500;">
        Cancel Selected
      </button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  // Handle cancel
  modal.querySelector('.cancel-modal-btn').addEventListener('click', () => {
    document.body.removeChild(overlay);
  });

  // Handle cancel all
  modal.querySelector('.cancel-all-btn').addEventListener('click', async () => {
    if (confirm(`Are you sure you want to cancel all ${reservationIds.length} reservation(s)?`)) {
      document.body.removeChild(overlay);
      await cancelMultipleReservations(reservationIds, isIndividual, sessionCard);
    }
  });

  // Handle confirm selected
  modal.querySelector('.confirm-cancel-btn').addEventListener('click', async () => {
    const selected = Array.from(modal.querySelectorAll('input[type="checkbox"]:checked'))
      .map(cb => cb.value);

    if (selected.length === 0) {
      alert('Please select at least one player to cancel.');
      return;
    }

    document.body.removeChild(overlay);
    await cancelSelectedReservations(selected, isIndividual, sessionCard, reservationIds);
  });

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
}

// Cancel selected reservations
async function cancelSelectedReservations(selectedReservationIds, isIndividual, sessionCard, allReservationIds) {
  if (!supabaseReady || !supabase) return;

  try {
    let cancelledCount = 0;
    let sessionId = null;

    for (const reservationId of selectedReservationIds) {
      if (isIndividual) {
        const { error } = await supabase
          .from('individual_session_bookings')
          .update({ 
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          })
          .eq('id', reservationId);

        if (!error) cancelledCount++;
      } else {
        // Get session_id before cancelling (if we don't have it yet)
        if (!sessionId) {
          const { data: reservation } = await supabase
            .from('session_reservations')
            .select('session_id')
            .eq('id', reservationId)
            .single();

          if (reservation) {
            sessionId = reservation.session_id;
          }
        }

        const { error } = await supabase
          .from('session_reservations')
          .update({ reservation_status: 'cancelled' })
          .eq('id', reservationId);

        if (!error) cancelledCount++;
      }
    }

    // Update session reservation count for group sessions
    if (!isIndividual && sessionId && cancelledCount > 0) {
      const { data: session } = await supabase
        .from('sessions')
        .select('current_reservations')
        .eq('id', sessionId)
        .single();

      if (session && session.current_reservations >= cancelledCount) {
        await supabase
          .from('sessions')
          .update({ current_reservations: session.current_reservations - cancelledCount })
          .eq('id', sessionId);
      }
    }

    // If all reservations were cancelled, remove the entire card
    // Otherwise, we'll need to reload to update the card
    if (selectedReservationIds.length === allReservationIds.length) {
      if (sessionCard) {
        sessionCard.remove();
        console.log('All reservations cancelled, card removed');
      }
    } else {
      // Some reservations remain - reload to update the card
      const activeTab = document.querySelector('.schedule-tab.active')?.dataset.tab;
      if (activeTab === 'reservations') {
        await loadReservations();
      } else {
        await loadReservedSessions();
      }
    }

    alert(`${cancelledCount} reservation(s) cancelled successfully!`);
  } catch (error) {
    console.error('Error cancelling selected reservations:', error);
    alert(`Error: ${error.message}`);
  }
}

// Cancel multiple reservations (for group sessions with multiple players)
async function cancelMultipleReservations(reservationIds, isIndividual, sessionCard = null) {
  if (!supabaseReady || !supabase) return;

  try {
    let cancelledCount = 0;
    let sessionId = null;

    for (const reservationId of reservationIds) {
      if (isIndividual) {
        const { error } = await supabase
          .from('individual_session_bookings')
          .update({ 
            status: 'cancelled',
            cancelled_at: new Date().toISOString()
          })
          .eq('id', reservationId);

        if (!error) cancelledCount++;
      } else {
        // Get session_id before cancelling
        const { data: reservation } = await supabase
          .from('session_reservations')
          .select('session_id')
          .eq('id', reservationId)
          .single();

        if (reservation) {
          sessionId = reservation.session_id;
        }

        const { error } = await supabase
          .from('session_reservations')
          .update({ reservation_status: 'cancelled' })
          .eq('id', reservationId);

        if (!error) cancelledCount++;
      }
    }

    // Update session reservation count for group sessions
    if (!isIndividual && sessionId && cancelledCount > 0) {
      const { data: session } = await supabase
        .from('sessions')
        .select('current_reservations')
        .eq('id', sessionId)
        .single();

      if (session && session.current_reservations >= cancelledCount) {
        await supabase
          .from('sessions')
          .update({ current_reservations: session.current_reservations - cancelledCount })
          .eq('id', sessionId);
      }
    }

    if (cancelledCount > 0) {
      alert(`${cancelledCount} reservation(s) cancelled successfully!`);
      // Reload based on current tab
      const activeTab = document.querySelector('.schedule-tab.active')?.dataset.tab;
      if (activeTab === 'reservations') {
        await loadReservations();
      } else {
        await loadReservedSessions();
      }
    } else {
      alert('No reservations were cancelled. Please try again.');
    }
  } catch (error) {
    console.error('Error cancelling reservations:', error);
    alert(`Error: ${error.message}`);
  }
}

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
