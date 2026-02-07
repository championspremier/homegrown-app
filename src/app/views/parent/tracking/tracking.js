// Parent Tracking page scripts
import { initSupabase } from '../../../../auth/config/supabase.js';
import { getCurrentQuarter } from '../../../utils/points.js';
import { getPlayerLeaderboardStats } from '../../../utils/leaderboard.js';
import { showLoader, hideLoader } from '../../../utils/loader.js';
import { getBackbonePeriodKeyForDate } from '../../player/home/curriculum-focus.js';

let supabase;
let supabaseReady = false;
let linkedPlayers = [];

/** Spider: 1 per completed session (count). Tactical: coach check-ins from transactions; reels from player_curriculum_progress. */
const TACTICAL_SESSION_TYPES_FROM_TRANSACTIONS = ['Tec Tac', 'Champions Player Progress (CPP)', 'HG_OBJECTIVE'];
const PHYSICAL_SESSION_AXIS = {
  'Speed Training': { speed: 1 },
  'HG_SPEED': { speed: 1 },
  'Strength & Conditioning': { strength: 1, conditioning: 1 }
};
const TECHNICAL_SESSION_DEFAULT_AXIS = 'ball-mastery';
const MENTAL_SESSION_AXIS = {
  'Psychologist': { psychologist: 1 },
  'HG_MENTAL': { solo: 1 }
};

/** Spider chart: axes per pillar. coachOnly = coach rating only (greyed until rated). */
const SPIDER_PILLAR_CONFIG = {
  tactical: {
    axes: [
      { key: 'build-out', label: 'Build-out', coachOnly: false },
      { key: 'middle-third', label: 'Middle Third', coachOnly: false },
      { key: 'final-third', label: 'Final Third', coachOnly: false },
      { key: 'wide-play', label: 'Wide Play', coachOnly: false }
    ]
  },
  technical: {
    axes: [
      { key: 'ball-mastery', label: 'Ball Mastery', coachOnly: false },
      { key: 'turning', label: 'Turning', coachOnly: false },
      { key: 'escape-moves', label: 'Escape Moves', coachOnly: false },
      { key: 'first-touch', label: 'First Touch', coachOnly: false },
      { key: 'passing', label: 'Passing', coachOnly: false }
    ]
  },
  physical: {
    axes: [
      { key: 'conditioning', label: 'Conditioning', coachOnly: false },
      { key: 'speed', label: 'Sprint Form', coachOnly: false },
      { key: 'strength', label: 'Strength', coachOnly: false },
      { key: 'coordination', label: 'Coordination', coachOnly: false }
    ],
    skillToAxis: {
      conditioning: 'conditioning',
      speed: 'speed',
      'lower-body': 'strength',
      'upper-body': 'strength',
      core: 'strength',
      plyometrics: 'coordination',
      'whole-body': 'coordination'
    }
  },
  mental: {
    axes: [
      { key: 'solo', label: 'Solo', coachOnly: false },
      { key: 'psychologist', label: 'Psychologist', coachOnly: false },
      { key: 'maturity', label: 'Maturity', coachOnly: true },
      { key: 'socially', label: 'Socially', coachOnly: true },
      { key: 'work-ethic', label: 'Work Ethic', coachOnly: true }
    ]
  }
};

initSupabase().then(client => {
  if (client) {
    supabase = client;
    supabaseReady = true;
    init();
  }
});

// Get the actual parent ID (handles account switcher)
async function getActualParentId() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) return null;
  
  const currentRole = localStorage.getItem('hg-user-role');
  
  // If we're in parent view but logged in as a player, find the parent
  if (currentRole === 'parent') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    // If current user is actually a player, find their parent
    if (profile && profile.role === 'player') {
      const { data: relationship } = await supabase
        .from('parent_player_relationships')
        .select('parent_id')
        .eq('player_id', session.user.id)
        .single();
      
      if (relationship) {
        return relationship.parent_id;
      }
    }
  }
  
  // Otherwise, use the logged-in user's ID
  return session.user.id;
}

