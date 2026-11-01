/**
 * @file frontend/js/app.js
 * @description Utsav SPA – hash router, My Plans grid, 10-tab workspace,
 *   what-if engine, stress test, trade-off studio, RSVP forecast, quote comparer,
 *   and chat drawer. Zero innerHTML for user content – textContent/createElement only.
 */

import { initTheme, toggleTheme } from './theme.js';
import { setLanguage, getLanguage, t } from './i18n.js';
import { store, debounce, DEFAULT_INPUTS } from './state.js';
import { getPlan, getIdeas, sendChatMessage, checkServerHealth } from './api.js';
import { downloadCalendar } from './ics.js';
import { applyScenario } from '../../../shared/engine/whatif.js';
import { runStressTest } from '../../../shared/engine/stress.js';
import { computeTradeoff } from '../../../shared/engine/tradeoff.js';
import { forecastRsvp } from '../../../shared/engine/rsvp.js';
import { compareQuotes } from '../../../shared/engine/quotes.js';
import {
  renderHero,
  renderBudgetCard,
  renderBudgetMiniCard,
  renderTimelineCard,
  renderTimelineMiniCard,
  renderVendorCard,
  renderIdeasCard,
  renderWhatIfCard,
  renderChatMessages,
  formatINR,
} from './render.js';

// ── State ─────────────────────────────────────────────────────────────────────
let currentWhatIfPreview = null;
let isChatOpen = false;
let activeTab = 'overview';

// ── DOM helpers ───────────────────────────────────────────────────────────────
/** @param {string} id @returns {HTMLElement|null} */
const $ = (id) => document.getElementById(id);

// View containers
const views = {
  home:      $('view-home'),
  wizard:    $('view-wizard'),
  workspace: $('view-workspace'),
};

// Workspace DOM refs
const ws = {
  planName:   $('ws-plan-name'),
  metaChips:  $('ws-meta-chips'),
  tabBtns:    /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.tab-btn')),
  tabPanels:  /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.tab-panel')),

  // Tab sections
  cardHero:         $('card-hero'),
  cardBudgetMini:   $('card-budget-mini'),
  cardTimelineMini: $('card-timeline-mini'),
  cardBudget:       $('card-budget'),
  cardTimeline:     $('card-timeline'),
  cardVendors:      $('card-vendors'),
  cardWhatif:       $('card-whatif'),
  cardIdeas:        $('card-ideas'),
  cardRsvp:         $('card-rsvp'),

  // Sidebar quick-edit
  inputGuests:  /** @type {HTMLInputElement} */ ($('ws-input-guests')),
  inputBudget:  /** @type {HTMLInputElement} */ ($('ws-input-budget')),
  inputDate:    /** @type {HTMLInputElement} */ ($('ws-input-date')),
  toggleVeg:    /** @type {HTMLInputElement} */ ($('ws-toggle-veg')),
};

// Chat
const chat = {
  drawer:   $('chat-drawer'),
  backdrop: $('chat-backdrop'),
  messages: $('chat-messages'),
  form:     $('chat-form'),
  input:    /** @type {HTMLInputElement} */ ($('chat-input')),
  chips:    $('chat-chips'),
  btnOpen:  $('btn-open-chat'),
  btnClose: $('btn-close-chat'),
};

// Wizard
const wiz = {
  step1:      $('wizard-step-1'),
  step2:      $('wizard-step-2'),
  progress:   /** @type {NodeListOf<HTMLElement>} */ (document.querySelectorAll('.wizard-step')),
  inputName:  /** @type {HTMLInputElement} */ ($('w-input-name')),
  inputDate:  /** @type {HTMLInputElement} */ ($('w-input-date')),
  inputGuests:/** @type {HTMLInputElement} */ ($('w-input-guests')),
  inputBudget:/** @type {HTMLInputElement} */ ($('w-input-budget')),
  toggleVeg:  /** @type {HTMLInputElement} */ ($('w-toggle-veg')),
};

const liveRegion = $('aria-live-region');

// ── Announce ──────────────────────────────────────────────────────────────────
function announce(msg) {
  if (liveRegion) liveRegion.textContent = msg;
}

// ══════════════════════════════════════════════════════════════════════════════
// ROUTING
// ══════════════════════════════════════════════════════════════════════════════

/** @param {'home'|'wizard'|'workspace'} name */
function showView(name) {
  for (const [k, el] of Object.entries(views)) {
    if (!el) continue;
    el.style.display = k === name ? '' : 'none';
  }
  // Show/hide Ask Utsav button
  if (chat.btnOpen) chat.btnOpen.style.display = name === 'workspace' ? '' : 'none';
}

