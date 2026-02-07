// Supabase client configuration
// Replace these with your actual Supabase project credentials
// Get them from: https://app.supabase.com/project/_/settings/api

const SUPABASE_URL = 'https://zponnwrmgqrvrypyqxaj.supabase.co'; // e.g., 'https://xxxxx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwb25ud3JtZ3FydnJ5cHlxeGFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxOTU3OTQsImV4cCI6MjA4MDc3MTc5NH0.JSZbxMikleyIUWPP3VwNhEMRKmqUPJcBXv7085dPYRc'; // Your anon/public key

// Initialize Supabase client
// Using CDN import for browser compatibility
// Singleton pattern using window object to ensure only one client instance across all modules
// This is necessary because dynamically loaded modules have separate scopes

// Use window object for true global singleton (works across dynamically loaded modules)
if (typeof window !== 'undefined' && !window.__homegrownSupabase) {
  window.__homegrownSupabase = {
    client: null,
    createClientFn: null,
    initPromise: null
  };
}

async function initSupabase() {
  if (typeof window === 'undefined') {
    return null;
  }

  const singleton = window.__homegrownSupabase;
  
  // Return existing client if already initialized
  if (singleton.client) {
    return singleton.client;
  }

  // If initialization is in progress, wait for it
  if (singleton.initPromise) {
    return singleton.initPromise;
  }

  // Start initialization
  singleton.initPromise = (async () => {
    try {
      // Check if credentials are still placeholders
      if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL' || 
          !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        console.warn('⚠️ Supabase credentials not configured. Please update src/auth/config/supabase.js');
        return null;
      }
      
      // Only import createClient once and cache it globally
      if (!singleton.createClientFn) {
        let supabaseModule;
        
        // Try esm.sh first
        try {
          supabaseModule = await import('https://esm.sh/@supabase/supabase-js@2');
        } catch (e1) {
          console.warn('⚠️ esm.sh failed, trying unpkg:', e1);
          try {
            // Fallback to unpkg
            supabaseModule = await import('https://unpkg.com/@supabase/supabase-js@2/dist/esm/index.js');
          } catch (e2) {
            console.error('❌ Both CDN sources failed:', e1, e2);
            throw e2;
          }
        }
        
        // Extract createClient - check various possible export patterns
        if (supabaseModule.createClient) {
          singleton.createClientFn = supabaseModule.createClient;
        } else if (supabaseModule.default?.createClient) {
          singleton.createClientFn = supabaseModule.default.createClient;
        } else if (typeof supabaseModule.default === 'function') {
          singleton.createClientFn = supabaseModule.default;
        } else {
          console.error('❌ createClient not found. Module structure:', supabaseModule);
          console.error('Available keys:', Object.keys(supabaseModule));
          return null;
        }
        
        if (!singleton.createClientFn || typeof singleton.createClientFn !== 'function') {
          console.error('❌ createClient is not a function:', typeof singleton.createClientFn, singleton.createClientFn);
          return null;
        }
      }
      
      // Create client instance only once (globally)
      if (!singleton.client) {
        singleton.client = singleton.createClientFn(SUPABASE_URL, SUPABASE_ANON_KEY);
        
        if (!singleton.client) {
          console.error('Failed to create Supabase client');
          return null;
        }
      }
      
      return singleton.client;
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      console.error('Error details:', error.message, error.stack);
      return null;
    } finally {
      // Clear the promise so we can retry if needed
      singleton.initPromise = null;
    }
  })();

  return singleton.initPromise;
}

// Export for use in other files
export { initSupabase, SUPABASE_URL, SUPABASE_ANON_KEY };

