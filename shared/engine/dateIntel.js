/**
 * @file shared/engine/dateIntel.js
 * @description Date intelligence, seasonal demand indexing, weekend premiums,
 * outdoor weather risk heuristics, and cheapest nearby date suggestions.
 */

import { formatINR } from './currency.js';

/**
 * Seasonal demand multipliers across India (1.0 = baseline normal).
 * Month 1 = Jan ... 12 = Dec.
 * High season: Nov-Feb (auspicious lagna muhurats, pleasant weather).
 * Medium season: Oct, Mar.
 * Low season: June-Aug (monsoon), April-May (extreme summer heat).
 */
export const SEASON_DEMAND_INDEX = {
  1:  1.30, // Jan (Peak wedding season)
  2:  1.35, // Feb (Peak wedding season)
  3:  1.05, // Mar (Pre-summer moderate)
  4:  0.90, // Apr (Heat begins)
  5:  0.85, // May (Peak summer heat, indoor only)
  6:  0.80, // Jun (Monsoon onset)
  7:  0.75, // Jul (Peak monsoon)
  8:  0.75, // Aug (Peak monsoon)
  9:  0.95, // Sep (Ganesh festival, post-monsoon)
  10: 1.15, // Oct (Navratri / Diwali kickoff)
  11: 1.35, // Nov (Peak auspicious wedding lagna)
  12: 1.40, // Dec (Peak holiday & wedding season)
};

export const WEEKEND_PREMIUM_FACTOR = 0.15; // 15% weekend surcharge on halls/decorators

/**
 * Analyze a prospective celebration date for seasonal demand, weekend premium, and weather risks.
 *
 * @param {string} isoDate - YYYY-MM-DD
 * @param {boolean} [isOutdoor=false]
 * @param {number} [totalBudget=1000000]
 */
export function analyzeDateIntelligence(isoDate, isOutdoor = false, totalBudget = 1000000) {
  const [year, month, day] = isoDate.split('-').map(Number);
  const dateObj = new Date(year, month - 1, day);

  const dayOfWeek = dateObj.getDay(); // 0 = Sun, 5 = Fri, 6 = Sat
  const isWeekend = (dayOfWeek === 0 || dayOfWeek === 5 || dayOfWeek === 6);
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dayOfWeek];

  const seasonFactor = SEASON_DEMAND_INDEX[month] ?? 1.0;
  const weekendFactor = isWeekend ? (1 + WEEKEND_PREMIUM_FACTOR) : 1.0;
  const combinedFactor = parseFloat((seasonFactor * weekendFactor).toFixed(2));

  // Weather risk evaluation
  const risks = [];
  const planBChecklist = [];

  // Monsoon risk: June through August
  if (month >= 6 && month <= 8) {
    if (isOutdoor) {
      risks.push({
        severity: 'high',
        type: 'monsoon',
        message: 'High monsoon rainfall risk for outdoor setups. Waterlogging and decor damage probable.',
      });
      planBChecklist.push('Mandatory waterproof German hangar / canopy with raised wooden platform');
      planBChecklist.push('High-capacity industrial water pumps and enclosed generator protection');
    } else {
      risks.push({
        severity: 'low',
        type: 'monsoon_indoor',
        message: 'Monsoon season: ensure venue has covered valet porch and umbrella stands for guests.',
      });
    }
  }

  // Extreme heat risk: April through May
  if ((month === 4 || month === 5) && isOutdoor) {
    risks.push({
      severity: 'medium',
      type: 'heat',
      message: 'Peak summer temperatures. Daytime outdoor ceremonies risk guest dehydration.',
    });
    planBChecklist.push('High-tonnage mist fans / evaporative air coolers around dining areas');
    planBChecklist.push('Continuous aam panna / jaljeera / coconut water welcome stations');
  }

  // Calculate cheapest nearby alternative date (within +/- 3 weeks)
  let bestAlternative = null;
  let maxPotentialSaving = 0;

  for (let offset = -21; offset <= 21; offset++) {
    if (offset === 0) continue;
    const cand = new Date(dateObj.getTime() + offset * 24 * 60 * 60 * 1000);
    // Ignore past dates relative to today
    if (cand < new Date()) continue;

    const candMonth = cand.getMonth() + 1;
    const candDayOfWeek = cand.getDay();
    const candIsWeekend = (candDayOfWeek === 0 || candDayOfWeek === 5 || candDayOfWeek === 6);

    const candSeason = SEASON_DEMAND_INDEX[candMonth] ?? 1.0;
    const candWeekend = candIsWeekend ? (1 + WEEKEND_PREMIUM_FACTOR) : 1.0;
    const candCombined = candSeason * candWeekend;

    if (candCombined < combinedFactor) {
      const savingFraction = (combinedFactor - candCombined) / combinedFactor;
      // Venue & Decor represent ~35% of budget where seasonal/weekend premiums hit
      const estimatedSaving = Math.round(totalBudget * 0.35 * savingFraction);

      if (estimatedSaving > maxPotentialSaving) {
        maxPotentialSaving = estimatedSaving;
        const cy = cand.getFullYear();
        const cm = String(cand.getMonth() + 1).padStart(2, '0');
        const cd = String(cand.getDate()).padStart(2, '0');
        bestAlternative = {
          date: `${cy}-${cm}-${cd}`,
          dayName: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][candDayOfWeek],
          isWeekend: candIsWeekend,
          seasonIndex: candSeason,
          estimatedSaving,
          reason: candIsWeekend
            ? 'Lower seasonal demand month'
            : 'Weekday venue booking discount (avoids 15% weekend surcharge)',
        };
      }
    }
  }

  return {
    date: isoDate,
    dayName,
    isWeekend,
    seasonDemandIndex: seasonFactor,
    demandLevel: seasonFactor >= 1.3 ? 'Peak' : (seasonFactor <= 0.85 ? 'Off-Peak' : 'Moderate'),
    combinedFactor,
    risks,
    planBChecklist,
    cheapestNearbyAlternative: bestAlternative,
    formattedEstimatedSaving: maxPotentialSaving > 0 ? formatINR(maxPotentialSaving) : null,
  };
}
