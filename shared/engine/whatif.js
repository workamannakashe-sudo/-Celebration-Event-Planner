/**
 * @file whatif.js
 * @description What-if scenario engine.
 * All functions are pure; they never mutate their inputs.
 */

import { computePlan } from './index.js';

/**
 * @typedef {Object} PlanInputs
 * @property {'wedding'|'birthday'|'community'} type
 * @property {string} name
 * @property {number} guests
 * @property {number} budget
 * @property {string} date
 * @property {'Elegant'|'Fun'|'Traditional'|'Minimal'} vibe
 * @property {boolean} vegOnly
 */

/**
 * @typedef {Object} WhatIfScenario
 * @property {number} [budgetPct] - Adjust budget by percentage, e.g. -20 means cut 20%
 * @property {number} [budgetSet] - Set budget to exact value
 * @property {number} [guestsDelta] - Add/subtract guests, e.g. 50 or -30
 * @property {number} [guestsSet] - Set guests to exact count
 * @property {string} [dateSet] - New event date ISO string
 * @property {'Elegant'|'Fun'|'Traditional'|'Minimal'} [vibeSet]
 * @property {boolean} [vegOnly]
 */

/**
 * @typedef {Object} DiffEntry
 * @property {string} field - Field name that changed
 * @property {number|string|boolean} before - Previous value
 * @property {number|string|boolean} after - New value
 * @property {number|string|boolean} [delta] - Numeric change where applicable
 */

/**
 * @typedef {Object} WhatIfResult
 * @property {import('./index.js').UtsavPlan} before
 * @property {import('./index.js').UtsavPlan} after
 * @property {DiffEntry[]} diff
 */

/**
 * Apply a what-if scenario and return before/after plans with a diff.
 * @param {PlanInputs} inputs
 * @param {WhatIfScenario} scenario
 * @returns {WhatIfResult}
 */
export function applyScenario(inputs, scenario) {
  const before = computePlan(inputs);

  // Build new inputs
  let newBudget = inputs.budget;
  if (scenario.budgetSet !== undefined) {
    newBudget = scenario.budgetSet;
  } else if (scenario.budgetPct !== undefined) {
    newBudget = Math.round(inputs.budget * (1 + scenario.budgetPct / 100));
  }

  let newGuests = inputs.guests;
  if (scenario.guestsSet !== undefined) {
    newGuests = scenario.guestsSet;
  } else if (scenario.guestsDelta !== undefined) {
    newGuests = inputs.guests + scenario.guestsDelta;
  }

  // Clamp
  newBudget = Math.max(10000, Math.min(100_000_000, newBudget));
  newGuests = Math.max(1, Math.min(5000, newGuests));

  const newInputs = {
    ...inputs,
    budget: newBudget,
    guests: newGuests,
    ...(scenario.dateSet ? { date: scenario.dateSet } : {}),
    ...(scenario.vibeSet ? { vibe: scenario.vibeSet } : {}),
    ...(scenario.vegOnly !== undefined ? { vegOnly: scenario.vegOnly } : {}),
  };

  const after = computePlan(newInputs);

  // Build diff
  const diff = buildDiff(before, after, inputs, newInputs);

  return { before, after, diff };
}

/**
 * Build a human-readable diff between two plans.
 * @param {import('./index.js').UtsavPlan} before
 * @param {import('./index.js').UtsavPlan} after
 * @param {PlanInputs} inputsBefore
 * @param {PlanInputs} inputsAfter
 * @returns {DiffEntry[]}
 */
function buildDiff(before, after, inputsBefore, inputsAfter) {
  /** @type {DiffEntry[]} */
  const diff = [];

  const numericFields = [
    { key: 'budget', labelBefore: inputsBefore.budget, labelAfter: inputsAfter.budget },
    { key: 'guests', labelBefore: inputsBefore.guests, labelAfter: inputsAfter.guests },
  ];

  for (const f of numericFields) {
    if (f.labelBefore !== f.labelAfter) {
      diff.push({
        field: f.key,
        before: f.labelBefore,
        after: f.labelAfter,
        delta: f.labelAfter - f.labelBefore,
      });
    }
  }

  if (inputsBefore.vibe !== inputsAfter.vibe) {
    diff.push({ field: 'vibe', before: inputsBefore.vibe, after: inputsAfter.vibe });
  }
  if (inputsBefore.vegOnly !== inputsAfter.vegOnly) {
    diff.push({ field: 'vegOnly', before: inputsBefore.vegOnly, after: inputsAfter.vegOnly });
  }
  if (inputsBefore.date !== inputsAfter.date) {
    diff.push({ field: 'date', before: inputsBefore.date, after: inputsAfter.date });
  }

  // Category-level budget changes
  const beforeMap = Object.fromEntries(before.budget.categories.map((c) => [c.name, c.amount]));
  const afterMap = Object.fromEntries(after.budget.categories.map((c) => [c.name, c.amount]));
  for (const [name, beforeAmt] of Object.entries(beforeMap)) {
    const afterAmt = afterMap[name];
    if (afterAmt !== undefined && beforeAmt !== afterAmt) {
      diff.push({
        field: `category.${name}`,
        before: beforeAmt,
        after: afterAmt,
        delta: afterAmt - beforeAmt,
      });
    }
  }

  // Contingency
  if (before.budget.contingency !== after.budget.contingency) {
    diff.push({
      field: 'contingency',
      before: before.budget.contingency,
      after: after.budget.contingency,
      delta: after.budget.contingency - before.budget.contingency,
    });
  }

  // Feasibility tier
  if (before.feasibility.tier !== after.feasibility.tier) {
    diff.push({ field: 'feasibility.tier', before: before.feasibility.tier, after: after.feasibility.tier });
  }
  if (before.feasibility.perHeadActual !== after.feasibility.perHeadActual) {
    diff.push({
      field: 'feasibility.perHeadActual',
      before: before.feasibility.perHeadActual,
      after: after.feasibility.perHeadActual,
      delta: after.feasibility.perHeadActual - before.feasibility.perHeadActual,
    });
  }

  return diff;
}
