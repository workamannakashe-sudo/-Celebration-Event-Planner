/**
 * @file shared/engine/explain.js
 * @description Explain-Why generator and change audit trail for Utsav.
 * Generates transparent plain-language breakdowns for every figure
 * and logs timestamped user modifications.
 */

import { formatINR } from './currency.js';

/**
 * Generate a transparent explanation for a specific plan figure.
 *
 * @param {'budget_allocation'|'plate_price'|'invite_capacity'|'contingency'|'vendor_rank'} type
 * @param {Object} details
 * @returns {Object}
 */
export function explainCalculation(type, details) {
  switch (type) {
    case 'budget_allocation': {
      const { categoryName, amount, totalBudget, weight, vibe, multiplier } = details;
      return {
        field: categoryName,
        value: formatINR(amount),
        percentage: `${((amount / totalBudget) * 100).toFixed(1)}%`,
        formula: `(${categoryName} base weight ${weight} × ${vibe} vibe factor ${multiplier}) ÷ total weights × (total budget - 8% contingency)`,
        narrative: `For your ${formatINR(totalBudget)} budget, ${categoryName} receives ${formatINR(amount)}. Base weight was adjusted by a factor of ${multiplier} based on your "${vibe}" celebration preference. An 8% emergency contingency is reserved first.`,
      };
    }
    case 'plate_price': {
      const { tier, comfortPrice, serviceStyle, vegOnly, finalPrice } = details;
      return {
        field: `${tier.toUpperCase()} Plate Price`,
        value: formatINR(finalPrice),
        formula: `Comfort baseline ${formatINR(comfortPrice)} × ${tier} tier factor × service style (${serviceStyle}) ${vegOnly ? '× 0.92 veg saving' : ''}`,
        narrative: `The comfort baseline for this celebration in your city tier is ${formatINR(comfortPrice)}. The ${tier} tier pricing (${formatINR(finalPrice)}) factors in your chosen service style (${serviceStyle})${vegOnly ? ' and an 8% vegetarian menu reduction' : ''}.`,
      };
    }
    case 'invite_capacity': {
      const { platesAffordable, showUpRate, buffer, likelyInvites } = details;
      return {
        field: 'Likely Guest Invites',
        value: `${likelyInvites} guests`,
        formula: `floor(plates affordable ${platesAffordable} ÷ (${showUpRate} show-up rate × (1 + ${buffer} catering buffer)))`,
        narrative: `Based on an expected ${Math.round(showUpRate * 100)}% attendance rate and a ${Math.round(buffer * 100)}% catering safety buffer, inviting ${likelyInvites} guests reliably delivers ${platesAffordable} dining plates without waste.`,
      };
    }
    case 'contingency': {
      const { contingencyAmount, totalBudget, pct } = details;
      return {
        field: 'Contingency Buffer',
        value: formatINR(contingencyAmount),
        formula: `${pct}% of total budget ${formatINR(totalBudget)} reserved upfront`,
        narrative: `First-time organizers face unexpected price fluctuations on wedding week. Reserving ${formatINR(contingencyAmount)} upfront shields your core ceremonies from surprise expenses.`,
      };
    }
    default:
      return {
        field: details.field || 'Figure',
        value: String(details.value),
        formula: details.formula || 'Deterministic calculation',
        narrative: details.narrative || 'Calculated using verified benchmark formulas.',
      };
  }
}

/**
 * Audit trail manager for recording user plan mutations.
 */
export class AuditTrail {
  constructor(initialEntries = []) {
    this.entries = [...initialEntries];
  }

  /**
   * Log a plan modification.
   * @param {string} action - e.g. 'budget_change', 'date_shift', 'lever_applied'
   * @param {string} description - Human-readable summary
   * @param {Object} [diff=null] - { before, after }
   */
  log(action, description, diff = null) {
    const entry = {
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      action,
      description,
      diff,
    };
    this.entries.push(entry);
    // Keep last 50 entries
    if (this.entries.length > 50) {
      this.entries.shift();
    }
    return entry;
  }

  getEntries() {
    return [...this.entries];
  }

  clear() {
    this.entries = [];
  }
}
