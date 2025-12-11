import { initSupabase } from '../config/supabase.js';

const root = document.getElementById('authRoot');
const toggleBtn = document.getElementById('toggleBtn');
const toggleBtnText = document.getElementById('toggleBtnText');
const loginForm = document.getElementById('loginForm');
const coachSignupForm = document.getElementById('coachSignupForm');
const loginBtn = document.getElementById('loginBtn');
const coachSignupBtn = document.getElementById('coachSignupBtn');
const leftTitle = document.getElementById('leftTitle');
const rightTitle = document.getElementById('rightTitle');
const rightSubtitle = document.getElementById('rightSubtitle');

const DUR = 600;

// Initialize Supabase
let supabase;
let supabaseReady = false;

initSupabase().then(client => {
  if (client) {
    supabase = client;
    supabaseReady = true;
    console.log('✅ Supabase initialized in coach-login');
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
    root.classList.remove('mode-login');
    root.classList.add('mode-signup');
    
    // Hide login form, show signup form
    loginForm.style.display = 'none';
    coachSignupForm.style.display = 'flex';
    
    // Update titles
    leftTitle.textContent = 'Sign Up';
    rightTitle.textContent = 'Welcome Back!';
    rightSubtitle.textContent = 'To keep connected with us please login with your personal info';
    toggleBtnText.textContent = 'Login';
  } else {
    root.classList.remove('mode-signup');
    root.classList.add('mode-login');
    
    // Show login form, hide signup form
    loginForm.style.display = 'flex';
    coachSignupForm.style.display = 'none';
    
    // Update titles
    leftTitle.textContent = 'Coach Login';
    rightTitle.textContent = 'New Here?';
    rightSubtitle.textContent = 'Join Homegrown as a coach and help develop the next generation of players.';
    toggleBtnText.textContent = 'Sign Up';
  }

  setTimeout(() => {
    root.classList.remove('animating');
  }, DUR);
}

// Toggle between login and signup
toggleBtn?.addEventListener('click', () => {
  const isLoginMode = root.classList.contains('mode-login') || !root.classList.contains('mode-signup');
  go(isLoginMode ? 'signup' : 'login');
});

// Handle Login
loginBtn?.addEventListener('click', async (e) => {
  e.preventDefault();
  if (!supabaseReady) {
    alert('Please wait, system is initializing...');
    return;
  }

  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    alert('Please enter both email and password');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.innerHTML = '<span>Logging in...</span>';

  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) {
      throw error;
    }

    // Check if user is a coach
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      throw new Error('Could not verify user role');
    }

    if (profile.role !== 'coach') {
      await supabase.auth.signOut();
      throw new Error('This account is not a coach account. Please use the regular login page.');
    }

    // Store role in localStorage
    localStorage.setItem('userRole', 'coach');
    localStorage.setItem('currentPage', 'home');

    // Redirect to dashboard
    window.location.href = '../../index.html';
  } catch (error) {
    console.error('Login error:', error);
    alert(`Login failed: ${error.message || 'An error occurred. Please try again.'}`);
    loginBtn.disabled = false;
    loginBtn.innerHTML = '<span>Login</span>';
  }
});

// Handle Coach Signup
coachSignupBtn?.addEventListener('click', async (e) => {
  e.preventDefault();
  if (!supabaseReady) {
    alert('Please wait, system is initializing...');
    return;
  }

  const firstName = document.getElementById('suCoachFirstName').value.trim();
  const lastName = document.getElementById('suCoachLastName').value.trim();
  const email = document.getElementById('suCoachEmail').value.trim();
  const phone = document.getElementById('suCoachPhone').value.trim();
  const password = document.getElementById('suCoachPass').value;
  const passwordConfirm = document.getElementById('suCoachPassConfirm').value;

  // Validation
  if (!firstName || !lastName || !email || !phone || !password || !passwordConfirm) {
    alert('Please fill in all fields');
    return;
  }

  if (password !== passwordConfirm) {
    alert('Passwords do not match');
    return;
  }

  if (password.length < 6) {
    alert('Password must be at least 6 characters');
    return;
  }

  coachSignupBtn.disabled = true;
  coachSignupBtn.innerHTML = '<span>Creating Account...</span>';

  try {
    // 1. Create auth user with role metadata
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: 'coach',
          first_name: firstName,
          last_name: lastName,
          phone_number: phone
        }
      }
    });

    if (authError) {
      throw authError;
    }

    console.log('✅ Coach account created:', authData.user.id);

    // 2. Wait a moment for the trigger to create the profile
    await new Promise(resolve => setTimeout(resolve, 1000));

    // 3. Update the profile with coach-specific data
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        first_name: firstName,
        last_name: lastName,
        phone_number: phone,
        role: 'coach'
      })
      .eq('id', authData.user.id);

    if (profileError) {
      console.error('Profile update error:', profileError);
      // Don't throw - profile might have been created by trigger
    }

    console.log('✅ Coach profile created/updated successfully');

    // Store role in localStorage
    localStorage.setItem('userRole', 'coach');
    localStorage.setItem('currentPage', 'home');

    alert('Account created successfully! Redirecting to dashboard...');
    
    // Redirect to dashboard
    setTimeout(() => {
      window.location.href = '../../index.html';
    }, 1000);
  } catch (error) {
    console.error('Signup error:', error);
    alert(`Signup failed: ${error.message || 'An error occurred. Please try again.'}`);
    coachSignupBtn.disabled = false;
    coachSignupBtn.innerHTML = '<span>Sign Up</span>';
  }
});

// Initialize to login mode
go('login');

