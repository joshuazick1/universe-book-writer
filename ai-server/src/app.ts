import express from 'express';
import universeRoutes from './routes/universeRoutes.js';
import inferRouter from './routes/infer.js';
import bookRoutes from './routes/bookRoutes.js';
import llmRouter from './routes/llm.js';
import characterRoutes from './routes/characterRoutes.js';
import cors from 'cors';
import healthRouter from './routes/health.js';
import modelsRouter from './routes/models.js';
import manualModelTestRouter from './routes/manualModelTest.js';
import generateRouter from './routes/generate.js';
import configRouter from './routes/config.js';
import orchestratorConfigRouter from './routes/orchestratorConfig.js';
import serversRouter from './routes/servers.js';
import ollamaCompatRouter from './routes/ollamaCompat.js';
import openaiCompatRouter from './routes/openaiCompat.js';
import userApiKeyRouter from './routes/userApiKey.routes.js';
import tagsRouter from './routes/tags.js';
import benchmarksRouter from './routes/benchmarks.js';
import orchestratorRouter from './routes/orchestrator.js';
import modelMapRouter from './routes/modelMap.js';
import performanceRouter from './routes/performance.js';
import queueRouter from './routes/queue.js';
import { getRAGServiceManager } from './rag/instance.js';
import { setRagManager } from './services/ragNodeService.js';
import {
  ingestTextRouter,
  ingestCodeRouter,
  ingestTextStreamRouter,
  eventsStreamRouter,
} from './routes/rag/index.js';
import { logger } from '../../shared/logging/logger.js';
import { initService } from '../../shared/async/initService.js';
import { validate } from '../../shared/validation/validator.js';
import { errorHandler } from '../../shared/express/errorHandler.js';
// Removed unused imports: jsonParser, corsMiddleware, requestLogger
import type { Request, Response, NextFunction } from 'express';
//import { generateRouter } from './routes/generation/index.js';
import { universeRouter, characterRouter, messageRouter } from './routes/chat/index.js';
import { sharedDatabaseConnection } from '../../shared/database/database.config.js';
import { sharedMemoryRouter } from './routes/memory/index.js';
import aiHelperRouter from './routes/aiHelper.js';
import toolRoutes from './routes/toolRoutes.js';
import { registerAllTools } from './tools/registerAllTools.js';
import generateEnhancedRouter from './routes/generate-enhanced.js';
import manualBenchmarkRouter from './routes/manualBenchmark.js';
import workerRouter from './routes/worker.js';
import schedulerRouter from './routes/scheduler.js';

// Declare flags at the top of the file to track initialization states
let isRAGServiceManagerInitialized = false;
let isMongoDBRAGAdapterInitialized = false;


const app = express();
// Ensure JSON body parsing is available for all routes
app.use(express.json({ limit: '10mb' }));
app.use(cors());

// Canonical API base path
const API = '/api';

