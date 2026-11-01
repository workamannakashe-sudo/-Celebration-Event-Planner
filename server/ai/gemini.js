/**
 * @file server/ai/gemini.js
 * @description Gemini REST client with retry, timeout, and in-memory LRU cache.
 */

import { createHash } from 'crypto';

const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const TIMEOUT_MS = 12_000;
const MAX_RETRIES = 1;
const RETRY_DELAY_MS = 1_500;

// ── In-memory LRU cache ───────────────────────────────────────────────────────

const CACHE_MAX = 200;
/** @type {Map<string, {value: unknown, ts: number}>} */
const lruCache = new Map();

/**
 * Get a cached value (LRU: access moves to end).
 * @param {string} key
 * @returns {unknown|undefined}
 */
function cacheGet(key) {
  if (!lruCache.has(key)) return undefined;
  const entry = lruCache.get(key);
  lruCache.delete(key);
  lruCache.set(key, entry);
  return entry.value;
}

/**
 * Store a value in the LRU cache, evicting the oldest entry if needed.
 * @param {string} key
 * @param {unknown} value
 */
function cacheSet(key, value) {
  if (lruCache.has(key)) lruCache.delete(key);
  if (lruCache.size >= CACHE_MAX) {
    const oldest = lruCache.keys().next().value;
    lruCache.delete(oldest);
  }
  lruCache.set(key, { value, ts: Date.now() });
}

/**
 * Compute a stable cache key from input.
 * @param {unknown} input
 * @returns {string}
 */
function cacheKey(input) {
  return createHash('sha256').update(JSON.stringify(input)).digest('hex');
}

// ── Gemini caller ─────────────────────────────────────────────────────────────

/**
 * @typedef {Object} GeminiOptions
 * @property {string} prompt
 * @property {object} responseSchema - JSON schema object for structured output
 * @property {number} [temperature] - 0.4 for ideas, 0.1 for parsing/narration
 * @property {unknown} [cacheInput] - Input to use for cache key (defaults to prompt)
 */

/**
 * Call the Gemini API with retry, timeout, and caching.
 * Returns parsed JSON or throws on unrecoverable error.
 *
 * @param {GeminiOptions} opts
 * @returns {Promise<unknown>}
 */
export async function callGemini(opts) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY not configured');

  const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const key = cacheKey(opts.cacheInput ?? opts.prompt);

  const cached = cacheGet(key);
  if (cached !== undefined) return cached;

  const url = `${GEMINI_API_BASE}/${model}:generateContent`;

  const body = {
    contents: [{ parts: [{ text: opts.prompt }] }],
    generationConfig: {
      temperature: opts.temperature ?? 0.4,
      responseMimeType: 'application/json',
      responseSchema: opts.responseSchema,
    },
  };

  let lastError;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
      clearTimeout(timer);

      if (response.status === 429) {
        lastError = new Error('RATE_LIMITED');
        continue; // retry
      }

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(`Gemini API error ${response.status}: ${text.slice(0, 200)}`);
      }

      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error('Empty Gemini response');

      const parsed = JSON.parse(text);
      cacheSet(key, parsed);
      return parsed;
    } catch (err) {
      if (err.name === 'AbortError') {
        lastError = new Error('TIMEOUT');
      } else if (err.message === 'RATE_LIMITED') {
        lastError = err;
      } else {
        throw err; // Non-retryable
      }
    }
  }
  throw lastError ?? new Error('Gemini call failed');
}

/** Expose cache size for health/debug */
export function getCacheSize() {
  return lruCache.size;
}
