// Account Switcher for Player View
// Shows parent account(s) and allows switching to parent view

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
      console.error('Failed to initialize Supabase');
      switcherName.textContent = 'Not available';
      return;
    }
  } catch (error) {
    console.error('Error initializing Supabase:', error);
    switcherName.textContent = 'Not available';
    return;
  }

  // Fetch linked parent accounts
  async function loadLinkedAccounts() {
    try {
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        switcherName.textContent = 'Not logged in';
        return;
      }

      const currentUserId = session.user.id;

      // First, check if the current user is a parent or a player
      const { data: currentProfile, error: currentProfileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('id', currentUserId)
        .single();
      
      if (currentProfileError || !currentProfile) {
        console.error('❌ Error fetching current profile:', currentProfileError);
        switcherName.textContent = 'Error loading';
        return;
      }

      let parentProfile = null;

      // If current user is a parent, use their profile directly
      if (currentProfile.role === 'parent') {
        parentProfile = currentProfile;
      } else if (currentProfile.role === 'player') {
        // If current user is a player, find their parent through relationships
        const { data: relationship, error: relationshipError } = await supabase
          .from('parent_player_relationships')
          .select('parent_id')
          .eq('player_id', currentUserId)
          .single();
        
        if (relationshipError || !relationship) {
          console.warn('⚠️ No parent relationship found for player');
          switcherName.textContent = currentProfile.first_name || 'Player';
          switcherLoading.style.display = 'none';
          return;
        }

        // Fetch the parent's profile
        const { data: parent, error: parentError } = await supabase
          .from('profiles')
          .select('id, first_name, last_name, role')
          .eq('id', relationship.parent_id)
          .eq('role', 'parent')
          .single();
        
        if (parentError || !parent) {
          console.error('❌ Error fetching parent profile:', parentError);
          switcherName.textContent = currentProfile.first_name || 'Player';
          switcherLoading.style.display = 'none';
          return;
        }

        parentProfile = parent;
      } else {
        // Unknown role
        switcherName.textContent = currentProfile.first_name || 'User';
        switcherLoading.style.display = 'none';
        return;
      }

      if (!parentProfile) {
        console.warn('⚠️ No parent profile found');
        switcherName.textContent = 'No linked accounts';
        switcherLoading.textContent = 'No linked parent account found.';
        return;
      }
      
      // Create linked account from parent profile
      linkedAccounts = [{
        id: parentProfile.id,
        name: `${parentProfile.first_name || ''} ${parentProfile.last_name || ''}`.trim() || 'Parent',
        role: parentProfile.role || 'parent'
      }];


      // Update UI
      const firstParent = linkedAccounts[0];
      switcherName.textContent = firstParent.name;

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

  // Switch to parent account
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
})();

