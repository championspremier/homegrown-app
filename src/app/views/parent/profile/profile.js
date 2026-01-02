// Parent profile page scripts
// Import path is relative to this file's location: src/app/views/parent/profile/
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

// Setup logout button after a short delay to ensure DOM is ready
setTimeout(setupLogoutButton, 100);

// Get the actual user ID (handles account switcher)
// When a player switches to parent view, we need to get the parent's ID
async function getActualUserId() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session || !session.user) return null;
  
  const currentRole = localStorage.getItem('hg-user-role');
  console.log('getActualUserId - currentRole:', currentRole, 'session.user.id:', session.user.id);
  
  // If we're in parent view but logged in as a player, find the parent
  if (currentRole === 'parent') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single();
    
    console.log('Current user profile:', profile);
    
    // If current user is actually a player, find their parent
    if (profile && profile.role === 'player') {
      const { data: relationship } = await supabase
        .from('parent_player_relationships')
        .select('parent_id')
        .eq('player_id', session.user.id)
        .single();
      
      console.log('Found parent relationship:', relationship);
      
      if (relationship) {
        console.log('Returning parent ID:', relationship.parent_id);
        return relationship.parent_id;
      }
    }
  }
  
  // Otherwise, use the logged-in user's ID
  console.log('Returning session.user.id:', session.user.id);
  return session.user.id;
}

// Load parent profile data
async function loadParentProfile() {
  if (!supabaseReady || !supabase) {
    console.warn('Supabase not ready, cannot load profile');
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      console.warn('No active session');
      return;
    }

    // Get the actual parent ID (handles account switcher)
    const actualParentId = await getActualUserId();
    console.log('Loading parent profile - actualParentId:', actualParentId, 'session.user.id:', session.user.id);
    
    if (!actualParentId) {
      console.warn('Could not determine parent ID');
      return;
    }

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('first_name, last_name, phone_number, birth_date')
      .eq('id', actualParentId)
      .single();
    
    console.log('Loaded profile:', profile);

    if (error) {
      console.error('Error loading profile:', error);
      return;
    }

    // Populate form fields
    if (profile) {
      document.getElementById('parentFirstName').value = profile.first_name || '';
      document.getElementById('parentLastName').value = profile.last_name || '';
      document.getElementById('parentPhone').value = profile.phone_number || '';
      document.getElementById('parentBirthDate').value = profile.birth_date || '';
      
      // Get email from auth.users (email is not stored in profiles table)
      // We need to get the parent's email, not the logged-in user's email
      // If we're viewing as a player, we need to get the parent's email
      if (actualParentId === session.user.id) {
        // We're viewing our own profile
      document.getElementById('parentEmail').value = session.user.email || '';
      } else {
        // We're viewing someone else's profile (player viewing parent)
        // We can't directly query auth.users, so we'll leave it empty or use a placeholder
        // The email field is readonly anyway, so this is acceptable
        document.getElementById('parentEmail').value = '';
      }
    }
  } catch (error) {
    console.error('Error loading parent profile:', error);
  }
}

// Handle edit parent form submission
const editParentForm = document.getElementById('editParentForm');
const saveParentBtn = document.getElementById('saveParentBtn');
const parentFormMessage = document.getElementById('parentFormMessage');

editParentForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!supabaseReady || !supabase) {
    showMessage(parentFormMessage, 'Supabase not available', 'error');
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      showMessage(parentFormMessage, 'Not logged in', 'error');
      return;
    }

    // Get the actual parent ID (handles account switcher)
    const actualParentId = await getActualUserId();
    if (!actualParentId) {
      showMessage(parentFormMessage, 'Could not determine parent ID', 'error');
      return;
    }

    saveParentBtn.disabled = true;
    saveParentBtn.innerHTML = '<span>Saving...</span>';

    const firstName = document.getElementById('parentFirstName').value.trim();
    const lastName = document.getElementById('parentLastName').value.trim();
    const phone = document.getElementById('parentPhone').value.trim();
    const birthDate = document.getElementById('parentBirthDate').value;

    // Update profile using RPC function to bypass RLS
    // Note: The RPC function uses COALESCE, so passing null preserves existing values
    // We need to pass the actual values (or empty strings) to update them
    const { error: rpcError } = await supabase.rpc('update_user_profile', {
      p_user_id: actualParentId,
      p_first_name: firstName, // Pass the actual value (even if empty string)
      p_last_name: lastName, // Pass the actual value (even if empty string)
      p_phone_number: phone || null, // Phone can be null
      p_birth_date: birthDate || null, // Birth date can be null
      p_program_type: null, // Not applicable for parents - will preserve existing
      p_competitive_level: null, // Not applicable for parents - will preserve existing
      p_team_name: null, // Not applicable for parents - will preserve existing
      p_birth_year: null, // Not applicable for parents - will preserve existing
      p_positions: null, // Not applicable for parents - will preserve existing
      p_referral_source: null // Not applicable for parents - will preserve existing
    });

    if (rpcError) {
      console.error('RPC function error:', rpcError);
      console.error('RPC error code:', rpcError.code);
      console.error('RPC error message:', rpcError.message);
      console.error('RPC error details:', rpcError.details);
      throw new Error(`Profile update failed: ${rpcError.message || 'Unknown error'}`);
    }

    // Verify the update worked by fetching the profile
    const { data: updatedProfile, error: verifyError } = await supabase
      .from('profiles')
      .select('first_name, last_name, phone_number, birth_date')
      .eq('id', actualParentId)
      .single();

    if (verifyError) {
      console.warn('Could not verify profile update (non-critical):', verifyError);
    } else {
      // Check if the update actually changed the values
      if (updatedProfile.first_name !== firstName || updatedProfile.last_name !== lastName) {
        console.warn('Profile update may not have worked - values do not match');
        console.warn('Expected first_name:', firstName, 'Got:', updatedProfile.first_name);
        console.warn('Expected last_name:', lastName, 'Got:', updatedProfile.last_name);
      }
    }

    // Also update auth user metadata for display name consistency
    try {
      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          first_name: firstName,
          last_name: lastName,
        }
      });
      if (metadataError) {
        console.warn('Could not update user metadata (non-critical):', metadataError);
      }
    } catch (metadataErr) {
      console.warn('Error updating user metadata (non-critical):', metadataErr);
    }

    // Reload profile data to reflect changes
    await loadParentProfile();

    showMessage(parentFormMessage, 'Profile updated successfully!', 'success');
    setTimeout(() => {
      parentFormMessage.style.display = 'none';
    }, 3000);
  } catch (error) {
    console.error('Error updating profile:', error);
    showMessage(parentFormMessage, `Error: ${error.message}`, 'error');
  } finally {
    saveParentBtn.disabled = false;
    saveParentBtn.innerHTML = '<span>Save Changes</span>';
  }
});

// Handle add player form submission
const addPlayerForm = document.getElementById('addPlayerForm');
const addPlayerBtn = document.getElementById('addPlayerBtn');
const playerFormMessage = document.getElementById('playerFormMessage');

addPlayerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  if (!supabaseReady || !supabase) {
    showMessage(playerFormMessage, 'Supabase not available', 'error');
    return;
  }

  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session || !session.user) {
      showMessage(playerFormMessage, 'Not logged in', 'error');
      return;
    }

    const parentId = session.user.id;
    const parentEmail = session.user.email;
    
    // Store parent session tokens BEFORE signing out
    const parentAccessToken = session.access_token;
    const parentRefreshToken = session.refresh_token;

    // Get form values
    const email = document.getElementById('playerEmail').value.trim();
    const password = document.getElementById('playerPassword').value;
    const firstName = document.getElementById('playerFirstName').value.trim();
    const lastName = document.getElementById('playerLastName').value.trim();
    const programType = document.getElementById('playerProgramType').value;
    const teamName = document.getElementById('playerTeamName').value.trim();
    const birthDate = document.getElementById('playerBirthDate').value;
    const competitiveLevel = document.getElementById('playerCompetitiveLevel').value;
    const referralSource = document.getElementById('playerReferralSource').value;
    
    // Get selected positions
    const positionCheckboxes = addPlayerForm.querySelectorAll('input[name="positions"]:checked');
    const positions = Array.from(positionCheckboxes).map(cb => cb.value);

    // Validation
    if (!email || !password || !firstName || !lastName || !programType || !birthDate || !competitiveLevel) {
      showMessage(playerFormMessage, 'Please complete all required fields', 'error');
      return;
    }

    if (password.length < 6) {
      showMessage(playerFormMessage, 'Password must be at least 6 characters', 'error');
      return;
    }

    addPlayerBtn.disabled = true;
    addPlayerBtn.innerHTML = '<span>Creating Account...</span>';

    // Extract birth year from birthDate
    const birthYear = new Date(birthDate).getFullYear();

    // 1. Sign out parent to create player account
    await supabase.auth.signOut();

    // 2. Create player auth account
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'player',
          first_name: firstName,
          last_name: lastName,
          program_type: programType,
          team_name: teamName || null,
          birth_year: parseInt(birthYear),
          competitive_level: competitiveLevel,
          positions: positions.length > 0 ? positions : null,
          referral_source: referralSource || null,
        }
      }
    });

    if (authError) throw authError;
    if (!authData.user) throw new Error('User creation failed');

    const playerId = authData.user.id;

    // 3. Wait for session and profile creation
    await new Promise(resolve => setTimeout(resolve, 500));

    // 4. Update profile with complete information using RPC function
    const { error: rpcError } = await supabase.rpc('update_user_profile', {
      p_user_id: playerId,
      p_first_name: firstName,
      p_last_name: lastName,
      p_program_type: programType,
      p_competitive_level: competitiveLevel,
      p_phone_number: null,
      p_team_name: teamName || null,
      p_birth_year: parseInt(birthYear),
      p_positions: positions.length > 0 ? positions : null,
      p_referral_source: referralSource || null
    });

    if (rpcError) {
      console.error('RPC function error:', rpcError);
      throw new Error(`Profile update failed: ${rpcError.message}`);
    }

    // 4b. Sync player to Notion
    let notionError = null;
    try {
      // Call Supabase Edge Function to sync to Notion
      const { data: result, error: notionSyncError } = await supabase.functions.invoke('sync-to-notion', {
        body: {
          firstName,
          lastName,
          programType,
          teamName,
          birthDate: birthDate, // Already in YYYY-MM-DD format from date input
          competitiveLevel,
          positions,
          referralSource,
          email,
          phoneNumber: null,
        }
      });
      
      if (notionSyncError) {
        throw notionSyncError;
      }
    } catch (error) {
      notionError = error;
      console.error('❌ Notion sync failed:', error);
      console.error('❌ Notion sync error details:', {
        message: error.message,
        stack: error.stack,
        type: error.constructor.name
      });
      console.warn('⚠️ Notion sync failed, but account was created successfully in Supabase.');
      console.warn('⚠️ You may need to manually add this player to Notion.');
    }

    // 5. Create relationship using RPC function (player is now logged in, so they can call it)
    let relationshipCreated = false;
    
    try {
      // Wait a bit for the player session to settle
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Call the RPC function to create the relationship
      // The player is currently logged in, so auth.uid() will be the player_id
      // The function now returns JSONB instead of a table
      const { data: relationshipData, error: relationshipError } = await supabase.rpc(
        'create_parent_player_relationship',
        {
          p_parent_id: parentId,
          p_player_id: playerId,
          p_relationship_type: 'primary'
        }
      );

      if (relationshipError) {
        console.error('❌ Relationship creation error:', relationshipError);
        console.error('❌ Error code:', relationshipError.code);
        console.error('❌ Error message:', relationshipError.message);
        console.error('❌ Error details:', relationshipError.details);
        console.error('❌ Error hint:', relationshipError.hint);
      } else if (relationshipData && relationshipData.success) {
        relationshipCreated = true;
      } else {
        console.error('❌ Relationship creation returned unexpected data:', relationshipData);
      }
    } catch (error) {
      console.error('❌ Error creating relationship with RPC function:', error);
    }
    
    // 6. Sign out player and restore parent session
    if (relationshipCreated && parentAccessToken && parentRefreshToken) {
      try {
        // Sign out the player
        await supabase.auth.signOut();
        
        // Wait a moment for sign out to complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Note: Stored tokens become invalid after sign-out, so we can't restore the session automatically
        // The relationship is already created, so we'll redirect to login
        // When the parent logs back in, they'll see the new player in their account switcher
        showMessage(playerFormMessage, 'Player account created and linked successfully! When a parent creates a player account, Supabase automatically signs you in as the new player, which invalidates your parent session tokens (this is expected behavior). The player account and relationship have been created successfully. You will be signed out in 3 seconds. After logging back in as the parent, the new player will appear in your account switcher.', 'success');
        
        // Sign out after 3 seconds
        setTimeout(async () => {
          await supabase.auth.signOut();
          window.location.href = '../../auth/login-signup/login-signup.html';
        }, 3000);
      } catch (error) {
        console.error('❌ Error restoring parent session:', error);
        showMessage(playerFormMessage, 'Player account created and linked successfully! Redirecting to login in 10 seconds (check console for details)...', 'success');
        setTimeout(() => {
          window.location.href = '../../auth/login-signup/login-signup.html';
        }, 10000);
      }
    } else if (relationshipCreated) {
      showMessage(playerFormMessage, 'Player account created and linked successfully! Redirecting to login in 10 seconds...', 'success');
      setTimeout(() => {
        window.location.href = '../../auth/login-signup/login-signup.html';
      }, 10000);
    } else {
      showMessage(playerFormMessage, 'Player account created! However, the relationship could not be created automatically. Please check the console for errors. You may need to run the SQL migration to create the RPC function, or create the relationship manually in Supabase.', 'error');
    }

    // Reset form
    addPlayerForm.reset();
    
    // Refresh account switcher if available
    if (window.loadLinkedAccounts) {
      setTimeout(() => {
        window.loadLinkedAccounts();
      }, 1000);
    }

    setTimeout(() => {
      playerFormMessage.style.display = 'none';
    }, 5000);
  } catch (error) {
    console.error('Error creating player account:', error);
    showMessage(playerFormMessage, `Error: ${error.message}`, 'error');
  } finally {
    addPlayerBtn.disabled = false;
    addPlayerBtn.innerHTML = '<span>Add Player Account</span>';
  }
});

// Helper function to show messages
function showMessage(element, message, type) {
  element.textContent = message;
  element.className = `form-message ${type}`;
  element.style.display = 'block';
}

// Load profile when page loads
initSupabase().then(client => {
  if (client) {
    supabase = client;
    supabaseReady = true;
    loadParentProfile();
  }
});

