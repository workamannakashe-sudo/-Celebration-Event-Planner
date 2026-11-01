/**
 * @file tests/engine/quotes.test.js
 * @description Unit tests for the Quote Comparer engine.
 */

import { describe, it, expect } from 'vitest';
import { compareQuotes } from '../../shared/engine/quotes.js';

describe('Quote Comparer Engine', () => {
  it('ranks quotes by price ascending and calculates spread', () => {
    const quotes = [
      { vendorName: 'Vendor A', quotedPrice: 120000, notes: 'Includes lighting' },
      { vendorName: 'Vendor B', quotedPrice: 95000, notes: 'Basic package' },
      { vendorName: 'Vendor C', quotedPrice: 150000, notes: 'Premium package' },
    ];

    const result = compareQuotes('Venue & Mandap', 100000, quotes);

    expect(result.bestPrice).toBe(95000);
    expect(result.worstPrice).toBe(150000);
    expect(result.spread).toBe(55000);
    expect(result.spreadPct).toBeCloseTo(57.9, 1);

    const vendorB = result.quotes.find((q) => q.vendorName === 'Vendor B');
    expect(vendorB.rank).toBe(1);
    expect(vendorB.premiumOverBest).toBe(0);
    expect(vendorB.overBudget).toBe(false);

    const vendorC = result.quotes.find((q) => q.vendorName === 'Vendor C');
    expect(vendorC.rank).toBe(3);
    expect(vendorC.overBudget).toBe(true);
    expect(vendorC.overBudgetBy).toBe(50000);
  });

  it('calculates category-specific negotiation floors', () => {
    const quotes = [{ vendorName: 'Star Decor', quotedPrice: 50000 }];
    const result = compareQuotes('Decor & Florals', 60000, quotes);

    // Decor headroom is ~10%
    const decorQuote = result.quotes[0];
    expect(decorQuote.negotiationFloor).toBe(45000);
  });

  it('handles empty quotes safely', () => {
    const result = compareQuotes('Catering', 200000, []);
    expect(result.quotes).toEqual([]);
    expect(result.bestPrice).toBe(0);
    expect(result.recommendation).toBe('No quotes provided.');
  });
});
