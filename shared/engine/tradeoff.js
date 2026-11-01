/**
 * @file tradeoff.js
 * @description Priority Trade-off Studio engine.
 * Given a locked total budget, lets the user boost one category and computes
 * proportional reductions from all other categories to maintain balance.
 * Pure function – no mutation.
 */

import { allocateBudget } from './budget.js';

/**
 * @typedef {Object} TradeoffScenario
 * @property {string} boostCategory - Category name to boost
 * @property {number} boostAmount   - Extra INR to add to that category
 */

/**
 * @typedef {Object} TradeoffEntry
 * @property {string} name         - Category name
 * @property {number} baseLine     - Original allocation (INR)
 * @property {number} adjusted     - Adjusted allocation (INR)
 * @property {number} delta        - Change (INR, positive = boost, negative = cut)
 * @property {number} deltaPct     - % change relative to baseline (1dp)
 */

/**
 * @typedef {Object} TradeoffResult
 * @property {TradeoffEntry[]} entries     - All categories with before/after
 * @property {number} contingencyBefore   - Original contingency (INR)
 * @property {number} contingencyAfter    - New contingency (INR)
 * @property {boolean} feasible           - False if any non-boosted cat < minimum floor
 */

/** Minimum allocation floor per category: 30% of its baseline */
const FLOOR_FRACTION = 0.3;

/**
 * Compute trade-off: boost one category, cut all others proportionally.
 *
 * @param {import('./index.js').PlanInputs} inputs
 * @param {TradeoffScenario} scenario
 * @returns {TradeoffResult}
 */
export function computeTradeoff(inputs, scenario) {
  const plan = allocateBudget(inputs.type, inputs.budget, inputs.vibe, inputs.vegOnly);
  const { categories, contingency } = plan;

  const boostAmt = Math.max(0, Math.min(scenario.boostAmount, plan.totalBudget * 0.3));
  const boostName = scenario.boostCategory;

  // Pool = sum of non-boosted categories (contingency excluded – it absorbs last)
  const others = categories.filter((c) => c.name !== boostName);
  const boosted = categories.find((c) => c.name === boostName);

  if (!boosted) {
    // Unknown category – return unchanged plan
    return {
      entries: categories.map((c) => ({
        name: c.name,
        baseLine: c.amount,
        adjusted: c.amount,
        delta: 0,
        deltaPct: 0,
      })),
      contingencyBefore: contingency,
      contingencyAfter: contingency,
      feasible: true,
    };
  }

  const othersPool = others.reduce((s, c) => s + c.amount, 0);

  // Distribute cut proportionally across others
  /** @type {TradeoffEntry[]} */
  const entries = [];
  let feasible = true;
  let actualCut = 0;

  for (const cat of others) {
    const share = cat.amount / othersPool;
    const cut = Math.round(boostAmt * share);
    const adjusted = cat.amount - cut;
    const floor = Math.round(cat.amount * FLOOR_FRACTION);
    if (adjusted < floor) feasible = false;
    actualCut += cut;
    entries.push({
      name: cat.name,
      baseLine: cat.amount,
      adjusted: Math.max(0, adjusted),
      delta: Math.max(0, adjusted) - cat.amount,
      deltaPct: parseFloat((((Math.max(0, adjusted) - cat.amount) / cat.amount) * 100).toFixed(1)),
    });
  }

  // Boosted entry
  entries.unshift({
    name: boosted.name,
    baseLine: boosted.amount,
    adjusted: boosted.amount + actualCut,
    delta: actualCut,
    deltaPct: parseFloat(((actualCut / boosted.amount) * 100).toFixed(1)),
  });

  // Sort same as original order
  const origOrder = categories.map((c) => c.name);
  entries.sort((a, b) => origOrder.indexOf(a.name) - origOrder.indexOf(b.name));

  // Remaining rounding adjustment hits contingency
  const contingencyAfter = plan.totalBudget - entries.reduce((s, e) => s + e.adjusted, 0);

  return {
    entries,
    contingencyBefore: contingency,
    contingencyAfter: Math.max(0, contingencyAfter),
    feasible,
  };
}
