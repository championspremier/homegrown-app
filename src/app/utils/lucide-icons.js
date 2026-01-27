/**
 * Lucide Icons Utility
 * Helper functions to render Lucide icons in vanilla JavaScript
 */

// Import from lucide package - using the correct ESM path
// createElement is a default export
import createElement from 'lucide/dist/esm/lucide/src/createElement.js';

// Import individual icons (all are default exports)
import House from 'lucide/dist/esm/lucide/src/icons/house.js';
import Calendar from 'lucide/dist/esm/lucide/src/icons/calendar.js';
import CircleDot from 'lucide/dist/esm/lucide/src/icons/circle-dot.js';
import ChartColumnIncreasing from 'lucide/dist/esm/lucide/src/icons/chart-column-increasing.js';
import User from 'lucide/dist/esm/lucide/src/icons/user.js';
import ChevronLeft from 'lucide/dist/esm/lucide/src/icons/chevron-left.js';
import ChevronRight from 'lucide/dist/esm/lucide/src/icons/chevron-right.js';
import ChevronUp from 'lucide/dist/esm/lucide/src/icons/chevron-up.js';
import ChevronDown from 'lucide/dist/esm/lucide/src/icons/chevron-down.js';
import Bell from 'lucide/dist/esm/lucide/src/icons/bell.js';
import X from 'lucide/dist/esm/lucide/src/icons/x.js';
import Moon from 'lucide/dist/esm/lucide/src/icons/moon.js';
import Sun from 'lucide/dist/esm/lucide/src/icons/sun.js';
import MapPin from 'lucide/dist/esm/lucide/src/icons/map-pin.js';
import RefreshCw from 'lucide/dist/esm/lucide/src/icons/refresh-cw.js';
import Camera from 'lucide/dist/esm/lucide/src/icons/camera.js';
import LayoutGrid from 'lucide/dist/esm/lucide/src/icons/layout-grid.js';
import MessageCircle from 'lucide/dist/esm/lucide/src/icons/message-circle.js';
import Users from 'lucide/dist/esm/lucide/src/icons/users.js';
import FileText from 'lucide/dist/esm/lucide/src/icons/file-text.js';
import CreditCard from 'lucide/dist/esm/lucide/src/icons/credit-card.js';
import Cog from 'lucide/dist/esm/lucide/src/icons/cog.js';
import LogOut from 'lucide/dist/esm/lucide/src/icons/log-out.js';
import Pencil from 'lucide/dist/esm/lucide/src/icons/pencil.js';
import Trash from 'lucide/dist/esm/lucide/src/icons/trash.js';
import Plus from 'lucide/dist/esm/lucide/src/icons/plus.js';
import Search from 'lucide/dist/esm/lucide/src/icons/search.js';
import SlidersHorizontal from 'lucide/dist/esm/lucide/src/icons/sliders-horizontal.js';
import Download from 'lucide/dist/esm/lucide/src/icons/download.js';
import ArrowUpDown from 'lucide/dist/esm/lucide/src/icons/arrow-up-down.js';
import EllipsisVertical from 'lucide/dist/esm/lucide/src/icons/ellipsis-vertical.js';
import Send from 'lucide/dist/esm/lucide/src/icons/send.js';
import BookCheck from 'lucide/dist/esm/lucide/src/icons/book-check.js';

/**
 * Icon mapping from Boxicons to Lucide icon names
 */
const BOXICON_TO_LUCIDE = {
  'bx-home': 'house',
  'bxs-home': 'house',
  'bx-calendar': 'calendar',
  'bxs-calendar': 'calendar',
  'bx-football': 'circle-dot',
  'bxs-football': 'circle-dot',
  'bx-chart': 'chart-column-increasing',
  'bxs-chart': 'chart-column-increasing',
  'bx-user': 'user',
  'bxs-user': 'user',
  'bx-chevron-left': 'chevron-left',
  'bx-chevron-right': 'chevron-right',
  'bx-chevron-up': 'chevron-up',
  'bx-chevron-down': 'chevron-down',
  'bx-bell': 'bell',
  'bx-x': 'x',
  'bx-moon': 'moon',
  'bx-sun': 'sun',
  'bx-map': 'map-pin',
  'bx-refresh': 'refresh-cw',
  'bx-camera': 'camera',
  'bx-grid-alt': 'layout-grid',
  'bx-message-rounded': 'message-circle',
  'bx-group': 'users',
  'bx-file-blank': 'file-text',
  'bx-credit-card': 'credit-card',
  'bx-cog': 'cog',
  'bx-log-out': 'log-out',
  'bx-edit': 'pencil',
  'bx-trash': 'trash',
  'bx-plus': 'plus',
  'bx-search': 'search',
  'bx-filter': 'filter',
  'bx-download': 'download',
  'bx-sort': 'arrow-up-down',
  'bx-dots-vertical-rounded': 'ellipsis-vertical',
  'bx-paper-plane': 'send',
  'bx-send': 'send',
  'bx-book-check': 'book-check'
};

