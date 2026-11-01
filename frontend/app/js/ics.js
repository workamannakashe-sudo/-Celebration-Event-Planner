/**
 * @file frontend/js/ics.js
 * @description RFC 5545 compliant iCalendar (.ics) generator for Utsav timeline milestones.
 * Properly escapes all text fields and formats dates.
 */

/**
 * Escape text for iCalendar per RFC 5545 section 3.3.11:
 * Backslash, semicolon, comma, and newline must be escaped.
 * @param {string} text
 * @returns {string}
 */
export function escapeIcsText(text) {
  if (!text) return '';
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/**
 * Format a YYYY-MM-DD date string to iCalendar date format (YYYYMMDD).
 * @param {string} dateStr - 'YYYY-MM-DD'
 * @returns {string}
 */
export function formatIcsDate(dateStr) {
  return dateStr.replace(/-/g, '');
}

/**
 * Generate a complete RFC 5545 VCALENDAR string from an Utsav plan.
 * @param {import('../../../shared/engine/index.js').UtsavPlan} plan
 * @returns {string}
 */
export function generateIcs(plan) {
  const { inputs, timeline } = plan;
  const now = new Date();
  const dtstamp = `${now.toISOString().replace(/[-:]/g, '').split('.')[0]  }Z`;
  const eventName = inputs.name || 'Utsav Celebration';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Utsav//Event Planning Assistant//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeIcsText(eventName)} Planning Milestones`,
  ];

  for (let i = 0; i < timeline.milestones.length; i++) {
    const ms = timeline.milestones[i];
    const uid = `utsav-${inputs.type}-${i}-${formatIcsDate(ms.dueDate)}@utsav.app`;
    const dtstart = formatIcsDate(ms.dueDate);

    // Compute end date as next day for all-day event
    const dueDateObj = new Date(`${ms.dueDate}T00:00:00`);
    dueDateObj.setDate(dueDateObj.getDate() + 1);
    const dtend = dueDateObj.toISOString().split('T')[0].replace(/-/g, '');

    const summary = ms.weeksBefore === 0
      ? `🎉 EVENT DAY: ${eventName}`
      : `[${ms.weeksBefore}w out] ${ms.task} – ${eventName}`;

    const description = `Milestone for ${eventName} (${inputs.type}, ${inputs.guests} guests, ₹${inputs.budget.toLocaleString('en-IN')}).\nDue: ${ms.dueDate}`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${dtstamp}`);
    lines.push(`DTSTART;VALUE=DATE:${dtstart}`);
    lines.push(`DTEND;VALUE=DATE:${dtend}`);
    lines.push(`SUMMARY:${escapeIcsText(summary)}`);
    lines.push(`DESCRIPTION:${escapeIcsText(description)}`);
    lines.push('STATUS:CONFIRMED');
    lines.push('TRANSP:TRANSPARENT');
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')  }\r\n`;
}

/**
 * Trigger download of the calendar file in the browser.
 * @param {import('../../../shared/engine/index.js').UtsavPlan} plan
 */
export function downloadCalendar(plan) {
  if (typeof document === 'undefined') return;
  const icsData = generateIcs(plan);
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const safeName = (plan.inputs.name || 'utsav-plan').toLowerCase().replace(/[^a-z0-9]+/g, '-');
  a.download = `${safeName}-milestones.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
