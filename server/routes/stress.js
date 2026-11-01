/**
 * @file server/routes/stress.js
 * @description POST /api/stress – Monte Carlo stress test endpoint.
 */

import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { PlanInputsSchema } from '../ai/schemas.js';
import { runStressTest } from '../../shared/engine/stress.js';
import { sendError, errorMessage } from '../util/errors.js';

const router = Router();

router.post('/', validate(PlanInputsSchema), (req, res) => {
  try {
    const simulations = Math.min(
      10000,
      Math.max(100, parseInt(req.query.sims ?? '5000', 10) || 5000)
    );
    const result = runStressTest(req.body, { simulations });
    res.json(result);
  } catch (err) {
    sendError(res, 500, 'STRESS_ERROR', errorMessage(err));
  }
});

export default router;
