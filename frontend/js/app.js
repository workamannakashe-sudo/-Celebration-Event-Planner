/**
 * @file frontend/js/app.js
 * @description Main frontend application logic for Utsav.
 * Coordinates state, event listeners, API calls, chat drawer, and rendering.
 */

import { initTheme, toggleTheme } from './theme.js';
import { setLanguage, getLanguage, t } from './i18n.js';
import { store, debounce, DEFAULT_INPUTS } from './state.js';
import { getPlan, getIdeas, sendChatMessage, checkServerHealth } from './api.js';
import { downloadCalendar } from './ics.js';
import { applyScenario } from '../../shared/engine/whatif.js';
import {
  renderHero,
  renderBudgetCard,
  renderTimelineCard,
  renderVendorCard,
  renderIdeasCard,
  renderWhatIfCard,
  renderChatMessages,
  formatINR,
} from './render.js';

/** @type {import('../../shared/engine/whatif.js').WhatIfResult|null} */
let currentWhatIfPreview = null;
let isChatOpen = false;

// ── DOM References ─────────────────────────────────────────────────────────────
const els = {
  // Theme & Language
  btnThemeToggle: document.getElementById('btn-theme-toggle'),
  selectLanguage: /** @type {HTMLSelectElement} */ (document.getElementById('select-language')),
  statusBadge: document.getElementById('connection-badge'),
  // Form elements
  form: document.getElementById('event-form'),
  inputName: /** @type {HTMLInputElement} */ (document.getElementById('input-name')),
  inputGuests: /** @type {HTMLInputElement} */ (document.getElementById('input-guests')),
  inputBudget: /** @type {HTMLInputElement} */ (document.getElementById('input-budget')),
  inputDate: /** @type {HTMLInputElement} */ (document.getElementById('input-date')),
  toggleVeg: /** @type {HTMLInputElement} */ (document.getElementById('toggle-veg')),
  // Top action buttons
  btnCopyPlan: document.getElementById('btn-copy-plan'),
  btnExportIcs: document.getElementById('btn-export-ics'),
  btnPrintPlan: document.getElementById('btn-print-plan'),
  btnOpenChat: document.getElementById('btn-open-chat'),
  // Card containers
  cardHero: document.getElementById('card-hero'),
  cardBudget: document.getElementById('card-budget'),
  cardTimeline: document.getElementById('card-timeline'),
  cardVendors: document.getElementById('card-vendors'),
  cardIdeas: document.getElementById('card-ideas'),
  cardWhatif: document.getElementById('card-whatif'),
  // Chat drawer
  chatDrawer: document.getElementById('chat-drawer'),
  chatBackdrop: document.getElementById('chat-backdrop'),
  btnCloseChat: document.getElementById('btn-close-chat'),
  chatMessagesContainer: document.getElementById('chat-messages'),
  chatForm: document.getElementById('chat-form'),
  chatInput: /** @type {HTMLInputElement} */ (document.getElementById('chat-input')),
  chatChipsContainer: document.getElementById('chat-chips'),
  // Live announcements
  liveRegion: document.getElementById('aria-live-region'),
};

/**
 * Announce messages to screen readers.
 * @param {string} message
 */
function announce(message) {
  if (els.liveRegion) {
    els.liveRegion.textContent = message;
  }
}

/**
 * Synchronize the form inputs with store.inputs.
 */
function populateFormFromState() {
  const { inputs } = store;
  if (els.inputName) els.inputName.value = inputs.name || '';
  if (els.inputGuests) els.inputGuests.value = String(inputs.guests || 200);
  if (els.inputBudget) els.inputBudget.value = String(inputs.budget || 500000);
  if (els.inputDate) els.inputDate.value = inputs.date || '';
  if (els.toggleVeg) els.toggleVeg.checked = Boolean(inputs.vegOnly);

  // Set radio buttons for type
  const typeRadio = document.querySelector(`input[name="event-type"][value="${inputs.type}"]`);
  if (typeRadio) /** @type {HTMLInputElement} */ (typeRadio).checked = true;

  // Set radio buttons for vibe
  const vibeRadio = document.querySelector(`input[name="event-vibe"][value="${inputs.vibe}"]`);
  if (vibeRadio) /** @type {HTMLInputElement} */ (vibeRadio).checked = true;
}