/**
 * Lucide icon components map
 */
const LUCIDE_ICONS = {
  'house': House,
  'calendar': Calendar,
  'circle-dot': CircleDot,
  'chart-column-increasing': ChartColumnIncreasing,
  'user': User,
  'chevron-left': ChevronLeft,
  'chevron-right': ChevronRight,
  'chevron-up': ChevronUp,
  'chevron-down': ChevronDown,
  'bell': Bell,
  'x': X,
  'moon': Moon,
  'sun': Sun,
  'map-pin': MapPin,
  'refresh-cw': RefreshCw,
  'camera': Camera,
  'layout-grid': LayoutGrid,
  'message-circle': MessageCircle,
  'users': Users,
  'file-text': FileText,
  'credit-card': CreditCard,
  'cog': Cog,
  'log-out': LogOut,
  'pencil': Pencil,
  'trash': Trash,
  'plus': Plus,
  'search': Search,
  'sliders-horizontal': SlidersHorizontal,
  'download': Download,
  'arrow-up-down': ArrowUpDown,
  'ellipsis-vertical': EllipsisVertical,
  'send': Send,
  'book-check': BookCheck
};

/**
 * Replace a Boxicon element with a Lucide icon
 * @param {HTMLElement} iconElement - The <i> element with Boxicon classes
 * @param {boolean} filled - Whether to use filled version
 */
export function replaceBoxiconWithLucide(iconElement, filled = false) {
  if (!iconElement) return null;
  
  // Extract icon name from Boxicon classes
  const classes = Array.from(iconElement.classList);
  let lucideIconName = null;
  
  for (const cls of classes) {
    if (BOXICON_TO_LUCIDE[cls]) {
      lucideIconName = BOXICON_TO_LUCIDE[cls];
      // Check if it's a filled version
      if (cls.startsWith('bxs-')) {
        filled = true;
      }
      break;
    }
  }
  
  if (!lucideIconName) {
    // Don't warn for icons that might not have mappings yet - just skip silently
    // Only warn if it's a critical icon
    const criticalIcons = ['bx-home', 'bx-calendar', 'bx-user'];
    const isCritical = classes.some(cls => criticalIcons.includes(cls));
    if (isCritical) {
      console.warn('Could not determine Lucide icon name from classes:', classes);
    }
    return null;
  }
  
  // Get size from computed styles or default
  const computedStyle = window.getComputedStyle(iconElement);
  const fontSize = parseFloat(computedStyle.fontSize) || 22;
  
  // Always use currentColor so icons adapt to theme
  const color = 'currentColor';
  
  // Copy other classes (excluding boxicon classes)
  const otherClasses = classes.filter(cls => !cls.startsWith('bx') && cls !== 'bx' && cls !== 'bxs');
  
  // Render the Lucide icon directly using createElement
  const IconComponent = LUCIDE_ICONS[lucideIconName];
  if (IconComponent) {
    // Check if this is an icon that should use stroke-only, not fill
    // Chart icons, circle-dot, calendar, and house icons look better with stroke-only
    const isStrokeOnlyIcon = lucideIconName && (
      lucideIconName.includes('chart') || 
      lucideIconName === 'chart-column-increasing' ||
      lucideIconName === 'circle-dot' ||
      lucideIconName === 'calendar' ||
      lucideIconName === 'house'
    );
    
    // Create SVG with appropriate attributes
    // Start with 1.5px stroke width (can increase to 3px max for visibility)
    // Stroke-only icons should never use fill, even when "filled"
    const svg = createElement(IconComponent, {
      size: fontSize,
      color: color,
      strokeWidth: 1.5,  // Always start with 1.5px
      fill: (filled && !isStrokeOnlyIcon) ? color : 'none'
    });
    
    // Store metadata as data attributes
    svg.setAttribute('data-lucide', lucideIconName);
    svg.setAttribute('data-size', fontSize.toString());
    svg.setAttribute('data-color', color);
    if (filled) {
      svg.setAttribute('data-fill', 'true');
    }
    
    // Add classes to SVG
    svg.classList.add('lucide-icon');
    if (filled) {
      svg.classList.add('lucide-icon-filled');
    }
    if (otherClasses.length > 0) {
      svg.classList.add(...otherClasses);
    }
    
    // Replace the i element with the SVG
    // Check if parentNode exists to avoid errors
    if (!iconElement.parentNode) {
      // Silently skip - icon might be in a detached DOM node or being processed
      return null;
    }
    
    // Check if the element is still in the document
    if (!iconElement.isConnected) {
      // Element is not connected to the DOM, skip silently
      return null;
    }
    
    try {
      iconElement.parentNode.replaceChild(svg, iconElement);
    } catch (error) {
      // Silently skip - element might have been removed during processing
      return null;
    }
    
    return svg;
  }
  
  return null;
}

