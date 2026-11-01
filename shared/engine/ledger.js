/**
 * @file shared/engine/ledger.js
 * @description Cash flow ledger and payment schedule tracking:
 * planned budget vs committed vendor contracts vs paid advances.
 */

import { formatINR } from './currency.js';

/**
 * Standard advance payment percentage schedule across Indian event categories:
 * - Booking Advance (20% – 30%)
 * - Mid-Milestone / Week Before (50% – 60%)
 * - Event Day Post-Setup (Remaining 10% – 20%)
 */
export const PAYMENT_SCHEDULE_NORMS = {
  booking: 0.25,
  midTerm: 0.55,
  completion: 0.20,
};

/**
 * Compute the cash-flow ledger state from budget plan and actual recorded transactions.
 *
 * @param {Object} budgetPlan - Output of allocateBudget
 * @param {Array<Object>} [recordedEntries=[]] - [{ category, vendor, amount, status: 'committed'|'paid', dueDate }]
 */
export function computeLedgerSummary(budgetPlan, recordedEntries = []) {
  const totalBudget = budgetPlan.totalBudget;

  let totalCommitted = 0;
  let totalPaid = 0;

  const categoryMap = new Map();
  for (const cat of budgetPlan.categories) {
    categoryMap.set(cat.name, {
      name: cat.name,
      allocated: cat.amount,
      committed: 0,
      paid: 0,
      remaining: cat.amount,
      status: 'On Track',
    });
  }

  for (const entry of recordedEntries) {
    const cat = categoryMap.get(entry.category);
    const amt = Number(entry.amount) || 0;

    if (entry.status === 'paid') {
      totalPaid += amt;
      totalCommitted += amt;
      if (cat) {
        cat.paid += amt;
        cat.committed += amt;
      }
    } else if (entry.status === 'committed') {
      totalCommitted += amt;
      if (cat) {
        cat.committed += amt;
      }
    }
  }

  // Update remaining and overspend status
  for (const cat of categoryMap.values()) {
    cat.remaining = cat.allocated - cat.committed;
    if (cat.committed > cat.allocated) {
      cat.status = 'Over Budget';
    } else if (cat.committed === 0) {
      cat.status = 'Unallocated';
    } else {
      cat.status = 'Active';
    }
  }

  const uncommittedCash = Math.max(0, totalBudget - totalCommitted);
  const totalPayableRemaining = Math.max(0, totalCommitted - totalPaid);

  return {
    totalBudget,
    totalCommitted,
    totalPaid,
    uncommittedCash,
    totalPayableRemaining,
    formattedTotalBudget: formatINR(totalBudget),
    formattedTotalCommitted: formatINR(totalCommitted),
    formattedTotalPaid: formatINR(totalPaid),
    formattedUncommittedCash: formatINR(uncommittedCash),
    categoryLedgers: Array.from(categoryMap.values()),
    health: totalCommitted > totalBudget ? 'Over Budget' : (uncommittedCash < budgetPlan.contingency ? 'Warning' : 'Healthy'),
  };
}
