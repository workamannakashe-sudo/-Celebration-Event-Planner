/**
 * @file server/middleware/validate.js
 * @description Zod-based request validation middleware factory.
 */

import { sendError } from '../util/errors.js';

/**
 * Create an Express middleware that validates req.body against a Zod schema.
 * On failure, responds with 400 and a formatted error. On success, replaces
 * req.body with the parsed (and stripped) value.
 *
 * @template T
 * @param {import('zod').ZodSchema<T>} schema
 * @returns {import('express').RequestHandler}
 */
export function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const details = result.error.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      }));
      return sendError(res, 400, 'VALIDATION_ERROR', 'Request validation failed', details);
    }
    req.body = result.data;
    next();
  };
}
