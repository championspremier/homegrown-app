const root       = document.getElementById('authRoot');
const toSignup   = document.getElementById('toSignup');
const toLogin    = document.getElementById('toLogin');
const signupForm = document.getElementById('signupForm');
const loginForm  = document.getElementById('loginForm');
const signupBtn  = document.getElementById('signupBtn');

const DUR = 450; // keep close to --dur for sync

function go(mode){
  if (!root) return;
  if (root.classList.contains('animating')) return;

  root.classList.add('animating');

  if (mode === 'signup'){
    root.classList.remove('mode-login');
    root.classList.add('mode-signup');
    document.getElementById('daLeftTitle').textContent  = 'Welcome to Development';
    document.getElementById('daRightTitle').textContent = 'Create your account';
    // focus target after the sweep
    setTimeout(()=> document.getElementById('suEmail')?.focus(), DUR);
  } else {
    root.classList.remove('mode-signup');
    root.classList.add('mode-login');
    document.getElementById('daLeftTitle').textContent  = 'Login to your account';
    document.getElementById('daRightTitle').textContent = 'New here?';
    setTimeout(()=> document.getElementById('loginEmail')?.focus(), DUR);
  }

  // unlock after the animation finishes
  setTimeout(()=> root.classList.remove('animating'), DUR);
}

toSignup?.addEventListener('click', () => go('signup'));
toLogin?.addEventListener('click',  () => go('login'));

// Handle Sign-Up submit (light validation + redirect)
signupForm?.addEventListener('submit', (e) => {
  e.preventDefault();
  const email = document.getElementById('suEmail').value.trim();
  const p1    = document.getElementById('suPass').value;
  const p2    = document.getElementById('suPass2').value;
  const terms = document.getElementById('suTerms').checked;

  if (!email || !p1 || !p2){ alert('Please complete all fields.'); return; }
  if (p1 !== p2){ alert('Passwords do not match.'); return; }
  if (!terms){ alert('Please agree to the Terms + Conditions.'); return; }

  // Redirect to Typeform handoff page
  window.location.href = 'typeform.html';
});

// Optional: login button hook
document.getElementById('loginBtn').addEventListener('click', () => {
  console.log('Login clicked (wire to Firebase auth)');
});
