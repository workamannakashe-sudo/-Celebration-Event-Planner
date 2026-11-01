/**
 * @file tests/ai/gemini.test.js
 * @description Tests for the Gemini client with mocked fetch.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callGemini, getCacheSize } from '../../server/ai/gemini.js';

function mockFetchSuccess(data) {
  global.fetch = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      candidates: [{ content: { parts: [{ text: JSON.stringify(data) }] } }],
    }),
  });
}

function mockFetchError(status, body = '') {
  global.fetch = vi.fn().mockResolvedValue({
    ok: false,
    status,
    text: async () => body,
  });
}

describe('Gemini client', () => {
  const ORIG_ENV = { ...process.env };

  beforeEach(() => {
    process.env.GEMINI_API_KEY = 'test-key-123';
    process.env.GEMINI_MODEL = 'gemini-2.5-flash';
    vi.clearAllMocks();
  });

  afterEach(() => {
    process.env = { ...ORIG_ENV };
    vi.restoreAllMocks();
  });

  it('returns parsed JSON on success', async () => {
    const expected = { themes: ['A', 'B', 'C'] };
    mockFetchSuccess(expected);
    const result = await callGemini({
      prompt: `test prompt unique ${  Math.random()}`,
      responseSchema: {},
      temperature: 0.4,
    });
    expect(result).toEqual(expected);
  });

  it('caches responses when cacheInput is provided', async () => {
    const expected = { themes: ['CachedTheme'] };
    mockFetchSuccess(expected);
    const initialSize = getCacheSize();
    await callGemini({
      prompt: 'caching test prompt',
      responseSchema: {},
      temperature: 0.4,
      cacheInput: { uniqueKey: 'test12345' },
    });
    expect(getCacheSize()).toBeGreaterThanOrEqual(initialSize);
  });

  it('throws when GEMINI_API_KEY is missing', async () => {
    delete process.env.GEMINI_API_KEY;
    await expect(
      callGemini({ prompt: 'test', responseSchema: {} })
    ).rejects.toThrow('GEMINI_API_KEY not configured');
  });

  it('handles malformed JSON from Gemini', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: 'NOT JSON }{' }] } }],
      }),
    });
    await expect(
      callGemini({ prompt: `bad json test ${  Math.random()}`, responseSchema: {} })
    ).rejects.toThrow();
  });

  it('throws RATE_LIMITED after retries on 429', async () => {
    mockFetchError(429);
    await expect(
      callGemini({ prompt: `rate limit test ${  Math.random()}`, responseSchema: {} })
    ).rejects.toThrow();
  }, 10_000);

  it('throws on 500 server error', async () => {
    mockFetchError(500, 'Internal Server Error');
    await expect(
      callGemini({ prompt: `server error test ${  Math.random()}`, responseSchema: {} })
    ).rejects.toThrow('500');
  });
});

describe('Narration guard', () => {
  it('allows narration with numbers from the diff', async () => {
    const { narrationIsClean } = await import('../../server/ai/guard.js');
    const diff = [{ field: 'budget', before: 500000, after: 400000, delta: -100000 }];
    expect(narrationIsClean('Budget reduced from 500000 to 400000', diff)).toBe(true);
  });

  it('rejects narration with invented numbers', async () => {
    const { narrationIsClean } = await import('../../server/ai/guard.js');
    const diff = [{ field: 'budget', before: 500000, after: 400000, delta: -100000 }];
    expect(narrationIsClean('Budget is now 999999 which is amazing', diff)).toBe(false);
  });

  it('passes when diff has no numbers', async () => {
    const { narrationIsClean } = await import('../../server/ai/guard.js');
    const diff = [{ field: 'vibe', before: 'Traditional', after: 'Fun' }];
    expect(narrationIsClean('Vibe changed from Traditional to Fun', diff)).toBe(true);
  });
});

describe('Prompt injection defence', () => {
  it('sanitises control characters from user text', async () => {
    const { sanitiseUserText } = await import('../../server/ai/prompts.js');
    const injected = 'Meera\x00\x1F\x7F<script>alert(1)</script>';
    const safe = sanitiseUserText(injected);
    expect(safe).not.toContain('\x00');
    expect(safe).not.toContain('<');
    expect(safe).not.toContain('>');
  });

  it('caps length at maxLen', async () => {
    const { sanitiseUserText } = await import('../../server/ai/prompts.js');
    const long = 'a'.repeat(1000);
    expect(sanitiseUserText(long, 200)).toHaveLength(200);
  });

  it('buildIdeasPrompt places organiser name inside user_data tags', async () => {
    const { buildIdeasPrompt } = await import('../../server/ai/prompts.js');
    const { computePlan } = await import('../../shared/engine/index.js');
    const uniqueName = `TestOrganiser${  Math.random().toString(36).slice(2, 10).toUpperCase()}`;
    const plan = computePlan({
      type: 'wedding',
      name: uniqueName,
      guests: 100,
      budget: 500000,
      date: new Date(Date.now() + 30 * 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      vibe: 'Elegant',
      vegOnly: false,
    });
    const prompt = buildIdeasPrompt(plan, 'en');
    // Use lastIndexOf to find the actual <user_data> section (not the mention in the system rules)
    const openTagLastIdx = prompt.lastIndexOf('<user_data>');
    expect(openTagLastIdx).toBeGreaterThan(-1);
    const afterTag = prompt.slice(openTagLastIdx);
    expect(afterTag).toContain(uniqueName);
    // Confirm the name does NOT appear before the last user_data tag
    const beforeTag = prompt.slice(0, openTagLastIdx);
    expect(beforeTag).not.toContain(uniqueName);
  });
});

describe('Fallback parser', () => {
  it('parses "cut budget 20%" correctly', async () => {
    const { parseScenario } = await import('../../server/ai/fallback.js');
    const { intent, scenario } = parseScenario('cut budget 20%');
    expect(intent).toBe('whatif');
    expect(scenario.budgetPct).toBe(-20);
  });

  it('parses "add 50 more guests" correctly', async () => {
    const { parseScenario } = await import('../../server/ai/fallback.js');
    const { scenario } = parseScenario('add 50 more guests');
    expect(scenario.guestsDelta).toBe(50);
  });

  it('parses "make it vegetarian" correctly', async () => {
    const { parseScenario } = await import('../../server/ai/fallback.js');
    const { scenario } = parseScenario('make it vegetarian');
    expect(scenario.vegOnly).toBe(true);
  });

  it('parses "set budget to 3 lakh" correctly', async () => {
    const { parseScenario } = await import('../../server/ai/fallback.js');
    const { scenario } = parseScenario('set budget to 3 lakh');
    expect(scenario.budgetSet).toBe(300000);
  });
});
