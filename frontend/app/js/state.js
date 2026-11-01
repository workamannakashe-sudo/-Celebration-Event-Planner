/**
 * @file frontend/js/state.js
 * @description Central reactive state manager for Utsav.
 * Handles inputs, plan state, task completion persistence in localStorage,
 * and debounced state subscription.
 */

const STORAGE_KEY_INPUTS = 'utsav_inputs_v1';
const STORAGE_KEY_TASKS = 'utsav_tasks_v1';

/**
 * Generate a default event date ~16 weeks in the future.
 * @returns {string} 'YYYY-MM-DD'
 */
export function getDefaultFutureDate() {
  const d = new Date();
  d.setDate(d.getDate() + 16 * 7);
  return d.toISOString().split('T')[0];
}

/**
 * Default initial inputs tailored for Meera.
 * @type {import('../../../shared/engine/index.js').PlanInputs}
 */
export const DEFAULT_INPUTS = {
  type: 'wedding',
  name: 'Meera & Rohan Wedding',
  guests: 250,
  budget: 650000,
  date: getDefaultFutureDate(),
  vibe: 'Traditional',
  vegOnly: false,
};

class StateStore {
  constructor() {
    /** @type {import('../../../shared/engine/index.js').PlanInputs} */
    this.inputs = this.loadInputs();

    /** @type {import('../../../shared/engine/index.js').UtsavPlan|null} */
    this.plan = null;

    /** @type {any|null} */
    this.ideas = null;

    /** @type {Set<string>} */
    this.completedTasks = this.loadTasks();

    /** @type {Array<{ sender: 'user'|'utsav', text: string, source?: string, diff?: any }>} */
    this.chatMessages = [
      {
        sender: 'utsav',
        text: 'Namaste Meera! I am your Utsav planning companion. You can ask for budget adjustments ("cut budget 10%"), add guests, or ask for vendor advice.',
        source: 'ai',
      },
    ];

    /** @type {Set<Function>} */
    this.listeners = new Set();
  }

  /**
   * Load saved inputs with fallback to defaults.
   * @returns {import('../../../shared/engine/index.js').PlanInputs}
   */
  loadInputs() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_INPUTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        // Ensure future date
        if (new Date(`${parsed.date}T00:00:00`) > new Date()) {
          return { ...DEFAULT_INPUTS, ...parsed };
        }
      }
    } catch {
      // Storage unavailable
    }
    return { ...DEFAULT_INPUTS, date: getDefaultFutureDate() };
  }

  /**
   * Save current inputs to localStorage.
   */
  saveInputs() {
    try {
      localStorage.setItem(STORAGE_KEY_INPUTS, JSON.stringify(this.inputs));
    } catch {
      // Storage unavailable
    }
  }

  /**
   * Load completed checklist tasks from localStorage.
   * @returns {Set<string>}
   */
  loadTasks() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY_TASKS);
      if (raw) {
        const list = JSON.parse(raw);
        if (Array.isArray(list)) return new Set(list);
      }
    } catch {
      // Storage unavailable
    }
    return new Set();
  }

  /**
   * Save completed checklist tasks to localStorage.
   */
  saveTasks() {
    try {
      localStorage.setItem(STORAGE_KEY_TASKS, JSON.stringify(Array.from(this.completedTasks)));
    } catch {
      // Storage unavailable
    }
  }

  /**
   * Toggle task completion status.
   * @param {string} taskId
   * @returns {boolean} New state
   */
  toggleTask(taskId) {
    let next;
    if (this.completedTasks.has(taskId)) {
      this.completedTasks.delete(taskId);
      next = false;
    } else {
      this.completedTasks.add(taskId);
      next = true;
    }
    this.saveTasks();
    this.notify('tasks');
    return next;
  }

  /**
   * Update plan inputs.
   * @param {Partial<import('../../../shared/engine/index.js').PlanInputs>} partial
   */
  setInputs(partial) {
    this.inputs = { ...this.inputs, ...partial };
    this.saveInputs();
    this.notify('inputs');
  }

  /**
   * Update current plan.
   * @param {import('../../../shared/engine/index.js').UtsavPlan} plan
   */
  setPlan(plan) {
    this.plan = plan;
    this.notify('plan');
  }

  /**
   * Update creative ideas.
   * @param {any} ideas
   */
  setIdeas(ideas) {
    this.ideas = ideas;
    this.notify('ideas');
  }

  /**
   * Add a chat message to history.
   * @param {{ sender: 'user'|'utsav', text: string, source?: string, diff?: any }} msg
   */
  addChatMessage(msg) {
    this.chatMessages.push(msg);
    this.notify('chat');
  }

  /**
   * Subscribe to state change notifications.
   * @param {Function} listener
   * @returns {Function} Unsubscribe function
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of a state change.
   * @param {string} aspect
   */
  notify(aspect) {
    for (const listener of this.listeners) {
      try {
        listener(aspect, this);
      } catch (err) {
        console.error('State listener error:', err);
      }
    }
  }
}

export const store = new StateStore();

/**
 * Debounce helper for fast user interactions (e.g. typing or dragging sliders).
 * @param {Function} fn
 * @param {number} delayMs
 * @returns {(...args: any[]) => void}
 */
export function debounce(fn, delayMs = 120) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delayMs);
  };
}
