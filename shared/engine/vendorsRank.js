/**
 * @file shared/engine/vendorsRank.js
 * @description Deterministic vendor ranking and price-fit engine.
 * Applies Bayesian rating shrinkage, distance decay, contact completeness,
 * and price-fit against category allocation.
 */

import { haversineDistanceKm } from './geo.js';

export const BAYESIAN_PRIOR_MEAN = 4.0;
export const BAYESIAN_PRIOR_STRENGTH = 20;

/**
 * Calculate Bayesian-shrunk rating.
 * Avoids 1-review 5-star vendors outranking 200-review 4.7-star vendors.
 *
 * @param {number} rating - Raw average rating (0-5)
 * @param {number} reviewCount - Number of user reviews
 * @returns {number} Shrunk rating between 1 and 5
 */
export function computeBayesianRating(rating, reviewCount) {
  const r = Math.min(5, Math.max(1, rating || BAYESIAN_PRIOR_MEAN));
  const count = Math.max(0, reviewCount || 0);
  const shrunk = (r * count + BAYESIAN_PRIOR_MEAN * BAYESIAN_PRIOR_STRENGTH) / (count + BAYESIAN_PRIOR_STRENGTH);
  return parseFloat(shrunk.toFixed(2));
}

/**
 * Determine price fit chip for a vendor given estimated price and allocated category budget.
 *
 * @param {number} estimatedPrice
 * @param {number} categoryAllocation
 * @returns {'Fits'|'Stretch'|'Over'}
 */
export function determinePriceFit(estimatedPrice, categoryAllocation) {
  if (!estimatedPrice || !categoryAllocation) return 'Fits';
  if (estimatedPrice <= categoryAllocation) return 'Fits';
  if (estimatedPrice <= categoryAllocation * 1.20) return 'Stretch';
  return 'Over';
}

/**
 * Rank a list of raw vendor results for a specific celebration plan.
 *
 * @param {Array<Object>} vendors - Raw vendor list
 * @param {Object} options
 * @param {number} [options.userLat]
 * @param {number} [options.userLng]
 * @param {number} [options.categoryAllocation]
 * @returns {Array<Object>} Ranked and enriched vendor list
 */
export function rankVendors(vendors, options = {}) {
  const { userLat, userLng, categoryAllocation = 200000 } = options;

  const scored = vendors.map((v) => {
    // 1. Bayesian Rating
    const bayesRating = computeBayesianRating(v.rating, v.userRatingCount);

    // 2. Distance & Decay
    let distanceKm = v.distanceKm ?? null;
    if (distanceKm === null && userLat && userLng && v.lat && v.lng) {
      distanceKm = haversineDistanceKm(userLat, userLng, v.lat, v.lng);
    }
    // Distance decay: vendors within 5 km get full score, decay gradually past 15 km
    const distScore = distanceKm !== null ? Math.max(0, 1 - (distanceKm / 40)) : 0.8;

    // 3. Price-Fit
    const estPrice = v.estimatedPrice || (categoryAllocation * (v.priceLevel === 3 ? 1.25 : (v.priceLevel === 1 ? 0.75 : 1.0)));
    const priceFit = determinePriceFit(estPrice, categoryAllocation);
    const priceScore = priceFit === 'Fits' ? 1.0 : (priceFit === 'Stretch' ? 0.7 : 0.4);

    // 4. Contact completeness
    const hasPhone = Boolean(v.phone || v.nationalPhoneNumber);
    const hasMapOrWeb = Boolean(v.googleMapsUri || v.websiteUri || v.website);
    const completenessScore = (hasPhone ? 0.6 : 0) + (hasMapOrWeb ? 0.4 : 0);

    // Composite ranking score: 40% Bayesian rating, 25% Distance, 20% Price fit, 15% Completeness
    const normalizedBayes = (bayesRating - 1) / 4; // scale [1, 5] -> [0, 1]
    const finalScore = parseFloat((normalizedBayes * 0.40 + distScore * 0.25 + priceScore * 0.20 + completenessScore * 0.15).toFixed(3));

    // Construct human explanation for Meera
    let reason = `${bayesRating} adjusted rating`;
    if (distanceKm !== null) reason += ` · ${distanceKm} km away`;
    reason += ` · ${priceFit} budget`;

    return {
      ...v,
      distanceKm,
      bayesianRating: bayesRating,
      priceFit,
      estimatedPrice: Math.round(estPrice),
      rankingScore: finalScore,
      rankReason: reason,
      hasContact: hasPhone,
    };
  });

  // Sort descending by finalScore
  return scored.sort((a, b) => b.rankingScore - a.rankingScore);
}