// Centralized route registry
const ROUTES: Array<{ path: string; router: any }> = [
  { path: `${API}/shared-memories`, router: sharedMemoryRouter },
  { path: `${API}/ai`, router: aiHelperRouter },
  { path: `${API}/llm`, router: llmRouter },
  { path: `${API}/infer`, router: inferRouter },
  { path: `${API}/universes`, router: universeRoutes },
  { path: `${API}/rag/universes`, router: universeRoutes },
  { path: `${API}/books`, router: bookRoutes },
  { path: `${API}/characters`, router: characterRoutes },
  { path: `${API}/queue`, router: queueRouter },
  { path: `${API}`, router: healthRouter },
  { path: `${API}/models`, router: modelsRouter },
  { path: `${API}/model`, router: manualModelTestRouter },
  { path: `${API}/generate`, router: generateRouter },
  { path: `${API}/config`, router: configRouter },
  { path: `${API}/orchestrator/config`, router: orchestratorConfigRouter },
  { path: `${API}/servers`, router: serversRouter },
  { path: `${API}/chat/universe`, router: universeRouter },
  { path: `${API}/chat/character`, router: characterRouter },
  { path: `${API}/chat/message`, router: messageRouter },
  { path: `${API}/tags`, router: tagsRouter },
  { path: `${API}/orchestrator/benchmarks`, router: benchmarksRouter },
  { path: `${API}/orchestrator/performance`, router: performanceRouter },
  { path: `${API}/orchestrator`, router: orchestratorRouter },
  { path: `${API}/orchestrator`, router: modelMapRouter },
  { path: `${API}`, router: ollamaCompatRouter },
  { path: `${API}/v1`, router: openaiCompatRouter },
  { path: `${API}/user/api-keys`, router: userApiKeyRouter },
  { path: `${API}/sample`, router: populateSampleDataRouter },
  { path: `${API}/rag/ingest/text`, router: ingestTextRouter },
  { path: `${API}/rag/ingest/text/stream`, router: ingestTextStreamRouter },
  { path: `${API}/rag/ingest/code`, router: ingestCodeRouter },
  { path: `${API}/rag/events/stream`, router: eventsStreamRouter },
  { path: `${API}/rag`, router: manualPostChunkingRouter },
  { path: `${API}/tools`, router: toolRoutes },
  { path: `${API}/generate-enhanced`, router: generateEnhancedRouter },
  { path: `${API}/manual`, router: manualBenchmarkRouter },
  { path: `${API}/worker`, router: workerRouter },
  { path: `${API}/scheduler`, router: schedulerRouter },
];

// Register all routes from the registry
for (const { path, router } of ROUTES) {
  app.use(path, router);
}

/**
 * @openapi
 * /api/benchmark/manual:
 *   post:
 *     summary: Run manual benchmarks for a model on one or more servers (ad-hoc, does not update persistent data)
 *     tags:
 *       - Benchmarking
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               modelId:
 *                 type: string
 *                 description: Model ID to benchmark
 *               benchmarkTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: List of benchmark types to run
 *               serverIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Optional list of server IDs to test (if omitted, all discovered servers are used)
 *             required:
 *               - modelId
 *               - benchmarkTypes
 *     responses:
 *       200:
 *         description: Benchmark results for each server
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 modelId:
 *                   type: string
 *                 results:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       serverId:
 *                         type: string
 *                       benchmarks:
 *                         type: object
 *                         additionalProperties:
 *                           $ref: '#/components/schemas/QualityBenchmarkScore'
 *       400:
 *         description: Invalid request
 *       404:
 *         description: No servers found for model
 *       500:
 *         description: Internal error
 */
