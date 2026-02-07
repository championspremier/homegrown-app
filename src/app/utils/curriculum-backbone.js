/**
 * Curriculum Backbone Structure
 * 
 * This file defines the complete curriculum hierarchy for solo sessions.
 * It maps the structure: Period → Category → Skill → Sub-Skill
 * Tactical content (phases + keywords with optional positions) lives under each period's tactical key.
 * 
 * Used for:
 * - Filtering videos by curriculum structure
 * - Mapping objectives/keywords to curriculum topics
 * - Organizing solo sessions and quiz questions
 * - Tracking player progress through curriculum
 */
import { TACTICAL_KEYWORDS_DATA } from './tactical-keywords-data.js';

/** Four tactical positions for filtering keywords. Signup uses: GK; Defenders = Central Defender + Full-Back; Midfielders = Mid-Defensive + Mid-Offensive; Forwards = Winger + Forward. Empty positions = all positions. */
export const TACTICAL_POSITIONS = ['GK', 'Defenders', 'Midfielders', 'Forwards'];

export const CURRICULUM_BACKBONE = {
  'build-out': {
    technical: {
      'first-touch': {
        'on-ground': ['inside-open-up', 'inside-across-the-body', 'outside-foot', 'chop', 'sole-open-up', 'sole-across'],
        'half-volley': ['inside-open-up', 'inside-across-the-body', 'outside-foot', 'chop', 'sole-open-up', 'sole-across'],
        'full-volley': ['inside-open-up', 'inside-across-the-body', 'outside-foot', 'chop'],
        'weak-foot': [],
        'deception': []
      },
      'escape-moves': {
        'fake-shots': ['fake-shot-inside-foot', 'fake-shot-outside-foot', 'cruyff'],
        'escaping-side-pressure': ['roll-cut', 'roll-chop', 'sole-of-foot-across', 'sole-of-foot-open-up'],
        'fancy-escape': ['cruyff', 'roll-cut', 'roll-chop', 'sole-of-foot-open-up']
      },
      'juggling': {
        'both-feet': ['half-volley-up', 'in-place', 'walking', 'running', 'rhythm'],
        'strong-foot': {
          'drop-the-ball-half-volley-up': [],
          'just-feet-half-volley-up': [],
          'in-place': [],
          'slow-walk': {
            'vertically': ['forward', 'back'],
            'horizontally': ['left', 'right']
          },
          'run': []
        },
        'blind-foot': {
          'drop-the-ball-half-volley-up': [],
          'just-feet-half-volley-up': [],
          'in-place': [],
          'slow-walk': {
            'vertically': ['forward', 'back'],
            'horizontally': ['left', 'right']
          },
          'run': []
        }
      },
      'passing': {
        'on-ground': ['pass-backspin', 'pass-curl', 'pass-trivela', 'pass-weak-foot', 'pass-deception'],
        'half-volley': ['pass-backspin', 'pass-curl', 'pass-half-volley-weak-foot'],
        'full-volley': ['pass-backspin', 'pass-full-volley-weak-foot']
      }
      // Note: Build-Out does NOT have: ball-mastery, turning, finishing
    },
    physical: {
      'conditioning': {},
      'lower-body': {},
      'upper-body': {},
      'core': {},
      'speed': {
        'lateral': {},
        'linear': {}
      },
      'plyometrics': {},
      'whole-body': {}
    },
    mental: {
      'meditation': {},
      'prayer': {},
      'breathing': {},
      'stretching': {},
      'sleep': {},
      'objectives': {}
    },
    tactical: TACTICAL_KEYWORDS_DATA['build-out'] || {}
  },
  
  'middle-third': {
    technical: {
      'first-touch': {
        'on-ground': ['inside-open-up', 'inside-across-the-body', 'outside-foot', 'chop', 'sole-open-up', 'sole-across'],
        'half-volley': ['inside-open-up', 'inside-across-the-body', 'outside-foot', 'chop', 'sole-open-up', 'sole-across'],
        'full-volley': ['inside-open-up', 'inside-across-the-body', 'outside-foot', 'chop'],
        'weak-foot': [],
        'deception': []
      },
      'escape-moves': {
        'fake-shots': ['fake-shot-inside-foot', 'fake-shot-outside-foot', 'cruyff'],
        'escaping-side-pressure': ['roll-cut', 'roll-chop', 'sole-of-foot-across', 'sole-of-foot-open-up'],
        'fancy-escape': ['cruyff', 'roll-cut', 'roll-chop', 'sole-of-foot-open-up']
      },
      'ball-mastery': {
        'slow-1v1s': [
          'infinite-scissors',
          'scissor-exit',
          'tap-scissor-exit',
          'tap-scissor-exit-same-side',
          'fake-shot-forward-left-right-foot',
          'lunge-exit',
          'coutinho',
          'roll-scissor-exit',
          'fake-shot-backwards-left-right-foot',
          'progression-inside-inside',
          'outside-inside-left-right-foot',
          'la-croquetta',
          'lunge-la-croquetta',
          'elastico',
          'fast-dribbling-outside-inside',
          'stanley-matthews',
          'tap-lunge-exit',
          'tap-lunge-exit-same-side'
        ],
        'fast-dribbling': [
          'fast-dribbling-croquetta',
          'fast-dribbling-scissor-exit-same-side',
          'fast-dribbling-scissor-exit',
          'fast-dribbling-roll-croquetta'
        ]
      },
      'juggling': {
        'both-feet': ['half-volley-up', 'in-place', 'walking', 'running', 'rhythm'],
        'strong-foot': {
          'drop-the-ball-half-volley-up': [],
          'just-feet-half-volley-up': [],
          'in-place': [],
          'slow-walk': {
            'vertically': ['forward', 'back'],
            'horizontally': ['left', 'right']
          },
          'run': []
        },
        'blind-foot': {
          'drop-the-ball-half-volley-up': [],
          'just-feet-half-volley-up': [],
          'in-place': [],
          'slow-walk': {
            'vertically': ['forward', 'back'],
            'horizontally': ['left', 'right']
          },
          'run': []
        }
      },
      'turning': {
        'on-ground': ['turn-inside-open-up', 'turn-inside-across-the-body', 'turn-outside-foot', 'turn-chop', 'turn-sole-open-up', 'turn-sole-across', 'turn-l-turn', 'turn-one-touch-over', 'turn-two-touch-over', 'turn-lunge-inside-open-up', 'turn-foot-deception-inside-across-the-body', 'turn-lunge-outside-foot', 'turn-no-touch'],
        'half-volley': ['turn-hf-inside-open-up', 'turn-hf-inside-across-the-body', 'turn-hf-outside-foot', 'turn-hf-chop'],
        'full-volley': ['turn-fv-inside-open-up', 'turn-fv-inside-across-the-body', 'turn-fv-outside-foot', 'turn-fv-chop'],
      },
      'finishing': {'on-ground': ['power', 'curl', 'trivela', 'finishing-weak-foot', 'finishing-deception', 'finishing-weak-foot'],
        'half-volley': ['power-half-volley', 'curl', 'finishing-half-volley-weak-foot'],
        'full-volley': ['power-full-volley', 'finishing-full-volley-weak-foot']},
      'passing': {
        'on-ground': ['pass-backspin', 'pass-curl', 'pass-trivela', 'pass-weak-foot', 'pass-deception'],
        'half-volley': ['pass-backspin', 'pass-curl', 'pass-half-volley-weak-foot'],
        'full-volley': ['pass-backspin', 'pass-full-volley-weak-foot']
      }
    },
    physical: {
      'conditioning': {},
      'lower-body': {},
      'upper-body': {},
      'core': {},
      'speed': {
        'lateral': {},
        'linear': {}
      },
      'plyometrics': {},
      'whole-body': {}
    },
    mental: {
      'meditation': {},
      'prayer': {},
      'breathing': {},
      'stretching': {},
      'sleep': {},
      'objectives': {}
    },
    tactical: TACTICAL_KEYWORDS_DATA['middle-third'] || {}
  },
  
  'final-third': {
    technical: {
      'first-touch': {
        'on-ground': ['inside-open-up', 'inside-across-the-body', 'outside-foot', 'chop', 'sole-open-up', 'sole-across'],
        'half-volley': ['inside-open-up', 'inside-across-the-body', 'outside-foot', 'chop', 'sole-open-up', 'sole-across'],
        'full-volley': ['inside-open-up', 'inside-across-the-body', 'outside-foot', 'chop'],
        'weak-foot': [],
        'deception': []
      },
      'escape-moves': {
        'fake-shots': ['fake-shot-inside-foot', 'fake-shot-outside-foot', 'cruyff'],
        'escaping-side-pressure': ['roll-cut', 'roll-chop', 'sole-of-foot-across', 'sole-of-foot-open-up'],
        'fancy-escape': ['cruyff', 'roll-cut', 'roll-chop', 'sole-of-foot-open-up']
      },
      'ball-mastery': {
        'slow-1v1s': [
          'infinite-scissors',
          'scissor-exit',
          'tap-scissor-exit',
          'tap-scissor-exit-same-side',
          'fake-shot-forward-left-right-foot',
          'lunge-exit',
          'coutinho',
          'roll-scissor-exit',
          'fake-shot-backwards-left-right-foot',
          'progression-inside-inside',
          'outside-inside-left-right-foot',
          'la-croquetta',
          'lunge-la-croquetta',
          'elastico',
          'fast-dribbling-outside-inside',
          'stanley-matthews',
          'tap-lunge-exit',
          'tap-lunge-exit-same-side'
        ],
        'fast-dribbling': [
          'fast-dribbling-croquetta',
          'fast-dribbling-scissor-exit-same-side',
          'fast-dribbling-scissor-exit',
          'fast-dribbling-roll-croquetta'
        ]
      },
      'juggling': {
        'both-feet': ['half-volley-up', 'in-place', 'walking', 'running', 'rhythm'],
        'strong-foot': {
          'drop-the-ball-half-volley-up': [],
          'just-feet-half-volley-up': [],
          'in-place': [],
          'slow-walk': {
            'vertically': ['forward', 'back'],
            'horizontally': ['left', 'right']
          },
          'run': []
        },
        'blind-foot': {
          'drop-the-ball-half-volley-up': [],
          'just-feet-half-volley-up': [],
          'in-place': [],
          'slow-walk': {
            'vertically': ['forward', 'back'],
            'horizontally': ['left', 'right']
          },
          'run': []
        }
      },
      'turning': {
        'on-ground': ['turn-inside-open-up', 'turn-inside-across-the-body', 'turn-outside-foot', 'turn-chop', 'turn-sole-open-up', 'turn-sole-across', 'turn-l-turn', 'turn-one-touch-over', 'turn-two-touch-over', 'turn-lunge-inside-open-up', 'turn-foot-deception-inside-across-the-body', 'turn-lunge-outside-foot', 'turn-no-touch'],
        'half-volley': ['turn-hf-inside-open-up', 'turn-hf-inside-across-the-body', 'turn-hf-outside-foot', 'turn-hf-chop'],
        'full-volley': ['turn-fv-inside-open-up', 'turn-fv-inside-across-the-body', 'turn-fv-outside-foot', 'turn-fv-chop'],
      },
      'finishing': {'on-ground': ['power', 'curl', 'trivela', 'finishing-weak-foot', 'finishing-deception', 'finishing-weak-foot'],
        'half-volley': ['power-half-volley', 'curl', 'finishing-half-volley-weak-foot'],
        'full-volley': ['power-full-volley', 'finishing-full-volley-weak-foot']},
      'passing': {
        'on-ground': ['pass-backspin', 'pass-curl', 'pass-trivela', 'pass-weak-foot', 'pass-deception'],
        'half-volley': ['pass-backspin', 'pass-curl', 'pass-half-volley-weak-foot'],
        'full-volley': ['pass-backspin', 'pass-full-volley-weak-foot']
      }
    },
    physical: {
      'conditioning': {},
      'lower-body': {},
      'upper-body': {},
      'core': {},
      'speed': {
        'lateral': {},
        'linear': {}
      },
      'plyometrics': {},
      'whole-body': {}
    },
    mental: {
      'meditation': {},
      'prayer': {},
      'breathing': {},
      'stretching': {},
      'sleep': {},
      'objectives': {}
    },
    tactical: TACTICAL_KEYWORDS_DATA['final-third'] || {}
  },
  
  'wide-play': {
    technical: {
      'first-touch': {
        'on-ground': ['inside-open-up', 'inside-across-the-body', 'outside-foot', 'chop', 'sole-open-up', 'sole-across'],
        'half-volley': ['inside-open-up', 'inside-across-the-body', 'outside-foot', 'chop', 'sole-open-up', 'sole-across'],
        'full-volley': ['inside-open-up', 'inside-across-the-body', 'outside-foot', 'chop'],
        'weak-foot': [],
        'deception': []
      },
      'escape-moves': {
        'fake-shots': ['fake-shot-inside-foot', 'fake-shot-outside-foot', 'cruyff'],
        'escaping-side-pressure': ['roll-cut', 'roll-chop', 'sole-of-foot-across', 'sole-of-foot-open-up'],
        'fancy-escape': ['cruyff', 'roll-cut', 'roll-chop', 'sole-of-foot-open-up']
      },
      'ball-mastery': {
        'slow-1v1s': [
          'infinite-scissors',
          'scissor-exit',
          'tap-scissor-exit',
          'tap-scissor-exit-same-side',
          'fake-shot-forward-left-right-foot',
          'lunge-exit',
          'coutinho',
          'roll-scissor-exit',
          'fake-shot-backwards-left-right-foot',
          'progression-inside-inside',
          'outside-inside-left-right-foot',
          'la-croquetta',
          'lunge-la-croquetta',
          'elastico',
          'fast-dribbling-outside-inside',
          'stanley-matthews',
          'tap-lunge-exit',
          'tap-lunge-exit-same-side'
        ],
        'fast-dribbling': [
          'fast-dribbling-croquetta',
          'fast-dribbling-scissor-exit-same-side',
          'fast-dribbling-scissor-exit',
          'fast-dribbling-roll-croquetta'
        ]
      },
      'juggling': {
        'both-feet': ['half-volley-up', 'in-place', 'walking', 'running', 'rhythm'],
        'strong-foot': {
          'drop-the-ball-half-volley-up': [],
          'just-feet-half-volley-up': [],
          'in-place': [],
          'slow-walk': {
            'vertically': ['forward', 'back'],
            'horizontally': ['left', 'right']
          },
          'run': []
        },
        'blind-foot': {
          'drop-the-ball-half-volley-up': [],
          'just-feet-half-volley-up': [],
          'in-place': [],
          'slow-walk': {
            'vertically': ['forward', 'back'],
            'horizontally': ['left', 'right']
          },
          'run': []
        }
      },
      // Note: Wide-Play does NOT have 'turning'
      'finishing': {'on-ground': ['power', 'curl', 'trivela', 'finishing-weak-foot', 'finishing-deception', 'finishing-weak-foot'],
        'half-volley': ['power-half-volley', 'curl', 'finishing-half-volley-weak-foot'],
        'full-volley': ['power-full-volley', 'finishing-full-volley-weak-foot']},
      'passing': {
        'on-ground': ['pass-backspin', 'pass-curl', 'pass-trivela', 'pass-weak-foot', 'pass-deception'],
        'half-volley': ['pass-backspin', 'pass-curl', 'pass-half-volley-weak-foot'],
        'full-volley': ['pass-backspin', 'pass-full-volley-weak-foot']
      }
    },
    physical: {
      'conditioning': {},
      'lower-body': {},
      'upper-body': {},
      'core': {},
      'speed': {
        'lateral': {},
        'linear': {}
      },
      'plyometrics': {},
      'whole-body': {}
    },
    mental: {
      'meditation': {},
      'prayer': {},
      'breathing': {},
      'stretching': {},
      'sleep': {},
      'objectives': {}
    },
    tactical: TACTICAL_KEYWORDS_DATA['wide-play'] || {}
  }
};

