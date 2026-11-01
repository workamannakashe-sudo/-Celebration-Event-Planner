/**
 * @file frontend/js/api.js
 * @description API client for Utsav endpoints with graceful offline fallback.
 * Uses the shared engine directly in the browser when offline or when network requests fail.
 */

import { computePlan } from '../../shared/engine/index.js';
import { applyScenario } from '../../shared/engine/whatif.js';

/**
 * Check if the backend server is reachable and if AI is configured.
 * @returns {Promise<{ online: boolean, aiConfigured: boolean }>}
 */
export async function checkServerHealth() {
  try {
    const res = await fetch('/api/health', { method: 'GET', signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { online: false, aiConfigured: false };
    const data = await res.json();
    return { online: true, aiConfigured: Boolean(data.aiConfigured) };
  } catch {
    return { online: false, aiConfigured: false };
  }
}

/**
 * Fetch plan from /api/plan or compute locally via shared engine if offline.
 * @param {import('../../shared/engine/index.js').PlanInputs} inputs
 * @returns {Promise<{ plan: import('../../shared/engine/index.js').UtsavPlan, source: 'server'|'offline' }>}
 */
export async function getPlan(inputs) {
  try {
    const res = await fetch('/api/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inputs),
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      return { plan: data.plan || data, source: 'server' };
    }
  } catch {
    // Fall back to client-side engine execution
  }

  // Offline client-side pure calculation
  const plan = computePlan(inputs);
  return { plan, source: 'offline' };
}

/**
 * Fetch creative ideas from /api/ideas or generate local fallback ideas.
 * @param {import('../../shared/engine/index.js').PlanInputs} inputs
 * @param {'en'|'hi'|'mr'} lang
 * @param {import('../../shared/engine/index.js').UtsavPlan} plan
 * @returns {Promise<{ ideas: any, source: 'ai'|'fallback'|'offline' }>}
 */
export async function getIdeas(inputs, lang, plan) {
  try {
    const res = await fetch('/api/ideas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs, lang }),
      signal: AbortSignal.timeout(14000),
    });
    if (res.ok) {
      const data = await res.json();
      return { ideas: data.ideas || data, source: data.source || 'ai' };
    }
  } catch {
    // Offline or network error
  }

  // Local fallback generation
  const localIdeas = generateLocalIdeas(plan, lang);
  return { ideas: localIdeas, source: 'offline' };
}

/**
 * Send chat message to /api/chat or run what-if engine locally with regex parser.
 * @param {import('../../shared/engine/index.js').PlanInputs} inputs
 * @param {string} message
 * @param {'en'|'hi'|'mr'} lang
 * @param {import('../../shared/engine/whatif.js').WhatIfScenario} [clientScenario]
 * @returns {Promise<{ reply: string, scenario: any, diff: any, source: 'ai'|'fallback'|'offline' }>}
 */
export async function sendChatMessage(inputs, message, lang, clientScenario = {}) {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ inputs, message, lang, scenario: clientScenario }),
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const data = await res.json();
      return {
        reply: data.reply,
        scenario: data.scenario,
        diff: data.diff,
        source: data.source || 'ai',
      };
    }
  } catch {
    // Offline fallback
  }

  // Local scenario parse + engine run + template narration
  const parsed = parseLocalScenario(message);
  const whatIfResult = applyScenario(inputs, parsed.scenario);
  const reply = generateLocalNarration(whatIfResult, message);

  return {
    reply,
    scenario: parsed.scenario,
    diff: whatIfResult.diff,
    source: 'offline',
  };
}

/**
 * Offline client-side rule-based ideas generator.
 * @param {import('../../shared/engine/index.js').UtsavPlan} plan
 * @param {'en'|'hi'|'mr'} _lang
 */
function generateLocalIdeas(plan, _lang) {
  const { inputs, feasibility } = plan;
  const isVeg = inputs.vegOnly;

  const themes = {
    wedding: ['Marigold & Brass heritage decor', 'Rose quartz & fairy light glow', 'Royal Rajasthani court styling'],
    birthday: ['Bollywood star theme', 'Carnival & balloon arch celebration', 'Retro arcade & neon vibes'],
    community: ['Cultural heritage mela', 'Eco-friendly Green Utsav', 'Unity & festive food fair'],
  };

  const menus = {
    veg: ['Dal Makhani, Paneer Lababdar, Live Amritsari Kulcha, Gulab Jamun with Rabdi', 'South Indian mini tiffin live counter, Avial, Mysore Pak', 'Street chaat counter: Pani Puri, Sev Puri, Dahi Bhalla'],
    nonVeg: ['Butter Chicken, Paneer Tikka, Dum Biryani, Shahi Tukda', 'Mutton Rogan Josh, Tandoori starters, Kulfi', 'Coastal Fish Curry, Chicken Chettinad, Malabar Parotta'],
  };

  const hacks = [
    `With ₹${inputs.budget.toLocaleString('en-IN')}, lock the venue on a Friday or weekday to save 15-20%.`,
    'Use seasonal local flowers (genda, mogra) instead of imported lilies to halve decoration spend.',
    'Consolidate photo and videography under one studio package to gain complimentary aerial drone shoots.',
  ];

  return {
    themes: themes[inputs.type] || themes.wedding,
    menuIdeas: isVeg ? menus.veg : menus.nonVeg,
    activities: ['Live acoustic shehnai/violin fusion welcome', 'Interactive family digital trivia quiz', 'Polaroid guestbook signing station'],
    budgetHacks: hacks,
    decorTips: [
      'Focus dramatic lighting and flowers primarily on the main entrance and stage where photographs happen.',
      'Rent warm fairy light curtains and brass diyas for high-impact visual elegance at minimal rental cost.',
    ],
    languageUsed: 'en',
    feasibilityTier: feasibility.tier,
  };
}

