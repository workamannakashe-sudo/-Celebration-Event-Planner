/**
 * @file tests/engine/dates.test.js
 * @description Unit tests for the Date-intelligence engine.
 */

import { describe, it, expect } from 'vitest';
import { analyseDates } from '../../shared/engine/dates.js';

describe('Date-Intelligence Engine', () => {
  it('identifies auspicious dates like Akshaya Tritiya with high score', () => {
    const res = analyseDates('2026-04-19');

    expect(res.inputAnalysis.auspScore).toBeGreaterThanOrEqual(9);
    expect(res.inputAnalysis.isBlackout).toBe(false);
    expect(res.inputAnalysis.occasion).toContain('Akshaya Tritiya');
    expect(res.summary).toContain('Excellent choice');
  });

  it('detects Pitru Paksha blackout periods', () => {
    // 2025 Pitru Paksha is around Sept 2025 (2025-09-08 to 2025-09-22)
    const res = analyseDates('2025-09-15');

    expect(res.inputAnalysis.isBlackout).toBe(true);
    expect(res.inputAnalysis.auspScore).toBeLessThanOrEqual(2);
    expect(res.summary).toContain('Pitru Paksha');
  });

  it('suggests top auspicious alternatives nearby', () => {
    const res = analyseDates('2026-04-10', 30);

    expect(Array.isArray(res.suggestions)).toBe(true);
    expect(res.suggestions.length).toBeGreaterThan(0);
    for (const sug of res.suggestions) {
      expect(sug.auspScore).toBeGreaterThanOrEqual(7);
      expect(sug.isBlackout).toBe(false);
    }
  });
});
