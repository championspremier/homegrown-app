/**
 * Curriculum Backbone Structure
 * 
 * This file defines the complete curriculum hierarchy for solo sessions.
 * It maps the structure: Period → Category → Skill → Sub-Skill
 * 
 * Used for:
 * - Filtering videos by curriculum structure
 * - Mapping objectives/keywords to curriculum topics
 * - Organizing solo sessions and quiz questions
 * - Tracking player progress through curriculum
 */

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
        'on-ground': ['backspin', 'curl', 'trivela', 'weak-foot', 'deception'],
        'half-volley': ['backspin', 'curl'],
        'full-volley': ['backspin']
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
    tactical: {} // Tactical content specific to Build-Out period
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
      'turning': {},
      'finishing': {},
      'passing': {
        'on-ground': ['backspin', 'curl', 'trivela', 'weak-foot', 'deception'],
        'half-volley': ['backspin', 'curl'],
        'full-volley': ['backspin']
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
    tactical: {} // Tactical content specific to Middle-Third period
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
      'turning': {},
      'finishing': {},
      'passing': {
        'on-ground': ['backspin', 'curl', 'trivela', 'weak-foot', 'deception'],
        'half-volley': ['backspin', 'curl'],
        'full-volley': ['backspin']
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
    tactical: {} // Tactical content specific to Final-Third period
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
      'finishing': {},
      'passing': {
        'on-ground': ['backspin', 'curl', 'trivela', 'weak-foot', 'deception'],
        'half-volley': ['backspin', 'curl'],
        'full-volley': ['backspin']
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
    tactical: {} // Tactical content specific to Wide-Play period
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

