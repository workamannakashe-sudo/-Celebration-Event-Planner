/**
 * @file stress.js
 * @description Monte Carlo stress-test engine.
 * Runs N simulations with randomised cost shocks to estimate budget-overrun probability.
 * Pure function – no side effects, no randomness state leakage.
 */

import { allocateBudget } from './budget.js';

/**
 * @typedef {Object} StressConfig
 * @property {number} [simulations=5000] - Number of Monte Carlo runs
 * @property {number} [shockSd=0.12]    - Std-dev of per-category cost shock (log-normal)
 * @property {number} [guestSd=0.08]    - Std-dev of guest-count shock
 * @property {number} [seed=42]         - Deterministic seed for reproducibility
 */

/**
 * @typedef {Object} StressResult
 * @property {number} simulations       - Runs executed
 * @property {number} overrunPct        - % of runs that exceeded totalBudget
 * @property {number} p50               - Median simulated total cost (INR)
 * @property {number} p75               - 75th-percentile simulated cost (INR)
 * @property {number} p95               - 95th-percentile simulated cost (INR)
 * @property {number} meanOverrun       - Mean excess cost over budget (INR, 0 if under)
 * @property {string} verdict           - 'Safe' | 'Moderate Risk' | 'High Risk'
 * @property {string[]} topRiskCategories - Category names with highest variance
 */

/**
 * Mulberry32 deterministic PRNG – fast, good enough for simulation.
 * @param {number} seed
 * @returns {() => number} – returns value in [0, 1)
 */
function prng(seed) {
  let s = seed >>> 0;
  return function () {
    s |= 0;
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Box-Muller transform to sample N(0,1).
 * @param {() => number} rand
 * @returns {number}
 */
function randNormal(rand) {
  const u1 = Math.max(rand(), 1e-10);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

/**
 * Run Monte Carlo stress test on a plan.
 *
 * @param {import('./index.js').PlanInputs} inputs
 * @param {StressConfig} [config]
 * @returns {StressResult}
 */
export function runStressTest(inputs, config = {}) {
  const {
    simulations = 5000,
    shockSd = 0.12,
    guestSd = 0.08,
    seed = 42,
  } = config;

  const rand = prng(seed);

  const basePlan = allocateBudget(inputs.type, inputs.budget, /** @type {import('./config.js').Vibe} */ (inputs.vibe || 'Traditional'), inputs.vegOnly);
  const totalBudget = inputs.budget;
  const baseCategories = basePlan.categories;

  /** @type {number[]} */
  const totals = [];

  // Track per-category sum of (simCost - baseCost)^2 for variance ranking
  /** @type {Record<string, number>} */
  const varAccum = {};
  for (const c of baseCategories) varAccum[c.name] = 0;

  for (let i = 0; i < simulations; i++) {
    // Shock guests (affects catering proportionally)
    const guestShock = 1 + guestSd * randNormal(rand);
    const guestMult = Math.max(0.5, Math.min(2, guestShock));

    let simTotal = 0;
    for (const cat of baseCategories) {
      // Log-normal cost shock per category
      const shock = Math.exp(shockSd * randNormal(rand) - (shockSd * shockSd) / 2);
      const isCatering = /catering|food/i.test(cat.name);
      const effectiveShock = isCatering ? shock * guestMult : shock;
      const simCost = cat.amount * effectiveShock;
      simTotal += simCost;
      varAccum[cat.name] += (simCost - cat.amount) ** 2;
    }
    // Add contingency as-is (it should absorb small shocks)
    simTotal += basePlan.contingency;
    totals.push(simTotal);
  }

  totals.sort((a, b) => a - b);

  const p50 = Math.round(totals[Math.floor(simulations * 0.5)]);
  const p75 = Math.round(totals[Math.floor(simulations * 0.75)]);
  const p95 = Math.round(totals[Math.floor(simulations * 0.95)]);

  const overrunCount = totals.filter((t) => t > totalBudget).length;
  const overrunPct = parseFloat(((overrunCount / simulations) * 100).toFixed(1));

  // Mean overrun (only over-budget runs)
  const overrunVals = totals.filter((t) => t > totalBudget);
  const meanOverrun =
    overrunVals.length > 0
      ? Math.round(overrunVals.reduce((a, b) => a + b, 0) / overrunVals.length - totalBudget)
      : 0;

  // Rank categories by variance
  const sortedByVar = Object.entries(varAccum)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([name]) => name);

  let verdict;
  if (overrunPct < 10) verdict = 'Safe';
  else if (overrunPct < 30) verdict = 'Moderate Risk';
  else verdict = 'High Risk';

  return {
    simulations,
    overrunPct,
    p50,
    p75,
    p95,
    meanOverrun,
    verdict,
    topRiskCategories: sortedByVar,
  };
}
