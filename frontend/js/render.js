/**
 * @file frontend/js/render.js
 * @description Safe DOM rendering for Utsav dashboard cards, charts,
 * timeline, vendor checklists, what-if playground, and chat drawer.
 * SECURITY: All user-generated text is set via textContent, never innerHTML.
 */

import { t } from './i18n.js';


/**
 * Format currency in Indian numbering format (e.g., ₹6,50,000).
 * @param {number} num
 * @returns {string}
 */
export function formatINR(num) {
  if (num === null || num === undefined || isNaN(num)) return '₹0';
  return `₹${  Math.round(num).toLocaleString('en-IN')}`;
}

/**
 * Color palette for the budget categories.
 */
export const CATEGORY_COLORS = [
  '#8b5cf6', // Violet
  '#ec4899', // Rose
  '#06b6d4', // Teal
  '#f59e0b', // Amber
  '#10b981', // Emerald
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#f43f5e', // Coral
  '#64748b', // Slate
];

/**
 * Safe text node helper to avoid XSS vulnerabilities.
 * @param {HTMLElement} el
 * @param {string} text
 */
export function setText(el, text) {
  if (el) el.textContent = text;
}

/**
 * Render the Hero summary card.
 * @param {import('../../shared/engine/index.js').UtsavPlan} plan
 * @param {Set<string>} completedTasks
 * @param {HTMLElement} container
 */
export function renderHero(plan, completedTasks, container) {
  if (!container || !plan) return;
  const { inputs, feasibility, budget, timeline } = plan;

  // Calculate days remaining
  const eventDate = new Date(`${inputs.date}T00:00:00`);
  const now = new Date();
  const diffMs = eventDate.getTime() - now.getTime();
  const daysToGo = isNaN(diffMs) ? 0 : Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));

  // Total tasks count across timeline and vendors
  const totalTasks = timeline.milestones.length + budget.categories.length;
  const completedCount = completedTasks.size;
  const progressPct = totalTasks > 0 ? Math.round((completedCount / totalTasks) * 100) : 0;

  // Feasibility badge & advice
  let tierClass = 'tier-comfortable';
  let advice = t('comfortableAdvice');
  if (feasibility.tier === 'Tight') {
    tierClass = 'tier-tight';
    advice = t('tightAdvice', {
      guests: inputs.guests,
      maxGuests: feasibility.maxGuestsThatFit || inputs.guests,
      needed: (feasibility.budgetNeeded ? feasibility.budgetNeeded - inputs.budget : 0).toLocaleString('en-IN'),
    });
  } else if (feasibility.tier === 'Generous') {
    tierClass = 'tier-generous';
    advice = t('generousAdvice');
  }

  container.innerHTML = `
    <div class="hero-header">
      <div class="hero-title-group">
        <span class="hero-badge ${tierClass}">${feasibility.tier} Catering</span>
        <h2 class="hero-name" id="hero-event-name"></h2>
        <p class="hero-meta">
          <span class="meta-tag">📅 ${inputs.date}</span>
          <span class="meta-tag">✨ ${inputs.vibe}</span>
          <span class="meta-tag">👥 ${inputs.guests} Guests</span>
          ${inputs.vegOnly ? '<span class="meta-tag veg-tag">🌱 100% Veg</span>' : ''}
        </p>
      </div>
      <div class="hero-countdown">
        <div class="countdown-num">${daysToGo}</div>
        <div class="countdown-label">${t('daysToGo')}</div>
      </div>
    </div>

    <div class="hero-stats-grid">
      <div class="stat-card">
        <span class="stat-label">Total Budget</span>
        <span class="stat-value text-gradient">${formatINR(budget.totalBudget)}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">${t('perGuestSpend')}</span>
        <span class="stat-value">${formatINR(feasibility.perHeadActual)}</span>
        <span class="stat-hint">Min: ${formatINR(feasibility.perHeadMin)}</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">${t('contingencyReserve')}</span>
        <span class="stat-value">${formatINR(budget.contingency)}</span>
        <span class="stat-hint">${budget.contingencyPct}% of budget</span>
      </div>
      <div class="stat-card">
        <span class="stat-label">Checklist Progress</span>
        <span class="stat-value">${progressPct}%</span>
        <span class="stat-hint">${completedCount} of ${totalTasks} ${t('tasksCompleted')}</span>
      </div>
    </div>

    <div class="progress-bar-wrapper" role="progressbar" aria-valuenow="${progressPct}" aria-valuemin="0" aria-valuemax="100" aria-label="Planning checklist completion">
      <div class="progress-bar-fill" style="width: ${progressPct}%"></div>
    </div>

    <div class="hero-advice-box ${tierClass}">
      <span class="advice-icon">${feasibility.tier === 'Tight' ? '⚠️' : '💡'}</span>
      <p class="advice-text" id="hero-advice-text"></p>
    </div>
  `;

  // Safely assign text content
  const nameEl = container.querySelector('#hero-event-name');
  if (nameEl) nameEl.textContent = inputs.name || 'Utsav Celebration';
  const adviceEl = container.querySelector('#hero-advice-text');
  if (adviceEl) adviceEl.textContent = advice;
}

