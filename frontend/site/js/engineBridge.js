/**
 * @file frontend/site/js/engineBridge.js
 * @description Bridge connecting landing 3D scenes and HUD directly to the
 * shared deterministic engine (/shared/engine).
 * Ensures the landing world calculations match the real application.
 */

import { computePlan } from '../../../shared/engine/index.js';
import { allocateBudget } from '../../../shared/engine/budget.js';
import { runStressTest } from '../../../shared/engine/stress.js';
import { buildTimeline } from '../../../shared/engine/timeline.js';
import { forecastRsvp } from '../../../shared/engine/rsvp.js';
import { compareQuotes } from '../../../shared/engine/quotes.js';

/** @type {import('../../../shared/engine/index.js').PlanInputs} */
export const DEMO_PLAN_INPUTS = {
  type: 'wedding',
  name: 'Meera & Rohan Wedding',
  guests: 300,
  budget: 1200000,
  date: '2027-05-15',
  vibe: 'Traditional',
  vegOnly: false,
};

/**
 * Compute 3D Donut segment data for Scene 2 (Budget).
 * @param {typeof DEMO_PLAN_INPUTS} inputs
 */
export function getDonutSegments(inputs = DEMO_PLAN_INPUTS) {
  const allocation = allocateBudget(inputs.type, inputs.budget, /** @type {import('../../../shared/engine/config.js').Vibe} */ (inputs.vibe || 'Traditional'), inputs.vegOnly);
  const items = [
    ...allocation.categories,
    { name: 'Contingency Buffer', amount: allocation.contingency, pct: allocation.contingencyPct },
  ];

  let currentAngle = 0;
  return items.map((item, idx) => {
    const fraction = item.amount / allocation.totalBudget;
    const angleSpan = fraction * Math.PI * 2;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angleSpan;
    currentAngle = endAngle;

    return {
      name: item.name,
      amount: item.amount,
      pct: item.pct,
      startAngle,
      endAngle,
      index: idx,
    };
  });
}

/**
 * Compute Monte Carlo stress test distribution bins for Scene 3.
 * @param {typeof DEMO_PLAN_INPUTS} inputs
 * @param {number} [simulations=2000]
 */
export function getStressDistribution(inputs = DEMO_PLAN_INPUTS, simulations = 2000) {
  const stress = runStressTest(inputs, { simulations, seed: 42 });

  // Discretize simulated costs around total budget into 12 histogram bins
  const binCount = 12;
  const minCost = inputs.budget * 0.75;
  const maxCost = inputs.budget * 1.35;
  const binWidth = (maxCost - minCost) / binCount;
  const bins = new Array(binCount).fill(0);

  // Approximate normal/log-normal distribution around p50 and spread
  const mean = stress.p50;
  const sd = (stress.p95 - stress.p50) / 1.645;

  for (let b = 0; b < binCount; b++) {
    const binCenter = minCost + (b + 0.5) * binWidth;
    const z = (binCenter - mean) / sd;
    const pdf = Math.exp(-0.5 * z * z);
    bins[b] = Math.round(pdf * 100);
  }

  return {
    ...stress,
    bins,
    budgetThresholdBin: Math.floor((inputs.budget - minCost) / binWidth),
    safeProbability: Math.max(0, 100 - stress.overrunPct),
  };
}

/**
 * Compute timeline milestones for Scene 4 (Timeline Ribbon).
 * @param {string} [eventDate]
 */
export function getTimelineNodes(eventDate = DEMO_PLAN_INPUTS.date) {
  const plan = buildTimeline('wedding', eventDate);
  return plan.milestones;
}

/**
 * Compute RSVP headcount forecast for Scene 6.
 * @param {number} guests
 */
export function getRsvpForecastData(guests = 300) {
  return forecastRsvp('wedding', guests);
}

/**
 * Compute sample vendor quote comparison for Scene 5.
 */
export function getSampleVendorQuotes() {
  const quotes = [
    { vendorName: 'Regal Palace Hall', quotedPrice: 280000, notes: 'Includes basic AC & stage' },
    { vendorName: 'Heritage Lawn & Banquet', quotedPrice: 230000, notes: 'Includes generator & valets' },
    { vendorName: 'Crystal Ballroom', quotedPrice: 340000, notes: 'Premium package' },
  ];
  return compareQuotes('Venue & Mandap', 260000, quotes);
}

/**
 * Compute the complete demonstration plan using the shared engine.
 * @param {typeof DEMO_PLAN_INPUTS} inputs
 */
export function getFullDemoPlan(inputs = DEMO_PLAN_INPUTS) {
  return computePlan(inputs);
}
