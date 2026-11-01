/**
 * @file feasibility.js
 * @description Feasibility analysis: determines whether the catering budget
 * can realistically cover all guests, and provides corrective suggestions.
 */

import { CATERING_MIN_PER_HEAD, GENEROUS_MULTIPLIER } from './config.js';
import { getCateringCategory } from './budget.js';

/** @typedef {import('./config.js').EventType} EventType */
/** @typedef {import('./budget.js').BudgetPlan} BudgetPlan */

/** @typedef {'Tight'|'Comfortable'|'Generous'} FeasibilityTier */

/**
 * @typedef {Object} FeasibilityResult
 * @property {FeasibilityTier} tier
 * @property {number} perHeadActual - Actual catering per head (INR)
 * @property {number} perHeadMin - Minimum comfortable per head for this type
 * @property {number|undefined} maxGuestsThatFit - Only present when tier === 'Tight'
 * @property {number|undefined} budgetNeeded - Only present when tier === 'Tight'
 */

/**
 * Analyse catering feasibility.
 * @param {BudgetPlan} plan
 * @param {EventType} type
 * @param {number} guests
 * @returns {FeasibilityResult}
 */
export function assessFeasibility(plan, type, guests) {
  const cateringCat = getCateringCategory(plan);
  const cateringAmount = cateringCat ? cateringCat.amount : 0;
  const minPerHead = CATERING_MIN_PER_HEAD[type];
  const perHeadActual = guests > 0 ? cateringAmount / guests : 0;

  /** @type {FeasibilityTier} */
  let tier;
  if (perHeadActual < minPerHead) {
    tier = 'Tight';
  } else if (perHeadActual > minPerHead * GENEROUS_MULTIPLIER) {
    tier = 'Generous';
  } else {
    tier = 'Comfortable';
  }

  /** @type {FeasibilityResult} */
  const result = { tier, perHeadActual: Math.round(perHeadActual), perHeadMin: minPerHead };

  if (tier === 'Tight') {
    result.maxGuestsThatFit = Math.floor(cateringAmount / minPerHead);
    // budgetNeeded = budget * minPerHead * guests / cateringAmount, rounded up to nearest 5000
    const raw = (plan.totalBudget * minPerHead * guests) / cateringAmount;
    result.budgetNeeded = Math.ceil(raw / 5000) * 5000;
  }

  return result;
}
