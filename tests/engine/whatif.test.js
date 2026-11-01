/**
 * @file tests/engine/whatif.test.js
 */

import { describe, it, expect } from 'vitest';
import { applyScenario } from '../../shared/engine/whatif.js';

function futureDate(weeksAhead) {
  const d = new Date();
  d.setDate(d.getDate() + weeksAhead * 7 + 1);
  return d.toISOString().split('T')[0];
}

const BASE_INPUTS = {
  type: 'wedding',
  name: 'Meera',
  guests: 200,
  budget: 500_000,
  date: futureDate(30),
  vibe: 'Traditional',
  vegOnly: false,
};

describe('What-if scenario engine', () => {
  it('budgetPct=-20 reduces total budget by 20%', () => {
    const result = applyScenario(BASE_INPUTS, { budgetPct: -20 });
    expect(result.after.budget.totalBudget).toBe(400_000);
    expect(result.diff.some((d) => d.field === 'budget')).toBe(true);
  });

  it('budgetSet sets exact budget', () => {
    const result = applyScenario(BASE_INPUTS, { budgetSet: 750_000 });
    expect(result.after.budget.totalBudget).toBe(750_000);
  });

  it('guestsDelta adds guests', () => {
    const result = applyScenario(BASE_INPUTS, { guestsDelta: 50 });
    expect(result.after.inputs.guests).toBe(250);
  });

  it('guestsSet sets exact guests', () => {
    const result = applyScenario(BASE_INPUTS, { guestsSet: 100 });
    expect(result.after.inputs.guests).toBe(100);
  });

  it('vibeSet changes vibe', () => {
    const result = applyScenario(BASE_INPUTS, { vibeSet: 'Minimal' });
    expect(result.after.inputs.vibe).toBe('Minimal');
    expect(result.diff.some((d) => d.field === 'vibe')).toBe(true);
  });

  it('vegOnly=true changes vegOnly', () => {
    const result = applyScenario(BASE_INPUTS, { vegOnly: true });
    expect(result.after.inputs.vegOnly).toBe(true);
    expect(result.diff.some((d) => d.field === 'vegOnly')).toBe(true);
  });

  it('diff has category-level changes when budget changes', () => {
    const result = applyScenario(BASE_INPUTS, { budgetPct: 50 });
    const catDiff = result.diff.filter((d) => d.field.startsWith('category.'));
    expect(catDiff.length).toBeGreaterThan(0);
  });

  it('before and after are independent (no mutation)', () => {
    const result = applyScenario(BASE_INPUTS, { budgetPct: -20 });
    expect(result.before.budget.totalBudget).toBe(500_000);
    expect(result.after.budget.totalBudget).toBe(400_000);
  });

  it('clamps budget below minimum to 10000', () => {
    const result = applyScenario(BASE_INPUTS, { budgetSet: -500 });
    expect(result.after.budget.totalBudget).toBe(10000);
  });

  it('clamps guests below minimum to 1', () => {
    const result = applyScenario(BASE_INPUTS, { guestsDelta: -10000 });
    expect(result.after.inputs.guests).toBe(1);
  });
});
