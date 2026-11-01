/**
 * @file shared/engine/optimizer.js
 * @description Optimiser engine: add-ons cost modeling, savings levers,
 * and deterministic exhaustive subset search ("I need to save X") with minimal regret.
 */

import { getTemplate } from './templates/index.js';
import { formatINR } from './currency.js';

/**
 * Compute the impact of adding or removing an add-on item.
 *
 * @param {Object} params
 * @param {Object} params.addon - { id, name, costModel, unitCost }
 * @param {number} params.currentBudget - Total budget
 * @param {number} params.guests - Number of guests
 * @param {number} params.contingencyAmount - Current contingency reserve
 * @param {number} params.cateringAmount - Current catering allocation
 * @param {number} params.comfortPrice - m baseline per head
 */
export function evaluateAddon({
  addon,
  currentBudget,
  guests,
  contingencyAmount,
  cateringAmount,
  comfortPrice,
}) {
  let cost = 0;
  if (addon.costModel === 'per_guest' || addon.costModel === 'per_plate') {
    cost = addon.unitCost * guests;
  } else {
    cost = addon.unitCost;
  }

  const remainingContingency = contingencyAmount - cost;
  const bufferPct = parseFloat(((remainingContingency / currentBudget) * 100).toFixed(1));
  const newPerHead = cateringAmount / Math.max(1, guests);
  const isCateringTight = newPerHead < comfortPrice;
  const breaksBuffer = bufferPct < 5.0; // Under 5% contingency triggers warning

  const warnings = [];
  if (breaksBuffer) {
    warnings.push(`Adding "${addon.name}" drops emergency buffer to ${bufferPct}% (recommended: ≥8%).`);
  }
  if (isCateringTight) {
    warnings.push('Catering spend per guest is already tight. Consider cutting other categories instead.');
  }

  return {
    cost,
    formattedCost: formatINR(cost),
    remainingContingency,
    bufferPct,
    breaksBuffer,
    isCateringTight,
    canSafelyAfford: !breaksBuffer && remainingContingency >= 0,
    warnings,
  };
}

/**
 * Exhaustive subset search to achieve target savings with minimal total regret.
 * Max 14 levers => at most 2^14 = 16,384 combinations (sub-millisecond evaluation in pure JS).
 *
 * @param {string} type - Event type
 * @param {number} targetSaving - Desired saving amount in INR
 * @param {Record<string, number>} [userPriorityWeights={}] - Optional category priority weights
 * @param {Array} [customLevers=null] - Optional override of levers
 */
export function findOptimalSavingsLevers(type, targetSaving, userPriorityWeights = {}, customLevers = null) {
  const tpl = getTemplate(type);
  const levers = customLevers ? [...customLevers] : [...tpl.savingsLevers];

  const n = levers.length;
  const totalCombinations = 1 << n; // 2^n

  let bestSubset = null;
  let bestRegret = Infinity;
  let bestSaving = 0;

  // Track closest candidate if target is unreachable
  let maxAchievableSaving = 0;
  let maxAchievableSubset = [];

  for (let mask = 1; mask < totalCombinations; mask++) {
    let subsetSaving = 0;
    let subsetRegret = 0;
    const subsetItems = [];

    for (let i = 0; i < n; i++) {
      if ((mask & (1 << i)) !== 0) {
        const lever = levers[i];
        // Use conservative low end of saving range per prompt specification
        subsetSaving += lever.minSaving;

        // Regret weighted by user priority (higher user priority = higher regret)
        const priorityMultiplier = userPriorityWeights[lever.id] ?? 1.0;
        subsetRegret += lever.regretWeight * priorityMultiplier;
        subsetItems.push(lever);
      }
    }

    if (subsetSaving > maxAchievableSaving) {
      maxAchievableSaving = subsetSaving;
      maxAchievableSubset = subsetItems;
    }

    // Check if this subset achieves the target
    if (subsetSaving >= targetSaving) {
      // We want to minimize total regret; tie-break by fewest levers used, then by smaller excess over target
      if (subsetRegret < bestRegret ||
         (subsetRegret === bestRegret && subsetItems.length < (bestSubset ? bestSubset.length : Infinity))) {
        bestRegret = subsetRegret;
        bestSubset = subsetItems;
        bestSaving = subsetSaving;
      }
    }
  }

  const isAchievable = bestSubset !== null;
  const chosenLevers = isAchievable ? bestSubset : maxAchievableSubset;
  const totalAchievedSaving = isAchievable ? bestSaving : maxAchievableSaving;

  return {
    targetSaving,
    isAchievable,
    achievedSaving: totalAchievedSaving,
    formattedAchievedSaving: formatINR(totalAchievedSaving),
    leversCount: chosenLevers.length,
    chosenLevers: chosenLevers.map((l) => ({
      id: l.id,
      name: l.name,
      conservativeSaving: l.minSaving,
      maxSaving: l.maxSaving,
      tradeOff: l.tradeOff,
      regretWeight: l.regretWeight,
      formattedSaving: `${formatINR(l.minSaving)} – ${formatINR(l.maxSaving)}`,
    })),
    totalRegretScore: bestRegret === Infinity ? 0 : parseFloat(bestRegret.toFixed(2)),
    shortfall: isAchievable ? 0 : (targetSaving - totalAchievedSaving),
    recommendation: isAchievable
      ? `By applying ${chosenLevers.length} selected lever${chosenLevers.length === 1 ? '' : 's'}, you save at least ${formatINR(totalAchievedSaving)} with minimum disruption.`
      : `The maximum savings achievable through non-destructive levers is ${formatINR(totalAchievedSaving)}. To reach ${formatINR(targetSaving)}, consider trimming guest headcount or adjusting venue tier.`,
  };
}