/**
 * Read form inputs from the DOM.
 * @returns {import('../../shared/engine/index.js').PlanInputs}
 */
function readFormInputs() {
  const selectedType = /** @type {HTMLInputElement} */ (document.querySelector('input[name="event-type"]:checked'))?.value || 'wedding';
  const selectedVibe = /** @type {HTMLInputElement} */ (document.querySelector('input[name="event-vibe"]:checked'))?.value || 'Traditional';

  return {
    type: /** @type {'wedding'|'birthday'|'community'} */ (selectedType),
    name: els.inputName?.value?.trim() || 'My Celebration',
    guests: Math.max(1, Math.min(5000, parseInt(els.inputGuests?.value || '200', 10))),
    budget: Math.max(10000, Math.min(100000000, parseInt(els.inputBudget?.value || '500000', 10))),
    date: els.inputDate?.value || DEFAULT_INPUTS.date,
    vibe: /** @type {'Elegant'|'Fun'|'Traditional'|'Minimal'} */ (selectedVibe),
    vegOnly: Boolean(els.toggleVeg?.checked),
  };
}

/**
 * Recalculate and render the entire plan and ideas.
 */
async function updatePlan() {
  const inputs = readFormInputs();
  store.setInputs(inputs);

  // Get plan (server API with offline fallback)
  const { plan } = await getPlan(inputs);
  store.setPlan(plan);

  // Render core dashboard cards
  renderHero(plan, store.completedTasks, els.cardHero);
  renderBudgetCard(plan, els.cardBudget);
  renderTimelineCard(plan, store.completedTasks, els.cardTimeline, handleToggleTask);
  renderVendorCard(plan, store.completedTasks, els.cardVendors, handleToggleTask);
  renderWhatIfCard(
    plan,
    currentWhatIfPreview,
    els.cardWhatif,
    handleWhatIfSlider,
    handleWhatIfApply,
    handleWhatIfReset
  );

  announce(`Plan updated for ${inputs.name}. Budget: ${formatINR(plan.budget.totalBudget)}.`);

  // Fetch creative ideas in background
  const lang = getLanguage();
  const { ideas, source } = await getIdeas(inputs, lang, plan);
  store.setIdeas(ideas);
  renderIdeasCard(ideas, source, els.cardIdeas, handleShuffleIdeas);
}

const debouncedUpdatePlan = debounce(updatePlan, 120);

/**
 * Handle checklist task toggling (persists to localStorage and re-renders Hero).
 * @param {string} taskId
 */
function handleToggleTask(taskId) {
  store.toggleTask(taskId);
  if (store.plan) {
    renderHero(store.plan, store.completedTasks, els.cardHero);
    renderTimelineCard(store.plan, store.completedTasks, els.cardTimeline, handleToggleTask);
    renderVendorCard(store.plan, store.completedTasks, els.cardVendors, handleToggleTask);
  }
}

/**
 * Handle What-If slider changes.
 * @param {{ budgetPct?: number, guestsDelta?: number }} scenario
 */
function handleWhatIfSlider(scenario) {
  if (!store.plan) return;
  try {
    currentWhatIfPreview = applyScenario(store.plan.inputs, scenario);
    renderWhatIfCard(
      store.plan,
      currentWhatIfPreview,
      els.cardWhatif,
      handleWhatIfSlider,
      handleWhatIfApply,
      handleWhatIfReset
    );
  } catch (err) {
    console.warn('What-if slider error:', err);
  }
}

/**
 * Apply What-If changes to the main inputs.
 */
