/**
 * @file frontend/site/js/hud.js
 * @description Viewfinder HUD frame and planning cockpit controller.
 * Manages live technical counters, active section labels, navigation dots,
 * and the accessible pause-motion toggle (WCAG 2.2.2).
 */

const SECTION_LABELS = {
  '000': '000 / INTRO',
  '001': '001 / ABOUT',
  '002': '002 / BUDGET',
  '003': '003 / STRESS',
  '004': '004 / TIMELINE',
  '005': '005 / VENDORS',
  '006': '006 / GUESTS',
  '007': '007 / CASH FLOW',
  '008': '008 / DAY-OF',
  '009': '009 / EXPORTS',
  '010': '010 / WORK INDEX',
  '011': '011 / CELEBRATIONS',
  '012': '012 / FINALE',
};

export class HudController {
  constructor() {
    this.labelEl = document.getElementById('hud-section-label');
    this.btnPause = document.getElementById('btn-pause-motion');
    this.btnPauseText = document.getElementById('btn-pause-text');
    this.dots = Array.from(document.querySelectorAll('.hud-nav-dot'));

    // Telemetry value nodes
    this.valBudget = document.getElementById('hud-val-budget');
    this.valGuests = document.getElementById('hud-val-guests');
    this.valDays = document.getElementById('hud-val-days');
    this.valSafe = document.getElementById('hud-val-safe');

    this.currentValues = {
      budget: 1200000,
      guests: 300,
      days: 184,
      safe: 72,
    };

    this.targetValues = { ...this.currentValues };
    this.isPaused = false;
    this.onPauseChange = null;

    this.setupListeners();
  }

  setupListeners() {
    if (this.btnPause) {
      this.btnPause.addEventListener('click', () => {
        this.togglePause();
      });
    }

    // Dot navigation
    this.dots.forEach((dot) => {
      dot.addEventListener('click', () => {
        const targetId = dot.dataset.target;
        if (targetId) {
          const el = document.getElementById(targetId);
          if (el) el.scrollIntoView({ behavior: 'smooth' });
        }
      });
    });
  }

  togglePause(forcedState) {
    this.isPaused = forcedState !== undefined ? forcedState : !this.isPaused;
    if (this.btnPause) {
      this.btnPause.setAttribute('aria-pressed', String(this.isPaused));
    }
    if (this.btnPauseText) {
      this.btnPauseText.textContent = this.isPaused ? 'Resume Motion' : 'Pause Motion';
    }
    if (this.onPauseChange) {
      this.onPauseChange(this.isPaused);
    }
  }

  /**
   * Update active section label and navigation dots.
   * @param {string} sectionNum - e.g. '001', '002'
   * @param {string} sectionId - e.g. 'sec-budget'
   */
  updateSection(sectionNum, sectionId) {
    if (this.labelEl) {
      const text = SECTION_LABELS[sectionNum] || `${sectionNum} / UTSAV`;
      if (this.labelEl.textContent !== text) {
        this.labelEl.textContent = text;
      }
    }

    // Update body attribute for fallback gradient styling
    document.body.setAttribute('data-active-section', sectionNum);

    // Update nav dots
    this.dots.forEach((dot) => {
      const isActive = dot.dataset.target === sectionId;
      dot.classList.toggle('active', isActive);
      dot.setAttribute('aria-current', isActive ? 'true' : 'false');
    });
  }

  /**
   * Set target telemetry numbers to animate towards.
   * @param {Partial<{budget: number, guests: number, days: number, safe: number}>} targets
   */
  setTelemetry(targets) {
    Object.assign(this.targetValues, targets);
  }

  /**
   * Smoothly tick numbers towards targets (called per frame).
   */
  tick(dtMs = 16) {
    const factor = Math.min(1, dtMs * 0.008);

    for (const key of ['budget', 'guests', 'days', 'safe']) {
      this.currentValues[key] += (this.targetValues[key] - this.currentValues[key]) * factor;
    }

    if (this.valBudget) {
      this.valBudget.textContent = `₹${Math.round(this.currentValues.budget).toLocaleString('en-IN')}`;
    }
    if (this.valGuests) {
      this.valGuests.textContent = `${Math.round(this.currentValues.guests)} Guests`;
    }
    if (this.valDays) {
      this.valDays.textContent = `${Math.max(0, Math.round(this.currentValues.days))}`;
    }
    if (this.valSafe) {
      this.valSafe.textContent = `${Math.round(this.currentValues.safe)}%`;
    }
  }
}
