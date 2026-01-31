/**
 * Layout JavaScript
 * 
 * This file manages:
 * - Theme persistence and toggle (light/dark mode)
 * - Sidebar open/close state
 * - Dynamic page loading from role-specific view folders
 * 
 * Structure:
 * - src/index.html: Main app entry point with layout (sidebar, main-content)
 * - src/app/layout/: Shared layout files (layout.css, layout.js)
 * - src/app/views/{role}/{page}/: Role-specific page content (HTML, CSS, JS)
 * 
 * The app supports multiple user roles: player, coach, admin, parent
 * Each role has its own view folder with role-specific pages.
 */


// --- Theme persistence and toggle ---
const STORAGE_KEY = 'hg-theme';
const root = document.documentElement;

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  // Update icon if button exists
  const btn = document.getElementById('themeToggle');
  if (btn) {
    btn.innerHTML = theme === 'light' ? '<i class="bx bx-moon"></i>' : '<i class="bx bx-sun"></i>';
    // Convert to Lucide icon
    setTimeout(() => {
      const icon = btn.querySelector('i.bx');
      if (icon) {
        replaceBoxiconWithLucide(icon, false);
      }
    }, 0);
  }
  localStorage.setItem(STORAGE_KEY, theme);
}

// Initialize theme toggle button (can be called multiple times when profile page loads)
function initThemeToggle() {
  const btn = document.getElementById('themeToggle');
  if (!btn) {
    // Button doesn't exist yet (not on profile page), that's okay
    return;
  }

  // Remove existing listeners by cloning the button
  const newBtn = btn.cloneNode(true);
  btn.parentNode.replaceChild(newBtn, btn);

  // Add click listener
  newBtn.addEventListener('click', () => {
    const current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
    applyTheme(current === 'light' ? 'dark' : 'light');
  });

  // Add keyboard listener
  newBtn.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      newBtn.click();
    }
  });

  // Update icon based on current theme
  const currentTheme = root.getAttribute('data-theme') || 'dark';
  newBtn.innerHTML = currentTheme === 'light' ? '<i class="bx bx-moon bx-flashing-hover"></i>' : '<i class="bx bx-sun bx-spin-hover"></i>';
  // Convert to Lucide icon
  setTimeout(() => {
    const icon = newBtn.querySelector('i.bx');
    if (icon) {
      replaceBoxiconWithLucide(icon, false);
    }
  }, 0);
}

// Load saved theme or respect system preference on first load
(function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    applyTheme(saved);
  } else {
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(prefersLight ? 'light' : 'dark');
  }
  
  // Try to initialize theme toggle button (might not exist if not on profile page)
  initThemeToggle();
})();

// --- Sidebar Toggle ---
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const SIDEBAR_STORAGE_KEY = 'hg-sidebar-state';

function applySidebarState(isOpen) {
  if (isOpen) {
    sidebar.classList.remove('closed');
  } else {
    sidebar.classList.add('closed');
  }
  localStorage.setItem(SIDEBAR_STORAGE_KEY, isOpen ? 'open' : 'closed');
}

function toggleSidebar() {
  const isCurrentlyOpen = !sidebar.classList.contains('closed');
  applySidebarState(!isCurrentlyOpen);
}

// Load saved sidebar state
(function initSidebar() {
  const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  const isOpen = saved !== 'closed'; // default to open
  applySidebarState(isOpen);
})();

// Hide toggle button and disable functionality at 900px and below
function checkMediaQuery() {
  if (window.matchMedia('(max-width: 900px)').matches) {
    // Hide toggle button via JavaScript as fallback
    if (sidebarToggle) {
      sidebarToggle.style.display = 'none';
      sidebarToggle.style.visibility = 'hidden';
      sidebarToggle.style.opacity = '0';
      sidebarToggle.style.pointerEvents = 'none';
    }
    // Keep sidebar always open (icon-only) at this size
    sidebar.classList.add('closed');
  } else {
    // Restore toggle button functionality above 900px
    if (sidebarToggle) {
      sidebarToggle.style.display = '';
      sidebarToggle.style.visibility = '';
      sidebarToggle.style.opacity = '';
      sidebarToggle.style.pointerEvents = '';
    }
  }
}

// Check on load and resize
checkMediaQuery();
window.addEventListener('resize', checkMediaQuery);

sidebarToggle.addEventListener('click', toggleSidebar);

// --- Role Configuration ---
// This determines which view folder to load pages from
// Valid roles: 'player', 'coach', 'admin', 'parent'
const CURRENT_ROLE = 'player'; // Default to player for now
const ROLE_STORAGE_KEY = 'hg-user-role';

// Initialize Supabase for role checking
let supabaseClient = null;
let roleCheckComplete = false;

// Initialize Supabase client (async)
async function initSupabaseForRole() {
  if (supabaseClient) return supabaseClient;
  
  try {
    const { initSupabase } = await import('../../auth/config/supabase.js');
    supabaseClient = await initSupabase();
    return supabaseClient;
  } catch (error) {
    console.warn('⚠️ Could not initialize Supabase for role check:', error);
    return null;
  }
}

