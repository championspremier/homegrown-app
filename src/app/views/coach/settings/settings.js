// Coach Settings page scripts
// Import path is relative to this file's location: src/app/views/coach/settings/
// To reach src/auth/config/supabase.js, we need to go up 4 levels to src/, then into auth/
import { initSupabase } from '../../../../auth/config/supabase.js';


// Initialize Supabase
let supabase;
let supabaseReady = false;

initSupabase().then(client => {
  if (client) {
    supabase = client;
    supabaseReady = true;
  } else {
    console.error('❌ Supabase client is null');
  }
}).catch(err => {
  console.error('❌ Failed to initialize Supabase:', err);
});

// Initialize theme toggle (call the function from layout.js)
if (window.initThemeToggle) {
  // Wait a bit for the DOM to be ready
  setTimeout(() => {
    window.initThemeToggle();
  }, 100);
} else {
  // Fallback: initialize theme toggle directly
  const btn = document.getElementById('themeToggle');
  if (btn) {
    const root = document.documentElement;
    const STORAGE_KEY = 'hg-theme';
    
    function applyTheme(theme) {
      root.setAttribute('data-theme', theme);
      btn.innerHTML = theme === 'light' ? '<i class="bx bx-moon"></i>' : '<i class="bx bx-sun"></i>';
      localStorage.setItem(STORAGE_KEY, theme);
    }
    
    // Remove existing listeners by cloning
    const newBtn = btn.cloneNode(true);
    btn.parentNode.replaceChild(newBtn, btn);
    
    // Add click listener
    newBtn.addEventListener('click', () => {
      const current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
      applyTheme(current === 'light' ? 'dark' : 'light');
    });
    
    // Update icon based on current theme
    const currentTheme = root.getAttribute('data-theme') || 'dark';
    newBtn.innerHTML = currentTheme === 'light' ? '<i class="bx bx-moon bx-flashing-hover"></i>' : '<i class="bx bx-sun bx-spin-hover"></i>';
    
    // Convert to Lucide icon
    setTimeout(async () => {
      const icon = newBtn.querySelector('i.bx');
      if (icon) {
        const { replaceBoxiconWithLucide } = await import('../../../utils/lucide-icons.js');
        replaceBoxiconWithLucide(icon, false);
      }
    }, 0);
  }
}

// Logout functionality - attach after DOM is ready
function setupLogoutButton() {
const logoutBtn = document.getElementById('logoutBtn');
  if (!logoutBtn) {
    // Button not found, try again after a short delay
    setTimeout(setupLogoutButton, 100);
    return;
  }

  // Remove existing listeners by cloning
  const newLogoutBtn = logoutBtn.cloneNode(true);
  logoutBtn.parentNode.replaceChild(newLogoutBtn, logoutBtn);
  
  // Convert logout icon to Lucide
  setTimeout(async () => {
    const icon = newLogoutBtn.querySelector('i.bx');
    if (icon) {
      const { replaceBoxiconWithLucide } = await import('../../../utils/lucide-icons.js');
      replaceBoxiconWithLucide(icon, false);
    }
  }, 0);

  newLogoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
  // Try to sign out if Supabase is available, but always clear storage and redirect
  if (supabaseReady && supabase) {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn('Sign out error (continuing anyway):', error);
      }
    } catch (error) {
      console.warn('Sign out failed (continuing anyway):', error);
    }
  } else {
    // Try to initialize one more time
    try {
      const client = await initSupabase();
      if (client) {
        supabase = client;
        supabaseReady = true;
        try {
          await supabase.auth.signOut();
        } catch (e) {
          // Ignore sign out errors if not logged in
        }
      }
    } catch (error) {
      console.warn('Supabase not available, proceeding with logout anyway:', error);
    }
  }

  // Always clear local storage and redirect, regardless of Supabase status
    // Preserve theme preference across logouts
    const savedTheme = localStorage.getItem('hg-theme');
  localStorage.clear();
    if (savedTheme) {
      localStorage.setItem('hg-theme', savedTheme);
    }
  
    // Redirect to unlock page
    window.location.href = '/auth/unlock/unlock.html';
});
}

// Setup logout button after a short delay to ensure DOM is ready
setTimeout(setupLogoutButton, 100);

