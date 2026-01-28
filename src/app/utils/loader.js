/**
 * Loading Indicator Utility
 * Provides a simple loading spinner for async operations
 */

// Create loader HTML
function createLoaderHTML() {
  return `
    <div class="loader-container">
      <div class="loader">
        <div class="loader-dot loader-dot-1"></div>
        <div class="loader-dot loader-dot-2"></div>
        <div class="loader-dot loader-dot-3"></div>
        <div class="loader-dot loader-dot-4"></div>
        <div class="loader-dot loader-dot-5"></div>
      </div>
    </div>
  `;
}

// Show loader in a container
export function showLoader(container, message = 'Loading...') {
  if (!container) return null;
  
  // Remove existing loader if present
  const existingLoader = container.querySelector('.loader-container');
  if (existingLoader) {
    existingLoader.remove();
  }
  
  // Create loader element
  const loaderWrapper = document.createElement('div');
  loaderWrapper.className = 'loader-wrapper';
  loaderWrapper.innerHTML = createLoaderHTML();
  
  // Add message if provided
  if (message) {
    const messageEl = document.createElement('p');
    messageEl.className = 'loader-message';
    messageEl.textContent = message;
    loaderWrapper.appendChild(messageEl);
  }
  
  // Insert loader
  container.appendChild(loaderWrapper);
  
  return loaderWrapper;
}

// Hide loader
export function hideLoader(container) {
  if (!container) return;
  
  const loader = container.querySelector('.loader-wrapper');
  if (loader) {
    loader.remove();
  }
}

// Show loader overlay (full screen)
export function showLoaderOverlay(message = 'Loading...') {
  // Remove existing overlay if present
  const existingOverlay = document.getElementById('globalLoaderOverlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }
  
  const overlay = document.createElement('div');
  overlay.id = 'globalLoaderOverlay';
  overlay.className = 'loader-overlay';
  overlay.innerHTML = `
    ${createLoaderHTML()}
    ${message ? `<p class="loader-message">${message}</p>` : ''}
  `;
  
  document.body.appendChild(overlay);
  return overlay;
}

// Hide loader overlay
export function hideLoaderOverlay() {
  const overlay = document.getElementById('globalLoaderOverlay');
  if (overlay) {
    overlay.remove();
  }
}

// Wrapper for async functions with loading indicator
export async function withLoader(asyncFn, container, message = 'Loading...') {
  const loader = showLoader(container, message);
  try {
    const result = await asyncFn();
    return result;
  } finally {
    hideLoader(container);
  }
}

// Wrapper for async functions with overlay loader
export async function withLoaderOverlay(asyncFn, message = 'Loading...') {
  const overlay = showLoaderOverlay(message);
  try {
    const result = await asyncFn();
    return result;
  } finally {
    hideLoaderOverlay();
  }
}