// ══════════════════════════════════════════════════════════════════════════════
// MY PLANS (localStorage)
// ══════════════════════════════════════════════════════════════════════════════

const PLANS_KEY = 'utsav:plans';

function loadPlans() {
  try { return JSON.parse(localStorage.getItem(PLANS_KEY) || '[]'); }
  catch { return []; }
}

function savePlans(plans) {
  localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
}

/** @param {object} planInputs */
function createPlan(planInputs) {
  const plans = loadPlans();
  const id = `plan_${Date.now()}`;
  plans.unshift({ id, inputs: planInputs, createdAt: new Date().toISOString() });
  savePlans(plans);
  return id;
}

function deletePlan(id) {
  const plans = loadPlans().filter((p) => p.id !== id);
  savePlans(plans);
}

function renderPlansGrid() {
  const grid = $('plans-grid');
  const empty = $('plans-empty');
  const countBadge = $('plans-count');
  if (!grid) return;

  const plans = loadPlans();
  grid.innerHTML = '';

  if (countBadge) countBadge.textContent = `${plans.length} plan${plans.length !== 1 ? 's' : ''}`;

  if (plans.length === 0) {
    if (empty) empty.style.display = '';
    return;
  }
  if (empty) empty.style.display = 'none';

  const icons = { wedding: '💍', birthday: '🎂', community: '🎪' };

  for (const plan of plans) {
    const inp = plan.inputs;
    const card = document.createElement('div');
    card.className = 'plan-card';
    card.setAttribute('role', 'listitem');
    card.setAttribute('tabindex', '0');
    card.setAttribute('aria-label', `Open plan: ${inp.name}`);

    const iconEl = document.createElement('div');
    iconEl.className = 'plan-card-icon';
    iconEl.textContent = icons[inp.type] || '🎊';

    const nameEl = document.createElement('div');
    nameEl.className = 'plan-card-name';
    nameEl.textContent = inp.name;

    const metaEl = document.createElement('div');
    metaEl.className = 'plan-card-meta';
    metaEl.textContent = `${inp.date} · ${inp.guests} guests · ${inp.vibe}`;

    const budgetEl = document.createElement('div');
    budgetEl.className = 'plan-card-budget';
    budgetEl.textContent = formatINR(inp.budget);

    const delBtn = document.createElement('button');
    delBtn.className = 'plan-card-delete';
    delBtn.setAttribute('aria-label', `Delete plan: ${inp.name}`);
    delBtn.textContent = '✕';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      deletePlan(plan.id);
      renderPlansGrid();
      announce(`Plan "${inp.name}" deleted.`);
    });

    card.append(iconEl, nameEl, metaEl, budgetEl, delBtn);
    card.addEventListener('click', () => openWorkspace(inp));
    card.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openWorkspace(inp); });
    grid.appendChild(card);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// WORKSPACE
// ══════════════════════════════════════════════════════════════════════════════

/** @param {import('../../../shared/engine/index.js').PlanInputs} inputs */
async function openWorkspace(inputs) {
  store.setInputs(inputs);
  showView('workspace');
  populateSidebarFromState();
  await updatePlan();
  switchTab('overview');
  window.location.hash = '#workspace';
}

function populateSidebarFromState() {
  const { inputs } = store;
  if (ws.inputGuests) ws.inputGuests.value = String(inputs.guests);
  if (ws.inputBudget) ws.inputBudget.value = String(inputs.budget);
  if (ws.inputDate)   ws.inputDate.value   = inputs.date;
  if (ws.toggleVeg)   ws.toggleVeg.checked = Boolean(inputs.vegOnly);

  const vibeRadio = document.querySelector(`input[name="ws-vibe"][value="${inputs.vibe}"]`);
  if (vibeRadio) /** @type {HTMLInputElement} */(vibeRadio).checked = true;
}

function readSidebarInputs() {
  const selectedVibe = /** @type {HTMLInputElement} */ (
    document.querySelector('input[name="ws-vibe"]:checked')
  )?.value || 'Traditional';
  return {
    ...store.inputs,
    guests: Math.max(1, Math.min(5000, parseInt(ws.inputGuests?.value || '200', 10))),
    budget: Math.max(10000, Math.min(100_000_000, parseInt(ws.inputBudget?.value || '500000', 10))),
    date:   ws.inputDate?.value || DEFAULT_INPUTS.date,
    vibe:   /** @type {'Elegant'|'Fun'|'Traditional'|'Minimal'} */ (selectedVibe),
    vegOnly: Boolean(ws.toggleVeg?.checked),
  };
}

