// Profile page scripts
// Import path is relative to this file's location: src/app/views/player/profile/
// To reach src/auth/config/supabase.js, we need to go up 4 levels to src/, then into auth/
import { initSupabase } from '../../../../auth/config/supabase.js';
import { getAccountContext } from '../../../utils/account-context.js';

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


// Wait for Supabase to be ready, then initialize profile
async function initProfile() {
  if (!supabaseReady || !supabase) {
    // Wait a bit and try again
    setTimeout(initProfile, 100);
    return;
  }

  try {
    await loadPlayerProfile();
    setupFormHandlers();
    setupPhotoHandlers();
  } catch (error) {
    console.error('Error initializing profile:', error);
  }
}

// Get the actual user ID (handles account switcher)
// Now uses centralized account context utility
async function getActualUserId() {
  const context = await getAccountContext();
  if (!context) return null;
  
  // Use the helper method that determines the correct user ID for profile/photos
  return context.getUserIdForProfile();
}

// Load player profile data from Supabase
async function loadPlayerProfile() {
  if (!supabaseReady || !supabase) return;

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      console.error('Not logged in');
      return;
    }

    // Get the actual user ID (handles account switcher)
    const userId = await getActualUserId();
    if (!userId) {
      console.error('Could not determine user ID');
      return;
    }

    console.log(`Loading profile for user ID: ${userId}`);

    // Get profile data
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('first_name, last_name, phone_number, birth_year')
      .eq('id', userId)
      .single();

    if (profileError) {
      console.error('Error loading profile:', profileError);
      showMessage('playerFormMessage', 'Error loading profile data', 'error');
      return;
    }

    // Get email from auth.users for the specific userId
    // Note: We can't directly query auth.users, so we'll try to get it from the session
    // If userId is different from session.user.id, we need to use a different approach
    let email = '';
    if (userId === session.user.id) {
      // Same user, get email from session
      email = session.user.email || '';
    } else {
      // Different user (account switcher), try to get email from profile or use a placeholder
      // For now, we'll leave it empty or try to get it via RPC if available
      console.log(`Note: Email for player ${userId} may not be available (account switcher)`);
      // You could implement an RPC call here to get the email if needed
    }

    // Populate form fields
    document.getElementById('playerFirstName').value = profile.first_name || '';
    document.getElementById('playerLastName').value = profile.last_name || '';
    document.getElementById('playerEmail').value = email;
    document.getElementById('playerPhone').value = profile.phone_number || '';
    document.getElementById('playerBirthYear').value = profile.birth_year || '';

    // Load profile photo if exists
    await loadProfilePhoto(userId);

  } catch (error) {
    console.error('Error loading player profile:', error);
    showMessage('playerFormMessage', 'Error loading profile data', 'error');
  }
}

// Save player profile data to Supabase
async function savePlayerProfile(formData) {
  if (!supabaseReady || !supabase) {
    showMessage('playerFormMessage', 'Database not ready. Please try again.', 'error');
    return false;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      showMessage('playerFormMessage', 'Not logged in', 'error');
      return false;
    }

    // Get the actual user ID (handles account switcher)
    const userId = await getActualUserId();
    if (!userId) {
      showMessage('playerFormMessage', 'Could not determine user ID', 'error');
      return false;
    }
    
    console.log(`Saving profile for user ID: ${userId}`);

    // Update profile
    const { error } = await supabase
      .from('profiles')
      .update({
        first_name: formData.firstName,
        last_name: formData.lastName,
        phone_number: formData.phone || null,
        birth_year: formData.birthYear ? parseInt(formData.birthYear) : null
      })
      .eq('id', userId);

    if (error) {
      console.error('Error saving profile:', error);
      showMessage('playerFormMessage', `Error saving profile: ${error.message}`, 'error');
      return false;
    }

    showMessage('playerFormMessage', 'Profile updated successfully!', 'success');
    return true;

  } catch (error) {
    console.error('Error saving player profile:', error);
    showMessage('playerFormMessage', 'Error saving profile data', 'error');
    return false;
  }
}

