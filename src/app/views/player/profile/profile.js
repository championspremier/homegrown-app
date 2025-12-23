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
async function getActualUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) return null;
  
  let userId = session.user.id;
  const currentRole = localStorage.getItem('hg-current-role');
  const selectedPlayerId = localStorage.getItem('selectedPlayerId');
  
  // If we're a parent viewing as a player, use the selected player ID
  if (currentRole === 'player' && selectedPlayerId) {
    // Verify the selected player is linked to this parent
    const { data: relationship } = await supabase
      .from('parent_player_relationships')
      .select('player_id')
      .eq('parent_id', session.user.id)
      .eq('player_id', selectedPlayerId)
      .single();
    
    if (relationship) {
      userId = selectedPlayerId;
      console.log(`Using account switcher: using player ID ${userId}`);
    } else {
      console.warn('Selected player ID not linked to parent, using parent ID');
    }
  }
  
  return userId;
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

    // Find avatar file
    const avatarFile = data.find(file => 
      file.name.toLowerCase().startsWith('avatar.')
    );

    if (!avatarFile) {
      return; // No avatar file found
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('profile-photos')
      .getPublicUrl(`${userId}/${avatarFile.name}`);

    const profilePhoto = document.getElementById('profilePhoto');
    const photoPlaceholder = document.getElementById('photoPlaceholder');
    
    if (profilePhoto && photoPlaceholder && publicUrl) {
      profilePhoto.src = publicUrl;
      profilePhoto.style.display = 'block';
      photoPlaceholder.style.display = 'none';
    }

    // Update sidebar and leaderboard photos
    await updateProfilePhotosInUI(publicUrl);

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

    // Upload to storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${userId}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('profile-photos')
      .upload(fileName, file, {
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

  // Update sidebar icon (only for current user)
  const sidebarProfileLink = document.querySelector('.nav-link[data-page="profile"]');
  if (sidebarProfileLink) {
    const existingPhoto = sidebarProfileLink.querySelector('.profile-photo-nav');
    if (existingPhoto) {
      existingPhoto.src = photoUrl;
    } else {
      const icon = sidebarProfileLink.querySelector('.bx-user');
      if (icon) {
        const photo = document.createElement('img');
        photo.className = 'profile-photo-nav';
        photo.src = photoUrl;
        photo.alt = 'Profile photo';
        icon.parentNode.insertBefore(photo, icon);
        icon.style.display = 'none';
      }
    }
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
  
  // Redirect to unlock page (server runs from src directory, serve strips .html extension)
  window.location.href = '/auth/unlock/unlock';
});

// Initialize profile when page loads
initProfile();

