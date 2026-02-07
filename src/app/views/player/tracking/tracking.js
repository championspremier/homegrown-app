// Player Tracking page scripts
import { initSupabase } from '../../../../auth/config/supabase.js';
import { getCurrentQuarter } from '../../../utils/points.js';
import { getPlayerLeaderboardStats } from '../../../utils/leaderboard.js';
import { showLoader, hideLoader } from '../../../utils/loader.js';
import { getBackbonePeriodKeyForDate } from '../home/curriculum-focus.js';

let supabase;
let supabaseReady = false;

/**
 * Spider uses 1 per completed session (count). Tactical: coach check-ins (Tec Tac, CPP) from points_transactions;
 * HG tactical reels are counted from player_curriculum_progress only (1 per watch by period).
 */
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
    /** Map DB skill to axis key for aggregation */
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

async function init() {
  if (!supabaseReady) return;

  const container = document.querySelector('.tracking-container');
  if (container) showLoader(container, 'Loading tracking...');

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      console.error('Not logged in');
      return;
    }

    // Get the correct player ID (handles account switcher)
    const playerId = await getPlayerId();
    if (!playerId) {
      console.error('Could not determine player ID');
      return;
    }

    await loadPointsSummary(playerId);
    await loadPointsHistory(playerId, 'current');
    await loadQuizHistory(playerId);
    await loadObjectivesHistory(playerId);
    setupQuarterSelector(playerId);
    setupTrackingTabs();
    setupPillarTabs();
    await loadAndRenderSpider(playerId);

    // Listen for account switches
    setupAccountSwitchListener();
  } catch (error) {
    console.error('Error initializing tracking:', error);
  } finally {
    if (container) hideLoader(container);
  }
}

// Tab switching: Points, Quiz, Objectives
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

function getActivePillar() {
  const active = document.querySelector('.tracking-container .tracking-pillar-card.active');
  return (active && active.dataset.pillar) || 'technical';
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
      const playerId = await getPlayerId();
      if (playerId) await loadAndRenderSpider(playerId);
      window.dispatchEvent(new CustomEvent('trackingPillarChanged', { detail: { pillar } }));
    });
  });
}

// Get the correct player ID (handles account switcher)
async function getPlayerId() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) return null;
  
  const currentRole = localStorage.getItem('hg-user-role');
  const selectedPlayerId = localStorage.getItem('selectedPlayerId');
  
  // Check if parent viewing as player
  if (currentRole === 'player' && selectedPlayerId) {
    // Parent switched to view as player - use the selected player ID
    console.log(`Parent viewing as player: ${selectedPlayerId}`);
    return selectedPlayerId;
  }
  
  // Otherwise, use the logged-in user's ID (actual player)
  return session.user.id;
}

