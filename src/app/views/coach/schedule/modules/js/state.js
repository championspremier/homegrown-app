// Shared state for coach schedule
export let supabase = null;
export let supabaseReady = false;

export let currentWeekStart = new Date();
export let selectedLocationType = null; // 'on-field' or 'virtual'
export let sessions = [];
export let draggedSession = null; // Track session being dragged

// Individual session types (for configuration interface)
export const INDIVIDUAL_SESSION_TYPES = [
  'Champions Player Progress (CPP)',
  'College Advising',
  'Psychologist',
  'Free Nutrition Consultation'
];

// Repeats Forever Modal state
export let repeatsEndSettings = {
  type: 'never', // 'never', 'date', 'occurrences'
  endDate: null,
  occurrences: null
};

// Edit Session Modal state
export let pendingEditData = null;
export let pendingEditSessionId = null;
export let currentEditingSession = null;

// Initialize Supabase
export async function initSupabaseClient() {
  const { initSupabase } = await import('../../../../../../auth/config/supabase.js');
  const client = await initSupabase();
  if (client) {
    supabase = client;
    supabaseReady = true;
    return true;
  } else {
    console.error('❌ Supabase client is null');
    return false;
  }
}

