/**
 * Curriculum Focus Manager
 * 
 * This file dynamically updates the "CURRENT FOCUS" text on the player home page
 * based on the yearly curriculum schedule. The focus text (after "CURRENT FOCUS:")
 * cycles through related terms with a dazsle animation effect.
 * 
 * ============================================================================
 * HOW TO UPDATE THE CURRICULUM SCHEDULE
 * ============================================================================
 * 
 * To modify the curriculum schedule, update the `CURRICULUM_SCHEDULE` object below.
 * Each entry should have:
 * - `start`: Object with `month` (1-12) and `day` (1-31)
 * - `end`: Object with `month` (1-12) and `day` (1-31)
 * - `focus`: The main focus text (e.g., "BUILD-OUT")
 * - `relatedTerms`: Array of related terms that will cycle in the dazsle effect
 * 
 * Example:
 * {
 *   start: { month: 1, day: 1 },      // January 1st
 *   end: { month: 2, day: 14 },        // February 14th
 *   focus: "BUILD-OUT",
 *   relatedTerms: ["Build-Out", "Possession", "Distribution"]
 * }
 * 
 * For December (week-based), use the special `decemberWeeks` array where each
 * week (1-4) maps to a focus and related terms.
 * 
 * ============================================================================
 * CURRICULUM SCHEDULE (2025-2026)
 * ============================================================================
 */

const CURRICULUM_SCHEDULE = [
  // January - Half of February: Build-Out
  {
    start: { month: 1, day: 1 },
    end: { month: 2, day: 14 },
    focus: "BUILD-OUT",
    relatedTerms: ["Build-Out", "Possession", "Distribution", "Goalkeeper Play"]
  },
  
  // Half of February - End of March: Final Third
  {
    start: { month: 2, day: 15 },
    end: { month: 3, day: 31 },
    focus: "FINAL THIRD",
    relatedTerms: ["Final Third", "Finishing", "Crossing", "Attacking"]
  },
  
  // April - Half of May: Middle Third
  {
    start: { month: 4, day: 1 },
    end: { month: 5, day: 15 },
    focus: "MIDDLE THIRD",
    relatedTerms: ["Middle Third", "Turning", "Passing", "Transition"]
  },
  
  // Half of May - End of June: Wide Play
  {
    start: { month: 5, day: 16 },
    end: { month: 6, day: 30 },
    focus: "WIDE PLAY",
    relatedTerms: ["Wide Play", "Wing Play", "Crossing", "Width"]
  },
  
  // July - Half of August: 11v11 Formations
  {
    start: { month: 7, day: 1 },
    end: { month: 8, day: 15 },
    focus: "11V11 FORMATIONS",
    relatedTerms: ["11v11 Formations", "Tactics", "Shape", "System"]
  },
  
  // Half of August - End of September: Set Pieces
  {
    start: { month: 8, day: 16 },
    end: { month: 9, day: 30 },
    focus: "SET PIECES",
    relatedTerms: ["Set Pieces", "Corners", "Free Kicks", "Restarts"]
  },
  
  // October 1st Half: Build-Out
  {
    start: { month: 10, day: 1 },
    end: { month: 10, day: 15 },
    focus: "BUILD-OUT",
    relatedTerms: ["Build-Out", "Possession", "Distribution", "Goalkeeper Play"]
  },
  
  // October 2nd Half: Final Third
  {
    start: { month: 10, day: 16 },
    end: { month: 10, day: 31 },
    focus: "FINAL THIRD",
    relatedTerms: ["Final Third", "Finishing", "Crossing", "Attacking"]
  },
  
  // November 1st Half: Middle Third
  {
    start: { month: 11, day: 1 },
    end: { month: 11, day: 15 },
    focus: "MIDDLE THIRD",
    relatedTerms: ["Middle Third", "Turning", "Passing", "Transition"]
  },
  
  // November 2nd Half: Wide Play
  {
    start: { month: 11, day: 16 },
    end: { month: 11, day: 30 },
    focus: "WIDE PLAY",
    relatedTerms: ["Wide Play", "Wing Play", "Crossing", "Width"]
  }
];

// December is week-based (4 weeks)
const DECEMBER_WEEKS = [
  {
    week: 1,
    focus: "BUILD-OUT",
    relatedTerms: ["Build-Out", "Possession", "Distribution", "Goalkeeper Play"]
  },
  {
    week: 2,
    focus: "FINAL THIRD",
    relatedTerms: ["Final Third", "Finishing", "Crossing", "Attacking"]
  },
  {
    week: 3,
    focus: "MIDDLE THIRD",
    relatedTerms: ["Middle Third", "Turning", "Passing", "Transition"]
  },
  {
    week: 4,
    focus: "WIDE PLAY",
    relatedTerms: ["Wide Play", "Wing Play", "Crossing", "Width"]
  }
];

/**
 * Get the current week number in December (1-4)
 * Week 1: Days 1-7, Week 2: Days 8-14, Week 3: Days 15-21, Week 4: Days 22-31
 */
function getDecemberWeek(day) {
  if (day <= 7) return 1;
  if (day <= 14) return 2;
  if (day <= 21) return 3;
  return 4;
}

/**
 * Check if a date falls within a schedule range
 */
function isDateInRange(date, start, end) {
  const currentYear = date.getFullYear();
  const startDate = new Date(currentYear, start.month - 1, start.day);
  const endDate = new Date(currentYear, end.month - 1, end.day);
  
  // Handle year wrap-around (e.g., Dec 31 to Jan 1)
  if (endDate < startDate) {
    return date >= startDate || date <= endDate;
  }
  
  return date >= startDate && date <= endDate;
}

/**
 * Get the current curriculum focus based on today's date
 */
function getCurrentFocus() {
  const today = new Date();
  const month = today.getMonth() + 1; // JavaScript months are 0-indexed
  const day = today.getDate();
  
  // Handle December (week-based)
  if (month === 12) {
    const week = getDecemberWeek(day);
    const weekConfig = DECEMBER_WEEKS.find(w => w.week === week);
    if (weekConfig) {
      return {
        focus: weekConfig.focus,
      };
    }
  }
  
  // Check regular schedule
  for (const period of CURRICULUM_SCHEDULE) {
    if (isDateInRange(today, period.start, period.end)) {
      return {
        focus: period.focus,
      };
    }
  }
  
  // Default fallback (shouldn't happen, but just in case)
  return {
    focus: "BUILD-OUT"
  };
}

/**
 * Initialize the curriculum focus display with colorful gradient effect
 */
function initCurriculumFocus() {
  const focusContainer = document.querySelector('.current-focus-header h1');
  if (!focusContainer) {
    console.warn('Curriculum focus container not found');
    return;
  }
  
  const currentFocus = getCurrentFocus();
  
  // Create the static "CURRENT FOCUS:" part
  const staticText = 'CURRENT FOCUS: ';
  
  // Create a span for the colorful focus text
  const focusSpan = document.createElement('span');
  focusSpan.className = 'curriculum-focus-text';
  focusSpan.textContent = currentFocus.focus;
  
  // Update the container
  focusContainer.innerHTML = '';
  focusContainer.appendChild(document.createTextNode(staticText));
  focusContainer.appendChild(focusSpan);
}

// Export for potential use in other files
// Note: initCurriculumFocus should be called explicitly from the page that needs it
// (e.g., player home page) rather than auto-initializing
export { getCurrentFocus, initCurriculumFocus };

