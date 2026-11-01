/**
 * @file server/ai/fallback.js
 * @description Rule-based fallback for when Gemini is unavailable.
 * Guarantees the app works offline and without an API key.
 */

/** @typedef {import('../../shared/engine/index.js').UtsavPlan} UtsavPlan */
/** @typedef {import('../../shared/engine/whatif.js').WhatIfResult} WhatIfResult */

// ── Ideas pools ───────────────────────────────────────────────────────────────

const THEMES = {
  Elegant: {
    wedding: ['Gold and white royal banquet', 'Pastel floral garden ceremony', 'Midnight blue and silver soirée'],
    birthday: ['Vintage rose gold afternoon', 'Black-tie glamour evening', 'Ivory garden party'],
    community: ['Heritage cultural showcase', 'Evening gala with classical performances', 'Literary celebration night'],
  },
  Fun: {
    wedding: ['Bollywood nights extravaganza', 'Beach-meets-jungle fiesta', 'Carnival-of-colours baraat'],
    birthday: ['Retro Bollywood bash', 'Superhero adventure party', 'Neon glow dance night'],
    community: ['Street festival with food trucks', 'Sports day meets mela', 'Flash-mob surprise event'],
  },
  Traditional: {
    wedding: ['Rajasthani haveli ceremony', 'South Indian flower-decor shaadi', 'Marigold and earthen-lamp celebration'],
    birthday: ['Satyanarayan puja and feast', 'Halwa-prasad morning celebration', 'Grandparent-style family gathering'],
    community: ['Navratri garba night', 'Diwali mela with folk arts', 'Pongal harvest celebration'],
  },
  Minimal: {
    wedding: ['White and green garden micro-wedding', 'Terrace ceremony with 50 close guests', 'Farm-table intimate dinner'],
    birthday: ['Brunch with 20 friends', 'Book-and-chai afternoon gathering', 'Zero-waste green party'],
    community: ['Park clean-up and picnic', 'Book-exchange and chai stall', 'Simple neighbourhood dinner'],
  },
};

const MENU_IDEAS = {
  wedding: {
    veg: ['Chaat stalls + dal baati churma + rajasthani thali', 'South Indian grand feast with 12 items', 'Live paneer grill + biryani counter + dessert station'],
    nonVeg: ['Chicken handi + dal makhani + live grill', 'Kerala seafood feast + appam + payasam', 'Mughlai spread: biryani, kebabs, korma'],
  },
  birthday: {
    veg: ['Pizza + pasta buffet with a custom cake bar', 'Mini chaat party + pani puri counter', 'Sandwich and mocktail high-tea spread'],
    nonVeg: ['BBQ chicken + mac-and-cheese + custom cake', 'Chicken biryani + raita + gulab jamun bar', 'Fish-and-chips + coleslaw + dessert corner'],
  },
  community: {
    veg: ['Khichdi and kadhi langar style', 'Rajma-chawal + pickle + buttermilk', 'Poha + jalebi breakfast and lunch thali'],
    nonVeg: ['Mutton curry + bhakri + onion salad', 'Chicken rice + dal + papad', 'Egg curry + roti + kheer'],
  },
};

const ACTIVITIES = {
  Elegant: ['Live ghazal or classical music performance', 'Photo booth with heritage props', 'Curated cocktail/mocktail tasting hour'],
  Fun: ['DJ with Bollywood medley set', 'Flash-mob dance performance', 'Games zone: antakshari and dumb charades'],
  Traditional: ['Folk dance performance (garba/bhangra/bihu)', 'Mehendi and bangle stalls', 'Storytelling session by an elder'],
  Minimal: ['Acoustic musician or playlist DJ', 'Polaroid photo corner', 'Lawn games: cricket, badminton, frisbee'],
};

