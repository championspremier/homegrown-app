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
  const DOT_MARGIN = 14; // equals left/top on .unl-dot
  const DOT_SIZE   = 56;

  let isDragging = false;
  let value = 0;         // [0..100]
  let bounds = null;
  let hasInteracted = false;

  function measure(){ bounds = track.getBoundingClientRect(); }
  function usable(){
    const width = (bounds && bounds.width) || track.clientWidth || 0;
    return Math.max(0, width - DOT_MARGIN*2 - DOT_SIZE);
  }
  function setValue(v){ value = Math.max(0, Math.min(100, v)); }

  function render(){
    const x = DOT_MARGIN + usable() * (value/100);
    dot.style.left = `${x}px`;
    fill.style.width = `${value}%`;

    if (hasInteracted){
      // Rotate Y from 0° to 70° across the slider
      const rotY = (value / 100) * 70;     // 0..70
      const tilt = 6;                      // slight X tilt for depth
      const scale = 1 + (value/100)*0.05;  // tiny scale up
      logo.style.transform = `rotateX(${tilt}deg) rotateY(${rotY}deg) scale(${scale})`;
      dot.firstElementChild.style.transform = `translateX(${Math.min(8, value/10)}px)`;
    }
    track.setAttribute('aria-valuenow', Math.round(value));
  }

  function pointerToValue(clientX){
    const left = bounds.left + DOT_MARGIN + DOT_SIZE/2;
    const raw  = (clientX - left) / usable();
    return raw * 100;
  }

  function startDrag(e){
    isDragging = true; hasInteracted = true; measure();
    const id = e.pointerId;
    dot.setPointerCapture?.(id);
    document.addEventListener('pointermove', onDrag);
    document.addEventListener('pointerup', endDrag, { once:true });
    onDrag(e);
  }
  function onDrag(e){
    if(!isDragging) return;
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    setValue(pointerToValue(clientX));
    render();
  }
  function endDrag(){
    isDragging = false;
    document.removeEventListener('pointermove', onDrag);
  }

  // Click/tap track to jump (counts as interaction)
  track.addEventListener('pointerdown', (e)=>{
    hasInteracted = true; measure();
    const clientX = e.clientX ?? e.touches?.[0]?.clientX;
    setValue(pointerToValue(clientX));
    render();
  });

  // Drag handlers
  dot.addEventListener('pointerdown', startDrag);

  // Keyboard support
  track.addEventListener('keydown', (e)=>{
    hasInteracted = true;
    const step = 4;
    if(e.key === 'ArrowRight'){ e.preventDefault(); setValue(value + step); render(); }
    if(e.key === 'ArrowLeft'){  e.preventDefault(); setValue(value - step); render(); }
    if(e.key === 'Home'){       e.preventDefault(); setValue(0);           render(); }
    if(e.key === 'End'){        e.preventDefault(); setValue(100);         render(); }
  });

  // Keep aligned on resize
  window.addEventListener('resize', ()=>{ measure(); render(); });

  // First paint
  measure();
  setValue(0);   // flat logo, dot at start, fill 0%
  render();
});
