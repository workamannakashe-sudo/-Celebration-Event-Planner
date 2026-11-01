/**
 * @file frontend/site/js/scrollDirector.js
 * @description Non-hijacking smooth scroll progress director.
 * Reads window.scrollY, eases it via damping without preventDefault,
 * computes overall progress [0, 1], local section progress [0, 1],
 * and scroll velocity for dynamic camera kick and text skew.
 */

export class ScrollDirector {
  constructor(options = {}) {
    this.damping = options.damping ?? 0.08;
    this.targetProgress = 0;
    this.currentProgress = 0;
    this.velocity = 0;
    this.lastTime = performance.now();
    this.listeners = new Set();
    this.sections = [];
    this.activeSectionIndex = 0;
    this.isPaused = false;
    this.rafId = null;

    this.onWindowScroll = this.onWindowScroll.bind(this);
    this.tick = this.tick.bind(this);
  }

  /**
   * Initialize scroll observers and listeners.
   */
  init() {
    this.updateSections();
    window.addEventListener('scroll', this.onWindowScroll, { passive: true });
    window.addEventListener('resize', () => this.updateSections(), { passive: true });
    this.onWindowScroll();
    this.rafId = requestAnimationFrame(this.tick);
  }

  /**
   * Cache section offsets for accurate progress mapping.
   */
  updateSections() {
    const els = document.querySelectorAll('.landing-section, .site-footer');
    this.sections = Array.from(els).map((el, idx) => {
      const rect = el.getBoundingClientRect();
      const top = rect.top + window.scrollY;
      const height = rect.height;
      return {
        id: el.id,
        index: idx,
        num: el.dataset.section || String(idx).padStart(3, '0'),
        top,
        bottom: top + height,
        height,
        element: el,
      };
    });
  }

  onWindowScroll() {
    const scrollMax = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    this.targetProgress = Math.max(0, Math.min(1, window.scrollY / scrollMax));
  }

  tick(now) {
    const dt = Math.max(1, now - this.lastTime);
    this.lastTime = now;

    if (!this.isPaused) {
      const prev = this.currentProgress;
      // Damped spring interpolation
      this.currentProgress += (this.targetProgress - this.currentProgress) * this.damping;

      // Avoid micro-jitter
      if (Math.abs(this.targetProgress - this.currentProgress) < 0.00005) {
        this.currentProgress = this.targetProgress;
      }

      this.velocity = ((this.currentProgress - prev) / (dt / 1000));
    } else {
      this.velocity = 0;
    }

    // Determine current active section & local progress
    const scrollY = window.scrollY;
    const viewCenter = scrollY + window.innerHeight * 0.45;
    let activeSec = this.sections[0] || null;
    let localT = 0;

    for (let i = 0; i < this.sections.length; i++) {
      const s = this.sections[i];
      if (viewCenter >= s.top && viewCenter <= s.bottom) {
        activeSec = s;
        localT = Math.max(0, Math.min(1, (viewCenter - s.top) / s.height));
        this.activeSectionIndex = i;
        break;
      }
    }

    const state = {
      progress: this.currentProgress,
      targetProgress: this.targetProgress,
      velocity: this.velocity,
      activeSection: activeSec,
      activeSectionIndex: this.activeSectionIndex,
      localT,
    };

    for (const cb of this.listeners) {
      cb(state);
    }

    this.rafId = requestAnimationFrame(this.tick);
  }

  /**
   * Get the current scroll director state snapshot.
   */
  getState() {
    return {
      progress: Math.max(0, Math.min(1, this.currentProgress)),
      rawProgress: this.currentProgress,
      targetProgress: this.targetProgress,
      velocity: this.velocity,
      activeSection: this.sections[this.activeSectionIndex] || null,
      activeSectionIndex: this.activeSectionIndex,
      isPaused: this.isPaused,
    };
  }

  /**
   * Manually notify subscribers with the current state (useful for testing).
   */
  notifyListeners() {
    const state = this.getState();
    for (const cb of this.listeners) {
      cb(state);
    }
  }

  /**
   * Subscribe to scroll frame events.
   * @param {Function} cb
   * @returns {() => void} unsubscribe
   */
  subscribe(cb) {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  /**
   * Set pause state (WCAG 2.2.2).
   * @param {boolean} paused
   */
  setPaused(paused) {
    this.isPaused = paused;
    if (paused) {
      this.currentProgress = this.targetProgress;
      this.velocity = 0;
    }
  }

  /**
   * Smoothly scroll to a section by target element ID.
   * @param {string} id
   */
  scrollToId(id) {
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }

  /**
   * Clean up listeners.
   */
  dispose() {
    if (this.rafId) cancelAnimationFrame(this.rafId);
    window.removeEventListener('scroll', this.onWindowScroll);
    this.listeners.clear();
  }
}
