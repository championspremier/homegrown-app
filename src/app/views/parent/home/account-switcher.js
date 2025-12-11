// Account Switcher for Parent View
// Shows player account(s) and allows switching to player view

import { initSupabase } from '../../../../auth/config/supabase.js';

console.log('📦 Parent account switcher module loaded');

(async function() {
  'use strict';
  
  console.log('🚀 Parent account switcher IIFE executing...');

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
  console.log('🔍 Initializing Supabase for account switcher...');
  try {
    supabase = await initSupabase();
    if (!supabase) {
      console.error('❌ Failed to initialize Supabase');
      switcherName.textContent = 'Not available';
      return;
    }
    console.log('✅ Supabase initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing Supabase:', error);
    switcherName.textContent = 'Not available';
    return;
  }

  // Fetch linked player accounts
  async function loadLinkedAccounts() {
    try {
      console.log('🔍 Loading linked player accounts...');
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('❌ Session error:', sessionError);
        switcherName.textContent = 'Session error';
        return;
      }
      
      if (!session || !session.user) {
        console.log('⚠️ No active session');
        switcherName.textContent = 'Not logged in';
        return;
      }

      const currentUserId = session.user.id;
      console.log('🔍 Current user ID:', currentUserId);

      // Query parent_player_relationships to find linked players
      console.log('🔍 Querying parent_player_relationships table...');
      const { data: relationships, error } = await supabase
        .from('parent_player_relationships')
        .select('player_id, parent_id, relationship_type')
        .eq('parent_id', currentUserId);

      console.log('📊 Relationships query result:', { relationships, error });

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
        console.log('⚠️ No relationships found for parent:', currentUserId);
        console.log('💡 This could mean:');
        console.log('   1. The relationship was not created during signup');
        console.log('   2. The relationship exists but with a different parent_id');
        console.log('   3. RLS policies are blocking the query');
        console.log('💡 To fix: Check the parent_player_relationships table in Supabase');
        console.log('💡 You may need to manually create the relationship in Supabase');
        switcherName.textContent = 'No linked accounts';
        switcherLoading.textContent = 'No linked player accounts found. The relationship may not have been created during signup. Check Supabase.';
        return;
      }
      
      console.log('✅ Found relationships:', relationships.length);

      // Now fetch player profiles separately
      const playerIds = relationships.map(rel => rel.player_id);
      console.log('🔍 Fetching profiles for player IDs:', playerIds);
      
      if (playerIds.length === 0) {
        console.warn('⚠️ No player IDs found in relationships');
        switcherName.textContent = 'No linked accounts';
        switcherLoading.textContent = 'No player IDs found in relationships.';
        return;
      }
      
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, player_name, role')
        .in('id', playerIds)
        .eq('role', 'player');
      
      console.log('📊 Profiles query result:', { profiles, profilesError });
      
      if (profilesError) {
        console.error('❌ Error fetching player profiles:', profilesError);
        console.error('❌ Error code:', profilesError.code);
        console.error('❌ Error message:', profilesError.message);
        switcherName.textContent = 'Error loading';
        switcherLoading.textContent = `Error: ${profilesError.message || 'Failed to load profiles'}`;
        return;
      }

      // Extract player profiles
      console.log('🔍 Extracting player profiles...');
      if (!profiles || profiles.length === 0) {
        console.warn('⚠️ No player profiles found');
        switcherName.textContent = 'No linked accounts';
        switcherLoading.textContent = 'No linked player accounts found.';
        return;
      }
      
      linkedAccounts = profiles.map(profile => ({
        id: profile.id,
        name: profile.player_name || 'Player',
        role: profile.role || 'player'
      }));

      console.log('✅ Extracted linked accounts:', linkedAccounts);

      if (linkedAccounts.length === 0) {
        console.warn('⚠️ No valid player profiles found in relationships');
        switcherName.textContent = 'No linked accounts';
        switcherLoading.textContent = 'No linked player accounts found.';
        return;
      }

      // Update UI
      const firstPlayer = linkedAccounts[0];
      console.log('✅ Setting switcher name to:', firstPlayer.name);
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

