/**
 * @file shared/engine/plates.js
 * @description Plate pricing and menu tier calculations for Indian celebration catering.
 */

import { getTemplate } from './templates/index.js';

export const CITY_SIZE_MULTIPLIERS = {
  metro: 1.25,
  city: 1.0,
  town: 0.8,
};

export const MENU_TIER_FACTORS = {
  lean: 0.7,
  standard: 1.0,
  premium: 1.5,
  luxury: 2.2,
};

export const SERVICE_STYLE_MODIFIERS = {
  buffet: 0,
  thali: -0.05,
  plated: 0.15,
  live_counters: 0.10,
};

/**
 * Calculate the comfort price per head m for an event type and city size.
 * @param {string} type - Event type (e.g. 'wedding', 'birthday')
 * @param {'metro'|'city'|'town'} [citySize='city']
 * @returns {number}
 */
export function getComfortPlatePrice(type, citySize = 'city') {
  const tpl = getTemplate(type);
  const cityMult = CITY_SIZE_MULTIPLIERS[citySize.toLowerCase()] ?? 1.0;
  return Math.round(tpl.comfortPricePerHead * cityMult);
}

/**
 * Calculate the price per plate given menu tier, service style, city size and veg-only option.
 * @param {Object} params
 * @param {string} params.type
 * @param {'lean'|'standard'|'premium'|'luxury'} [params.tier='standard']
 * @param {'buffet'|'thali'|'plated'|'live_counters'} [params.serviceStyle='buffet']
 * @param {'metro'|'city'|'town'} [params.citySize='city']
 * @param {boolean} [params.vegOnly=false]
 * @returns {number} Integer INR price per plate
 */
export function calculatePlatePrice({
  type,
  tier = 'standard',
  serviceStyle = 'buffet',
  citySize = 'city',
  vegOnly = false,
}) {
  const comfortBase = getComfortPlatePrice(type, citySize);
  const tierFactor = MENU_TIER_FACTORS[tier] ?? 1.0;
  const styleMod = SERVICE_STYLE_MODIFIERS[serviceStyle] ?? 0;
  const vegMod = vegOnly ? -0.08 : 0;

  const price = comfortBase * tierFactor * (1 + styleMod + vegMod);
  return Math.round(price);
}

/**
 * Get all 4 menu tier plate prices for comparison.
 * @param {string} type
 * @param {'metro'|'city'|'town'} [citySize='city']
 * @param {'buffet'|'thali'|'plated'|'live_counters'} [serviceStyle='buffet']
 * @param {boolean} [vegOnly=false]
 * @returns {Record<'lean'|'standard'|'premium'|'luxury', number>}
 */
export function getAllTierPrices(type, citySize = 'city', serviceStyle = 'buffet', vegOnly = false) {
  return {
    lean: calculatePlatePrice({ type, tier: 'lean', citySize, serviceStyle, vegOnly }),
    standard: calculatePlatePrice({ type, tier: 'standard', citySize, serviceStyle, vegOnly }),
    premium: calculatePlatePrice({ type, tier: 'premium', citySize, serviceStyle, vegOnly }),
    luxury: calculatePlatePrice({ type, tier: 'luxury', citySize, serviceStyle, vegOnly }),
  };
}