/**
 * Get all skills for a given period and category
 */
export function getSkillsForPeriodAndCategory(period, category) {
  if (!CURRICULUM_BACKBONE[period] || !CURRICULUM_BACKBONE[period][category]) {
    return [];
  }
  return Object.keys(CURRICULUM_BACKBONE[period][category]);
}

/**
 * Get all sub-skills for a given period, category, and skill
 */
export function getSubSkillsForSkill(period, category, skill) {
  if (!CURRICULUM_BACKBONE[period] || 
      !CURRICULUM_BACKBONE[period][category] || 
      !CURRICULUM_BACKBONE[period][category][skill]) {
    return [];
  }
  const skillData = CURRICULUM_BACKBONE[period][category][skill];
  if (typeof skillData === 'object' && !Array.isArray(skillData)) {
    return Object.keys(skillData);
  }
  return [];
}

/**
 * Get all periods that contain a specific skill
 * Useful for tactical content that spans multiple periods
 */
export function getPeriodsWithSkill(skill, category = 'technical') {
  const periods = [];
  for (const period in CURRICULUM_BACKBONE) {
    if (CURRICULUM_BACKBONE[period][category] && 
        CURRICULUM_BACKBONE[period][category][skill] !== undefined) {
      periods.push(period);
    }
  }
  return periods;
}

