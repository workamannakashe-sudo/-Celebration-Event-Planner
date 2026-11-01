/**
 * @file tests/a11y/frontend.test.js
 * @description Frontend unit and accessibility smoke tests using jsdom.
 * Covers: escape helper, ICS generator, i18n fallback & parameters, and WCAG a11y checks.
 * @vitest-environment jsdom
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { escapeIcsText, generateIcs } from '../../frontend/js/ics.js';
import { t, setLanguage, getLanguage } from '../../frontend/js/i18n.js';
import { setText, formatINR } from '../../frontend/js/render.js';
import { computePlan } from '../../shared/engine/index.js';

describe('Frontend helper functions', () => {
  it('escapeIcsText escapes semicolons, commas, backslashes and newlines', () => {
    const raw = 'Text with \\, and ; and \n newlines';
    const escaped = escapeIcsText(raw);
    expect(escaped).toBe('Text with \\\\\\, and \\; and \\n newlines');
  });

  it('escapeIcsText handles empty and null inputs safely', () => {
    expect(escapeIcsText('')).toBe('');
    expect(escapeIcsText(null)).toBe('');
    expect(escapeIcsText(undefined)).toBe('');
  });

  it('formatINR formats numbers into Indian currency style', () => {
    expect(formatINR(500000)).toBe('₹5,00,000');
    expect(formatINR(10000)).toBe('₹10,000');
    expect(formatINR(0)).toBe('₹0');
  });

  it('setText safely sets textContent without executing markup', () => {
    const el = document.createElement('div');
    setText(el, '<script>alert("xss")</script>');
    expect(el.innerHTML).toBe('&lt;script&gt;alert("xss")&lt;/script&gt;');
    expect(el.textContent).toBe('<script>alert("xss")</script>');
  });
});

describe('i18n internationalisation', () => {
  beforeEach(() => {
    setLanguage('en');
  });

  it('translates known keys in English', () => {
    expect(t('appTitle')).toBe('Utsav');
    expect(t('wedding')).toBe('Wedding');
  });

  it('switches language to Hindi and translates strings', () => {
    setLanguage('hi');
    expect(getLanguage()).toBe('hi');
    expect(document.documentElement.lang).toBe('hi');
    expect(t('appTitle')).toContain('उत्सव');
    expect(t('wedding')).toContain('विवाह');
  });

  it('switches language to Marathi and translates strings', () => {
    setLanguage('mr');
    expect(getLanguage()).toBe('mr');
    expect(document.documentElement.lang).toBe('mr');
    expect(t('appTitle')).toContain('उत्सव');
    expect(t('wedding')).toContain('विवाह सोहळा');
  });

  it('performs parameter substitution correctly', () => {
    const res = t('tightAdvice', { guests: 250, maxGuests: 180, needed: '70,000' });
    expect(res).toContain('250');
    expect(res).toContain('180');
    expect(res).toContain('70,000');
  });

  it('falls back gracefully to key or English when key is missing', () => {
    setLanguage('mr');
    expect(t('non_existent_key_xyz')).toBe('non_existent_key_xyz');
  });
});

describe('RFC 5545 iCalendar (.ics) generation', () => {
  it('generates a valid VCALENDAR with VEVENT entries for milestones', () => {
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 20 * 7);
    const dateStr = futureDate.toISOString().split('T')[0];

    const plan = computePlan({
      type: 'wedding',
      name: 'Meera & Rohan Wedding',
      guests: 200,
      budget: 600000,
      date: dateStr,
      vibe: 'Traditional',
      vegOnly: false,
    });

    const ics = generateIcs(plan);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('VERSION:2.0');
    expect(ics).toContain('PRODID:-//Utsav//Event Planning Assistant//EN');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('END:VEVENT');
    expect(ics).toContain('END:VCALENDAR');
    expect(ics).toContain('Meera & Rohan Wedding');
  });
});

describe('Accessibility (WCAG 2.2 AA) smoke checks on index.html', () => {
  let htmlDoc;

  beforeEach(() => {
    const htmlPath = resolve(process.cwd(), 'frontend/index.html');
    const htmlContent = readFileSync(htmlPath, 'utf-8');
    document.documentElement.innerHTML = htmlContent;
    htmlDoc = document;
  });

  it('contains exactly one <h1> landmark', () => {
    const h1s = htmlDoc.querySelectorAll('h1');
    expect(h1s.length).toBe(1);
    expect(h1s[0].textContent).toContain('Utsav');
  });

  it('includes an accessible skip link at the top of the body', () => {
    const skipLink = htmlDoc.querySelector('.skip-link');
    expect(skipLink).not.toBeNull();
    expect(skipLink.getAttribute('href')).toBe('#main-content');
  });

  it('main has matching id and landmark role', () => {
    const main = htmlDoc.querySelector('main#main-content');
    expect(main).not.toBeNull();
  });

  it('has semantic header and aside landmarks', () => {
    expect(htmlDoc.querySelector('header.site-header')).not.toBeNull();
    expect(htmlDoc.querySelector('aside.sidebar-panel')).not.toBeNull();
    expect(htmlDoc.querySelector('aside#chat-drawer')).not.toBeNull();
  });

  it('radio groups are wrapped in fieldsets with legends', () => {
    const fieldsets = htmlDoc.querySelectorAll('fieldset');
    expect(fieldsets.length).toBeGreaterThanOrEqual(2);
    fieldsets.forEach((fs) => {
      const legend = fs.querySelector('legend');
      expect(legend).not.toBeNull();
      expect(legend.textContent.trim().length).toBeGreaterThan(0);
    });
  });

  it('all input elements have associated label elements', () => {
    const inputs = htmlDoc.querySelectorAll('input:not([type="hidden"])');
    inputs.forEach((input) => {
      const id = input.getAttribute('id');
      if (id) {
        const label = htmlDoc.querySelector(`label[for="${id}"]`);
        const ariaLabel = input.getAttribute('aria-label');
        expect(Boolean(label || ariaLabel)).toBe(true);
      }
    });
  });

  it('contains an aria-live region for real-time announcements', () => {
    const liveRegion = htmlDoc.querySelector('#aria-live-region');
    expect(liveRegion).not.toBeNull();
    expect(liveRegion.getAttribute('aria-live')).toBe('polite');
  });

  it('buttons have accessible names or aria-labels', () => {
    const buttons = htmlDoc.querySelectorAll('button');
    buttons.forEach((btn) => {
      const text = btn.textContent.trim();
      const ariaLabel = btn.getAttribute('aria-label');
      expect(Boolean(text.length > 0 || ariaLabel)).toBe(true);
    });
  });
});
