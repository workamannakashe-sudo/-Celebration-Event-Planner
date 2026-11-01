/**
 * @file frontend/site/js/main.js
 * @description Main entry point for the Utsav 3D scroll-driven landing experience.
 * Coordinates ScrollDirector, SceneManager, Viewfinder HUD, OKLab Palette,
 * Web Worker for Monte Carlo calculations, and WCAG accessibility.
 */

import { ScrollDirector } from './scrollDirector.js';
import { HudController } from './hud.js';
import { QualityManager } from './quality.js';
import { A11yController } from './a11y.js';
import { SceneManager } from './sceneManager.js';
import { getPaletteAt, applyPaletteToDOM } from './palette.js';
import { DEMO_PLAN_INPUTS } from './engineBridge.js';

async function initLanding() {
  // 1. Initialize Core Controllers
  const hud = new HudController();
  const quality = new QualityManager();
  const _a11y = new A11yController();
  const scroll = new ScrollDirector();

  // 2. Connect Pause Toggle (WCAG 2.2.2)
  hud.onPauseChange = (isPaused) => {
    scroll.setPaused(isPaused);
    if (sceneMgr) sceneMgr.setPaused(isPaused);
  };

  // 3. Connect OKLab Palette & HUD to Scroll Updates
  scroll.subscribe((state) => {
    // Dynamic palette color interpolation
    const palette = getPaletteAt(state.progress);
    applyPaletteToDOM(palette);

    // Update active section label in HUD & body data attribute
    const secNum = state.activeSection?.num || '000';
    const secId = state.activeSection?.id || 'sec-intro';
    hud.updateSection(secNum, secId);

    // Pass scroll state to 3D scene manager
    if (sceneMgr) {
      sceneMgr.updateScrollState(state);
    }
  });

  // Start scroll observation
  scroll.init();

  // 4. Setup Interactive Sliders & Live Engine Sync
  const sliderBudget = /** @type {HTMLInputElement|null} */ (document.getElementById('slider-budget'));
  const sliderGuests = /** @type {HTMLInputElement|null} */ (document.getElementById('slider-guests'));
  const sliderWeeks  = /** @type {HTMLInputElement|null} */ (document.getElementById('slider-lead-weeks'));

  const dispBudget = document.getElementById('display-slider-budget');
  const dispGuests = document.getElementById('display-slider-guests');
  const dispWeeks  = document.getElementById('display-slider-weeks');

  const liveInputs = { ...DEMO_PLAN_INPUTS };

  // Setup Web Worker for background Monte Carlo calculations
  let stressWorker = null;
  try {
    stressWorker = new Worker(new URL('worker/stress.worker.js', import.meta.url), { type: 'module' });
    stressWorker.onmessage = (e) => {
      if (e.data?.success && e.data.data?.safeProbability !== undefined) {
        hud.setTelemetry({ safe: Math.round(e.data.data.safeProbability) });
      }
    };
  } catch {
    console.info('Web worker unavailable in current context, main thread fallback active.');
  }

  function triggerMonteCarlo() {
    if (stressWorker) {
      stressWorker.postMessage({ inputs: liveInputs, simulations: 2000 });
    }
  }

  if (sliderBudget) {
    sliderBudget.addEventListener('input', () => {
      const budget = parseInt(sliderBudget.value, 10);
      liveInputs.budget = budget;
      if (dispBudget) dispBudget.textContent = `₹${budget.toLocaleString('en-IN')}`;
      hud.setTelemetry({ budget });
      if (sceneMgr?.sceneBudget) sceneMgr.sceneBudget.updateInputs(liveInputs);
      triggerMonteCarlo();
    });
  }

  if (sliderGuests) {
    sliderGuests.addEventListener('input', () => {
      const guests = parseInt(sliderGuests.value, 10);
      liveInputs.guests = guests;
      if (dispGuests) dispGuests.textContent = `${guests} Guests`;
      hud.setTelemetry({ guests });
      if (sceneMgr?.sceneBudget) sceneMgr.sceneBudget.updateInputs(liveInputs);
      triggerMonteCarlo();
    });
  }

  if (sliderWeeks) {
    sliderWeeks.addEventListener('input', () => {
      const weeks = parseInt(sliderWeeks.value, 10);
      if (dispWeeks) dispWeeks.textContent = `${weeks} Weeks`;
      hud.setTelemetry({ days: weeks * 7 });
      if (sceneMgr?.sceneTimeline) sceneMgr.sceneTimeline.updateLeadWeeks(weeks);
    });
  }

  // 5. Initial Telemetry Run
  triggerMonteCarlo();

  // 6. Lazy Load 3D WebGL Scene Manager (After First Paint)
  const canvas = /** @type {HTMLCanvasElement|null} */ (document.getElementById('webgl-canvas'));
  let sceneMgr = null;

  if (canvas && quality.tier !== 'low') {
    sceneMgr = new SceneManager(canvas, quality);
    const success = await sceneMgr.init();
    if (success) {
      document.body.classList.remove('fallback-active');
      document.body.classList.add('webgl-active');
    }
  }
}

// Boot on DOMContentLoaded or immediately if already ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLanding);
} else {
  initLanding();
}