/**
 * Render the Budget Donut Card with conic-gradient and legend.
 * @param {import('../../shared/engine/index.js').UtsavPlan} plan
 * @param {HTMLElement} container
 */
export function renderBudgetCard(plan, container) {
  if (!container || !plan) return;
  const { budget } = plan;

  // Build conic-gradient segments
  let gradientAcc = 0;
  const gradientStops = [];
  const items = [...budget.categories, { name: 'Contingency Buffer', amount: budget.contingency, pct: budget.contingencyPct }];

  items.forEach((item, idx) => {
    const color = idx === items.length - 1 ? '#64748b' : CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
    const start = gradientAcc;
    const end = gradientAcc + item.pct;
    gradientStops.push(`${color} ${start.toFixed(1)}% ${end.toFixed(1)}%`);
    gradientAcc = end;
  });

  const conicStyle = `background: conic-gradient(${gradientStops.join(', ')});`;

  container.innerHTML = `
    <div class="card-header">
      <h3 class="card-title">${t('cardBudget')}</h3>
      <span class="card-subtitle">Exact allocations summing to ${formatINR(budget.totalBudget)}</span>
    </div>
    <div class="budget-card-body">
      <div class="donut-chart-wrapper" aria-label="Budget allocation chart">
        <div class="donut-chart" style="${conicStyle}">
          <div class="donut-hole">
            <span class="donut-hole-label">Total</span>
            <span class="donut-hole-value">${formatINR(budget.totalBudget)}</span>
          </div>
        </div>
      </div>
      <div class="budget-legend" role="list">
        ${items.map((item, idx) => {
          const color = idx === items.length - 1 ? '#64748b' : CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
          return `
            <div class="legend-row" role="listitem">
              <span class="legend-color-dot" style="background-color: ${color}"></span>
              <span class="legend-name">${item.name}</span>
              <span class="legend-pct">${item.pct}%</span>
              <span class="legend-amount">${formatINR(item.amount)}</span>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;
}

/**
 * Render a compact snapshot of budget for the Overview tab.
 * @param {import('../../shared/engine/index.js').UtsavPlan} plan
 * @param {HTMLElement} container
 */
export function renderBudgetMiniCard(plan, container) {
  if (!container || !plan) return;
  const { budget } = plan;
  const topCategories = budget.categories.slice(0, 4);

  container.innerHTML = `
    <div class="card-header">
      <div class="card-title-group">
        <h3 class="card-title">💰 Budget Snapshot</h3>
        <span class="card-subtitle">Total: ${formatINR(budget.totalBudget)}</span>
      </div>
      <a href="#budget" class="btn btn-ghost btn-sm" onclick="event.preventDefault(); window.location.hash='#budget';">View Full →</a>
    </div>
    <div class="mini-card-body">
      <div class="mini-category-bars">
        ${topCategories.map((cat, idx) => {
          const color = CATEGORY_COLORS[idx % CATEGORY_COLORS.length];
          return `
            <div class="mini-bar-row">
              <div class="mini-bar-label">
                <span class="mini-dot" style="background-color: ${color}"></span>
                <span>${cat.name}</span>
                <span class="mini-amount">${formatINR(cat.amount)} (${cat.pct}%)</span>
              </div>
              <div class="mini-bar-track">
                <div class="mini-bar-fill" style="width: ${cat.pct}%; background-color: ${color};"></div>
              </div>
            </div>
          `;
        }).join('')}
      </div>
      <div class="mini-contingency-tag">
        🛡️ Contingency Buffer: <strong>${formatINR(budget.contingency)} (${budget.contingencyPct}%)</strong>
      </div>
    </div>
  `;
}