/**
 * Map keyword to curriculum structure
 * Used for matching objectives to curriculum topics
 */
export function mapKeywordToCurriculum(keyword) {
  const normalizedKeyword = keyword.toLowerCase().trim();
  const matches = [];
  
  // Search through all periods and categories
  for (const period in CURRICULUM_BACKBONE) {
    for (const category in CURRICULUM_BACKBONE[period]) {
      for (const skill in CURRICULUM_BACKBONE[period][category]) {
        // Check if keyword matches skill name
        if (skill.toLowerCase().includes(normalizedKeyword) || 
            normalizedKeyword.includes(skill.toLowerCase())) {
          matches.push({
            period,
            category,
            skill,
            subSkill: null
          });
        }
        
        // Check sub-skills
        const skillData = CURRICULUM_BACKBONE[period][category][skill];
        if (typeof skillData === 'object' && !Array.isArray(skillData)) {
          for (const subSkill in skillData) {
            if (subSkill.toLowerCase().includes(normalizedKeyword) || 
                normalizedKeyword.includes(subSkill.toLowerCase())) {
              matches.push({
                period,
                category,
                skill,
                subSkill
              });
            }
            
            // Check sub-sub-skills (like 'half-volley', 'weak-foot')
            const subSkillData = skillData[subSkill];
            if (Array.isArray(subSkillData)) {
              for (const subSubSkill of subSkillData) {
                if (subSubSkill.toLowerCase().includes(normalizedKeyword) || 
                    normalizedKeyword.includes(subSubSkill.toLowerCase())) {
                  matches.push({
                    period,
                    category,
                    skill,
                    subSkill,
                    subSubSkill
                  });
                }
              }
            }
          }
        }
      }
    }
  }
  
  return matches;
}

