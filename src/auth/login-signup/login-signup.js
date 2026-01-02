import { initSupabase } from '../config/supabase.js';

const root = document.getElementById('authRoot');
const toSignup = document.getElementById('toSignup');
const toLogin = document.getElementById('toLogin');
const toCoachLogin = document.getElementById('toCoachLogin');
const loginForm = document.getElementById('loginForm');
const loginBtn = document.getElementById('loginBtn');
const leftTitle = document.getElementById('leftTitle');
const rightTitle = document.getElementById('rightTitle');
const rightDescription = document.getElementById('rightDescription');

// Role selector elements
const roleSelector = document.getElementById('roleSelector');
const rolePlayerOnly = document.getElementById('rolePlayerOnly');
const roleParentPlayer = document.getElementById('roleParentPlayer');

// Form elements
const playerSignupForm = document.getElementById('playerSignupForm');
const parentPlayerSignupForm = document.getElementById('parentPlayerSignupForm');
const playerSignupBtn = document.getElementById('playerSignupBtn');
const parentPlayerSignupBtn = document.getElementById('parentPlayerSignupBtn');

const DUR = 600;

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

function go(mode) {
  if (!root) return;
  if (root.classList.contains('animating')) return;

  root.classList.add('animating');

  if (mode === 'signup') {
    // Show role selector, hide login form
    root.classList.remove('mode-login');
    root.classList.add('mode-signup');
    
    // Hide login form, show role selector
    loginForm.style.display = 'none';
    roleSelector.style.display = 'flex';
    playerSignupForm.style.display = 'none';
    parentPlayerSignupForm.style.display = 'none';
    
    // Update left panel title
    leftTitle.textContent = 'Sign Up';
    
    // Update right panel content
    rightTitle.textContent = 'One of us';
    rightDescription.textContent = 'Welcome back! Sign in to continue your development journey.';
    
    // Toggle buttons
    toSignup.style.display = 'none';
    toLogin.style.display = 'block';
    toCoachLogin.style.display = 'block'; // Show coach button in signup mode
  } else {
    // Show login form, hide everything else
    root.classList.remove('mode-signup');
    root.classList.add('mode-login');
    
    // Show login form, hide role selector and signup forms
    loginForm.style.display = 'flex';
    roleSelector.style.display = 'none';
    playerSignupForm.style.display = 'none';
    parentPlayerSignupForm.style.display = 'none';
    
    // Update left panel title
    leftTitle.textContent = 'Login';
    
    // Update right panel content
    rightTitle.textContent = 'New Here?';
    rightDescription.textContent = 'Join Homegrown and start your journey to becoming an elite soccer player.';
    
    // Toggle buttons
    toSignup.style.display = 'block';
    toLogin.style.display = 'none';
    toCoachLogin.style.display = 'none'; // Hide coach button in login mode
  }

  setTimeout(() => {
    root.classList.remove('animating');
  }, DUR);
}

// Handle role selection
function selectRole(role) {
  if (role === 'player') {
    // Show player only form
    roleSelector.style.display = 'none';
    playerSignupForm.style.display = 'flex';
    parentPlayerSignupForm.style.display = 'none';
  } else if (role === 'parent-player') {
    // Show parent + player form
    roleSelector.style.display = 'none';
    playerSignupForm.style.display = 'none';
    parentPlayerSignupForm.style.display = 'flex';
  }
}

// Initialize to login mode (Login form on left, "New Here?" on right)
if (root) {
  root.classList.add('mode-login');
  // Ensure initial state is correct
  leftTitle.textContent = 'Login';
  rightTitle.textContent = 'New Here?';
  rightDescription.textContent = 'Join Homegrown and start your journey to becoming an elite soccer player.';
  toSignup.style.display = 'block';
  toLogin.style.display = 'none';
  toCoachLogin.style.display = 'none'; // Hide coach button initially (login mode)
}

toSignup?.addEventListener('click', (e) => {
  e.preventDefault();
  go('signup');
});

toLogin?.addEventListener('click', (e) => {
  e.preventDefault();
  go('login');
});

