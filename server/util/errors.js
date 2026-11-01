/**
 * @file server/util/errors.js
 * @description Consistent error helpers for API responses.
 */

/**
 * @typedef {Object} ApiError
 * @property {{code:string, message:string, details?:unknown}} error
 */

/**
 * Build a standard error response body.
 * @param {string} code - Machine-readable error code
 * @param {string} message - Human-readable message (no sensitive data)
 * @param {unknown} [details] - Optional structured details
 * @returns {ApiError}
 */
export function apiError(code, message, details) {
  /** @type {ApiError} */
  const body = { error: { code, message } };
  if (details !== undefined) body.error.details = details;
  return body;
}

/**
 * Send a standard error response.
 * @param {import('express').Response} res
 * @param {number} status
 * @param {string} code
 * @param {string} message
 * @param {unknown} [details]
 */
export function sendError(res, status, code, message, details) {
  res.status(status).json(apiError(code, message, details));
}

/**
 * Safely extract a string message from an unknown catch-clause value.
 * Avoids the strict-mode TS error: "Property 'message' does not exist on type 'unknown'".
 * @param {unknown} err
 * @returns {string}
 */
export function errorMessage(err) {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'Unknown error';
}