async function init() {
  if (!supabaseReady) return;

  const trackingContainer = document.querySelector('.tracking-container');
  if (trackingContainer) showLoader(trackingContainer, 'Loading...');

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      console.error('Not logged in');
      return;
    }

    // Check if viewing as a player (parent switched to player account)
    const currentRole = localStorage.getItem('hg-user-role');
    const selectedPlayerId = localStorage.getItem('selectedPlayerId');
    
    if (currentRole === 'player' && selectedPlayerId) {
      // Parent viewing as player - load that player's data directly
      console.log(`Loading tracking data for selected player: ${selectedPlayerId}`);
      if (trackingContainer) hideLoader(trackingContainer);
      await loadPlayerData(selectedPlayerId);
      // Hide player selector when viewing as specific player
      const selectorSection = document.getElementById('playerSelectorSection');
      if (selectorSection) {
        selectorSection.style.display = 'none';
      }
      return;
    }

    // Get the actual parent ID (handles account switcher)
    const parentId = await getActualParentId();
    if (!parentId) {
      console.error('Could not determine parent ID');
      return;
    }

    await loadLinkedPlayers(parentId);
    setupPlayerSelector();
    
    // Listen for account switches
    setupAccountSwitchListener();
  } catch (error) {
    console.error('Error initializing tracking:', error);
  } finally {
    if (trackingContainer) hideLoader(trackingContainer);
  }
}

// Listen for account switches and reload data
function setupAccountSwitchListener() {
  window.addEventListener('accountSwitched', async (event) => {
    const { role, accountId } = event.detail || {};
    const selectedPlayerId = localStorage.getItem('selectedPlayerId');
    
    if (role === 'player' && selectedPlayerId) {
      // Parent switched to player - load that player's data
      console.log(`Account switched to player: ${selectedPlayerId}`);
      await loadPlayerData(selectedPlayerId);
      // Hide player selector when viewing as specific player
      const selectorSection = document.getElementById('playerSelectorSection');
      if (selectorSection) {
        selectorSection.style.display = 'none';
      }
    } else if (role === 'parent') {
      // Switched back to parent - reload linked players
      const parentId = await getActualParentId();
      if (parentId) {
        await loadLinkedPlayers(parentId);
        setupPlayerSelector();
      }
    }
  });
  
  // Also listen for storage changes (in case account switch happens in another tab/window)
  window.addEventListener('storage', async (event) => {
    if (event.key === 'selectedPlayerId' || event.key === 'hg-user-role') {
      const currentRole = localStorage.getItem('hg-user-role');
      const selectedPlayerId = localStorage.getItem('selectedPlayerId');
      
      if (currentRole === 'player' && selectedPlayerId) {
        await loadPlayerData(selectedPlayerId);
        const selectorSection = document.getElementById('playerSelectorSection');
        if (selectorSection) {
          selectorSection.style.display = 'none';
        }
      } else if (currentRole === 'parent') {
        const parentId = await getActualParentId();
        if (parentId) {
          await loadLinkedPlayers(parentId);
          setupPlayerSelector();
        }
      }
    }
  });
}

