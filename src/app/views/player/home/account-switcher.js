// Account Switcher for Player View
// Shows parent account(s) and allows switching to parent view

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
        switcherName.textContent = 'Error loading';
        return;
      }

      let parentProfile = null;

      // If current user is a parent, use their profile directly
      if (currentProfile.role === 'parent') {
        parentProfile = currentProfile;
      } else if (currentProfile.role === 'player') {
        // If current user is a player, find their parent through relationships
        // Use RPC function to avoid 406 errors for player-only accounts
        let parentId = null;
        try {
          const { data: parentIdData, error: rpcError } = await supabase.rpc('get_player_parent_id', {
            p_player_id: currentUserId
          });
          if (!rpcError && parentIdData) {
            parentId = parentIdData;
          }
        } catch (error) {
          // Player-only account - no parent relationship
        }
        
        if (!parentId) {
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

      // Build dropdown items - ALWAYS get fresh references from DOM
      // (elements might have been moved when header was repositioned)
      // IMPORTANT: Find the ACTIVE dropdown (the one in main-content, not content-area)
      // and remove any duplicate dropdowns
      // Reuse mainContent and contentArea from earlier in the function (declared at line 106)
      
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
      
      // Remove any duplicate dropdowns (keep only the active one)
      const allDropdowns = document.querySelectorAll('#accountSwitcherDropdown');
      allDropdowns.forEach(dropdown => {
        if (dropdown !== currentDropdown) {
          console.log('Removing duplicate dropdown');
          dropdown.remove();
        }
      });
      
      const currentItems = currentDropdown.querySelector('#accountSwitcherItems');
      const currentLoading = currentDropdown.querySelector('#accountSwitcherLoading');
      
      if (!currentItems) {
        console.error('accountSwitcherItems element not found!');
        return;
      }
      
      // Clear existing items
      currentItems.innerHTML = '';
      
      linkedAccounts.forEach(account => {
        const item = document.createElement('button');
        item.className = 'account-switcher-item';
        item.type = 'button';
        item.textContent = account.name;
        item.addEventListener('click', () => switchToAccount(account));
        currentItems.appendChild(item);
      });

      // Hide loading and show items - only update the active dropdown's elements
      // (duplicates have been removed, so we only need to update the active one)
      if (currentLoading) {
        currentLoading.style.setProperty('display', 'none', 'important');
        currentLoading.style.setProperty('visibility', 'hidden', 'important');
        currentLoading.style.setProperty('opacity', '0', 'important');
      }
      if (currentItems) {
        currentItems.style.setProperty('display', 'block', 'important');
        currentItems.style.setProperty('visibility', 'visible', 'important');
        currentItems.style.setProperty('opacity', '1', 'important');
      }
      
      // Update cached references for future use
      switcherLoading = currentLoading;
      switcherItems = currentItems;

    } catch (error) {
      switcherName.textContent = 'Error loading';
      switcherLoading.textContent = 'An error occurred. Please try again.';
    }
  }

  // Switch to parent account
  // Add a flag to prevent multiple rapid switches
  let isSwitching = false;
  
  function switchToAccount(account) {
    // Prevent multiple rapid switches
    if (isSwitching) {
      console.log('Account switch already in progress, ignoring duplicate call');
      return;
    }
    
    if (!window.setCurrentRole) {
      return;
    }

    isSwitching = true;
    closeDropdown();

    window.setCurrentRole(account.role);
    
    // Dispatch custom event for other components to listen to (only once)
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
  
  const clickOutsideId = 'account-switcher-outside-click-player';
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
})();