// Listen for account switches and reload data
function setupAccountSwitchListener() {
  window.addEventListener('accountSwitched', async (event) => {
    const { role, accountId } = event.detail || {};
    const selectedPlayerId = localStorage.getItem('selectedPlayerId');
    
    if (role === 'player' && selectedPlayerId) {
      // Parent switched to player - reload that player's data
      console.log(`Account switched to player: ${selectedPlayerId}`);
      await loadPointsSummary(selectedPlayerId);
      await loadPointsHistory(selectedPlayerId, 'current');
      await loadQuizHistory(selectedPlayerId);
      await loadObjectivesHistory(selectedPlayerId);
      setupQuarterSelector(selectedPlayerId);
      await loadAndRenderSpider(selectedPlayerId);
    } else if (role === 'parent') {
      // Switched back to parent - reload as actual player (if logged in as player)
      const playerId = await getPlayerId();
      if (playerId) {
        await loadPointsSummary(playerId);
        await loadPointsHistory(playerId, 'current');
        await loadQuizHistory(playerId);
        await loadObjectivesHistory(playerId);
        setupQuarterSelector(playerId);
        await loadAndRenderSpider(playerId);
      }
    }
  });
  
  // Also listen for storage changes (in case account switch happens in another tab/window)
  window.addEventListener('storage', async (event) => {
    if (event.key === 'selectedPlayerId' || event.key === 'hg-user-role') {
      const playerId = await getPlayerId();
      if (playerId) {
        await loadPointsSummary(playerId);
        await loadPointsHistory(playerId, 'current');
        await loadQuizHistory(playerId);
        await loadObjectivesHistory(playerId);
        setupQuarterSelector(playerId);
        await loadAndRenderSpider(playerId);
      }
    }
  });
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
 * Score 0 = center, 10 = outer ring. coachOnly axes with no score show "—" in legend.
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
    const maxScore = 365;
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
    const positionValueEl = document.getElementById('positionValue');
    if (positionValueEl) {
      const stats = await getPlayerLeaderboardStats(playerId);
      if (stats && stats.position) {
        positionValueEl.textContent = `#${stats.position}`;
      } else {
        positionValueEl.textContent = 'Not ranked';
      }
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

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text == null ? '' : String(text);
  return div.innerHTML;
}

async function loadQuizHistory(playerId) {
  const container = document.getElementById('quizHistoryContent');
  if (!container) return;

  container.innerHTML = '<div class="loading-state">Loading quiz history...</div>';

  try {
    const { data: assignments, error } = await supabase
      .from('quiz_assignments')
      .select(`
        id,
        status,
        answered_at,
        is_correct,
        points_awarded,
        selected_answer,
        quiz_questions (
          question,
          options,
          correct_answer
        )
      `)
      .eq('player_id', playerId)
      .eq('status', 'answered')
      .order('answered_at', { ascending: false })
      .limit(100);

    if (error) {
      console.error('Error loading quiz history:', error);
      container.innerHTML = '<div class="error-state">Error loading quiz history</div>';
      return;
    }

    if (!assignments || assignments.length === 0) {
      container.innerHTML = '<div class="empty-state">No quiz history yet. Answer quizzes on the Home tab to see results here.</div>';
      return;
    }

    const items = assignments.map((a) => {
      const q = Array.isArray(a.quiz_questions) ? a.quiz_questions[0] : a.quiz_questions;
      const question = (q && q.question) || 'Question';
      const options = Array.isArray(q?.options) ? q.options : [];
      const correctIdx = q && typeof q.correct_answer === 'number' ? q.correct_answer : -1;
      const selectedIdx = a.selected_answer != null ? a.selected_answer : -1;
      const isCorrect = a.is_correct === true;
      const pts = parseFloat(a.points_awarded) || 0;
      const date = a.answered_at
        ? new Date(a.answered_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '';
      const resultClass = isCorrect ? 'quiz-history-correct' : 'quiz-history-incorrect';
      const resultText = isCorrect ? 'Correct' : 'Incorrect';
      const correctText = correctIdx >= 0 && correctIdx < options.length
        ? escapeHtml(String(options[correctIdx]))
        : '';
      return `
        <div class="quiz-history-item">
          <div class="quiz-history-question">${escapeHtml(question)}</div>
          <div class="quiz-history-meta">
            <span class="${resultClass}">${resultText}</span>
            ${pts > 0 ? `<span class="quiz-history-points">+${pts.toFixed(1)} pts</span>` : ''}
            ${date ? `<span class="quiz-history-date">${date}</span>` : ''}
          </div>
          ${correctText && !isCorrect ? `<div class="quiz-history-correct-answer">Correct: ${correctText}</div>` : ''}
        </div>
      `;
    }).join('');

    container.innerHTML = `<div class="quiz-history-list">${items}</div>`;
  } catch (err) {
    console.error('Error in loadQuizHistory:', err);
    container.innerHTML = '<div class="error-state">Error loading quiz history</div>';
  }
}

async function loadObjectivesHistory(playerId) {
  const container = document.getElementById('objectivesHistoryContent');
  if (!container) return;

  container.innerHTML = '<div class="loading-state">Loading objectives history...</div>';

  try {
    const { data: objectives, error } = await supabase
      .from('player_objectives')
      .select(`
        id,
        in_possession_objective,
        out_of_possession_objective,
        is_active,
        created_at,
        coach:coach_id(first_name, last_name)
      `)
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('Error loading objectives history:', error);
      container.innerHTML = '<div class="error-state">Error loading objectives history</div>';
      return;
    }

    if (!objectives || objectives.length === 0) {
      container.innerHTML = '<div class="empty-state">No objectives history yet. Your coach will assign objectives from Communicate.</div>';
      return;
    }

    const items = objectives.map((obj) => {
      const coach = obj.coach || obj.coach_id;
      const coachName = coach ? [coach.first_name, coach.last_name].filter(Boolean).join(' ') || 'Coach' : 'Coach';
      const dateStr = obj.created_at
        ? new Date(obj.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '';
      const inPoss = (obj.in_possession_objective || '').trim() || '—';
      const outPoss = (obj.out_of_possession_objective || '').trim() || '—';
      const currentBadge = obj.is_active ? '<span class="objectives-history-current">Current</span>' : '';
      return `
        <div class="objectives-history-item">
          <div class="objectives-history-meta">
            <span class="objectives-history-coach">${escapeHtml(coachName)}</span>
            <span class="objectives-history-date">${escapeHtml(dateStr)}</span>
            ${currentBadge}
          </div>
          <div class="objectives-history-detail">
            <div><strong>In Possession:</strong> ${escapeHtml(inPoss)}</div>
            <div><strong>Out Of Possession:</strong> ${escapeHtml(outPoss)}</div>
          </div>
        </div>
      `;
    }).join('');

    container.innerHTML = `<div class="objectives-history-list">${items}</div>`;
  } catch (err) {
    console.error('Error in loadObjectivesHistory:', err);
    container.innerHTML = '<div class="error-state">Error loading objectives history</div>';
  }
}

function setupQuarterSelector(playerId) {
  // Remove existing listeners to prevent duplicates
  const buttons = document.querySelectorAll('.quarter-btn');
  buttons.forEach(btn => {
    // Clone and replace to remove old listeners
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
  });
  
  // Add fresh listeners
  const freshButtons = document.querySelectorAll('.quarter-btn');
  freshButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      freshButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const view = btn.dataset.quarter;
      loadPointsHistory(playerId, view);
    });
  });
}
