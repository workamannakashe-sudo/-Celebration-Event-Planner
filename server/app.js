/**
 * @file server/app.js
 * @description Express application factory. Separated from the server entry
 * point so it can be imported by tests without starting a listener.
 */

import express from 'express';
import compression from 'compression';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

import { applySecurityMiddleware } from './middleware/security.js';
import { sendError, errorMessage } from './util/errors.js';
import { logger } from './util/logger.js';

import healthRouter from './routes/health.js';
import planRouter from './routes/plan.js';
import ideasRouter from './routes/ideas.js';
import chatRouter from './routes/chat.js';
import exportRouter from './routes/export.js';
import stressRouter from './routes/stress.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT = join(__dirname, '..');

export function createApp() {
  const app = express();

  // ── Compression ──────────────────────────────────────────────────────────────
  app.use(compression());

  // ── Security middleware ──────────────────────────────────────────────────────
  applySecurityMiddleware(app);

  // ── Body parsing (20 kb limit) ───────────────────────────────────────────────
  app.use(express.json({ limit: '20kb' }));

  // ── Request timeout (30 s) ───────────────────────────────────────────────────
  app.use((req, _res, next) => {
    req.setTimeout(30_000);
    next();
  });

  // ── Static files ─────────────────────────────────────────────────────────────
  // Serve Three.js from node_modules on a whitelisted vendor route
  app.use(
    '/vendor/three',
    express.static(join(ROOT, 'node_modules', 'three'), {
      maxAge: '1h',
      etag: true,
    })
  );

  // Serve /shared/engine so the browser can import the engine directly
  app.use(
    '/shared',
    express.static(join(ROOT, 'shared'), {
      maxAge: '1h',
      etag: true,
    })
  );

  // Serve planner app at /app
  app.use(
    '/app',
    express.static(join(ROOT, 'frontend', 'app'), {
      maxAge: '1h',
      etag: true,
      index: 'index.html',
    })
  );

  // Serve landing page at root /
  app.use(
    express.static(join(ROOT, 'frontend', 'site'), {
      maxAge: '1h',
      etag: true,
      index: 'index.html',
    })
  );

  // ── API routes ───────────────────────────────────────────────────────────────
  app.use('/api/health', healthRouter);
  app.use('/api/plan', planRouter);
  app.use('/api/ideas', ideasRouter);
  app.use('/api/chat', chatRouter);
  app.use('/api/export', exportRouter);
  app.use('/api/stress', stressRouter);

  // ── 404 for unknown API routes ───────────────────────────────────────────────
  app.use('/api', (_req, res) => {
    sendError(res, 404, 'NOT_FOUND', 'API endpoint not found');
  });

  // ── SPA fallbacks ────────────────────────────────────────────────────────────
  // Route /app and /app/* to the planner app
  app.get(/^\/app(\/.*)?$/, (_req, res) => {
    res.sendFile(join(ROOT, 'frontend', 'app', 'index.html'));
  });

  // Route everything else to the landing page
  app.get('*', (_req, res) => {
    res.sendFile(join(ROOT, 'frontend', 'site', 'index.html'));
  });

  // ── Global error handler ─────────────────────────────────────────────────────
   
  app.use((err, _req, res, _next) => {
    logger.error('Unhandled error', { message: errorMessage(err) });
    sendError(res, 500, 'INTERNAL_ERROR', 'An unexpected error occurred');
  });

  return app;
}