async function loadLinkedPlayers(parentId) {
  try {
    // Get linked players from parent_player_relationships
    const { data: relationships, error } = await supabase
      .from('parent_player_relationships')
      .select('player_id')
      .eq('parent_id', parentId);

    if (error) {
      console.error('Error loading linked players:', error);
      return;
    }

    if (!relationships || relationships.length === 0) {
      document.getElementById('emptyState').textContent = 'No linked player accounts found.';
      return;
    }

    const playerIds = relationships.map(r => r.player_id);
    const { data: players, error: playersError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name')
      .in('id', playerIds)
      .eq('role', 'player');

    if (playersError) {
      console.error('Error loading player profiles:', playersError);
      return;
    }

    linkedPlayers = players || [];

    if (linkedPlayers.length === 0) {
      document.getElementById('emptyState').textContent = 'No linked player accounts found.';
      return;
    }

    // Show player selector if multiple players
    if (linkedPlayers.length > 1) {
      const playerSelectorSection = document.getElementById('playerSelectorSection');
      if (playerSelectorSection) {
        playerSelectorSection.style.display = 'block';
      }
      const select = document.getElementById('playerSelect');
      if (select) {
        select.innerHTML = '<option value="">Select a player...</option>' +
        linkedPlayers.map(p => {
          const name = `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Player';
          return `<option value="${p.id}">${name}</option>`;
        }).join('');
      }
    } else if (linkedPlayers.length === 1) {
      // Auto-select single player
      loadPlayerData(linkedPlayers[0].id);
    }
  } catch (error) {
    console.error('Error loading linked players:', error);
  }
}

function setupPlayerSelector() {
  const select = document.getElementById('playerSelect');
  if (select) {
    select.addEventListener('change', (e) => {
      const playerId = e.target.value;
      if (playerId) {
        loadPlayerData(playerId);
      } else {
        hidePlayerData();
      }
    });
  }
}

async function loadPlayerData(playerId) {
  const trackingContainer = document.querySelector('.tracking-container');
  if (trackingContainer) showLoader(trackingContainer, 'Loading tracking...');

  try {
    const trackingTabsWrapper = document.getElementById('trackingTabsWrapper');
    const emptyState = document.getElementById('emptyState');
    if (trackingTabsWrapper) trackingTabsWrapper.style.display = 'block';
    if (emptyState) emptyState.style.display = 'none';

    await loadPointsSummary(playerId);
    await loadPointsHistory(playerId, 'current');
    setupQuarterSelector(playerId);
    setupTrackingTabs();
    setupPillarTabs();
    await loadAndRenderSpider(playerId);
  } finally {
    if (trackingContainer) hideLoader(trackingContainer);
  }
}

async function loadAndRenderSpider(playerId) {
  const wrapper = document.getElementById('trackingSpiderWrapper');
  if (wrapper) showLoader(wrapper);
  try {
    const pillar = getActivePillar();
    const data = await loadSpiderData(playerId, pillar);
    renderSpiderChart(data);
  } finally {
    if (wrapper) hideLoader(wrapper);
  }
}

/**
 * Load spider chart data for the given pillar. Uses current quarter.
 * Tactical: points + curriculum progress by period. Technical/Physical: curriculum progress by skill. Mental: coach-only (greyed).
 */
async function loadSpiderData(playerId, pillar) {
  const config = SPIDER_PILLAR_CONFIG[pillar];
  if (!config || !config.axes) {
    return { axes: [], scores: {}, coachOnly: {} };
  }
  const axes = config.axes;
  const coachOnly = {};
  axes.forEach((a) => { coachOnly[a.key] = !!a.coachOnly; });
  const raw = {};
  axes.forEach((a) => { raw[a.key] = 0; });

  try {
    const { year, quarter } = getCurrentQuarter();
    const quarterStart = new Date(year, (quarter - 1) * 3, 1);
    const quarterEnd = new Date(year, quarter * 3, 0, 23, 59, 59);
    const quarterStartStr = quarterStart.toISOString().split('T')[0];
    const quarterEndIso = quarterEnd.toISOString();

    const { data: transactions } = await supabase
      .from('points_transactions')
      .select('points, checked_in_at, session_type, session_id')
      .eq('player_id', playerId)
      .eq('quarter_year', year)
      .eq('quarter_number', quarter)
      .eq('status', 'active');

    const addOne = (key) => { if (raw[key] !== undefined) raw[key] += 1; };

    if (pillar === 'tactical') {
      if (transactions) {
        transactions.forEach((t) => {
          if (!TACTICAL_SESSION_TYPES_FROM_TRANSACTIONS.includes(t.session_type)) return;
          const periodKey = getBackbonePeriodKeyForDate(new Date(t.checked_in_at));
          if (periodKey) addOne(periodKey);
        });
      }
      const { data: progressRows } = await supabase
        .from('player_curriculum_progress')
        .select('period, completed_at')
        .eq('player_id', playerId)
        .eq('category', 'tactical')
        .gte('completed_at', quarterStartStr)
        .lte('completed_at', quarterEndIso);
      if (progressRows) progressRows.forEach((r) => { if (raw[r.period] !== undefined) raw[r.period] += 1; });
    } else if (pillar === 'physical') {
      if (transactions) {
        transactions.forEach((t) => {
          const map = PHYSICAL_SESSION_AXIS[t.session_type];
          if (!map) return;
          Object.keys(map).forEach((axisKey) => addOne(axisKey));
        });
      }
      const { data: progressRows } = await supabase
        .from('player_curriculum_progress')
        .select('skill')
        .eq('player_id', playerId)
        .eq('category', 'physical')
        .gte('completed_at', quarterStartStr)
        .lte('completed_at', quarterEndIso);
      if (progressRows) {
        progressRows.forEach((r) => {
          const axisKey = config.skillToAxis && config.skillToAxis[r.skill];
          if (axisKey) addOne(axisKey);
        });
      }
    } else if (pillar === 'technical') {
      if (transactions) {
        const soloSessionIds = [...new Set(
          transactions
            .filter((t) => (t.session_type === 'Solo Session' || t.session_type === 'HG_TECHNICAL') && t.session_id)
            .map((t) => t.session_id)
        )];
        let sessionIdToSkill = {};
        if (soloSessionIds.length > 0) {
          const { data: soloSessions } = await supabase
            .from('solo_sessions')
            .select('id, skill')
            .in('id', soloSessionIds);
          if (soloSessions) {
            soloSessions.forEach((s) => {
              const key = (s.skill || '').toLowerCase().replace(/\s+/g, '-');
              sessionIdToSkill[s.id] = key || TECHNICAL_SESSION_DEFAULT_AXIS;
            });
          }
        }
        transactions.forEach((t) => {
          if (t.session_type === 'Solo Session') {
            const skillKey = t.session_id ? (sessionIdToSkill[t.session_id] || TECHNICAL_SESSION_DEFAULT_AXIS) : TECHNICAL_SESSION_DEFAULT_AXIS;
            if (raw[skillKey] !== undefined) raw[skillKey] += 1;
            else addOne(TECHNICAL_SESSION_DEFAULT_AXIS);
          } else if (t.session_type === 'HG_TECHNICAL') {
            const skillKey = t.session_id ? (sessionIdToSkill[t.session_id] || TECHNICAL_SESSION_DEFAULT_AXIS) : TECHNICAL_SESSION_DEFAULT_AXIS;
            if (raw[skillKey] !== undefined) raw[skillKey] += 1;
            else addOne(TECHNICAL_SESSION_DEFAULT_AXIS);
          }
        });
      }
      const { data: progressRows } = await supabase
        .from('player_curriculum_progress')
        .select('skill')
        .eq('player_id', playerId)
        .eq('category', 'technical')
        .gte('completed_at', quarterStartStr)
        .lte('completed_at', quarterEndIso);
      if (progressRows) {
        progressRows.forEach((r) => {
          const key = (r.skill || '').toLowerCase().replace(/\s+/g, '-');
          if (key && raw[key] !== undefined) raw[key] += 1;
        });
      }
    } else if (pillar === 'mental') {
      if (transactions) {
        transactions.forEach((t) => {
          const map = MENTAL_SESSION_AXIS[t.session_type];
          if (map) Object.keys(map).forEach((axisKey) => addOne(axisKey));
        });
        const mentalSoloIds = [...new Set(
          transactions
            .filter((t) => t.session_type === 'Solo Session' && t.session_id)
            .map((t) => t.session_id)
        )];
        if (mentalSoloIds.length > 0) {
          const { data: soloSessions } = await supabase
            .from('solo_sessions')
            .select('id, category')
            .in('id', mentalSoloIds)
            .eq('category', 'mental');
          if (soloSessions) soloSessions.forEach(() => addOne('solo'));
        }
      }
      const { data: progressRows } = await supabase
        .from('player_curriculum_progress')
        .select('id')
        .eq('player_id', playerId)
        .eq('category', 'mental')
        .gte('completed_at', quarterStartStr)
        .lte('completed_at', quarterEndIso);
      if (progressRows) progressRows.forEach(() => addOne('solo'));
    }

    // Spider: 1 completion = 1 on 0–10 scale, capped at 10 (no normalizing max to 10)
    const scores = {};
    axes.forEach(({ key }) => {
      scores[key] = coachOnly[key] ? null : Math.min(10, Math.round(raw[key] * 10) / 10);
    });
    return { axes, scores, coachOnly };
  } catch (err) {
    console.error('Error loading spider data:', err);
    const scores = {};
    axes.forEach(({ key }) => { scores[key] = coachOnly[key] ? null : 0; });
    return { axes, scores, coachOnly };
  }
}

/**
 * Render spider (radar) chart SVG. Supports variable N axes. Coach-only axes are greyed out.
 */
function renderSpiderChart({ axes, scores, coachOnly }) {
  const svg = document.getElementById('trackingSpiderSvg');
  const legend = document.getElementById('trackingSpiderLegend');
  if (!svg || !axes || !Array.isArray(axes) || axes.length < 2) return;

  const cx = 120;
  const cy = 120;
  const radius = 85;
  const levels = 5;
  const n = axes.length;

  let inner = '';
  for (let level = 1; level <= levels; level++) {
    const r = (radius * level) / levels;
    const points = [];
    for (let i = 0; i < n; i++) {
      const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
      points.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
    }
    inner += `<polygon class="spider-grid-line" points="${points.join(' ')}"/>`;
  }

  let axisLines = '';
  let labelEls = '';
  const labelRadius = radius + 18;
  for (let i = 0; i < n; i++) {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    const isCoach = axes[i]?.coachOnly === true;
    const lineClass = isCoach ? 'spider-axis-line spider-axis-line-coach-only' : 'spider-axis-line';
    axisLines += `<line class="${lineClass}" x1="${cx}" y1="${cy}" x2="${cx + radius * Math.cos(angle)}" y2="${cy + radius * Math.sin(angle)}"/>`;
    const lx = cx + labelRadius * Math.cos(angle);
    const ly = cy + labelRadius * Math.sin(angle);
    const labelClass = isCoach ? 'spider-label spider-label-coach-only' : 'spider-label';
    labelEls += `<text class="${labelClass}" x="${lx}" y="${ly}">${axes[i]?.label || ''}</text>`;
  }

  const polygonPoints = [];
  for (let i = 0; i < n; i++) {
    const key = axes[i]?.key;
    const score = (scores && scores[key]) != null ? scores[key] : 0;
    const r = (radius * Math.min(10, Math.max(0, score))) / 10;
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    polygonPoints.push(`${cx + r * Math.cos(angle)},${cy + r * Math.sin(angle)}`);
  }
  const polygon = `<polygon class="spider-polygon" points="${polygonPoints.join(' ')}"/>`;

  svg.innerHTML = inner + axisLines + polygon + labelEls;

  if (legend && scores) {
    const maxScore = 10;
    legend.innerHTML = axes.map((a) => {
      const isCoach = a.coachOnly === true;
      const val = scores[a.key];
      const display = isCoach && (val == null || val === 0) ? '—' : (val != null ? val.toFixed(1) : '0');
      const textSuffix = isCoach && (val == null || val === 0) ? '' : ' Sessions';
      const itemClass = isCoach ? 'spider-legend-item spider-legend-coach-only' : 'spider-legend-item';
      const barPct = (!isCoach && val != null) ? Math.min(100, (Number(val) / maxScore) * 100) : 0;
      return `<div class="${itemClass}">
        <span class="spider-legend-row"><span class="spider-legend-bullet"></span><span class="spider-legend-text">${a.label}: ${display}${textSuffix}</span></span>
        <div class="spider-legend-bar" role="presentation"><div class="spider-legend-bar-fill" style="width: ${barPct}%"></div></div>
      </div>`;
    }).join('');
  }
}

function hidePlayerData() {
  const trackingTabsWrapper = document.getElementById('trackingTabsWrapper');
  const emptyState = document.getElementById('emptyState');
  if (trackingTabsWrapper) trackingTabsWrapper.style.display = 'none';
  if (emptyState) emptyState.style.display = 'block';
}

function setupTrackingTabs() {
  const tabList = document.querySelector('.tracking-container .tab-list');
  if (tabList && tabList.dataset.tabsSetup === '1') return;
  if (tabList) tabList.dataset.tabsSetup = '1';

  const tabButtons = document.querySelectorAll('.tracking-container .tab-button');
  const tabPanels = document.querySelectorAll('.tracking-container .tab-panel');

  tabButtons.forEach((button) => {
    button.addEventListener('click', () => {
      const targetTab = button.dataset.tab;
      if (!targetTab) return;

      tabButtons.forEach((btn) => {
        btn.classList.remove('active');
        btn.setAttribute('aria-selected', 'false');
      });
      button.classList.add('active');
      button.setAttribute('aria-selected', 'true');

      tabPanels.forEach((panel) => {
        panel.classList.remove('active');
      });
      const targetPanel = document.getElementById(`${targetTab}-panel`);
      if (targetPanel) {
        targetPanel.classList.add('active');
      }
    });
  });
}

// Pillar tabs: Technical, Tactical, Physical, Mental (above spider) - overlapping style
function setupPillarTabs() {
  const wrapper = document.querySelector('.tracking-container .tracking-pillar-cards');
  if (!wrapper || wrapper.dataset.pillarSetup === '1') return;
  wrapper.dataset.pillarSetup = '1';

  const cards = document.querySelectorAll('.tracking-container .tracking-pillar-card');
  const setPillarState = (pillar) => {
    wrapper.classList.remove('pillar-technical-active', 'pillar-tactical-active', 'pillar-physical-active', 'pillar-mental-active');
    if (pillar) wrapper.classList.add(`pillar-${pillar}-active`);
  };
  setPillarState(getActivePillar());

  cards.forEach((card) => {
    card.addEventListener('click', async () => {
      const pillar = card.dataset.pillar;
      if (!pillar) return;
      cards.forEach((c) => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      card.classList.add('active');
      card.setAttribute('aria-selected', 'true');
      setPillarState(pillar);
      const playerId = document.getElementById('playerSelect')?.value;
      if (playerId) await loadAndRenderSpider(playerId);
      window.dispatchEvent(new CustomEvent('trackingPillarChanged', { detail: { pillar } }));
    });
  });
}

function getActivePillar() {
  const active = document.querySelector('.tracking-container .tracking-pillar-card.active');
  return (active && active.dataset.pillar) || 'technical';
}

async function loadPointsSummary(playerId) {
  try {
    const { year, quarter } = getCurrentQuarter();
    
    // Get total points
    const { data: pointsData, error: pointsError } = await supabase.rpc('get_player_quarterly_points', {
      p_player_id: playerId,
      p_quarter_year: year,
      p_quarter_number: quarter
    });

    if (pointsError) {
      console.error('Error loading points:', pointsError);
      return;
    }

    const totalPoints = parseFloat(pointsData || 0);
    const totalPointsEl = document.getElementById('totalPoints');
    if (totalPointsEl) totalPointsEl.textContent = totalPoints.toFixed(1);

    // Update quarter label
    const quarterLabel = `Q${quarter} ${year}`;
    const quarterLabelEl = document.getElementById('quarterLabel');
    if (quarterLabelEl) quarterLabelEl.textContent = quarterLabel;

    // Get leaderboard position
    const stats = await getPlayerLeaderboardStats(playerId);
    const positionValueEl = document.getElementById('positionValue');
    if (positionValueEl) {
      positionValueEl.textContent = (stats && stats.position) ? `#${stats.position}` : 'Not ranked';
    }
  } catch (error) {
    console.error('Error loading points summary:', error);
  }
}

async function loadPointsHistory(playerId, view = 'current') {
  const container = document.getElementById('pointsHistoryContent');
  if (!container) return;

  container.innerHTML = '<div class="loading-state">Loading points history...</div>';

  try {
    let query = supabase
      .from('points_transactions')
      .select('*')
      .eq('player_id', playerId)
      .order('checked_in_at', { ascending: false });

    if (view === 'current') {
      const { year, quarter } = getCurrentQuarter();
      query = query
        .eq('quarter_year', year)
        .eq('quarter_number', quarter)
        .eq('status', 'active');
    } else if (view === 'history') {
      // History - get all transactions, we'll filter out current quarter in JavaScript
      // No additional filters needed
    }

    const { data: transactions, error } = await query;

    if (error) {
      console.error('Error loading points history:', error);
      container.innerHTML = '<div class="error-state">Error loading points history</div>';
      return;
    }

    if (!transactions || transactions.length === 0) {
      container.innerHTML = '<div class="empty-state">No points history available</div>';
      return;
    }

    // If history view, show bar chart by quarter
    if (view === 'history') {
      // Filter out current quarter
      const { year: currentYear, quarter: currentQuarter } = getCurrentQuarter();
      const filteredTransactions = transactions.filter(t => 
        !(t.quarter_year === currentYear && t.quarter_number === currentQuarter)
      );

      if (filteredTransactions.length === 0) {
        container.innerHTML = '<div class="empty-state">No previous quarters data available</div>';
        return;
      }
      // Group by quarter and year
      const quarterGroups = filteredTransactions.reduce((acc, transaction) => {
        const key = `Q${transaction.quarter_number} ${transaction.quarter_year}`;
        if (!acc[key]) {
          acc[key] = {
            quarter: transaction.quarter_number,
            year: transaction.quarter_year,
            transactions: [],
            total: 0
          };
        }
        acc[key].transactions.push(transaction);
        acc[key].total += parseFloat(transaction.points);
        return acc;
      }, {});

      // Sort by year (desc) then quarter (desc)
      const sortedQuarters = Object.values(quarterGroups).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return b.quarter - a.quarter;
      });

      // Find max points for scaling
      const maxPoints = Math.max(...sortedQuarters.map(q => q.total), 1);

      // Render bar chart
      container.innerHTML = `
        <div class="quarter-chart-container">
          ${sortedQuarters.map(quarterData => {
            const percentage = (quarterData.total / maxPoints) * 100;
            return `
              <div class="quarter-chart-item">
                <div class="quarter-chart-label">
                  <span class="quarter-label">Q${quarterData.quarter} ${quarterData.year}</span>
                  <span class="quarter-points">${quarterData.total.toFixed(1)} pts</span>
                </div>
                <div class="quarter-chart-bar-container">
                  <div class="quarter-chart-bar" style="width: ${percentage}%"></div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
      return;
    }

    // Current quarter view - group by date
    const groupedByDate = transactions.reduce((acc, transaction) => {
      const date = new Date(transaction.checked_in_at);
      const dateKey = date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
      
      if (!acc[dateKey]) {
        acc[dateKey] = [];
      }
      acc[dateKey].push(transaction);
      return acc;
    }, {});

    // Render grouped transactions
    container.innerHTML = Object.entries(groupedByDate).map(([date, dayTransactions]) => {
      const dayTotal = dayTransactions.reduce((sum, t) => sum + parseFloat(t.points), 0);
      
      return `
        <div class="points-day-group">
          <div class="points-day-header">
            <span class="points-date">${date}</span>
            <span class="points-day-total">+${dayTotal.toFixed(1)} pts</span>
          </div>
          <div class="points-transactions">
            ${dayTransactions.map(transaction => {
              const time = new Date(transaction.checked_in_at).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit'
              });
              return `
                <div class="points-transaction">
                  <div class="transaction-info">
                    <span class="transaction-session">${transaction.session_type}</span>
                    <span class="transaction-time">${time}</span>
                  </div>
                  <div class="transaction-points">+${parseFloat(transaction.points).toFixed(1)}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    }).join('');

  } catch (error) {
    console.error('Error loading points history:', error);
    container.innerHTML = '<div class="error-state">Error loading points history</div>';
  }
}

function setupQuarterSelector(playerId) {
  const buttons = document.querySelectorAll('.quarter-btn');
  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      buttons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.quarter;
      loadPointsHistory(playerId, view);
    });
  });
}
