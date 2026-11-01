/**
 * @file server/util/logger.js
 * @description Minimal structured logger.
 * No PII in logs; request bodies are never logged in production.
 */

const isDev = process.env.NODE_ENV !== 'production';

/**
 * @param {'info'|'warn'|'error'} level
 * @param {string} message
 * @param {Record<string,unknown>} [meta]
 */
function log(level, message, meta = {}) {
  // Sanitise: never log sensitive keys
  const safe = Object.fromEntries(
    Object.entries(meta).filter(([k]) => !['key', 'apiKey', 'password', 'token', 'authorization'].includes(k.toLowerCase()))
  );
  const entry = { ts: new Date().toISOString(), level, message, ...safe };
  if (level === 'error') {
    console.error(JSON.stringify(entry));
  } else if (isDev) {
    console.log(JSON.stringify(entry));
  }
}

export const logger = {
  /** @param {string} msg @param {Record<string,unknown>} [meta] */
  info: (msg, meta) => log('info', msg, meta),
  /** @param {string} msg @param {Record<string,unknown>} [meta] */
  warn: (msg, meta) => log('warn', msg, meta),
  /** @param {string} msg @param {Record<string,unknown>} [meta] */
  error: (msg, meta) => log('error', msg, meta),
};
