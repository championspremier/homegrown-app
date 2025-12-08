// ---- Weekly calendar (week nav only, Monday-first) ----
(() => {
  const KEY_DAY = 'home.selectedWeekday';   // 0..6 (Mon..Sun)
  const KEY_ANCHOR = 'home.weekAnchorISO';  // persisted anchor (ISO)

  // DOM
  const weekEl       = document.getElementById('weekStrip');
  const monthLabelEl = document.getElementById('monthLabel');
  const weekRangeEl  = document.getElementById('weekRange');
  const btnWeekPrev  = document.getElementById('weekPrev');
  const btnWeekNext  = document.getElementById('weekNext');

  if (!weekEl || !monthLabelEl || !weekRangeEl) {
    console.warn('Weekly widget: required element missing');
    return;
  }

  // Utils
  const clone = (d) => new Date(d.getTime());
  const addDays = (d, n) => { const x = clone(d); x.setDate(x.getDate() + n); return x; };
  const addWeeks = (d, n) => addDays(d, n * 7);
  const pad = (n) => String(n).padStart(2, '0');
  const sameDate = (a, b) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  // Monday-start week
  const startOfWeekMon = (d) => {
    const x = clone(d);
    const jsDay = x.getDay();            // Sun=0..Sat=6
    const offset = (jsDay + 6) % 7;      // Mon=0
    x.setHours(0,0,0,0);
    return addDays(x, -offset);
  };

  // Labels
  const monthLabel = (d) => d.toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const shortMonthDay = (d) => `${d.toLocaleString(undefined, { month: 'short' })} ${d.getDate()}`;
  const weekRangeLabel = (start) => {
    const end = addDays(start, 6);
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
    return sameMonth ? `${shortMonthDay(start)} – ${end.getDate()}` : `${shortMonthDay(start)} – ${shortMonthDay(end)}`;
  };

  // Day labels (Mon-first)
  const WD = ['M','T','W','Th','F','Sa','S'];
  const toMonFirst = (jsDay) => (jsDay + 6) % 7;

  // State
  const savedAnchorISO = localStorage.getItem(KEY_ANCHOR);
  const anchor = savedAnchorISO ? new Date(savedAnchorISO) : new Date();
  let weekAnchor = startOfWeekMon(anchor);

  const savedDay = localStorage.getItem(KEY_DAY);
  const todayMonIdx = toMonFirst(new Date().getDay());
  let selectedIdx = savedDay !== null ? Number(savedDay) : todayMonIdx;

  // Render
  function render() {
    monthLabelEl.textContent = monthLabel(weekAnchor);
    weekRangeEl.textContent  = weekRangeLabel(weekAnchor);

    weekEl.innerHTML = '';
    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(weekAnchor, i);
      const btn = document.createElement('button');
      btn.className = 'day';
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      btn.dataset.index = String(i);
      btn.dataset.iso = `${dayDate.getFullYear()}-${pad(dayDate.getMonth()+1)}-${pad(dayDate.getDate())}`;
      btn.innerHTML = `<span class="wd">${WD[i]}</span><span class="dt">${dayDate.getDate()}</span>`;

      // Today outline
      if (sameDate(dayDate, new Date())) btn.classList.add('is-today');

      // Selected state
      const isSelected = i === selectedIdx;
      btn.classList.toggle('is-selected', isSelected);
      btn.setAttribute('aria-selected', String(isSelected));

      weekEl.appendChild(btn);
    }
  }

  // Actions
  function selectIndex(i) {
    selectedIdx = i;
    localStorage.setItem(KEY_DAY, String(i));
    render();
  }
  function shiftWeek(delta) {
    weekAnchor = addWeeks(weekAnchor, delta);
    localStorage.setItem(KEY_ANCHOR, weekAnchor.toISOString());
    render();
  }

  // Events
  weekEl.addEventListener('click', (e) => {
    const btn = e.target.closest('.day');
    if (!btn) return;
    selectIndex(Number(btn.dataset.index));
  });
  weekEl.addEventListener('keydown', (e) => {
    const count = 7;
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const next = e.key === 'ArrowRight' ? (selectedIdx + 1) % count : (selectedIdx - 1 + count) % count;
      selectIndex(next);
      weekEl.querySelector(`.day[data-index="${next}"]`)?.focus();
    }
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); selectIndex(selectedIdx); }
  });
  document.getElementById('weekPrev')?.addEventListener('click', () => shiftWeek(-1));
  document.getElementById('weekNext')?.addEventListener('click', () => shiftWeek(1));

  render();
})();

// ---- Simple show/hide toggle for the panel (default open) ----
(() => {
  const btn   = document.getElementById('scheduleToggle');
  const panel = document.getElementById('hiddenSchedule');
  if (!btn || !panel) return;

  const icon = btn.querySelector('i');
  const setOpen = (open) => {
    panel.classList.toggle('is-open', open);
    btn.setAttribute('aria-expanded', String(open));
    if (icon) {
      icon.classList.toggle('bx-chevron-down', open);
      icon.classList.toggle('bx-chevron-up', !open);
    }
  };

  // starts open (matches HTML)
  setOpen(true);

  btn.addEventListener('click', () => {
    const openNow = panel.classList.contains('is-open');
    setOpen(!openNow);
  });
})();