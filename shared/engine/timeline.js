/**
 * @file timeline.js
 * @description Reverse-scheduled event timeline generator.
 * Compresses milestones when the date is close; rejects past dates.
 */

import { MILESTONES, IDEAL_LEAD_WEEKS } from './config.js';

/** @typedef {import('./config.js').EventType} EventType */

/**
 * @typedef {Object} TimelineMilestone
 * @property {number} weeksBefore - Weeks before event (after compression)
 * @property {string} task - Human-readable task description
 * @property {string} dueDate - ISO date string (YYYY-MM-DD)
 * @property {boolean} isPast - Whether this milestone date has already passed
 */

/**
 * @typedef {Object} TimelinePlan
 * @property {TimelineMilestone[]} milestones - Ordered from earliest to event day
 * @property {boolean} compressed - True when available lead time < ideal lead
 * @property {string} [warning] - Advisory message when compressed
 * @property {number} weeksAvailable - Weeks from today to event date
 * @property {number} idealLeadWeeks
 */

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Parse an ISO date string to a Date object at midnight local time.
 * @param {string} isoDate
 * @returns {Date}
 */
function parseDate(isoDate) {
  // Ensure we treat it as local date, not UTC
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a Date as YYYY-MM-DD.
 * @param {Date} d
 * @returns {string}
 */
function toISO(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/**
 * Build the event timeline, reverse-scheduled from eventDate.
 * @param {EventType} type
 * @param {string} eventDate - ISO date (YYYY-MM-DD)
 * @param {Date} [today] - Inject for testing
 * @returns {TimelinePlan}
 */
export function buildTimeline(type, eventDate, today = new Date()) {
  const event = parseDate(eventDate);

  // Normalise today to midnight
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (event <= todayMidnight) {
    throw new Error('Event date must be in the future');
  }

  const msUntilEvent = event.getTime() - todayMidnight.getTime();
  const weeksAvailable = msUntilEvent / MS_PER_WEEK;
  const idealLeadWeeks = IDEAL_LEAD_WEEKS[type];

  const compressed = weeksAvailable < idealLeadWeeks;
  const compressionFactor = compressed ? weeksAvailable / idealLeadWeeks : 1;

  const rawMilestones = MILESTONES[type];

  const milestones = rawMilestones.map((m) => {
    const compressedWeeks = m.weeksBefore * compressionFactor;
    const dueDate = new Date(event.getTime() - compressedWeeks * MS_PER_WEEK);
    const isoDate = toISO(dueDate);
    return {
      weeksBefore: parseFloat(compressedWeeks.toFixed(1)),
      task: m.task,
      dueDate: isoDate,
      isPast: dueDate < todayMidnight,
    };
  });

  /** @type {TimelinePlan} */
  const plan = {
    milestones,
    compressed,
    weeksAvailable: parseFloat(weeksAvailable.toFixed(1)),
    idealLeadWeeks,
  };

  if (compressed) {
    plan.warning = `Only ${Math.floor(weeksAvailable)} weeks available (ideal: ${idealLeadWeeks}). Book venue and caterer first — everything else follows.`;
  }

  return plan;
}
