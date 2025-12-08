// --- Theme persistence and toggle ---
const STORAGE_KEY = 'hg-theme';
const root = document.documentElement;
const btn = document.getElementById('themeToggle');

function applyTheme(theme) {
  root.setAttribute('data-theme', theme);
  // swap icon
  btn.innerHTML = theme === 'light' ? '<i class="bx bx-moon bx-flashing-hover"></i>' : '<i class="bx bx-sun bx-spin-hover"></i>';
  localStorage.setItem(STORAGE_KEY, theme);
}

// Load saved theme or respect system preference on first load
(function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    applyTheme(saved);
  } else {
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(prefersLight ? 'light' : 'dark');
  }
})();

// Toggle theme on click + keyboard
btn.addEventListener('click', () => {
  const current = root.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  applyTheme(current === 'light' ? 'dark' : 'light');
});
btn.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    btn.click();
  }
});

// --- Sidebar Toggle ---
const sidebar = document.getElementById('sidebar');
const sidebarToggle = document.getElementById('sidebarToggle');
const SIDEBAR_STORAGE_KEY = 'hg-sidebar-state';

function applySidebarState(isOpen) {
  if (isOpen) {
    sidebar.classList.remove('closed');
  } else {
    sidebar.classList.add('closed');
  }
  localStorage.setItem(SIDEBAR_STORAGE_KEY, isOpen ? 'open' : 'closed');
}

function toggleSidebar() {
  const isCurrentlyOpen = !sidebar.classList.contains('closed');
  applySidebarState(!isCurrentlyOpen);
}

// Load saved sidebar state
(function initSidebar() {
  const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
  const isOpen = saved !== 'closed'; // default to open
  applySidebarState(isOpen);
})();

sidebarToggle.addEventListener('click', toggleSidebar);

// --- Navigation and Content Loading ---
const contentArea = document.getElementById('contentArea');
const navLinks = document.querySelectorAll('.nav-link[data-page]');
const buttons = document.querySelectorAll('.button');

// Load page content
async function loadPage(pageName) {
  try {
    const response = await fetch(`app/views/player/${pageName}/${pageName}.html`);
    if (!response.ok) throw new Error('Page not found');
    const html = await response.text();
    contentArea.innerHTML = html;
    
    // Load page-specific CSS if exists
    const existingLink = document.querySelector(`link[data-page-css="${pageName}"]`);
    if (existingLink) existingLink.remove();
    
    // Try to load CSS (fail silently if doesn't exist)
    fetch(`app/views/player/${pageName}/${pageName}.css`)
      .then(res => {
        if (res.ok) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = `app/views/player/${pageName}/${pageName}.css`;
          link.setAttribute('data-page-css', pageName);
          document.head.appendChild(link);
        }
      })
      .catch(() => {}); // CSS file doesn't exist, that's okay
    
    // Load page-specific JS if exists
    const existingScript = document.querySelector(`script[data-page-js="${pageName}"]`);
    if (existingScript) existingScript.remove();
    
    // Try to load JS (fail silently if doesn't exist)
    fetch(`app/views/player/${pageName}/${pageName}.js`)
      .then(res => {
        if (res.ok) {
          const script = document.createElement('script');
          script.src = `app/views/player/${pageName}/${pageName}.js`;
          script.setAttribute('data-page-js', pageName);
          script.defer = true;
          document.body.appendChild(script);
        }
      })
      .catch(() => {}); // JS file doesn't exist, that's okay
  } catch (error) {
    console.error('Error loading page:', error);
    contentArea.innerHTML = `<div style="padding: 40px; text-align: center;"><h2>Page not found</h2><p>${pageName}.html could not be loaded.</p></div>`;
  }
}

// Handle navigation clicks - make entire button area clickable
buttons.forEach(button => {
  button.addEventListener('click', (e) => {
    // Find the nav-link inside this button
    const link = button.querySelector('.nav-link[data-page]');
    if (!link) return;
    
    e.preventDefault();
    const pageName = link.getAttribute('data-page');
    
    // Update active state
    buttons.forEach(btn => btn.classList.remove('active'));
    button.classList.add('active');
    
    // Load page
    loadPage(pageName);
  });
});

// Load home page by default
loadPage('home');
