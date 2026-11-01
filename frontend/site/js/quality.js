/**
 * @file frontend/site/js/quality.js
 * @description Runtime quality tier determination and live frame-time monitoring.
 * Evaluates WebGL capability, hardware concurrency, device memory, pointer precision,
 * prefers-reduced-motion, and degrades smoothly if frames exceed 20 ms.
 */

/**
 * Check if WebGL 2 or WebGL 1 is available and operational.
 * @returns {boolean}
 */
export function hasWebGlSupport() {
  if (typeof document === 'undefined') return true;
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    return Boolean(gl && gl instanceof WebGLRenderingContext || (typeof window !== 'undefined' && window.WebGL2RenderingContext && gl instanceof WebGL2RenderingContext));
  } catch {
    return false;
  }
}

/**
 * Determine initial quality tier: 'high' | 'mid' | 'low'.
 * @returns {'high'|'mid'|'low'}
 */
export function detectQualityTier() {
  if (typeof window === 'undefined') {
    return 'high';
  }

  // If user requests reduced motion or data, enforce low tier (static fallback)
  const reducedMotion = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  // @ts-ignore
  const conn = typeof navigator !== 'undefined' ? /** @type {any} */ (navigator).connection : null;
  const reducedData = Boolean(conn && conn.saveData);
  if (reducedMotion || reducedData) {
    return 'low';
  }

  // If WebGL is unavailable, fallback immediately
  if (!hasWebGlSupport()) {
    return 'low';
  }

  // Inspect device hardware signals
  const cores = (typeof navigator !== 'undefined' && navigator.hardwareConcurrency) || 4;
  // @ts-ignore
  const memory = (typeof navigator !== 'undefined' && navigator.deviceMemory) || 4;
  const isTouch = typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;

  // Mid or low mobile device checks
  if (cores < 4 || memory < 4 || isTouch) {
    return 'mid';
  }

  return 'high';
}

/**
 * Quality Manager to monitor live frame times and adapt dynamically.
 */
export class QualityManager {
  constructor(initialTier) {
    this.tier = initialTier || detectQualityTier();
    const rawDpr = typeof window !== 'undefined' ? (window.devicePixelRatio || 1) : 1;
    this.dpr = Math.min(rawDpr, this.tier === 'high' ? 2 : 1.5);
    this.slowFrameStreak = 0;
    this.maxInstances = this.tier === 'high' ? 20000 : (this.tier === 'mid' ? 6000 : 0);
    this.listeners = new Set();
  }

  /**
   * Record frame delta time and adapt tier if struggling.
   * @param {number} dtMs - frame duration in milliseconds
   */
  recordFrame(dtMs) {
    // If consecutive frames exceed 20 ms (~< 50 fps)
    if (dtMs > 20) {
      this.slowFrameStreak++;
      if (this.slowFrameStreak > 90) { // 90 slow frames (~1.8 seconds)
        this.degrade();
        this.slowFrameStreak = 0;
      }
    } else {
      this.slowFrameStreak = Math.max(0, this.slowFrameStreak - 1);
    }
  }

  degrade() {
    if (this.tier === 'high') {
      this.tier = 'mid';
      this.dpr = 1.0;
      this.maxInstances = 6000;
      this.notify();
    } else if (this.tier === 'mid') {
      this.tier = 'low';
      this.maxInstances = 0;
      this.notify();
    }
  }

  getConfig() {
    return {
      tier: this.tier,
      dpr: this.dpr,
      shadows: this.tier === 'high',
      particleCount: this.tier === 'high' ? 2000 : (this.tier === 'mid' ? 800 : 200),
      maxInstances: this.maxInstances,
    };
  }

  setTier(tier) {
    this.tier = tier;
    if (tier === 'low') {
      this.dpr = 1.0;
      this.maxInstances = 0;
    } else if (tier === 'mid') {
      this.dpr = 1.0;
      this.maxInstances = 6000;
    } else {
      this.dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 2;
      this.maxInstances = 20000;
    }
    this.notify();
  }

  onChange(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  notify() {
    for (const cb of this.listeners) {
      cb(this.getConfig());
    }
  }
}
