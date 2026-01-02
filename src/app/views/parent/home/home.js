// Parent Home page scripts
import { initSupabase } from '../../../../auth/config/supabase.js';
import { getAccountContext } from '../../../utils/account-context.js';

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
    await loadReservedSessions();
    
    // Listen for account switcher changes to reload data
    window.addEventListener('storage', (e) => {
      if (e.key === 'hg-user-role' || e.key === 'selectedPlayerId') {
        // Reload linked players and sessions when role changes
        loadLinkedPlayers().then(() => {
          loadReservedSessions();
          loadReservations();
        });
      }
    });
    
    // Also listen for custom event from account switcher
    window.addEventListener('accountSwitched', async (e) => {
      console.log('Account switched event received:', e.detail);
      await loadLinkedPlayers();
      // Reload based on current tab
      const activeTab = document.querySelector('.schedule-tab.active')?.dataset.tab;
      console.log('Active tab after account switch:', activeTab);
      if (activeTab === 'reservations') {
        console.log('Reloading reservations after account switch');
        await loadReservations();
      } else {
        console.log('Reloading sessions after account switch');
        await loadReservedSessions();
      }
    });
    
    // Setup real-time subscriptions for session updates
    setupRealtimeSubscriptions();
    
    // Also listen for localStorage changes (when selectedPlayerId changes)
    window.addEventListener('storage', async (e) => {
      if (e.key === 'selectedPlayerId' || e.key === 'hg-user-role') {
        console.log('Storage change detected:', e.key, e.newValue);
        await loadLinkedPlayers();
        const activeTab = document.querySelector('.schedule-tab.active')?.dataset.tab;
        if (activeTab === 'reservations') {
          await loadReservations();
        } else {
          await loadReservedSessions();
        }
      }
    });
  } else {
    console.error('Failed to initialize Supabase');
  }
}

// Get the actual parent ID (handles account switcher)
async function getActualParentId() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) {
    console.warn('getActualParentId: No session');
    return null;
  }
  
  const currentRole = localStorage.getItem('hg-user-role');
  console.log(`getActualParentId: currentRole=${currentRole}, session.user.id=${session.user.id}`);
  
  // Always check the profile role first to determine if user is actually a player or parent
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', session.user.id)
    .single();
  
  if (!profile) {
    console.warn('getActualParentId: No profile found');
    return session.user.id; // Fallback
  }
  
  console.log(`getActualParentId: profile.role=${profile.role}`);
  
  // If we're viewing as parent (role in localStorage is 'parent')
  // AND the logged-in user is actually a player, find their parent
  if (currentRole === 'parent' && profile.role === 'player') {
    console.log('getActualParentId: Player viewing as parent, finding parent ID...');
    const { data: relationship } = await supabase
      .from('parent_player_relationships')
      .select('parent_id')
      .eq('player_id', session.user.id)
      .single();
    
    if (relationship && relationship.parent_id) {
      console.log(`getActualParentId: Found parent ID: ${relationship.parent_id}`);
      return relationship.parent_id;
    } else {
      console.warn('getActualParentId: No parent relationship found for player');
    }
  }
  
  // If logged in as parent, use their ID
  if (profile.role === 'parent') {
    console.log(`getActualParentId: Logged in as parent, using ID: ${session.user.id}`);
    return session.user.id;
  }
  
  // If we're on the parent home page but logged in as a player,
  // we MUST be viewing as parent (account switcher), so find the parent
  // This is a safety check - if we're on parent pages, we should always have a parent ID
  if (profile.role === 'player' && currentRole === 'parent') {
    console.log('getActualParentId: Player on parent page, must be viewing as parent, finding parent ID...');
    const { data: relationship } = await supabase
      .from('parent_player_relationships')
      .select('parent_id')
      .eq('player_id', session.user.id)
      .single();
    
    if (relationship && relationship.parent_id) {
      console.log(`getActualParentId: Found parent ID: ${relationship.parent_id}`);
      return relationship.parent_id;
    }
  }
  
  // Last resort: if we're a player but no role is set, still try to find parent
  // (this handles cases where role hasn't been set yet)
  if (profile.role === 'player') {
    console.log('getActualParentId: Player detected, attempting to find parent...');
    const { data: relationship } = await supabase
      .from('parent_player_relationships')
      .select('parent_id')
      .eq('player_id', session.user.id)
      .single();
    
    if (relationship && relationship.parent_id) {
      console.log(`getActualParentId: Found parent ID (fallback): ${relationship.parent_id}`);
      return relationship.parent_id;
    }
  }
  
  // Final fallback: use the logged-in user's ID
  console.log(`getActualParentId: Final fallback to session.user.id: ${session.user.id}`);
  return session.user.id;
}