/**
 * Normalize period string to backbone key (build-out, middle-third, final-third, wide-play)
 */
function normalizePeriodKey(period) {
  if (!period || typeof period !== 'string') return null;
  const p = period.toLowerCase().trim().replace(/\s+/g, '-');
  const map = {
    'build-out': 'build-out',
    'buildout': 'build-out',
    'middle-third': 'middle-third',
    'middlethird': 'middle-third',
    'final-third': 'final-third',
    'finalthird': 'final-third',
    'wide-play': 'wide-play',
    'wideplay': 'wide-play'
  };
  return map[p] || (CURRICULUM_BACKBONE[p] ? p : null);
}

/**
 * Map keyword to curriculum structure for a specific period only.
 * Use this when awarding points or recording progress from film/session input
 * so that "escape moves" in January (Build-out month) awards to Build-out, not all periods.
 *
 * @param {string} keyword - The keyword or phrase (e.g. "escape moves", "first touch")
 * @param {string} contextPeriod - The period for this session (e.g. "build-out", "Build-Out", or from getCurrentFocus())
 * @returns {Object|null} Single match { period, category, skill, subSkill?, subSubSkill? } or null
 */
export function mapKeywordToCurriculumForPeriod(keyword, contextPeriod) {
  const periodKey = normalizePeriodKey(contextPeriod);
  if (!periodKey || !CURRICULUM_BACKBONE[periodKey]) return null;

  const normalizedKeyword = keyword.toLowerCase().trim();
  const periodData = CURRICULUM_BACKBONE[periodKey];

  for (const category in periodData) {
    const categoryData = periodData[category];
    if (typeof categoryData !== 'object' || categoryData === null) continue;

    for (const skill in categoryData) {
      if (skill.toLowerCase().includes(normalizedKeyword) ||
          normalizedKeyword.includes(skill.toLowerCase())) {
        return { period: periodKey, category, skill, subSkill: null };
      }

      const skillData = categoryData[skill];
      if (typeof skillData === 'object' && !Array.isArray(skillData)) {
        for (const subSkill in skillData) {
          if (subSkill.toLowerCase().includes(normalizedKeyword) ||
              normalizedKeyword.includes(subSkill.toLowerCase())) {
            return { period: periodKey, category, skill, subSkill };
          }
          const subSkillData = skillData[subSkill];
          if (Array.isArray(subSkillData)) {
            for (const subSubSkill of subSkillData) {
              if (subSubSkill.toLowerCase().includes(normalizedKeyword) ||
                  normalizedKeyword.includes(subSubSkill.toLowerCase())) {
                return { period: periodKey, category, skill, subSkill, subSubSkill };
              }
            }
          }
        }
      }
    }
  }
  return null;
}

