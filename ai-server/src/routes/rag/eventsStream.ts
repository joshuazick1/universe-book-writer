
import express from 'express';
import { registerSSEClient, unregisterSSEClient } from '../../pipeline/utils/sseEvents.js';

const router = express.Router();

// Global SSE events endpoint for monitoring all job/benchmark state changes
router.get('/', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();

  // Register this client for global events (sessionId = 'global')
  registerSSEClient('global', res);

  // Unregister on close
  req.on('close', () => {
    unregisterSSEClient('global', res);
  });
});

export default router;