// Setup form submission handler
function setupFormHandlers() {
  const form = document.getElementById('editPlayerForm');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const formData = {
      firstName: document.getElementById('playerFirstName').value.trim(),
      lastName: document.getElementById('playerLastName').value.trim(),
      phone: document.getElementById('playerPhone').value.trim(),
      birthYear: document.getElementById('playerBirthYear').value
    };

    // Validation
    if (!formData.firstName || !formData.lastName) {
      showMessage('playerFormMessage', 'First name and last name are required', 'error');
      return;
    }

    if (formData.birthYear && (parseInt(formData.birthYear) < 2000 || parseInt(formData.birthYear) > 2016)) {
      showMessage('playerFormMessage', 'Birth year must be between 2000 and 2016', 'error');
      return;
    }

    // Show loading state
    const saveBtn = document.getElementById('savePlayerBtn');
    const originalText = saveBtn.innerHTML;
    saveBtn.disabled = true;
    saveBtn.innerHTML = '<span>Saving...</span>';

    const success = await savePlayerProfile(formData);

    // Reset button
    saveBtn.disabled = false;
    saveBtn.innerHTML = originalText;

    if (success) {
      // Reload profile to ensure consistency
      setTimeout(() => loadPlayerProfile(), 500);
    }
  });
}

// Setup photo upload handlers
function setupPhotoHandlers() {
  const photoEditBtn = document.getElementById('photoEditBtn');
  const photoInput = document.getElementById('photoInput');
  const profilePhoto = document.getElementById('profilePhoto');
  const photoPlaceholder = document.getElementById('photoPlaceholder');

  if (!photoEditBtn || !photoInput) return;

  photoEditBtn.addEventListener('click', () => {
    photoInput.click();
  });

  photoInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      showMessage('photoMessage', 'Please select an image file', 'error');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      showMessage('photoMessage', 'Image size must be less than 5MB', 'error');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = (event) => {
      profilePhoto.src = event.target.result;
      profilePhoto.style.display = 'block';
      photoPlaceholder.style.display = 'none';
    };
    reader.readAsDataURL(file);

    // Upload to Supabase Storage
    await uploadProfilePhoto(file);
  });
}

// Load profile photo from Supabase Storage
async function loadProfilePhoto(userId) {
  if (!supabaseReady || !supabase) return;

  try {
    // List files to find avatar
    const { data, error } = await supabase.storage
      .from('profile-photos')
      .list(`${userId}/`, {
        limit: 100
      });

    if (error || !data || data.length === 0) {
      // No photo exists, show placeholder
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
      return; // No avatar file found
    }

    // Get public URL with cache-busting
    const { data: { publicUrl } } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(`${userId}/${avatarFile.name}`);
    
    // Add cache-busting timestamp
    const photoUrlWithCache = `${publicUrl}?t=${Date.now()}`;

    const profilePhoto = document.getElementById('profilePhoto');
    const photoPlaceholder = document.getElementById('photoPlaceholder');
    
    if (profilePhoto && photoPlaceholder && photoUrlWithCache) {
      profilePhoto.src = photoUrlWithCache;
      profilePhoto.style.display = 'block';
      photoPlaceholder.style.display = 'none';
    }

    // Update sidebar and leaderboard photos
    await updateProfilePhotosInUI(photoUrlWithCache);

  } catch (error) {
    console.error('Error loading profile photo:', error);
  }
}

// Upload profile photo to Supabase Storage
async function uploadProfilePhoto(file) {
  if (!supabaseReady || !supabase) {
    showMessage('photoMessage', 'Database not ready. Please try again.', 'error');
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      showMessage('photoMessage', 'Not logged in', 'error');
      return;
    }

    // Get the actual user ID (handles account switcher)
    const userId = await getActualUserId();
    if (!userId) {
      showMessage('photoMessage', 'Could not determine user ID', 'error');
      return;
    }
    
    console.log(`Uploading photo for user ID: ${userId}`);

    // First, delete all existing avatar files for this user
    try {
      const { data: existingFiles, error: listError } = await supabase.storage
        .from('profile-photos')
        .list(`${userId}/`, {
          limit: 100
        });

      if (!listError && existingFiles) {
        // Find all avatar files (any extension)
        const avatarFiles = existingFiles.filter(file => 
          file.name.toLowerCase().startsWith('avatar.')
        );

        // Delete all old avatar files
        for (const avatarFile of avatarFiles) {
          const { error: deleteError } = await supabase.storage
            .from('profile-photos')
            .remove([`${userId}/${avatarFile.name}`]);
          
          if (deleteError) {
            console.warn(`Could not delete old avatar file ${avatarFile.name}:`, deleteError);
          }
        }
      }
    } catch (error) {
      console.warn('Error cleaning up old avatar files:', error);
      // Continue with upload even if cleanup fails
    }

    // Upload to storage - always use .png extension for consistency
    // Convert image to PNG format if needed
    const fileName = `${userId}/avatar.png`;

    // Convert file to blob if it's not already PNG
    let fileToUpload = file;
    if (!file.type.includes('png')) {
      // Convert to PNG using canvas
      try {
        const img = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = e.target.result;
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        fileToUpload = await new Promise((resolve) => {
          canvas.toBlob((blob) => {
            resolve(new File([blob], 'avatar.png', { type: 'image/png' }));
          }, 'image/png');
        });
      } catch (conversionError) {
        console.warn('Could not convert image to PNG, uploading original:', conversionError);
        // Fall back to original file
      }
    }

    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, fileToUpload, {
        cacheControl: '3600',
        upsert: true
      });

    if (uploadError) {
      console.error('Error uploading photo:', uploadError);
      showMessage('photoMessage', `Error uploading photo: ${uploadError.message}`, 'error');
      return;
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(fileName);

    showMessage('photoMessage', 'Photo uploaded successfully!', 'success');

    // Update UI
    await updateProfilePhotosInUI(publicUrl);

  } catch (error) {
    console.error('Error uploading profile photo:', error);
    showMessage('photoMessage', 'Error uploading photo', 'error');
  }
}

