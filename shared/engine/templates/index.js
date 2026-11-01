/**
 * @file shared/engine/templates/index.js
 * @description Central registry of data-driven celebration templates.
 * Adding an event type requires only a config object of this schema.
 */

import { weddingTemplate } from './wedding.js';
import { birthdayTemplate } from './birthday.js';
import { communityTemplate } from './community.js';
import { anniversaryTemplate } from './anniversary.js';
import { babyShowerTemplate } from './baby_shower.js';
import { corporateTemplate } from './corporate.js';
import { customTemplate } from './custom.js';

export const TEMPLATES = {
  wedding: weddingTemplate,
  birthday: birthdayTemplate,
  community: communityTemplate,
  anniversary: anniversaryTemplate,
  baby_shower: babyShowerTemplate,
  corporate: corporateTemplate,
  custom: customTemplate,
};

/**
 * Retrieve a template by event type slug, falling back to custom.
 * @param {string} type
 * @returns {typeof weddingTemplate}
 */
export function getTemplate(type) {
  const norm = String(type || '').toLowerCase().replace(/[^a-z_]/g, '');
  return TEMPLATES[norm] || TEMPLATES.custom;
}

export {
  weddingTemplate,
  birthdayTemplate,
  communityTemplate,
  anniversaryTemplate,
  babyShowerTemplate,
  corporateTemplate,
  customTemplate,
};
