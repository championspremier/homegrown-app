// Coach People page scripts
import { initSupabase } from '../../../../auth/config/supabase.js';

// Initialize Supabase
let supabase;
let supabaseReady = false;

initSupabase().then(client => {
  if (client) {
    supabase = client;
    supabaseReady = true;
    initializePeoplePage();
  } else {
    console.error('❌ Supabase client is null');
  }
}).catch(err => {
  console.error('❌ Failed to initialize Supabase:', err);
});

let currentTab = 'staff';
let currentPage = 1;
let itemsPerPage = 13;
let sortColumn = 'name';
let sortDirection = 'asc';
let allStaff = [];
let filteredStaff = [];
let expandedParents = new Set(); // Track which parent rows are expanded to show sub-accounts

// Initialize the page
function initializePeoplePage() {
  setupEventListeners();
  loadStaff();
}

// Setup event listeners
function setupEventListeners() {
  // Tab switching
  document.querySelectorAll('.people-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const tab = btn.dataset.tab;
      switchTab(tab);
    });
  });

  // Search input
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      filterStaff(e.target.value);
    });
  }

  // Sortable columns
  document.querySelectorAll('.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const column = th.dataset.sort;
      if (sortColumn === column) {
        sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
      } else {
        sortColumn = column;
        sortDirection = 'asc';
      }
      updateSortIcons();
      renderStaffTable();
    });
  });

  // Select all checkbox
  const selectAllCheckbox = document.getElementById('selectAllCheckbox');
  if (selectAllCheckbox) {
    selectAllCheckbox.addEventListener('change', (e) => {
      const checkboxes = document.querySelectorAll('#peopleTableBody input[type="checkbox"]');
      checkboxes.forEach(cb => {
        cb.checked = e.target.checked;
      });
    });
  }

  // Pagination
  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  
  if (prevPageBtn) {
    prevPageBtn.addEventListener('click', () => {
      if (currentPage > 1) {
        currentPage--;
        renderStaffTable();
      }
    });
  }
  
  if (nextPageBtn) {
    nextPageBtn.addEventListener('click', () => {
      const totalPages = Math.ceil(filteredStaff.length / itemsPerPage);
      if (currentPage < totalPages) {
        currentPage++;
        renderStaffTable();
      }
    });
  }

  // Add person button
  const addPersonBtn = document.getElementById('addPersonBtn');
  if (addPersonBtn) {
    addPersonBtn.addEventListener('click', () => {
      // TODO: Open add person modal
      console.log('Add person clicked');
    });
  }
}

// Switch tabs
function switchTab(tab) {
  currentTab = tab;
  currentPage = 1;
  expandedParents.clear(); // Clear expanded state when switching tabs
  
  document.querySelectorAll('.people-tab-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.tab === tab);
  });

  // Update search placeholder based on tab
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    if (tab === 'staff') {
      searchInput.placeholder = 'Search staff';
    } else if (tab === 'members') {
      searchInput.placeholder = 'Search members';
    } else if (tab === 'leads') {
      searchInput.placeholder = 'Search leads';
    }
  }

  // Show/hide columns based on tab
  const typeHeader = document.getElementById('typeColumnHeader');
  const planHeader = document.getElementById('planColumnHeader');
  const statusHeader = document.getElementById('statusColumnHeader');
  const roleHeader = document.getElementById('roleColumnHeader');
  
  if (tab === 'members') {
    // Members tab: Show Type, Plan, Status; Hide Role
    if (typeHeader) typeHeader.style.display = '';
    if (planHeader) planHeader.style.display = '';
    if (statusHeader) statusHeader.style.display = '';
    if (roleHeader) roleHeader.style.display = 'none';
  } else {
    // Staff/Leads tabs: Show Role; Hide Type, Plan, Status
    if (typeHeader) typeHeader.style.display = 'none';
    if (planHeader) planHeader.style.display = 'none';
    if (statusHeader) statusHeader.style.display = 'none';
    if (roleHeader) roleHeader.style.display = '';
  }

  // Load data for the selected tab
  if (tab === 'staff') {
    loadStaff();
  } else if (tab === 'leads') {
    loadLeads();
  } else if (tab === 'members') {
    loadMembers();
  }
}

