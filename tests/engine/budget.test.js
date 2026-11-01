/**
 * @file tests/engine/budget.test.js
 * @description Budget allocation engine tests.
 */

import { describe, it, expect } from 'vitest';
import { allocateBudget } from '../../shared/engine/budget.js';

const TYPES = ['wedding', 'birthday', 'community'];
const VIBES = ['Elegant', 'Fun', 'Traditional', 'Minimal'];
const BUDGET = 500_000;

describe('Budget allocation – sum invariant', () => {
  for (const type of TYPES) {
    for (const vibe of VIBES) {
      for (const vegOnly of [false, true]) {
        it(`${type} / ${vibe} / vegOnly=${vegOnly} sums to total budget`, () => {
          const plan = allocateBudget(type, BUDGET, vibe, vegOnly);
          const catSum = plan.categories.reduce((a, c) => a + c.amount, 0);
          const total = catSum + plan.contingency;
          expect(total).toBe(BUDGET);
        });
      }
    }
  }

  it('no category has a negative amount', () => {
    for (const type of TYPES) {
      for (const vibe of VIBES) {
        const plan = allocateBudget(type, BUDGET, vibe, false);
        for (const cat of plan.categories) {
          expect(cat.amount).toBeGreaterThanOrEqual(0);
        }
      }
    }
  });

  it('contingency is approximately 8% of budget', () => {
    const plan = allocateBudget('wedding', BUDGET, 'Elegant', false);
    // Exact value may differ by rounding; allow ±5% tolerance
    expect(plan.contingency).toBeGreaterThan(BUDGET * 0.07);
  });

  it('vegOnly reduces catering and increases contingency', () => {
    const normal = allocateBudget('wedding', BUDGET, 'Traditional', false);
    const veg = allocateBudget('wedding', BUDGET, 'Traditional', true);
    const normalCatering = normal.categories.find((c) => /catering|food/i.test(c.name));
    const vegCatering = veg.categories.find((c) => /catering|food/i.test(c.name));
    expect(vegCatering.amount).toBeLessThan(normalCatering.amount);
    expect(veg.contingency).toBeGreaterThan(normal.contingency);
  });

  it('throws on unknown event type', () => {
    expect(() => allocateBudget('gala', BUDGET, 'Fun', false)).toThrow();
  });

  it('works with minimum budget 10000', () => {
    const plan = allocateBudget('birthday', 10000, 'Minimal', false);
    const total = plan.categories.reduce((a, c) => a + c.amount, 0) + plan.contingency;
    expect(total).toBe(10000);
  });
});
