// Profile page scripts
// Import path is relative to this file's location: src/app/views/player/profile/
// To reach src/auth/config/supabase.js, we need to go up 4 levels to src/, then into auth/
import { initSupabase } from '../../../../auth/config/supabase.js';

// Initialize Supabase
let supabase;
let supabaseReady = false;

initSupabase().then(client => {
  if (client) {
    supabase = client;
    supabaseReady = true;
    console.log('✅ Supabase initialized in profile');
  } else {
    console.error('❌ Supabase client is null');
  }
}).catch(err => {
  console.error('❌ Failed to initialize Supabase:', err);
});

// Logout functionality
const logoutBtn = document.getElementById('logoutBtn');

logoutBtn?.addEventListener('click', async () => {
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
  localStorage.clear();
  
  // Redirect to unlock page (absolute path from server root)
  window.location.href = '/src/auth/unlock/unlock.html';
});

