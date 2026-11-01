/**
 * @file server/util/validate.js
 * @description Reusable plan-input validator for routes that don't use the Zod middleware.
 */

import { PlanInputsSchema } from '../ai/schemas.js';

/**
 * Parse and validate raw body as PlanInputs.
 * Throws ZodError (message includes first issue) if invalid.
 *
 * @param {unknown} body
 * @returns {import('../ai/schemas.js').PlanInputs}
 */
export function validatePlanInputs(body) {
  const result = PlanInputsSchema.safeParse(body);
  if (!result.success) {
    const first = result.error.issues[0];
    throw new Error(`Validation error: ${first.path.join('.')} – ${first.message}`);
  }
  return result.data;
}