// Check user role from Supabase
async function checkUserRoleFromSupabase() {
  try {
    const supabase = await initSupabaseForRole();
    if (!supabase) {
      return null;
    }

    // Check if user is logged in
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn('⚠️ Error checking session:', sessionError);
      return null;
    }

    if (!session || !session.user) {
      return null;
    }

    // Get user role from profiles table
    
    // Try using the user's metadata first (faster, no DB query needed)
    const userRole = session.user.user_metadata?.role;
    if (userRole && ['player', 'coach', 'admin', 'parent'].includes(userRole)) {
      return userRole;
    }
    
    // Fallback to database query
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .maybeSingle(); // Use maybeSingle instead of single to handle missing rows gracefully

    if (profileError) {
      console.error('❌ Error fetching user profile:', profileError);
      console.error('❌ Error code:', profileError.code);
      console.error('❌ Error message:', profileError.message);
      console.error('❌ Error details:', profileError.details);
      console.error('❌ Error hint:', profileError.hint);
      
      // If it's a 406 or RLS error, try to get role from user metadata
      if (profileError.code === 'PGRST301' || profileError.code === '42501' || profileError.message?.includes('406')) {
        if (userRole) {
          return userRole;
        }
      }
      return null;
    }

    if (profile && profile.role) {
      return profile.role;
    }

    // If no profile found but we have user metadata, use that
    if (userRole) {
      return userRole;
    }

    console.warn('⚠️ No role found in profile or user metadata');
    return null;
  } catch (error) {
    console.warn('⚠️ Error checking user role from Supabase:', error);
    return null;
  }
}

// Get current role from storage, Supabase, or use default
async function getCurrentRole() {
  // Check localStorage first - if a role is already set, respect it
  // This allows account switcher to work properly even after hard refresh
  const stored = localStorage.getItem(ROLE_STORAGE_KEY);
  if (stored && ['player', 'coach', 'admin', 'parent'].includes(stored)) {
    // Only check Supabase if we haven't checked yet AND there's no stored role
    // OR if this is the first time ever (no roleCheckComplete flag)
    if (!roleCheckComplete) {
      roleCheckComplete = true;
      // Verify the stored role matches Supabase (for security)
      // But don't overwrite it - the account switcher may have set a different role
      const supabaseRole = await checkUserRoleFromSupabase();
      // If Supabase role exists and matches stored role, we're good
      // If they differ, it means user switched accounts, so keep the stored role
    }
    return stored;
  }
  
  // No role in localStorage - check Supabase for the first time
  if (!roleCheckComplete) {
    roleCheckComplete = true;
    const supabaseRole = await checkUserRoleFromSupabase();
    if (supabaseRole && ['player', 'coach', 'admin', 'parent'].includes(supabaseRole)) {
      localStorage.setItem(ROLE_STORAGE_KEY, supabaseRole);
      return supabaseRole;
    }
  }
  
  return CURRENT_ROLE;
}

// Set role (for future use when switching between roles)
async function setCurrentRole(role) {
  if (['player', 'coach', 'admin', 'parent'].includes(role)) {
    localStorage.setItem(ROLE_STORAGE_KEY, role);
    // Update navigation visibility
    await updateNavigationForRole();
    // Reload current page with new role
    const currentPage = document.querySelector('.button.active .nav-link[data-page]')?.getAttribute('data-page') || 'home';
    await loadPage(currentPage);
  }
}

// --- Navigation and Content Loading ---
const contentArea = document.getElementById('contentArea');
const navLinks = document.querySelectorAll('.nav-link[data-page]');
const buttons = document.querySelectorAll('.button');
const CURRENT_PAGE_STORAGE_KEY = 'hg-current-page';

// Load page content
// Note: layout.css is loaded in index.html and provides CSS variables and base styles
// All page-specific CSS files depend on layout.css for variables like:
// --bg, --surface, --text, --border, --muted, --accent, --hover
// 
// Structure:
// - src/index.html: Main app entry point with layout (sidebar, main-content)
// - src/app/layout/: Shared layout files (layout.css, layout.js)
// - src/app/views/{role}/{page}/: Role-specific page content (HTML, CSS, JS)
function hideLeaderboard() {
  const el = document.getElementById('leaderboardContainer');
  if (el) el.style.display = 'none';
}
function showLeaderboard() {
  const el = document.getElementById('leaderboardContainer');
  if (el) el.style.display = '';
}
window.__showLeaderboard = showLeaderboard;
window.__hideLeaderboard = hideLeaderboard;

