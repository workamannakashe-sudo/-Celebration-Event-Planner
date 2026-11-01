/**
 * @file shared/engine/runsheet.js
 * @description Day-Of Run Sheet and Minute-by-Minute Event Coordinator Engine.
 */

import { getTemplate } from './templates/index.js';

/**
 * Generate a complete Day-Of Run Sheet for family coordinators and vendors.
 *
 * @param {string} type - Event type
 * @param {string} eventDate - YYYY-MM-DD
 * @param {Array} [customBlocks=null]
 */
export function generateRunSheet(type, eventDate, customBlocks = null) {
  const tpl = getTemplate(type);
  const blocks = customBlocks && customBlocks.length > 0
    ? [...customBlocks]
    : [...tpl.runSheetBlocks];

  // Assign sequential sequence numbers and status
  const normalizedBlocks = blocks.map((b, idx) => ({
    seq: idx + 1,
    time: b.time,
    title: b.title,
    owner: b.owner || 'Lead Coordinator',
    notes: b.notes || 'Ensure mobile phone is charged and on loud ring',
    status: b.status || 'Pending',
  }));

  const emergencyContacts = [
    { role: 'Primary Family Coordinator', name: 'Host / Organizer', phone: '+91 98200 12345' },
    { role: 'Venue Operations Manager', name: 'Venue Manager', phone: '+91 98300 54321' },
    { role: 'Head Caterer', name: 'Catering Lead', phone: '+91 98111 67890' },
    { role: 'Decorator & Electrician', name: 'Decor Lead', phone: '+91 98444 11223' },
    { role: 'Backup Generator Electrician', name: 'Duty Electrician', phone: '+91 98999 44332' },
  ];

  return {
    type,
    eventDate,
    blockCount: normalizedBlocks.length,
    schedule: normalizedBlocks,
    emergencyContacts,
  };
}