// Load linked players
async function loadLinkedPlayers() {
  if (!supabaseReady || !supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) return;

    // Get the actual parent ID (handles account switcher)
    const actualParentId = await getActualParentId();
    if (!actualParentId) {
      console.warn('Could not determine parent ID');
      return;
    }

    console.log(`Loading linked players for parent ID: ${actualParentId}`);
    
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
      .eq('parent_id', actualParentId);

    if (error) {
      console.error('Error loading linked players:', error);
      console.error('Error details:', { code: error.code, message: error.message });
      return;
    }

    console.log(`Found ${relationships?.length || 0} relationships:`, relationships);

    linkedPlayers = (relationships || []).map(rel => ({
      id: rel.player_id,
      name: rel.player ? `${rel.player.first_name || ''} ${rel.player.last_name || ''}`.trim() : 'Player',
      parentId: actualParentId, // Store parent ID for comparison
      ...rel.player
    }));

    console.log(`Loaded ${linkedPlayers.length} linked players for parent ${actualParentId}:`, linkedPlayers);

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

    setOpen(false); // Start closed when navigating to home

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

    // Get the actual parent ID (handles account switcher)
    const parentId = await getActualParentId();
    if (!parentId) {
      console.warn('Could not determine parent ID');
      return;
    }
    
    // Ensure linkedPlayers is loaded for this parent ID
    // Check if linkedPlayers is empty or if it's for a different parent
    const needsReload = linkedPlayers.length === 0 || 
                      (linkedPlayers.length > 0 && (!linkedPlayers[0].parentId || linkedPlayers[0].parentId !== parentId));
    
    if (needsReload) {
      console.log('Linked players array needs reloading for parent:', parentId);
      await loadLinkedPlayers();
    }

    const container = document.getElementById('sessionsListContainer');
    if (!container) return;

    container.innerHTML = '<div class="loading-state">Loading sessions...</div>';

    // Get account context to determine correct player IDs
    const context = await getAccountContext();
    if (!context) {
      console.warn('Could not get account context');
      return;
    }
    
    // Get all linked player IDs from context (handles account switcher correctly)
    const playerIds = context.getPlayerIdsToQuery();
    
    console.log(`Loading sessions for ${playerIds.length} players (parent: ${parentId}):`, playerIds);
    
    if (playerIds.length === 0) {
      container.innerHTML = '<div class="empty-state">No linked players found</div>';
      return;
    }

    // Load group session reservations for all linked players
    // Filter out cancelled reservations
    console.log(`Querying group reservations for playerIds:`, playerIds);
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
      const isIndividual = btn.dataset.isIndividual === 'true' || btn.dataset.isIndividual === true;
      
      console.log('Cancel button clicked:', {
        reservationId,
        isIndividual,
        isIndividualRaw: btn.dataset.isIndividual,
        buttonElement: btn
      });
      
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
                // Error parsing reservation-player map
              }
            }
            
            // Show modal to select which player(s) to cancel
            await showCancelSelectionModal(reservationIds, isIndividual, sessionCard, reservationPlayerMap);
            return;
          }
        } catch (err) {
          // Invalid JSON - treat as single reservation
          // Error parsing reservation IDs, treating as single
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

    // Get the actual parent ID (handles account switcher)
    const parentId = await getActualParentId();
    if (!parentId) {
      console.warn('Could not determine parent ID');
      return;
    }
    
    const container = document.getElementById('reservationsListContainer');
    if (!container) return;

    // Hide calendar for reservations tab
    const calendar = document.getElementById('parentHomeCalendar');
    if (calendar) {
      calendar.style.display = 'none';
    }

    container.innerHTML = '<div class="loading-state">Loading reservations...</div>';

    // Ensure linkedPlayers is loaded for this parent ID
    // Check if linkedPlayers is empty or if it's for a different parent
    const needsReload = linkedPlayers.length === 0 || 
                      (linkedPlayers.length > 0 && linkedPlayers[0].parentId !== parentId);
    
    if (needsReload) {
      console.log('Linked players array needs reloading for parent:', parentId);
      await loadLinkedPlayers();
    }

    // Get account context to determine correct player IDs
    const context = await getAccountContext();
    if (!context) {
      console.warn('Could not get account context');
      return;
    }
    
    // Get all linked player IDs from context (handles account switcher correctly)
    const playerIds = context.getPlayerIdsToQuery();
    
    console.log(`loadReservations: playerIds=${playerIds.join(', ')}, viewingAsParent=${context.viewingAsParent}, viewingAsPlayer=${context.viewingAsPlayer}`);
    console.log(`Loading reservations for ${playerIds.length} players:`, playerIds);
    
    if (playerIds.length === 0) {
      container.innerHTML = '<div class="empty-state">No linked players found</div>';
      return;
    }

    // Get today's date for filtering future sessions
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];

    // Load group session reservations for all linked players
    // Filter out cancelled reservations
    console.log(`Querying group reservations for playerIds:`, playerIds);
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

    console.log(`Loaded ${groupReservations?.length || 0} group reservations, ${futureGroupReservations.length} are future`);
    const groupReservationsByPlayer = futureGroupReservations.map(r => ({
      player_id: r.player_id,
      player_name: r.player ? `${r.player.first_name} ${r.player.last_name}` : 'Unknown',
      session_type: r.session?.session_type,
      session_date: r.session?.session_date
    }));
    console.log('Group reservations by player:', groupReservationsByPlayer);
    const uniquePlayerIds = [...new Set(groupReservationsByPlayer.map(r => r.player_id))];
    console.log(`Group reservations found for ${uniquePlayerIds.length} unique players:`, uniquePlayerIds);
    console.log('Expected player IDs:', playerIds);
    
    // Use filtered reservations (define early so we can use it in the check below)
    const filteredGroupReservations = futureGroupReservations;
    
    // Only log missing reservations if we actually found some reservations
    // (meaning the query worked, but some players don't have reservations)
    // If we found 0 reservations total, it's likely all players just don't have future reservations
    const missingPlayerIds = playerIds.filter(id => !uniquePlayerIds.includes(id));
    if (missingPlayerIds.length > 0 && filteredGroupReservations.length > 0) {
      console.log(`Note: ${missingPlayerIds.length} player(s) don't have group reservations:`, missingPlayerIds);
      // Get player names for missing IDs
      const missingPlayerNames = linkedPlayers
        .filter(p => missingPlayerIds.includes(p.id))
        .map(p => p.name || `${p.first_name} ${p.last_name}`.trim());
      console.log(`Players without reservations: ${missingPlayerNames.join(', ')}`);
      
      // Check if these players have any reservations at all (including past) - this will help determine if it's RLS or no data
      const { data: allReservations, error: checkError } = await supabase
        .from('session_reservations')
        .select('player_id, reservation_status, session:sessions(session_date)')
        .in('player_id', missingPlayerIds)
        .in('reservation_status', ['reserved', 'checked-in']);
      
      if (checkError) {
        console.error('Error checking for missing players reservations:', checkError);
      } else {
        console.log(`Found ${allReservations?.length || 0} total reservations (including past) for missing players:`, allReservations);
        if (allReservations && allReservations.length > 0) {
          const futureReservations = allReservations.filter(r => {
            if (!r.session || !r.session.session_date) return false;
            const sessionDate = new Date(r.session.session_date);
            sessionDate.setHours(0, 0, 0, 0);
            return sessionDate >= today;
          });
          console.log(`Of those, ${futureReservations.length} are future reservations`);
        }
      }
    }

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

    console.log(`Loaded ${individualBookings?.length || 0} individual bookings (future only) for playerIds:`, playerIds);
    
    // Filter individual bookings to only show bookings for the selected player(s)
    // This is a safety check in case RLS returns more than expected (siblings' bookings)
    const filteredIndividualBookings = individualBookings?.filter(b => {
      const matches = playerIds.includes(b.player_id);
      if (!matches && individualBookings) {
        console.log(`Filtering out booking for player ${b.player_id} (not in selected playerIds: ${playerIds.join(', ')})`);
      }
      return matches;
    }) || [];
    console.log(`Filtered individual bookings to ${filteredIndividualBookings.length} bookings (from ${individualBookings?.length || 0} total) for ${playerIds.length} player(s)`);
    
    const individualBookingsByPlayer = filteredIndividualBookings.map(b => ({
      player_id: b.player_id,
      player_name: b.player ? `${b.player.first_name} ${b.player.last_name}` : 'Unknown',
      session_type: b.session_type?.display_name || b.session_type?.name,
      booking_date: b.booking_date
    }));
    console.log('Individual bookings by player (after filtering):', individualBookingsByPlayer);
    const uniqueIndividualPlayerIds = [...new Set(individualBookingsByPlayer.map(b => b.player_id))];
    console.log(`Individual bookings found for ${uniqueIndividualPlayerIds.length} unique players:`, uniqueIndividualPlayerIds);
    // Only warn about missing bookings if we actually loaded some bookings
    // (meaning the query worked, but some players don't have bookings)
    // If we loaded 0 bookings total, it's likely all players just don't have bookings
    const missingIndividualPlayerIds = playerIds.filter(id => !uniqueIndividualPlayerIds.includes(id));
    if (missingIndividualPlayerIds.length > 0 && filteredIndividualBookings.length > 0) {
      console.log(`Note: ${missingIndividualPlayerIds.length} player(s) don't have individual bookings:`, missingIndividualPlayerIds);
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

    // Add individual sessions (use filtered bookings to ensure only selected player's bookings are shown)
    if (filteredIndividualBookings && filteredIndividualBookings.length > 0) {
      filteredIndividualBookings.forEach(booking => {
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
    // Use secure database function to cancel reservation
    // This function verifies the parent-player relationship and handles RLS
    const { data: success, error } = await supabase.rpc('cancel_reservation_for_player', {
      p_reservation_id: reservationId,
      p_is_individual: isIndividual
    });

    if (error) {
      console.error('Error cancelling reservation:', error);
      alert(`Error: ${error.message || 'Failed to cancel reservation'}`);
      return;
    }

    console.log('Cancellation RPC result:', success);
    
    if (!success) {
      console.warn('RPC function returned false - reservation may not have been cancelled');
      alert('Failed to cancel reservation. The reservation may not exist or you may not have permission.');
      return;
    }

    // Reservation cancelled successfully

    // Update session reservation count for group sessions
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

    // Remove the reservation card from the DOM immediately
    let cardRemoved = false;
    console.log(`Attempting to remove card for reservation ${reservationId} (individual: ${isIndividual})`);
    
    const btn = document.querySelector(`button[data-reservation-id="${reservationId}"]`);
    if (btn) {
      console.log('Found cancel button:', btn);
      const reservationCard = btn.closest('.reserved-session-card');
      if (reservationCard) {
        console.log('Found reservation card, removing:', reservationCard);
        reservationCard.remove();
        cardRemoved = true;
        console.log('Reservation card removed from DOM');
      } else {
        console.warn('Button found but could not find parent .reserved-session-card');
        // Try to find parent with different selector
        let parent = btn.parentElement;
        while (parent && !parent.classList.contains('reserved-session-card')) {
          parent = parent.parentElement;
        }
        if (parent) {
          console.log('Found card via parent traversal, removing:', parent);
          parent.remove();
          cardRemoved = true;
        }
      }
    } else {
      // Could not find cancel button - try to find by session ID as fallback
      console.warn('Could not find cancel button, trying fallback method');
      const allCards = document.querySelectorAll('.reserved-session-card');
      console.log(`Found ${allCards.length} reservation cards to search`);
      for (const card of allCards) {
        const cardBtn = card.querySelector(`button[data-reservation-id="${reservationId}"]`);
        if (cardBtn) {
          console.log('Found card via fallback, removing:', card);
          card.remove();
          cardRemoved = true;
          console.log('Reservation card removed using fallback');
          break;
        }
      }
    }
    
    if (!cardRemoved) {
      console.warn('Could not remove reservation card from DOM, will reload');
    }
    
    alert('Reservation cancelled successfully!');
    
    // Always reload to ensure UI is in sync with database
    // This is especially important for individual sessions
    const activeTab = document.querySelector('.schedule-tab.active')?.dataset.tab;
    console.log(`Reloading after cancellation, active tab: ${activeTab}`);
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
      // Use secure database function to cancel each reservation
      const { data: success, error } = await supabase.rpc('cancel_reservation_for_player', {
        p_reservation_id: reservationId,
        p_is_individual: isIndividual
      });

      if (!error && success) {
        cancelledCount++;
        
        // Get session_id for group sessions (if we don't have it yet)
        if (!isIndividual && !sessionId) {
          const { data: reservation } = await supabase
            .from('session_reservations')
            .select('session_id')
            .eq('id', reservationId)
            .single();

          if (reservation) {
            sessionId = reservation.session_id;
          }
        }
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

    // Always reload to ensure UI is in sync with database
    // This is more reliable than trying to manually remove cards
    const activeTab = document.querySelector('.schedule-tab.active')?.dataset.tab;
    if (activeTab === 'reservations') {
      await loadReservations();
    } else {
      await loadReservedSessions();
    }

    if (cancelledCount > 0) {
      alert(`${cancelledCount} reservation(s) cancelled successfully!`);
    } else {
      alert('No reservations were cancelled. Please try again.');
    }
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
      // Use secure database function to cancel each reservation
      const { data: success, error } = await supabase.rpc('cancel_reservation_for_player', {
        p_reservation_id: reservationId,
        p_is_individual: isIndividual
      });

      if (!error && success) {
        cancelledCount++;
        
        // Get session_id for group sessions (if we don't have it yet)
        if (!isIndividual && !sessionId) {
          const { data: reservation } = await supabase
            .from('session_reservations')
            .select('session_id')
            .eq('id', reservationId)
            .single();

          if (reservation) {
            sessionId = reservation.session_id;
          }
        }
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

// Setup real-time subscriptions to listen for reservation changes
async function setupRealtimeSubscriptions() {
  if (!supabaseReady || !supabase) return;

  // Get account context to determine which players to listen for
  const context = await getAccountContext();
  if (!context) {
    console.warn('Could not get account context for real-time subscriptions');
    return;
  }

  const playerIds = context.getPlayerIdsToQuery();
  if (playerIds.length === 0) {
    console.warn('No player IDs to subscribe to');
    return;
  }

  // Subscribe to group session reservations changes
  const groupReservationsChannel = supabase
    .channel('parent-group-reservations-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'session_reservations'
      },
      async (payload) => {
        // Check if this reservation is for one of our linked players
        if (payload.new && playerIds.includes(payload.new.player_id)) {
          console.log('New group reservation created for linked player, reloading sessions:', payload);
          // Reload based on current tab
          const activeTab = document.querySelector('.schedule-tab.active')?.dataset.tab;
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
        // Check if this reservation is for one of our linked players
        if (payload.new && playerIds.includes(payload.new.player_id)) {
          console.log('Group reservation cancelled for linked player, reloading sessions:', payload);
          // Reload based on current tab
          const activeTab = document.querySelector('.schedule-tab.active')?.dataset.tab;
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
    .channel('parent-individual-bookings-changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'individual_session_bookings'
      },
      async (payload) => {
        // Check if this booking is for one of our linked players
        if (payload.new && playerIds.includes(payload.new.player_id)) {
          console.log('New individual booking created for linked player, reloading sessions:', payload);
          // Reload based on current tab
          const activeTab = document.querySelector('.schedule-tab.active')?.dataset.tab;
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
        // Check if this booking is for one of our linked players
        if (payload.new && playerIds.includes(payload.new.player_id)) {
          console.log('Individual booking cancelled for linked player, reloading sessions:', payload);
          // Reload based on current tab
          const activeTab = document.querySelector('.schedule-tab.active')?.dataset.tab;
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

// Initialize on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
