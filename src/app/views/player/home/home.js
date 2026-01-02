// Player Home page scripts
import { initSupabase } from '../../../../auth/config/supabase.js';
import { getAccountContext } from '../../../utils/account-context.js';

let supabase;
let supabaseReady = false;
let currentWeekStart = new Date();
let selectedDate = new Date();

// Initialize Supabase
async function init() {
  supabase = await initSupabase();
  if (supabase) {
    supabaseReady = true;
    setupEventListeners();
    renderCalendar();
    setupRealtimeSubscriptions();
    loadReservedSessions();
  } else {
    console.error('Failed to initialize Supabase');
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
  document.getElementById('playerHomeCalendarPrev')?.addEventListener('click', () => {
    currentWeekStart.setDate(currentWeekStart.getDate() - 7);
    renderCalendar();
  });

  document.getElementById('playerHomeCalendarNext')?.addEventListener('click', () => {
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
  const calendar = document.getElementById('playerHomeCalendar');
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

    container.innerHTML = '<div class="loading-state">Loading sessions...</div>';

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
      await cancelReservation(reservationId, isIndividual);
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

    container.innerHTML = '<div class="loading-state">Loading reservations...</div>';

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
          console.log('New group reservation created, reloading sessions:', payload);
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
        // Only reload if this reservation is for the current player
        if (payload.new && payload.new.player_id === playerId) {
          console.log('Group reservation cancelled, reloading sessions:', payload);
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
          console.log('New individual booking created, reloading sessions:', payload);
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
        // Only reload if this booking is for the current player
        if (payload.new && payload.new.player_id === playerId) {
          console.log('Individual booking cancelled, reloading sessions:', payload);
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
