/**
 * @file rsvp.js
 * @description RSVP & headcount forecast engine.
 * Applies hospitality industry norms to predict actual attendance from
 * invited headcount and derives catering buffer recommendations.
 * Pure function – no side effects.
 */

/** @typedef {import('./config.js').EventType} EventType */

/**
 * @typedef {Object} RsvpForecast
 * @property {number} invited            - Total invited (input)
 * @property {number} expectedAttendance - Most likely actual attendees
 * @property {number} low                - Conservative (low attendance) case
 * @property {number} high               - Optimistic (high attendance) case
 * @property {number} attendanceRate     - Expected rate as fraction (e.g. 0.78)
 * @property {number} cateringBuffer     - Extra plates to order beyond expected (%)
 * @property {string} insight            - Plain-English advice for Meera
 */

/**
 * Industry-average RSVP attendance rates (fraction) and caterer buffer % by event type.
 * Sources: Indian hospitality consultancy benchmarks.
 * @type {Partial<Record<EventType, {rate: number, low: number, high: number, buffer: number}>>}
 */
const RSVP_NORMS = {
  wedding:   { rate: 0.78, low: 0.68, high: 0.88, buffer: 10 },
  birthday:  { rate: 0.72, low: 0.60, high: 0.85, buffer: 8  },
  community: { rate: 0.65, low: 0.50, high: 0.80, buffer: 12 },
};

/**
 * Forecast attendance and catering quantities.
 *
 * @param {EventType} type
 * @param {number} invited - Number of people invited
 * @returns {RsvpForecast}
 */
export function forecastRsvp(type, invited) {
  const norm = RSVP_NORMS[type] ?? RSVP_NORMS.community;
  const expected  = Math.round(invited * norm.rate);
  const low       = Math.round(invited * norm.low);
  const high      = Math.round(invited * norm.high);
  const bufferAmt = Math.round(expected * norm.buffer / 100);
  const cateringBuffer = norm.buffer;

  let insight;
  if (invited <= 50) {
    insight = `Small, intimate ${type}. Budget catering for ${expected + bufferAmt} plates (expected ${expected} + ${bufferAmt} buffer).`;
  } else if (invited <= 300) {
    insight = `Mid-size ${type}. Order catering for ${expected + bufferAmt} plates — typically ${norm.rate * 100}% of invited guests attend.`;
  } else {
    insight = `Large ${type}. Expect ${expected} out of ${invited} invited; negotiate with caterer for a ±10% last-minute top-up clause.`;
  }

  return {
    invited,
    expectedAttendance: expected,
    low,
    high,
    attendanceRate: norm.rate,
    cateringBuffer,
    insight,
  };
}
