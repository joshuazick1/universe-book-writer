/**
 * AI Server Backend Entry Point (Scaffold)
 *
 * Express server using TypeScript and ES Modules.
 * Provides endpoints for health check, model listing, text generation, and configuration (all mocked).
 *
 * To run: npx tsx ai-server/src/index.ts
 */

import app from './app.js';

const port = process.env.PORT || 5100;

if (process.env.NODE_ENV !== 'test') {
  app.listen(port, () => {
    console.log(`AI server listening on port ${port}`);
  });
}

export default app;