/**
 * Render the Timeline Card with milestone items.
 * @param {import('../../shared/engine/index.js').UtsavPlan} plan
 * @param {Set<string>} completedTasks
 * @param {HTMLElement} container
 * @param {Function} onToggleTask
 */
export function renderTimelineCard(plan, completedTasks, container, onToggleTask) {
  if (!container || !plan) return;
  const { timeline } = plan;

  container.innerHTML = `
    <div class="card-header">
      <div class="card-title-group">
        <h3 class="card-title">${t('cardTimeline')}</h3>
        <span class="card-subtitle">${timeline.weeksAvailable} weeks available (Ideal lead: ${timeline.idealLeadWeeks} weeks)</span>
      </div>
      ${timeline.compressed ? '<span class="warning-badge">⚠️ Compressed Timeline</span>' : ''}
    </div>
    ${timeline.warning ? `<div class="timeline-warning-box">${timeline.warning}</div>` : ''}
    <div class="timeline-list">
      ${timeline.milestones.map((ms, idx) => {
        const taskId = `ms_${idx}_${ms.weeksBefore}`;
        const isDone = completedTasks.has(taskId);
        return `
          <div class="timeline-item ${ms.isPast ? 'is-past' : ''} ${isDone ? 'is-completed' : ''}">
            <div class="timeline-indicator">
              <input type="checkbox" id="${taskId}" class="task-checkbox" ${isDone ? 'checked' : ''} aria-label="Mark milestone complete">
            </div>
            <div class="timeline-content">
              <div class="timeline-header-line">
                <span class="timeline-weeks">${ms.weeksBefore === 0 ? '🎉 Event Day' : `${ms.weeksBefore} weeks prior`}</span>
                <span class="timeline-date">Due: ${ms.dueDate}</span>
              </div>
              <div class="timeline-task-desc">${ms.task}</div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  // Attach change listeners to checkboxes
  container.querySelectorAll('.task-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', (e) => {
      const target = /** @type {HTMLInputElement} */ (e.target);
      onToggleTask(target.id);
    });
  });
}

/**
 * Render a compact snapshot of upcoming milestones for the Overview tab.
 * @param {import('../../shared/engine/index.js').UtsavPlan} plan
 * @param {HTMLElement} container
 */
