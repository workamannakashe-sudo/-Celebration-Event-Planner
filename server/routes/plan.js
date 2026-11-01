/**
 * @file server/routes/plan.js
 * @description POST /api/plan – compute a full plan deterministically.
 */

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { PlanRequestSchema } from '../ai/schemas.js';
import { computePlan } from '../../shared/engine/index.js';
import { sendError, errorMessage } from '../util/errors.js';

const router = Router();

router.post('/', validate(PlanRequestSchema), (req, res) => {
  try {
    const plan = computePlan(req.body);
    res.json(plan);
  } catch (err) {
    if (errorMessage(err).includes('future')) {
      return sendError(res, 422, 'DATE_IN_PAST', 'Event date must be in the future');
    }
    sendError(res, 500, 'ENGINE_ERROR', 'Failed to compute plan');
  }
});

export default router;