/**
 * Get all periods (for tactical tab)
 */
export function getAllPeriods() {
  return Object.keys(CURRICULUM_BACKBONE);
}

/**
 * Get all categories
 */
export function getAllCategories() {
  return ['technical', 'physical', 'mental', 'tactical'];
}

/** Format backbone key (kebab-case) as display label (Title Case). */
export function formatBackboneKeyAsLabel(key) {
  if (!key || typeof key !== 'string') return '';
  return key.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
}

/**
 * Find a skill/sub-skill/sub-sub-skill key in a category across all periods; return keyword info for drill-keywords API.
 * Used so technical/physical/mental "keywords" are backbone keys (skills, sub-skills, sub-sub-skills).
 */
export function getKeywordForBackboneSkill(category, skillKey) {
  if (!skillKey || category === 'tactical') return null;
  const key = String(skillKey).toLowerCase().trim();
  for (const period in CURRICULUM_BACKBONE) {
    const catData = CURRICULUM_BACKBONE[period][category];
    if (!catData || typeof catData !== 'object') continue;
    for (const skill of Object.keys(catData)) {
      if (skill === key) {
        return { keyword: formatBackboneKeyAsLabel(skill), synonyms: [] };
      }
      const skillData = catData[skill];
      if (typeof skillData !== 'object' || skillData === null) continue;
      if (Array.isArray(skillData)) {
        if (skillData.includes(key)) return { keyword: formatBackboneKeyAsLabel(key), synonyms: [] };
        continue;
      }
      for (const subSkill of Object.keys(skillData)) {
        if (subSkill === key) {
          return { keyword: formatBackboneKeyAsLabel(key), synonyms: [] };
        }
        const subSkillData = skillData[subSkill];
        if (Array.isArray(subSkillData) && subSkillData.includes(key)) {
          return { keyword: formatBackboneKeyAsLabel(key), synonyms: [] };
        }
      }
    }
  }
  return null;
}