/**
 * Update icon to filled version
 * @param {HTMLElement} button - The button element containing the icon
 */
export function setIconFilled(button) {
  if (!button) return;
  
  // Find the SVG icon (could be direct child or in nav-link)
  let svg = button.querySelector('svg.lucide-icon') || button.querySelector('svg[data-lucide]');
  
  if (!svg) {
    // If no SVG found, try to convert any remaining Boxicons
    const boxicon = button.querySelector('i.bx, i.bxs');
    if (boxicon) {
      svg = replaceBoxiconWithLucide(boxicon, true);
      if (!svg) return;
    } else {
      return;
    }
  }
  
  const lucideName = svg.getAttribute('data-lucide');
  if (!lucideName) {
    // If no data-lucide, try to find it from the icon component
    return;
  }
  
  svg.classList.add('lucide-icon-filled');
  svg.setAttribute('data-fill', 'true');
  
  // Check if this is an icon that should use stroke-only, not fill
  // Chart icons, circle-dot, calendar, and house icons look better with stroke-only
  const isStrokeOnlyIcon = lucideName && (
    lucideName.includes('chart') || 
    lucideName === 'chart-column-increasing' ||
    lucideName === 'circle-dot' ||
    lucideName === 'calendar' ||
    lucideName === 'house'
  );
  
  // Update the SVG attributes - use currentColor for theme adaptation
  if (isStrokeOnlyIcon) {
    // These icons should use stroke-only (no fill) to preserve detail
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    const paths = svg.querySelectorAll('path');
    paths.forEach(path => {
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', '1.5');
    });
    
    // If this is in an active nav item, increase stroke to 3px
    if (button.closest('.nav-list li.active')) {
      svg.setAttribute('stroke-width', '3');
      paths.forEach(path => {
        path.setAttribute('stroke-width', '3');
      });
    }
  } else {
    // For other icons, use fill with stroke-width 1.5px (can increase to 3px max if needed for visibility)
    svg.setAttribute('fill', 'currentColor');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '1.5');
    const paths = svg.querySelectorAll('path');
    paths.forEach(path => {
      path.setAttribute('fill', 'currentColor');
      path.setAttribute('stroke', 'currentColor');
      path.setAttribute('stroke-width', '1.5');
    });
    
    // If this is in an active nav item, increase stroke to 3px
    if (button.closest('.nav-list li.active')) {
      svg.setAttribute('stroke-width', '3');
      paths.forEach(path => {
        path.setAttribute('stroke-width', '3');
      });
    }
  }
  
  // Add CSS to ensure filled icons are visible with proper stroke width
  if (!document.getElementById('lucide-filled-icon-styles')) {
    const style = document.createElement('style');
    style.id = 'lucide-filled-icon-styles';
    style.textContent = `
      .lucide-icon-filled {
        stroke-width: 1.5px !important;
      }
      .lucide-icon-filled path {
        stroke-width: 1.5px !important;
      }
      /* Active nav icons use 3px stroke for better visibility (max 3px) */
      .nav-list li.active .lucide-icon-filled,
      .nav-list li.active .lucide-icon-filled svg {
        stroke-width: 3px !important;
      }
      .nav-list li.active .lucide-icon-filled path {
        stroke-width: 3px !important;
      }
      /* Also ensure solo-create icon (circle-dot) gets proper stroke when active */
      .nav-list li.active .lucide-icon[data-lucide="circle-dot"],
      .nav-list li.active .lucide-icon[data-lucide="circle-dot"] svg {
        stroke-width: 3px !important;
      }
      .nav-list li.active .lucide-icon[data-lucide="circle-dot"] path {
        stroke-width: 3px !important;
      }
      /* Ensure chart-column-increasing (tracking) icon is visible when active */
      .nav-list li.active svg[data-lucide="chart-column-increasing"],
      .nav-list li.active .lucide-icon[data-lucide="chart-column-increasing"] {
        stroke-width: 3px !important;
        fill: none !important;
        stroke: currentColor !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
      }
      .nav-list li.active svg[data-lucide="chart-column-increasing"] path,
      .nav-list li.active .lucide-icon[data-lucide="chart-column-increasing"] path {
        stroke-width: 3px !important;
        fill: none !important;
        stroke: currentColor !important;
      }
      /* Circle-dot, calendar, and house icons should also use stroke-only */
      .nav-list li.active svg[data-lucide="circle-dot"],
      .nav-list li.active .lucide-icon[data-lucide="circle-dot"],
      .nav-list li.active svg[data-lucide="calendar"],
      .nav-list li.active .lucide-icon[data-lucide="calendar"],
      .nav-list li.active svg[data-lucide="house"],
      .nav-list li.active .lucide-icon[data-lucide="house"] {
        stroke-width: 3px !important;
        fill: none !important;
        stroke: currentColor !important;
      }
      .nav-list li.active svg[data-lucide="circle-dot"] path,
      .nav-list li.active .lucide-icon[data-lucide="circle-dot"] path,
      .nav-list li.active svg[data-lucide="calendar"] path,
      .nav-list li.active .lucide-icon[data-lucide="calendar"] path,
      .nav-list li.active svg[data-lucide="house"] path,
      .nav-list li.active .lucide-icon[data-lucide="house"] path {
        stroke-width: 3px !important;
        fill: none !important;
        stroke: currentColor !important;
      }
    `;
    document.head.appendChild(style);
  }
}

