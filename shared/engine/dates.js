/**
 * @file dates.js
 * @description Date-intelligence engine.
 * Provides auspicious date suggestions and blackout-date detection
 * for Indian wedding, birthday, and community events.
 * Pure function – no side effects.
 */

/**
 * @typedef {Object} DateSuggestion
 * @property {string} date        - ISO date (YYYY-MM-DD)
 * @property {string} dayName     - e.g. 'Saturday'
 * @property {string} occasion    - e.g. 'Akshaya Tritiya' or 'Weekend'
 * @property {number} auspScore   - Auspiciousness score 0-10
 * @property {boolean} isBlackout - If true, avoid this date
 * @property {string} reason      - Short explanation for Meera
 */

/**
 * @typedef {Object} DateAnalysis
 * @property {DateSuggestion[]} suggestions   - Nearby good dates
 * @property {DateSuggestion}   inputAnalysis - Analysis of the user's chosen date
 * @property {string}           summary       - Plain-English advice
 */

// Day-of-week weights for Indian weddings (0=Sun … 6=Sat)
const DOW_SCORES = {
  0: 7,  // Sunday – popular
  1: 5,  // Monday
  2: 3,  // Tuesday – generally avoided
  3: 6,  // Wednesday
  4: 8,  // Thursday – auspicious
  5: 4,  // Friday
  6: 9,  // Saturday – most popular
};

/** Approximate major auspicious dates 2025-2026 (ISO strings). */
const AUSPICIOUS = [
  { date: '2025-04-30', occasion: 'Akshaya Tritiya',      score: 10 },
  { date: '2025-11-02', occasion: 'Diwali weekend',       score: 9  },
  { date: '2025-12-27', occasion: 'Margashirsha Shukla',  score: 8  },
  { date: '2026-01-24', occasion: 'Basant Panchami',      score: 9  },
  { date: '2026-04-19', occasion: 'Akshaya Tritiya',      score: 10 },
  { date: '2026-11-14', occasion: 'Diwali weekend',       score: 9  },
  { date: '2026-12-26', occasion: 'Margashirsha Shukla',  score: 8  },
  { date: '2027-01-13', occasion: 'Makar Sankranti',      score: 8  },
];

/** Approximate blackout / inauspicious periods (inclusive ISO ranges). */
const BLACKOUT_PERIODS = [
  { start: '2025-07-04', end: '2025-07-30', reason: 'Ashadha Adhik Maas (extra month – avoid)' },
  { start: '2025-09-01', end: '2025-09-27', reason: 'Pitru Paksha (ancestor fortnight – avoid)' },
  { start: '2026-07-23', end: '2026-08-19', reason: 'Ashadha Shukla 15 – Adhik Maas'           },
  { start: '2026-09-18', end: '2026-10-03', reason: 'Pitru Paksha 2026'                         },
];

/**
 * Check if a date string falls within any blackout period.
 * @param {string} dateStr - ISO YYYY-MM-DD
 * @returns {{ isBlackout: boolean, reason: string }}
 */
function checkBlackout(dateStr) {
  for (const bp of BLACKOUT_PERIODS) {
    if (dateStr >= bp.start && dateStr <= bp.end) {
      return { isBlackout: true, reason: bp.reason };
    }
  }
  return { isBlackout: false, reason: '' };
}

/**
 * Score and describe a single date.
 * @param {string} dateStr - ISO YYYY-MM-DD
 * @returns {DateSuggestion}
 */
function analyseDate(dateStr) {
  const d = new Date(`${dateStr}T12:00:00`);
  const dow = d.getDay();
  const dayName = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][dow];

  // Check auspicious list
  const ausp = AUSPICIOUS.find((a) => a.date === dateStr);
  let auspScore = DOW_SCORES[dow] ?? 5;
  let occasion = `${dayName} (no special occasion)`;

  if (ausp) {
    auspScore = ausp.score;
    occasion = ausp.occasion;
  } else if (dow === 6 || dow === 0) {
    occasion = 'Weekend – popular booking day';
  } else if (dow === 4) {
    occasion = 'Thursday – traditionally auspicious';
  }

  const { isBlackout, reason } = checkBlackout(dateStr);
  if (isBlackout) auspScore = Math.min(2, auspScore);

  const reason2 = isBlackout
    ? reason
    : ausp
    ? `${ausp.occasion} is considered highly auspicious for celebrations.`
    : dow === 6
    ? 'Saturdays have highest vendor availability but book early.'
    : dow === 4
    ? 'Thursdays are traditionally auspicious and often cheaper than weekends.'
    : 'A weekday – may attract lower venue rates.';

  return {
    date: dateStr,
    dayName,
    occasion,
    auspScore,
    isBlackout,
    reason: reason2,
  };
}

/**
 * Add days to an ISO date string.
 * @param {string} dateStr
 * @param {number} days
 * @returns {string}
 */
function addDays(dateStr, days) {
  const d = new Date(`${dateStr}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

/**
 * Analyse the chosen date and suggest nearby alternatives.
 *
 * @param {string} chosenDate  - ISO YYYY-MM-DD
 * @param {number} [windowDays=60] - Days to scan for alternatives
 * @returns {DateAnalysis}
 */
export function analyseDates(chosenDate, windowDays = 60) {
  const inputAnalysis = analyseDate(chosenDate);

  // Scan ±windowDays for high-scoring alternatives
  /** @type {DateSuggestion[]} */
  const candidates = [];
  for (let delta = -windowDays; delta <= windowDays; delta += 1) {
    if (delta === 0) continue;
    const candidateDate = addDays(chosenDate, delta);
    const analysis = analyseDate(candidateDate);
    if (!analysis.isBlackout && analysis.auspScore >= 7) {
      candidates.push(analysis);
    }
  }

  // Deduplicate (date is unique key) and take top 5 by score, then date
  const seen = new Set();
  const unique = candidates.filter((c) => {
    if (seen.has(c.date)) return false;
    seen.add(c.date);
    return true;
  });
  unique.sort((a, b) => b.auspScore - a.auspScore || a.date.localeCompare(b.date));
  const suggestions = unique.slice(0, 5);

  let summary;
  if (inputAnalysis.isBlackout) {
    summary = `⚠️ Your chosen date (${chosenDate}) falls in a period traditionally avoided: ${inputAnalysis.reason}. Consider one of the alternatives below.`;
  } else if (inputAnalysis.auspScore >= 9) {
    summary = `✨ Excellent choice! ${chosenDate} (${inputAnalysis.occasion}) is considered highly auspicious. Vendors will be in demand – book early.`;
  } else if (inputAnalysis.auspScore >= 7) {
    summary = `👍 ${chosenDate} (${inputAnalysis.occasion}) is a good date. A few nearby alternatives may be even more auspicious.`;
  } else {
    summary = `📅 ${chosenDate} (${inputAnalysis.dayName}) scores ${inputAnalysis.auspScore}/10. Consider a nearby weekend or auspicious date for better vendor availability.`;
  }

  return { suggestions, inputAnalysis, summary };
}
