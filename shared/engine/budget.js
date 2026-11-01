/**
 * @file budget.js
 * @description Deterministic budget allocation engine.
 * The LLM never calculates; all maths lives here.
 */

import {
  BASE_WEIGHTS,
  VIBE_MULTIPLIERS,
  CONTINGENCY_FRACTION,
  VEG_ONLY_CATERING_REDUCTION,
} from './config.js';

/** @typedef {import('./config.js').EventType} EventType */
/** @typedef {import('./config.js').Vibe} Vibe */

/**
 * @typedef {Object} CategoryAllocation
 * @property {string} name - Display name of the category
 * @property {number} amount - Allocated INR amount (integer)
 * @property {number} pct - Percentage of total budget (0-100, 1dp)
 * @property {string} vendorType - Short slug for vendor matching
 */

/**
 * @typedef {Object} BudgetPlan
 * @property {number} totalBudget - Original total budget in INR
 * @property {number} contingency - Contingency buffer amount
 * @property {number} contingencyPct - Contingency buffer percentage (0-100, 1dp)
 * @property {CategoryAllocation[]} categories - Ordered list of allocations
 */

/**
 * Compute vibe multiplier for a single category name.
 * Multiple rules can match; multipliers are multiplied together.
 * @param {string} categoryName
 * @param {Vibe} vibe
 * @returns {number}
 */
export function vibeMultiplier(categoryName, vibe) {
  const rules = VIBE_MULTIPLIERS[vibe] ?? [];
  return rules.reduce((acc, rule) => {
    return rule.pattern.test(categoryName) ? acc * rule.factor : acc;
  }, 1);
}

/**
 * Allocate the budget across categories.
 * Invariant: sum of all allocations (including contingency) === totalBudget.
 *
 * @param {EventType} type
 * @param {number} totalBudget - Total budget in INR
 * @param {Vibe} vibe
 * @param {boolean} vegOnly
 * @returns {BudgetPlan}
 */
export function allocateBudget(type, totalBudget, vibe, vegOnly) {
  const baseWeights = BASE_WEIGHTS[type];
  if (!baseWeights) throw new Error(`Unknown event type: ${type}`);

  const spendable = Math.round(totalBudget * (1 - CONTINGENCY_FRACTION));

  // Apply vibe multipliers to raw weights
  const adjustedWeights = {};
  for (const [name, w] of Object.entries(baseWeights)) {
    adjustedWeights[name] = w * vibeMultiplier(name, vibe);
  }

  // Normalise weights so they sum to 1
  const totalWeight = Object.values(adjustedWeights).reduce((a, b) => a + b, 0);

  // First pass: raw float allocations
  const rawAllocations = {};
  for (const [name, w] of Object.entries(adjustedWeights)) {
    rawAllocations[name] = (w / totalWeight) * spendable;
  }

  // Handle vegOnly: reduce catering by 8%, redirect saving to contingency
  if (vegOnly) {
    for (const name of Object.keys(rawAllocations)) {
      if (/catering|food/i.test(name)) {
        const saving = rawAllocations[name] * VEG_ONLY_CATERING_REDUCTION;
        rawAllocations[name] -= saving;
        // saving goes into contingency (absorbed in final step)
      }
    }
  }

  // Floor all amounts to integers
  const flooredAllocations = {};
  let usedSum = 0;
  for (const [name, amt] of Object.entries(rawAllocations)) {
    flooredAllocations[name] = Math.floor(amt);
    usedSum += flooredAllocations[name];
  }

  // The contingency absorbs ALL rounding remainders and vegOnly savings
  // since the raw reductions were already applied to rawAllocations before flooring
  const adjustedContingency = totalBudget - usedSum;

  const categories = Object.entries(flooredAllocations).map(([name, amount]) => ({
    name,
    amount,
    pct: parseFloat(((amount / totalBudget) * 100).toFixed(1)),
    vendorType: name.toLowerCase().replace(/[^a-z]+/g, '_'),
  }));

  const contingencyPct = parseFloat(((adjustedContingency / totalBudget) * 100).toFixed(1));

  return {
    totalBudget,
    contingency: adjustedContingency,
    contingencyPct,
    categories,
  };
}

/**
 * Find the catering allocation from a budget plan.
 * @param {BudgetPlan} plan
 * @returns {CategoryAllocation|undefined}
 */
export function getCateringCategory(plan) {
  return plan.categories.find((c) => /catering|food/i.test(c.name));
}