/**
 * Update icon to outline version
 * @param {HTMLElement} button - The button element containing the icon
 */
export function setIconOutline(button) {
  if (!button) return;
  
  // Find the SVG icon (could be direct child or in nav-link)
  let svg = button.querySelector('svg.lucide-icon') || button.querySelector('svg[data-lucide]');
  
  if (!svg) {
    // If no SVG found, try to convert any remaining Boxicons
    const boxicon = button.querySelector('i.bx:not(.solo-icon-desktop), i.bxs:not(.solo-icon-desktop)');
    if (boxicon) {
      svg = replaceBoxiconWithLucide(boxicon, false);
      if (!svg) return;
    } else {
      return;
    }
  }
  
  const lucideName = svg.getAttribute('data-lucide');
  if (!lucideName) {
    // If no data-lucide, try to find it from the icon component
    return;
  }
  
  svg.classList.remove('lucide-icon-filled');
  svg.removeAttribute('data-fill');
  
  // Check if this is an icon that should use stroke-only
  const isStrokeOnlyIcon = lucideName && (
    lucideName.includes('chart') || 
    lucideName === 'chart-column-increasing' ||
    lucideName === 'circle-dot' ||
    lucideName === 'calendar' ||
    lucideName === 'house'
  );
  
  // Update the SVG attributes - use currentColor for theme adaptation
  // Start with 1.5px stroke width, can go up to 3px max
  svg.setAttribute('fill', 'none');
  svg.setAttribute('stroke', 'currentColor');
  svg.setAttribute('stroke-width', '1.5');
  const paths = svg.querySelectorAll('path');
  paths.forEach(path => {
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', 'currentColor');
    path.setAttribute('stroke-width', '1.5');
  });
  
  // If this is in an active nav item, increase stroke to 3px
  if (button.closest('.nav-list li.active')) {
    svg.setAttribute('stroke-width', '3');
    paths.forEach(path => {
      path.setAttribute('stroke-width', '3');
    });
  }
}

