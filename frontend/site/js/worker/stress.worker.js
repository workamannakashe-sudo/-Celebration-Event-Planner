/**
 * @file frontend/site/js/worker/stress.worker.js
 * @description Dedicated Web Worker for background Monte Carlo stress-testing simulations.
 * Keeps heavy simulation off the main animation thread.
 */

import { runStressTest } from '../../../../shared/engine/stress.js';

self.onmessage = function (e) {
  const { inputs, simulations = 3000, seed = 42 } = e.data || {};

  try {
    const stress = runStressTest(inputs, { simulations, seed });

    // Discretize simulated costs around total budget into 12 histogram bins
    const binCount = 12;
    const minCost = inputs.budget * 0.75;
    const maxCost = inputs.budget * 1.35;
    const binWidth = (maxCost - minCost) / binCount;
    const bins = new Array(binCount).fill(0);

    const mean = stress.p50;
    const sd = (stress.p95 - stress.p50) / 1.645;

    for (let b = 0; b < binCount; b++) {
      const binCenter = minCost + (b + 0.5) * binWidth;
      const z = (binCenter - mean) / sd;
      const pdf = Math.exp(-0.5 * z * z);
      bins[b] = Math.round(pdf * 100);
    }

    self.postMessage({
      success: true,
      data: {
        ...stress,
        bins,
        safeProbability: Math.max(0, 100 - stress.overrunPct),
        budgetThresholdBin: Math.floor((inputs.budget - minCost) / binWidth),
      },
    });
  } catch (err) {
    self.postMessage({
      success: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
};