// Workspace title + meta chips
function renderWorkspaceMeta(plan) {
  if (ws.planName) ws.planName.textContent = plan.inputs.name;
  if (!ws.metaChips) return;
  ws.metaChips.innerHTML = '';
  const chips = [
    `📅 ${plan.inputs.date}`,
    `👥 ${plan.inputs.guests}`,
    formatINR(plan.inputs.budget),
    plan.inputs.vibe,
  ];
  for (const text of chips) {
    const ch = document.createElement('span');
    ch.className = 'ws-chip';
    ch.textContent = text;
    ws.metaChips.appendChild(ch);
  }
}

// ── Update Plan ───────────────────────────────────────────────────────────────
async function updatePlan() {
  const inputs = readSidebarInputs();
  store.setInputs(inputs);
  const { plan } = await getPlan(inputs);
  store.setPlan(plan);

  renderWorkspaceMeta(plan);

  // Always refresh visible cards
  if (activeTab === 'overview') renderOverviewTab(plan);
  if (activeTab === 'budget')   renderBudgetCard(plan, ws.cardBudget);
  if (activeTab === 'timeline') renderTimelineCard(plan, store.completedTasks, ws.cardTimeline, handleToggleTask);
  if (activeTab === 'vendors')  renderVendorCard(plan, store.completedTasks, ws.cardVendors, handleToggleTask);
  if (activeTab === 'whatif')   renderWhatIfCard(plan, currentWhatIfPreview, ws.cardWhatif, handleWhatIfSlider, handleWhatIfApply, handleWhatIfReset);
  if (activeTab === 'rsvp')     renderRsvpTab(plan);

  // Hero always refreshed
  renderHero(plan, store.completedTasks, ws.cardHero);

  announce(`Plan updated for ${inputs.name}.`);

  // Background ideas fetch
  const lang = getLanguage();
  const { ideas, source } = await getIdeas(inputs, lang, plan);
  store.setIdeas(ideas);
  if (activeTab === 'ideas') renderIdeasCard(ideas, source, ws.cardIdeas, handleShuffleIdeas);
}

const debouncedUpdatePlan = debounce(updatePlan, 200);