/**
 * Initialize all Boxicons and replace with Lucide icons
 * @param {HTMLElement} rootElement - Optional root element to search within (defaults to document)
 */
export function initLucideIcons(rootElement = document) {
  // Find all Boxicon elements within the root
  const boxicons = rootElement.querySelectorAll('i.bx, i.bxs');
  boxicons.forEach(icon => {
    // Skip if already converted (check if it's been replaced with SVG)
    if (icon.tagName === 'svg' || icon.closest('.lucide-icon')) return;
    
    // Check if icon has a parent node before trying to convert
    if (!icon.parentNode) {
      return;
    }
    
    const isFilled = icon.classList.contains('bxs-') || 
                     icon.closest('.button.active') !== null;
    replaceBoxiconWithLucide(icon, isFilled);
  });
}

/**
 * Set up MutationObserver to automatically convert icons when new content is added
 */
export function setupIconObserver() {
  // Create a MutationObserver to watch for new icons
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          // Check if the added node is an icon or contains icons
          if (node.matches && (node.matches('i.bx') || node.matches('i.bxs'))) {
            const isFilled = node.classList.contains('bxs-') || 
                             node.closest('.button.active') !== null;
            replaceBoxiconWithLucide(node, isFilled);
          } else if (node.querySelectorAll) {
            // Check for icons within the added node
            const icons = node.querySelectorAll('i.bx, i.bxs');
            icons.forEach(icon => {
              // Skip if already converted (check if it's been replaced with SVG or is inside a converted icon)
              if (icon.tagName === 'svg' || icon.closest('.lucide-icon') || icon.parentElement?.tagName === 'svg') {
                return;
              }
              // Check if icon has a parent node before trying to convert
              if (!icon.parentNode) {
                return;
              }
              const isFilled = icon.classList.contains('bxs-') || 
                               icon.closest('.button.active') !== null;
              replaceBoxiconWithLucide(icon, isFilled);
            });
          }
        }
      });
    });
  });
  
  // Start observing the document body for changes
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  return observer;
}

/**
 * Toggle chevron icon between up and down
 * @param {HTMLElement} button - The button element containing the chevron icon
 * @param {boolean} isUp - Whether to show chevron-up (true) or chevron-down (false)
 */
export function toggleChevronIcon(button, isUp) {
  if (!button) return;
  
  // Find the icon (could be <i> or <svg>)
  let iconElement = button.querySelector('i.bx, i.bxs');
  let svg = button.querySelector('svg.lucide-icon') || button.querySelector('svg[data-lucide]');
  
  // If we have an SVG, replace it with the correct chevron
  if (svg) {
    const targetIcon = isUp ? 'chevron-up' : 'chevron-down';
    const currentIcon = svg.getAttribute('data-lucide');
    
    // Only replace if it's different
    if (currentIcon !== targetIcon) {
      const IconComponent = isUp ? ChevronUp : ChevronDown;
      const computedStyle = window.getComputedStyle(svg);
      const fontSize = parseFloat(computedStyle.fontSize) || 22;
      
      const newSvg = createElement(IconComponent, {
        size: fontSize,
        color: 'currentColor',
        strokeWidth: 1.5,
        fill: 'none'
      });
      
      // Copy attributes and classes
      newSvg.setAttribute('data-lucide', targetIcon);
      newSvg.classList.add('lucide-icon');
      if (svg.classList) {
        svg.classList.forEach(cls => {
          if (cls !== 'lucide-icon') {
            newSvg.classList.add(cls);
          }
        });
      }
      
      // Replace the SVG
      if (svg.parentNode) {
        svg.parentNode.replaceChild(newSvg, svg);
      }
    }
  } else if (iconElement) {
    // If we still have an <i> element, convert it and set the correct direction
    const targetIcon = isUp ? 'chevron-up' : 'chevron-down';
    replaceBoxiconWithLucide(iconElement, false);
    
    // After conversion, ensure it's the correct icon
    const newSvg = button.querySelector('svg.lucide-icon') || button.querySelector('svg[data-lucide]');
    if (newSvg) {
      const currentIcon = newSvg.getAttribute('data-lucide');
      if (currentIcon !== targetIcon) {
        toggleChevronIcon(button, isUp);
      }
    }
  }
}