// Load staff from Supabase
async function loadStaff() {
  if (!supabaseReady || !supabase) {
    console.warn('Supabase not ready yet');
    return;
  }

  try {
    // First, get profiles for coaches and admins
    const { data: profiles, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, created_at, updated_at')
      .in('role', ['coach', 'admin'])
      .order('first_name', { ascending: true });

    if (error) {
      console.error('Error loading staff:', error);
      return;
    }

    if (!profiles || profiles.length === 0) {
      allStaff = [];
      filteredStaff = [];
      renderStaffTable();
      return;
    }

    // Get emails from auth.users using a database function
    // We'll fetch emails by calling a function that joins profiles with auth.users
    const profileIds = profiles.map(p => p.id);
    
    // Try to use RPC to get emails (if function exists)
    let emailMap = new Map();
    try {
      const { data: emailsData, error: emailsError } = await supabase
        .rpc('get_user_emails', { user_ids: profileIds });

      if (!emailsError && emailsData) {
        emailsData.forEach(item => {
          if (item.user_id && item.email) {
            emailMap.set(item.user_id, item.email);
          }
        });
      }
    } catch (rpcError) {
      // Function might not exist yet, we'll use placeholders
      console.warn('get_user_emails function not available, using placeholders:', rpcError);
    }

    // Map profiles with emails
    allStaff = profiles.map(profile => {
      const email = emailMap.get(profile.id) || 
                   `${(profile.first_name || 'user').toLowerCase()}@championspremier.net`;
      
      return {
        id: profile.id,
        first_name: profile.first_name || '',
        last_name: profile.last_name || '',
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Unknown',
        role: profile.role || 'coach',
        email: email,
        last_checkin: profile.updated_at || profile.created_at || null,
        created_at: profile.created_at
      };
    });

    filteredStaff = [...allStaff];
    renderStaffTable();
  } catch (error) {
    console.error('Error in loadStaff:', error);
  }
}

// Load leads (parents who signed up via landing page, with their linked players)
async function loadLeads() {
  if (!supabaseReady || !supabase) {
    console.warn('Supabase not ready yet');
    return;
  }

  try {
    // Get all parents
    const { data: parents, error: parentsError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, created_at, updated_at')
      .eq('role', 'parent')
      .order('created_at', { ascending: false });

    if (parentsError) {
      console.error('Error loading leads:', parentsError);
      console.error('Error details:', {
        code: parentsError.code,
        message: parentsError.message,
        details: parentsError.details,
        hint: parentsError.hint
      });
      allStaff = [];
      filteredStaff = [];
      renderStaffTable();
      return;
    }

    console.log('Loaded parents for leads:', parents?.length || 0, parents);

    if (!parents || parents.length === 0) {
      allStaff = [];
      filteredStaff = [];
      renderStaffTable();
      return;
    }

    // Get parent IDs and fetch their linked players
    const parentIds = parents.map(p => p.id);
    
    // Try to get relationships - if this fails, we'll still show parents without linked players
    let relationships = [];
    let relError = null;
    
    try {
      const { data: relData, error: relErr } = await supabase
        .from('parent_player_relationships')
        .select('parent_id, player_id')
        .in('parent_id', parentIds);
      
      console.log('Relationships query result:', { relData, relErr, parentIds });
      
      if (!relErr && relData && relData.length > 0) {
        relationships = relData;
        console.log('Found relationships:', relationships.length);
        
        // Get player details separately if we have relationships
        const playerIds = relationships.map(r => r.player_id).filter(Boolean);
        console.log('Player IDs to fetch:', playerIds);
        
        if (playerIds.length > 0) {
          const { data: playersData, error: playersError } = await supabase
            .from('profiles')
            .select('id, first_name, last_name, created_at, updated_at')
            .in('id', playerIds)
            .eq('role', 'player');
          
          console.log('Players data:', { playersData, playersError });
          
          if (!playersError && playersData) {
            const playersMapById = new Map(playersData.map(p => [p.id, p]));
            relationships = relationships.map(rel => ({
              ...rel,
              player: playersMapById.get(rel.player_id)
            }));
            console.log('Mapped relationships with players:', relationships);
          } else if (playersError) {
            console.warn('Error loading player details:', playersError);
          }
        } else {
          console.warn('No player IDs found in relationships');
        }
      } else {
        if (relErr) {
          relError = relErr;
          console.warn('Error loading relationships:', relErr);
        } else {
          console.log('No relationships found for parents:', parentIds);
        }
      }
    } catch (err) {
      console.warn('Error loading relationships (non-critical):', err);
    }

    // Create a map of parent_id -> array of players
    const playersMap = new Map();
    if (!relError && relationships) {
      relationships.forEach(rel => {
        if (!playersMap.has(rel.parent_id)) {
          playersMap.set(rel.parent_id, []);
        }
        if (rel.player) {
          playersMap.get(rel.parent_id).push(rel.player);
        }
      });
    }
    
    console.log('Players map for leads:', playersMap);

    // Get emails for parents
    const parentIdsForEmail = parents.map(p => p.id);
    let emailMap = new Map();
    try {
      const { data: emailsData, error: emailsError } = await supabase
        .rpc('get_user_emails', { user_ids: parentIdsForEmail });

      if (!emailsError && emailsData) {
        emailsData.forEach(item => {
          if (item.user_id && item.email) {
            emailMap.set(item.user_id, item.email);
          }
        });
      }
    } catch (rpcError) {
      console.warn('get_user_emails function not available:', rpcError);
    }

    // Map parents with their linked players
    allStaff = parents.map(parent => {
      const email = emailMap.get(parent.id) || 
                   `${(parent.first_name || 'user').toLowerCase()}@championspremier.net`;
      const linkedPlayers = playersMap.get(parent.id) || [];
      
      console.log(`Mapping parent ${parent.id}:`, {
        parentName: `${parent.first_name || ''} ${parent.last_name || ''}`.trim(),
        linkedPlayersCount: linkedPlayers.length,
        linkedPlayers: linkedPlayers
      });
      
      return {
        id: parent.id,
        first_name: parent.first_name || '',
        last_name: parent.last_name || '',
        name: `${parent.first_name || ''} ${parent.last_name || ''}`.trim() || 'Unknown',
        role: 'lead',
        email: email,
        last_checkin: parent.updated_at || parent.created_at || null,
        created_at: parent.created_at,
        linkedPlayers: linkedPlayers // Store linked players for display
      };
    });

    console.log('Mapped leads:', allStaff.length, allStaff);
    console.log('All staff with linkedPlayers:', allStaff.map(s => ({
      id: s.id,
      name: s.name,
      linkedPlayersCount: s.linkedPlayers?.length || 0
    })));
    filteredStaff = [...allStaff];
    renderStaffTable();
  } catch (error) {
    console.error('Error in loadLeads:', error);
  }
}

// Load members (players)
async function loadMembers() {
  if (!supabaseReady || !supabase) {
    console.warn('Supabase not ready yet');
    return;
  }

  try {
    const { data: players, error } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, role, created_at, updated_at')
      .eq('role', 'player')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading members:', error);
      return;
    }

    if (!players || players.length === 0) {
      allStaff = [];
      filteredStaff = [];
      renderStaffTable();
      return;
    }

    // Get emails for players
    const playerIds = players.map(p => p.id);
    let emailMap = new Map();
    try {
      const { data: emailsData, error: emailsError } = await supabase
        .rpc('get_user_emails', { user_ids: playerIds });

      if (!emailsError && emailsData) {
        emailsData.forEach(item => {
          if (item.user_id && item.email) {
            emailMap.set(item.user_id, item.email);
          }
        });
      }
    } catch (rpcError) {
      console.warn('get_user_emails function not available:', rpcError);
    }

    // Map players (members are players who have purchased plans)
    // TODO: Filter to only players who have purchased a plan/subscription
    allStaff = players.map(player => {
      const email = emailMap.get(player.id) || 
                   `${(player.first_name || player.player_name || 'user').toLowerCase()}@championspremier.net`;
      const displayName = `${player.first_name || ''} ${player.last_name || ''}`.trim() || player.player_name || 'Unknown';
      
      return {
        id: player.id,
        first_name: player.first_name || player.player_name || '',
        last_name: player.last_name || '',
        name: displayName,
        role: 'player',
        type: 'Member', // All members are players
        plan: 'No plan', // TODO: Fetch from plans/subscriptions table
        status: 'Active', // TODO: Determine from subscription status
        email: email,
        last_checkin: player.updated_at || player.created_at || null,
        created_at: player.created_at
      };
    });

    filteredStaff = [...allStaff];
    renderStaffTable();
  } catch (error) {
    console.error('Error in loadMembers:', error);
  }
}

// Filter staff based on search query
function filterStaff(query) {
  if (!query.trim()) {
    filteredStaff = [...allStaff];
  } else {
    const lowerQuery = query.toLowerCase();
    filteredStaff = allStaff.filter(staff => {
      const name = `${staff.first_name} ${staff.last_name}`.toLowerCase();
      const email = staff.email.toLowerCase();
      return name.includes(lowerQuery) || email.includes(lowerQuery);
    });
  }
  
  currentPage = 1;
  renderStaffTable();
}

// Sort staff
function sortStaff() {
  filteredStaff.sort((a, b) => {
    let aVal, bVal;

    switch (sortColumn) {
      case 'name':
        aVal = `${a.first_name} ${a.last_name}`.toLowerCase();
        bVal = `${b.first_name} ${b.last_name}`.toLowerCase();
        break;
      case 'role':
        aVal = a.role.toLowerCase();
        bVal = b.role.toLowerCase();
        break;
      case 'last_checkin':
        aVal = a.last_checkin ? new Date(a.last_checkin).getTime() : 0;
        bVal = b.last_checkin ? new Date(b.last_checkin).getTime() : 0;
        break;
      default:
        return 0;
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });
}

// Update sort icons
function updateSortIcons() {
  document.querySelectorAll('.sortable').forEach(th => {
    const icon = th.querySelector('.sort-icon');
    if (th.dataset.sort === sortColumn) {
      icon.className = `bx bx-sort sort-icon ${sortDirection === 'asc' ? 'bx-sort-up' : 'bx-sort-down'}`;
    } else {
      icon.className = 'bx bx-sort sort-icon';
    }
  });
}

// Render staff table
function renderStaffTable() {
  sortStaff();
  
  const tbody = document.getElementById('peopleTableBody');
  if (!tbody) return;

  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageStaff = filteredStaff.slice(startIndex, endIndex);

  if (pageStaff.length === 0) {
    let emptyMessage = 'No staff found';
    if (currentTab === 'leads') {
      emptyMessage = 'No leads found';
    } else if (currentTab === 'members') {
      emptyMessage = 'No members found';
    }
    
    const colspan = currentTab === 'members' ? 8 : 5;
    tbody.innerHTML = `
      <tr>
        <td colspan="${colspan}" style="text-align: center; padding: 40px; color: var(--muted);">
          ${emptyMessage}
        </td>
      </tr>
    `;
    updatePagination();
    return;
  }

  // Build rows including sub-accounts for expanded parents
  let rowsHtml = '';
  
  pageStaff.forEach(staff => {
    const initials = `${staff.first_name?.[0] || ''}${staff.last_name?.[0] || ''}`.toUpperCase() || '?';
    const lastCheckin = staff.last_checkin 
      ? new Date(staff.last_checkin).toLocaleDateString('en-US', { 
          year: 'numeric', 
          month: 'short', 
          day: 'numeric' 
        })
      : '--';
    
    const isExpanded = expandedParents.has(staff.id);
    const hasSubAccounts = currentTab === 'leads' && staff.linkedPlayers && staff.linkedPlayers.length > 0;
    const expandIcon = hasSubAccounts ? (isExpanded ? '<i class="bx bx-chevron-down"></i>' : '<i class="bx bx-chevron-right"></i>') : '';
    
    // Debug logging
    if (currentTab === 'leads' && staff.linkedPlayers) {
      console.log(`Parent ${staff.id} (${staff.name}):`, {
        linkedPlayers: staff.linkedPlayers.length,
        hasSubAccounts,
        isExpanded
      });
    }
    
    // Parent/Lead row
    rowsHtml += `
      <tr class="parent-row ${hasSubAccounts ? 'has-sub-accounts' : ''}" data-staff-id="${staff.id}" data-role="${staff.role}">
        <td>
          <input type="checkbox" data-staff-id="${staff.id}" />
        </td>
        <td>
          <div class="name-cell">
            ${hasSubAccounts ? `<span class="expand-icon">${expandIcon}</span>` : ''}
            <div class="avatar">
              ${initials}
            </div>
            <div class="name-info">
              <div class="name">${escapeHtml(staff.name)}</div>
              <div class="email">${escapeHtml(staff.email)}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="role-tag ${staff.role}">${getRoleDisplay(staff.role)}</span>
        </td>
        <td>
          <span class="last-checkin ${staff.last_checkin ? '' : 'empty'}">${lastCheckin}</span>
        </td>
        <td>
          <button class="actions-menu-btn" data-staff-id="${staff.id}" type="button" aria-label="Actions">
            <i class="bx bx-dots-vertical-rounded"></i>
          </button>
        </td>
      </tr>
    `;
    
    // Sub-accounts (players) rows - only show if expanded and in Leads tab
    if (currentTab === 'leads' && isExpanded && hasSubAccounts && staff.linkedPlayers) {
      staff.linkedPlayers.forEach(player => {
        const playerInitials = `${player.first_name?.[0] || ''}${player.last_name?.[0] || ''}`.toUpperCase() || '?';
        const playerName = `${player.first_name || ''} ${player.last_name || ''}`.trim() || 'Unknown';
        const playerEmail = `${(player.first_name || 'user').toLowerCase()}@championspremier.net`;
        
        // Sub-account rows only show in Leads tab, so they use Role column (not Type/Plan/Status)
        rowsHtml += `
          <tr class="sub-account-row" data-parent-id="${staff.id}" data-staff-id="${player.id}">
            <td>
              <input type="checkbox" data-staff-id="${player.id}" />
            </td>
            <td>
              <div class="name-cell sub-account-cell">
                <div class="avatar">
                  ${playerInitials}
                </div>
                <div class="name-info">
                  <div class="name">${escapeHtml(playerName)}</div>
                  <div class="email">${escapeHtml(playerEmail)}</div>
                </div>
              </div>
            </td>
            ${currentTab === 'members' ? '' : '<td><span class="role-tag player">Player</span></td>'}
            ${currentTab === 'members' ? '<td><span class="role-tag member">Member</span></td><td><span class="plan-name">No plan</span></td><td><span class="status-tag active">Active</span></td>' : ''}
            <td>
              <span class="last-checkin empty">--</span>
            </td>
            <td>
              <button class="actions-menu-btn" data-staff-id="${player.id}" type="button" aria-label="Actions" style="opacity: 0.5; cursor: not-allowed;" disabled>
                <i class="bx bx-dots-vertical-rounded"></i>
              </button>
            </td>
          </tr>
        `;
      });
    }
  });
  
  tbody.innerHTML = rowsHtml;

  // Setup parent row click handlers (for expanding sub-accounts in Leads tab)
  tbody.querySelectorAll('.parent-row.has-sub-accounts').forEach(row => {
    row.addEventListener('click', (e) => {
      // Don't expand if clicking on checkbox, actions button, or expand icon
      if (e.target.closest('input[type="checkbox"]') || 
          e.target.closest('.actions-menu-btn') || 
          e.target.closest('.expand-icon')) {
        return;
      }
      
      const parentId = row.dataset.staffId;
      console.log('Parent row clicked:', parentId, 'Current expanded:', Array.from(expandedParents));
      
      if (expandedParents.has(parentId)) {
        expandedParents.delete(parentId);
        console.log('Collapsing parent:', parentId);
      } else {
        expandedParents.add(parentId);
        console.log('Expanding parent:', parentId);
      }
      
      // Re-render to show/hide sub-accounts
      renderStaffTable();
    });
  });
  
  // Setup expand icon click handlers
  tbody.querySelectorAll('.expand-icon').forEach(icon => {
    icon.addEventListener('click', (e) => {
      e.stopPropagation();
      const row = icon.closest('.parent-row');
      if (row) {
        const parentId = row.dataset.staffId;
        console.log('Expand icon clicked:', parentId, 'Current expanded:', Array.from(expandedParents));
        
        if (expandedParents.has(parentId)) {
          expandedParents.delete(parentId);
          console.log('Collapsing parent (via icon):', parentId);
        } else {
          expandedParents.add(parentId);
          console.log('Expanding parent (via icon):', parentId);
        }
        renderStaffTable();
      }
    });
  });

  // Setup action menu buttons
  tbody.querySelectorAll('.actions-menu-btn:not([disabled])').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const staffId = btn.dataset.staffId;
      // Find staff in allStaff (not just pageStaff) to handle sub-accounts
      const staff = allStaff.find(s => s.id === staffId) || pageStaff.find(s => s.id === staffId);
      
      // Show menu based on tab and role
      if (currentTab === 'staff') {
        showStaffActionsMenu(e.target, staffId, staff);
      } else if (currentTab === 'leads' || currentTab === 'members') {
        // For leads (parents) and members (players), show "Edit personal info" menu
        showPlayerParentActionsMenu(e.target, staffId, staff);
      }
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.actions-menu-btn') && !e.target.closest('.actions-dropdown')) {
      closeActionsMenu();
    }
  });

  updatePagination();
}

