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

// 1) Load saved theme or respect system preference on first load
(function initTheme() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    applyTheme(saved);
  } else {
    const prefersLight = window.matchMedia('(prefers-color-scheme: light)').matches;
    applyTheme(prefersLight ? 'light' : 'dark');
  }
})();

// 2) Toggle on click + keyboard
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