/**
 * @file tests/engine/stress.test.js
 * @description Unit tests for the Monte Carlo stress testing engine.
 */

import { describe, it, expect } from 'vitest';
import { runStressTest } from '../../shared/engine/stress.js';

describe('Monte Carlo Stress Test Engine', () => {
  /** @type {import('../../shared/engine/index.js').PlanInputs} */
  const sampleInputs = {
    type: 'wedding',
    name: 'Meera & Rohan Wedding',
    guests: 200,
    budget: 600000,
    date: '2026-12-15',
    vibe: 'Traditional',
    vegOnly: false,
  };

  it('runs deterministic simulations using fixed seed', () => {
    const res1 = runStressTest(sampleInputs, { simulations: 500, seed: 42 });
    const res2 = runStressTest(sampleInputs, { simulations: 500, seed: 42 });

    expect(res1.simulations).toBe(500);
    expect(res1.overrunPct).toBe(res2.overrunPct);
    expect(res1.p50).toBe(res2.p50);
    expect(res1.p95).toBe(res2.p95);
    expect(res1.verdict).toBe(res2.verdict);
  });

  it('returns valid percentiles in ascending order p50 <= p75 <= p95', () => {
    const res = runStressTest(sampleInputs, { simulations: 500, seed: 123 });

    expect(res.p50).toBeGreaterThan(0);
    expect(res.p75).toBeGreaterThanOrEqual(res.p50);
    expect(res.p95).toBeGreaterThanOrEqual(res.p75);
  });

  it('calculates mean overrun >= 0', () => {
    const res = runStressTest(sampleInputs, { simulations: 200, seed: 99 });
    expect(res.meanOverrun).toBeGreaterThanOrEqual(0);
  });

  it('identifies top risk categories with highest cost variance', () => {
    const res = runStressTest(sampleInputs, { simulations: 200, seed: 7 });
    expect(Array.isArray(res.topRiskCategories)).toBe(true);
    expect(res.topRiskCategories.length).toBeGreaterThan(0);
    // Major categories for wedding like Venue or Catering
    expect(res.topRiskCategories.some((c) => ['Venue', 'Catering', 'Photo & Video', 'Decor & Flowers'].includes(c))).toBe(true);
  });

  it('handles tight budget with higher overrun risk verdict', () => {
    const tightInputs = {
      ...sampleInputs,
      guests: 400,
      budget: 150000, // Very tight for 400 guests wedding
    };
    const res = runStressTest(tightInputs, { simulations: 300, seed: 55 });
    expect(['Moderate Risk', 'High Risk']).toContain(res.verdict);
  });
});
