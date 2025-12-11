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
      console.log('🔍 Loading linked parent accounts...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !session.user) {
        console.log('No active session');
        switcherName.textContent = 'Not logged in';
        return;
      }

      const currentUserId = session.user.id;
      console.log('🔍 Current user ID:', currentUserId);
      console.log('💡 Note: In player view, user is still authenticated as parent');
      console.log('💡 So we can fetch the parent profile directly using currentUserId');

      // When in player view, the user is still authenticated as the parent
      // So we can fetch the parent's profile directly
      console.log('🔍 Fetching parent profile...');
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, role')
        .eq('id', currentUserId)
        .eq('role', 'parent')
        .single();
      
      console.log('📊 Profile query result:', { profile, profileError });
      
      if (profileError) {
        console.error('❌ Error fetching parent profile:', profileError);
        console.error('❌ Error code:', profileError.code);
        console.error('❌ Error message:', profileError.message);
        switcherName.textContent = 'Error loading';
        switcherLoading.textContent = `Error: ${profileError.message || 'Failed to load profile'}`;
        return;
      }

      if (!profile) {
        console.warn('⚠️ No parent profile found');
        switcherName.textContent = 'No linked accounts';
        switcherLoading.textContent = 'No linked parent account found.';
        return;
      }
      
      // Create linked account from profile
      linkedAccounts = [{
        id: profile.id,
        name: `${profile.first_name || ''} ${profile.last_name || ''}`.trim() || 'Parent',
        role: profile.role || 'parent'
      }];

      console.log('✅ Extracted linked account:', linkedAccounts);

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

    console.log(`Switching to ${account.role} account: ${account.name}`);
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