// Update profile photos in sidebar and leaderboard
async function updateProfilePhotosInUI(photoUrl) {
  if (!photoUrl) return;

  // Get the actual user ID (handles account switcher)
  const userId = await getActualUserId();
  if (!userId) {
    console.warn('Could not determine user ID for photo update');
    return;
  }
  
  console.log(`Updating photo UI for user ID: ${userId}`);

  // Update profile photo on the profile page itself
  const profilePhoto = document.getElementById('profilePhoto');
  const photoPlaceholder = document.getElementById('photoPlaceholder');
  if (profilePhoto && photoPlaceholder) {
    // Add cache-busting to ensure latest photo is loaded
    profilePhoto.src = `${photoUrl}?t=${Date.now()}`;
    profilePhoto.style.display = 'block';
    photoPlaceholder.style.display = 'none';
  }

  // Update sidebar photo using the utility (which respects account context)
  // This ensures the photo only shows if we're still viewing that account
  try {
    const { updateSidebarPhoto } = await import('../../../utils/sidebar-photo.js');
    await updateSidebarPhoto();
  } catch (error) {
    console.error('Error updating sidebar photo:', error);
  }

  // Update ONLY the current user's leaderboard item (by userId)
  const leaderboardItem = document.querySelector(`.player-leaderboard-item[data-player-id="${userId}"]`);
  if (leaderboardItem) {
    const circleImg = leaderboardItem.querySelector('.player-circle-img');
    if (circleImg) {
      const initials = circleImg.querySelector('.player-avatar-initials');
      if (initials) {
        // Replace initials with photo
        // Add cache-busting to ensure latest photo is loaded
        const photo = document.createElement('img');
        photo.src = `${photoUrl}?t=${Date.now()}`;
        photo.alt = 'Profile photo';
        photo.className = 'profile-photo-leaderboard';
        photo.style.width = '100%';
        photo.style.height = '100%';
        photo.style.objectFit = 'cover';
        photo.style.borderRadius = '50%';
        initials.replaceWith(photo);
      } else {
        // Update existing photo with cache-busting
        const existingPhoto = circleImg.querySelector('.profile-photo-leaderboard');
        if (existingPhoto) {
          existingPhoto.src = `${photoUrl}?t=${Date.now()}`;
        }
      }
    }
  }

  // Reload leaderboard to ensure all photos are loaded (this will load photos for ALL players)
  const container = document.getElementById('leaderboardContainer');
  if (container) {
    try {
      const { loadLeaderboard } = await import('../../../utils/leaderboard.js');
      await loadLeaderboard(container);
    } catch (error) {
      console.error('Error reloading leaderboard:', error);
    }
  }
}

// Show message helper
function showMessage(elementId, message, type = 'success') {
  const messageEl = document.getElementById(elementId);
  if (!messageEl) return;

  messageEl.textContent = message;
  messageEl.className = `form-message ${type}`;

  // Clear message after 5 seconds
  setTimeout(() => {
    messageEl.textContent = '';
    messageEl.className = 'form-message';
  }, 5000);
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

// Initialize profile when page loads
initProfile();

// Setup logout button after a short delay to ensure DOM is ready
setTimeout(setupLogoutButton, 100);