async function loadPage(pageName) {
  try {
    const currentRole = await getCurrentRole();
    
    // Show skeleton loader immediately to prevent layout shift (every page gets a skeleton)
    const { createHomePageSkeleton, createPageSkeleton, createHomeHeaderSkeleton } = await import('../utils/skeleton.js');
    hideLeaderboard();
    
    // Show content skeleton
    if (pageName === 'home' && (currentRole === 'parent' || currentRole === 'player')) {
      const skeleton = createHomePageSkeleton();
      contentArea.innerHTML = '';
      contentArea.appendChild(skeleton);
      
      // Show header skeleton in correct position (above top-bar) only for home page
      const mainContent = document.querySelector('.main-content');
      const topBar = document.querySelector('.top-bar');
      if (mainContent && topBar) {
        // Remove any existing header skeleton
        const existingHeaderSkeleton = mainContent.querySelector('.skeleton-home-header');
        if (existingHeaderSkeleton) {
          existingHeaderSkeleton.remove();
        }
        
        // Insert header skeleton before top-bar
        const headerSkeleton = createHomeHeaderSkeleton();
        mainContent.insertBefore(headerSkeleton, topBar);
      }
    } else {
      // Generic page skeleton for all other pages (coach home, profile, schedule, solo, tracking, communicate, settings, etc.)
      const skeleton = createPageSkeleton();
      contentArea.innerHTML = '';
      contentArea.appendChild(skeleton);
    }
    
    // Verify layout.css is loaded (it should be in index.html)
    const layoutCSS = document.querySelector('link[href*="layout.css"]');
    if (!layoutCSS) {
      console.warn('layout.css not found - page CSS may not work correctly');
    }
    
    // Load page HTML from role-specific folder
    // Add cache-busting query parameter to prevent browser caching
    const cacheBuster = `?v=${Date.now()}`;
    const response = await fetch(`/app/views/${currentRole}/${pageName}/${pageName}.html${cacheBuster}`);
    if (!response.ok) throw new Error(`Page not found: ${currentRole}/${pageName}`);
    const html = await response.text();
    
    // Function to apply mobile styles directly (more reliable than waiting for media queries)
    // This directly applies the mobile styles when on iPhone-sized screens
    function applyMobileScheduleStyles() {
      // Check if we're in mobile viewport using matchMedia
      const isMobile = window.matchMedia('(max-width: 435px)').matches;
      
      if (!isMobile) return; // Not mobile, skip
      
      const scheduleContainer = contentArea.querySelector('.schedule-container');
      if (scheduleContainer) {
        // Directly apply mobile styles - this is more reliable than waiting for CSS media queries
        scheduleContainer.style.setProperty('max-width', '100%', 'important');
        scheduleContainer.style.setProperty('width', '100%', 'important');
        scheduleContainer.style.setProperty('box-sizing', 'border-box', 'important');
        scheduleContainer.style.setProperty('padding', '10px', 'important');
      }
    }
    
    // Function to clean up any session badges that accidentally end up in top-bar
    function cleanupStraySessionBadges() {
      const topBar = document.querySelector('.top-bar');
      const leaderboardContainer = document.querySelector('.leaderboard-container');
      
      if (topBar) {
        // Remove any session badges from top-bar
        const badgesInTopBar = topBar.querySelectorAll('.session-badge');
        badgesInTopBar.forEach(badge => {
          console.warn('Removing stray session badge from top-bar');
          badge.remove();
        });
      }
      
      if (leaderboardContainer) {
        // Remove any session badges from leaderboard
        const badgesInLeaderboard = leaderboardContainer.querySelectorAll('.session-badge');
        badgesInLeaderboard.forEach(badge => {
          console.warn('Removing stray session badge from leaderboard-container');
          badge.remove();
        });
      }
      
      // Also check main-content directly (shouldn't have badges)
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        const badgesInMain = Array.from(mainContent.children).filter(child => 
          child.classList.contains('session-badge')
        );
        badgesInMain.forEach(badge => {
          console.warn('Removing stray session badge from main-content');
          badge.remove();
        });
      }
    }
    
    // Function to fix session-title styles that get overridden by solo.css
    // This ensures schedule and home page titles display correctly even if solo.css loads after
    function fixScheduleSessionTitles() {
      // Fix schedule page session titles
      const scheduleContainer = contentArea.querySelector('.schedule-container');
      if (scheduleContainer) {
        const sessionTitles = scheduleContainer.querySelectorAll('.session-title');
        sessionTitles.forEach(title => {
          // Apply correct schedule styles directly to override solo.css
          title.style.setProperty('font-size', '1.3rem', 'important');
          title.style.setProperty('font-weight', '700', 'important');
          title.style.setProperty('color', 'var(--text)', 'important');
          title.style.setProperty('margin-bottom', '6px', 'important');
          title.style.setProperty('text-shadow', 'none', 'important');
        });
        
        // Also fix upcoming session titles
        const upcomingTitles = scheduleContainer.querySelectorAll('.upcoming-session-title');
        upcomingTitles.forEach(title => {
          title.style.setProperty('font-size', '1.1rem', 'important');
          title.style.setProperty('font-weight', '700', 'important');
          title.style.setProperty('color', 'var(--text)', 'important');
          title.style.setProperty('margin-bottom', '8px', 'important');
          title.style.setProperty('text-shadow', 'none', 'important');
        });
      }
      
      // Fix home page session titles (for both player and parent)
      const sessionsListContainer = contentArea.querySelector('.sessions-list-container');
      const reservationsListContainer = contentArea.querySelector('.reservations-list-container');
      const reservedSessionCards = contentArea.querySelectorAll('.reserved-session-card .session-title');
      
      // Fix titles in sessions and reservations containers
      [sessionsListContainer, reservationsListContainer].forEach(container => {
        if (container) {
          const sessionTitles = container.querySelectorAll('.session-title');
          sessionTitles.forEach(title => {
            // Apply correct home page styles (18px) directly to override solo.css
            title.style.setProperty('font-size', '18px', 'important');
            title.style.setProperty('font-weight', '600', 'important');
            title.style.setProperty('color', 'var(--text)', 'important');
            title.style.setProperty('text-shadow', 'none', 'important');
          });
        }
      });
      
      // Fix titles in reserved session cards
      reservedSessionCards.forEach(title => {
        title.style.setProperty('font-size', '18px', 'important');
        title.style.setProperty('font-weight', '600', 'important');
        title.style.setProperty('color', 'var(--text)', 'important');
        title.style.setProperty('text-shadow', 'none', 'important');
      });
    }
    
    // Function to force media query recalculation (for other elements)
    function forceMediaQueryRecalculation() {
      // Trigger resize events
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('orientationchange'));
      
      // Force reflow
      if (contentArea) {
        void contentArea.offsetHeight;
      }
    }
    
    // Replace skeleton with actual content
    contentArea.innerHTML = html;
    
    // For non-home pages, hide content immediately after insertion to prevent flash
    // (home pages already handle this separately)
    const isHomePage = pageName === 'home' && (currentRole === 'parent' || currentRole === 'player');
    const mainContent = document.querySelector('.main-content');
    if (!isHomePage) {
      // Remove any home-header that might be in main-content (from previous page) immediately
      if (mainContent) {
        const headerInMain = mainContent.querySelector('.home-header:not(.skeleton-home-header)');
        if (headerInMain) {
          headerInMain.remove();
        }
      }
      
      // Hide all content in contentArea (except home-header which we'll remove)
      const allContentChildren = Array.from(contentArea.children);
      allContentChildren.forEach(child => {
        // Remove home-header immediately (it shouldn't be on non-home pages)
        if (child.classList.contains('home-header')) {
          child.remove();
        } else {
          child.style.display = 'none';
          child.dataset.skeletonHidden = 'true';
        }
      });
      
      // Re-insert skeleton so it shows while content is hidden
      const { createPageSkeleton } = await import('../utils/skeleton.js');
      const contentSkeleton = createPageSkeleton();
      contentArea.insertBefore(contentSkeleton, contentArea.firstChild);
      
      // Restore hidden content after a short delay (allows CSS/JS to initialize)
      // Page-specific JS can also restore content earlier by removing data-skeleton-hidden
      setTimeout(() => {
        const hiddenContent = contentArea.querySelectorAll('[data-skeleton-hidden="true"]');
        hiddenContent.forEach(element => {
          element.style.display = '';
          element.removeAttribute('data-skeleton-hidden');
        });
        // Remove skeleton after content is restored
        const skeleton = contentArea.querySelector('.page-skeleton');
        if (skeleton) {
          skeleton.remove();
        }
      }, 150);
    }
    
    showLeaderboard();
    
    // Re-apply theme variables when loading home or schedule so borders/accents show after client-side nav
    if (pageName === 'home' || pageName === 'schedule') {
      const theme = document.documentElement.getAttribute('data-theme') || 'dark';
      const accentSolid = theme === 'light' ? '#3b82f6' : '#D3AF37';
      document.documentElement.style.setProperty('--accent-solid', accentSolid);
    }
    
    // Initialize Lucide icons for the newly loaded content
    setTimeout(() => {
      initLucideIcons(contentArea);
    }, 50);
    
    // Set up a MutationObserver to watch for schedule container or home page containers being added
    // This ensures we catch it even if it's added asynchronously
    if (pageName === 'schedule' || pageName === 'home') {
      const observer = new MutationObserver((mutations) => {
        const scheduleContainer = contentArea.querySelector('.schedule-container');
        const sessionsListContainer = contentArea.querySelector('.sessions-list-container');
        const reservationsListContainer = contentArea.querySelector('.reservations-list-container');
        
        if (scheduleContainer || sessionsListContainer || reservationsListContainer) {
          // Container found, apply fixes
          if (scheduleContainer) {
            applyMobileScheduleStyles();
          }
          // Fix session titles that might be overridden by solo.css
          fixScheduleSessionTitles();
          cleanupStraySessionBadges();
          observer.disconnect(); // Stop observing once we find it
        }
      });
      
      // Start observing
      observer.observe(contentArea, {
        childList: true,
        subtree: true
      });
      
      // Also check immediately in case containers are already there
      const scheduleContainer = contentArea.querySelector('.schedule-container');
      const sessionsListContainer = contentArea.querySelector('.sessions-list-container');
      const reservationsListContainer = contentArea.querySelector('.reservations-list-container');
      
      if (scheduleContainer || sessionsListContainer || reservationsListContainer) {
        if (scheduleContainer) {
          applyMobileScheduleStyles();
        }
        fixScheduleSessionTitles();
        cleanupStraySessionBadges();
        observer.disconnect();
      }
    }
    
    // Clean up any stray badges when schedule or home page loads
    if (pageName === 'schedule' || pageName === 'home') {
      // Run cleanup after a short delay to catch any that appear during load
      setTimeout(() => {
        cleanupStraySessionBadges();
      }, 100);
      
      // Also run cleanup after CSS and JS load
      setTimeout(() => {
        cleanupStraySessionBadges();
        if (pageName === 'home') {
          fixScheduleSessionTitles();
        }
      }, 300);
    }
    
    // For home pages, hide the header in content-area until it's moved to prevent visual jump
    // The skeleton header at the top will remain visible until the actual header is moved
    if (isHomePage) {
      // Hide the header in content-area until it's moved (prevents visual jump)
      const homeHeader = contentArea.querySelector('.home-header');
      if (homeHeader) {
        homeHeader.style.display = 'none';
        homeHeader.style.visibility = 'hidden';
        homeHeader.style.position = 'absolute';
        homeHeader.style.opacity = '0';
        homeHeader.style.pointerEvents = 'none';
      }
      
      // Hide all actual content until skeleton is removed (prevents content showing through skeleton)
      const allContentChildren = Array.from(contentArea.children);
      allContentChildren.forEach(child => {
        // Skip the header (already hidden) and any existing skeletons
        if (!child.classList.contains('home-header') && !child.classList.contains('page-skeleton')) {
          child.style.display = 'none';
          child.dataset.skeletonHidden = 'true'; // Mark for later restoration
        }
      });
      
      // Re-create and show content skeleton to prevent layout shift
      // The skeleton will be removed by moveHeaderAboveTopBar() after header is moved
      const { createHomePageSkeleton } = await import('../utils/skeleton.js');
      const contentSkeleton = createHomePageSkeleton();
      // Remove the header skeleton from content skeleton (we already have it at the top)
      const headerInSkeleton = contentSkeleton.querySelector('.skeleton-home-header');
      if (headerInSkeleton) {
        headerInSkeleton.remove();
      }
      // Insert skeleton at the beginning of content-area to show loading state
      contentArea.insertBefore(contentSkeleton, contentArea.firstChild);
      hideLeaderboard();
    }
    
    if (mainContent) {
      // Hide home-header on pages where it shouldn't appear
      const pagesToHideHeader = {
        'parent': ['profile', 'tracking', 'schedule'],
        'player': ['schedule', 'solo', 'tracking', 'profile']
      };
      
      const pagesToHide = pagesToHideHeader[currentRole] || [];
      if (pagesToHide.includes(pageName)) {
        // Remove header skeleton for non-home pages
        const headerSkeleton = mainContent.querySelector('.skeleton-home-header');
        if (headerSkeleton) {
          headerSkeleton.remove();
        }
        
        // Remove any home-header that might be in content-area
        const homeHeader = contentArea.querySelector('.home-header');
        if (homeHeader) {
          homeHeader.remove();
        }
        // Also remove any home-header that's already been moved to main-content
        const movedHeader = mainContent.querySelector('.home-header');
        if (movedHeader && movedHeader.parentElement === mainContent) {
          movedHeader.remove();
        }
      }
      // For home pages, skeleton will be removed by moveHeaderAboveTopBar() after header is moved
    }
    
    // Remove padding and background from content-area and main-content for solo page to allow full-screen videos
    if (pageName === 'solo') {
      // Add class to body for CSS targeting
      document.body.classList.add('solo-page-active');
      contentArea.style.padding = '0';
      contentArea.style.overflow = 'hidden';
      contentArea.style.background = 'transparent';
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        mainContent.style.background = 'transparent';
      }
      // Set body background to black for video
      document.body.style.background = '#000';
    } else {
      // Remove class from body
      document.body.classList.remove('solo-page-active');
      contentArea.style.padding = '';
      contentArea.style.overflow = '';
      contentArea.style.background = '';
      const mainContent = document.querySelector('.main-content');
      if (mainContent) {
        mainContent.style.background = '';
      }
      // Reset body background
      document.body.style.background = '';
    }
    
    // Save current page to localStorage
    localStorage.setItem(CURRENT_PAGE_STORAGE_KEY, pageName);
    
    // Hide top-bar on profile, schedule, solo, and coach home pages
    // Also hide for coach pages: settings, payments, people, solo-create, plans
    const topBar = document.querySelector('.top-bar');
    if (topBar) {
      const coachPagesToHide = ['settings', 'payments', 'people', 'solo-create', 'plans'];
      if (pageName === 'profile' || pageName === 'schedule' || pageName === 'solo' || 
          (pageName === 'home' && currentRole === 'coach') ||
          (currentRole === 'coach' && coachPagesToHide.includes(pageName))) {
        topBar.style.display = 'none';
      } else {
        topBar.style.display = 'flex';
      }
    }
    
    
    // If profile or settings page loaded, initialize theme toggle button
    if (pageName === 'profile' || pageName === 'settings') {
      // Wait a bit for DOM to be ready
      setTimeout(() => {
        initThemeToggle();
      }, 100);
    }
    
    // Load page-specific CSS if exists
    // This CSS depends on layout.css being loaded first (from index.html)
    // Remove ALL page-specific CSS links so only the current page's styles apply
    // (prevents schedule.css from overriding home.css when navigating schedule -> home)
    document.querySelectorAll('link[data-page-css]').forEach(link => link.remove());
    
    // Create link tag for CSS - Vite will serve it correctly
    // Add cache-busting query parameter to prevent browser caching
    const cssCacheBuster = `?v=${Date.now()}`;
    const cssPath = `/app/views/${currentRole}/${pageName}/${pageName}.css${cssCacheBuster}`;
          const link = document.createElement('link');
          link.rel = 'stylesheet';
    link.href = cssPath;
          link.setAttribute('data-page-css', pageName);
    link.onerror = () => {
      // Silently fail if CSS doesn't exist
      link.remove();
      // Even if CSS fails to load, still trigger recalculation
      forceMediaQueryRecalculation();
    };
    
    // Wait for CSS to load, then apply mobile styles
    link.onload = () => {
      // CSS has loaded, apply mobile styles for schedule page and fix session titles for all pages
      // Also initialize Lucide icons after CSS loads
      setTimeout(() => {
        initLucideIcons(contentArea);
      }, 50);
      
      if (pageName === 'schedule') {
        // Re-apply --accent-solid so schedule-toggle border shows after client-side nav
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        const accentSolid = theme === 'light' ? '#3b82f6' : '#D3AF37';
        document.documentElement.style.setProperty('--accent-solid', accentSolid);
        setTimeout(() => {
          applyMobileScheduleStyles();
          fixScheduleSessionTitles();
          cleanupStraySessionBadges();
        }, 10);
      } else if (pageName === 'home') {
        // Re-apply --accent-solid so schedule-toggle border shows after client-side nav
        const theme = document.documentElement.getAttribute('data-theme') || 'dark';
        const accentSolid = theme === 'light' ? '#3b82f6' : '#D3AF37';
        document.documentElement.style.setProperty('--accent-solid', accentSolid);
        // Fix session titles on home page too
        setTimeout(() => {
          fixScheduleSessionTitles();
          cleanupStraySessionBadges();
        }, 10);
      }
      // Also trigger general media query recalculation
      setTimeout(() => {
        forceMediaQueryRecalculation();
      }, 10);
    };
    
    // Fallback: if onload doesn't fire (some browsers), use a timeout
    // This is especially important for cached stylesheets where onload might fire immediately
    setTimeout(() => {
      // Check if stylesheet is loaded by checking if it's in document
      if (document.querySelector(`link[data-page-css="${pageName}"]`)) {
        if (pageName === 'schedule') {
          applyMobileScheduleStyles();
          fixScheduleSessionTitles();
          cleanupStraySessionBadges();
        } else if (pageName === 'home') {
          fixScheduleSessionTitles();
          cleanupStraySessionBadges();
        }
        forceMediaQueryRecalculation();
      }
    }, 150);
    
          // Insert after layout.css to ensure proper cascade
          if (layoutCSS && layoutCSS.nextSibling) {
            document.head.insertBefore(link, layoutCSS.nextSibling);
          } else {
            document.head.appendChild(link);
          }
    
    // Load page-specific JS if exists
    const existingScript = document.querySelector(`script[data-page-js="${pageName}"]`);
    if (existingScript) existingScript.remove();
    
    // Try to load JS (fail silently if doesn't exist)
    // Use module type to support ES6 imports
    // Add cache-busting query parameter to prevent browser caching
    const jsCacheBuster = `?v=${Date.now()}`;
    const jsPath = `/app/views/${currentRole}/${pageName}/${pageName}.js${jsCacheBuster}`;
    
    fetch(jsPath)
      .then(res => {
        if (res.ok) {
          // Check if the script uses ES6 imports anywhere in the file
          return res.text().then(code => {
            // Match import/export statements - simple and reliable
            // Looks for "import" or "export" as whole words (not in comments that would break)
            const hasImport = /\bimport\s+/.test(code) || /\bexport\s+/.test(code);
            return { code, hasImport };
          });
        }
        return null;
      })
      .then(result => {
        if (result) {
          const { code, hasImport } = result;
          const script = document.createElement('script');
          script.setAttribute('data-page-js', pageName);
          
          if (hasImport) {
            // Use module type for ES6 imports - must use src, not textContent
            script.type = 'module';
            script.src = jsPath;
          } else {
            // Regular script execution for non-module code
            script.textContent = code;
          }
          
          // Wait for script to execute before applying mobile styles
          if (hasImport) {
            // For module scripts, wait for onload
            script.onload = () => {
              // Small delay to ensure script has executed
              setTimeout(() => {
                // Initialize Lucide icons after JS loads
                initLucideIcons(contentArea);
                
                if (pageName === 'schedule') {
                  applyMobileScheduleStyles();
                  fixScheduleSessionTitles();
                }
                forceMediaQueryRecalculation();
              }, 50);
            };
          } else {
            // For inline scripts, they execute immediately, so wait a bit
            setTimeout(() => {
              if (pageName === 'schedule') {
                applyMobileScheduleStyles();
                fixScheduleSessionTitles();
                cleanupStraySessionBadges();
              } else if (pageName === 'home') {
                fixScheduleSessionTitles();
                cleanupStraySessionBadges();
              }
              forceMediaQueryRecalculation();
            }, 50);
          }
          
          document.body.appendChild(script);
          
          // If home page, also load account switcher (only for parent and player roles)
          if (pageName === 'home' && (currentRole === 'parent' || currentRole === 'player')) {
            // Remove any existing account switcher script first
            const existingSwitcherScript = document.querySelector(`script[data-page-js="${pageName}-switcher"]`);
            if (existingSwitcherScript) {
              existingSwitcherScript.remove();
            }
            
            // Wait for DOM to be ready, then load account switcher
            // Use requestAnimationFrame to ensure DOM is painted
            requestAnimationFrame(() => {
              setTimeout(() => {
                const switcherPath = `/app/views/${currentRole}/${pageName}/account-switcher.js${jsCacheBuster}`;
                const switcherScript = document.createElement('script');
                switcherScript.type = 'module';
                switcherScript.src = switcherPath;
                switcherScript.setAttribute('data-page-js', `${pageName}-switcher`);
                switcherScript.onload = () => {
                  console.log('Account switcher script loaded successfully');
                };
                switcherScript.onerror = (err) => {
                  console.error('Error loading account switcher script:', err);
                };
                document.body.appendChild(switcherScript);
              }, 150);
            });
          }
        }
      })
      .catch((err) => {
        console.warn(`⚠️ Error loading JS for ${currentRole}/${pageName}:`, err);
      }); // JS file doesn't exist, that's okay
    
    // Add resize listener for schedule page to re-apply mobile styles when viewport changes
    if (pageName === 'schedule') {
      // Remove any existing listener
      const existingHandler = window._scheduleMobileStyleHandler;
      if (existingHandler) {
        window.removeEventListener('resize', existingHandler);
      }
      
      // Create new handler
      const resizeHandler = () => {
        applyMobileScheduleStyles();
        fixScheduleSessionTitles();
        cleanupStraySessionBadges();
      };
      window._scheduleMobileStyleHandler = resizeHandler;
      window.addEventListener('resize', resizeHandler);
      
      // Also apply immediately after a short delay to catch any late-loading content
      setTimeout(() => {
        applyMobileScheduleStyles();
        fixScheduleSessionTitles();
        cleanupStraySessionBadges();
      }, 200);
      
      // Set up a more aggressive observer to catch dynamically added session titles
      const titleObserver = new MutationObserver(() => {
        fixScheduleSessionTitles();
      });
      
      // Start observing for session titles being added (for both schedule and home pages)
      const scheduleContainer = contentArea.querySelector('.schedule-container');
      const sessionsListContainer = contentArea.querySelector('.sessions-list-container');
      const reservationsListContainer = contentArea.querySelector('.reservations-list-container');
      
      [scheduleContainer, sessionsListContainer, reservationsListContainer].forEach(container => {
        if (container) {
          titleObserver.observe(container, {
            childList: true,
            subtree: true
          });
        }
      });
      
      // Store observer so we can disconnect it later if needed
      window._scheduleTitleObserver = titleObserver;
    }
  } catch (error) {
    console.error('Error loading page:', error);
    const currentRole = await getCurrentRole();
    contentArea.innerHTML = `<div style="padding: 40px; text-align: center;"><h2>Page not found</h2><p>${currentRole}/${pageName}.html could not be loaded.</p></div>`;
  }
}

