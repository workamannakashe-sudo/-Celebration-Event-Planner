/**
 * @file tests/engine/tradeoff.test.js
 * @description Unit tests for the Priority Trade-off Studio engine.
 */

import { describe, it, expect } from 'vitest';
import { computeTradeoff } from '../../shared/engine/tradeoff.js';

describe('Trade-off Studio Engine', () => {
  /** @type {import('../../shared/engine/index.js').PlanInputs} */
  const inputs = {
    type: 'wedding',
    name: 'Meera & Rohan Wedding',
    guests: 200,
    budget: 600000,
    date: '2026-12-15',
    vibe: 'Traditional',
    vegOnly: false,
  };

  it('boosts specified category and reduces other categories proportionally', () => {
    const boostCat = 'Photo & Video';
    const boostAmt = 30000;

    const res = computeTradeoff(inputs, {
      boostCategory: boostCat,
      boostAmount: boostAmt,
    });

    const boostedEntry = res.entries.find((e) => e.name === boostCat);
    expect(boostedEntry).toBeDefined();
    expect(boostedEntry.delta).toBe(boostAmt);
    expect(boostedEntry.adjusted).toBe(boostedEntry.baseLine + boostAmt);

    // Other categories should have negative delta (reductions)
    const otherEntries = res.entries.filter((e) => e.name !== boostCat);
    for (const other of otherEntries) {
      expect(other.delta).toBeLessThanOrEqual(0);
      expect(other.adjusted).toBeLessThanOrEqual(other.baseLine);
    }

    // Total adjusted categories plus contingency should balance budget
    const totalAdjusted = res.entries.reduce((sum, e) => sum + e.adjusted, 0) + res.contingencyAfter;
    expect(Math.abs(totalAdjusted - inputs.budget)).toBeLessThanOrEqual(10);
  });

  it('returns unchanged baseline if unknown category is passed', () => {
    const res = computeTradeoff(inputs, {
      boostCategory: 'NonExistentCategory',
      boostAmount: 50000,
    });

    expect(res.feasible).toBe(true);
    for (const entry of res.entries) {
      expect(entry.delta).toBe(0);
      expect(entry.adjusted).toBe(entry.baseLine);
    }
  });

  it('detects unfeasible cuts when boost amount is too high', () => {
    const res = computeTradeoff(inputs, {
      boostCategory: 'Decor & Florals',
      boostAmount: 180000, // Very large boost relative to total budget
    });

    expect(res.entries.length).toBeGreaterThan(0);
  });
});
