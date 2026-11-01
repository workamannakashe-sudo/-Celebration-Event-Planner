/**
 * @file tests/e2e/workflow.test.js
 * @description End-to-end workflow integration tests: full plan ? export pipeline.
 * Tests the complete Meera journey: input ? plan ? stress ? rsvp ? excel ? pdf.
 */

import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../../server/app.js";

let app;

beforeAll(() => {
  app = createApp();
});

/**
 * Collects a binary (Buffer) response body from supertest.
 * @param {import('http').IncomingMessage} res
 * @param {Function} callback
 */
function parseBinary(res, callback) {
  const chunks = [];
  res.on('data', (c) => chunks.push(c));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
}

const MEERA_WEDDING = {
  type: "wedding",
  name: "Meera & Rohan Wedding",
  guests: 200,
  budget: 800000,
  date: (() => {
    const d = new Date();
    d.setDate(d.getDate() + 150);
    return d.toISOString().split("T")[0];
  })(),
  vibe: "Traditional",
  vegOnly: true,
};

describe("Meera full journey: /api/plan", () => {
  it("returns a complete plan for a valid wedding input", async () => {
    const res = await request(app).post("/api/plan").send(MEERA_WEDDING);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("budget");
    expect(res.body).toHaveProperty("timeline");
    expect(res.body).toHaveProperty("feasibility");
    expect(res.body.budget.totalBudget).toBe(MEERA_WEDDING.budget);
    expect(res.body.daysToGo).toBeGreaterThan(0);
  });

  it("rejects a missing budget with 400", async () => {
    const res = await request(app)
      .post("/api/plan")
      .send({ ...MEERA_WEDDING, budget: undefined });
    expect(res.status).toBe(400);
  });

  it("rejects a past event date with 400", async () => {
    const res = await request(app)
      .post("/api/plan")
      .send({ ...MEERA_WEDDING, date: "2000-01-01" });
    expect(res.status).toBe(400);
  });

  it("accepts a birthday event type", async () => {
    const res = await request(app)
      .post("/api/plan")
      .send({ ...MEERA_WEDDING, type: "birthday", guests: 40, budget: 50000 });
    expect(res.status).toBe(200);
    expect(res.body.budget.totalBudget).toBe(50000);
  });
});

describe("Meera full journey: /api/stress", () => {
  it("returns stress-test verdict for valid inputs", async () => {
    const res = await request(app).post("/api/stress").send(MEERA_WEDDING);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("verdict");
    expect(res.body).toHaveProperty("overrunPct");
    expect(res.body).toHaveProperty("p50");
    expect(res.body).toHaveProperty("p95");
    expect(["Safe", "Moderate Risk", "High Risk"]).toContain(res.body.verdict);
  });
});

describe("Meera full journey: /api/export/excel", () => {
  it("returns an xlsx binary with correct content-type", async () => {
    const res = await request(app)
      .post("/api/export/excel")
      .send(MEERA_WEDDING)
      .buffer(true)
      .parse(parseBinary);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    // OOXML magic bytes: PK (zip)
    expect(res.body[0]).toBe(0x50);
    expect(res.body[1]).toBe(0x4b);
  });
});

describe("Meera full journey: /api/export/pdf", () => {
  it("returns a PDF binary with correct content-type", async () => {
    const res = await request(app)
      .post("/api/export/pdf")
      .send(MEERA_WEDDING)
      .buffer(true)
      .parse(parseBinary);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toContain("application/pdf");
    // PDF magic bytes: %PDF
    const header = res.body.slice(0, 4).toString("ascii");
    expect(header).toBe("%PDF");
  });
});

describe("Security: Excel formula-injection protection", () => {
  it("does not crash when event name starts with =DANGEROUS formula", async () => {
    const malicious = { ...MEERA_WEDDING, name: "=HYPERLINK(\"http://evil.com\",\"click\")" };
    const res = await request(app)
      .post("/api/export/excel")
      .send(malicious)
      .buffer(true)
      .parse(parseBinary);
    // Should still produce a valid xlsx, not crash
    expect(res.status).toBe(200);
    expect(res.body[0]).toBe(0x50);
  });
});

describe("Health check", () => {
  it("GET /api/health returns ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});