// Update pagination info and controls
function updatePagination() {
  const totalItems = filteredStaff.length;
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const paginationInfo = document.getElementById('paginationInfo');
  if (paginationInfo) {
    paginationInfo.textContent = `Showing ${startItem} to ${endItem} of ${totalItems}`;
  }

  const currentPageSpan = document.getElementById('currentPage');
  if (currentPageSpan) {
    currentPageSpan.textContent = `Page ${currentPage} of ${totalPages || 1}`;
  }

  const prevPageBtn = document.getElementById('prevPageBtn');
  const nextPageBtn = document.getElementById('nextPageBtn');
  
  if (prevPageBtn) {
    prevPageBtn.disabled = currentPage === 1;
  }
  
  if (nextPageBtn) {
    nextPageBtn.disabled = currentPage >= totalPages || totalPages === 0;
  }
}

// Get role display text
function getRoleDisplay(role) {
  switch (role) {
    case 'admin':
      return 'Admin';
    case 'coach':
      return 'Coach';
    case 'lead':
      return 'Lead';
    case 'player':
      return 'Player';
    default:
      return role.charAt(0).toUpperCase() + role.slice(1);
  }
}

// Show staff actions menu
// Show actions menu for players/parents (leads and members)
function showPlayerParentActionsMenu(button, personId, person) {
  // Close any existing menu
  closeActionsMenu();
  
  // Create dropdown menu
  const menu = document.createElement('div');
  menu.className = 'actions-dropdown';
  menu.innerHTML = `
    <button class="actions-menu-item" data-action="edit-personal-info" data-person-id="${personId}">
      Edit personal info
    </button>
  `;
  
  // Position menu relative to button
  const rect = button.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;
  menu.style.zIndex = '1000';
  
  document.body.appendChild(menu);
  
  // Setup click handlers
  menu.querySelectorAll('.actions-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      const id = item.dataset.personId;
      
      if (action === 'edit-personal-info') {
        showEditPersonalInfoModal(id, person);
      }
      
      closeActionsMenu();
    });
  });
}

