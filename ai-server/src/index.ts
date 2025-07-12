/**
 * AI Server Backend Entry Point (Scaffold)
 *
 * Express server using TypeScript and ES Modules.
 * Provides endpoints for health check, model listing, text generation, and configuration (all mocked).
 * Now includes Socket.IO support for real-time character chat.
 *
 * To run: npx tsx ai-server/src/index.ts
 */

import { createServer } from 'http';
import app from './app.js';
import { setupSocketIO } from './socket/socket-setup.js';

import { logger } from '../../shared/logging/logger.js';
import { BenchmarkManager } from './benchmarkManager.js';
import { QualityBenchmarkManager } from './services/benchmarking/QualityBenchmarkManager.js';
import { getOrchestratorInstance } from './orchestrator-instance.js';

const port = process.env.PORT || 5100;

/**
 * Start the server with an injectable logger (for testability)
 * @param logger Optional logger function (defaults to console.log)
 */
export function startServer(customPort?: number | string, logger: (msg: string) => void = console.log) {
  const listenPort = customPort || port;

  // Create HTTP server
  const httpServer = createServer(app);

  // Setup Socket.IO
  const io = setupSocketIO(httpServer);

  // Start listening
  return httpServer.listen(listenPort, () => {
    logger(`AI server listening on port ${listenPort}`);
    logger(`Socket.IO enabled for real-time chat`);
  });
}


if (process.env.NODE_ENV !== 'test') {
  const server = startServer();

  // --- Quality Benchmark Automation Bootstrap ---
  try {
    const orchestrator = getOrchestratorInstance();
    const benchmarkManager = new BenchmarkManager();
    // Pass orchestrator to QualityBenchmarkManager for model/server discovery
    const qualityBenchmarkManager = new QualityBenchmarkManager(benchmarkManager, orchestrator);
    // Optionally, set orchestrator again if needed (for hot reloads)
    qualityBenchmarkManager.setOrchestrator(orchestrator);
    logger.info('QualityBenchmarkManager initialized with orchestrator for automated benchmark scheduling.');
  } catch (err) {
    logger.error('Failed to initialize QualityBenchmarkManager for automated benchmarks: ' + (err instanceof Error ? err.message : String(err)));
  }

  // Graceful shutdown handling
  async function gracefulShutdown(signal: string) {
    logger.info(`Received ${signal}. Starting graceful shutdown...`);

    try {
      // Close the HTTP server
      server.close(() => {
        logger.info('HTTP server closed');
      });

      // Shutdown orchestrator and its services
      const { getOrchestratorInstance } = await import('./orchestrator-instance.js');
      const orchestrator = getOrchestratorInstance();
      await orchestrator.shutdown();

      // Shutdown database connection
      const { sharedDatabaseConnection } = await import('./config/database.config.js');
      await sharedDatabaseConnection.disconnect();
      logger.info('Database connection closed');

      logger.info('Graceful shutdown completed');
      process.exit(0);
    } catch (error) {
      console.error('Error during graceful shutdown:', error);
      process.exit(1);
    }
  }

  // Handle shutdown signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  // Handle uncaught exceptions
  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
  });
}

export default app;
