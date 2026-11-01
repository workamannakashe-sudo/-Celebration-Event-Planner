/**
 * @file server/routes/ideas.js
 * @description POST /api/ideas – personalised ideas via Gemini, with fallback.
 */

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { aiRateLimit } from '../middleware/rateLimit.js';
import { IdeasRequestSchema, IdeasResponseSchema } from '../ai/schemas.js';
import { computePlan } from '../../shared/engine/index.js';
import { callGemini } from '../ai/gemini.js';
import { buildIdeasPrompt } from '../ai/prompts.js';
import { fallbackIdeas } from '../ai/fallback.js';
import { sendError } from '../util/errors.js';
import { logger } from '../util/logger.js';

const router = Router();

/** Gemini JSON schema for ideas */
const IDEAS_SCHEMA = {
  type: 'object',
  properties: {
    themes: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
    menuIdeas: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
    activities: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
    budgetHacks: { type: 'array', items: { type: 'string' }, minItems: 3, maxItems: 3 },
    decorTips: { type: 'array', items: { type: 'string' }, minItems: 2, maxItems: 2 },
    languageUsed: { type: 'string' },
  },
  required: ['themes', 'menuIdeas', 'activities', 'budgetHacks', 'decorTips', 'languageUsed'],
};

router.post('/', aiRateLimit, validate(IdeasRequestSchema), async (req, res) => {
  const { inputs, lang } = req.body;

  let plan;
  try {
    plan = computePlan(inputs);
  } catch (err) {
    if (err.message?.includes('future')) {
      return sendError(res, 422, 'DATE_IN_PAST', 'Event date must be in the future');
    }
    return sendError(res, 500, 'ENGINE_ERROR', 'Failed to compute plan');
  }

  // Try Gemini
  if (process.env.GEMINI_API_KEY) {
    try {
      const prompt = buildIdeasPrompt(plan, lang);
      const raw = await callGemini({
        prompt,
        responseSchema: IDEAS_SCHEMA,
        temperature: 0.4,
        cacheInput: { inputs, lang },
      });

      const validated = IdeasResponseSchema.safeParse(raw);
      if (validated.success) {
        return res.json({ ...validated.data, source: 'ai' });
      }
      logger.warn('Gemini ideas response failed Zod validation – using fallback', { errors: validated.error.errors });
    } catch (err) {
      logger.warn('Gemini ideas call failed – using fallback', { reason: err.message });
    }
  }

  // Fallback
  const ideas = fallbackIdeas(plan, lang);
  res.json({ ...ideas, source: 'fallback' });
});

export default router;
