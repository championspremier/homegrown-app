const root = document.getElementById('authRoot');
const toSignup = document.getElementById('toSignup');
const toLogin = document.getElementById('toLogin');
const signupForm = document.getElementById('signupForm');
const loginForm = document.getElementById('loginForm');
const signupBtn = document.getElementById('signupBtn');
const loginBtn = document.getElementById('loginBtn');
const leftTitle = document.getElementById('leftTitle');
const rightTitle = document.getElementById('rightTitle');
const rightDescription = document.getElementById('rightDescription');

const DUR = 600;

function go(mode) {
  if (!root) return;
  if (root.classList.contains('animating')) return;

  root.classList.add('animating');

  if (mode === 'signup') {
    // Show signup form on left, change right to "One of us" CTA
    root.classList.remove('mode-login');
    root.classList.add('mode-signup');
    
    // Update left panel title
    leftTitle.textContent = 'Sign Up';
    
    // Update right panel content
    rightTitle.textContent = 'One of us';
    rightDescription.textContent = 'Welcome back! Sign in to continue your development journey.';
    
    // Toggle buttons
    toSignup.style.display = 'none';
    toLogin.style.display = 'block';
  } else {
    // Show login form on left, "New Here?" CTA on right
    root.classList.remove('mode-signup');
    root.classList.add('mode-login');
    
    // Update left panel title
    leftTitle.textContent = 'Sign In';
    
    // Update right panel content
    rightTitle.textContent = 'New Here?';
    rightDescription.textContent = 'Join Homegrown and start your journey to becoming an elite soccer player.';
    
    // Toggle buttons
    toSignup.style.display = 'block';
    toLogin.style.display = 'none';
  }

  setTimeout(() => {
    root.classList.remove('animating');
  }, DUR);
}

// Initialize to login mode (Login form on left, "New Here?" on right)
if (root) {
  root.classList.add('mode-login');
  // Ensure initial state is correct
  leftTitle.textContent = 'Sign In';
  rightTitle.textContent = 'New Here?';
  rightDescription.textContent = 'Join Homegrown and start your journey to becoming an elite soccer player.';
  toSignup.style.display = 'block';
  toLogin.style.display = 'none';
}

toSignup?.addEventListener('click', (e) => {
  e.preventDefault();
  go('signup');
});

toLogin?.addEventListener('click', (e) => {
  e.preventDefault();
  go('login');
});

// Handle Sign-Up submit
signupForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = document.getElementById('suUsername').value.trim();
  const email = document.getElementById('suEmail').value.trim();
  const password = document.getElementById('suPass').value;

  if (!username || !email || !password) {
    alert('Please complete all fields.');
    return;
  }

  if (password.length < 6) {
    alert('Password must be at least 6 characters.');
    return;
  }

  // TODO: Wire to Supabase auth
  console.log('Sign up clicked - username:', username, 'email:', email);
});

// Handle Login button click
loginBtn?.addEventListener('click', (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;

  if (!email || !password) {
    alert('Please enter both email and password.');
    return;
  }

  // TODO: Wire to Supabase auth
  console.log('Login clicked - email:', email);
});

