// Account Context Utility
// Centralized logic for handling account switcher and determining effective user IDs
// This solves the root cause of all account switcher issues

import { initSupabase } from '../../auth/config/supabase.js';

let supabase = null;
let supabaseReady = false;

// Initialize Supabase
(async function() {
  supabase = await initSupabase();
  if (supabase) {
    supabaseReady = true;
  }
})();

/**
 * Get the current account context - handles all account switcher logic
 * @returns {Promise<Object>} Account context with effective IDs and flags
 */
export async function getAccountContext() {
  // Wait for Supabase to be ready
  if (!supabaseReady || !supabase) {
    await new Promise(resolve => {
      const checkReady = setInterval(() => {
        if (supabaseReady && supabase) {
          clearInterval(checkReady);
          resolve();
        }
      }, 100);
      setTimeout(() => {
        clearInterval(checkReady);
        resolve();
      }, 5000); // Timeout after 5s
    });
  }

  if (!supabase) {
    console.error('Supabase not initialized');
    return null;
  }

  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) {
    return null;
  }

  const actualUserId = session.user.id;
  const currentRole = localStorage.getItem('hg-user-role');
  const selectedPlayerId = localStorage.getItem('selectedPlayerId');

  // Get profile to determine actual role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', actualUserId)
    .single();

  if (!profile) {
    return null;
  }

  const isPlayer = profile.role === 'player';
  const isParent = profile.role === 'parent';
  const viewingAsParent = currentRole === 'parent';
  const viewingAsPlayer = currentRole === 'player';

  // Determine effective IDs
  let effectiveParentId = null;
  let effectivePlayerId = null;
  let allLinkedPlayerIds = [];

  if (isPlayer && viewingAsParent) {
    // Player viewing as parent - find parent and all siblings
    // Use RPC function to avoid 406 errors for player-only accounts
    try {
      const { data: parentId, error: rpcError } = await supabase.rpc('get_player_parent_id', {
        p_player_id: actualUserId
      });
      
      if (!rpcError && parentId) {
        effectiveParentId = parentId;
        
        // Get all players linked to this parent
        const { data: allRelationships } = await supabase
          .from('parent_player_relationships')
          .select('player_id')
          .eq('parent_id', effectiveParentId);
        
        allLinkedPlayerIds = allRelationships?.map(r => r.player_id) || [];
        effectivePlayerId = selectedPlayerId || actualUserId;
      } else {
        // Player-only account - no parent relationship
        effectivePlayerId = selectedPlayerId || actualUserId;
        allLinkedPlayerIds = [actualUserId];
      }
    } catch (error) {
      // Player-only account - no parent relationship
      effectivePlayerId = selectedPlayerId || actualUserId;
      allLinkedPlayerIds = [actualUserId];
    }
  } else if (isParent && viewingAsPlayer) {
    // Parent viewing as player
    effectiveParentId = actualUserId;
    effectivePlayerId = selectedPlayerId || null;
    
    // Get all linked players
    const { data: relationships } = await supabase
      .from('parent_player_relationships')
      .select('player_id')
      .eq('parent_id', actualUserId);
    
    allLinkedPlayerIds = relationships?.map(r => r.player_id) || [];
  } else if (isParent) {
    // Parent viewing as parent
    effectiveParentId = actualUserId;
    
    // Get all linked players
    const { data: relationships } = await supabase
      .from('parent_player_relationships')
      .select('player_id')
      .eq('parent_id', actualUserId);
    
    allLinkedPlayerIds = relationships?.map(r => r.player_id) || [];
  } else if (isPlayer) {
    // Player viewing as player
    effectivePlayerId = actualUserId;
    allLinkedPlayerIds = [actualUserId];
    
    // Find parent for RLS purposes (player-only accounts won't have a relationship)
    // Use RPC function to avoid 406 errors (bypasses RLS)
    try {
      const { data: parentId, error: rpcError } = await supabase.rpc('get_player_parent_id', {
        p_player_id: actualUserId
      });
      
      if (!rpcError && parentId) {
        effectiveParentId = parentId;
      }
      // If RPC fails or returns null, player has no parent (player-only account)
      // This is expected and not an error condition
    } catch (error) {
      // Silently ignore - player-only accounts won't have a parent
      // The RPC function should handle this gracefully, but catch just in case
    }
  }

  return {
    // Actual authenticated user
    actualUserId,
    actualRole: profile.role,
    
    // Effective IDs based on account switcher
    effectiveParentId,
    effectivePlayerId,
    allLinkedPlayerIds, // All players that should be visible
    
    // Flags
    isPlayer,
    isParent,
    viewingAsParent,
    viewingAsPlayer,
    selectedPlayerId,
    
    // Helper: Get player IDs to query (for reservations, bookings, etc.)
    getPlayerIdsToQuery() {
      if (viewingAsPlayer && selectedPlayerId) {
        return [selectedPlayerId];
      }
      return allLinkedPlayerIds.length > 0 ? allLinkedPlayerIds : (effectivePlayerId ? [effectivePlayerId] : []);
    },
    
    // Helper: Get ALL linked player IDs (for time slot checking - coach availability)
    // This always returns all linked players regardless of account switcher state
    // because if one player books a slot, the coach is unavailable for all players
    getAllLinkedPlayerIds() {
      return allLinkedPlayerIds.length > 0 ? allLinkedPlayerIds : (effectivePlayerId ? [effectivePlayerId] : []);
    },
    
    // Helper: Get the correct player ID for actions (reservations, bookings)
    getPlayerIdForAction() {
      if (viewingAsPlayer && selectedPlayerId) {
        return selectedPlayerId;
      }
      return effectivePlayerId || actualUserId;
    },
    
    // Helper: Get the correct user ID for profile/photos
    getUserIdForProfile() {
      if (viewingAsPlayer && selectedPlayerId) {
        return selectedPlayerId;
      }
      if (viewingAsParent && isPlayer) {
        // Player viewing as parent - use selected player or actual user
        return selectedPlayerId || actualUserId;
      }
      return effectivePlayerId || actualUserId;
    }
  };
}

/**
 * Get Supabase client (for use in other files that need it)
 */
export function getSupabase() {
  return supabase;
}

/**
 * Check if Supabase is ready
 */
export function isSupabaseReady() {
  return supabaseReady;
}