// Export setCurrentRole for future use (e.g., after authentication)
window.setCurrentRole = setCurrentRole;

// Import Lucide icon utilities
import { setIconFilled, setIconOutline, initLucideIcons, replaceBoxiconWithLucide, setupIconObserver } from '../utils/lucide-icons.js';

// Helper function to switch icon to filled (solid) version
function updateIconToFilled(button) {
  if (!button) return;
  
  // Special handling for solo-create: show HD.png when active
  const link = button.querySelector('.nav-link[data-page]');
  if (link && link.getAttribute('data-page') === 'solo-create') {
    const icon = button.querySelector('i[data-lucide], i.bx, i.bxs, svg.lucide-icon');
    const navLink = button.querySelector('.nav-link');
    if (icon && navLink) {
      // Hide the icon (whether it's an <i> or <svg>)
      if (icon.tagName === 'I' || icon.tagName === 'i') {
        icon.style.display = 'none';
      } else if (icon.tagName === 'svg' || icon.tagName === 'SVG') {
        icon.style.display = 'none';
      }
      
      // Check if img already exists, if not create it
      let img = navLink.querySelector('img.solo-create-icon');
      if (!img) {
        img = document.createElement('img');
        img.className = 'img solo-create-icon';
        img.src = '/icons/hd.png';
        img.alt = 'Homegrown logo';
        img.style.width = '22px';
        img.style.height = '22px';
        // Insert before the icon (whether it's <i> or <svg>)
        if (icon.parentNode) {
          icon.parentNode.insertBefore(img, icon);
        } else {
          navLink.appendChild(img);
        }
      }
      img.style.display = 'block';
    }
    return;
  }
  
  // Find the SVG icon (could be direct child or in nav-link)
  let svg = button.querySelector('svg.lucide-icon') || button.querySelector('svg[data-lucide]');
  
  if (!svg) {
    // If no SVG found, try to convert any remaining Boxicons
    const boxicon = button.querySelector('i.bx:not(.solo-icon-desktop), i.bxs:not(.solo-icon-desktop)');
    if (boxicon) {
      svg = replaceBoxiconWithLucide(boxicon, true);
      if (!svg) return;
    } else {
      return;
    }
  }
  
  // Set to filled using Lucide utility (pass the button, not the SVG)
  setIconFilled(button);
}