function showStaffActionsMenu(button, staffId, staff) {
  // Close any existing menu
  closeActionsMenu();
  
  // Create dropdown menu
  const menu = document.createElement('div');
  menu.className = 'actions-dropdown';
  menu.innerHTML = `
    <button class="actions-menu-item" data-action="edit-staff-info" data-staff-id="${staffId}">
      Edit staff info
    </button>
  `;
  
  // Position menu relative to button
  const rect = button.getBoundingClientRect();
  menu.style.position = 'fixed';
  menu.style.top = `${rect.bottom + 4}px`;
  menu.style.right = `${window.innerWidth - rect.right}px`;
  menu.style.zIndex = '1000';
  
  document.body.appendChild(menu);
  
  // Setup click handlers
  menu.querySelectorAll('.actions-menu-item').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = item.dataset.action;
      const id = item.dataset.staffId;
      
      if (action === 'edit-staff-info') {
        showEditStaffInfoModal(id, staff);
      }
      
      closeActionsMenu();
    });
  });
}

// Close actions menu
function closeActionsMenu() {
  const existingMenu = document.querySelector('.actions-dropdown');
  if (existingMenu) {
    existingMenu.remove();
  }
}

// Show edit personal info modal for players/parents
async function showEditPersonalInfoModal(personId, person) {
  if (!supabaseReady || !supabase) {
    alert('Supabase not ready. Please try again.');
    return;
  }

  // Fetch full profile data
  let profileData = person;
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', personId)
      .maybeSingle();
    
    if (!error && data) {
      profileData = { ...person, ...data };
    }
  } catch (err) {
    console.warn('Error fetching profile:', err);
  }

  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay edit-personal-info-overlay';
  overlay.innerHTML = `
    <div class="modal-container edit-personal-info-modal">
      <div class="modal-header">
        <h2>Edit Personal Info</h2>
        <button class="modal-close-btn" type="button" aria-label="Close">
          <i class="bx bx-x"></i>
        </button>
      </div>
      
      <div class="modal-content edit-personal-info-content">
        <div class="edit-personal-info-main">
          <!-- Personal Information Section -->
          <div class="edit-section" id="personalInfoSection">
            <div class="section-header">
              <h3>Personal Information</h3>
              <div class="section-actions">
                <button class="btn-secondary" type="button">
                  <i class="bx bx-envelope"></i>
                  Send Profile Setup Link
                </button>
                <button class="btn-primary" type="button" id="editPersonalInfoBtn">
                  <i class="bx bx-edit"></i>
                  Edit
                </button>
              </div>
            </div>
            
            <!-- Basic Information -->
            <div class="subsection">
              <h4>Basic Information</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label>First Name</label>
                  <div class="input-with-action">
                    <input type="text" id="firstName" value="${escapeHtml(profileData.first_name || '')}" disabled />
                    <button class="input-action-btn" type="button"><i class="bx bx-dots-horizontal-rounded"></i></button>
                  </div>
                </div>
                <div class="form-group">
                  <label>Last Name</label>
                  <input type="text" id="lastName" value="${escapeHtml(profileData.last_name || '')}" disabled />
                </div>
                <div class="form-group">
                  <label>Nickname</label>
                  <input type="text" id="nickname" value="${escapeHtml(profileData.nickname || '')}" disabled />
                </div>
                <div class="form-group">
                  <label>Birthday</label>
                  <input type="date" id="birthday" value="${profileData.birth_date || profileData.birth_year ? (profileData.birth_date || `${profileData.birth_year}-01-01`) : ''}" disabled />
                </div>
                <div class="form-group">
                  <label>Email</label>
                  <input type="email" id="email" value="${escapeHtml(profileData.email || '')}" disabled />
                </div>
                <div class="form-group">
                  <label>Phone</label>
                  <input type="tel" id="phone" value="${escapeHtml(profileData.phone_number || '')}" disabled />
                </div>
                <div class="form-group">
                  <label>Gender</label>
                  <select id="gender" disabled>
                    <option value="">Not specified</option>
                    <option value="male" ${profileData.gender === 'male' ? 'selected' : ''}>Male</option>
                    <option value="female" ${profileData.gender === 'female' ? 'selected' : ''}>Female</option>
                    <option value="other" ${profileData.gender === 'other' ? 'selected' : ''}>Other</option>
                  </select>
                </div>
              </div>
            </div>
            
            <!-- Address -->
            <div class="subsection">
              <h4>Address</h4>
              <div class="form-grid">
                <div class="form-group">
                  <label>Address Line 1</label>
                  <input type="text" id="addressLine1" value="${escapeHtml(profileData.address_line1 || '')}" disabled />
                </div>
                <div class="form-group">
                  <label>Address Line 2</label>
                  <input type="text" id="addressLine2" value="${escapeHtml(profileData.address_line2 || '')}" disabled />
                </div>
                <div class="form-group">
                  <label>City</label>
                  <input type="text" id="city" value="${escapeHtml(profileData.city || '')}" disabled />
                </div>
                <div class="form-group">
                  <label>Country</label>
                  <select id="country" disabled>
                    <option value="">Select a country</option>
                    <option value="US" ${profileData.country === 'US' ? 'selected' : ''}>United States</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>State/Province</label>
                  <select id="state" disabled>
                    <option value="">Select a state/province</option>
                  </select>
                </div>
                <div class="form-group">
                  <label>Zip code/Postal code</label>
                  <input type="text" id="zipCode" value="${escapeHtml(profileData.zip_code || '')}" disabled />
                </div>
              </div>
            </div>
            
            <!-- Emergency Contact -->
            <div class="subsection">
              <div class="subsection-header">
                <h4>Emergency Contact</h4>
                <button class="btn-primary" type="button" id="editEmergencyContactBtn">
                  <i class="bx bx-edit"></i>
                  Edit
                </button>
              </div>
              <div class="form-grid">
                <div class="form-group">
                  <label>Name</label>
                  <div class="input-with-action">
                    <input type="text" id="emergencyName" value="${escapeHtml(profileData.emergency_contact_name || '')}" placeholder="Name" disabled />
                    <button class="input-action-btn" type="button"><i class="bx bx-dots-horizontal-rounded"></i></button>
                  </div>
                </div>
                <div class="form-group">
                  <label>Relationship</label>
                  <input type="text" id="emergencyRelationship" value="${escapeHtml(profileData.emergency_contact_relationship || '')}" placeholder="Relationship" disabled />
                </div>
                <div class="form-group">
                  <label>Phone</label>
                  <input type="tel" id="emergencyPhone" value="${escapeHtml(profileData.emergency_contact_phone || '')}" placeholder="+1 (123) 456-7890" disabled />
                </div>
              </div>
            </div>
          </div>
          
          <!-- Documents Section -->
          <div class="edit-section" id="documentsSection" style="display: none;">
            <div class="section-header">
              <h3>Documents</h3>
              <div class="section-actions">
                <button class="btn-secondary" type="button">
                  <i class="bx bx-pen"></i>
                  Sign all unsigned documents
                </button>
                <button class="btn-primary" type="button">
                  <i class="bx bx-plus"></i>
                  Add Document
                </button>
              </div>
            </div>
            
            <div class="documents-tabs">
              <button class="doc-tab active" data-tab="unsigned">Unsigned</button>
              <button class="doc-tab" data-tab="signed">Signed</button>
              <button class="doc-tab" data-tab="revoked">Revoked</button>
            </div>
            
            <div class="documents-table-container">
              <table class="documents-table">
                <thead>
                  <tr>
                    <th class="sortable">Document <i class="bx bx-sort"></i></th>
                    <th class="sortable">Version <i class="bx bx-sort"></i></th>
                    <th class="sortable">Created <i class="bx bx-sort"></i></th>
                    <th class="sortable">Signed <i class="bx bx-sort"></i></th>
                    <th class="sortable">Active <i class="bx bx-sort"></i></th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td colspan="5" style="text-align: center; padding: 40px; color: var(--muted);">
                      <div style="margin-bottom: 16px;">
                        <i class="bx bx-file" style="font-size: 2rem; color: var(--muted);"></i>
                      </div>
                      No unsigned documents for this user
                      <div style="margin-top: 16px;">
                        <button class="btn-primary" type="button">
                          <i class="bx bx-plus"></i>
                          Add Document
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Settings Section -->
          <div class="edit-section" id="settingsSection" style="display: none;">
            <div class="section-header">
              <h3>Settings</h3>
            </div>
            
            <!-- Account Status Blocked -->
            <div class="settings-card">
              <div class="settings-card-header">
                <h4>Account Status Blocked</h4>
                <label class="toggle-switch">
                  <input type="checkbox" id="accountBlocked" ${profileData.account_blocked ? 'checked' : ''} />
                  <span class="toggle-slider"></span>
                </label>
              </div>
              <p class="settings-description">When blocked, user cannot post on the Member social feed in the Member App</p>
            </div>
            
            <!-- User Role -->
            <div class="settings-card">
              <div class="settings-card-header">
                <h4>User Role</h4>
              </div>
              <div class="settings-card-content">
                <p>Current role: <strong>${getRoleDisplay(profileData.role || 'player')}</strong></p>
                <button class="btn-secondary" type="button" id="changeRoleBtn">Change Role</button>
              </div>
            </div>
            
            <!-- Account Management -->
            <div class="settings-card">
              <div class="settings-card-header">
                <h4>Account Management</h4>
              </div>
              <p class="settings-description">Manage account merging and deletion</p>
              
              <div class="account-action">
                <div>
                  <h5>Merge Account</h5>
                  <p>Combine this account with another existing account</p>
                </div>
                <button class="btn-secondary" type="button">Merge</button>
              </div>
              
              <div class="account-action">
                <div>
                  <h5>Delete Account</h5>
                  <p>Permanently delete this account and all associated data</p>
                </div>
                <button class="btn-danger" type="button">Delete</button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Sidebar Navigation -->
        <div class="edit-personal-info-sidebar">
          <a href="#" class="sidebar-link active" data-section="personalInfo">
            Personal Information
          </a>
          <a href="#" class="sidebar-link" data-section="documents">
            Documents
          </a>
          <a href="#" class="sidebar-link" data-section="settings">
            Settings
          </a>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Setup event listeners
  setupEditPersonalInfoListeners(overlay, personId, profileData);
}

// Setup event listeners for edit personal info modal
function setupEditPersonalInfoListeners(overlay, personId, profileData) {
  // Close button
  overlay.querySelector('.modal-close-btn').addEventListener('click', () => {
    overlay.remove();
  });
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
  
  // Sidebar navigation
  overlay.querySelectorAll('.sidebar-link').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      
      // Update active link
      overlay.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
      link.classList.add('active');
      
      // Show/hide sections
      overlay.querySelectorAll('.edit-section').forEach(s => s.style.display = 'none');
      const targetSection = overlay.querySelector(`#${section}Section`);
      if (targetSection) {
        targetSection.style.display = 'block';
      }
    });
  });
  
  // Edit buttons (toggle edit mode)
  const editPersonalBtn = overlay.querySelector('#editPersonalInfoBtn');
  const editEmergencyBtn = overlay.querySelector('#editEmergencyContactBtn');
  
  if (editPersonalBtn) {
    editPersonalBtn.addEventListener('click', () => {
      const isEditing = editPersonalBtn.textContent.trim() === 'Save';
      const inputs = overlay.querySelectorAll('#personalInfoSection input, #personalInfoSection select');
      
      inputs.forEach(input => {
        input.disabled = isEditing;
      });
      
      editPersonalBtn.innerHTML = isEditing 
        ? '<i class="bx bx-edit"></i> Edit'
        : '<i class="bx bx-check"></i> Save';
      
      if (isEditing) {
        // Save changes
        savePersonalInfo(overlay, personId);
      }
    });
  }
  
  if (editEmergencyBtn) {
    editEmergencyBtn.addEventListener('click', () => {
      const isEditing = editEmergencyBtn.textContent.trim() === 'Save';
      const inputs = overlay.querySelectorAll('#emergencyName, #emergencyRelationship, #emergencyPhone');
      
      inputs.forEach(input => {
        input.disabled = isEditing;
      });
      
      editEmergencyBtn.innerHTML = isEditing 
        ? '<i class="bx bx-edit"></i> Edit'
        : '<i class="bx bx-check"></i> Save';
      
      if (isEditing) {
        // Save changes
        savePersonalInfo(overlay, personId);
      }
    });
  }
}

