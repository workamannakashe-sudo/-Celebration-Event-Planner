/**
 * @file server/ai/schemas.js
 * @description Zod schemas for API request validation and AI response validation.
 */

import { z } from 'zod';

// ── Input schema ─────────────────────────────────────────────────────────────

const EventTypeEnum = z.enum(['wedding', 'birthday', 'community']);
const VibeEnum = z.enum(['Elegant', 'Fun', 'Traditional', 'Minimal']);
const LangEnum = z.enum(['en', 'hi', 'mr']).default('en');

/** ISO date validator: must be YYYY-MM-DD and in the future */
const FutureDateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD')
  .refine((d) => {
    const date = new Date(`${d  }T00:00:00`);
    return date > new Date();
  }, 'Event date must be in the future');

export const PlanInputsSchema = z
  .object({
    type: EventTypeEnum,
    name: z.string().min(1).max(100).transform((s) => s.replace(/[<>"'`]/g, '').trim()),
    guests: z.number().int().min(1).max(5000),
    budget: z.number().int().min(10000).max(100_000_000),
    date: FutureDateString,
    vibe: VibeEnum,
    vegOnly: z.boolean().default(false),
  })
  .strict(); // reject unknown keys

export const PlanRequestSchema = PlanInputsSchema;

export const IdeasRequestSchema = z
  .object({
    inputs: PlanInputsSchema,
    lang: LangEnum,
  })
  .strict();

/** Scenario for what-if */
const ScenarioSchema = z
  .object({
    budgetPct: z.number().min(-90).max(200).optional(),
    budgetSet: z.number().min(10000).max(100_000_000).optional(),
    guestsDelta: z.number().int().min(-4999).max(4999).optional(),
    guestsSet: z.number().int().min(1).max(5000).optional(),
    dateSet: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .optional(),
    vibeSet: VibeEnum.optional(),
    vegOnly: z.boolean().optional(),
  })
  .optional()
  .default({});

export const ChatRequestSchema = z
  .object({
    inputs: PlanInputsSchema,
    message: z.string().min(1).max(500),
    lang: LangEnum,
    scenario: ScenarioSchema,
  })
  .strict();

// ── AI response schemas ───────────────────────────────────────────────────────

export const IdeasResponseSchema = z.object({
  themes: z.array(z.string()).length(3),
  menuIdeas: z.array(z.string()).length(3),
  activities: z.array(z.string()).length(3),
  budgetHacks: z.array(z.string()).length(3),
  decorTips: z.array(z.string()).length(2),
  languageUsed: z.string(),
});

export const ChatParseSchema = z.object({
  intent: z.enum(['whatif', 'explain', 'vendorQuestion', 'other']),
  scenario: ScenarioSchema,
});

/** @typedef {z.infer<typeof IdeasResponseSchema>} IdeasResponse */
/** @typedef {z.infer<typeof ChatParseSchema>} ChatParse */
/** @typedef {z.infer<typeof PlanInputsSchema>} PlanInputs */