/**
 * Get all "keywords" for a category from backbone (skill/sub-skill/sub-sub-skill keys as display labels).
 * Used by getKeywordsForCategory for technical/physical/mental.
 */
export function getKeywordsForCategoryFromBackbone(category) {
  if (category === 'tactical') return [];
  const seen = new Set();
  const out = [];
  for (const period in CURRICULUM_BACKBONE) {
    const catData = CURRICULUM_BACKBONE[period][category];
    if (!catData || typeof catData !== 'object') continue;
    function collect(obj) {
      if (!obj || typeof obj !== 'object') return;
      for (const k of Object.keys(obj)) {
        if (seen.has(k)) continue;
        seen.add(k);
        out.push({ skill: k, keyword: formatBackboneKeyAsLabel(k), synonyms: [] });
        if (!Array.isArray(obj[k]) && typeof obj[k] === 'object') collect(obj[k]);
        if (Array.isArray(obj[k])) {
          for (const sub of obj[k]) {
            if (sub && !seen.has(sub)) {
              seen.add(sub);
              out.push({ skill: sub, keyword: formatBackboneKeyAsLabel(sub), synonyms: [] });
            }
          }
        }
      }
    }
    collect(catData);
  }
  return out;
}

/**
 * Find a tactical keyword by key (e.g. 'plus-1') across all periods/phases. For getKeywordForSkill('tactical', key).
 */