export function renderTimelineMiniCard(plan, container) {
  if (!container || !plan) return;
  const { timeline } = plan;
  const nextMilestones = timeline.milestones.slice(0, 3);

  container.innerHTML = `
    <div class="card-header">
      <div class="card-title-group">
        <h3 class="card-title">📅 Upcoming Milestones</h3>
        <span class="card-subtitle">${timeline.weeksAvailable} weeks available</span>
      </div>
      <a href="#timeline" class="btn btn-ghost btn-sm" onclick="event.preventDefault(); window.location.hash='#timeline';">View Full →</a>
    </div>
    <div class="mini-card-body">
      <div class="mini-timeline-list">
        ${nextMilestones.map((ms) => `
          <div class="mini-timeline-item">
            <span class="mini-timeline-badge">${ms.weeksBefore === 0 ? 'Day 0' : `W-${ms.weeksBefore}`}</span>
            <div class="mini-timeline-details">
              <div class="mini-timeline-task">${ms.task}</div>
              <div class="mini-timeline-date">Due: ${ms.dueDate}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `;
}

/**
 * Render the Vendor Checklist Card.
 * @param {import('../../shared/engine/index.js').UtsavPlan} plan
 * @param {Set<string>} completedTasks
 * @param {HTMLElement} container
 * @param {Function} onToggleTask
 */
export function renderVendorCard(plan, completedTasks, container, onToggleTask) {
  if (!container || !plan) return;
  const { vendors } = plan;

  container.innerHTML = `
    <div class="card-header">
      <h3 class="card-title">${t('cardVendors')}</h3>
      <span class="card-subtitle">Budgets & negotiation prompts before paying advances</span>
    </div>
    <div class="vendor-list">
      ${vendors.map((v, idx) => {
        const taskId = `vendor_${idx}_${v.category}`;
        const isDone = completedTasks.has(taskId);
        return `
          <div class="vendor-card-item ${isDone ? 'is-completed' : ''}">
            <div class="vendor-item-top">
              <label class="vendor-checkbox-label">
                <input type="checkbox" id="${taskId}" class="vendor-checkbox" ${isDone ? 'checked' : ''} aria-label="Mark vendor booked">
                <span class="vendor-name">${v.category}</span>
              </label>
              <span class="vendor-allocated">${formatINR(v.budget)}</span>
            </div>
            <div class="vendor-ask-box">
              <span class="ask-label">${t('askBeforeBooking')}</span>
              <p class="ask-text">${v.question}</p>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;

  container.querySelectorAll('.vendor-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', (e) => {
      const target = /** @type {HTMLInputElement} */ (e.target);
      onToggleTask(target.id);
    });
  });
}

/**
 * Render the Creative Ideas Card.
 * @param {any} ideas
 * @param {string} source - 'ai'|'fallback'|'offline'
 * @param {HTMLElement} container
 * @param {Function} onShuffle
 */
export function renderIdeasCard(ideas, source, container, onShuffle) {
  if (!container) return;

  const sourceBadge = source === 'ai'
    ? '<span class="badge-source badge-ai">✨ Gemini AI</span>'
    : '<span class="badge-source badge-offline">⚡ Smart Rules</span>';

  container.innerHTML = `
    <div class="card-header">
      <div class="card-title-group">
        <h3 class="card-title">${t('cardIdeas')}</h3>
        <span class="card-subtitle">Themes, menu inspirations & budget hacks</span>
      </div>
      <div class="card-header-actions">
        ${sourceBadge}
        <button class="btn btn-secondary btn-sm" id="btn-shuffle-ideas" aria-label="Shuffle Ideas">
          🔄 ${t('shuffleIdeas')}
        </button>
      </div>
    </div>
    <div class="ideas-grid">
      <div class="idea-section">
        <h4 class="idea-section-title">🎨 Themes & Styling</h4>
        <ul class="idea-list">
          ${(ideas.themes || []).map((t) => `<li>${t}</li>`).join('')}
        </ul>
      </div>
      <div class="idea-section">
        <h4 class="idea-section-title">🍽️ Menu Inspirations</h4>
        <ul class="idea-list">
          ${(ideas.menuIdeas || []).map((m) => `<li>${m}</li>`).join('')}
        </ul>
      </div>
      <div class="idea-section">
        <h4 class="idea-section-title">💰 High-Impact Budget Hacks</h4>
        <ul class="idea-list">
          ${(ideas.budgetHacks || []).map((h) => `<li>${h}</li>`).join('')}
        </ul>
      </div>
      <div class="idea-section">
        <h4 class="idea-section-title">🎉 Interactive Experiences</h4>
        <ul class="idea-list">
          ${(ideas.activities || []).map((a) => `<li>${a}</li>`).join('')}
        </ul>
      </div>
    </div>
  `;

  const shuffleBtn = container.querySelector('#btn-shuffle-ideas');
  if (shuffleBtn) shuffleBtn.addEventListener('click', () => onShuffle());
}

/**
 * Render the What-If Playground Card.
 * @param {import('../../shared/engine/index.js').UtsavPlan} plan
 * @param {import('../../shared/engine/whatif.js').WhatIfResult|null} whatIfResult
 * @param {HTMLElement} container
 * @param {Function} onSliderChange
 * @param {Function} onApply
 * @param {Function} onReset
 */
export function renderWhatIfCard(plan, whatIfResult, container, onSliderChange, onApply, onReset) {
  if (!container || !plan) return;
  const currentBudget = plan.inputs.budget;
  const currentGuests = plan.inputs.guests;

  const preview = whatIfResult || {
    after: plan,
    diff: [],
  };

  const diffBudget = preview.diff.find((d) => d.field === 'budget');
  const diffGuests = preview.diff.find((d) => d.field === 'guests');

  container.innerHTML = `
    <div class="card-header">
      <div class="card-title-group">
        <h3 class="card-title">${t('cardWhatIf')}</h3>
        <span class="card-subtitle">Adjust sliders to see instant deterministic recalculations</span>
      </div>
      <div class="whatif-header-actions">
        <button class="btn btn-secondary btn-sm" id="btn-whatif-reset">Reset</button>
        <button class="btn btn-primary btn-sm" id="btn-whatif-apply">Apply Changes</button>
      </div>
    </div>

    <div class="whatif-controls-grid">
      <div class="whatif-slider-box">
        <div class="slider-header">
          <label for="whatif-budget-slider" class="slider-label">${t('adjustBudget')}</label>
          <span class="slider-display" id="whatif-budget-val">${formatINR(preview.after.budget.totalBudget)}</span>
        </div>
        <input type="range" id="whatif-budget-slider" min="-50" max="100" step="5" value="0" class="styled-slider">
        <div class="slider-footer-hints">
          <span>-50%</span>
          <span>Original (${formatINR(currentBudget)})</span>
          <span>+100%</span>
        </div>
      </div>

      <div class="whatif-slider-box">
        <div class="slider-header">
          <label for="whatif-guests-slider" class="slider-label">${t('adjustGuests')}</label>
          <span class="slider-display" id="whatif-guests-val">${preview.after.inputs.guests} Guests</span>
        </div>
        <input type="range" id="whatif-guests-slider" min="-100" max="250" step="10" value="0" class="styled-slider">
        <div class="slider-footer-hints">
          <span>-100</span>
          <span>Original (${currentGuests})</span>
          <span>+250</span>
        </div>
      </div>
    </div>

    <div class="whatif-impact-summary">
      <div class="impact-chip ${diffBudget ? 'has-change' : ''}">
        <span class="impact-label">Budget Delta</span>
        <span class="impact-val">${diffBudget ? `${diffBudget.delta > 0 ? '+' : ''}${formatINR(diffBudget.delta)}` : 'No Change'}</span>
      </div>
      <div class="impact-chip ${diffGuests ? 'has-change' : ''}">
        <span class="impact-label">Guest Delta</span>
        <span class="impact-val">${diffGuests ? `${diffGuests.delta > 0 ? '+' : ''}${diffGuests.delta}` : 'No Change'}</span>
      </div>
      <div class="impact-chip">
        <span class="impact-label">New Feasibility</span>
        <span class="impact-val tier-badge-${preview.after.feasibility.tier.toLowerCase()}">${preview.after.feasibility.tier} (${formatINR(preview.after.feasibility.perHeadActual)}/head)</span>
      </div>
      <div class="impact-chip">
        <span class="impact-label">New Contingency</span>
        <span class="impact-val">${formatINR(preview.after.budget.contingency)}</span>
      </div>
    </div>
  `;

  const budgetSlider = /** @type {HTMLInputElement} */ (container.querySelector('#whatif-budget-slider'));
  const guestsSlider = /** @type {HTMLInputElement} */ (container.querySelector('#whatif-guests-slider'));

  budgetSlider?.addEventListener('input', () => {
    onSliderChange({ budgetPct: parseInt(budgetSlider.value), guestsDelta: parseInt(guestsSlider.value) });
  });

  guestsSlider?.addEventListener('input', () => {
    onSliderChange({ budgetPct: parseInt(budgetSlider.value), guestsDelta: parseInt(guestsSlider.value) });
  });

  container.querySelector('#btn-whatif-reset')?.addEventListener('click', () => {
    if (budgetSlider) budgetSlider.value = '0';
    if (guestsSlider) guestsSlider.value = '0';
    onReset();
  });

  container.querySelector('#btn-whatif-apply')?.addEventListener('click', () => onApply());
}

/**
 * Render Chat Messages in the drawer.
 * @param {Array<{ sender: 'user'|'utsav', text: string, source?: string, diff?: any }>} messages
 * @param {HTMLElement} container
 * @param {boolean} isTyping
 */
export function renderChatMessages(messages, container, isTyping = false) {
  if (!container) return;

  container.innerHTML = messages.map((m) => {
    const isUser = m.sender === 'user';
    const sourceTag = m.source ? `<span class="chat-source-tag">${m.source === 'ai' ? '✨ Gemini' : '⚡ Local'}</span>` : '';
    return `
      <div class="chat-message ${isUser ? 'msg-user' : 'msg-utsav'}">
        <div class="chat-bubble">
          <div class="chat-sender-line">
            <span class="chat-sender-name">${isUser ? 'Meera' : 'Utsav'}</span>
            ${sourceTag}
          </div>
          <div class="chat-bubble-text"></div>
        </div>
      </div>
    `;
  }).join('');

  // Safely assign text content to each bubble
  const bubbles = container.querySelectorAll('.chat-bubble-text');
  messages.forEach((m, idx) => {
    if (bubbles[idx]) bubbles[idx].textContent = m.text;
  });

  if (isTyping) {
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'chat-message msg-utsav typing-indicator-msg';
    typingIndicator.innerHTML = `
      <div class="chat-bubble typing-bubble">
        <span class="dot"></span>
        <span class="dot"></span>
        <span class="dot"></span>
      </div>
    `;
    container.appendChild(typingIndicator);
  }

  // Auto-scroll to bottom
  container.scrollTop = container.scrollHeight;
}
