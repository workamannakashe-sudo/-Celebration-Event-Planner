/**
 * @file server/routes/chat.js
 * @description POST /api/chat – two-step what-if chat assistant.
 * Step 1: parse user message to scenario (Gemini or regex fallback)
 * Step 2: run engine, then narrate (Gemini or template fallback)
 */

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { aiRateLimit } from '../middleware/rateLimit.js';
import { ChatRequestSchema, ChatParseSchema } from '../ai/schemas.js';
import { applyScenario } from '../../shared/engine/whatif.js';
import { callGemini } from '../ai/gemini.js';
import { buildChatParsePrompt, buildNarrationPrompt, sanitiseUserText } from '../ai/prompts.js';
import { parseScenario, templateNarration } from '../ai/fallback.js';
import { narrationIsClean } from '../ai/guard.js';
import { sendError } from '../util/errors.js';
import { logger } from '../util/logger.js';

const router = Router();

/** JSON schema for Gemini parse step */
const PARSE_SCHEMA = {
  type: 'object',
  properties: {
    intent: { type: 'string', enum: ['whatif', 'explain', 'vendorQuestion', 'other'] },
    scenario: {
      type: 'object',
      properties: {
        budgetPct: { type: 'number' },
        budgetSet: { type: 'number' },
        guestsDelta: { type: 'integer' },
        guestsSet: { type: 'integer' },
        dateSet: { type: 'string' },
        vibeSet: { type: 'string' },
        vegOnly: { type: 'boolean' },
      },
    },
  },
  required: ['intent'],
};

router.post('/', aiRateLimit, validate(ChatRequestSchema), async (req, res) => {
  const { inputs, message, lang, scenario: explicitScenario } = req.body;
  const safeMessage = sanitiseUserText(message, 500);

  let intent = 'whatif';
  let scenario = explicitScenario || {};
  let source = 'fallback';

  // Step 1: Parse message into scenario
  if (process.env.GEMINI_API_KEY) {
    try {
      const parsePrompt = buildChatParsePrompt(safeMessage, lang);
      const raw = await callGemini({
        prompt: parsePrompt,
        responseSchema: PARSE_SCHEMA,
        temperature: 0.1,
        cacheInput: { parseMsg: safeMessage, lang },
      });
      const validated = ChatParseSchema.safeParse(raw);
      if (validated.success) {
        intent = validated.data.intent;
        scenario = { ...scenario, ...validated.data.scenario };
        source = 'ai';
      }
    } catch (err) {
      logger.warn('Gemini parse step failed – using regex fallback', { reason: err.message });
    }
  }

  // Regex fallback for parsing
  if (source !== 'ai' || Object.keys(scenario).length === 0) {
    const parsed = parseScenario(safeMessage);
    intent = parsed.intent;
    scenario = { ...scenario, ...parsed.scenario };
  }

  // Step 2: Run engine
  let whatIfResult;
  try {
    whatIfResult = applyScenario(inputs, scenario);
  } catch {
    // If date changed and is invalid, compute without date change
    try {
      const { dateSet: _d, ...safeScenario } = scenario;
      whatIfResult = applyScenario(inputs, safeScenario);
    } catch {
      return sendError(res, 422, 'ENGINE_ERROR', 'Could not apply scenario to plan');
    }
  }

  // Step 3: Narrate
  let reply = templateNarration(whatIfResult);

  if (process.env.GEMINI_API_KEY && source === 'ai') {
    try {
      const narratePrompt = buildNarrationPrompt(whatIfResult, lang);
      const raw = await callGemini({
        prompt: narratePrompt,
        responseSchema: { type: 'object', properties: { narration: { type: 'string' } }, required: ['narration'] },
        temperature: 0.1,
        cacheInput: { whatifDiff: whatIfResult.diff, lang },
      });
      const narration = typeof raw === 'string' ? raw : (raw && typeof raw === 'object' && 'narration' in raw ? String(raw.narration) : undefined);
      if (narration && narrationIsClean(narration, whatIfResult.diff)) {
        reply = narration;
      } else {
        logger.warn('Narration failed guard check – using template', {});
        source = 'fallback';
      }
    } catch (err) {
      logger.warn('Gemini narration step failed – using template', { reason: err.message });
      source = 'fallback';
    }
  }

  res.json({
    reply,
    intent,
    scenario,
    diff: whatIfResult.diff,
    after: whatIfResult.after,
    source,
  });
});

export default router;
