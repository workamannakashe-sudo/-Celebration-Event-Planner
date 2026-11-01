/**
 * @file index.js
 * @description Utsav Planning Engine – public API.
 * Import this in both the server and the browser.
 * All functions are pure and deterministic.
 */

import { allocateBudget } from './budget.js';
import { assessFeasibility } from './feasibility.js';
import { buildTimeline } from './timeline.js';
import { buildVendorChecklist } from './vendors.js';

export { allocateBudget } from './budget.js';
export { assessFeasibility } from './feasibility.js';
export { buildTimeline } from './timeline.js';
export { buildVendorChecklist } from './vendors.js';
export { applyScenario } from './whatif.js';

/** @typedef {import('./budget.js').BudgetPlan} BudgetPlan */
/** @typedef {import('./feasibility.js').FeasibilityResult} FeasibilityResult */
/** @typedef {import('./timeline.js').TimelinePlan} TimelinePlan */
/** @typedef {import('./vendors.js').VendorItem} VendorItem */

/**
 * @typedef {Object} PlanInputs
 * @property {'wedding'|'birthday'|'community'} type
 * @property {string} name - Event / organiser name
 * @property {number} guests - Number of guests (1-5000)
 * @property {number} budget - Total budget in INR (10000-100000000)
 * @property {string} date - ISO date (YYYY-MM-DD)
 * @property {'Elegant'|'Fun'|'Traditional'|'Minimal'} vibe
 * @property {boolean} vegOnly
 */

/**
 * @typedef {Object} UtsavPlan
 * @property {PlanInputs} inputs - The validated inputs echo
 * @property {BudgetPlan} budget
 * @property {FeasibilityResult} feasibility
 * @property {TimelinePlan} timeline
 * @property {VendorItem[]} vendors
 * @property {number} daysToGo - Days from today to event date
 * @property {number} perGuest - Total budget / guests (for reference)
 */

/**
 * Compute a full Utsav plan from validated inputs.
 * Throws if the date is in the past.
 *
 * @param {PlanInputs} inputs
 * @param {Date} [today] - Injected for testing
 * @returns {UtsavPlan}
 */
export function computePlan(inputs, today = new Date()) {
  const { type, guests, budget, date, vibe, vegOnly } = inputs;

  const budgetPlan = allocateBudget(type, budget, vibe, vegOnly);
  const feasibility = assessFeasibility(budgetPlan, type, guests);
  const timeline = buildTimeline(type, date, today);
  const vendors = buildVendorChecklist(budgetPlan);

  const eventDate = new Date(`${date  }T00:00:00`);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysToGo = Math.round((eventDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));

  return {
    inputs,
    budget: budgetPlan,
    feasibility,
    timeline,
    vendors,
    daysToGo,
    perGuest: Math.round(budget / guests),
  };
}
