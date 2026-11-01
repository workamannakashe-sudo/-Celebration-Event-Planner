/**
 * @file shared/engine/currency.js
 * @description Indian Rupee (INR) formatting and parsing utilities.
 * Supports lakh/crore grouping and colloquial Indian spoken styles
 * ("12 lakh", "1.5 crore", "80k", "5.5L").
 */

/**
 * Format a number into standard Indian Rupee notation (e.g. ₹12,00,000).
 * @param {number} amount
 * @param {boolean} [showSymbol=true]
 * @returns {string}
 */
export function formatINR(amount, showSymbol = true) {
  if (typeof amount !== 'number' || isNaN(amount)) return showSymbol ? '₹0' : '0';
  const isNegative = amount < 0;
  const abs = Math.abs(Math.round(amount));

  const str = abs.toString();
  let result = '';

  if (str.length <= 3) {
    result = str;
  } else {
    const last3 = str.substring(str.length - 3);
    const rest = str.substring(0, str.length - 3);
    const groupedRest = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ',');
    result = `${groupedRest},${last3}`;
  }

  const prefix = isNegative ? '-₹' : '₹';
  return showSymbol ? `${prefix}${result}` : (isNegative ? `-${result}` : result);
}

/**
 * Format large amounts into human-friendly colloquial Indian scale (e.g. ₹12 Lakh, ₹1.5 Crore).
 * @param {number} amount
 * @returns {string}
 */
export function formatINRLarge(amount) {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 10000000) {
    const cr = (abs / 10000000).toFixed(2).replace(/\.00$/, '');
    return `${sign}₹${cr} Crore`;
  }
  if (abs >= 100000) {
    const lk = (abs / 100000).toFixed(2).replace(/\.00$/, '');
    return `${sign}₹${lk} Lakh`;
  }
  if (abs >= 1000) {
    const k = (abs / 1000).toFixed(1).replace(/\.0$/, '');
    return `${sign}₹${k}K`;
  }
  return formatINR(amount);
}

/**
 * Parse an Indian number string into an integer.
 * Handles:
 * - "12 lakh", "12l", "12 lakhs" -> 1200000
 * - "1.5 crore", "1.5cr", "1.5 crores" -> 15000000
 * - "80k", "80 thousand" -> 80000
 * - "₹12,00,000" -> 1200000
 * @param {string|number} input
 * @returns {number|null} parsed amount, or null if unparseable
 */
export function parseIndianNumber(input) {
  if (typeof input === 'number') return isNaN(input) ? null : Math.round(input);
  if (!input || typeof input !== 'string') return null;

  const clean = input.trim().toLowerCase().replace(/,/g, '').replace(/₹/g, '').replace(/rs\.?/g, '');

  // Match crore
  const crMatch = clean.match(/^([\d.]+)\s*(crores?|cr)\b/);
  if (crMatch) {
    const val = parseFloat(crMatch[1]);
    return isNaN(val) ? null : Math.round(val * 10000000);
  }

  // Match lakh
  const lkMatch = clean.match(/^([\d.]+)\s*(lakhs?|lac|lacs?|l)\b/);
  if (lkMatch) {
    const val = parseFloat(lkMatch[1]);
    return isNaN(val) ? null : Math.round(val * 100000);
  }

  // Match thousand / k
  const kMatch = clean.match(/^([\d.]+)\s*(k|thousand|thousands)\b/);
  if (kMatch) {
    const val = parseFloat(kMatch[1]);
    return isNaN(val) ? null : Math.round(val * 1000);
  }

  // Pure digits
  const num = parseFloat(clean);
  return isNaN(num) ? null : Math.round(num);
}
