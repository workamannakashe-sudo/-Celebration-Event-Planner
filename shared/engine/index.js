/**
 * @file shared/engine/index.js
 * @description Utsav Planning Engine – unified public API.
 * Pure ECMAScript Modules (ESM) imported by both server and browser.
 * Injectable clock and seeded pseudo-random engines.
 *
 * @typedef {Object} PlanInputs
 * @property {'wedding'|'anniversary'|'birthday'|'mundan'|'housewarming'|'general'|'community'} type
 * @property {string} [name]
 * @property {number} budget - Total budget in INR
 * @property {number} guests - Expected guest count
 * @property {string} date - Event date (YYYY-MM-DD)
 * @property {string} [vibe]
 * @property {boolean} [vegOnly]
 * @property {'metro'|'tier2'|'town'|'city'} [citySize]
 *
 * @typedef {Object} UtsavPlan
 * @property {PlanInputs} inputs
 * @property {any} budget
 * @property {any} feasibility
 * @property {any} timeline
 * @property {any} vendors
 * @property {any} [capacity]
 * @property {any} [criticalPath]
 * @property {any} [scenarios]
 * @property {number} daysToGo
 * @property {number} perGuest
 */

import { allocateBudget } from './budget.js';
import { assessFeasibility } from './feasibility.js';
import { buildTimeline } from './timeline.js';
import { buildVendorChecklist } from './vendors.js';
import { calculateCapacity } from './capacity.js';
import { computeCriticalPath } from './criticalPath.js';
import { generateScenarios } from './scenarios.js';

export { allocateBudget } from './budget.js';
export { assessFeasibility } from './feasibility.js';
export { buildTimeline } from './timeline.js';
export { buildVendorChecklist } from './vendors.js';
export { applyScenario } from './whatif.js';
export { runStressTest } from './stress.js';
export { computeTradeoff } from './tradeoff.js';
export { forecastRsvp } from './rsvp.js';
export { compareQuotes } from './quotes.js';
export { analyseDates } from './dates.js';

// Differentiators & Helpers
export { formatINR, formatINRLarge, parseIndianNumber } from './currency.js';
export { getTemplate, TEMPLATES } from './templates/index.js';
export { getComfortPlatePrice, calculatePlatePrice, getAllTierPrices } from './plates.js';
export { calculateCapacity, computeInvites, getBudgetTierRating, calculateMinimumViableBudget, explainFigure } from './capacity.js';
export { computeCriticalPath, analyzeDateShift } from './criticalPath.js';
export { analyzeDateIntelligence } from './dateIntel.js';
export { findOptimalSavingsLevers, evaluateAddon } from './optimizer.js';
export { generateScenarios } from './scenarios.js';
export { computeLedgerSummary } from './ledger.js';
export { generateRunSheet } from './runsheet.js';
export { parseSentenceIntake, deriveCitySize } from './intake.js';
export { haversineDistanceKm, coarsenCoordinates } from './geo.js';
export { computeBayesianRating, determinePriceFit, rankVendors } from './vendorsRank.js';
export { explainCalculation, AuditTrail } from './explain.js';
export { generateSeatingPlan } from './seating.js';
export { buildExportModel, sanitizeSpreadsheetFormula } from './exportModel.js';

/**
 * Compute a full deterministic Utsav plan from validated inputs.
 * Throws if the date is in the past.
 *
 * @param {Object} inputs
 * @param {Date} [today=new Date()] - Injected for testing
 * @returns {Object} Full calculated plan
 */
export function computePlan(inputs, today = new Date()) {
  const { type, guests, budget, date, vibe = 'Traditional', vegOnly = false, citySize = 'city' } = inputs;

  const budgetPlan = allocateBudget(type, budget, vibe, vegOnly);
  const feasibility = assessFeasibility(budgetPlan, type, guests);
  const timeline = buildTimeline(type, date, today);
  const vendors = buildVendorChecklist(budgetPlan);

  const eventDate = new Date(`${date}T00:00:00`);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const daysToGo = Math.round((eventDate.getTime() - todayMidnight.getTime()) / (1000 * 60 * 60 * 24));

  const cateringAmount = budgetPlan.categories.find((c) => /catering|food/i.test(c.name))?.amount || 0;
  const capacity = calculateCapacity({
    type,
    foodBudget: cateringAmount,
    citySize,
    vegOnly,
  });

  const criticalPath = computeCriticalPath(type, date, today);
  const scenarios = generateScenarios({
    type,
    budget,
    guests,
    vibe,
    vegOnly,
    citySize,
  });

  return {
    inputs: {
      ...inputs,
      citySize,
    },
    budget: budgetPlan,
    feasibility,
    timeline,
    vendors,
    capacity,
    criticalPath,
    scenarios,
    daysToGo,
    perGuest: Math.round(budget / Math.max(1, guests)),
  };
}
