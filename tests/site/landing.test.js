/**
 * @file tests/site/landing.test.js
 * @description Unit and integration tests for Utsav 3D landing experience:
 * - ScrollDirector progress & spring damping
 * - OKLab palette interpolation & stop coverage
 * - Quality tier detector & performance budgets
 * - Engine bridge deterministic computations
 * - Landing DOM accessibility landmarks, skip link, and canvas aria-hidden
 */

import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { ScrollDirector } from '../../frontend/site/js/scrollDirector.js';
import { getPaletteAt, PALETTE_STOPS } from '../../frontend/site/js/palette.js';
import { QualityManager } from '../../frontend/site/js/quality.js';
import {
  DEMO_PLAN_INPUTS,
  getDonutSegments,
  getStressDistribution,
  getTimelineNodes,
  getRsvpForecastData,
  getSampleVendorQuotes,
  getFullDemoPlan,
} from '../../frontend/site/js/engineBridge.js';

describe('ScrollDirector', () => {
  let director;

  beforeEach(() => {
    director = new ScrollDirector();
  });

  it('initializes with default zero scroll state', () => {
    const state = director.getState();
    expect(state.progress).toBe(0);
    expect(state.rawProgress).toBe(0);
    expect(state.velocity).toBe(0);
    expect(director.isPaused).toBe(false);
  });

  it('subscribes listeners and receives updates', () => {
    let receivedState = null;
    const unsub = director.subscribe((s) => {
      receivedState = s;
    });

    director.notifyListeners();
    expect(receivedState).toBeDefined();
    expect(receivedState.progress).toBe(0);

    unsub();
  });

  it('handles pause and unpause toggling', () => {
    expect(director.isPaused).toBe(false);
    director.setPaused(true);
    expect(director.isPaused).toBe(true);
    director.setPaused(false);
    expect(director.isPaused).toBe(false);
  });

  it('clamps progress to [0, 1] range', () => {
    director.currentProgress = 1.25;
    const stateOver = director.getState();
    expect(stateOver.progress).toBe(1);

    director.currentProgress = -0.5;
    const stateUnder = director.getState();
    expect(stateUnder.progress).toBe(0);
  });
});