function handleWhatIfApply() {
  if (!currentWhatIfPreview) return;
  const newInputs = currentWhatIfPreview.after.inputs;
  store.setInputs(newInputs);
  populateFormFromState();
  currentWhatIfPreview = null;
  updatePlan();
  announce('What-if adjustments applied to main plan.');
}

/**
 * Reset What-If sliders.
 */
function handleWhatIfReset() {
  currentWhatIfPreview = null;
  if (store.plan) {
    renderWhatIfCard(
      store.plan,
      null,
      els.cardWhatif,
      handleWhatIfSlider,
      handleWhatIfApply,
      handleWhatIfReset
    );
  }
}

/**
 * Handle Shuffle Ideas button.
 */
async function handleShuffleIdeas() {
  if (!store.plan) return;
  const lang = getLanguage();
  const { ideas, source } = await getIdeas(store.plan.inputs, lang, store.plan);
  store.setIdeas(ideas);
  renderIdeasCard(ideas, source, els.cardIdeas, handleShuffleIdeas);
  announce('New ideas generated.');
}

/**
 * Copy plan summary to clipboard.
 */
async function handleCopyPlan() {
  if (!store.plan) return;
  const { inputs, budget, feasibility } = store.plan;
  const summaryText = [
    `✨ Utsav Event Plan: ${inputs.name}`,
    `📅 Date: ${inputs.date} | 👥 Guests: ${inputs.guests} | 🎨 Vibe: ${inputs.vibe} (${inputs.vegOnly ? '100% Veg' : 'Non-Veg'})`,
    `💰 Total Budget: ${formatINR(budget.totalBudget)}`,
    `🍽️ Catering per guest: ${formatINR(feasibility.perHeadActual)} (Status: ${feasibility.tier})`,
    `🛡️ Contingency Buffer: ${formatINR(budget.contingency)} (${budget.contingencyPct}%)`,
    '',
    'Budget Allocations:',
    ...budget.categories.map((c) => `• ${c.name}: ${formatINR(c.amount)} (${c.pct}%)`),
    '',
    'Created with Utsav Event Planner.',
  ].join('\n');

  try {
    await navigator.clipboard.writeText(summaryText);
    const origText = els.btnCopyPlan?.textContent || '';
    if (els.btnCopyPlan) els.btnCopyPlan.textContent = `✅ ${  t('planCopied')}`;
    setTimeout(() => {
      if (els.btnCopyPlan) els.btnCopyPlan.textContent = origText;
    }, 2500);
    announce(t('planCopied'));
  } catch {
    alert(summaryText);
  }
}

/**
 * Export calendar file.
 */
function handleExportIcs() {
  if (!store.plan) return;
  downloadCalendar(store.plan);
  announce('Calendar file downloaded.');
}

/**
 * Open/close chat drawer.
 * @param {boolean} open
 */
function toggleChatDrawer(open) {
  isChatOpen = open;
  if (els.chatDrawer && els.chatBackdrop) {
    if (open) {
      els.chatDrawer.classList.add('is-open');
      els.chatBackdrop.classList.add('is-open');
      els.chatDrawer.removeAttribute('inert');
      els.chatInput?.focus();
    } else {
      els.chatDrawer.classList.remove('is-open');
      els.chatBackdrop.classList.remove('is-open');
      els.chatDrawer.setAttribute('inert', '');
      els.btnOpenChat?.focus();
    }
  }
}

/**
 * Send chat message.
 * @param {string} text
 */
