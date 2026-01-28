// Player Tracking page scripts
import { initSupabase } from '../../../../auth/config/supabase.js';
import { getCurrentQuarter } from '../../../utils/points.js';
import { getPlayerLeaderboardStats } from '../../../utils/leaderboard.js';

let supabase;
let supabaseReady = false;

initSupabase().then(client => {
  if (client) {
    supabase = client;
    supabaseReady = true;
    init();
  }
});

async function init() {
  if (!supabaseReady) return;

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
    
    // Listen for account switches
    setupAccountSwitchListener();
  } catch (error) {
    console.error('Error initializing tracking:', error);
  }
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
    } else if (role === 'parent') {
      // Switched back to parent - reload as actual player (if logged in as player)
      const playerId = await getPlayerId();
      if (playerId) {
        await loadPointsSummary(playerId);
        await loadPointsHistory(playerId, 'current');
        await loadQuizHistory(playerId);
        await loadObjectivesHistory(playerId);
        setupQuarterSelector(playerId);
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
      }
    }
  });
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
    document.getElementById('totalPoints').textContent = totalPoints.toFixed(1);

    // Update quarter label
    const quarterLabel = `Q${quarter} ${year}`;
    document.getElementById('quarterLabel').textContent = quarterLabel;

    // Get leaderboard position
    const stats = await getPlayerLeaderboardStats(playerId);
    if (stats && stats.position) {
      document.getElementById('positionValue').textContent = `#${stats.position}`;
    } else {
      document.getElementById('positionValue').textContent = 'Not ranked';
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