// Helper function to switch icon back to outline version
function updateIconToOutline(button) {
  if (!button) return;
  
  // Special handling for solo-create: show outline football icon when inactive
  const link = button.querySelector('.nav-link[data-page]');
  if (link && link.getAttribute('data-page') === 'solo-create') {
    // Find icon (could be <i> or <svg>)
    let icon = button.querySelector('i[data-lucide], i.bx, i.bxs, svg.lucide-icon');
    const img = button.querySelector('img.solo-create-icon');
    
    if (icon) {
      // If it's a Boxicon, convert it first
      if (icon.tagName === 'I' || icon.tagName === 'i') {
        if (icon.classList.contains('bx') || icon.classList.contains('bxs')) {
          icon = replaceBoxiconWithLucide(icon, false);
        }
      }
      
      // Show the icon (whether it's <i> or <svg>)
      if (icon) {
        icon.style.display = 'block';
        // If it's an SVG, ensure it has proper stroke width
        if (icon.tagName === 'svg' || icon.tagName === 'SVG') {
          icon.setAttribute('stroke-width', '1.5');
          const paths = icon.querySelectorAll('path');
          paths.forEach(path => {
            path.setAttribute('stroke-width', '1.5');
          });
        }
      }
      setIconOutline(button);
    }
    if (img) {
      // Hide the HD.png image
      img.style.display = 'none';
    }
    return;
  }
  
  // Find the SVG icon (could be direct child or in nav-link)
  let svg = button.querySelector('svg.lucide-icon') || button.querySelector('svg[data-lucide]');
  
  if (!svg) {
    // If no SVG found, try to convert any remaining Boxicons
    const boxicon = button.querySelector('i.bx:not(.solo-icon-desktop), i.bxs:not(.solo-icon-desktop)');
    if (boxicon) {
      svg = replaceBoxiconWithLucide(boxicon, false);
      if (!svg) return;
    } else {
      return;
    }
  }
  
  // Set to outline using Lucide utility
  setIconOutline(button);
}