async function handleSendChat(text) {
  if (!text || !text.trim() || !store.plan) return;
  const userText = text.trim();

  // Add user message
  store.addChatMessage({ sender: 'user', text: userText });
  renderChatMessages(store.chatMessages, els.chatMessagesContainer, true);

  if (els.chatInput) els.chatInput.value = '';

  const lang = getLanguage();
  const res = await sendChatMessage(store.plan.inputs, userText, lang);

  // Add assistant reply
  store.addChatMessage({
    sender: 'utsav',
    text: res.reply,
    source: res.source,
    diff: res.diff,
  });

  renderChatMessages(store.chatMessages, els.chatMessagesContainer, false);
  announce(`Utsav replied: ${res.reply}`);

  // If scenario changed budget or guests, ask user or update plan if diff exists
  if (res.diff && res.diff.length > 0 && res.scenario && Object.keys(res.scenario).length > 0) {
    try {
      currentWhatIfPreview = applyScenario(store.plan.inputs, res.scenario);
      renderWhatIfCard(
        store.plan,
        currentWhatIfPreview,
        els.cardWhatif,
        handleWhatIfSlider,
        handleWhatIfApply,
        handleWhatIfReset
      );
    } catch {
      // Ignore
    }
  }
}

/**
 * Initialize event listeners.
 */
function setupEventListeners() {
  // Theme toggle
  els.btnThemeToggle?.addEventListener('click', () => {
    toggleTheme();
  });

  // Language selector
  els.selectLanguage?.addEventListener('change', (e) => {
    const lang = /** @type {'en'|'hi'|'mr'} */ ((/** @type {HTMLSelectElement} */ (e.target)).value);
    setLanguage(lang);
    updatePlan();
  });

  // Form inputs listener (debounced)
  els.form?.addEventListener('input', () => {
    debouncedUpdatePlan();
  });

  // Top action buttons
  els.btnCopyPlan?.addEventListener('click', handleCopyPlan);
  els.btnExportIcs?.addEventListener('click', handleExportIcs);
  els.btnPrintPlan?.addEventListener('click', () => window.print());

  // Chat drawer toggle
  els.btnOpenChat?.addEventListener('click', () => toggleChatDrawer(true));
  els.btnCloseChat?.addEventListener('click', () => toggleChatDrawer(false));
  els.chatBackdrop?.addEventListener('click', () => toggleChatDrawer(false));

  // ESC key to close drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && isChatOpen) {
      toggleChatDrawer(false);
    }
  });

  // Chat submit
  els.chatForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSendChat(els.chatInput?.value || '');
  });

  // Chat suggested prompt chips
  els.chatChipsContainer?.addEventListener('click', (e) => {
    const target = /** @type {Element|null} */ (e.target);
    const chip = /** @type {HTMLElement|null} */ (target?.closest('.chip-btn'));
    if (chip && chip.dataset.prompt) {
      handleSendChat(chip.dataset.prompt);
    }
  });

  // Network online/offline indicators
  window.addEventListener('online', updateConnectionStatus);
  window.addEventListener('offline', updateConnectionStatus);
}

/**
 * Update connection status badge in header.
 */
async function updateConnectionStatus() {
  if (!navigator.onLine) {
    if (els.statusBadge) {
      els.statusBadge.className = 'status-badge is-offline';
      els.statusBadge.textContent = `⚡ ${  t('offlineBadge')}`;
    }
    return;
  }

  const { online, aiConfigured } = await checkServerHealth();
  if (els.statusBadge) {
    if (!online) {
      els.statusBadge.className = 'status-badge is-offline';
      els.statusBadge.textContent = `⚡ ${  t('offlineBadge')}`;
    } else if (aiConfigured) {
      els.statusBadge.className = 'status-badge is-online';
      els.statusBadge.textContent = '✨ Gemini Connected';
    } else {
      els.statusBadge.className = 'status-badge is-rules';
      els.statusBadge.textContent = '⚡ Local Rules Mode';
    }
  }
}

/**
 * Application bootstrapper.
 */
async function init() {
  initTheme();
  setupEventListeners();

  // Populate saved or default form values
  populateFormFromState();

  // Initial plan generation
  await updatePlan();

  // Render initial chat messages
  renderChatMessages(store.chatMessages, els.chatMessagesContainer);

  // Check health and display badge
  await updateConnectionStatus();
}

// Start application when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
