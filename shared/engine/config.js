/**
 * @file config.js
 * @description Central configuration constants for the Utsav planning engine.
 * All budget weights, vibe multipliers, feasibility thresholds, and timeline
 * milestones live here so they can be imported by both server and browser.
 */

/** @typedef {'wedding'|'birthday'|'community'} BaseEventType */
/** @typedef {'wedding'|'birthday'|'community'|'anniversary'|'mundan'|'housewarming'|'general'} EventType */
/** @typedef {'Elegant'|'Fun'|'Traditional'|'Minimal'} BaseVibe */
/** @typedef {'Elegant'|'Fun'|'Traditional'|'Minimal'|'Contemporary'|'Royal'|'Minimalist'} Vibe */

/**
 * Base budget weight vectors per event type.
 * Keys are category display names; values are raw weights (normalised later).
 * @type {Record<BaseEventType, Record<string,number>>}
 */
export const BASE_WEIGHTS = {
  wedding: {
    'Venue': 22,
    'Catering': 32,
    'Decor & Flowers': 12,
    'Photo & Video': 10,
    'Attire & Beauty': 9,
    'Music & Entertainment': 6,
    'Invites & Stationery': 3,
    'Logistics & Stay': 6,
  },
  birthday: {
    'Venue': 20,
    'Catering': 35,
    'Decor & Balloons': 14,
    'Cake & Desserts': 9,
    'Entertainment': 12,
    'Invites & Return Gifts': 6,
    'Photo & Video': 4,
  },
  community: {
    'Venue & Permissions': 15,
    'Food & Water': 28,
    'Stage, Sound & AV': 18,
    'Decor & Signage': 8,
    'Marketing & Printing': 9,
    'Volunteers & Safety': 10,
    'Entertainment': 7,
  },
};

/**
 * Vibe multipliers: pattern => scale factor.
 * The pattern is matched case-insensitively against the category name.
 * @type {Record<BaseVibe, Array<{pattern:RegExp, factor:number}>>}
 */
export const VIBE_MULTIPLIERS = {
  Elegant: [
    { pattern: /decor|venue/i, factor: 1.2 },
    { pattern: /catering|food/i, factor: 0.9 },
  ],
  Fun: [
    { pattern: /entertainment|music|stage/i, factor: 1.4 },
    { pattern: /decor/i, factor: 0.9 },
  ],
  Traditional: [
    { pattern: /decor|attire|catering|food/i, factor: 1.1 },
    { pattern: /entertainment|stage|music/i, factor: 0.85 },
  ],
  Minimal: [
    { pattern: /decor|invites|photo|marketing/i, factor: 0.7 },
    { pattern: /catering|food/i, factor: 1.12 },
  ],
};

/** Fraction of total budget reserved as contingency */
export const CONTINGENCY_FRACTION = 0.08;

/** Reduction applied to catering amount when vegOnly is true */
export const VEG_ONLY_CATERING_REDUCTION = 0.08;

/**
 * Minimum per-head catering spend (INR) by event type.
 * @type {Record<BaseEventType, number>}
 */
export const CATERING_MIN_PER_HEAD = {
  wedding: 900,
  birthday: 450,
  community: 250,
};

/** Per-head multiplier above which tier becomes 'Generous' */
export const GENEROUS_MULTIPLIER = 1.8;

/**
 * Ideal planning lead time in weeks per event type.
 * @type {Record<BaseEventType, number>}
 */
export const IDEAL_LEAD_WEEKS = {
  wedding: 26,
  birthday: 6,
  community: 10,
};

/**
 * Timeline milestones per event type.
 * Each milestone has weeks-before-event and a task description.
 * @type {Record<BaseEventType, Array<{weeksBefore:number, task:string}>>}
 */
export const MILESTONES = {
  wedding: [
    { weeksBefore: 26, task: 'Lock budget, guest list and date' },
    { weeksBefore: 24, task: 'Book venue and caterer' },
    { weeksBefore: 20, task: 'Book photographer and decorator' },
    { weeksBefore: 14, task: 'Send invitations' },
    { weeksBefore: 10, task: 'Finalise attire' },
    { weeksBefore: 6, task: 'Menu tasting and music brief' },
    { weeksBefore: 3, task: 'Reconfirm vendors and RSVPs' },
    { weeksBefore: 1, task: 'Run-through and final payments' },
    { weeksBefore: 0, task: 'Event day 🎉' },
  ],
  birthday: [
    { weeksBefore: 6, task: 'Fix theme and guest list' },
    { weeksBefore: 5, task: 'Book venue and entertainer' },
    { weeksBefore: 3, task: 'Send invitations' },
    { weeksBefore: 2, task: 'Order cake and decor' },
    { weeksBefore: 1, task: 'Confirm RSVPs and finalise menu' },
    { weeksBefore: 0, task: 'Party time 🎂' },
  ],
  community: [
    { weeksBefore: 10, task: 'Define purpose, budget and committee' },
    { weeksBefore: 8, task: 'Book venue and obtain permissions' },
    { weeksBefore: 6, task: 'Open volunteer sign-ups' },
    { weeksBefore: 4, task: 'Finalise sound, stage and caterer' },
    { weeksBefore: 3, task: 'Release posters and social media' },
    { weeksBefore: 1, task: 'Safety walk-through and briefing' },
    { weeksBefore: 0, task: 'Event day 🎪' },
  ],
};

/**
 * "Ask before booking" questions per category name pattern.
 * Matched case-insensitively.
 * @type {Array<{pattern:RegExp, question:string}>}
 */
export const VENDOR_QUESTIONS = [
  { pattern: /venue/i, question: 'Can you hold the date for 48 hours? Is there a power backup and what is the overtime fee?' },
  { pattern: /catering|food|caterer/i, question: 'Do you offer a free tasting? What is the per-plate rate and can you set up live counters?' },
  { pattern: /decor|balloon|flower/i, question: 'Can you share a 3D mock-up? Who handles teardown and where do you source flowers?' },
  { pattern: /photo|video/i, question: 'What are the deliverables and edit timeline? Do you carry a backup shooter or camera?' },
  { pattern: /sound|av|stage/i, question: 'Is there a backup power source? What time do you need for setup?' },
  { pattern: /permission|noc/i, question: 'Does the venue handle fire and police NOC, or do we apply separately?' },
  { pattern: /music|entertainment/i, question: 'What is the set duration and do you take breaks? Can you share a recent set list?' },
  { pattern: /attire|beauty/i, question: 'What is the trial timeline and how many alterations are included?' },
  { pattern: /logistics|stay|transport/i, question: 'Do you offer a group-booking discount and what is the cancellation policy?' },
  { pattern: /invites|stationery|marketing|printing/i, question: 'What is the lead time for printing and do you handle digital versions too?' },
  { pattern: /volunteer|safety/i, question: 'What background checks or training are required for volunteers?' },
  { pattern: /cake|dessert/i, question: 'Can we taste before we finalise and how much notice do you need for custom designs?' },
];
