/**
 * @file tests/engine/timeline.test.js
 */

import { describe, it, expect } from 'vitest';
import { buildTimeline } from '../../shared/engine/timeline.js';

function futureDate(weeksAhead) {
  const d = new Date();
  d.setDate(d.getDate() + weeksAhead * 7 + 1);
  return d.toISOString().split('T')[0];
}

describe('Timeline builder', () => {
  it('throws for past date', () => {
    expect(() => buildTimeline('wedding', '2020-01-01')).toThrow('Event date must be in the future');
  });

  it('throws for today', () => {
    const today = new Date();
    const iso = today.toISOString().split('T')[0];
    expect(() => buildTimeline('wedding', iso)).toThrow();
  });

  it('milestones are ordered (earliest due date first)', () => {
    const date = futureDate(30);
    const plan = buildTimeline('wedding', date);
    const dueDates = plan.milestones.map((m) => m.dueDate);
    for (let i = 1; i < dueDates.length; i++) {
      expect(dueDates[i] >= dueDates[i - 1]).toBe(true);
    }
  });

  it('compressed=false when enough lead time', () => {
    const plan = buildTimeline('wedding', futureDate(30));
    expect(plan.compressed).toBe(false);
    expect(plan.warning).toBeUndefined();
  });

  it('compressed=true when date is close and includes warning', () => {
    const plan = buildTimeline('wedding', futureDate(10));
    expect(plan.compressed).toBe(true);
    expect(plan.warning).toBeTruthy();
    expect(plan.warning).toMatch(/venue|caterer/i);
  });

  it('community: ideal lead is 10 weeks', () => {
    const plan = buildTimeline('community', futureDate(12));
    expect(plan.idealLeadWeeks).toBe(10);
    expect(plan.compressed).toBe(false);
  });

  it('birthday: ideal lead is 6 weeks', () => {
    const plan = buildTimeline('birthday', futureDate(8));
    expect(plan.idealLeadWeeks).toBe(6);
  });

  it('last milestone is event day with weeksBefore=0', () => {
    const plan = buildTimeline('birthday', futureDate(8));
    const last = plan.milestones[plan.milestones.length - 1];
    expect(last.weeksBefore).toBe(0);
  });
});
