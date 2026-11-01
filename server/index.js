/**
 * @file server/index.js
 * @description Server entry point. Starts the HTTP listener.
 */

import { createApp } from './app.js';
import { logger } from './util/logger.js';

const PORT = parseInt(process.env.PORT || '3000', 10);
const app = createApp();

app.listen(PORT, () => {
  logger.info('Utsav server started', {
    port: PORT,
    env: process.env.NODE_ENV || 'development',
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
  });
});
