/**
 * @file shared/engine/criticalPath.js
 * @description Critical Path Method (CPM) for event task graphs.
 * Computes forward pass (ES/EF), backward pass (LS/LF), float/slack,
 * critical path identification, schedule compression, and date-move impact analysis.
 */

import { getTemplate } from './templates/index.js';

const MS_PER_DAY = 24 * 60 * 60 * 1000;
const MS_PER_WEEK = 7 * MS_PER_DAY;

/**
 * Format a Date to YYYY-MM-DD.
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
 * Compute the critical path, slack times, and compressed dates for an event task graph.
 *
 * @param {string} type - Event type
 * @param {string} eventDate - ISO string YYYY-MM-DD
 * @param {Date} [today=new Date()]
 * @param {Array} [customTaskGraph]
 */
export function computeCriticalPath(type, eventDate, today = new Date(), customTaskGraph = null) {
  const tpl = getTemplate(type);
  const tasks = customTaskGraph ? [...customTaskGraph] : [...tpl.taskGraph];

  const targetDate = new Date(eventDate);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());

  if (targetDate <= todayMidnight) {
    throw new Error('Event date must be in the future');
  }

  const msAvailable = targetDate.getTime() - todayMidnight.getTime();
  const weeksAvailable = Math.max(1, msAvailable / MS_PER_WEEK);
  const idealWeeks = tpl.idealLeadWeeks;
  const isCompressed = weeksAvailable < idealWeeks;
  const compressionRatio = isCompressed ? (weeksAvailable / idealWeeks) : 1.0;

  // Topological sorting and Forward Pass
  // Task duration in days
  const taskMap = new Map();
  for (const t of tasks) {
    const rawWeeks = t.weeksBefore * compressionRatio;
    const durationDays = Math.max(1, Math.round((t.durationWeeks || 1) * 7 * compressionRatio));
    // Due date reverse-calculated from eventDate
    const dueDate = new Date(targetDate.getTime() - rawWeeks * MS_PER_WEEK);
    const startDate = new Date(dueDate.getTime() - durationDays * MS_PER_DAY);

    taskMap.set(t.id, {
      ...t,
      durationDays,
      dueDate: toISO(dueDate),
      startDate: toISO(startDate),
      dueTime: dueDate.getTime(),
      startTime: startDate.getTime(),
      isOverdue: dueDate < todayMidnight,
      dependsOn: t.dependsOn || [],
      earlyStart: 0,
      earlyFinish: 0,
      lateStart: 0,
      lateFinish: 0,
      slackDays: 0,
      isCritical: false,
    });
  }

  // Calculate Forward pass: early start / early finish (in days relative to project start)
  const sortedIds = [];
  const visited = new Set();
  const visiting = new Set();

  function visit(id) {
    if (visited.has(id)) return;
    if (visiting.has(id)) return; // prevent circular dependency
    visiting.add(id);
    const item = taskMap.get(id);
    if (item && item.dependsOn) {
      for (const depId of item.dependsOn) {
        if (taskMap.has(depId)) visit(depId);
      }
    }
    visiting.delete(id);
    visited.add(id);
    sortedIds.push(id);
  }

  for (const id of taskMap.keys()) {
    visit(id);
  }

  // Forward Pass
  for (const id of sortedIds) {
    const task = taskMap.get(id);
    let maxPredEF = 0;
    for (const depId of task.dependsOn) {
      const pred = taskMap.get(depId);
      if (pred && pred.earlyFinish > maxPredEF) {
        maxPredEF = pred.earlyFinish;
      }
    }
    task.earlyStart = maxPredEF;
    task.earlyFinish = task.earlyStart + task.durationDays;
  }

  // Project total early finish
  let projectDuration = 0;
  for (const task of taskMap.values()) {
    if (task.earlyFinish > projectDuration) projectDuration = task.earlyFinish;
  }

  // Backward Pass
  for (let i = sortedIds.length - 1; i >= 0; i--) {
    const id = sortedIds[i];
    const task = taskMap.get(id);

    // Find all successors of this task
    const successors = [];
    for (const other of taskMap.values()) {
      if (other.dependsOn.includes(id)) {
        successors.push(other);
      }
    }

    if (successors.length === 0) {
      task.lateFinish = projectDuration;
    } else {
      let minSuccLS = Infinity;
      for (const succ of successors) {
        if (succ.lateStart < minSuccLS) minSuccLS = succ.lateStart;
      }
      task.lateFinish = minSuccLS;
    }
    task.lateStart = task.lateFinish - task.durationDays;
    task.slackDays = Math.max(0, task.lateStart - task.earlyStart);
    task.isCritical = task.slackDays <= 1; // 0 or 1 day of slack = critical path
  }

  const calculatedTasks = Array.from(taskMap.values()).sort((a, b) => a.startTime - b.startTime);
  const criticalTasks = calculatedTasks.filter((t) => t.isCritical);

  return {
    isCompressed,
    weeksAvailable: parseFloat(weeksAvailable.toFixed(1)),
    idealWeeks,
    compressionRatio: parseFloat(compressionRatio.toFixed(2)),
    tasks: calculatedTasks,
    criticalTaskCount: criticalTasks.length,
    criticalPath: criticalTasks.map((t) => t.task),
  };
}

/**
 * "What breaks if I move the date?"
 * Compare current timeline against a candidate new date.
 *
 * @param {string} type
 * @param {string} currentDate - YYYY-MM-DD
 * @param {string} newDate - YYYY-MM-DD
 * @param {Date} [today=new Date()]
 */
export function analyzeDateShift(type, currentDate, newDate, today = new Date()) {
  const currentSchedule = computeCriticalPath(type, currentDate, today);
  const newSchedule = computeCriticalPath(type, newDate, today);

  const curTaskMap = new Map(currentSchedule.tasks.map((t) => [t.id, t]));
  const newlyOverdue = [];
  const newlyCritical = [];
  const relievedTasks = [];

  for (const next of newSchedule.tasks) {
    const prev = curTaskMap.get(next.id);
    if (!prev) continue;

    if (next.isOverdue && !prev.isOverdue) {
      newlyOverdue.push({ id: next.id, task: next.task, dueDate: next.dueDate, owner: next.owner, isCritical: Boolean(next.isCritical) });
    }
    if (next.isCritical && !prev.isCritical) {
      newlyCritical.push({ id: next.id, task: next.task, slackLostDays: prev.slackDays - next.slackDays });
    }
    if (!next.isCritical && prev.isCritical) {
      relievedTasks.push({ id: next.id, task: next.task, slackGainedDays: next.slackDays });
    }
  }

  // Recovery order: prioritize overdue critical items first
  const recoveryOrder = [...newlyOverdue].sort((a, _b) => (a.isCritical ? -1 : 1));

  return {
    currentDate,
    newDate,
    weeksDelta: parseFloat((newSchedule.weeksAvailable - currentSchedule.weeksAvailable).toFixed(1)),
    newlyOverdue,
    newlyCritical,
    relievedTasks,
    recoveryOrder,
    summary: newlyOverdue.length > 0
      ? `Moving date to ${newDate} compresses timeline: ${newlyOverdue.length} milestones become overdue!`
      : `Moving date to ${newDate} provides ${Math.abs(newSchedule.weeksAvailable - currentSchedule.weeksAvailable).toFixed(1)} additional weeks. All critical tasks remain on track.`,
  };
}
