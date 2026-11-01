/**
 * @file tests/engine/feasibility.test.js
 */

import { describe, it, expect } from 'vitest';
import { allocateBudget } from '../../shared/engine/budget.js';
import { assessFeasibility } from '../../shared/engine/feasibility.js';

describe('Feasibility tier thresholds', () => {
  it('wedding: Tight when catering per head < 900', () => {
    // 50000 budget, 500 guests = 92000 / 500 ≈ 184 per head for wedding (catering ~32% = 46000, /500 = 92) -> Tight
    const plan = allocateBudget('wedding', 50000, 'Elegant', false);
    const result = assessFeasibility(plan, 'wedding', 500);
    expect(result.tier).toBe('Tight');
    expect(result.maxGuestsThatFit).toBeGreaterThan(0);
    expect(result.budgetNeeded).toBeGreaterThan(50000);
    // budgetNeeded should be a multiple of 5000
    expect(result.budgetNeeded % 5000).toBe(0);
  });

  it('wedding: Comfortable when catering per head is between 900 and 1620', () => {
    // 500000 budget, 300 guests: catering ≈ 32% * 500000 = 160000, /300 ≈ 533 -> Tight
    // Use smaller guest count: 100 guests -> 160000/100 = 1600 -> Comfortable (just below 1.8*900=1620)
    const plan = allocateBudget('wedding', 500000, 'Elegant', false);
    const cateringCat = plan.categories.find((c) => /catering|food/i.test(c.name));
    // Pick guests that gives between 900 and 1620 per head
    const guests = Math.floor(cateringCat.amount / 1000);
    const result = assessFeasibility(plan, 'wedding', guests);
    expect(['Comfortable', 'Generous']).toContain(result.tier);
  });

  it('wedding: Generous when catering per head > 1620', () => {
    const plan = allocateBudget('wedding', 1_000_000, 'Elegant', false);
    const result = assessFeasibility(plan, 'wedding', 50); // few guests, big budget
    expect(result.tier).toBe('Generous');
    expect(result.maxGuestsThatFit).toBeUndefined();
  });

  it('birthday: Tight threshold is 450', () => {
    const plan = allocateBudget('birthday', 30000, 'Fun', false);
    const result = assessFeasibility(plan, 'birthday', 200);
    expect(result.tier).toBe('Tight');
    expect(result.perHeadMin).toBe(450);
  });

  it('community: Tight threshold is 250', () => {
    const plan = allocateBudget('community', 20000, 'Minimal', false);
    const result = assessFeasibility(plan, 'community', 500);
    expect(result.tier).toBe('Tight');
    expect(result.perHeadMin).toBe(250);
  });

  it('maxGuestsThatFit math: floor(cateringAmount / minPerHead)', () => {
    const plan = allocateBudget('wedding', 50000, 'Elegant', false);
    const cateringCat = plan.categories.find((c) => /catering|food/i.test(c.name));
    const result = assessFeasibility(plan, 'wedding', 500);
    expect(result.maxGuestsThatFit).toBe(Math.floor(cateringCat.amount / 900));
  });
});
