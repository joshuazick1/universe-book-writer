import type { BenchmarkType } from '../../shared/types/aiQualityBenchmark.js';
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
import app, { ragReadyPromise } from './app.js';
import { setupSocketIO } from './socket/socket-setup.js';

import { logger } from '../../shared/logging/logger.js';
import benchmarkingManager from '../benchmarking/BenchmarkingManager.js';
import { scheduleNextQualityBenchmark } from '../benchmarking/scheduleNextQualityBenchmark.js';

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

  // --- Benchmarking Startup Routine (after RAG sync) ---
  (async () => {
    await ragReadyPromise;
    // Short delay to ensure all async RAG setup is done
    setTimeout(async () => {
      try {
        // --- Initial and startup benchmarks are temporarily disabled ---
        // let allBenchmarks = await benchmarkingManager.getAllModelBenchmarks();
        // if (!allBenchmarks.length) {
        //   // No benchmarks exist, discover all models and run initial benchmarks
        //   const { getOrchestratorInstance } = await import('./orchestrator-instance.js');
        //   const orchestrator = getOrchestratorInstance();
        //   const allModels = orchestrator.getAllModels();
        //   logger.info(`[Startup] No model benchmarks found. Running initial benchmarks for ${allModels.length} discovered models via /api/benchmark/manual...`);
        //   // Use shared function to run manual benchmarks for each model (no API call)
        //   const { runManualBenchmarksForModel } = await import('../benchmarking/benchmarkUtils.js');
        //   const manualBenchmarks = [
        //     [],
        //     ['json-assembly', 'task-planning', 'creative-writing', 'typescript-quality']
        //   ];
        //   for (const modelId of allModels) {
        //     for (const benchmarkTypes of manualBenchmarks) {
        //       try {
        //         await runManualBenchmarksForModel({ modelId, benchmarkTypes: benchmarkTypes as (BenchmarkType | 'latency')[] });
        //         logger.info(`[Startup] Manual benchmark succeeded for model ${modelId} types ${benchmarkTypes.join(', ')}`);
        //       } catch (err) {
        //         logger.error(`[Startup] Error running manual benchmark for model ${modelId}: ${err instanceof Error ? err.message : String(err)}`);
        //       }
        //     }
        //   }
        //   // Refresh benchmarks after initial run
        //   allBenchmarks = await benchmarkingManager.getAllModelBenchmarks();
        // }
        // const { runManualBenchmarksForModel } = await import('../benchmarking/benchmarkUtils.js');
        // for (const modelBench of allBenchmarks) {
        //   const { modelId, benchmarks } = modelBench;
        //   // Always run all benchmarks (latency + all quality types)
        //   const allBenchmarkTypes = [
        //     'latency',
        //     'json-assembly',
        //     'task-planning',
        //     'creative-writing',
        //     'typescript-quality'
        //   ] as (BenchmarkType | 'latency')[];
        //   await runManualBenchmarksForModel({ modelId, benchmarkTypes: allBenchmarkTypes });
        //   const benchmarkArr = benchmarks ? Object.values(benchmarks) : [];
        //   const schedule = scheduleNextQualityBenchmark(benchmarkArr);
        //   if (schedule.shouldRun) {
        //     await runManualBenchmarksForModel({ modelId, benchmarkTypes: allBenchmarkTypes });
        //   }
        // }
        // logger.info('[Startup] Completed initial latency and quality benchmark checks.');
      } catch (err) {
        logger.error('[Startup] Error during initial benchmark checks: ' + (err instanceof Error ? err.message : String(err)));
      }
    }, 1000);
  })();

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