const BUDGET_HACKS = {
  Tight: [
    'Book a banquet hall for the afternoon slot—rates drop by 30–40% vs. evening.',
    'Order a central cake from a local bakery and display cupcakes around it to cut per-head dessert cost.',
    'Use artificial marigold strings for backdrop; save real flowers only for the main mandap or table centres.',
  ],
  Comfortable: [
    'Negotiate a combo deal: venue + in-house caterer usually gives 10–15% off both.',
    'Hire a student photographer for candid shots and book a professional only for key ceremonies.',
    'Opt for digital invites on WhatsApp; spend the printing budget on a surprise dessert counter instead.',
  ],
  Generous: [
    'Pre-pay vendors in full for a 5–8% discount and better priority on the day.',
    'Add a live counter (kulfi, chaat, or paan) as a talking point—guests remember experiences more than quantities.',
    'Allocate ₹500 per head extra to the experience (live music or photo booth) rather than upgrading food that is already good.',
  ],
};

const DECOR_TIPS = {
  Elegant: ['Use tall white orchid centrepieces with gold candle holders for a grand but clean look.', 'Drape sheer ivory fabric over entrances; add spot lighting to create a luxury corridor effect.'],
  Fun: ['Balloon garlands in bold colours framing the stage cost 60% less than floral arches.', 'Hang fairy lights and paper lanterns from a canopy—festive, photogenic and affordable.'],
  Traditional: ['Marigold and rose petal rangoli at the entrance sets the tone for under ₹500.', 'Terracotta diyas lining the pathways are cheap, eco-friendly and deeply traditional.'],
  Minimal: ['A single statement floral installation (one corner) is more impactful than scattered decor everywhere.', 'Use potted plants as centrepieces—guests can take them home as return gifts.'],
};

// ── Regex scenario parser ──────────────────────────────────────────────────────

/**
 * Parse a plain-English what-if message into a structured scenario.
 * @param {string} message
 * @returns {{intent:'whatif'|'explain'|'vendorQuestion'|'other', scenario: import('../../shared/engine/whatif.js').WhatIfScenario}}
 */
export function parseScenario(message) {
  const m = message.toLowerCase();
  /** @type {import('../../shared/engine/whatif.js').WhatIfScenario} */
  const scenario = {};
  /** @type {'whatif'|'explain'|'vendorQuestion'|'other'} */
  let intent = 'other';

  // Budget percentage change
  const budgetPctMatch = m.match(/(?:cut|reduce|decrease)\s+budget\s+(?:by\s+)?(\d+)\s*%/);
  const budgetPctIncMatch = m.match(/(?:increase|raise|boost)\s+budget\s+(?:by\s+)?(\d+)\s*%/);
  const budgetSetLakh = m.match(/(?:set|change|make)\s+budget\s+(?:to\s+)?(\d+(?:\.\d+)?)\s*lakh/);
  const budgetSetK = m.match(/(?:set|change|make)\s+budget\s+(?:to\s+)?(\d+)\s*k/);
  const budgetSetExact = m.match(/(?:set|change|make)\s+budget\s+(?:to\s+)?₹?\s*(\d[\d,]*)/);

  if (budgetPctMatch) { scenario.budgetPct = -parseInt(budgetPctMatch[1]); intent = 'whatif'; }
  else if (budgetPctIncMatch) { scenario.budgetPct = parseInt(budgetPctIncMatch[1]); intent = 'whatif'; }
  else if (budgetSetLakh) { scenario.budgetSet = Math.round(parseFloat(budgetSetLakh[1]) * 100000); intent = 'whatif'; }
  else if (budgetSetK) { scenario.budgetSet = parseInt(budgetSetK[1]) * 1000; intent = 'whatif'; }
  else if (budgetSetExact) { scenario.budgetSet = parseInt(budgetSetExact[1].replace(/,/g, '')); intent = 'whatif'; }

  // Guest changes
  const addGuestsMatch = m.match(/(?:add|invite)\s+(\d+)\s+(?:more\s+)?guests?/);
  const removeGuestsMatch = m.match(/(?:remove|cut)\s+(\d+)\s+guests?/);
  const setGuestsMatch = m.match(/(?:set|change)\s+guests?\s+(?:to\s+)?(\d+)/);

  if (addGuestsMatch) { scenario.guestsDelta = parseInt(addGuestsMatch[1]); intent = 'whatif'; }
  else if (removeGuestsMatch) { scenario.guestsDelta = -parseInt(removeGuestsMatch[1]); intent = 'whatif'; }
  else if (setGuestsMatch) { scenario.guestsSet = parseInt(setGuestsMatch[1]); intent = 'whatif'; }

  // Veg only
  if (/(?:make|go|switch)\s+(?:it\s+)?vegetarian|veg\s+only/.test(m)) {
    scenario.vegOnly = true; intent = 'whatif';
  }
  if (/non.?veg/.test(m)) { scenario.vegOnly = false; intent = 'whatif'; }

  // Vibe
  for (const vibe of ['Elegant', 'Fun', 'Traditional', 'Minimal']) {
    if (m.includes(vibe.toLowerCase())) {
      scenario.vibeSet = /** @type {'Elegant'|'Fun'|'Traditional'|'Minimal'} */ (vibe);
      intent = 'whatif';
    }
  }

  // Date change
  const dateMatch = m.match(/(?:move|change|set).*?(?:to\s+)?(\d{4}-\d{2}-\d{2})/);
  if (dateMatch) { scenario.dateSet = dateMatch[1]; intent = 'whatif'; }

  // Explain or vendor question
  if (/(?:explain|what is|why|how much|breakdown)/.test(m)) intent = 'explain';
  if (/(?:vendor|caterer|photographer|decorator|venue|book)/.test(m)) intent = 'vendorQuestion';

  return { intent, scenario };
}

