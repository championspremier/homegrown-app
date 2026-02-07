// Sidebar Photo Utility
// Handles updating the sidebar profile photo based on the current account context

import { getAccountContext } from './account-context.js';
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
 * Update the sidebar profile photo based on the current account context.
 * If photoUrl is provided (e.g. after upload), sets it immediately without fetching.
 */
export async function updateSidebarPhoto(photoUrl) {
  if (photoUrl) {
    setSidebarPhoto(photoUrl);
    return;
  }

  if (!supabaseReady || !supabase) {
    setTimeout(() => updateSidebarPhoto(), 100);
    return;
  }

  try {
    // Get account context to determine which user's photo to show
    const context = await getAccountContext();
    if (!context) {
      // No context available, hide photo and show icon
      resetSidebarPhoto();
      return;
    }

    // Determine which user ID to use for the photo
    // For sidebar, we want to show the photo of the currently active account
    // NOTE: Only players can have profile photos, not parents
    let userIdForPhoto = null;
    
    if (context.viewingAsPlayer && context.selectedPlayerId) {
      // Parent viewing as a specific player via account switcher - show player's photo
      userIdForPhoto = context.selectedPlayerId;
    } else if (context.isPlayer && !context.viewingAsParent) {
      // Logged in as player, viewing as player - show player's photo
      userIdForPhoto = context.actualUserId;
    } else if (context.isParent && !context.viewingAsPlayer) {
      // Logged in as parent, viewing as parent - parents don't have photos
      resetSidebarPhoto();
      return;
    } else if (context.isPlayer) {
      // Player in any other context - show player's photo
      userIdForPhoto = context.actualUserId;
    } else {
      // Parent or other role - no photo
      resetSidebarPhoto();
      return;
    }

    if (!userIdForPhoto) {
      resetSidebarPhoto();
      return;
    }

    // Verify this is actually a player before trying to load photo
    // Double-check by verifying the profile role
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', userIdForPhoto)
        .single();
      
      if (!profile || profile.role !== 'player') {
        // Not a player, don't show photo
        resetSidebarPhoto();
        return;
      }
    } catch (error) {
      // Error checking profile, don't show photo
      resetSidebarPhoto();
      return;
    }

    // Try to load the photo for this player
    await loadAndSetSidebarPhoto(userIdForPhoto);

  } catch (error) {
    console.error('Error updating sidebar photo:', error);
    resetSidebarPhoto();
  }
}

/**
 * Load and set the sidebar photo for a specific user
 */
async function loadAndSetSidebarPhoto(userId) {
  if (!supabase || !userId) {
    resetSidebarPhoto();
    return;
  }

  try {
    // List files to find avatar
    const { data, error } = await supabase.storage
      .from('profile-photos')
      .list(`${userId}/`, {
        limit: 100
      });

    if (error || !data || data.length === 0) {
      // No photo exists, show icon
      resetSidebarPhoto();
      return;
    }

    // Find avatar file - prefer .png, but fall back to any avatar file
    let avatarFile = data.find(file => 
      file.name.toLowerCase() === 'avatar.png'
    );
    
    // If no .png found, look for any avatar file
    if (!avatarFile) {
      avatarFile = data.find(file => 
        file.name.toLowerCase().startsWith('avatar.')
      );
    }

    if (!avatarFile) {
      // No avatar file found, show icon
      resetSidebarPhoto();
      return;
    }

    // Get public URL with cache-busting
    const { data: { publicUrl } } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(`${userId}/${avatarFile.name}`);
    
    const photoUrlWithCache = `${publicUrl}?t=${Date.now()}`;

    if (!photoUrlWithCache) {
      resetSidebarPhoto();
      return;
    }

    // Update sidebar with photo
    setSidebarPhoto(photoUrlWithCache);

  } catch (error) {
    console.error('Error loading sidebar photo:', error);
    resetSidebarPhoto();
  }
}

/**
 * Set the sidebar photo
 * Supports both Boxicons (.bx-user) and Lucide (svg[data-lucide="user"]) in the Profile nav link
 */
function setSidebarPhoto(photoUrl) {
  const sidebarProfileLink = document.querySelector('.nav-link[data-page="profile"]');
  if (!sidebarProfileLink) return;

  const existingPhoto = sidebarProfileLink.querySelector('.profile-photo-nav');
  const icon = sidebarProfileLink.querySelector('.bx-user, .bxs-user, svg[data-lucide="user"], svg.lucide-icon');

  if (existingPhoto) {
    existingPhoto.src = `${photoUrl}?t=${Date.now()}`;
    existingPhoto.style.display = 'block';
  } else if (icon) {
    const photo = document.createElement('img');
    photo.className = 'profile-photo-nav';
    photo.src = `${photoUrl}?t=${Date.now()}`;
    photo.alt = 'Profile photo';
    icon.parentNode.insertBefore(photo, icon);
    icon.style.display = 'none';
  }
}

/**
 * Reset sidebar photo (remove photo and show icon)
 * Supports both Boxicons and Lucide in the Profile nav link
 */
function resetSidebarPhoto() {
  const sidebarProfileLink = document.querySelector('.nav-link[data-page="profile"]');
  if (!sidebarProfileLink) return;

  const existingPhoto = sidebarProfileLink.querySelector('.profile-photo-nav');
  const icon = sidebarProfileLink.querySelector('.bx-user, .bxs-user, svg[data-lucide="user"], svg.lucide-icon');

  if (existingPhoto) {
    existingPhoto.remove();
  }

  if (icon) {
    icon.style.display = '';
  }
}

/**
 * Initialize sidebar photo on page load and listen for account switches
 */
export function initSidebarPhoto() {
  // Update photo on initial load
  updateSidebarPhoto();

  // Listen for account switcher changes
  window.addEventListener('accountSwitched', () => {
    updateSidebarPhoto();
  });

  // Listen for localStorage changes (account switcher uses localStorage)
  window.addEventListener('storage', (e) => {
    if (e.key === 'hg-user-role' || e.key === 'selectedPlayerId') {
      updateSidebarPhoto();
    }
  });
}

