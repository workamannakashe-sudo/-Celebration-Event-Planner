/**
 * @file tests/engine/rsvp.test.js
 * @description Unit tests for the RSVP and headcount forecasting engine.
 */

import { describe, it, expect } from 'vitest';
import { forecastRsvp } from '../../shared/engine/rsvp.js';

describe('RSVP Forecasting Engine', () => {
  it('forecasts wedding attendance with ~78% rate and 10% catering buffer', () => {
    const res = forecastRsvp('wedding', 200);

    expect(res.invited).toBe(200);
    expect(res.expectedAttendance).toBe(156);
    expect(res.attendanceRate).toBe(0.78);
    expect(res.cateringBuffer).toBe(10);
    expect(res.low).toBeLessThan(res.expectedAttendance);
    expect(res.high).toBeGreaterThan(res.expectedAttendance);
    expect(res.insight).toContain('plates');
  });

  it('forecasts birthday attendance with ~72% rate', () => {
    const res = forecastRsvp('birthday', 100);

    expect(res.invited).toBe(100);
    expect(res.expectedAttendance).toBe(72);
    expect(res.attendanceRate).toBe(0.72);
    expect(res.cateringBuffer).toBe(8);
  });

  it('forecasts community attendance with ~65% rate and 12% catering buffer', () => {
    const res = forecastRsvp('community', 500);

    expect(res.invited).toBe(500);
    expect(res.expectedAttendance).toBe(325);
    expect(res.attendanceRate).toBe(0.65);
    expect(res.cateringBuffer).toBe(12);
  });

  it('provides tailored insight for small, mid, and large guest headcounts', () => {
    const small = forecastRsvp('wedding', 40);
    expect(small.insight).toContain('Small, intimate');

    const mid = forecastRsvp('wedding', 150);
    expect(mid.insight).toContain('Mid-size');

    const large = forecastRsvp('wedding', 600);
    expect(large.insight).toContain('Large');
  });
});
