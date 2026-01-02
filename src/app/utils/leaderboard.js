/**
 * Leaderboard Utility
 * 
 * Handles loading and displaying the quarterly leaderboard in the top-bar
 */

import { initSupabase } from '../../auth/config/supabase.js';
import { getCurrentQuarter } from './points.js';

let supabase = null;
let supabaseReady = false;

// Initialize Supabase
initSupabase().then(client => {
  if (client) {
    supabase = client;
    supabaseReady = true;
  }
});

/**
 * Load and display the quarterly leaderboard (top 25 players)
 * @param {HTMLElement} container - Container element to render leaderboard
 */
export async function loadLeaderboard(container) {
  if (!container) return;
  
  if (!supabaseReady || !supabase) {
    container.innerHTML = '<div class="leaderboard-loading">Loading leaderboard...</div>';
    return;
  }

  try {
    const { year, quarter } = getCurrentQuarter();
    
    // Call the database function to get leaderboard
    const { data: leaderboard, error } = await supabase.rpc('get_quarterly_leaderboard', {
      p_quarter_year: year,
      p_quarter_number: quarter,
      p_limit: 25
    });

    if (error) {
      console.error('Error loading leaderboard:', error);
      container.innerHTML = '<div class="leaderboard-error">Unable to load leaderboard</div>';
      return;
    }

    if (!leaderboard || leaderboard.length === 0) {
      container.innerHTML = '<div class="leaderboard-empty">No players on leaderboard yet</div>';
      return;
    }

    // Render leaderboard
    container.innerHTML = leaderboard.map(player => {
      const initials = player.avatar_initials || 
        `${(player.player_first_name || '').charAt(0)}${(player.player_last_name || '').charAt(0)}`.toUpperCase();
      const playerName = player.player_first_name || 'Player';
      const points = parseFloat(player.total_points || 0).toFixed(1);
      const position = player.position || 0;

      return `
        <div class="player-leaderboard-item" data-player-id="${player.player_id}">
          <div class="player-circle-img">
            <div class="player-avatar-initials">${initials}</div>
            <div class="player-leader-position">${position}</div>
          </div>
          <div class="player-info">
            <div class="player-name">${playerName}</div>
            <div class="player-points">${points} pts</div>
          </div>
        </div>
      `;
    }).join('');

    // Load profile photos asynchronously for ALL players
    // Wait a bit for DOM to be ready, then load photos
    setTimeout(() => {
      Promise.allSettled(
        leaderboard.map(player => loadPlayerPhoto(player.player_id))
      ).then(results => {
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        // Photo loading complete
      });
    }, 100);

  } catch (error) {
    console.error('Error loading leaderboard:', error);
    container.innerHTML = '<div class="leaderboard-error">Error loading leaderboard</div>';
  }
}

/**
 * Get player's current leaderboard position and points
 * @param {string} playerId - Player's user ID
 * @returns {Promise<Object>} { position: number, points: number } or null
 */
export async function getPlayerLeaderboardStats(playerId) {
  if (!supabaseReady || !supabase || !playerId) return null;

  try {
    const { year, quarter } = getCurrentQuarter();
    
    const [positionResult, pointsResult] = await Promise.all([
      supabase.rpc('get_player_leaderboard_position', {
        p_player_id: playerId,
        p_quarter_year: year,
        p_quarter_number: quarter
      }),
      supabase.rpc('get_player_quarterly_points', {
        p_player_id: playerId,
        p_quarter_year: year,
        p_quarter_number: quarter
      })
    ]);

    if (positionResult.error || pointsResult.error) {
      console.error('Error getting player stats:', positionResult.error || pointsResult.error);
      return null;
    }

    return {
      position: positionResult.data,
      points: parseFloat(pointsResult.data || 0)
    };
  } catch (error) {
    console.error('Error getting player leaderboard stats:', error);
    return null;
  }
}

/**
 * Load player profile photo and update leaderboard item
 * @param {string} playerId - Player's user ID
 */
