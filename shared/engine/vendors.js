/**
 * @file vendors.js
 * @description Vendor checklist generator.
 * Produces one checklist entry per budget category with allocated amount and
 * an "ask before booking" question.
 */

import { VENDOR_QUESTIONS } from './config.js';

/** @typedef {import('./budget.js').BudgetPlan} BudgetPlan */

/**
 * @typedef {Object} VendorItem
 * @property {string} category - Category display name
 * @property {number} budget - Allocated amount in INR
 * @property {string} question - Key question to ask before booking
 */

/**
 * Find the best matching "ask before booking" question for a category name.
 * Falls back to a generic question if no pattern matches.
 * @param {string} categoryName
 * @returns {string}
 */
function findQuestion(categoryName) {
  for (const { pattern, question } of VENDOR_QUESTIONS) {
    if (pattern.test(categoryName)) return question;
  }
  return 'Ask for a written quote, timeline and cancellation policy before signing.';
}

/**
 * Build the vendor checklist from a budget plan.
 * @param {BudgetPlan} plan
 * @returns {VendorItem[]}
 */
export function buildVendorChecklist(plan) {
  return plan.categories.map((cat) => ({
    category: cat.name,
    budget: cat.amount,
    question: findQuestion(cat.name),
  }));
}
