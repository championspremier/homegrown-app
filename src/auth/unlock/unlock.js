document.addEventListener('DOMContentLoaded', () => {
  const track = document.getElementById('unl-track');
  const dot   = document.getElementById('unl-dot');
  const fill  = document.getElementById('unl-fill');
  const logo  = document.getElementById('unl-logo');

  if (!track || !dot || !fill || !logo) {
    console.error('Unlock slider: elements not found. Check IDs.');
    return;
  }

  // Match CSS sizes
  const DOT_MARGIN = 14;
  const DOT_SIZE   = 56;

  let isDragging = false;
  let value = 0;
  let bounds = null;
  let hasInteracted = false;

  function measure() { 
    bounds = track.getBoundingClientRect(); 
  }

  function getUsableWidth() {
    if (!bounds) measure();
    const trackWidth = bounds.width || track.clientWidth || 0;
    return Math.max(0, trackWidth - (DOT_MARGIN * 2) - DOT_SIZE);
  }

  function setValue(v) { 
    value = Math.max(0, Math.min(100, v)); 
  }

  function render() {
    if (!bounds) measure();
    
    const usableWidth = getUsableWidth();
    const x = DOT_MARGIN + (usableWidth * value / 100);
    
    dot.style.left = `${x}px`;
    
    if (value > 0) {
      fill.style.width = `${value}%`;
      fill.style.display = 'block';
    } else {
      fill.style.width = '0%';
      fill.style.display = 'none';
    }

    if (hasInteracted) {
      const rotY = (value / 100) * 1000;
      const tilt = 6;
      const scale = 1 + (value / 100) * 0.05;
      logo.style.transform = `rotateX(${tilt}deg) rotateY(${rotY}deg) scale(${scale})`;
      if (dot.firstElementChild) {
        dot.firstElementChild.style.transform = `translateX(${Math.min(8, value / 10)}px)`;
      }
    }
    
    track.setAttribute('aria-valuenow', Math.round(value));
    
    if (value >= 100) {
      setTimeout(() => {
        window.location.href = '../login-signup/login-signup.html';
      }, 300);
    }
  }

  function getValueFromX(clientX) {
    if (!bounds) measure();
    const usableWidth = getUsableWidth();
    if (usableWidth <= 0) return 0;
    
    const trackLeft = bounds.left;
    const relativeX = clientX - trackLeft - DOT_MARGIN - (DOT_SIZE / 2);
    const percentage = (relativeX / usableWidth) * 100;
    return Math.max(0, Math.min(100, percentage));
  }

  function handleStart(e) {
    e.preventDefault();
    e.stopPropagation();
    
    isDragging = true;
    hasInteracted = true;
    measure();
    
    let clientX;
    if (e.type === 'touchstart' && e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
    } else {
      clientX = e.clientX;
    }
    
    if (clientX !== undefined) {
      setValue(getValueFromX(clientX));
      render();
    }
    
    if (e.pointerId !== undefined && dot.setPointerCapture) {
      try {
        dot.setPointerCapture(e.pointerId);
      } catch (err) {
        console.warn('Pointer capture failed:', err);
      }
    }
  }

  function handleMove(e) {
    if (!isDragging) return;
    e.preventDefault();
    e.stopPropagation();
    
    let clientX;
    if (e.touches && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
    } else if (e.changedTouches && e.changedTouches.length > 0) {
      clientX = e.changedTouches[0].clientX;
    } else {
      clientX = e.clientX;
    }
    
    if (clientX !== undefined) {
      setValue(getValueFromX(clientX));
      render();
    }
  }

  function handleEnd(e) {
    if (!isDragging) return;
    e.preventDefault();
    isDragging = false;
    
    if (e.pointerId !== undefined && dot.releasePointerCapture) {
      dot.releasePointerCapture(e.pointerId);
    }
  }

  // Make entire track draggable
  function trackStart(e) {
    // Don't handle if clicking directly on dot (let dot handle it)
    if (e.target.closest('.unl-dot')) return;
    handleStart(e);
  }
  
  // Dot drag handlers
  dot.addEventListener('mousedown', handleStart);
  dot.addEventListener('touchstart', handleStart, { passive: false });
  dot.addEventListener('pointerdown', handleStart);
  
  // Track drag handlers (for clicking anywhere on track)
  track.addEventListener('mousedown', trackStart);
  track.addEventListener('touchstart', trackStart, { passive: false });
  track.addEventListener('pointerdown', trackStart);

  // Document-level move/end handlers
  document.addEventListener('mousemove', handleMove);
  document.addEventListener('touchmove', handleMove, { passive: false });
  document.addEventListener('pointermove', handleMove);
  
  document.addEventListener('mouseup', handleEnd);
  document.addEventListener('touchend', handleEnd);
  document.addEventListener('pointerup', handleEnd);

  // Track click to jump (only if not dragging)
  track.addEventListener('click', (e) => {
    if (isDragging) return;
    if (e.target.closest('.unl-dot')) return;
    hasInteracted = true;
    measure();
    setValue(getValueFromX(e.clientX));
    render();
  });

  // Keyboard support
  track.addEventListener('keydown', (e) => {
    hasInteracted = true;
    const step = 4;
    if (e.key === 'ArrowRight') { 
      e.preventDefault(); 
      setValue(value + step); 
      render(); 
    }
    if (e.key === 'ArrowLeft') { 
      e.preventDefault(); 
      setValue(value - step); 
      render(); 
    }
    if (e.key === 'Home') { 
      e.preventDefault(); 
      setValue(0); 
      render(); 
    }
    if (e.key === 'End') { 
      e.preventDefault(); 
      setValue(100); 
      render(); 
    }
  });

  // Resize handler
  window.addEventListener('resize', () => { 
    measure(); 
    render(); 
  });

  // Initial render
  requestAnimationFrame(() => {
    measure();
    setValue(0);
    render();
  });
});

// Text cycling animation with fade up effect
(function() {
  const accentText = document.getElementById('unl-accent-text');
  if (!accentText) return;

  const words = ['Game IQ', 'Development', 'Mentorship', 'Solo Training'];
  let currentIndex = 0;

  // Set initial transition styles
  accentText.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  accentText.style.opacity = '1';
  accentText.style.transform = 'translateY(0)';
  accentText.style.display = 'inline-block';

  function cycleWords() {
    // Fade out and move down
    accentText.style.opacity = '0';
    accentText.style.transform = 'translateY(20px)';
    
    setTimeout(() => {
      // Change text
      currentIndex = (currentIndex + 1) % words.length;
      accentText.textContent = words[currentIndex];
      
      // Start from below, then fade in and move up
      accentText.style.transform = 'translateY(20px)';
      accentText.style.opacity = '0';
      
      // Force reflow
      accentText.offsetHeight;
      
      // Fade in and move up
      setTimeout(() => {
        accentText.style.opacity = '1';
        accentText.style.transform = 'translateY(0)';
      }, 50);
    }, 500);
  }

  // Start cycling after initial delay
  setTimeout(() => {
    setInterval(cycleWords, 3000);
  }, 2000);
})();
