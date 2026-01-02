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

      // First, check if the current user is actually a parent or a player
      const { data: currentProfile, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('id', currentUserId)
        .single();
      
      if (profileError || !currentProfile) {
        switcherName.textContent = 'Error loading';
        return;
      }

      let actualParentId = currentUserId;

      // If current user is a player, find their parent through relationships
      if (currentProfile.role === 'player') {
        const { data: relationship, error: relationshipError } = await supabase
          .from('parent_player_relationships')
          .select('parent_id')
          .eq('player_id', currentUserId)
          .single();
        
        if (relationshipError) {
          console.error('Error finding parent relationship:', relationshipError);
          switcherName.textContent = currentProfile.first_name || 'Player';
          switcherLoading.textContent = `Error: ${relationshipError.message || 'Failed to find parent'}`;
          return;
        }
        
        if (!relationship) {
          switcherName.textContent = currentProfile.first_name || 'Player';
          switcherLoading.textContent = 'No parent account linked.';
          return;
        }

        actualParentId = relationship.parent_id;
        console.log(`Player ${currentUserId} is linked to parent ${actualParentId}`);
      } else if (currentProfile.role !== 'parent') {
        switcherName.textContent = currentProfile.first_name || 'User';
        switcherLoading.style.display = 'none';
        return;
      }

      // Query parent_player_relationships to find ALL linked players using the actual parent ID
      // This should return ALL players linked to this parent, not just the one currently logged in
      // When a player is logged in, the RLS policy should allow them to see all relationships
      // for their linked parent via the get_player_parent_id() function
      const { data: relationships, error } = await supabase
        .from('parent_player_relationships')
        .select('player_id, parent_id, relationship_type')
        .eq('parent_id', actualParentId);

      if (error) {
        console.error('Error loading relationships:', error);
        // Check if it's an RLS policy issue
        if (error.code === '42501' || error.message?.includes('row-level security')) {
          switcherLoading.textContent = 'Permission denied. Check RLS policies.';
        } else if (error.code === '42P17' || error.message?.includes('infinite recursion')) {
          switcherLoading.textContent = 'RLS recursion error. The migration may not have been applied correctly.';
        } else {
          switcherLoading.textContent = `Error: ${error.message || 'Failed to load accounts'}`;
        }
        switcherName.textContent = 'Error loading';
        return;
      }
      
      // Debug: Log what we found
      if (relationships) {
        console.log(`Found ${relationships.length} relationships for parent ${actualParentId}`);
        console.log('Relationship details:', relationships);
      }

      if (!relationships || relationships.length === 0) {
        switcherName.textContent = 'No linked accounts';
        switcherLoading.textContent = 'No linked player accounts found. The relationships may not have been created. Check Supabase database for parent_player_relationships table.';
        return;
      }
      
      // Now fetch player profiles separately for ALL linked players
      const playerIds = relationships.map(rel => rel.player_id);
      console.log(`Extracted ${playerIds.length} player IDs:`, playerIds);
      
      if (playerIds.length === 0) {
        switcherName.textContent = 'No linked accounts';
        switcherLoading.textContent = 'No player IDs found in relationships.';
        return;
      }
      
      // Fetch all player profiles - don't filter by role here as we already know they're players
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .in('id', playerIds);
      
      if (profilesError) {
        console.error('Error loading profiles:', profilesError);
        switcherName.textContent = 'Error loading';
        switcherLoading.textContent = `Error: ${profilesError.message || 'Failed to load profiles'}`;
        return;
      }

      console.log(`Fetched ${profiles?.length || 0} profiles:`, profiles);

      // Filter to only players and extract player profiles
      const playerProfiles = (profiles || []).filter(p => p.role === 'player');
      console.log(`Filtered to ${playerProfiles.length} player profiles:`, playerProfiles);
      
      if (playerProfiles.length === 0) {
        switcherName.textContent = 'No linked accounts';
        switcherLoading.textContent = 'No player profiles found for linked accounts.';
        return;
      }
      
      // If we found fewer profiles than relationships, some players might not have profiles yet
      if (playerProfiles.length < relationships.length) {
        console.warn(`Found ${playerProfiles.length} profiles but ${relationships.length} relationships. Some players may not have profiles yet.`);
      }
      
      // When viewing as parent, show ALL players (including the one you logged in as)
      // because you're acting as the parent and can switch to any player account
      const currentRole = localStorage.getItem('hg-user-role');
      const isViewingAsParent = currentRole === 'parent';
      
      linkedAccounts = playerProfiles
        // Only filter out the current player if they're NOT viewing as parent
        // When viewing as parent, show all players so they can switch between them
        .filter(profile => {
          // If viewing as parent, show all players (including the logged-in one)
          if (isViewingAsParent) {
            return true; // Show all players when viewing as parent
          }
          // If not viewing as parent and current user is a player, don't show them
          if (currentProfile.role === 'player' && profile.id === currentUserId) {
            return false;
          }
          return true;
        })
        .map(profile => {
        const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Player';
        return {
          id: profile.id,
          name: fullName,
          role: profile.role || 'player'
        };
      });

      console.log(`Created ${linkedAccounts.length} linked accounts:`, linkedAccounts);

      if (linkedAccounts.length === 0) {
        switcherName.textContent = 'No linked accounts';
        switcherLoading.textContent = 'No linked player accounts found.';
        return;
      }

      // Update UI - show parent name when viewing as parent, show first player when viewing as player
      let displayName = '';
      const firstPlayer = linkedAccounts[0];
      // currentRole is already declared above, reuse it
      
      if (currentProfile.role === 'player') {
        // Player is logged in - check if they're viewing as parent or as player
        if (currentRole === 'parent') {
          // Viewing as parent - show parent name (don't add parent to dropdown, already viewing as parent)
          const { data: parentProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', actualParentId)
            .single();
          
          if (parentProfile) {
            displayName = `${parentProfile.first_name || ''} ${parentProfile.last_name || ''}`.trim() || 'Parent';
          } else {
            displayName = firstPlayer.name;
          }
        } else {
          // Viewing as player - show player name and add parent option to dropdown
          displayName = currentProfile.first_name || 'Player';
          // Add parent account to the beginning of linkedAccounts so they can switch to parent view
          const { data: parentProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', actualParentId)
            .single();
          
          if (parentProfile) {
            const parentName = `${parentProfile.first_name || ''} ${parentProfile.last_name || ''}`.trim() || 'Parent';
            linkedAccounts.unshift({
              id: actualParentId,
              name: parentName,
              role: 'parent'
            });
          }
        }
      } else {
        // Parent is logged in - show first player
        displayName = firstPlayer.name;
      }
      
      switcherName.textContent = displayName;

      // Build dropdown items
      switcherItems.innerHTML = '';
      console.log(`Building dropdown for ${linkedAccounts.length} accounts`);
      linkedAccounts.forEach((account, index) => {
        console.log(`Creating dropdown item ${index + 1}:`, account);
        const item = document.createElement('button');
        item.className = 'account-switcher-item';
        item.type = 'button';
        item.textContent = account.name;
        item.setAttribute('data-account-id', account.id);
        item.addEventListener('click', () => switchToAccount(account));
        switcherItems.appendChild(item);
      });

      console.log(`Dropdown built with ${switcherItems.children.length} items`);
      switcherLoading.style.display = 'none';
      switcherItems.style.display = 'block';

    } catch (error) {
      switcherName.textContent = 'Error loading';
      switcherLoading.textContent = 'An error occurred. Please try again.';
    }
  }

  // Switch to account (player or parent)
  function switchToAccount(account) {
    if (!window.setCurrentRole) {
      console.error('setCurrentRole function not available');
      return;
    }

    // If switching to a player, store the selected player ID
    // If switching to parent, clear the selected player ID
    if (account.role === 'player' && account.id) {
      localStorage.setItem('selectedPlayerId', account.id);
    } else if (account.role === 'parent') {
      localStorage.removeItem('selectedPlayerId');
    }

    window.setCurrentRole(account.role);
    
    // Dispatch custom event to notify other components
    window.dispatchEvent(new CustomEvent('accountSwitched', { 
      detail: { role: account.role, accountId: account.id } 
    }));
    
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

