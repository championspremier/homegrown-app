/**
 * Skeleton Loader Utility
 * Mimics MUI's Skeleton component API for vanilla JavaScript
 * Reference: https://mui.com/material-ui/react-skeleton/
 */

/**
 * Create a skeleton element
 * @param {Object} options - Skeleton options
 * @param {string} options.variant - 'text' | 'rectangular' | 'circular' | 'rounded'
 * @param {string|false} options.animation - 'pulse' | 'wave' | false
 * @param {number|string} options.width - Width of skeleton
 * @param {number|string} options.height - Height of skeleton
 * @param {HTMLElement} options.children - Optional children to infer dimensions
 * @returns {HTMLElement} Skeleton element
 */
export function createSkeleton({
  variant = 'text',
  animation = 'pulse',
  width,
  height,
  children = null
} = {}) {
  const skeleton = document.createElement('div');
  skeleton.className = 'skeleton';
  skeleton.classList.add(`skeleton-${variant}`);
  
  if (animation) {
    skeleton.classList.add(`skeleton-${animation}`);
  }
  
  // Set dimensions
  if (width) {
    skeleton.style.width = typeof width === 'number' ? `${width}px` : width;
  }
  
  if (height) {
    skeleton.style.height = typeof height === 'number' ? `${height}px` : height;
  }
  
  // If children provided, infer dimensions
  if (children) {
    skeleton.classList.add('skeleton-with-children');
    if (typeof children === 'string') {
      skeleton.innerHTML = children;
    } else {
      skeleton.appendChild(children);
    }
  }
  
  return skeleton;
}

/**
 * Create skeleton for home page header
 */
export function createHomeHeaderSkeleton() {
  const header = document.createElement('div');
  header.className = 'home-header skeleton-home-header';
  
  // Left: Account name skeleton
  const accountSkeleton = createSkeleton({
    variant: 'text',
    width: '80px',
    height: '20px'
  });
  
  // Center: Logo skeleton
  const logoSkeleton = createSkeleton({
    variant: 'text',
    width: '120px',
    height: '28px'
  });
  
  // Right: Bell icon skeleton
  const bellSkeleton = createSkeleton({
    variant: 'circular',
    width: '40px',
    height: '40px'
  });
  
  header.innerHTML = `
    <div class="skeleton-account">${accountSkeleton.outerHTML}</div>
    <div class="skeleton-logo">${logoSkeleton.outerHTML}</div>
    <div class="skeleton-bell">${bellSkeleton.outerHTML}</div>
  `;
  
  return header;
}

/**
 * Create skeleton for home page content
 */
export function createHomePageSkeleton() {
  const container = document.createElement('div');
  container.className = 'page-skeleton';
  
  // Header skeleton
  const headerSkeleton = createHomeHeaderSkeleton();
  
  // Calendar skeleton
  const calendarSkeletons = Array(7).fill(0).map(() => 
    createSkeleton({ variant: 'rounded', width: '40px', height: '60px' })
  ).map(s => s.outerHTML).join('');
  
  // Current focus skeleton
  const focusSkeleton = createSkeleton({ variant: 'text', width: '200px', height: '24px' });
  
  container.innerHTML = `
    <!-- Schedule Section Skeleton -->
    <div class="skeleton-section">
      <div class="skeleton-tabs">
        ${createSkeleton({ variant: 'rounded', width: '100px', height: '36px' }).outerHTML}
        ${createSkeleton({ variant: 'rounded', width: '120px', height: '36px' }).outerHTML}
      </div>
      <div class="skeleton-calendar">
        ${calendarSkeletons}
      </div>
    </div>
    
    <!-- Current Focus Skeleton -->
    <div class="skeleton-section">
      ${focusSkeleton.outerHTML}
    </div>
  `;
  
  return container;
}

/**
 * Create a generic page skeleton (for non-home pages)
 */
export function createPageSkeleton() {
  const container = document.createElement('div');
  container.className = 'page-skeleton';
  
  container.innerHTML = `
    <div class="skeleton-section">
      ${createSkeleton({ variant: 'text', width: '200px', height: '32px' }).outerHTML}
    </div>
    <div class="skeleton-section">
      ${createSkeleton({ variant: 'rectangular', width: '100%', height: '200px' }).outerHTML}
    </div>
    <div class="skeleton-section">
      ${createSkeleton({ variant: 'text', width: '80%', height: '20px' }).outerHTML}
      ${createSkeleton({ variant: 'text', width: '60%', height: '20px' }).outerHTML}
    </div>
  `;
  
  return container;
}
