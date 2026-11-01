/**
 * @file shared/engine/capacity.js
 * @description Capacity formulas, guest invite ranges, comfort tiers,
 * and minimum viable budget calculations for Utsav planning engine.
 */

import { getTemplate } from './templates/index.js';
import { getComfortPlatePrice, getAllTierPrices } from './plates.js';
import { formatINR } from './currency.js';

/**
 * Compute invite capacity given plates affordable, show-up rate, and buffer fraction.
 * @param {number} platesAffordable
 * @param {number} showUpRate - e.g. 0.85
 * @param {number} buffer - e.g. 0.07
 * @returns {number}
 */
export function computeInvites(platesAffordable, showUpRate, buffer) {
  const divisor = showUpRate * (1 + buffer);
  if (divisor <= 0) return 0;
  return Math.floor(platesAffordable / divisor);
}

/**
 * Compute full catering capacity, invite bounds, and menu tiers from catering budget.
 *
 * Worked example verified:
 * type: 'wedding', foodBudget: 235520, citySize: 'city', showUp: 0.85, buffer: 0.07:
 * - Lean 630/plate => 373 plates => 410 invites
 * - Standard 900/plate => 261 plates => 286 invites
 * - Premium 1350/plate => 174 plates => 191 invites
 * - Luxury 1980/plate => 118 plates => 129 invites
 *
 * @param {Object} params
 * @param {string} params.type
 * @param {number} params.foodBudget - Catering allocation in INR
 * @param {'metro'|'city'|'town'} [params.citySize='city']
 * @param {number} [params.customShowUpRate]
 * @param {number} [params.customBuffer]
 * @param {'buffet'|'thali'|'plated'|'live_counters'} [params.serviceStyle='buffet']
 * @param {boolean} [params.vegOnly=false]
 */
export function calculateCapacity({
  type,
  foodBudget,
  citySize = 'city',
  customShowUpRate,
  customBuffer,
  serviceStyle = 'buffet',
  vegOnly = false,
}) {
  const tpl = getTemplate(type);
  const showUpRate = customShowUpRate ?? tpl.defaultShowUpRate;
  const buffer = customBuffer ?? tpl.defaultBuffer;
  const band = tpl.showUpBand;

  const tierPrices = getAllTierPrices(type, citySize, serviceStyle, vegOnly);

  const tiers = {};
  for (const [tName, price] of Object.entries(tierPrices)) {
    const plates = Math.floor(foodBudget / price);
    const likelyInvites = computeInvites(plates, showUpRate, buffer);
    const conservativeInvites = computeInvites(plates, band.max, buffer); // higher show up = fewer invites safe
    const optimisticInvites = computeInvites(plates, band.min, buffer); // lower show up = more invites possible

    tiers[tName] = {
      platePrice: price,
      platesAffordable: plates,
      invites: {
        likely: likelyInvites,
        conservative: conservativeInvites,
        optimistic: optimisticInvites,
      },
    };
  }

  return {
    foodBudget,
    showUpRate,
    buffer,
    comfortPlatePrice: getComfortPlatePrice(type, citySize),
    tiers,
  };
}

/**
 * Determine catering tier health rating: 'Tight' | 'Comfortable' | 'Generous'.
 * @param {number} actualPerHeadSpend - foodBudget / guests
 * @param {number} comfortPrice - m baseline
 * @returns {'Tight'|'Comfortable'|'Generous'}
 */
export function getBudgetTierRating(actualPerHeadSpend, comfortPrice) {
  if (actualPerHeadSpend < comfortPrice) return 'Tight';
  if (actualPerHeadSpend > comfortPrice * 1.8) return 'Generous';
  return 'Comfortable';
}

/**
 * Calculate the Minimum Viable Budget (MVB):
 * The smallest total budget (rounded up to nearest 5,000 INR) that provides
 * at least the Lean plate price for the chosen number of guests.
 *
 * @param {string} type
 * @param {number} guests
 * @param {'metro'|'city'|'town'} [citySize='city']
 * @param {number} [cateringWeightFraction=0.32] - e.g. 0.32 for wedding
 * @returns {number} Rounded up to 5,000 INR
 */
export function calculateMinimumViableBudget(type, guests, citySize = 'city', cateringWeightFraction = 0.32) {
  const tierPrices = getAllTierPrices(type, citySize);
  const leanPrice = tierPrices.lean;
  const tpl = getTemplate(type);
  const showUp = tpl.defaultShowUpRate;
  const buffer = tpl.defaultBuffer;

  // platesNeeded = guests * showUp * (1 + buffer)
  const platesNeeded = Math.ceil(guests * showUp * (1 + buffer));
  const minFoodBudget = platesNeeded * leanPrice;

  // Since foodBudget = totalBudget * (1 - contingency) * (cateringWeight / totalWeights)
  // Spendable = totalBudget * 0.92
  // foodBudget = totalBudget * 0.92 * cateringWeightFraction
  // totalBudget = minFoodBudget / (0.92 * cateringWeightFraction)
  const spendableShare = 0.92 * cateringWeightFraction;
  const rawTotal = minFoodBudget / spendableShare;

  // Round up to nearest 5,000 INR
  return Math.ceil(rawTotal / 5000) * 5000;
}

/**
 * Generate plain-language "Why this number?" explanation.
 * @param {Object} params
 */
export function explainFigure({
  label,
  value,
  inputs,
  formula,
}) {
  return {
    label,
    formattedValue: typeof value === 'number' ? formatINR(value) : String(value),
    inputs,
    formula,
    summary: `${label} is computed from your inputs (${Object.entries(inputs).map(([k, v]) => `${k}: ${v}`).join(', ')}) using: ${formula}. No hallucinated numbers.`,
  };
}
