/**
 * @file server/middleware/rateLimit.js
 * @description Rate limiting for AI endpoints.
 */

import rateLimit from 'express-rate-limit';

/**
 * 30 requests per minute per IP for AI-backed endpoints.
 */
export const aiRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: {
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please wait a moment before trying again.',
    },
  },
  skip: () => process.env.NODE_ENV === 'test',
});