// Function to attach navigation event listeners
function attachNavigationListeners() {
  const buttons = document.querySelectorAll('.button');
  buttons.forEach(button => {
    // Remove existing listeners by cloning
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    
    // Add click listener
    newButton.addEventListener('click', async (e) => {
      // Find the nav-link inside this button
      const link = newButton.querySelector('.nav-link[data-page]');
      if (!link) return;
      
      e.preventDefault();
      const pageName = link.getAttribute('data-page');
      
      // Update active state - get fresh list of all buttons (including home)
      const allButtons = document.querySelectorAll('.nav-list .button');
      allButtons.forEach(btn => {
        btn.classList.remove('active');
        updateIconToOutline(btn);
      });
      
      // Set the clicked button as active
      newButton.classList.add('active');
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        updateIconToFilled(newButton);
      }, 0);
      
      // Load page (this will also save to localStorage)
      await loadPage(pageName);
    });
  });
}

// Initial attachment of navigation listeners
attachNavigationListeners();

// Set up MutationObserver to watch for new icons
let iconObserver = null;
function initializeIconSystem() {
  // Initialize icons on initial load
  initLucideIcons();
  
  // Set up observer to watch for dynamically added icons
  if (!iconObserver) {
    iconObserver = setupIconObserver();
  }
  
  // Also initialize icons for the active button
  const activeButton = document.querySelector('.button.active');
  if (activeButton) {
    updateIconToFilled(activeButton);
  }
}