async function loadPlayerPhoto(playerId) {
  if (!playerId) {
    // loadPlayerPhoto called without playerId
    return;
  }

  // Wait for Supabase to be ready
  if (!supabaseReady || !supabase) {
    // Wait a bit and try again
    setTimeout(() => loadPlayerPhoto(playerId), 100);
    return;
  }

  try {
    // First, check if any files exist in the player's folder
    const { data: files, error: listError } = await supabase.storage
      .from('profile-photos')
      .list(`${playerId}/`, { limit: 10 });

    if (listError) {
      // Error listing files
    }

    // Since bucket is public, try common avatar file extensions directly
    // Try both lowercase and uppercase extensions
    const extensions = ['jpg', 'jpeg', 'png', 'webp', 'JPG', 'JPEG', 'PNG', 'WEBP'];
    let photoUrl = null;

    // Try each extension until we find one that exists
    for (const ext of extensions) {
      const { data: { publicUrl } } = supabase.storage
        .from('profile-photos')
        .getPublicUrl(`${playerId}/avatar.${ext}`);
      
      // Testing photo URL
      
      // Test if image exists by creating an image element
      const testUrlWithCache = `${publicUrl}?t=${Date.now()}&player=${playerId}`;
      const testImg = new Image();
      
      try {
        const imageLoaded = await new Promise((resolve) => {
          let resolved = false;
          testImg.onload = () => {
            if (!resolved) {
              resolved = true;
              // Image loaded successfully
              resolve(true);
            }
          };
          testImg.onerror = (e) => {
            if (!resolved) {
              resolved = true;
              // Image failed to load
              resolve(false);
            }
          };
          testImg.src = testUrlWithCache;
          // Timeout after 2 seconds
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              // Image load timeout
              resolve(false);
            }
          }, 2000);
        });
        
        if (imageLoaded) {
          photoUrl = publicUrl;
          // Found valid photo
          break; // Found a valid image
        }
      } catch (e) {
        // Error testing image
        continue;
      }
    }

    if (!photoUrl) {
      // No photo found with standard extensions
      if (files && files.length > 0) {
        // Try using the actual file name from the list
        const avatarFile = files.find(f => f.name.toLowerCase().startsWith('avatar.'));
        if (avatarFile) {
          const { data: { publicUrl } } = supabase.storage
            .from('profile-photos')
            .getPublicUrl(`${playerId}/${avatarFile.name}`);
          photoUrl = publicUrl;
          // Using actual file name
          
          // Test this URL too
          const testImg2 = new Image();
          const testUrlWithCache2 = `${photoUrl}?t=${Date.now()}&player=${playerId}`;
          try {
            const imageLoaded2 = await new Promise((resolve) => {
              let resolved = false;
              testImg2.onload = () => {
                if (!resolved) {
                  resolved = true;
                  // Actual file loaded successfully
                  resolve(true);
                }
              };
              testImg2.onerror = () => {
                if (!resolved) {
                  resolved = true;
                  // Actual file failed to load
                  resolve(false);
                }
              };
              testImg2.src = testUrlWithCache2;
              setTimeout(() => {
                if (!resolved) {
                  resolved = true;
                  resolve(false);
                }
              }, 2000);
            });
            
            if (!imageLoaded2) {
              // Actual file failed to load, clearing photoUrl
              photoUrl = null;
            }
          } catch (e) {
            // Error testing actual file
            photoUrl = null;
          }
        } else {
          // No file starting with 'avatar.' found
        }
      }
      if (!photoUrl) {
        return; // Still no photo found
      }
    }

    // Wait a bit to ensure DOM is ready
    await new Promise(resolve => setTimeout(resolve, 50));

    // Update the leaderboard item
    const item = document.querySelector(`.player-leaderboard-item[data-player-id="${playerId}"]`);
    if (!item) {
      // Leaderboard item not found
      return; // Item not found
    }

    const circleImg = item.querySelector('.player-circle-img');
    if (!circleImg) {
      // Circle img not found
      return;
    }

    const initials = circleImg.querySelector('.player-avatar-initials');
    const positionBadge = circleImg.querySelector('.player-leader-position');
    
    if (initials) {
      // Create photo element with unique cache-busting for this specific player
      const photo = document.createElement('img');
      photo.src = `${photoUrl}?t=${Date.now()}&player=${playerId}`;
      photo.alt = 'Profile photo';
      photo.className = 'profile-photo-leaderboard';
      
      // Handle image load errors - restore initials if photo fails
      photo.onerror = () => {
        console.error(`Failed to load photo for player ${playerId} from: ${photoUrl}`);
        // Restore initials if photo fails to load
        if (photo.parentNode) {
          const restoredInitials = document.createElement('div');
          restoredInitials.className = 'player-avatar-initials';
          restoredInitials.textContent = initials.textContent;
          photo.replaceWith(restoredInitials);
        }
      };
      
      // Handle successful load
      photo.onload = () => {
        // Photo loaded successfully
        // Force visibility
        photo.style.display = 'block';
        photo.style.visibility = 'visible';
        photo.style.opacity = '1';
      };
      
      // Ensure photo is visible from the start
      photo.style.display = 'block';
      photo.style.visibility = 'visible';
      photo.style.opacity = '1';
      photo.style.width = '100%';
      photo.style.height = '100%';
      photo.style.objectFit = 'cover';
      photo.style.borderRadius = '50%';
      
      // Store position badge reference BEFORE replacing initials
      const badgeText = positionBadge ? positionBadge.textContent : null;
      
      // Replace initials with photo
      initials.replaceWith(photo);
      
      // CRITICAL: Ensure position badge stays in DOM and is visible
      if (positionBadge) {
        // Make sure badge is still in the circleImg
        if (!circleImg.contains(positionBadge)) {
          // Position badge was removed, re-adding
          // Recreate badge if it was lost
          const newBadge = document.createElement('div');
          newBadge.className = 'player-leader-position';
          newBadge.textContent = badgeText || '?';
          newBadge.style.position = 'absolute';
          newBadge.style.top = '-6px';
          newBadge.style.right = '-6px';
          newBadge.style.width = '22px';
          newBadge.style.height = '22px';
          newBadge.style.borderRadius = '50%';
          newBadge.style.background = 'var(--accent)';
          newBadge.style.color = 'var(--text)';
          newBadge.style.fontSize = '12px';
          newBadge.style.fontWeight = '600';
          newBadge.style.display = 'flex';
          newBadge.style.alignItems = 'center';
          newBadge.style.justifyContent = 'center';
          newBadge.style.zIndex = '100';
          circleImg.appendChild(newBadge);
        } else {
          // Force badge visibility
          positionBadge.style.display = 'flex';
          positionBadge.style.visibility = 'visible';
          positionBadge.style.opacity = '0.85';
          positionBadge.style.zIndex = '100';
          positionBadge.style.position = 'absolute';
          // Position badge confirmed visible
        }
      } else {
        // Position badge missing
      }
    } else {
      // Update existing photo
      const existingPhoto = circleImg.querySelector('.profile-photo-leaderboard');
      if (existingPhoto) {
        existingPhoto.src = `${photoUrl}?t=${Date.now()}`;
        console.log(`Photo updated for player ${playerId}`);
      }
    }
  } catch (error) {
    console.error(`Error loading player photo for ${playerId}:`, error);
  }
}

