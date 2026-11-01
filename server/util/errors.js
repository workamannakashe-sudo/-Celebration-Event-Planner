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
