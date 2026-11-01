/**
 * @file shared/engine/scenarios.js
 * @description Blueprint Finalizer: generates the three deterministic scenarios
 * (Lean, Balanced, Showstopper) from pure engine math.
 */

import { allocateBudget } from './budget.js';
import { calculateCapacity } from './capacity.js';

/**
 * Generate the three core blueprint scenarios for Meera: Lean, Balanced, Showstopper.
 *
 * @param {Object} planInputs
 * @param {string} planInputs.type
 * @param {number} planInputs.budget
 * @param {number} planInputs.guests
 * @param {'Elegant'|'Fun'|'Traditional'|'Minimal'} [planInputs.vibe='Traditional']
 * @param {boolean} [planInputs.vegOnly=false]
 * @param {'metro'|'city'|'town'} [planInputs.citySize='city']
 */
export function generateScenarios(planInputs) {
  const { type, budget, guests, vibe = 'Traditional', vegOnly = false, citySize = 'city' } = planInputs;

  // 1. Balanced (Recommended baseline)
  // Standard plate tier, 8% contingency, default vibe split
  const balancedBudget = allocateBudget(type, budget, vibe, vegOnly, 0.08);
  const balancedCatering = balancedBudget.categories.find((c) => /catering|food/i.test(c.name))?.amount || 0;
  const balancedCap = calculateCapacity({
    type,
    foodBudget: balancedCatering,
    citySize,
    serviceStyle: 'buffet',
    vegOnly,
  });

  const balancedScenario = {
    id: 'balanced',
    name: 'Balanced',
    badge: 'Recommended',
    totalBudget: budget,
    contingency: balancedBudget.contingency,
    contingencyPct: balancedBudget.contingencyPct,
    platePrice: balancedCap.tiers.standard.platePrice,
    platesAffordable: balancedCap.tiers.standard.platesAffordable,
    invitesRange: balancedCap.tiers.standard.invites,
    perGuestAllIn: Math.round(budget / Math.max(1, guests)),
    menuTier: 'Standard',
    serviceStyle: 'Buffet with Live Counters',
    decorStyle: 'Classic Fresh Floral & Ambient Warm Lighting',
    whatYouGiveUp: 'Ultra-luxury imported flowers and heavy bespoke designer stage sets',
    riskVerdict: 'Solid 8% buffer. Low risk of overrun if guest list is locked early.',
    categories: balancedBudget.categories,
  };

  // 2. Lean (Cost-conscious, maximum savings buffer)
  // 12% contingency buffer, Lean menu tier (-30% per plate), minimal decor
  const leanBudget = allocateBudget(type, budget, 'Minimal', vegOnly, 0.12);
  const leanCatering = leanBudget.categories.find((c) => /catering|food/i.test(c.name))?.amount || 0;
  const leanCap = calculateCapacity({
    type,
    foodBudget: leanCatering,
    citySize,
    serviceStyle: 'buffet',
    vegOnly,
  });

  const leanScenario = {
    id: 'lean',
    name: 'Lean & Smart',
    badge: 'Budget Safe',
    totalBudget: budget,
    contingency: leanBudget.contingency,
    contingencyPct: leanBudget.contingencyPct,
    platePrice: leanCap.tiers.lean.platePrice,
    platesAffordable: leanCap.tiers.lean.platesAffordable,
    invitesRange: leanCap.tiers.lean.invites,
    perGuestAllIn: Math.round(budget / Math.max(1, guests)),
    menuTier: 'Lean (Comfort Menu)',
    serviceStyle: 'Buffet',
    decorStyle: 'Minimal & Traditional Marigolds',
    whatYouGiveUp: 'Live bands, drone videography, exotic imported flower arches',
    riskVerdict: 'Generous 12% cash buffer. Virtually zero chance of debt or surprise cost.',
    categories: leanBudget.categories,
  };

  // 3. Showstopper (Maximum visual impact while keeping strict ≥8% buffer)
  // Premium menu tier, Elegant vibe
  const showBudget = allocateBudget(type, budget, 'Elegant', vegOnly, 0.08);
  const showCatering = showBudget.categories.find((c) => /catering|food/i.test(c.name))?.amount || 0;
  const showCap = calculateCapacity({
    type,
    foodBudget: showCatering,
    citySize,
    serviceStyle: 'live_counters',
    vegOnly,
  });

  const showstopperScenario = {
    id: 'showstopper',
    name: 'Showstopper',
    badge: 'Maximum Impact',
    totalBudget: budget,
    contingency: showBudget.contingency,
    contingencyPct: showBudget.contingencyPct,
    platePrice: showCap.tiers.premium.platePrice,
    platesAffordable: showCap.tiers.premium.platesAffordable,
    invitesRange: showCap.tiers.premium.invites,
    perGuestAllIn: Math.round(budget / Math.max(1, guests)),
    menuTier: 'Premium Multi-Cuisine',
    serviceStyle: 'Plated Service + Live Dessert & Chaat Counters',
    decorStyle: 'Bespoke Theme Mandap with Grand Floral Ceiling & Moving Truss Lights',
    whatYouGiveUp: 'Requires strict discipline on guest counts; no room for last-minute 50+ guest add-ons',
    riskVerdict: 'Keeps 8% statutory contingency, but caterer plate price leaves less room for headcount creep.',
    categories: showBudget.categories,
  };

  return {
    lean: leanScenario,
    balanced: balancedScenario,
    showstopper: showstopperScenario,
  };
}
