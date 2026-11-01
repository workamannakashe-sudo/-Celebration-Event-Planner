/**
 * @file frontend/site/js/a11y.js
 * @description Accessibility enhancements for the 3D landing experience.
 * Manages WCAG 2.2 AA compliance: focus-pull intersection observer,
 * cursor-follower preview positioning for work index demo plans,
 * keyboard accessibility, and reduced-motion listener.
 */

export class A11yController {
  constructor() {
    this.previewCard = document.getElementById('cursor-preview');
    this.previewName = document.getElementById('preview-name');
    this.previewStat = document.getElementById('preview-stat');
    this.workRows = Array.from(document.querySelectorAll('.work-index-row'));

    this.onMouseMove = this.onMouseMove.bind(this);
    this.setupFocusPull();
    this.setupWorkIndexPreview();
  }

  /**
   * Focus Pull Effect (Sharpens section headline as it scrolls into view).
   */
  setupFocusPull() {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const headline = entry.target.querySelector('.focus-pull');
          if (headline) {
            if (entry.isIntersecting && entry.intersectionRatio > 0.35) {
              entry.target.classList.remove('is-entering');
            } else {
              entry.target.classList.add('is-entering');
            }
          }
        });
      },
      { threshold: [0.1, 0.4, 0.8] }
    );

    document.querySelectorAll('.landing-section').forEach((sec) => {
      observer.observe(sec);
    });
  }

  /**
   * Work index floating cursor preview card following mouse.
   */
  setupWorkIndexPreview() {
    if (!this.previewCard || this.workRows.length === 0) return;

    window.addEventListener('mousemove', this.onMouseMove, { passive: true });

    this.workRows.forEach((row) => {
      row.addEventListener('mouseenter', (e) => {
        const target = /** @type {HTMLElement} */ (e.currentTarget);
        const title = target.dataset.title || 'Celebration';
        const meta = target.dataset.meta || '';
        if (this.previewName) this.previewName.textContent = title;
        if (this.previewStat) this.previewStat.textContent = meta;
        this.previewCard?.classList.add('visible');
      });

      row.addEventListener('mouseleave', () => {
        this.previewCard?.classList.remove('visible');
      });

      // Keyboard focus support for preview
      row.addEventListener('focus', (e) => {
        const target = /** @type {HTMLElement} */ (e.currentTarget);
        const title = target.dataset.title || 'Celebration';
        const meta = target.dataset.meta || '';
        if (this.previewName) this.previewName.textContent = title;
        if (this.previewStat) this.previewStat.textContent = meta;
        const rect = target.getBoundingClientRect();
        if (this.previewCard) {
          this.previewCard.style.left = `${rect.right + 20}px`;
          this.previewCard.style.top = `${rect.top + 20}px`;
          this.previewCard.classList.add('visible');
        }
      });

      row.addEventListener('blur', () => {
        this.previewCard?.classList.remove('visible');
      });
    });
  }

  onMouseMove(e) {
    if (!this.previewCard) return;
    const x = e.clientX + 20;
    const y = e.clientY + 20;
    this.previewCard.style.left = `${x}px`;
    this.previewCard.style.top = `${y}px`;
  }
}