/**
 * Generate fallback ideas for when Gemini is unavailable.
 * @param {UtsavPlan} plan
 * @param {string} lang - 'en'|'hi'|'mr'
 * @returns {import('../ai/schemas.js').IdeasResponse}
 */
export function fallbackIdeas(plan, lang) {
  const { inputs, feasibility } = plan;
  const { type, vibe, vegOnly } = inputs;
  const tier = /** @type {'Tight'|'Comfortable'|'Generous'} */ (feasibility.tier);

  const themePool = THEMES[vibe]?.[type] ?? THEMES.Fun.birthday;
  const menuPool = vegOnly ? MENU_IDEAS[type]?.veg : MENU_IDEAS[type]?.nonVeg;
  const menuFinal = menuPool ?? MENU_IDEAS.birthday.veg;

  return {
    themes: themePool.slice(0, 3),
    menuIdeas: menuFinal.slice(0, 3),
    activities: (ACTIVITIES[vibe] ?? ACTIVITIES.Fun).slice(0, 3),
    budgetHacks: (BUDGET_HACKS[tier] ?? BUDGET_HACKS.Comfortable).slice(0, 3),
    decorTips: (DECOR_TIPS[vibe] ?? DECOR_TIPS.Fun).slice(0, 2),
    languageUsed: lang,
  };
}

/**
 * Generate a template narration from the diff when Gemini narration fails the guard.
 * @param {WhatIfResult} whatIfResult
 * @returns {string}
 */
export function templateNarration(whatIfResult) {
  const { diff, after } = whatIfResult;
  const parts = [];

  const budgetChange = diff.find((d) => d.field === 'budget');
  const guestChange = diff.find((d) => d.field === 'guests');
  const tierChange = diff.find((d) => d.field === 'feasibility.tier');

  if (budgetChange) {
    const dir = Number(budgetChange.delta) > 0 ? 'increased' : 'decreased';
    parts.push(`Budget ${dir} from ₹${Number(budgetChange.before).toLocaleString('en-IN')} to ₹${Number(budgetChange.after).toLocaleString('en-IN')}.`);
  }
  if (guestChange) {
    const dir = Number(guestChange.delta) > 0 ? 'increased' : 'decreased';
    parts.push(`Guest count ${dir} from ${guestChange.before} to ${guestChange.after}.`);
  }
  if (tierChange) {
    parts.push(`Catering feasibility changed from ${tierChange.before} to ${tierChange.after}.`);
  }

  if (after.feasibility.tier === 'Tight' && after.feasibility.maxGuestsThatFit !== undefined) {
    parts.push(`At this budget, the caterer can comfortably serve ${after.feasibility.maxGuestsThatFit} guests.`);
  }

  if (parts.length === 0) {
    parts.push('Your scenario has been applied. Review the updated plan above.');
  }

  return parts.join(' ');
}
