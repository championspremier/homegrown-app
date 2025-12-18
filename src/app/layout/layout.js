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
async function loadPage(pageName) {
  try {
    const currentRole = await getCurrentRole();
    
    // Verify layout.css is loaded (it should be in index.html)
    const layoutCSS = document.querySelector('link[href*="layout.css"]');
    if (!layoutCSS) {
      console.warn('layout.css not found - page CSS may not work correctly');
    }
    
    // Load page HTML from role-specific folder
    // Add cache-busting query parameter to prevent browser caching
    const cacheBuster = `?v=${Date.now()}`;
    const response = await fetch(`app/views/${currentRole}/${pageName}/${pageName}.html${cacheBuster}`);
    if (!response.ok) throw new Error(`Page not found: ${currentRole}/${pageName}`);
    const html = await response.text();
    contentArea.innerHTML = html;
    
    // Save current page to localStorage
    localStorage.setItem(CURRENT_PAGE_STORAGE_KEY, pageName);
    
    // Hide top-bar on profile and schedule pages
    const topBar = document.querySelector('.top-bar');
    if (topBar) {
      if (pageName === 'profile' || pageName === 'schedule') {
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
    const existingLink = document.querySelector(`link[data-page-css="${pageName}"]`);
    if (existingLink) existingLink.remove();
    
    // Try to load CSS (fail silently if doesn't exist)
    // Add cache-busting query parameter to prevent browser caching
    const cssCacheBuster = `?v=${Date.now()}`;
    fetch(`app/views/${currentRole}/${pageName}/${pageName}.css${cssCacheBuster}`)
      .then(res => {
        if (res.ok) {
          // Remove existing CSS link for this page if it exists
          const existingLink = document.querySelector(`link[data-page-css="${pageName}"]`);
          if (existingLink) {
            existingLink.remove();
          }
          
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = `app/views/${currentRole}/${pageName}/${pageName}.css${cssCacheBuster}`;
          link.setAttribute('data-page-css', pageName);
          // Insert after layout.css to ensure proper cascade
          if (layoutCSS && layoutCSS.nextSibling) {
            document.head.insertBefore(link, layoutCSS.nextSibling);
          } else {
            document.head.appendChild(link);
          }
        } else {
          console.warn(`⚠️ CSS file not found for page: ${currentRole}/${pageName}`);
        }
      })
      .catch((err) => {
        console.warn(`Error loading CSS for ${currentRole}/${pageName}:`, err);
      }); // CSS file doesn't exist, that's okay
    
    // Load page-specific JS if exists
    const existingScript = document.querySelector(`script[data-page-js="${pageName}"]`);
    if (existingScript) existingScript.remove();
    
    // Try to load JS (fail silently if doesn't exist)
    // Use module type to support ES6 imports
    // Add cache-busting query parameter to prevent browser caching
    const jsCacheBuster = `?v=${Date.now()}`;
    const jsPath = `app/views/${currentRole}/${pageName}/${pageName}.js${jsCacheBuster}`;
    
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
          
          document.body.appendChild(script);
          
          // If home page, also load account switcher (only for parent and player roles)
          if (pageName === 'home' && (currentRole === 'parent' || currentRole === 'player')) {
            const switcherPath = `app/views/${currentRole}/${pageName}/account-switcher.js${jsCacheBuster}`;
            const switcherScript = document.createElement('script');
            switcherScript.type = 'module';
            switcherScript.src = switcherPath;
            switcherScript.setAttribute('data-page-js', `${pageName}-switcher`);
            document.body.appendChild(switcherScript);
          }
        }
      })
      .catch((err) => {
        console.warn(`⚠️ Error loading JS for ${currentRole}/${pageName}:`, err);
      }); // JS file doesn't exist, that's okay
  } catch (error) {
    console.error('Error loading page:', error);
    const currentRole = await getCurrentRole();
    contentArea.innerHTML = `<div style="padding: 40px; text-align: center;"><h2>Page not found</h2><p>${currentRole}/${pageName}.html could not be loaded.</p></div>`;
  }
}

// Export setCurrentRole for future use (e.g., after authentication)
window.setCurrentRole = setCurrentRole;

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
      
      // Update active state
      const allButtons = document.querySelectorAll('.button');
      allButtons.forEach(btn => btn.classList.remove('active'));
      newButton.classList.add('active');
      
      // Load page (this will also save to localStorage)
      await loadPage(pageName);
    });
  });
}

// Initial attachment of navigation listeners
attachNavigationListeners();

// Coach navigation items
const coachNavigation = [
  { title: 'Dashboard', page: 'home', icon: 'bx-home', label: 'Dashboard' },
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
  
  const savedPage = localStorage.getItem(CURRENT_PAGE_STORAGE_KEY);
  const pageToLoad = savedPage || 'home';
  
  
  // Update navigation based on role (now that role is set)
  await updateNavigationForRole();
  
  // Set active state for the saved page
  const allButtons = document.querySelectorAll('.button');
  allButtons.forEach(btn => {
    btn.classList.remove('active');
    const link = btn.querySelector('.nav-link[data-page]');
    if (link && link.getAttribute('data-page') === pageToLoad) {
      btn.classList.add('active');
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
