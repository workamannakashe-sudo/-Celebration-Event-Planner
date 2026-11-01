/**
 * @file server/ai/guard.js
 * @description Narration number guard: verify that every number mentioned in the
 * narration string appears in the allowed diff set.
 */

/**
 * @typedef {import('../../shared/engine/whatif.js').DiffEntry} DiffEntry
 */

/**
 * Extract all numeric values from the diff (both before and after).
 * @param {DiffEntry[]} diff
 * @returns {Set<number>}
 */
function allowedNumbers(diff) {
  const s = new Set();
  for (const entry of diff) {
    if (typeof entry.before === 'number') s.add(entry.before);
    if (typeof entry.after === 'number') s.add(entry.after);
    if (typeof entry.delta === 'number') s.add(Math.abs(entry.delta));
  }
  return s;
}

/**
 * Check whether all numbers mentioned in the narration text exist in the
 * allowed set from the engine diff.
 *
 * Strategy: extract all integer/decimal sequences from the narration (ignoring
 * separators like commas used in Indian number formatting), and verify each one
 * is within ±1 of some allowed value (to handle rounding in display).
 *
 * @param {string} narration
 * @param {DiffEntry[]} diff
 * @returns {boolean} true if safe to use narration
 */
export function narrationIsClean(narration, diff) {
  const allowed = allowedNumbers(diff);
  if (allowed.size === 0) return true; // No numbers to verify

  // Extract all numbers from narration (remove comma separators first)
  const normalised = narration.replace(/(\d),(\d)/g, '$1$2');
  const mentions = normalised.match(/\d+(\.\d+)?/g) ?? [];

  for (const m of mentions) {
    const n = parseFloat(m);
    if (n < 10) continue; // Ignore single-digit numbers (ordinals etc.)
    // Check if n is close to any allowed value (within 1% or ±1)
    const found = [...allowed].some((a) => {
      const tol = Math.max(1, a * 0.01);
      return Math.abs(n - a) <= tol;
    });
    if (!found) return false;
  }
  return true;
}
