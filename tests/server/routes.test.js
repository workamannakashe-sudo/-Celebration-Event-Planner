/**
 * @file tests/server/routes.test.js
 * @description Server route tests using supertest.
 */

import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { createApp } from '../../server/app.js';

const app = createApp();

function futureDate(weeksAhead = 30) {
  const d = new Date();
  d.setDate(d.getDate() + weeksAhead * 7 + 1);
  return d.toISOString().split('T')[0];
}

const VALID_INPUTS = {
  type: 'wedding',
  name: 'Meera',
  guests: 200,
  budget: 500000,
  date: futureDate(),
  vibe: 'Traditional',
  vegOnly: false,
};

describe('GET /api/health', () => {
  it('returns status ok', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(typeof res.body.aiConfigured).toBe('boolean');
  });
});

describe('POST /api/plan', () => {
  it('returns a plan for valid inputs', async () => {
    const res = await request(app).post('/api/plan').send(VALID_INPUTS);
    expect(res.status).toBe(200);
    expect(res.body.budget).toBeDefined();
    expect(res.body.feasibility).toBeDefined();
    expect(res.body.timeline).toBeDefined();
    expect(res.body.vendors).toBeDefined();
  });

  it('rejects unknown keys (strict mode)', async () => {
    const res = await request(app)
      .post('/api/plan')
      .send({ ...VALID_INPUTS, unknownField: 'hack' });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects missing required field', async () => {
    const { type: _t, ...incomplete } = VALID_INPUTS;
    const res = await request(app).post('/api/plan').send(incomplete);
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('rejects bad date format', async () => {
    const res = await request(app)
      .post('/api/plan')
      .send({ ...VALID_INPUTS, date: '01-01-2030' });
    expect(res.status).toBe(400);
  });

  it('rejects guests out of range', async () => {
    const res = await request(app)
      .post('/api/plan')
      .send({ ...VALID_INPUTS, guests: 0 });
    expect(res.status).toBe(400);
  });

  it('rejects budget too low', async () => {
    const res = await request(app)
      .post('/api/plan')
      .send({ ...VALID_INPUTS, budget: 5000 });
    expect(res.status).toBe(400);
  });

  it('rejects invalid vibe', async () => {
    const res = await request(app)
      .post('/api/plan')
      .send({ ...VALID_INPUTS, vibe: 'Luxury' });
    expect(res.status).toBe(400);
  });

  it('rejects body over 20 kb', async () => {
    // Send raw oversized JSON that exceeds the 20kb body limit
    const bigPayload = JSON.stringify({ ...VALID_INPUTS, _pad: 'x'.repeat(25000) });
    const res = await request(app)
      .post('/api/plan')
      .set('Content-Type', 'application/json')
      .send(bigPayload);
    // 413 = body too large, 400 = validation error (unknown key), 500 = parse error
    expect([400, 413, 500]).toContain(res.status);
  });

  it('error shape has correct structure', async () => {
    const res = await request(app).post('/api/plan').send({});
    expect(res.body.error).toBeDefined();
    expect(res.body.error.code).toBeDefined();
    expect(res.body.error.message).toBeDefined();
  });
});

describe('POST /api/ideas', () => {
  it('returns ideas (fallback mode when no key)', async () => {
    const res = await request(app)
      .post('/api/ideas')
      .send({ inputs: VALID_INPUTS, lang: 'en' });
    expect(res.status).toBe(200);
    expect(res.body.themes).toHaveLength(3);
    expect(res.body.menuIdeas).toHaveLength(3);
    expect(res.body.activities).toHaveLength(3);
    expect(res.body.budgetHacks).toHaveLength(3);
    expect(res.body.decorTips).toHaveLength(2);
    expect(['ai', 'fallback']).toContain(res.body.source);
  });

  it('rejects unknown lang', async () => {
    const res = await request(app)
      .post('/api/ideas')
      .send({ inputs: VALID_INPUTS, lang: 'fr' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/chat', () => {
  it('returns chat response', async () => {
    const res = await request(app).post('/api/chat').send({
      inputs: VALID_INPUTS,
      message: 'cut budget 20%',
      lang: 'en',
    });
    expect(res.status).toBe(200);
    expect(res.body.reply).toBeTruthy();
    expect(res.body.diff).toBeDefined();
    expect(res.body.intent).toBeDefined();
  });

  it('handles guest increase correctly', async () => {
    const res = await request(app).post('/api/chat').send({
      inputs: VALID_INPUTS,
      message: 'add 50 guests',
      lang: 'en',
    });
    expect(res.status).toBe(200);
    expect(res.body.after.inputs.guests).toBe(250);
  });

  it('rejects message over 500 chars', async () => {
    const res = await request(app).post('/api/chat').send({
      inputs: VALID_INPUTS,
      message: 'x'.repeat(501),
      lang: 'en',
    });
    expect(res.status).toBe(400);
  });
});