// Initialize Lucide icons on page load
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeIconSystem();
  });
} else {
  // DOM already loaded
  setTimeout(() => {
    initializeIconSystem();
  }, 100);
}

// Coach navigation items
const coachNavigation = [
  { title: 'Dashboard', page: 'home', icon: 'bx-grid-alt', label: 'Dashboard' },
  { title: 'Communicate', page: 'communicate', icon: 'bx-message-rounded', label: 'Communicate' },
  { title: 'People', page: 'people', icon: 'bx-group', label: 'People' },
  { title: 'Schedule', page: 'schedule', icon: 'bx-calendar', label: 'Schedule' },
  { title: 'Solo Create', page: 'solo-create', icon: 'bx-football', label: 'Solo Create' },
  { title: 'Plans', page: 'plans', icon: 'bx-file-blank', label: 'Plans' },
  { title: 'Payments', page: 'payments', icon: 'bx-credit-card', label: 'Payments' },
  { title: 'Settings', page: 'settings', icon: 'bx-cog', label: 'Settings' }
];

// Update navigation items based on role
function updateNavigationItems(role) {
  const navList = document.querySelector('.nav-list');
  if (!navList) return;

  if (role === 'coach') {
    // Replace navigation with coach items
    navList.innerHTML = coachNavigation.map((item, index) => `
      <li class="button ${index === 0 ? 'active' : ''}" title="${item.title}">
        <a href="#" data-page="${item.page}" class="nav-link" data-tooltip="${item.title}">
          <i class="bx ${item.icon}"></i>
          <span class="label">${item.label}</span>
        </a>
      </li>
    `).join('');

    // Re-attach event listeners to new buttons
    attachNavigationListeners();
    
    // Initialize Lucide icons for coach navigation
    setTimeout(() => {
      initLucideIcons(navList);
      // Also initialize icons in the entire document for any other icons
      initLucideIcons();
      const activeButton = document.querySelector('.button.active');
      if (activeButton) {
        updateIconToFilled(activeButton);
      }
    }, 100);
  }
}

