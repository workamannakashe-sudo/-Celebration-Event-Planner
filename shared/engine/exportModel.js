/**
 * @file shared/engine/exportModel.js
 * @description Canonical ExportModel for Excel (.xlsx), PDF, ICS and CSV exporters.
 * Pure data transformation engine with built-in formula injection sanitization.
 */

import { formatINR } from './currency.js';
import { generateScenarios } from './scenarios.js';

/**
 * Sanitize user text to neutralize spreadsheet formula injection (CSV/XLSX injection).
 * If a cell string starts with =, +, -, @, tab, or carriage return, prefix it with a single quote.
 *
 * @param {string|any} value
 * @returns {string|any}
 */
export function sanitizeSpreadsheetFormula(value) {
  if (typeof value !== 'string') return value;
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r'];
  const trimmed = value.trim();
  if (trimmed.length > 0 && dangerousChars.includes(trimmed[0])) {
    return `'${value}`;
  }
  return value;
}

/**
 * Build the canonical ExportModel from a calculated Utsav plan.
 *
 * @param {Object} plan - Complete plan output from computePlan
 * @returns {Object} Canonical ExportModel
 */
export function buildExportModel(plan) {
  const inputs = plan.inputs || {};
  const budget = plan.budget || { totalBudget: 0, contingency: 0, categories: [] };
  const timeline = plan.timeline || { milestones: [] };
  const vendors = plan.vendors || [];

  // 1. Executive Summary
  const summary = {
    eventName: sanitizeSpreadsheetFormula(inputs.name || 'Utsav Celebration Plan'),
    eventType: sanitizeSpreadsheetFormula(inputs.type || 'wedding'),
    date: inputs.date || 'TBD',
    daysToGo: plan.daysToGo ?? 0,
    city: sanitizeSpreadsheetFormula(inputs.city || 'India'),
    citySize: inputs.citySize || 'city',
    totalBudget: budget.totalBudget,
    formattedTotalBudget: formatINR(budget.totalBudget),
    guests: inputs.guests || 100,
    vibe: inputs.vibe || 'Traditional',
    vegOnly: Boolean(inputs.vegOnly),
    perGuestAllIn: plan.perGuest || Math.round(budget.totalBudget / Math.max(1, inputs.guests || 100)),
  };

  // 2. Budget Breakdown with Formula Definitions
  const budgetRows = budget.categories.map((cat, idx) => ({
    rowNum: idx + 2, // header is row 1
    category: sanitizeSpreadsheetFormula(cat.name),
    amount: cat.amount,
    pct: cat.pct,
    vendorType: cat.vendorType,
    formulaSum: `=B${idx + 2}/$B$${budget.categories.length + 3}`,
  }));

  const contingencyRow = {
    category: 'Contingency Reserve (Emergency Buffer)',
    amount: budget.contingency,
    pct: budget.contingencyPct,
    vendorType: 'contingency',
  };

  // 3. Timeline & Critical Milestones
  const timelineRows = timeline.milestones.map((m) => ({
    task: sanitizeSpreadsheetFormula(m.task),
    dueDate: m.dueDate,
    weeksBefore: m.weeksBefore,
    isPast: Boolean(m.isPast),
    isCritical: Boolean(m.isCritical || m.weeksBefore >= 20),
    owner: sanitizeSpreadsheetFormula(m.owner || 'Host / Family Coordinator'),
  }));

  // 4. Vendor Pipeline & Payments
  const vendorRows = (vendors.length > 0 ? vendors : budget.categories).map((v) => ({
    name: sanitizeSpreadsheetFormula(v.name || v.category || 'Vendor'),
    category: sanitizeSpreadsheetFormula(v.category || v.name),
    status: sanitizeSpreadsheetFormula(v.status || 'Shortlisted'),
    estimatedBudget: v.amount || 0,
    notes: sanitizeSpreadsheetFormula(v.notes || 'Inquiry sent; awaiting formal quote with breakdown'),
  }));

  // 5. Scenarios Comparison
  const scenariosData = generateScenarios({
    type: inputs.type || 'wedding',
    budget: budget.totalBudget || 1200000,
    guests: inputs.guests || 300,
    vibe: inputs.vibe || 'Traditional',
    vegOnly: inputs.vegOnly,
  });

  // 6. Transparent Assumptions
  const assumptions = [
    'All figures are in Indian Rupees (₹ INR).',
    '8% statutory contingency is reserved upfront to protect against last-minute market price spikes.',
    'Comfort catering baselines: Wedding ₹900/head, Birthday ₹450/head, Community ₹250/head at City baseline.',
    'Blended attendance rate: Wedding 85%, Birthday 80%, Community 65%, with a 7% catering safety buffer.',
    'Vendor prices are estimated for Indian tier-1/tier-2 markets; actual contracts require written quotes.',
    'All mathematical calculations are performed deterministically without non-deterministic AI generation.',
  ];

  return {
    meta: {
      generatedAt: new Date().toISOString(),
      generator: 'Utsav Planning Engine v1.0',
      schemaVersion: '1.0.0',
    },
    summary,
    budget: {
      total: budget.totalBudget,
      contingency: contingencyRow,
      items: budgetRows,
    },
    timeline: timelineRows,
    vendors: vendorRows,
    scenarios: scenariosData,
    assumptions,
  };
}
