/**
 * Tactical keywords per period and phase, with optional position metadata.
 * Source: drill-keywords-restructured.js tactical section.
 * Each keyword has: keyword, synonyms, positions ([] = all positions; or e.g. ['Full-Back', 'Winger']).
 * Edit positions line-by-line here to restrict keywords to specific positions.
 */
import { DRILL_KEYWORDS } from './drill-keywords-restructured.js';

function addPositionsToTactical(tactical) {
  if (!tactical || typeof tactical !== 'object') return {};
  const out = {};
  for (const period of Object.keys(tactical)) {
    out[period] = {};
    const periodData = tactical[period];
    if (!periodData || typeof periodData !== 'object') continue;
    for (const phase of Object.keys(periodData)) {
      out[period][phase] = {};
      const phaseData = periodData[phase];
      if (!phaseData || typeof phaseData !== 'object') continue;
      for (const key of Object.keys(phaseData)) {
        const item = phaseData[key];
        if (item && typeof item === 'object' && item.keyword != null) {
          out[period][phase][key] = {
            keyword: item.keyword,
            synonyms: Array.isArray(item.synonyms) ? item.synonyms : [],
            positions: Array.isArray(item.positions) ? item.positions : [],
            ...(item.technicalCoachingPoint === true && { technicalCoachingPoint: true }),
            ...(item.pressingTrigger === true && { pressingTrigger: true })
          };
        }
      }
    }
  }
  return out;
}

export const TACTICAL_KEYWORDS_DATA = addPositionsToTactical(DRILL_KEYWORDS.tactical || {});