// Save personal information
async function savePersonalInfo(overlay, personId) {
  if (!supabaseReady || !supabase) {
    alert('Supabase not ready. Please try again.');
    return;
  }
  
  const updates = {
    first_name: overlay.querySelector('#firstName').value,
    last_name: overlay.querySelector('#lastName').value,
    nickname: overlay.querySelector('#nickname').value,
    birth_date: overlay.querySelector('#birthday').value,
    email: overlay.querySelector('#email').value,
    phone_number: overlay.querySelector('#phone').value,
    gender: overlay.querySelector('#gender').value,
    address_line1: overlay.querySelector('#addressLine1').value,
    address_line2: overlay.querySelector('#addressLine2').value,
    city: overlay.querySelector('#city').value,
    country: overlay.querySelector('#country').value,
    state: overlay.querySelector('#state').value,
    zip_code: overlay.querySelector('#zipCode').value,
    emergency_contact_name: overlay.querySelector('#emergencyName').value,
    emergency_contact_relationship: overlay.querySelector('#emergencyRelationship').value,
    emergency_contact_phone: overlay.querySelector('#emergencyPhone').value,
    updated_at: new Date().toISOString()
  };
  
  try {
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', personId);
    
    if (error) {
      console.error('Error saving personal info:', error);
      alert('Error saving personal information. Please try again.');
    } else {
      // Refresh the page data
      if (currentTab === 'members') {
        loadMembers();
      } else if (currentTab === 'leads') {
        loadLeads();
      }
    }
  } catch (err) {
    console.error('Error saving personal info:', err);
    alert('Error saving personal information. Please try again.');
  }
}