describe('OKLab Palette Interpolation', () => {
  it('covers all 13 distinct stops', () => {
    expect(PALETTE_STOPS.length).toBe(13);
    for (const stop of PALETTE_STOPS) {
      expect(stop.bg).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(stop.fg).toMatch(/^#[0-9a-fA-F]{6}$/);
      expect(stop.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
    }
  });

  it('returns exact boundary colors at t=0 and t=1', () => {
    const start = getPaletteAt(0);
    expect(start.bg).toBe(PALETTE_STOPS[0].bg);

    const end = getPaletteAt(1);
    expect(end.bg).toBe(PALETTE_STOPS[PALETTE_STOPS.length - 1].bg);
  });

  it('smoothly interpolates intermediate positions without NaN', () => {
    for (let t = 0.05; t < 0.95; t += 0.1) {
      const p = getPaletteAt(t);
      expect(p.bg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.fg).toMatch(/^#[0-9a-f]{6}$/i);
      expect(p.accent).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('QualityManager', () => {
  it('detects tier configurations with safe limits', () => {
    const qm = new QualityManager();
    const config = qm.getConfig();

    expect(['high', 'mid', 'low']).toContain(config.tier);
    expect(config.dpr).toBeGreaterThanOrEqual(1);
    expect(config.dpr).toBeLessThanOrEqual(2);
    expect(typeof config.shadows).toBe('boolean');
    expect(config.particleCount).toBeGreaterThan(0);
  });

  it('allows manual tier override for low-power modes', () => {
    const qm = new QualityManager();
    qm.setTier('low');
    const config = qm.getConfig();
    expect(config.tier).toBe('low');
    expect(config.dpr).toBe(1);
    expect(config.shadows).toBe(false);
  });
});

describe('EngineBridge (Deterministic Data Link)', () => {
  it('computes 3D donut segments totaling full 2*PI circle', () => {
    const segments = getDonutSegments(DEMO_PLAN_INPUTS);
    expect(segments.length).toBeGreaterThan(4);

    const totalAngle = segments[segments.length - 1].endAngle;
    expect(totalAngle).toBeCloseTo(Math.PI * 2, 4);

    const hasContingency = segments.some((s) => s.name === 'Contingency Buffer');
    expect(hasContingency).toBe(true);
  });

  it('computes Monte Carlo distribution with 12 histogram bins and threshold', () => {
    const stress = getStressDistribution(DEMO_PLAN_INPUTS, 500);
    expect(stress.bins.length).toBe(12);
    expect(stress.budgetThresholdBin).toBeGreaterThanOrEqual(0);
    expect(stress.budgetThresholdBin).toBeLessThan(12);
    expect(stress.safeProbability).toBeGreaterThan(0);
    expect(stress.safeProbability).toBeLessThanOrEqual(100);
  });

  it('computes timeline milestone nodes for wedding schedule', () => {
    const nodes = getTimelineNodes('2027-05-15');
    expect(nodes.length).toBeGreaterThan(5);
    expect(nodes[0]).toHaveProperty('task');
    expect(nodes[0]).toHaveProperty('dueDate');
    expect(nodes[0]).toHaveProperty('weeksBefore');
  });

  it('computes RSVP forecast headcount', () => {
    const rsvp = getRsvpForecastData(300);
    expect(rsvp.expectedAttendance).toBeGreaterThan(150);
    expect(rsvp.expectedAttendance).toBeLessThanOrEqual(300);
    expect(rsvp.low).toBeLessThanOrEqual(rsvp.high);
  });

  it('computes sorted vendor quote comparison', () => {
    const quotes = getSampleVendorQuotes();
    expect(quotes.quotes.length).toBe(3);
    expect(quotes.bestPrice).toBeLessThanOrEqual(quotes.worstPrice);
    expect(quotes.quotes.some((q) => q.rank === 1)).toBe(true);
  });

  it('computes full demo plan with verified numbers', () => {
    const plan = getFullDemoPlan(DEMO_PLAN_INPUTS);
    expect(plan.budget.totalBudget).toBe(DEMO_PLAN_INPUTS.budget);
    expect(plan.feasibility).toBeDefined();
    expect(plan.timeline.milestones.length).toBeGreaterThan(0);
  });
});

describe('Landing Page HTML & Accessibility', () => {
  const htmlPath = path.resolve(process.cwd(), 'frontend/site/index.html');
  const html = fs.readFileSync(htmlPath, 'utf8');

  it('includes skip to main content link', () => {
    expect(html).toContain('href="#main-content"');
    expect(html).toContain('Skip to content');
  });

  it('marks WebGL canvas as aria-hidden decorative element', () => {
    expect(html).toContain('id="webgl-canvas"');
    expect(html).toContain('aria-hidden="true"');
  });

  it('provides WCAG 2.2.2 pause motion toggle button', () => {
    expect(html).toContain('id="btn-pause-motion"');
    expect(html).toContain('aria-pressed="false"');
  });

  it('includes HUD telemetry indicators with accessible labels', () => {
    expect(html).toContain('id="hud-val-budget"');
    expect(html).toContain('id="hud-val-guests"');
    expect(html).toContain('id="hud-val-days"');
    expect(html).toContain('id="hud-val-safe"');
  });

  it('includes interactive budget and guest sliders with ARIA attributes', () => {
    expect(html).toContain('id="slider-budget"');
    expect(html).toContain('aria-label="Adjust budget in Indian rupees"');
    expect(html).toContain('id="slider-guests"');
  });

  it('contains links directing user into the /app planner', () => {
    expect(html).toContain('href="/app"');
  });

  it('provides static 2.5D fallback charts for CSS/no-JS resilience', () => {
    expect(html).toContain('fallback-chart');
    expect(html).toContain('fallback-donut');
    expect(html).toContain('fallback-histogram');
    expect(html).toContain('fallback-ribbon');
  });

  it('includes all 13 numbered sections matching the storyboard', () => {
    for (let i = 0; i <= 12; i++) {
      const padded = String(i).padStart(3, '0');
      expect(html).toContain(`${padded} /`);
    }
  });
});
