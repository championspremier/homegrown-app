// Account Switcher for Parent View
// Shows player account(s) and allows switching to player view

import { initSupabase } from '../../../../auth/config/supabase.js';


(async function() {
  'use strict';
  

  const switcherBtn = document.getElementById('accountSwitcherBtn');
  const switcherDropdown = document.getElementById('accountSwitcherDropdown');
  const switcherName = document.getElementById('accountSwitcherName');
  const switcherLoading = document.getElementById('accountSwitcherLoading');
  const switcherItems = document.getElementById('accountSwitcherItems');

  if (!switcherBtn || !switcherDropdown || !switcherName) {
    console.warn('Account switcher elements not found');
    return;
  }

  let supabase;
  let linkedAccounts = [];

  // Initialize Supabase
  try {
    supabase = await initSupabase();
    if (!supabase) {
      console.error('❌ Failed to initialize Supabase');
      switcherName.textContent = 'Not available';
      return;
    }
  } catch (error) {
    console.error('❌ Error initializing Supabase:', error);
    switcherName.textContent = 'Not available';
    return;
  }

  // Fetch linked player accounts
  async function loadLinkedAccounts() {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        switcherName.textContent = 'Session error';
        return;
      }
      
      if (!session || !session.user) {
        switcherName.textContent = 'Not logged in';
        return;
      }

      const currentUserId = session.user.id;

      // Query parent_player_relationships to find linked players
      const { data: relationships, error } = await supabase
        .from('parent_player_relationships')
        .select('player_id, parent_id, relationship_type')
        .eq('parent_id', currentUserId);

      
      // Log more details if no relationships found
      if (!error && (!relationships || relationships.length === 0)) {
      }

      if (error) {
        console.error('❌ Error fetching relationships:', error);
        console.error('❌ Error code:', error.code);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error details:', error.details);
        console.error('❌ Error hint:', error.hint);
        
        // Check if it's an RLS policy issue
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          switcherLoading.textContent = 'Permission denied. Check RLS policies.';
        } else {
          switcherLoading.textContent = `Error: ${error.message || 'Failed to load accounts'}`;
        }
        switcherName.textContent = 'Error loading';
        return;
      }

      if (!relationships || relationships.length === 0) {
        switcherName.textContent = 'No linked accounts';
        switcherLoading.textContent = 'No linked player accounts found. The relationship may not have been created during signup. Check Supabase.';
        return;
      }
      

      // Now fetch player profiles separately
      const playerIds = relationships.map(rel => rel.player_id);
      
      if (playerIds.length === 0) {
        console.warn('⚠️ No player IDs found in relationships');
        switcherName.textContent = 'No linked accounts';
        switcherLoading.textContent = 'No player IDs found in relationships.';
        return;
      }
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .in('id', playerIds)
        .eq('role', 'player');
      
      
      if (profilesError) {
        console.error('❌ Error fetching player profiles:', profilesError);
        console.error('❌ Error code:', profilesError.code);
        console.error('❌ Error message:', profilesError.message);
        switcherName.textContent = 'Error loading';
        switcherLoading.textContent = `Error: ${profilesError.message || 'Failed to load profiles'}`;
        return;
      }

      // Extract player profiles
      if (!profiles || profiles.length === 0) {
        console.warn('⚠️ No player profiles found');
        switcherName.textContent = 'No linked accounts';
        switcherLoading.textContent = 'No linked player accounts found.';
        return;
      }
      
      linkedAccounts = profiles.map(profile => {
        const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Player';
        return {
          id: profile.id,
          name: fullName,
          role: profile.role || 'player'
        };
      });


      if (linkedAccounts.length === 0) {
        console.warn('⚠️ No valid player profiles found in relationships');
        switcherName.textContent = 'No linked accounts';
        switcherLoading.textContent = 'No linked player accounts found.';
        return;
      }

      // Update UI
      const firstPlayer = linkedAccounts[0];
      switcherName.textContent = firstPlayer.name;

      // Build dropdown items
      switcherItems.innerHTML = '';
      linkedAccounts.forEach(account => {
        const item = document.createElement('button');
        item.className = 'account-switcher-item';
        item.type = 'button';
        item.textContent = account.name;
        item.addEventListener('click', () => switchToAccount(account));
        switcherItems.appendChild(item);
      });

      switcherLoading.style.display = 'none';
      switcherItems.style.display = 'block';

    } catch (error) {
      console.error('Error loading linked accounts:', error);
      switcherName.textContent = 'Error loading';
    }
  }

  // Switch to player account
  function switchToAccount(account) {
    if (!window.setCurrentRole) {
      console.error('setCurrentRole function not available');
      return;
    }

    window.setCurrentRole(account.role);
    closeDropdown();
  }

  // Toggle dropdown
  function toggleDropdown() {
    const isOpen = switcherDropdown.classList.contains('is-open');
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }

  function openDropdown() {
    switcherDropdown.classList.add('is-open');
    switcherBtn.setAttribute('aria-expanded', 'true');
    const icon = switcherBtn.querySelector('.account-switcher-icon');
    if (icon) {
      icon.classList.remove('bx-chevron-down');
      icon.classList.add('bx-chevron-up');
    }
  }

  function closeDropdown() {
    switcherDropdown.classList.remove('is-open');
    switcherBtn.setAttribute('aria-expanded', 'false');
    const icon = switcherBtn.querySelector('.account-switcher-icon');
    if (icon) {
      icon.classList.remove('bx-chevron-up');
      icon.classList.add('bx-chevron-down');
    }
  }

  // Event listeners
  switcherBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleDropdown();
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!switcherBtn.contains(e.target) && !switcherDropdown.contains(e.target)) {
      closeDropdown();
    }
  });

  // Load accounts on page load
  await loadLinkedAccounts();
  
  // Expose loadLinkedAccounts globally so it can be called from profile page
  window.loadLinkedAccounts = loadLinkedAccounts;
})();

