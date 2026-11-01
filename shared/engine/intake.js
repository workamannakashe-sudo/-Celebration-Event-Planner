/**
 * @file shared/engine/intake.js
 * @description Smart single-sentence natural language intake parser.
 * Offline regex-based parser extracting celebration event type, city, city size,
 * month/date, guest count, budget (including Indian number formats), vibe, and veg options.
 */

import { parseIndianNumber } from './currency.js';

export const METRO_CITIES = [
  'mumbai', 'delhi', 'bengaluru', 'bangalore', 'hyderabad', 'chennai', 'kolkata', 'ncr', 'gurgaon', 'noida',
];

export const TIER2_CITIES = [
  'pune', 'ahmedabad', 'nagpur', 'jaipur', 'lucknow', 'chandigarh', 'indore', 'surat',
  'bhopal', 'patna', 'vadodara', 'visakhapatnam', 'kanpur', 'kochi', 'coimbatore', 'varanasi', 'nashik',
];

/**
 * Derive city size tier: 'metro' | 'city' | 'town'.
 * @param {string} cityName
 * @returns {'metro'|'city'|'town'}
 */
export function deriveCitySize(cityName) {
  if (!cityName) return 'city';
  const norm = cityName.trim().toLowerCase();
  if (METRO_CITIES.some((m) => norm.includes(m))) return 'metro';
  if (TIER2_CITIES.some((c) => norm.includes(c))) return 'city';
  return 'town';
}

const MONTH_NAMES = {
  january: 1, jan: 1,
  february: 2, feb: 2,
  march: 3, mar: 3,
  april: 4, apr: 4,
  may: 5,
  june: 6, jun: 6,
  july: 7, jul: 7,
  august: 8, aug: 8,
  september: 9, sep: 9, sept: 9,
  october: 10, oct: 10,
  november: 11, nov: 11,
  december: 12, dec: 12,
};

/**
 * Parse an informal user sentence into structured celebration plan inputs.
 *
 * Example:
 * "My sister's wedding in Nagpur in February, 300 guests, 12 lakh, mostly traditional"
 *
 * @param {string} text
 * @param {Date} [referenceDate=new Date()]
 */
export function parseSentenceIntake(text, referenceDate = new Date()) {
  if (!text || typeof text !== 'string') return null;
  const str = text.trim();
  const lower = str.toLowerCase();

  // 1. Event Type
  let type = 'wedding';
  if (/birthday|b'day|turning\s+\d+/i.test(lower)) {
    type = 'birthday';
  } else if (/community|festival|utsav|pandal|samiti|society/i.test(lower)) {
    type = 'community';
  } else if (/anniversary|jubilee/i.test(lower)) {
    type = 'anniversary';
  } else if (/baby\s*shower|godh\s*bharai|dohale/i.test(lower)) {
    type = 'baby_shower';
  } else if (/corporate|gala|annual\s*day|town\s*hall/i.test(lower)) {
    type = 'corporate';
  } else if (/wedding|shaadi|marriage|vivah|reception|sangeet/i.test(lower)) {
    type = 'wedding';
  }

  // 2. Budget
  let budget = 1000000;
  const matchB = lower.match(/([0-9.]+)\s*(crores?|cr|lakhs?|lac|lacs?|l|k)\b/i) ||
                 lower.match(/(?:₹|rs\.?)\s*([0-9,]+)/i);

  if (matchB) {
    const parsed = parseIndianNumber(matchB[0]);
    if (parsed && parsed >= 10000) {
      budget = parsed;
    }
  }

  // 3. Guests
  let guests = 200;
  const guestMatch = lower.match(/(\d+)\s*(?:guests?|people|pax|members|attendees|persons?)/i);
  if (guestMatch) {
    const g = parseInt(guestMatch[1], 10);
    if (!isNaN(g) && g > 0) guests = g;
  }

  // 4. City
  let city = 'Nagpur';
  const cityMatch = lower.match(/\bin\s+([A-Za-z]+)\b/i);
  if (cityMatch) {
    const candidate = cityMatch[1].trim();
    // Exclude month names or common words
    if (!MONTH_NAMES[candidate.toLowerCase()] && !['the', 'my', 'february', 'january'].includes(candidate.toLowerCase())) {
      city = candidate.charAt(0).toUpperCase() + candidate.slice(1).toLowerCase();
    }
  }

  // 5. Date / Month
  let targetDate = null;
  const curYear = referenceDate.getFullYear();

  for (const [mName, mNum] of Object.entries(MONTH_NAMES)) {
    const reg = new RegExp(`\\b${mName}\\b`, 'i');
    if (reg.test(lower)) {
      // Pick next occurrence of this month
      let targetYear = curYear;
      if (mNum <= referenceDate.getMonth() + 1) {
        targetYear += 1;
      }
      const padM = String(mNum).padStart(2, '0');
      targetDate = `${targetYear}-${padM}-15`;
      break;
    }
  }

  if (!targetDate) {
    // Default to 6 months from now
    const future = new Date(referenceDate.getTime() + 180 * 24 * 60 * 60 * 1000);
    const fy = future.getFullYear();
    const fm = String(future.getMonth() + 1).padStart(2, '0');
    const fd = String(future.getDate()).padStart(2, '0');
    targetDate = `${fy}-${fm}-${fd}`;
  }

  // 6. Vibe
  let vibe = 'Traditional';
  if (/elegant|royal|classy|luxury/i.test(lower)) vibe = 'Elegant';
  else if (/fun|quirky|party|vibrant/i.test(lower)) vibe = 'Fun';
  else if (/minimal|simple|subtle|budget/i.test(lower)) vibe = 'Minimal';
  else if (/traditional|cultural|vedic|authentic/i.test(lower)) vibe = 'Traditional';

  // 7. Veg only
  const vegOnly = /veg\s*only|pure\s*veg|vegetarian|jain/i.test(lower);

  return {
    type,
    name: `${city} ${type.charAt(0).toUpperCase() + type.slice(1)}`,
    city,
    citySize: deriveCitySize(city),
    date: targetDate,
    budget,
    guests,
    vibe,
    vegOnly,
    parsedFromSentence: text,
  };
}