/**
 * Offline regex parser for scenario intents.
 * @param {string} message
 */
function parseLocalScenario(message) {
  const m = message.toLowerCase();
  /** @type {import('../../shared/engine/whatif.js').WhatIfScenario} */
  const scenario = {};
  let intent = 'other';

  const budgetPctMatch = m.match(/(?:cut|reduce|decrease)\s+budget\s+(?:by\s+)?(\d+)\s*%/);
  const budgetIncMatch = m.match(/(?:increase|raise|boost)\s+budget\s+(?:by\s+)?(\d+)\s*%/);
  const budgetSetLakh = m.match(/(?:set|change|make)\s+budget\s+(?:to\s+)?(\d+(?:\.\d+)?)\s*lakh/);

  if (budgetPctMatch) { scenario.budgetPct = -parseInt(budgetPctMatch[1]); intent = 'whatif'; }
  else if (budgetIncMatch) { scenario.budgetPct = parseInt(budgetIncMatch[1]); intent = 'whatif'; }
  else if (budgetSetLakh) { scenario.budgetSet = Math.round(parseFloat(budgetSetLakh[1]) * 100000); intent = 'whatif'; }

  const addGuestsMatch = m.match(/(?:add|invite)\s+(\d+)\s+(?:more\s+)?guests?/);
  const removeGuestsMatch = m.match(/(?:remove|cut)\s+(\d+)\s+guests?/);
  const setGuestsMatch = m.match(/(?:set|change)\s+guests?\s+(?:to\s+)?(\d+)/);

  if (addGuestsMatch) { scenario.guestsDelta = parseInt(addGuestsMatch[1]); intent = 'whatif'; }
  else if (removeGuestsMatch) { scenario.guestsDelta = -parseInt(removeGuestsMatch[1]); intent = 'whatif'; }
  else if (setGuestsMatch) { scenario.guestsSet = parseInt(setGuestsMatch[1]); intent = 'whatif'; }

  if (/vegetarian|veg\s+only/.test(m)) { scenario.vegOnly = true; intent = 'whatif'; }
  if (/non.?veg/.test(m)) { scenario.vegOnly = false; intent = 'whatif'; }

  return { intent, scenario };
}

/**
 * Offline template narrator based strictly on what-if diff.
 * @param {import('../../shared/engine/whatif.js').WhatIfResult} whatIfResult
 * @param {string} originalQuery
 */
function generateLocalNarration(whatIfResult, originalQuery) {
  const { diff, after } = whatIfResult;
  if (!diff || diff.length === 0) {
    if (/caterer|food|menu/i.test(originalQuery)) {
      return `For your catering, always ask about live counter setup costs, tasting sessions, and whether plates include service staff before paying an advance.`;
    }
    if (/photographer|video/i.test(originalQuery)) {
      return `For photography, reconfirm deliverables: how many edited high-res photos, video teaser delivery deadline (under 30 days), and whether raw footage is included.`;
    }
    return `Plan looks solid! Total budget is ₹${after.budget.totalBudget.toLocaleString('en-IN')} for ${after.inputs.guests} guests (catering feasibility: ${after.feasibility.tier}).`;
  }

  const parts = [];
  const bDiff = diff.find((d) => d.field === 'budget');
  if (bDiff) {
    const sign = Number(bDiff.delta) > 0 ? '+' : '';
    parts.push(`Budget updated to ₹${bDiff.after.toLocaleString('en-IN')} (${sign}₹${bDiff.delta.toLocaleString('en-IN')})`);
  }

  const gDiff = diff.find((d) => d.field === 'guests');
  if (gDiff) {
    const sign = Number(gDiff.delta) > 0 ? '+' : '';
    parts.push(`Guests adjusted to ${gDiff.after} (${sign}${gDiff.delta})`);
  }

  const tierDiff = diff.find((d) => d.field === 'feasibilityTier');
  if (tierDiff) {
    parts.push(`Feasibility changed from ${tierDiff.before} to ${tierDiff.after}`);
  }

  parts.push(`New contingency buffer is ₹${after.budget.contingency.toLocaleString('en-IN')}.`);
  return parts.join('. ');
}