app.use('/api', healthRouter);
app.use('/api/models', modelsRouter);
app.use('/api/model', manualModelTestRouter);
app.use('/api/generate', generateRouter); // Only mount once
app.use('/api/config', configRouter);
app.use('/api/orchestrator/config', orchestratorConfigRouter);
app.use('/api/servers', serversRouter);
// Removed duplicate /api/generate mount
app.use('/api/chat/universe', universeRouter);
app.use('/api/chat/character', characterRouter);
app.use('/api/chat/message', messageRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/orchestrator/benchmarks', benchmarksRouter);
app.use('/api/orchestrator/performance', performanceRouter);
app.use('/api/orchestrator', orchestratorRouter);
app.use('/api/orchestrator', modelMapRouter);
app.use('/api', ollamaCompatRouter); // Only mount under /api

app.use('/api/v1', openaiCompatRouter); // Only mount under /api/v1

// User API key management endpoints
// Mount API key management routes under /api/user/api-keys for correct frontend access
app.use('/api/user/api-keys', userApiKeyRouter);

// Mount sample data population route
import populateSampleDataRouter from './routes/sample/populateSampleData.js';
app.use('/api/sample', populateSampleDataRouter);

// Mount modular RAG ingestion routes
app.use('/api/rag/ingest/text', ingestTextRouter);
app.use('/api/rag/ingest/text/stream', ingestTextStreamRouter);
app.use('/api/rag/ingest/code', ingestCodeRouter);
// Global SSE events endpoint for monitoring all job/benchmark state changes
app.use('/api/rag/events/stream', eventsStreamRouter);
// Manual post-chunking reprocessing endpoint
import { manualPostChunkingRouter } from './routes/rag/index.js';
app.use('/api/rag', manualPostChunkingRouter);

// Register tool routes
app.use('/api/tools', toolRoutes);

// Mount enhanced generate endpoint
app.use('/api/generate-enhanced', generateEnhancedRouter);

// Mount manual benchmark testing routes
app.use('/api/manual', manualBenchmarkRouter);

// Mount worker management routes
app.use('/api/worker', workerRouter);

// Mount scheduler routes
app.use('/api/scheduler', schedulerRouter);

// Enhanced Error handler
app.use((err: unknown, req: Request, res: Response, _next: NextFunction) => {
  let details: string | undefined = undefined;
  let stack: string | undefined = undefined;
  if (typeof err === 'string') {
    details = err;
  } else if (err instanceof Error) {
    details = err.message;
    stack = err.stack;
  } else if (err && typeof err === 'object') {
    if ('message' in err && typeof (err as any).message === 'string' && (err as any).message) {
      details = String((err as any).message);
      stack = (err as any).stack;
    } else {
      details = undefined;
    }
  } else {
    details = undefined;
  }
  logger.error(`[ERROR HANDLER] Unhandled error: ${details}`);
  if (stack) logger.error(`[ERROR HANDLER] Stack: ${stack}`);
  const response: { error: string; details?: string } = { error: 'Internal server error' };
  if (details !== undefined) response.details = details;
  res.status(500).json(response);
});

// --- RAG Ready Promise ---
export let ragReadyResolve: (() => void) | null = null;
/**
 * Promise that resolves when the RAG system is fully initialized and synced.
 * Import this in index.ts to await RAG readiness before running dependent routines.
 */
export const ragReadyPromise: Promise<void> = new Promise((resolve) => {
  ragReadyResolve = resolve;
});

// --- Service initialization guard ---
const initializedServices = new Set<string>();
async function ensureInitialized(name: string, factory: () => Promise<void>) {
  if (initializedServices.has(name)) {
    logger.warn(`${name} is already initialized. Skipping redundant initialization.`);
    return;
  }
  await factory();
  initializedServices.add(name);
}

initService('RAG System', () => ensureInitialized('RAG System', async () => {
  const ragServiceManager = await getRAGServiceManager();
  setRagManager(ragServiceManager);
  const { createSimpleRAGRouter } = await import('./rag/routes/simple-rag.routes.js');
  const ragRouter = createSimpleRAGRouter(ragServiceManager);
  app.use('/api/rag', ragRouter);
  if (typeof ragReadyResolve === 'function') ragReadyResolve();
}));


initService('Performance RAG System', () => ensureInitialized('Performance RAG System', async () => {
  const { getOrchestratorInstance } = await import('./orchestrator-instance.js');
  const orchestrator = getOrchestratorInstance();
  const { getModelPerformanceRAGService } = await import('./services/modelPerformanceRAG.service.js');
  await getModelPerformanceRAGService(orchestrator);
}));


initService('Character Memory System', () => ensureInitialized('Character Memory System', async () => {
  const characterMemoryRouter = await import('./routes/characterMemory.js');
  app.use('/api/memory', characterMemoryRouter.default);
}));


initService('MongoDB RAG Adapter', () => ensureInitialized('MongoDB RAG Adapter', async () => {
  logger.info('Initializing MongoDB RAG adapter...');
  // Add MongoDB RAG adapter initialization logic here
}));

// --- Startup sequence: ensure DB is connected before initializing RAG and other services ---
async function startup() {
  try {
    await sharedDatabaseConnection.connect();
    logger.info('MongoDB connection established before service initialization.');

    // Initialize server registry and register all known servers
    const { serverRegistryLoader } = await import('./services/server-registry-loader.service.js');
    await serverRegistryLoader.loadAndRegisterServers();

    // RAG and Performance RAG system initialization now handled by shared initService above

    // Register all tools before starting the server
    registerAllTools();

  } catch (error) {
    logger.error(
      `Startup failed: ${error instanceof Error ? error.message : String(error)}`
    );
    process.exit(1);
  }
}


// --- Error handling and 404 fallback ---
app.use(errorHandler);
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));

await startup();

export default app;
