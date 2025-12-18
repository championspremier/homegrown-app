// Supabase client configuration
// Replace these with your actual Supabase project credentials
// Get them from: https://app.supabase.com/project/_/settings/api

const SUPABASE_URL = 'https://zponnwrmgqrvrypyqxaj.supabase.co'; // e.g., 'https://xxxxx.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpwb25ud3JtZ3FydnJ5cHlxeGFqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUxOTU3OTQsImV4cCI6MjA4MDc3MTc5NH0.JSZbxMikleyIUWPP3VwNhEMRKmqUPJcBXv7085dPYRc'; // Your anon/public key

// Initialize Supabase client
// Using CDN import for browser compatibility
let supabase;

async function initSupabase() {
  if (typeof window !== 'undefined' && !supabase) {
    try {
      // Check if credentials are still placeholders
      if (!SUPABASE_URL || SUPABASE_URL === 'YOUR_SUPABASE_URL' || 
          !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        console.warn('⚠️ Supabase credentials not configured. Please update src/auth/config/supabase.js');
        return null;
      }
      
      // Import Supabase from CDN - try multiple sources for reliability
      let supabaseModule;
      let createClient;
      
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
        createClient = supabaseModule.createClient;
      } else if (supabaseModule.default?.createClient) {
        createClient = supabaseModule.default.createClient;
      } else if (typeof supabaseModule.default === 'function') {
        createClient = supabaseModule.default;
      } else {
        console.error('❌ createClient not found. Module structure:', supabaseModule);
        console.error('Available keys:', Object.keys(supabaseModule));
        return null;
      }
      
      if (!createClient || typeof createClient !== 'function') {
        console.error('❌ createClient is not a function:', typeof createClient, createClient);
        return null;
      }
      
      
      supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      
      if (!supabase) {
        console.error('Failed to create Supabase client');
        return null;
      }
      
      return supabase;
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      console.error('Error details:', error.message, error.stack);
      return null;
    }
  }
  return supabase;
}

// Export for use in other files
export { initSupabase, SUPABASE_URL, SUPABASE_ANON_KEY };