// Hide/show navigation items based on role
async function updateNavigationForRole() {
  const currentRole = await getCurrentRole();
  const soloButton = document.querySelector('.button[title="Solo"]');
  
  
  // Set data-role attribute on body for CSS targeting
  document.body.setAttribute('data-role', currentRole);
  
  // Update navigation items for coaches
  if (currentRole === 'coach') {
    updateNavigationItems('coach');
    return; // Early return, navigation is replaced
  }
  
  // Hide Solo for parents (they only have Home, Schedule, Tracking, Profile)
  if (currentRole === 'parent' && soloButton) {
    soloButton.style.display = 'none';
    soloButton.style.visibility = 'hidden';
  } else if (soloButton) {
    soloButton.style.display = '';
    soloButton.style.visibility = '';
  }
}

// Load page when DOM is ready
// Check localStorage for saved page, otherwise default to 'home'
async function initializeApp() {
  // First, check user role from Supabase (this will update localStorage if needed)
  await getCurrentRole();
  
  // Load leaderboard in top-bar
  await loadLeaderboard();
  
  // Initialize sidebar photo (handles account switcher) - load dynamically
  try {
    const { initSidebarPhoto } = await import('../utils/sidebar-photo.js');
    initSidebarPhoto();
  } catch (error) {
    console.error('Error initializing sidebar photo:', error);
  }
  
  const savedPage = localStorage.getItem(CURRENT_PAGE_STORAGE_KEY);
  const pageToLoad = savedPage || 'home';
  
  
  // Update navigation based on role (now that role is set)
  await updateNavigationForRole();
  
  // Set active state for the saved page
  const allButtons = document.querySelectorAll('.nav-list .button');
  // First, remove active from all buttons and reset icons
  allButtons.forEach(btn => {
    btn.classList.remove('active');
    updateIconToOutline(btn);
  });
  
  // Then set the correct button as active
  allButtons.forEach(btn => {
    const link = btn.querySelector('.nav-link[data-page]');
    if (link && link.getAttribute('data-page') === pageToLoad) {
      btn.classList.add('active');
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        updateIconToFilled(btn);
      }, 0);
    }
  });
  
  loadPage(pageToLoad);
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  // DOM already loaded
  initializeApp();
}

// Also update navigation when DOM is fully loaded (in case buttons weren't ready)
window.addEventListener('load', async () => {
  await updateNavigationForRole();
});

// Load leaderboard in top-bar
async function loadLeaderboard() {
  const container = document.getElementById('leaderboardContainer');
  if (!container) return;

  try {
    const { loadLeaderboard } = await import('../utils/leaderboard.js');
    await loadLeaderboard(container);
  } catch (error) {
    console.error('Error loading leaderboard:', error);
  }
}
