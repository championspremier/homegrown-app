// Parent Tracking page scripts
import { initSupabase } from '../../../../auth/config/supabase.js';
import { getCurrentQuarter } from '../../../utils/points.js';
import { getPlayerLeaderboardStats } from '../../../utils/leaderboard.js';

let supabase;
let supabaseReady = false;
let linkedPlayers = [];

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
  // Show sections
  document.getElementById('pointsSummary').style.display = 'block';
  document.getElementById('pointsHistorySection').style.display = 'block';
  document.getElementById('emptyState').style.display = 'none';

  await loadPointsSummary(playerId);
  await loadPointsHistory(playerId, 'current');
  setupQuarterSelector(playerId);
}

function hidePlayerData() {
  document.getElementById('pointsSummary').style.display = 'none';
  document.getElementById('pointsHistorySection').style.display = 'none';
  document.getElementById('emptyState').style.display = 'block';
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