toCoachLogin?.addEventListener('click', (e) => {
  e.preventDefault();
  // Redirect to coach login page
  window.location.href = '../coach-login/coach-login.html';
});

// Role selection handlers
rolePlayerOnly?.addEventListener('click', (e) => {
  e.preventDefault();
  selectRole('player');
});

roleParentPlayer?.addEventListener('click', (e) => {
  e.preventDefault();
  selectRole('parent-player');
});

// Positions toggle functionality - helper function
function setupPositionsToggle(labelId, containerId, placeholderId, checkboxName) {
  const label = document.getElementById(labelId);
  const container = document.getElementById(containerId);
  const placeholder = document.getElementById(placeholderId);

  if (!label || !container || !placeholder) return;

  const checkboxes = document.querySelectorAll(`input[name="${checkboxName}"]`);

  label.addEventListener('click', (e) => {
    if (e.target.type === 'checkbox' || e.target.closest('.position-checkbox')) {
      return;
    }
    if (e.target.closest('.positions-container') && e.target !== container) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    
    const isOpen = container.classList.contains('is-open');
    
    if (isOpen) {
      container.classList.remove('is-open');
      const hasSelected = Array.from(checkboxes).some(cb => cb.checked);
      if (!hasSelected) {
        placeholder.classList.remove('hidden');
      }
    } else {
      container.classList.add('is-open');
      placeholder.classList.add('hidden');
    }
  });

  function updatePlaceholder() {
    const selected = Array.from(checkboxes)
      .filter(cb => cb.checked)
      .map(cb => cb.value);
    
    if (selected.length > 0) {
      placeholder.textContent = `${selected.length} position${selected.length > 1 ? 's' : ''} selected`;
      placeholder.classList.remove('hidden');
    } else {
      placeholder.textContent = 'Select Positions';
    }
  }

  checkboxes.forEach(checkbox => {
    checkbox.addEventListener('change', updatePlaceholder);
  });

  document.addEventListener('click', (e) => {
    if (!label.contains(e.target) && !container.contains(e.target)) {
      container.classList.remove('is-open');
      const hasSelected = Array.from(checkboxes).some(cb => cb.checked);
      if (!hasSelected) {
        placeholder.classList.remove('hidden');
      }
    }
  });
}

// Setup positions toggle for both forms
setupPositionsToggle('positionsLabel', 'positionsContainer', 'positionsPlaceholder', 'positions');
setupPositionsToggle('parentPositionsLabel', 'parentPositionsContainer', 'parentPositionsPlaceholder', 'parentPositions');