// Show edit staff info modal
function showEditStaffInfoModal(staffId, staff) {
  // Create modal overlay
  const overlay = document.createElement('div');
  overlay.className = 'edit-staff-modal-overlay';
  overlay.innerHTML = `
    <div class="edit-staff-modal">
      <div class="edit-staff-header">
        <div class="edit-staff-breadcrumbs">
          <span>Home</span>
          <span>/</span>
          <span>Staff</span>
          <span>/</span>
          <span>${escapeHtml(staff?.name || 'Staff Member')}</span>
        </div>
        <button class="edit-staff-close-btn" type="button">
          <i class="bx bx-x"></i>
        </button>
      </div>
      
      <div class="edit-staff-content">
        <h1 class="edit-staff-title">${escapeHtml(staff?.name || 'Staff Member')}</h1>
        
        <div class="edit-staff-main">
          <div class="edit-staff-form">
            <div class="edit-staff-section">
              <h3>Login Info</h3>
              <div class="edit-staff-field">
                <label>Email</label>
                <div class="edit-staff-input-group">
                  <input type="email" id="editStaffEmail" value="${escapeHtml(staff?.email || '')}" />
                  <button class="edit-staff-more-btn" type="button">...</button>
                </div>
              </div>
              <div class="edit-staff-field">
                <label>Reset Password</label>
                <input type="password" id="editStaffPassword" placeholder="Leave blank unless you want to reset the password" />
              </div>
            </div>
            
            <div class="edit-staff-section">
              <h3>Personal Info</h3>
              <div class="edit-staff-field">
                <label>First Name</label>
                <div class="edit-staff-input-group">
                  <input type="text" id="editStaffFirstName" value="${escapeHtml(staff?.first_name || '')}" />
                  <button class="edit-staff-more-btn" type="button">...</button>
                </div>
              </div>
              <div class="edit-staff-field">
                <label>Last Name</label>
                <input type="text" id="editStaffLastName" value="${escapeHtml(staff?.last_name || '')}" />
              </div>
              <div class="edit-staff-field">
                <label>Address 1</label>
                <input type="text" id="editStaffAddress1" placeholder="Address 1" />
              </div>
              <div class="edit-staff-field">
                <label>Address 2</label>
                <input type="text" id="editStaffAddress2" placeholder="Address 2" />
              </div>
              <div class="edit-staff-field">
                <label>Postal Code</label>
                <input type="text" id="editStaffPostalCode" placeholder="90024" />
              </div>
              <div class="edit-staff-field">
                <label>Phone</label>
                <input type="tel" id="editStaffPhone" />
              </div>
              <div class="edit-staff-field">
                <label>Gender</label>
                <div class="edit-staff-radio-group">
                  <label class="edit-staff-radio">
                    <input type="radio" name="editStaffGender" value="female" />
                    <span>Female</span>
                  </label>
                  <label class="edit-staff-radio">
                    <input type="radio" name="editStaffGender" value="male" checked />
                    <span>Male</span>
                  </label>
                  <label class="edit-staff-radio">
                    <input type="radio" name="editStaffGender" value="not-specified" />
                    <span>Not Specified</span>
                  </label>
                </div>
              </div>
            </div>
            
            <div class="edit-staff-section">
              <h3>Pay Rates</h3>
              <div class="edit-staff-pay-rates-table">
                <table>
                  <thead>
                    <tr>
                      <th>Class Type</th>
                      <th>Coaching Pay Rate</th>
                      <th>Coach Check-In Pay</th>
                      <th>Asst. Coaching Pay Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Active Recovery</td>
                      <td><input type="text" value="$ 0.00" /></td>
                      <td><input type="text" value="$ 0.00" /></td>
                      <td><input type="text" value="$ 0.00" /></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          
          <div class="edit-staff-sidebar">
            <div class="edit-staff-avatar">
              <div class="edit-staff-avatar-placeholder">
                ${getInitials(staff?.name || 'Staff Member')}
              </div>
            </div>
            <div class="edit-staff-sidebar-name">${escapeHtml(staff?.name || 'Staff Member')}</div>
            <div class="edit-staff-sidebar-role">
              <span class="role-tag ${staff?.role || 'coach'}">${getRoleDisplay(staff?.role || 'coach')}</span>
            </div>
            <div class="edit-staff-sidebar-menu">
              <a href="#" class="edit-staff-sidebar-link" data-action="working-hours" data-staff-id="${staffId}">
                <i class="bx bx-time"></i>
                <span>Working Hours</span>
              </a>
              <a href="#" class="edit-staff-sidebar-link">
                <i class="bx bx-link"></i>
                <span>My Lead Gen Link</span>
              </a>
              <a href="#" class="edit-staff-sidebar-link delete-link">
                <i class="bx bx-trash"></i>
                <span>Delete Coach</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
  
  // Setup close button
  overlay.querySelector('.edit-staff-close-btn').addEventListener('click', () => {
    overlay.remove();
  });
  
  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });
  
  // Setup Working Hours link
  overlay.querySelector('[data-action="working-hours"]').addEventListener('click', (e) => {
    e.preventDefault();
    overlay.remove(); // Close edit modal
    showWorkingHoursModal(staffId, staff);
  });
}

// Get initials from name
function getInitials(name) {
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

// Show working hours modal
async function showWorkingHoursModal(staffId, staff) {
  if (!supabaseReady || !supabase) {
    alert('Supabase not ready. Please try again.');
    return;
  }

  // Load session types this coach is assigned to
  let sessionTypes = [];
  try {
    const { data: availability, error } = await supabase
      .from('coach_individual_availability')
      .select(`
        session_type_id,
        availability,
        session_type:individual_session_types!coach_individual_availability_session_type_id_fkey(
          id,
          name,
          display_name
        )
      `)
      .eq('coach_id', staffId)
      .eq('is_available', true);

    if (!error && availability) {
      sessionTypes = availability.map(a => ({
        id: a.session_type_id,
        name: a.session_type?.name || '',
        display_name: a.session_type?.display_name || a.session_type?.name || '',
        availability: a.availability || {}
      }));
    }
  } catch (error) {
    console.error('Error loading session types:', error);
  }

  // If no session types, show a message
  if (sessionTypes.length === 0) {
    alert('This coach is not assigned to any individual session types. Please assign them in the Schedule > Individual Sessions configuration first.');
    return;
  }

  // For now, show working hours for the first session type (we can add a selector later)
  const currentSessionType = sessionTypes[0];
  const coachName = staff?.first_name || staff?.name || 'Coach';

  // Create modal
  const overlay = document.createElement('div');
  overlay.className = 'working-hours-modal-overlay';
  overlay.innerHTML = `
    <div class="working-hours-modal">
      <div class="working-hours-header">
        <button class="working-hours-close-btn" type="button">
          <i class="bx bx-x"></i>
        </button>
        <h2 class="working-hours-title">Working hours</h2>
      </div>
      
      <div class="working-hours-content">
        <p class="working-hours-description">
          Set the days and hours that ${escapeHtml(coachName)} is generally available for appointment bookings.
        </p>
        
        <div class="working-hours-session-type">
          <label>Session Type:</label>
          <select id="workingHoursSessionType" class="working-hours-select">
            ${sessionTypes.map(st => `
              <option value="${st.id}" ${st.id === currentSessionType.id ? 'selected' : ''}>
                ${escapeHtml(st.display_name)}
              </option>
            `).join('')}
          </select>
        </div>
        
        <div class="working-hours-days" id="workingHoursDays">
          ${renderWorkingHoursDays(currentSessionType.availability)}
        </div>
        
        <button class="working-hours-save-btn" type="button" data-staff-id="${staffId}">
          Save
        </button>
      </div>
    </div>
  `;

  document.body.appendChild(overlay);

  // Setup event listeners
  setupWorkingHoursListeners(overlay, staffId, sessionTypes);
}

// Render working hours days
function renderWorkingHoursDays(availability) {
  const days = [
    { key: 'sunday', label: 'Sunday', abbr: 'Sun' },
    { key: 'monday', label: 'Monday', abbr: 'Mon' },
    { key: 'tuesday', label: 'Tuesday', abbr: 'Tue' },
    { key: 'wednesday', label: 'Wednesday', abbr: 'Wed' },
    { key: 'thursday', label: 'Thursday', abbr: 'Thu' },
    { key: 'friday', label: 'Friday', abbr: 'Fri' },
    { key: 'saturday', label: 'Saturday', abbr: 'Sat' }
  ];

  return days.map(day => {
    const dayData = availability[day.key] || {};
    
    // Support both formats: timeRanges array or single start/end
    let timeRanges = [];
    if (dayData.timeRanges && Array.isArray(dayData.timeRanges)) {
      timeRanges = dayData.timeRanges;
    } else if (dayData.available && dayData.start && dayData.end) {
      // Convert single range to array format
      timeRanges = [{ start: dayData.start, end: dayData.end }];
    }
    
    const isUnavailable = timeRanges.length === 0 && !dayData.available;

    return `
      <div class="working-hours-day" data-day="${day.key}">
        <div class="working-hours-day-header">
          <span class="working-hours-day-label">${day.label} (${day.abbr})</span>
        </div>
        <div class="working-hours-day-content">
          ${isUnavailable ? `
            <span class="working-hours-unavailable">Unavailable</span>
            <button class="working-hours-add-btn" type="button" data-day="${day.key}">
              <i class="bx bx-plus"></i>
            </button>
          ` : timeRanges.map((range, index) => `
            <div class="working-hours-time-range">
              <input type="time" class="working-hours-start" value="${convertTo24Hour(range.start)}" data-day="${day.key}" data-index="${index}" />
              <span class="working-hours-arrow">→</span>
              <input type="time" class="working-hours-end" value="${convertTo24Hour(range.end)}" data-day="${day.key}" data-index="${index}" />
              ${index === timeRanges.length - 1 ? `
                <button class="working-hours-add-btn" type="button" data-day="${day.key}" style="display: flex;">
                  <i class="bx bx-plus"></i>
                </button>
              ` : `
                <button class="working-hours-add-btn" type="button" data-day="${day.key}" style="display: none;">
                  <i class="bx bx-plus"></i>
                </button>
              `}
              <button class="working-hours-delete-btn" type="button" data-day="${day.key}" data-index="${index}">
                <i class="bx bx-trash"></i>
              </button>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }).join('');
}

// Setup working hours event listeners
function setupWorkingHoursListeners(overlay, staffId, sessionTypes) {
  // Close button
  overlay.querySelector('.working-hours-close-btn').addEventListener('click', () => {
    overlay.remove();
  });

  // Close on overlay click
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.remove();
    }
  });

  // Session type selector
  const sessionTypeSelect = overlay.querySelector('#workingHoursSessionType');
  sessionTypeSelect.addEventListener('change', (e) => {
    const selectedType = sessionTypes.find(st => st.id === e.target.value);
    if (selectedType) {
      const daysContainer = overlay.querySelector('#workingHoursDays');
      daysContainer.innerHTML = renderWorkingHoursDays(selectedType.availability || {});
      // Reset listeners flag and re-setup
      daysContainer.removeAttribute('data-listeners-attached');
      setupDayListeners(overlay, staffId);
    }
  });

  // Add time range buttons
  setupDayListeners(overlay, staffId);

  // Save button
  overlay.querySelector('.working-hours-save-btn').addEventListener('click', async () => {
    await saveWorkingHours(overlay, staffId, sessionTypes);
  });
}

// Setup day-specific listeners using event delegation to avoid duplicate listeners
function setupDayListeners(overlay, staffId) {
  const daysContainer = overlay.querySelector('#workingHoursDays');
  if (!daysContainer) return;
  
  // Check if listeners are already attached
  if (daysContainer.dataset.listenersAttached === 'true') {
    return; // Already set up
  }
  
  // Mark as having listeners attached
  daysContainer.dataset.listenersAttached = 'true';
  
  // Use event delegation - attach listeners to the container (only once)
  daysContainer.addEventListener('click', (e) => {
    // Handle add button clicks
    if (e.target.closest('.working-hours-add-btn')) {
      e.stopPropagation();
      e.preventDefault();
      const btn = e.target.closest('.working-hours-add-btn');
      const day = btn.dataset.day;
      addTimeRange(overlay, day);
      return;
    }
    
    // Handle delete button clicks
    if (e.target.closest('.working-hours-delete-btn')) {
      e.stopPropagation();
      e.preventDefault();
      const btn = e.target.closest('.working-hours-delete-btn');
      const day = btn.dataset.day;
      const index = parseInt(btn.dataset.index);
      if (!isNaN(index)) {
        deleteTimeRange(overlay, day, index);
      }
      return;
    }
  });
}

// Add a new time range for a day
function addTimeRange(overlay, day) {
  const dayEl = overlay.querySelector(`.working-hours-day[data-day="${day}"]`);
  const contentEl = dayEl.querySelector('.working-hours-day-content');
  
  // Remove "Unavailable" text if present
  const unavailableEl = contentEl.querySelector('.working-hours-unavailable');
  if (unavailableEl) {
    unavailableEl.remove();
  }

  // Get existing ranges count
  const existingRanges = contentEl.querySelectorAll('.working-hours-time-range');
  const newIndex = existingRanges.length;

  // Create new time range
  const rangeEl = document.createElement('div');
  rangeEl.className = 'working-hours-time-range';
  rangeEl.innerHTML = `
    <input type="time" class="working-hours-start" value="09:00" data-day="${day}" data-index="${newIndex}" />
    <span class="working-hours-arrow">→</span>
    <input type="time" class="working-hours-end" value="17:00" data-day="${day}" data-index="${newIndex}" />
    <button class="working-hours-add-btn" type="button" data-day="${day}" style="display: flex;">
      <i class="bx bx-plus"></i>
    </button>
    <button class="working-hours-delete-btn" type="button" data-day="${day}" data-index="${newIndex}">
      <i class="bx bx-trash"></i>
    </button>
  `;

  contentEl.appendChild(rangeEl);
  
  // Update add button visibility - only show on last range
  const allRanges = contentEl.querySelectorAll('.working-hours-time-range');
  allRanges.forEach((range, idx) => {
    const addBtn = range.querySelector('.working-hours-add-btn');
    if (addBtn) {
      if (idx === allRanges.length - 1) {
        addBtn.style.display = 'flex';
      } else {
        addBtn.style.display = 'none';
      }
    }
  });
}

// Delete a time range
function deleteTimeRange(overlay, day, index) {
  const dayEl = overlay.querySelector(`.working-hours-day[data-day="${day}"]`);
  if (!dayEl) return;
  
  const contentEl = dayEl.querySelector('.working-hours-day-content');
  if (!contentEl) return;
  
  const ranges = contentEl.querySelectorAll('.working-hours-time-range');
  
  if (ranges.length > 0 && index >= 0 && index < ranges.length) {
    ranges[index].remove();
    
    // Re-index remaining ranges
    const remainingRanges = contentEl.querySelectorAll('.working-hours-time-range');
    remainingRanges.forEach((range, newIndex) => {
      range.querySelectorAll('input, button').forEach(el => {
        if (el.dataset.index !== undefined) {
          el.dataset.index = newIndex;
        }
      });
    });

    // If no ranges left, show "Unavailable"
    if (remainingRanges.length === 0) {
      const unavailableEl = document.createElement('span');
      unavailableEl.className = 'working-hours-unavailable';
      unavailableEl.textContent = 'Unavailable';
      const addBtn = document.createElement('button');
      addBtn.className = 'working-hours-add-btn';
      addBtn.type = 'button';
      addBtn.dataset.day = day;
      addBtn.innerHTML = '<i class="bx bx-plus"></i>';
      contentEl.appendChild(unavailableEl);
      contentEl.appendChild(addBtn);
    } else {
      // Update add button visibility - only show on last range
      remainingRanges.forEach((range, idx) => {
        const addBtn = range.querySelector('.working-hours-add-btn');
        if (addBtn) {
          if (idx === remainingRanges.length - 1) {
            addBtn.style.display = 'flex';
          } else {
            addBtn.style.display = 'none';
          }
        }
      });
    }
  }
}

// Save working hours
async function saveWorkingHours(overlay, staffId, sessionTypes) {
  if (!supabaseReady || !supabase) {
    alert('Supabase not ready. Please try again.');
    return;
  }

  const sessionTypeId = overlay.querySelector('#workingHoursSessionType').value;
  const selectedType = sessionTypes.find(st => st.id === sessionTypeId);

  if (!selectedType) {
    alert('Please select a session type.');
    return;
  }

  // Collect availability data
  const availability = {};
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

  days.forEach(day => {
    const dayEl = overlay.querySelector(`.working-hours-day[data-day="${day}"]`);
    const ranges = dayEl.querySelectorAll('.working-hours-time-range');
    
    if (ranges.length === 0) {
      availability[day] = { available: false };
    } else {
      const timeRanges = Array.from(ranges).map(range => {
        const start = range.querySelector('.working-hours-start').value;
        const end = range.querySelector('.working-hours-end').value;
        return {
          start: convertTo12Hour(start),
          end: convertTo12Hour(end)
        };
      });
      
      availability[day] = {
        available: true,
        timeRanges: timeRanges
      };
    }
  });

  try {
    // Update or create coach availability
    const { data, error } = await supabase
      .from('coach_individual_availability')
      .upsert({
        coach_id: staffId,
        session_type_id: sessionTypeId,
        availability: availability,
        is_available: true
      }, {
        onConflict: 'coach_id,session_type_id'
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving working hours:', error);
      alert(`Error saving working hours: ${error.message}`);
      return;
    }

    alert('Working hours saved successfully!');
    overlay.remove();
  } catch (error) {
    console.error('Error saving working hours:', error);
    alert(`Error saving working hours: ${error.message}`);
  }
}

// Convert 24-hour time to 12-hour format
function convertTo12Hour(time24) {
  if (!time24) return '9:00 AM';
  
  const [hours, minutes] = time24.split(':').map(Number);
  const period = hours >= 12 ? 'PM' : 'AM';
  const displayHours = hours % 12 || 12;
  return `${displayHours}:${String(minutes).padStart(2, '0')} ${period}`;
}

// Convert 12-hour time to 24-hour format
function convertTo24Hour(time12) {
  if (!time12) return '09:00';
  
  // Try 24-hour format first
  const match24 = time12.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    return time12;
  }
  
  // Try 12-hour format
  const match12 = time12.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (match12) {
    let hours = parseInt(match12[1]);
    const minutes = match12[2];
    const period = match12[3].toUpperCase();
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return `${String(hours).padStart(2, '0')}:${minutes}`;
  }
  
  return '09:00';
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePeoplePage);
} else {
  initializePeoplePage();
}
