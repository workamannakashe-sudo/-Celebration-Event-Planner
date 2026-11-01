/**
 * @file tests/server/export.test.js
 * @description Integration tests for export routes (excel/pdf) and stress route.
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
  name: 'Meera & Rohan Wedding',
  guests: 200,
  budget: 600000,
  date: futureDate(),
  vibe: 'Traditional',
  vegOnly: false,
};

describe('POST /api/stress', () => {
  it('returns Monte Carlo stress test results for valid inputs', async () => {
    const res = await request(app)
      .post('/api/stress?sims=200')
      .send(VALID_INPUTS);

    expect(res.status).toBe(200);
    expect(res.body.simulations).toBe(200);
    expect(typeof res.body.overrunPct).toBe('number');
    expect(typeof res.body.p50).toBe('number');
    expect(typeof res.body.p95).toBe('number');
    expect(['Safe', 'Moderate Risk', 'High Risk']).toContain(res.body.verdict);
  });

  it('rejects invalid inputs on /api/stress', async () => {
    const res = await request(app)
      .post('/api/stress')
      .send({ guests: -5 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });
});

describe('POST /api/export/excel', () => {
  it('exports an .xlsx spreadsheet for valid plan inputs', async () => {
    const res = await request(app)
      .post('/api/export/excel')
      .send(VALID_INPUTS);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    expect(res.headers['content-disposition']).toContain('utsav-plan-');
  });

  it('rejects invalid inputs on /api/export/excel', async () => {
    const res = await request(app)
      .post('/api/export/excel')
      .send({ budget: 50 });

    expect(res.status).toBe(400);
  });
});

describe('POST /api/export/pdf', () => {
  it('exports a PDF summary for valid plan inputs', async () => {
    const res = await request(app)
      .post('/api/export/pdf')
      .send(VALID_INPUTS);

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toContain('application/pdf');
    expect(res.headers['content-disposition']).toContain('.pdf');
    expect(res.body).toBeInstanceOf(Buffer);
    expect(res.body.length).toBeGreaterThan(100);
  });
});