// Helper function to create a player account
async function createPlayerAccount(playerData, redirect = true) {
  const { email, password, phone, firstName, lastName, programType, teamName, birthDate, competitiveLevel, positions, referralSource } = playerData;

  // Use firstName and lastName (required fields)
  const playerFirstName = firstName || '';
  const playerLastName = lastName || '';

  // Validation
  if (!email || !password || !playerFirstName || !playerLastName || !programType || !birthDate || !competitiveLevel) {
    throw new Error('Please complete all required fields.');
  }

  // Extract birth year from birthDate for backwards compatibility with database
  // birthDate is in YYYY-MM-DD format from date input
  const birthYear = birthDate ? new Date(birthDate).getFullYear() : null;
  
  if (!birthYear) {
    throw new Error('Please provide a valid birth date.');
  }

  if (password.length < 6) {
    throw new Error('Password must be at least 6 characters.');
  }

  // 1. Create Supabase auth user with metadata
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        role: 'player',
        first_name: playerFirstName,
        last_name: playerLastName,
        program_type: programType,
        team_name: teamName || null,
        birth_year: parseInt(birthYear),
        competitive_level: competitiveLevel,
        positions: positions.length > 0 ? positions : null,
        referral_source: referralSource || null,
        phone_number: phone || null,
      }
    }
  });

  if (authError) throw authError;
  if (!authData.user) throw new Error('User creation failed');

  // 2. Wait for session to be established
  let session = null;
  let attempts = 0;
  const maxAttempts = 5;
  
  while (!session && attempts < maxAttempts) {
    await new Promise(resolve => setTimeout(resolve, 300));
    const { data: { session: currentSession } } = await supabase.auth.getSession();
    session = currentSession;
    attempts++;
  }
  
  // 3. Wait for database trigger to create basic profile
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // 4. Update profile with complete information using RPC function to bypass RLS recursion
  // First try using the update_user_profile function if it exists
  const { error: rpcError } = await supabase.rpc('update_user_profile', {
    p_user_id: authData.user.id,
    p_first_name: playerFirstName,
    p_last_name: playerLastName,
    p_program_type: programType,
    p_competitive_level: competitiveLevel,
    p_phone_number: phone || null,
    p_team_name: teamName || null,
    p_birth_year: parseInt(birthYear),
    p_positions: positions.length > 0 ? positions : null,
    p_referral_source: referralSource || null
  });

  if (rpcError) {
    console.error('❌ RPC function error:', rpcError);
    console.error('❌ RPC error code:', rpcError.code);
    console.error('❌ RPC error message:', rpcError.message);
    console.error('❌ RPC error details:', rpcError.details);
    console.error('❌ RPC error hint:', rpcError.hint);
    
    // If RPC function doesn't exist (code 42883), we need to create it
    if (rpcError.code === '42883' || rpcError.code === 'P0001' || rpcError.message?.includes('does not exist') || rpcError.message?.includes('function') && rpcError.message?.includes('not found')) {
      const errorMsg = 'RPC function update_user_profile does not exist in Supabase.\n\n' +
        'Please run this SQL migration in your Supabase SQL Editor:\n' +
        'sql/migrations/fix-profiles-rls-infinite-recursion.sql\n\n' +
        'This will create the function needed to bypass RLS recursion.';
      alert(errorMsg);
      throw new Error(errorMsg);
    }
    
    // For other RPC errors, throw with details
    throw new Error(`RPC function error: ${rpcError.message || 'Unknown error'}. Please ensure the update_user_profile function exists in Supabase.`);
  } else {
  }
  

  // 5. Send to Notion
  let notionError = null;
  try {
    const data = {
      firstName: playerFirstName,
      lastName: playerLastName,
      programType: programType,
      teamName: teamName,
      birthDate: birthDate,
      competitiveLevel: competitiveLevel,
      positions: positions,
      referralSource: referralSource,
      email: email,
      phoneNumber: phone || null,
    };
    await sendToNotion(data);
  } catch (error) {
    notionError = error;
    console.error('❌ Notion sync failed:', error);
    console.error('❌ Notion sync error details:', {
      message: error.message,
      stack: error.stack,
      type: error.constructor.name
    });
  }

  if (notionError) {
    console.warn('⚠️ Notion sync failed, but account was created successfully in Supabase.');
    console.warn('⚠️ You may need to manually add this player to Notion.');
  }

  return authData.user.id;
}

// Handle Player Only Sign-Up submit
playerSignupForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Wait for Supabase to be ready if it's still initializing
  if (!supabaseReady || !supabase) {
    console.warn('⏳ Waiting for Supabase to initialize...');
    try {
      const client = await initSupabase();
      if (client) {
        supabase = client;
        supabaseReady = true;
      } else {
        alert('Authentication service is not available. Please refresh the page.');
        return;
      }
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      alert('Authentication service is not available. Please refresh the page.');
      return;
    }
  }

  // Collect form data
  const email = document.getElementById('suPlayerEmail').value.trim();
  const password = document.getElementById('suPlayerPass').value;
  const phone = document.getElementById('suPlayerPhone').value.trim();
  const firstName = document.getElementById('suPlayerFirstName').value.trim();
  const lastName = document.getElementById('suPlayerLastName').value.trim();
  const programType = document.getElementById('suProgramType').value;
  const teamName = document.getElementById('suTeamName').value.trim();
  const birthDate = document.getElementById('suBirthDate').value;
  const competitiveLevel = document.getElementById('suCompetitiveLevel').value;
  const referralSource = document.getElementById('suReferralSource').value;
  
  // Get selected positions (checkboxes)
  const positionCheckboxes = document.querySelectorAll('input[name="positions"]:checked');
  const positions = Array.from(positionCheckboxes).map(cb => cb.value);

  // Disable button during submission
  playerSignupBtn.disabled = true;
  playerSignupBtn.innerHTML = '<span>Signing Up...</span>';

  try {
    await createPlayerAccount({
      email,
      password,
      phone,
      firstName,
      lastName,
      programType,
      teamName,
      birthDate,
      competitiveLevel,
      positions,
      referralSource
    });
    
    window.location.href = '../../index.html';
  } catch (error) {
    console.error('Signup error:', error);
    alert(`Signup failed: ${error.message || 'An error occurred. Please try again.'}`);
    playerSignupBtn.disabled = false;
    playerSignupBtn.innerHTML = '<span>Sign Up</span>';
  }
});