// ── Tab switching ─────────────────────────────────────────────────────────────
function switchTab(tabName) {
  activeTab = tabName;
  ws.tabBtns.forEach((btn) => {
    const active = btn.dataset.tab === tabName;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  ws.tabPanels.forEach((panel) => {
    const id = panel.id.replace('tab-', '');
    panel.style.display = id === tabName ? '' : 'none';
    panel.classList.toggle('active', id === tabName);
  });

  if (!store.plan) return;
  const plan = store.plan;

  switch (tabName) {
    case 'overview': renderOverviewTab(plan); break;
    case 'budget':   renderBudgetCard(plan, ws.cardBudget); break;
    case 'timeline': renderTimelineCard(plan, store.completedTasks, ws.cardTimeline, handleToggleTask); break;
    case 'vendors':  renderVendorCard(plan, store.completedTasks, ws.cardVendors, handleToggleTask); break;
    case 'whatif':   renderWhatIfCard(plan, currentWhatIfPreview, ws.cardWhatif, handleWhatIfSlider, handleWhatIfApply, handleWhatIfReset); break;
    case 'rsvp':     renderRsvpTab(plan); break;
    case 'stress':   renderStressPlaceholder(); break;
    case 'tradeoff': renderTradeoffPanel(plan); break;
    case 'quotes':   renderQuotesPanel(plan); break;
    case 'ideas': {
      if (store.ideas) renderIdeasCard(store.ideas, 'rules', ws.cardIdeas, handleShuffleIdeas);
      else { updatePlan(); }
      break;
    }
    default: break;
  }
}

// ── Overview tab ──────────────────────────────────────────────────────────────
function renderOverviewTab(plan) {
  renderHero(plan, store.completedTasks, ws.cardHero);
  renderBudgetMiniCard(plan, ws.cardBudgetMini);
  renderTimelineMiniCard(plan, ws.cardTimelineMini);
}

// ── RSVP tab ─────────────────────────────────────────────────────────────────
function renderRsvpTab(plan) {
  const container = ws.cardRsvp;
  if (!container || !plan) return;
  const rsvp = forecastRsvp(plan.inputs.type, plan.inputs.guests);
  const cateringPlates = rsvp.expectedAttendance + Math.round(rsvp.expectedAttendance * rsvp.cateringBuffer / 100);

  container.innerHTML = '';

  // Header
  const hdr = document.createElement('div');
  hdr.className = 'card-header';
  hdr.innerHTML = '<div class="card-title-group"><h3 class="card-title">👥 RSVP & Attendance Forecast</h3><span class="card-subtitle">Industry-standard attendance norms for Indian celebrations</span></div>';
  container.appendChild(hdr);

  // Rate cards
  const rateGrid = document.createElement('div');
  rateGrid.className = 'rsvp-rate-grid';
  const rates = [
    { label: 'Attendance Rate', val: `${Math.round(rsvp.attendanceRate * 100)}%`, bg: 'rgba(107,33,168,0.06)' },
    { label: 'Low Estimate',    val: rsvp.low,  bg: 'rgba(239,68,68,0.06)' },
    { label: 'High Estimate',   val: rsvp.high, bg: 'rgba(16,185,129,0.06)' },
  ];
  for (const r of rates) {
    const card = document.createElement('div');
    card.className = 'rsvp-rate-card';
    card.style.background = r.bg;
    const lbl = document.createElement('div'); lbl.className = 'rsvp-rate-label'; lbl.textContent = r.label;
    const val = document.createElement('div'); val.className = 'rsvp-rate-val'; val.textContent = String(r.val);
    card.append(lbl, val);
    rateGrid.appendChild(card);
  }
  container.appendChild(rateGrid);

  // Funnel
  const funnel = document.createElement('div');
  funnel.className = 'rsvp-funnel';
  const stages = [
    { label: 'Invited', num: rsvp.invited, cls: 'rsvp-invited' },
    { label: 'Expected', num: rsvp.expectedAttendance, cls: 'rsvp-expected' },
    { label: 'Cater For', num: cateringPlates, cls: 'rsvp-catering' },
  ];
  for (const s of stages) {
    const stageEl = document.createElement('div');
    stageEl.className = `rsvp-stage ${s.cls}`;
    const lbl = document.createElement('div'); lbl.className = 'rsvp-stage-label'; lbl.textContent = s.label;
    const num = document.createElement('div'); num.className = 'rsvp-stage-num'; num.textContent = String(s.num);
    const buf = document.createElement('div');
    buf.className = 'form-hint'; buf.style.marginTop = '4px';
    if (s.cls === 'rsvp-catering') buf.textContent = `+${rsvp.cateringBuffer}% buffer`;
    stageEl.append(lbl, num, buf);
    funnel.appendChild(stageEl);
  }
  container.appendChild(funnel);

  // Insight
  const insight = document.createElement('div');
  insight.className = 'rsvp-insight-box';
  insight.textContent = rsvp.insight;
  container.appendChild(insight);
}

// ── Stress test ───────────────────────────────────────────────────────────────
function renderStressPlaceholder() {
  // Already in HTML, button wired by event listener
}

function renderStressResult(result) {
  const container = $('stress-result');
  if (!container) return;
  container.innerHTML = '';

  const verdictClass = {
    'Safe': 'verdict-safe',
    'Moderate Risk': 'verdict-moderate',
    'High Risk': 'verdict-high',
  }[result.verdict] || 'verdict-moderate';

  const verdictEl = document.createElement('div');
  verdictEl.className = `stress-verdict ${verdictClass}`;
  const icon = result.verdict === 'Safe' ? '✅' : result.verdict === 'Moderate Risk' ? '⚠️' : '🚨';
  verdictEl.textContent = `${icon} ${result.verdict} — ${result.overrunPct}% of runs exceeded budget`;
  container.appendChild(verdictEl);

  const grid = document.createElement('div');
  grid.className = 'stress-result-grid';

  const metrics = [
    { label: 'Simulations', value: result.simulations.toLocaleString('en-IN') },
    { label: 'Overrun %',   value: `${result.overrunPct}%` },
    { label: 'P50 Median',  value: formatINR(result.p50) },
    { label: 'P75 Cost',    value: formatINR(result.p75) },
    { label: 'P95 Cost',    value: formatINR(result.p95) },
    { label: 'Mean Overrun', value: result.meanOverrun > 0 ? formatINR(result.meanOverrun) : 'None' },
  ];
  for (const m of metrics) {
    const card = document.createElement('div');
    card.className = 'stress-metric-card';
    const lbl = document.createElement('div'); lbl.className = 'stress-metric-label'; lbl.textContent = m.label;
    const val = document.createElement('div'); val.className = 'stress-metric-value'; val.textContent = m.value;
    card.append(lbl, val);
    grid.appendChild(card);
  }
  container.appendChild(grid);

  const risk = document.createElement('div');
  risk.className = 'stress-risk-cats';
  const strong = document.createElement('strong'); strong.textContent = 'Top risk categories: ';
  risk.appendChild(strong);
  risk.appendChild(document.createTextNode(result.topRiskCategories.join(', ')));
  container.appendChild(risk);
}

// ── Trade-off studio ──────────────────────────────────────────────────────────
function renderTradeoffPanel(plan) {
  const catSelect = /** @type {HTMLSelectElement} */ ($('tradeoff-category'));
  if (!catSelect || !plan) return;
  catSelect.innerHTML = '';
  for (const cat of plan.budget.categories) {
    const opt = document.createElement('option');
    opt.value = cat.name;
    opt.textContent = `${cat.name} (${formatINR(cat.amount)})`;
    catSelect.appendChild(opt);
  }
  $('tradeoff-result').style.display = 'none';
}

function renderTradeoffResult(result, plan) {
  const container = $('tradeoff-result');
  if (!container || !plan) return;
  container.style.display = '';
  container.innerHTML = '';

  if (!result.feasible) {
    const warn = document.createElement('div');
    warn.className = 'tradeoff-infeasible';
    warn.textContent = '⚠️ Some categories would fall below their minimum floor at this boost level. Try a smaller amount.';
    container.appendChild(warn);
  }

  const maxBase = Math.max(...result.entries.map((e) => e.baseLine));

  for (const entry of result.entries) {
    const row = document.createElement('div');
    row.className = 'tradeoff-row';

    const nameEl = document.createElement('div'); nameEl.className = 'tradeoff-name'; nameEl.textContent = entry.name;
    const baseEl = document.createElement('div'); baseEl.className = 'tradeoff-base'; baseEl.textContent = formatINR(entry.baseLine);
    const adjEl  = document.createElement('div'); adjEl.className = 'tradeoff-adj';  adjEl.textContent = formatINR(entry.adjusted);
    const deltaEl= document.createElement('div');
    deltaEl.className = `tradeoff-delta ${entry.delta > 0 ? 'delta-pos' : entry.delta < 0 ? 'delta-neg' : ''}`;
    deltaEl.textContent = `${entry.delta > 0 ? '+' : ''}${formatINR(entry.delta)}`;

    const barWrap = document.createElement('div'); barWrap.className = 'tradeoff-bar-wrap';
    const bar = document.createElement('div'); bar.className = 'tradeoff-bar';
    const fill = document.createElement('div'); fill.className = 'tradeoff-bar-fill';
    fill.style.width = `${Math.round((entry.adjusted / maxBase) * 100)}%`;
    fill.style.background = entry.delta > 0 ? '#10b981' : entry.delta < 0 ? '#f59e0b' : '#8b5cf6';
    bar.appendChild(fill);
    barWrap.appendChild(bar);

    row.append(nameEl, baseEl, adjEl, deltaEl, barWrap);
    container.appendChild(row);
  }

  // Contingency footer
  const contRow = document.createElement('div');
  contRow.className = 'tradeoff-row';
  contRow.style.borderTop = '2px solid var(--border-color)';
  const cnL = document.createElement('div'); cnL.className = 'tradeoff-name'; cnL.textContent = 'Contingency Buffer';
  const cnB = document.createElement('div'); cnB.className = 'tradeoff-base'; cnB.textContent = formatINR(result.contingencyBefore);
  const cnA = document.createElement('div'); cnA.className = 'tradeoff-adj';  cnA.textContent = formatINR(result.contingencyAfter);
  const cnD = document.createElement('div'); cnD.className = 'tradeoff-delta'; cnD.textContent = '';
  contRow.append(cnL, cnB, cnA, cnD);
  container.appendChild(contRow);
}

// ── Quotes panel ──────────────────────────────────────────────────────────────
function renderQuotesPanel(plan) {
  const catSelect = /** @type {HTMLSelectElement} */ ($('quote-category'));
  if (!catSelect || !plan) return;
  catSelect.innerHTML = '';
  for (const cat of plan.budget.categories) {
    const opt = document.createElement('option');
    opt.value = cat.name;
    opt.textContent = `${cat.name} (${formatINR(cat.amount)})`;
    catSelect.appendChild(opt);
  }
}

function renderQuotesResult(result) {
  const container = $('quotes-result');
  if (!container) return;
  container.style.display = '';
  container.innerHTML = '';

  // Recommendation
  const rec = document.createElement('div');
  rec.className = 'quotes-recommendation';
  rec.textContent = result.recommendation;
  container.appendChild(rec);

  // Spread summary
  const spread = document.createElement('div');
  spread.className = 'quotes-spread-row';
  const items = [
    `Best: ${formatINR(result.bestPrice)}`,
    `Worst: ${formatINR(result.worstPrice)}`,
    `Spread: ${formatINR(result.spread)} (${result.spreadPct}%)`,
  ];
  for (const item of items) {
    const el = document.createElement('div');
    el.className = 'spread-item';
    el.textContent = item;
    spread.appendChild(el);
  }
  container.appendChild(spread);

  // Quote cards
  const sorted = [...result.quotes].sort((a, b) => a.rank - b.rank);
  for (const q of sorted) {
    const card = document.createElement('div');
    card.className = 'quote-rank-card';

    const badge = document.createElement('div');
    badge.className = `quote-rank-badge rank-${q.rank}`;
    badge.textContent = String(q.rank);

    const info = document.createElement('div');
    info.className = 'quote-vendor-info';
    const nameRow = document.createElement('div'); nameRow.className = 'vendor-name-row'; nameRow.textContent = q.vendorName;
    const floor   = document.createElement('div'); floor.className = 'vendor-floor'; floor.textContent = `Negotiate to: ${formatINR(q.negotiationFloor)}`;
    info.append(nameRow, floor);

    const priceCol = document.createElement('div');
    priceCol.className = 'quote-price-col';
    const priceMain = document.createElement('div'); priceMain.className = 'quote-price-main'; priceMain.textContent = formatINR(q.quotedPrice);
    const premium  = document.createElement('div');
    premium.className = q.overBudget ? 'quote-premium quote-overbudget' : 'quote-premium';
    premium.textContent = q.overBudget
      ? `₹${q.overBudgetBy.toLocaleString('en-IN')} over budget`
      : q.premiumOverBest > 0 ? `+${q.premiumOverBest}% vs best` : '✓ Best price';
    priceCol.append(priceMain, premium);

    card.append(badge, info, priceCol);
    container.appendChild(card);
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// HANDLERS
// ══════════════════════════════════════════════════════════════════════════════

function handleToggleTask(taskId) {
  store.toggleTask(taskId);
  if (store.plan) {
    renderHero(store.plan, store.completedTasks, ws.cardHero);
    if (activeTab === 'timeline') renderTimelineCard(store.plan, store.completedTasks, ws.cardTimeline, handleToggleTask);
    if (activeTab === 'vendors')  renderVendorCard(store.plan, store.completedTasks, ws.cardVendors, handleToggleTask);
  }
}

function handleWhatIfSlider(scenario) {
  if (!store.plan) return;
  try {
    currentWhatIfPreview = applyScenario(store.plan.inputs, scenario);
    renderWhatIfCard(store.plan, currentWhatIfPreview, ws.cardWhatif, handleWhatIfSlider, handleWhatIfApply, handleWhatIfReset);
  } catch (err) {
    console.warn('What-if error:', err);
  }
}

function handleWhatIfApply() {
  if (!currentWhatIfPreview) return;
  store.setInputs(currentWhatIfPreview.after.inputs);
  populateSidebarFromState();
  currentWhatIfPreview = null;
  updatePlan();
  announce('What-if adjustments applied.');
}

function handleWhatIfReset() {
  currentWhatIfPreview = null;
  if (store.plan) renderWhatIfCard(store.plan, null, ws.cardWhatif, handleWhatIfSlider, handleWhatIfApply, handleWhatIfReset);
}

async function handleShuffleIdeas() {
  if (!store.plan) return;
  const lang = getLanguage();
  const { ideas, source } = await getIdeas(store.plan.inputs, lang, store.plan);
  store.setIdeas(ideas);
  renderIdeasCard(ideas, source, ws.cardIdeas, handleShuffleIdeas);
  announce('New ideas generated.');
}

async function handleExportExcel() {
  if (!store.plan) return;
  try {
    const res = await fetch('/api/export/excel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(store.plan.inputs),
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `utsav-plan-${store.plan.inputs.date}.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
    announce('Excel file downloaded.');
  } catch {
    alert('Excel export failed – library may not be installed on server.');
  }
}

async function handleExportPdf() {
  if (!store.plan) return;
  try {
    const res = await fetch('/api/export/pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(store.plan.inputs),
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `utsav-plan-${store.plan.inputs.date}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
    announce('PDF file downloaded.');
  } catch {
    alert('PDF export failed – library may not be installed on server.');
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// WIZARD
// ══════════════════════════════════════════════════════════════════════════════
let _wizardStep = 1;

function goToWizardStep(n) {
  _wizardStep = n;
  wiz.step1.style.display = n === 1 ? '' : 'none';
  wiz.step2.style.display = n === 2 ? '' : 'none';
  wiz.progress.forEach((el) => {
    const step = parseInt(el.dataset.step || '1');
    el.classList.toggle('active', step === n);
    el.classList.toggle('done', step < n);
  });
}

function readWizardInputs() {
  const type = /** @type {HTMLInputElement} */ (
    document.querySelector('input[name="event-type"]:checked')
  )?.value || 'wedding';
  const vibe = /** @type {HTMLInputElement} */ (
    document.querySelector('input[name="event-vibe"]:checked')
  )?.value || 'Traditional';
  return {
    type: /** @type {'wedding'|'birthday'|'community'} */ (type),
    name: wiz.inputName?.value?.trim() || 'My Celebration',
    guests: Math.max(1, parseInt(wiz.inputGuests?.value || '200', 10)),
    budget: Math.max(10000, parseInt(wiz.inputBudget?.value || '500000', 10)),
    date: wiz.inputDate?.value || DEFAULT_INPUTS.date,
    vibe: /** @type {'Elegant'|'Fun'|'Traditional'|'Minimal'} */ (vibe),
    vegOnly: Boolean(wiz.toggleVeg?.checked),
  };
}

// ══════════════════════════════════════════════════════════════════════════════
// CHAT
// ══════════════════════════════════════════════════════════════════════════════

function toggleChatDrawer(open) {
  isChatOpen = open;
  if (chat.drawer && chat.backdrop) {
    if (open) {
      chat.drawer.classList.add('is-open');
      chat.backdrop.classList.add('is-open');
      chat.drawer.removeAttribute('inert');
      chat.input?.focus();
    } else {
      chat.drawer.classList.remove('is-open');
      chat.backdrop.classList.remove('is-open');
      chat.drawer.setAttribute('inert', '');
      chat.btnOpen?.focus();
    }
  }
}

async function handleSendChat(text) {
  if (!text?.trim() || !store.plan) return;
  const userText = text.trim();
  store.addChatMessage({ sender: 'user', text: userText });
  renderChatMessages(store.chatMessages, chat.messages, true);
  if (chat.input) chat.input.value = '';

  const lang = getLanguage();
  const res = await sendChatMessage(store.plan.inputs, userText, lang);
  store.addChatMessage({ sender: 'utsav', text: res.reply, source: res.source, diff: res.diff });
  renderChatMessages(store.chatMessages, chat.messages, false);
  announce(`Utsav replied: ${res.reply}`);

  if (res.diff?.length > 0 && res.scenario && Object.keys(res.scenario).length > 0) {
    try {
      currentWhatIfPreview = applyScenario(store.plan.inputs, res.scenario);
      if (activeTab === 'whatif') {
        renderWhatIfCard(store.plan, currentWhatIfPreview, ws.cardWhatif, handleWhatIfSlider, handleWhatIfApply, handleWhatIfReset);
      }
    } catch { /* ignore */ }
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// CONNECTION STATUS
// ══════════════════════════════════════════════════════════════════════════════

async function updateConnectionStatus() {
  const badge = $('connection-badge');
  if (!badge) return;
  if (!navigator.onLine) {
    badge.className = 'status-badge is-offline';
    badge.textContent = `⚡ ${t('offlineBadge')}`;
    return;
  }
  const { online, aiConfigured } = await checkServerHealth();
  if (!online) {
    badge.className = 'status-badge is-offline';
    badge.textContent = `⚡ ${t('offlineBadge')}`;
  } else if (aiConfigured) {
    badge.className = 'status-badge is-online';
    badge.textContent = '✨ Gemini Connected';
  } else {
    badge.className = 'status-badge is-rules';
    badge.textContent = '⚡ Local Rules';
  }
}

// ══════════════════════════════════════════════════════════════════════════════
// EVENT LISTENERS
// ══════════════════════════════════════════════════════════════════════════════

function setupEventListeners() {
  // Theme
  $('btn-theme-toggle')?.addEventListener('click', toggleTheme);

  // Language
  $('select-language')?.addEventListener('change', (e) => {
    setLanguage(/** @type {'en'|'hi'|'mr'} */ (/** @type {HTMLSelectElement} */ (e.target).value));
    if (store.plan) updatePlan();
  });

  // ── Home view ────────────────────────────────────────────────────────────
  $('btn-home')?.addEventListener('click', () => {
    showView('home');
    renderPlansGrid();
    window.location.hash = '#home';
  });

  $('btn-new-plan')?.addEventListener('click', () => {
    goToWizardStep(1);
    showView('wizard');
    window.location.hash = '#wizard';
    // Set default date to 6 months from now
    const sixMonths = new Date();
    sixMonths.setMonth(sixMonths.getMonth() + 6);
    if (wiz.inputDate) wiz.inputDate.value = sixMonths.toISOString().slice(0, 10);
  });

  // ── Wizard ────────────────────────────────────────────────────────────────
  $('btn-wizard-cancel')?.addEventListener('click', () => {
    showView('home');
    renderPlansGrid();
    window.location.hash = '#home';
  });

  $('btn-wizard-next')?.addEventListener('click', () => {
    const name = wiz.inputName?.value?.trim();
    const date = wiz.inputDate?.value;
    if (!name) { wiz.inputName?.focus(); return; }
    if (!date) { wiz.inputDate?.focus(); return; }
    goToWizardStep(2);
  });

  $('btn-wizard-back')?.addEventListener('click', () => goToWizardStep(1));

  $('btn-wizard-create')?.addEventListener('click', async () => {
    const inputs = readWizardInputs();
    createPlan(inputs);
    await openWorkspace(inputs);
    window.location.hash = '#workspace';
    announce(`Plan "${inputs.name}" created!`);
  });

  // ── Workspace tabs ────────────────────────────────────────────────────────
  ws.tabBtns.forEach((btn) => {
    btn.addEventListener('click', () => switchTab(/** @type {HTMLElement} */ (btn).dataset.tab || 'overview'));
  });

  // ── Sidebar quick-edit ────────────────────────────────────────────────────
  $('ws-form')?.addEventListener('input', debouncedUpdatePlan);

  // ── Export buttons ────────────────────────────────────────────────────────
  $('btn-export-excel')?.addEventListener('click', handleExportExcel);
  $('btn-export-pdf')?.  addEventListener('click', handleExportPdf);
  $('btn-export-ics')?.  addEventListener('click', () => {
    if (store.plan) { downloadCalendar(store.plan); announce('Calendar file downloaded.'); }
  });

  // ── Stress test ───────────────────────────────────────────────────────────
  $('btn-run-stress')?.addEventListener('click', () => {
    if (!store.plan) return;
    const result = runStressTest(store.plan.inputs, { simulations: 5000 });
    renderStressResult(result);
    announce(`Stress test complete: ${result.verdict}`);
  });

  // ── Trade-off ─────────────────────────────────────────────────────────────
  $('btn-compute-tradeoff')?.addEventListener('click', () => {
    if (!store.plan) return;
    const catEl   = /** @type {HTMLSelectElement} */ ($('tradeoff-category'));
    const amtEl   = /** @type {HTMLInputElement} */  ($('tradeoff-amount'));
    const cat     = catEl?.value;
    const amount  = parseInt(amtEl?.value || '50000', 10);
    if (!cat || isNaN(amount)) return;
    const result = computeTradeoff(store.plan.inputs, { boostCategory: cat, boostAmount: amount });
    renderTradeoffResult(result, store.plan);
    announce('Trade-off computed.');
  });

  // ── Quotes ────────────────────────────────────────────────────────────────
  $('btn-compare-quotes')?.addEventListener('click', () => {
    if (!store.plan) return;
    const catEl = /** @type {HTMLSelectElement} */ ($('quote-category'));
    const catName = catEl?.value;
    if (!catName) return;
    const catBudget = store.plan.budget.categories.find((c) => c.name === catName)?.amount || 0;

    const rows = document.querySelectorAll('.quote-row');
    const quotes = [];
    rows.forEach((row) => {
      const name  = /** @type {HTMLInputElement} */ (row.querySelector('.quote-name'))?.value?.trim();
      const price = parseFloat(/** @type {HTMLInputElement} */ (row.querySelector('.quote-price'))?.value || '');
      if (name && !isNaN(price) && price > 0) quotes.push({ vendorName: name, quotedPrice: price });
    });
    if (quotes.length === 0) return;
    const result = compareQuotes(catName, catBudget, quotes);
    renderQuotesResult(result);
    announce(`Quote comparison complete. Best: ${formatINR(result.bestPrice)}`);
  });

  // ── Chat ──────────────────────────────────────────────────────────────────
  chat.btnOpen?.  addEventListener('click', () => toggleChatDrawer(true));
  chat.btnClose?. addEventListener('click', () => toggleChatDrawer(false));
  chat.backdrop?. addEventListener('click', () => toggleChatDrawer(false));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && isChatOpen) toggleChatDrawer(false); });
  chat.form?.addEventListener('submit', (e) => { e.preventDefault(); handleSendChat(chat.input?.value || ''); });
  chat.chips?.addEventListener('click', (e) => {
    const chip = /** @type {HTMLElement|null} */ (/** @type {HTMLElement} */(e.target)?.closest('.chip-btn'));
    if (chip?.dataset.prompt) handleSendChat(chip.dataset.prompt);
  });

  // ── Online/offline ────────────────────────────────────────────────────────
  window.addEventListener('online', updateConnectionStatus);
  window.addEventListener('offline', updateConnectionStatus);
}

// ══════════════════════════════════════════════════════════════════════════════
// BOOT
// ══════════════════════════════════════════════════════════════════════════════

async function init() {
  initTheme();
  setupEventListeners();

  // Initial view based on hash
  const hash = window.location.hash;
  if (hash === '#workspace' && store.inputs) {
    showView('workspace');
    await openWorkspace(store.inputs);
  } else {
    showView('home');
    renderPlansGrid();
    window.location.hash = '#home';
  }

  await updateConnectionStatus();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
