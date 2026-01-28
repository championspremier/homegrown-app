// Account Switcher for Parent View
// Shows player account(s) and allows switching to player view

import { initSupabase } from '../../../../auth/config/supabase.js';


(async function() {
  'use strict';
  

  // Wait for DOM to be ready
  let switcherBtn, switcherDropdown, switcherName, switcherLoading, switcherItems, homeHeaderLogo;
  
  // Retry getting elements with a small delay
  const maxRetries = 10;
  let retryCount = 0;
  
  function getElements() {
    return new Promise((resolve) => {
      function tryGetElements() {
        switcherBtn = document.getElementById('accountSwitcherBtn');
        switcherDropdown = document.getElementById('accountSwitcherDropdown');
        switcherName = document.getElementById('accountSwitcherName');
        switcherLoading = document.getElementById('accountSwitcherLoading');
        switcherItems = document.getElementById('accountSwitcherItems');
        homeHeaderLogo = document.getElementById('homeHeaderLogo');
        
        if (!switcherBtn || !switcherDropdown || !switcherName) {
          if (retryCount < maxRetries) {
            retryCount++;
            setTimeout(tryGetElements, 50);
          } else {
            console.warn('Account switcher elements not found after retries');
            resolve(false);
          }
        } else {
          resolve(true);
        }
      }
      tryGetElements();
    });
  }
  
  const elementsReady = await getElements();
  if (!elementsReady) {
    return;
  }
  
  // Hide dropdown and old button initially
  // Always get fresh references in case elements were moved
  const currentDropdown = document.getElementById('accountSwitcherDropdown');
  const currentBtn = document.getElementById('accountSwitcherBtn');
  const currentLogo = document.getElementById('homeHeaderLogo');
  const currentLoading = document.getElementById('accountSwitcherLoading');
  const currentItems = document.getElementById('accountSwitcherItems');
  
  if (currentDropdown) {
    currentDropdown.classList.remove('is-open');
    currentDropdown.style.display = 'none'; // Ensure it's hidden
  }
  
  // Hide the old account switcher button (logo is now the primary control)
  if (currentBtn) {
    currentBtn.style.display = 'none';
  }
  
  // Ensure logo is not active initially
  if (currentLogo) {
    currentLogo.classList.remove('active');
  }
  
  // Ensure loading is hidden and items are shown if they exist
  if (currentLoading) {
    currentLoading.style.display = 'none';
  }
  if (currentItems) {
    currentItems.style.display = 'block';
  }
  
  // Update cached references
  switcherDropdown = currentDropdown;
  switcherBtn = currentBtn;
  homeHeaderLogo = currentLogo;
  switcherLoading = currentLoading;
  switcherItems = currentItems;

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
      // Find the active dropdown first (same logic as below)
      const mainContent = document.querySelector('.main-content');
      const contentArea = document.querySelector('.content-area');
      let activeDropdown = null;
      if (mainContent) {
        activeDropdown = mainContent.querySelector('#accountSwitcherDropdown');
      }
      if (!activeDropdown && contentArea) {
        activeDropdown = contentArea.querySelector('#accountSwitcherDropdown');
      }
      if (!activeDropdown) {
        activeDropdown = document.getElementById('accountSwitcherDropdown');
      }
      
      // Show loading initially - only for the active dropdown
      if (activeDropdown) {
        const initialLoading = activeDropdown.querySelector('#accountSwitcherLoading');
        const initialItems = activeDropdown.querySelector('#accountSwitcherItems');
        if (initialLoading) {
          initialLoading.style.setProperty('display', 'block', 'important');
        }
        if (initialItems) {
          initialItems.style.setProperty('display', 'none', 'important');
        }
      }
      
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
          .maybeSingle();
        
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
        // Parent is logged in - check if they're viewing as parent or as player
        if (currentRole === 'parent') {
          // Viewing as parent - show parent name, but DON'T add parent to dropdown
          // (parent is already viewing as themselves, so only show players)
          const { data: parentProfile } = await supabase
            .from('profiles')
            .select('first_name, last_name')
            .eq('id', actualParentId)
            .single();
          
          if (parentProfile) {
            displayName = `${parentProfile.first_name || ''} ${parentProfile.last_name || ''}`.trim() || 'Parent';
          } else {
            displayName = firstPlayer?.name || 'Parent';
          }
          // Do NOT add parent to dropdown - only show players when viewing as parent
        } else {
          // Viewing as player - show player name and add parent to dropdown
          displayName = firstPlayer?.name || 'Player';
          // Add parent account to the beginning of linkedAccounts so they can switch back to parent view
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
      }
      
      switcherName.textContent = displayName;

      // Build dropdown items - ALWAYS get fresh references from DOM
      // (elements might have been moved when header was repositioned)
      // IMPORTANT: Find the ACTIVE dropdown (the one in main-content, not content-area)
      // and remove any duplicate dropdowns
      // Reuse mainContent and contentArea from earlier in the function (declared at line 108)
      
      // Find the active dropdown (prefer the one in main-content, as that's where the header is moved to)
      // Search within home-header first, since that's where the dropdown actually is
      let currentDropdown = null;
      if (mainContent) {
        const headerInMain = mainContent.querySelector('.home-header');
        if (headerInMain) {
          currentDropdown = headerInMain.querySelector('#accountSwitcherDropdown');
        }
        // Also search directly in main-content (in case header structure is different)
        if (!currentDropdown) {
          currentDropdown = mainContent.querySelector('#accountSwitcherDropdown');
        }
      }
      // Fallback to content-area if not found in main-content
      if (!currentDropdown && contentArea) {
        const headerInContent = contentArea.querySelector('.home-header');
        if (headerInContent) {
          currentDropdown = headerInContent.querySelector('#accountSwitcherDropdown');
        }
        // Also search directly in content-area
        if (!currentDropdown) {
          currentDropdown = contentArea.querySelector('#accountSwitcherDropdown');
        }
      }
      // Final fallback to getElementById
      if (!currentDropdown) {
        currentDropdown = document.getElementById('accountSwitcherDropdown');
      }
      
      if (!currentDropdown) {
        console.error('accountSwitcherDropdown element not found!');
        return;
      }
      
      // Remove duplicate dropdowns - keep only the active one
      // Since IDs must be unique, any duplicate is an error and should be removed
      const allDropdowns = document.querySelectorAll('#accountSwitcherDropdown');
      if (allDropdowns.length > 1) {
        // Silently clean up duplicates (this can happen during account switches)
        let removedCount = 0;
        allDropdowns.forEach((dropdown) => {
          const isActive = dropdown === currentDropdown;
          
          // Remove any dropdown that's not the active one
          if (!isActive) {
            dropdown.remove();
            removedCount++;
          }
        });
        // Only log if something unexpected happened
        const remaining = document.querySelectorAll('#accountSwitcherDropdown').length;
        if (remaining === 0) {
          console.error('ERROR: All dropdowns were removed! This should not happen.');
        } else if (remaining > 1) {
          console.warn(`WARNING: ${remaining} dropdown(s) still remain after cleanup.`);
        }
      }
      
      const currentItems = currentDropdown.querySelector('#accountSwitcherItems');
      const currentLoading = currentDropdown.querySelector('#accountSwitcherLoading');
      
      if (!currentItems) {
        console.error('accountSwitcherItems element not found!');
        return;
      }
      
      // Clear existing items
      currentItems.innerHTML = '';
      console.log(`Building dropdown for ${linkedAccounts.length} accounts`);
      
      linkedAccounts.forEach((account, index) => {
        console.log(`Creating dropdown item ${index + 1}:`, account);
        const item = document.createElement('button');
        item.className = 'account-switcher-item';
        item.type = 'button';
        item.textContent = account.name;
        item.setAttribute('data-account-id', account.id);
        item.addEventListener('click', () => switchToAccount(account));
        currentItems.appendChild(item);
      });

      console.log(`Dropdown built with ${currentItems.children.length} items`);
      
      // Hide loading and show items - only update the active dropdown's elements
      // (duplicates have been removed, so we only need to update the active one)
      if (currentLoading) {
        currentLoading.style.setProperty('display', 'none', 'important');
        currentLoading.style.setProperty('visibility', 'hidden', 'important');
        currentLoading.style.setProperty('opacity', '0', 'important');
        console.log('Loading element hidden - display:', currentLoading.style.display, 'computed:', window.getComputedStyle(currentLoading).display);
      }
      if (currentItems) {
        currentItems.style.setProperty('display', 'block', 'important');
        currentItems.style.setProperty('visibility', 'visible', 'important');
        currentItems.style.setProperty('opacity', '1', 'important');
        console.log('Items element shown, children count:', currentItems.children.length, 'display:', currentItems.style.display, 'computed:', window.getComputedStyle(currentItems).display);
      }
      
      // Update cached references for future use
      switcherLoading = currentLoading;
      switcherItems = currentItems;

    } catch (error) {
      switcherName.textContent = 'Error loading';
      switcherLoading.textContent = 'An error occurred. Please try again.';
    }
  }

  // Switch to account (player or parent)
  // Add a flag to prevent multiple rapid switches
  let isSwitching = false;
  
  function switchToAccount(account) {
    // Prevent multiple rapid switches
    if (isSwitching) {
      console.log('Account switch already in progress, ignoring duplicate call');
      return;
    }
    
    if (!window.setCurrentRole) {
      console.error('setCurrentRole function not available');
      return;
    }

    isSwitching = true;
    closeDropdown();

    // If switching to a player, store the selected player ID
    // If switching to parent, clear the selected player ID
    if (account.role === 'player' && account.id) {
      localStorage.setItem('selectedPlayerId', account.id);
    } else if (account.role === 'parent') {
      localStorage.removeItem('selectedPlayerId');
    }

    window.setCurrentRole(account.role);
    
    // Dispatch custom event to notify other components (only once)
    window.dispatchEvent(new CustomEvent('accountSwitched', { 
      detail: { role: account.role, accountId: account.id } 
    }));
    
    // Reset flag after a delay to allow page reload
    setTimeout(() => {
      isSwitching = false;
    }, 1000);
  }

  // Helper function to find the active dropdown (same logic as loadLinkedAccounts)
  function findActiveDropdown() {
    // First, try to find the home-header in main-content (where it's moved to)
    const mainContent = document.querySelector('.main-content');
    const contentArea = document.querySelector('.content-area');
    
    let currentDropdown = null;
    
    // Search within home-header in main-content first
    if (mainContent) {
      const headerInMain = mainContent.querySelector('.home-header');
      if (headerInMain) {
        currentDropdown = headerInMain.querySelector('#accountSwitcherDropdown');
        if (currentDropdown) {
          console.log('Found dropdown in home-header within main-content');
          return currentDropdown;
        }
      }
      // Also search directly in main-content (in case header structure is different)
      currentDropdown = mainContent.querySelector('#accountSwitcherDropdown');
      if (currentDropdown) {
        console.log('Found dropdown directly in main-content');
        return currentDropdown;
      }
    }
    
    // Fallback to content-area
    if (!currentDropdown && contentArea) {
      const headerInContent = contentArea.querySelector('.home-header');
      if (headerInContent) {
        currentDropdown = headerInContent.querySelector('#accountSwitcherDropdown');
        if (currentDropdown) {
          console.log('Found dropdown in home-header within content-area');
          return currentDropdown;
        }
      }
      // Also search directly in content-area
      currentDropdown = contentArea.querySelector('#accountSwitcherDropdown');
      if (currentDropdown) {
        console.log('Found dropdown directly in content-area');
        return currentDropdown;
      }
    }
    
    // Final fallback to getElementById
    if (!currentDropdown) {
      currentDropdown = document.getElementById('accountSwitcherDropdown');
      if (currentDropdown) {
        console.log('Found dropdown via getElementById');
        return currentDropdown;
      }
    }
    
    // Debug: Log all dropdowns found
    const allDropdowns = document.querySelectorAll('#accountSwitcherDropdown');
    console.error('Dropdown not found! Searched in main-content and content-area. Total dropdowns in DOM:', allDropdowns.length);
    if (allDropdowns.length > 0) {
      allDropdowns.forEach((dropdown, index) => {
        console.error(`Dropdown ${index + 1}:`, {
          parent: dropdown.parentElement?.className,
          parentId: dropdown.parentElement?.id,
          display: window.getComputedStyle(dropdown).display,
          classes: dropdown.className
        });
      });
    }
    
    return currentDropdown;
  }

  // Toggle dropdown - use current elements from DOM
  function toggleDropdown() {
    const currentDropdown = findActiveDropdown();
    if (!currentDropdown) {
      console.error('Dropdown element not found!');
      return;
    }
    
    const isOpen = currentDropdown.classList.contains('is-open') || currentDropdown.style.display === 'block';
    console.log('Toggle dropdown - isOpen:', isOpen, 'display:', currentDropdown.style.display);
    
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }

  function openDropdown() {
    const currentDropdown = findActiveDropdown();
    const currentBtn = document.getElementById('accountSwitcherBtn');
    const currentLogo = document.getElementById('homeHeaderLogo');
    
    if (!currentDropdown) {
      console.error('Cannot open dropdown - element not found');
      return;
    }
    
    // Store original parent before moving to body
    if (!currentDropdown.dataset.originalParent) {
      currentDropdown.dataset.originalParent = currentDropdown.parentElement ? 'true' : 'false';
      if (currentDropdown.parentElement) {
        currentDropdown.dataset.originalParentId = currentDropdown.parentElement.id || '';
        currentDropdown.dataset.originalParentClass = currentDropdown.parentElement.className || '';
      }
    }
    
    // Move dropdown to body to escape any parent stacking contexts
    const originalParent = currentDropdown.parentElement;
    if (originalParent && originalParent !== document.body) {
      document.body.appendChild(currentDropdown);
    }
    
    console.log('Opening dropdown');
    currentDropdown.style.display = 'block'; // Show dropdown
    currentDropdown.classList.add('is-open');
    if (currentBtn) {
      currentBtn.setAttribute('aria-expanded', 'true');
    }
    if (currentLogo) {
      currentLogo.classList.add('active');
    }
    console.log('Dropdown opened - display:', currentDropdown.style.display, 'classes:', currentDropdown.className);
  }

  function closeDropdown() {
    const currentDropdown = findActiveDropdown();
    const currentBtn = document.getElementById('accountSwitcherBtn');
    const currentLogo = document.getElementById('homeHeaderLogo');
    
    if (!currentDropdown) {
      console.error('Cannot close dropdown - element not found');
      return;
    }
    
    console.log('Closing dropdown');
    currentDropdown.classList.remove('is-open');
    currentDropdown.style.display = 'none'; // Hide dropdown
    
    // Move dropdown back to original parent if it was moved to body
    if (currentDropdown.dataset.originalParent === 'true' && currentDropdown.parentElement === document.body) {
      const originalParentId = currentDropdown.dataset.originalParentId;
      const originalParentClass = currentDropdown.dataset.originalParentClass;
      
      // Try to find original parent
      let originalParent = null;
      if (originalParentId) {
        originalParent = document.getElementById(originalParentId);
      }
      if (!originalParent && originalParentClass) {
        // Try to find by class - look for home-header or account-switcher
        const homeHeader = document.querySelector('.home-header');
        if (homeHeader) {
          const accountSwitcher = homeHeader.querySelector('.account-switcher');
          if (accountSwitcher) {
            originalParent = accountSwitcher;
          } else {
            originalParent = homeHeader;
          }
        }
      }
      
      if (originalParent && originalParent !== document.body) {
        originalParent.appendChild(currentDropdown);
      }
    }
    
    if (currentBtn) {
      currentBtn.setAttribute('aria-expanded', 'false');
    }
    if (currentLogo) {
      currentLogo.classList.remove('active');
    }
  }

  // Event listeners - Use direct attachment to avoid conflicts
  // Always re-attach listeners since elements are recreated on page reload
  // Use a function to attach listeners that can be called after elements are confirmed to exist
  function attachEventListeners() {
    const logo = document.getElementById('homeHeaderLogo');
    const btn = document.getElementById('accountSwitcherBtn');
    
    if (!logo) {
      console.warn('Logo element not found when trying to attach listener');
      return false;
    }
    
    if (!btn) {
      console.warn('Button element not found when trying to attach listener');
      return false;
    }
    
    // Remove old listeners by cloning (this removes all event listeners)
    // But only if they haven't been attached yet (check dataset flag)
    if (!logo.dataset.listenerAttached) {
      // Create new click handler
      const logoHandler = (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log('Logo clicked - toggling dropdown');
        toggleDropdown();
      };
      
      logo.addEventListener('click', logoHandler);
      logo.dataset.listenerAttached = 'true';
      logo.dataset.handlerId = 'logo-handler-' + Date.now(); // Store handler ID
      console.log('Logo event listener attached to element:', logo);
    } else {
      console.log('Logo listener already attached (dataset flag set)');
    }
    
    // Keep button clickable too (for accessibility, even though it's hidden)
    if (!btn.dataset.listenerAttached) {
      const btnHandler = (e) => {
        e.stopPropagation();
        e.preventDefault();
        console.log('Button clicked - toggling dropdown');
        toggleDropdown();
      };
      
      btn.addEventListener('click', btnHandler);
      btn.dataset.listenerAttached = 'true';
      btn.dataset.handlerId = 'btn-handler-' + Date.now(); // Store handler ID
      console.log('Button event listener attached to element:', btn);
    } else {
      console.log('Button listener already attached (dataset flag set)');
    }
    
    return true;
  }
  
  // Attach listeners immediately
  let attached = attachEventListeners();
  
  // If not attached, retry with increasing delays
  if (!attached) {
    let retries = 0;
    const maxRetries = 10;
    const retryInterval = setInterval(() => {
      retries++;
      attached = attachEventListeners();
      if (attached || retries >= maxRetries) {
        clearInterval(retryInterval);
        if (!attached) {
          console.error('Failed to attach event listeners after', maxRetries, 'retries');
        }
      }
    }, 100);
  }
  
  // Also try attaching after header is moved (in case that replaces elements)
  // The header is moved by home.js's moveHeaderAboveTopBar() function
  // We need to re-attach listeners after the move completes
  const checkAndAttachAfterMove = () => {
    // Check if header has been moved to main-content
    const mainContent = document.querySelector('.main-content');
    const headerInMain = mainContent?.querySelector('.home-header');
    const logoInMain = headerInMain?.querySelector('#homeHeaderLogo');
    
    if (logoInMain && !logoInMain.dataset.listenerAttached) {
      console.log('Header moved to main-content, re-attaching listeners');
      attachEventListeners();
    }
  };
  
  // Check multiple times to catch when header is moved
  setTimeout(checkAndAttachAfterMove, 200);
  setTimeout(checkAndAttachAfterMove, 400);
  setTimeout(checkAndAttachAfterMove, 600);
  
  // Also expose attachEventListeners globally so home.js can call it after moving header
  window.attachAccountSwitcherListeners = attachEventListeners;

  // Close dropdown when clicking outside - use a unique identifier
  // Add a small delay to prevent closing on the same click that opens it
  let clickTimeout = null;
  
  const clickOutsideId = 'account-switcher-outside-click-parent';
  const oldOutsideHandler = window[clickOutsideId];
  if (oldOutsideHandler) {
    document.removeEventListener('click', oldOutsideHandler, true);
  }
  
  const outsideClickHandler = (e) => {
    const btn = document.getElementById('accountSwitcherBtn');
    const dropdown = document.getElementById('accountSwitcherDropdown');
    const logo = document.getElementById('homeHeaderLogo');
    
    if (!btn || !dropdown) return;
    
    // Check if click is outside the switcher elements
    const isOutside = !btn.contains(e.target) && 
                      !dropdown.contains(e.target) && 
                      !(logo && logo.contains(e.target));
    
    if (isOutside) {
      // Add a small delay to prevent closing immediately after opening
      // This allows the toggle to complete before checking if we should close
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
      clickTimeout = setTimeout(() => {
        const currentDropdown = document.getElementById('accountSwitcherDropdown');
        if (currentDropdown && currentDropdown.classList.contains('is-open')) {
          closeDropdown();
        }
      }, 100);
    } else {
      // Click is inside, clear any pending close
      if (clickTimeout) {
        clearTimeout(clickTimeout);
        clickTimeout = null;
      }
    }
  };
  
  window[clickOutsideId] = outsideClickHandler;
  document.addEventListener('click', outsideClickHandler, true);
  
  console.log('Account switcher event listeners attached');

  // Load accounts on page load (this won't open the dropdown)
  await loadLinkedAccounts();
  
  // Don't force close dropdown - let CSS handle the initial state
  // The dropdown is hidden by default via CSS, and we don't want to interfere
  // if the user has just opened it
  
  // Expose loadLinkedAccounts globally so it can be called from profile page
  window.loadLinkedAccounts = loadLinkedAccounts;
})();