// Handle Parent + Player Sign-Up submit
parentPlayerSignupForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  // Wait for Supabase to be ready
  if (!supabaseReady || !supabase) {
    console.warn('⏳ Waiting for Supabase to initialize...');
    try {
      const client = await initSupabase();
      if (client) {
        supabase = client;
        supabaseReady = true;
      } else {
        alert('Authentication service is not available. Please refresh the page.');
        return;
      }
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      alert('Authentication service is not available. Please refresh the page.');
      return;
    }
  }

  // Collect parent form data
  const parentFirstName = document.getElementById('suParentFirstName').value.trim();
  const parentLastName = document.getElementById('suParentLastName').value.trim();
  const parentEmail = document.getElementById('suParentEmail').value.trim();
  const parentPassword = document.getElementById('suParentPass').value;
  const parentPhone = document.getElementById('suParentPhone').value.trim();
  const parentBirthDate = document.getElementById('suParentBirthDate').value;

  // Collect player form data
  const playerEmail = document.getElementById('suParentPlayerEmail').value.trim();
  const playerPassword = document.getElementById('suParentPlayerPass').value;
  const playerFirstName = document.getElementById('suParentPlayerFirstName').value.trim();
  const playerLastName = document.getElementById('suParentPlayerLastName').value.trim();
  const programType = document.getElementById('suParentProgramType').value;
  const teamName = document.getElementById('suParentTeamName').value.trim();
  const birthDate = document.getElementById('suParentPlayerBirthDate').value;
  const competitiveLevel = document.getElementById('suParentCompetitiveLevel').value;
  const referralSource = document.getElementById('suParentReferralSource').value;
  
  // Get selected positions
  const positionCheckboxes = document.querySelectorAll('input[name="parentPositions"]:checked');
  const positions = Array.from(positionCheckboxes).map(cb => cb.value);

  // Validation
  if (!parentFirstName || !parentLastName || !parentEmail || !parentPassword || !parentBirthDate) {
    alert('Please complete all required parent fields.');
    return;
  }

  if (!playerEmail || !playerPassword || !playerFirstName || !playerLastName || !programType || !birthDate || !competitiveLevel) {
    alert('Please complete all required player fields.');
    return;
  }

  if (parentPassword.length < 6 || playerPassword.length < 6) {
    alert('Passwords must be at least 6 characters.');
    return;
  }

  // Disable button during submission
  parentPlayerSignupBtn.disabled = true;
  parentPlayerSignupBtn.innerHTML = '<span>Signing Up...</span>';

  try {
    // 1. Create parent account
    const { data: parentAuthData, error: parentAuthError } = await supabase.auth.signUp({
      email: parentEmail,
      password: parentPassword,
      options: {
        data: {
          role: 'parent',
          first_name: parentFirstName,
          last_name: parentLastName,
          birth_date: parentBirthDate,
          phone_number: parentPhone || null,
        }
      }
    });

    if (parentAuthError) {
      console.error('Parent auth error:', parentAuthError);
      throw new Error(`Parent account creation failed: ${parentAuthError.message || 'Database error saving new user'}`);
    }
    if (!parentAuthData.user) throw new Error('Parent user creation failed');

    // Wait for parent session
    let parentSession = null;
    let attempts = 0;
    while (!parentSession && attempts < 5) {
      await new Promise(resolve => setTimeout(resolve, 300));
      const { data: { session } } = await supabase.auth.getSession();
      parentSession = session;
      attempts++;
    }

    await new Promise(resolve => setTimeout(resolve, 500));

    // Update parent profile using RPC function to bypass RLS recursion
    // First try using the update_user_profile function if it exists
    const { data: rpcData, error: rpcError } = await supabase.rpc('update_user_profile', {
      p_user_id: parentAuthData.user.id,
      p_first_name: parentFirstName,
      p_last_name: parentLastName,
      p_birth_date: parentBirthDate || null,
      p_phone_number: parentPhone || null
    });

    if (rpcError) {
      console.error('RPC function error:', rpcError);
      console.error('RPC error code:', rpcError.code);
      console.error('RPC error message:', rpcError.message);
      console.error('RPC error details:', rpcError.details);
      console.error('RPC error hint:', rpcError.hint);
      
      // If RPC function doesn't exist (code 42883), we need to create it
      if (rpcError.code === '42883' || rpcError.message?.includes('does not exist')) {
        throw new Error('RPC function update_user_profile does not exist. Please run the SQL migration: fix-profiles-rls-infinite-recursion.sql');
      }
      
      // For other RPC errors, throw with details
      throw new Error(`RPC function error: ${rpcError.message || 'Unknown error'}. Please ensure the update_user_profile function exists in Supabase.`);
    } else {
    }

    
    // Store parent info and session BEFORE signing out
    const parentUserId = parentAuthData.user.id;
    // Use the session we waited for (parentSession), not parentAuthData.session (which might not exist)
    const parentAccessToken = parentSession?.access_token;
    const parentRefreshToken = parentSession?.refresh_token;
    
    
    if (!parentAccessToken) {
      console.warn('⚠️ WARNING: No parent access token available. Relationship creation may fail.');
      console.warn('⚠️ This might happen if email confirmation is required.');
    }
    
    // 2. Sign out parent and create player account
    await supabase.auth.signOut();

    // Create player account using helper function
    // This will also sync the player to Notion
    const playerId = await createPlayerAccount({
      email: playerEmail,
      password: playerPassword,
      phone: null, // Player phone not collected in parent form
      firstName: playerFirstName,
      lastName: playerLastName,
      programType,
      teamName,
      birthDate,
      competitiveLevel,
      positions,
      referralSource
    }, false); // Don't redirect yet


    // 3. Create relationship using parent's stored session (bypasses email confirmation requirement)
    let relationshipCreated = false;
    
    if (parentAccessToken && parentRefreshToken) {
      try {
        // Create a new Supabase client with the parent's session
        // Use a different storage key to avoid conflicts with the main client
        const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
        const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('../config/supabase.js');
        
        const parentSupabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
            storageKey: 'parent-temp-session' // Use different storage key to avoid conflicts
          }
        });
        
        // Set the session manually
        const { data: sessionData, error: sessionError } = await parentSupabase.auth.setSession({
          access_token: parentAccessToken,
          refresh_token: parentRefreshToken
        });
        
        if (sessionError) {
          console.error('❌ Could not set parent session:', sessionError);
        } else {
          
          // Now use this client to create the relationship
          const { error: relationshipError, data: relationshipData } = await parentSupabase
            .from('parent_player_relationships')
            .insert({
              parent_id: parentUserId,
              player_id: playerId,
              relationship_type: 'primary'
            })
            .select();

          if (relationshipError) {
            console.error('❌ Relationship creation failed:', relationshipError);
            console.error('❌ Error code:', relationshipError.code);
            console.error('❌ Error message:', relationshipError.message);
            console.error('❌ Error details:', relationshipError.details);
            console.error('❌ Error hint:', relationshipError.hint);
          } else {
            relationshipCreated = true;
          }
        }
      } catch (error) {
        console.error('❌ Error creating relationship with stored session:', error);
        console.error('❌ Error stack:', error.stack);
      }
    } else {
      console.warn('⚠️ No parent access token or refresh token available');
    }
    
    // If stored token method didn't work, try signing in (may fail if email not confirmed)
    if (!relationshipCreated) {
      const { error: signInError, data: signInData } = await supabase.auth.signInWithPassword({
        email: parentEmail,
        password: parentPassword
      });

      if (signInError) {
        console.error('❌ Could not sign back in as parent:', signInError);
        console.error('❌ Sign-in error code:', signInError.status);
        console.error('❌ Sign-in error message:', signInError.message);
        
        if (signInError.message?.includes('Email not confirmed')) {
          console.error('💡 Email confirmation is required in Supabase settings.');
          console.error('💡 Options:');
          console.error('   1. Disable email confirmation in Supabase Dashboard → Authentication → Settings');
          console.error('   2. Or manually create the relationship using the SQL below');
        }
        
        console.warn('⚠️ Accounts were created, but relationship was not.');
        console.warn('⚠️ Parent ID:', parentUserId);
        console.warn('⚠️ Player ID:', playerId);
        console.warn('💡 Run this SQL in Supabase to create the relationship:');
        console.warn(`   INSERT INTO parent_player_relationships (parent_id, player_id, relationship_type) VALUES ('${parentUserId}', '${playerId}', 'primary') ON CONFLICT (parent_id, player_id) DO NOTHING;`);
      } else {
        
        // Verify the current user ID matches parent_id
        const { data: { user: currentUser }, error: getUserError } = await supabase.auth.getUser();
        if (getUserError) {
          console.error('❌ Error getting current user:', getUserError);
        }
        
        // Use auth.uid() directly as parent_id to ensure RLS policy passes
        // The RLS policy checks: auth.uid() = parent_id
        // So we MUST use the current authenticated user's ID
        const actualParentId = currentUser?.id || signInData?.user?.id || parentUserId;
        
        if (actualParentId !== parentUserId) {
          console.warn('⚠️ Using auth.uid() as parent_id instead of stored parentUserId');
          console.warn('⚠️ This ensures RLS policy will pass');
          console.warn('⚠️ Stored parentUserId:', parentUserId);
          console.warn('⚠️ Actual parent_id (auth.uid()):', actualParentId);
        }
        
        // 4. Create parent-player relationship
        const { error: relationshipError, data: relationshipData } = await supabase
          .from('parent_player_relationships')
          .insert({
            parent_id: actualParentId,
            player_id: playerId,
            relationship_type: 'primary'
          })
          .select();

        if (relationshipError) {
          console.error('❌ Could not create relationship:', relationshipError);
          console.error('❌ Error code:', relationshipError.code);
          console.error('❌ Error message:', relationshipError.message);
          console.error('❌ Error details:', relationshipError.details);
          console.error('❌ Error hint:', relationshipError.hint);
          
          // Check if it's a foreign key constraint issue
          if (relationshipError.code === '23503' || relationshipError.message?.includes('foreign key')) {
            console.error('💡 This is a foreign key constraint error. The parent or player profile may not exist in the profiles table.');
            console.error('💡 Checking if profiles exist...');
            
            // Check if parent profile exists
            const { data: parentProfile, error: parentCheckError } = await supabase
              .from('profiles')
              .select('id, role, first_name, last_name')
              .eq('id', parentUserId)
              .single();
            
            if (parentCheckError || !parentProfile) {
              console.error('❌ Parent profile does NOT exist in profiles table!');
              console.error('💡 You need to create the parent profile first. Run this SQL:');
              console.error(`   -- See fix-parent-profile-simple.sql for the full script`);
            } else {
            }
            
            // Check if player profile exists
            const { data: playerProfile, error: playerCheckError } = await supabase
              .from('profiles')
              .select('id, role, first_name, last_name')
              .eq('id', playerId)
              .single();
            
            if (playerCheckError || !playerProfile) {
              console.error('❌ Player profile does NOT exist in profiles table!');
              console.error('💡 The player profile should have been created. Check the createPlayerAccount function.');
            } else {
            }
          }
          
          console.warn('⚠️ You may need to create the relationship manually in Supabase');
          console.warn('💡 Run this SQL in Supabase:');
          console.warn(`   INSERT INTO parent_player_relationships (parent_id, player_id, relationship_type) VALUES ('${parentUserId}', '${playerId}', 'primary') ON CONFLICT (parent_id, player_id) DO NOTHING;`);
        } else {
        }
      }
    }

    window.location.href = '../../index.html';
    
  } catch (error) {
    console.error('Signup error:', error);
    alert(`Signup failed: ${error.message || 'An error occurred. Please try again.'}`);
    parentPlayerSignupBtn.disabled = false;
    parentPlayerSignupBtn.innerHTML = '<span>Sign Up</span>';
  }
});