export function getTacticalKeywordByKey(key) {
  const keyLower = String(key).toLowerCase().trim();
  for (const period in CURRICULUM_BACKBONE) {
    const tactical = CURRICULUM_BACKBONE[period]?.tactical;
    if (!tactical || typeof tactical !== 'object') continue;
    for (const phase in tactical) {
      const phaseData = tactical[phase];
      if (phaseData && phaseData[keyLower]) {
        const item = phaseData[keyLower];
        return {
          keyword: item.keyword,
          synonyms: item.synonyms || [],
          allTerms: [item.keyword, ...(item.synonyms || [])],
          period,
          phase
        };
      }
    }
  }
  return null;
}

/**
 * Get tactical phases for a period (attacking, defending, transition-a-to-d, transition-d-to-a).
 * Used by solo-create tactical flow.
 */
export function getPhasesForPeriod(period) {
  const tactical = CURRICULUM_BACKBONE[period]?.tactical;
  if (!tactical || typeof tactical !== 'object') return [];
  return Object.keys(tactical);
}

/**
 * Get tactical keywords for a period and phase, optionally filtered by position.
 * @param {string} period - build-out, middle-third, final-third, wide-play
 * @param {string} phase - attacking, defending, transition-a-to-d, transition-d-to-a
 * @param {string|null} positionFilter - Optional: single position (e.g. 'Full-Back') or group key (e.g. 'defense'). Null/empty = all keywords.
 * @returns {Array<{ keyword: string, synonyms: string[], positions: string[], phase: string }>}
 */
export function getTacticalKeywordsForPeriodAndPhase(period, phase, positionFilter = null) {
  const tactical = CURRICULUM_BACKBONE[period]?.tactical;
  if (!tactical || !tactical[phase]) return [];
  const phaseData = tactical[phase];
  const keywords = [];
  const positionsToMatch = positionFilter ? [positionFilter] : null;
  for (const key of Object.keys(phaseData)) {
    const item = phaseData[key];
    if (!item || item.keyword == null) continue;
    if (positionsToMatch && positionsToMatch.length > 0) {
      const keywordPositions = item.positions || [];
      if (keywordPositions.length > 0) {
        const hasMatch = positionsToMatch.some(p => keywordPositions.includes(p));
        if (!hasMatch) continue;
      }
    }
    keywords.push({
      keyword: item.keyword,
      synonyms: item.synonyms || [],
      positions: item.positions || [],
      phase
    });
  }
  return keywords;
}

