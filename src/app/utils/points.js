/**
 * Points System Utility
 * 
 * Handles point calculations and session type to points mapping
 * Points are only awarded when a COACH or ADMIN checks in a player
 */

// Map session types to point values
// These match the exact session_type values stored in the database
const POINTS_MAP = {
  // On-Field (Hybrid / In-Person)
  'Tec Tac': 6,
  'Speed Training': 5,
  'Strength & Conditioning': 5,
  
  // Virtual (Remote Sessions)
  'Champions Player Progress (CPP)': 10,
  'Group Film-Analysis': 4,
  'Free Nutrition Consultation': 7,
  'Psychologist': 8,
  'Pro Player Stories (PPS)': 4,
  'College Advising': 8,
  
  // Homegrown (Training Alone / App-Based) - Future implementation
  'HG_TECHNICAL': 8,
  'HG_SPEED': 6,
  'HG_MENTAL': 4,
  'HG_GAME_LOG': 4,
  'HG_TEAM_TRAIN_LOG': 3,
  'HG_QUIZ_CORRECT': 0.5,
  'HG_TACTICAL_REEL': 0.3
};

/**
 * Get points for a session type
 * @param {string} sessionType - The session type name
 * @param {string} locationType - 'on-field' or 'virtual'
 * @returns {number} Points value, or 0 if not found
 */
export function getPointsForSessionType(sessionType, locationType = null) {
  if (!sessionType) return 0;
  
  // Try exact match first
  if (POINTS_MAP[sessionType]) {
    return POINTS_MAP[sessionType];
  }
  
  // Try normalized version (remove spaces, convert to uppercase)
  const normalized = sessionType.replace(/\s+/g, '_').toUpperCase();
  if (POINTS_MAP[normalized]) {
    return POINTS_MAP[normalized];
  }
  
  // Try with location prefix
  if (locationType) {
    const withLocation = `${locationType.toUpperCase()}_${normalized}`;
    if (POINTS_MAP[withLocation]) {
      return POINTS_MAP[withLocation];
    }
  }
  
  // Default: no points if session type not found
  console.warn(`No points mapping found for session type: ${sessionType}`);
  return 0;
}

/**
 * Get current quarter (year and quarter number)
 * @returns {Object} { year: number, quarter: number }
 */
export function getCurrentQuarter() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-12
  
  let quarter;
  if (month >= 1 && month <= 3) quarter = 1;
  else if (month >= 4 && month <= 6) quarter = 2;
  else if (month >= 7 && month <= 9) quarter = 3;
  else quarter = 4;
  
  return { year, quarter };
}

/**
 * Normalize session type name for points mapping
 * Handles variations in naming (e.g., "Tec Tac" vs "TEC_TAC")
 * @param {string} sessionType - Raw session type from database
 * @param {string} locationType - 'on-field' or 'virtual'
 * @returns {string} Normalized session type key
 */
export function normalizeSessionType(sessionType, locationType = null) {
  if (!sessionType) return null;
  
  // Remove extra spaces and normalize
  const cleaned = sessionType.trim();
  
  // Check if it's already a key
  if (POINTS_MAP[cleaned]) return cleaned;
  
  // Try normalized version
  const normalized = cleaned.replace(/\s+/g, '_').toUpperCase();
  if (POINTS_MAP[normalized]) return normalized;
  
  // Try with location prefix if provided
  if (locationType) {
    const withLocation = `${locationType.toUpperCase()}_${normalized}`;
    if (POINTS_MAP[withLocation]) return withLocation;
  }
  
  return cleaned; // Return original if no match found
}