// Function to send data to Notion
async function sendToNotion(data) {
  if (!supabase) {
    throw new Error('Supabase client not initialized');
  }
  
  try {
    
    // Try Supabase functions.invoke first
    const { data: result, error } = await supabase.functions.invoke('sync-to-notion', {
      body: data
    });
    
    if (error) {
      console.error('❌ Edge Function error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        context: error.context,
        status: error.status,
        statusText: error.statusText,
        fullError: error
      });
      
      let errorMessage = error.message || 'Unknown error';
      let notionErrorDetails = '';
      
      // Check result for error details (Edge Function returns error in response body)
      if (result) {
        console.error('📋 Error response body (from result):', result);
        if (result.error) {
          notionErrorDetails = `\n\nNotion API Error: ${result.error}`;
          if (result.message) {
            notionErrorDetails += `\nDetails: ${result.message}`;
          }
          if (result.type) {
            notionErrorDetails += `\nError Type: ${result.type}`;
          }
        }
      }
      
      // If we don't have error details yet, try to fetch directly to get the actual response
      if (!notionErrorDetails) {
        try {
          const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import('../config/supabase.js');
          const directResponse = await fetch(`${SUPABASE_URL}/functions/v1/sync-to-notion`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify(data)
          });
          
          const responseText = await directResponse.text();
          console.error('📋 Direct fetch response status:', directResponse.status);
          console.error('📋 Direct fetch response text:', responseText);
          
          try {
            const responseJson = JSON.parse(responseText);
            console.error('📋 Direct fetch response JSON:', responseJson);
            if (responseJson.error) {
              notionErrorDetails = `\n\nNotion API Error: ${responseJson.error}`;
              if (responseJson.message) {
                notionErrorDetails += `\nDetails: ${responseJson.message}`;
              }
              if (responseJson.type) {
                notionErrorDetails += `\nError Type: ${responseJson.type}`;
              }
            } else {
              notionErrorDetails = `\n\nResponse: ${responseText}`;
            }
          } catch (parseError) {
            notionErrorDetails = `\n\nError Response: ${responseText}`;
          }
        } catch (fetchError) {
          console.error('Failed to fetch error details directly:', fetchError);
        }
      }
      
      throw new Error(`Edge Function error: ${errorMessage}${notionErrorDetails}`);
    }
    
    return result;
    
    // Option B: Direct Notion API (uncomment if you prefer direct API)
    // const NOTION_WEBHOOK_URL = 'YOUR_NOTION_WEBHOOK_URL';
    // const response = await fetch(NOTION_WEBHOOK_URL, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data)
    // });
    // if (!response.ok) throw new Error('Notion API error');
  } catch (error) {
    console.error('❌ Notion sync error:', error);
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Full error:', error);
    throw error;
  }
}

// Handle Login button click
loginBtn?.addEventListener('click', async (e) => {
  e.preventDefault();
  
  if (!supabase) {
    alert('Authentication service is not ready. Please refresh the page.');
    return;
  }

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    alert('Please enter both email and password.');
    return;
  }

  // Disable button during login
  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span>Logging In...</span>';

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      // Get user role from profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (profileError) {
        console.error('Error fetching user profile:', profileError);
      }

      // Redirect based on role (default to player for now)
      const role = profile?.role || 'player';
      
      // Set role in localStorage so the app knows which view to show
      if (window.setCurrentRole) {
        window.setCurrentRole(role);
      } else {
        localStorage.setItem('hg-user-role', role);
      }
      
      window.location.href = '../../index.html';
    }
  } catch (error) {
    console.error('Login error:', error);
    alert(`Login failed: ${error.message || 'Invalid email or password.'}`);
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<span>Login</span>';
  }
});

