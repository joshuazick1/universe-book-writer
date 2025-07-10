import express from 'express';
import universeRoutes from './routes/universeRoutes.js';
import bookRoutes from './routes/bookRoutes.js';
import chapterRoutes from './routes/chapterRoutes.js';
import characterRoutes from './routes/characterRoutes.js';
import cors from 'cors';
import healthRouter from './routes/health.js';
import modelsRouter from './routes/models.js';
// import generateRouter from './routes/generate.js';
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
import { getRAGServiceManager } from './rag/instance.js';
import { setRagManager } from './services/ragNodeService.js';
import { ingestTextRouter, ingestCodeRouter, ingestTextStreamRouter } from './routes/rag/index.js';
import { logError } from './logger.js';
import type { Request, Response, NextFunction } from 'express';
import { generateRouter } from './routes/generation/index.js';
import { universeRouter, characterRouter, messageRouter } from './routes/chat/index.js';
import { sharedDatabaseConnection } from './config/database.config.js';



const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Backend-cached Universe/Book/Chapter/Character API endpoints
app.use('/api/universes', universeRoutes);
// Alias for backend RAG integration compatibility
app.use('/api/rag/universes', universeRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/characters', characterRoutes);

// Backend-cached Universe/Book/Chapter/Character API endpoints
app.use('/api/universes', universeRoutes);
app.use('/api/books', bookRoutes);
app.use('/api/chapters', chapterRoutes);
app.use('/api/characters', characterRoutes);

// Specialized debugging for orchestrator health/model aggregation issues
import { getOrchestratorInstance } from './orchestrator-instance.js';
app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl.startsWith('/api/tags') || req.originalUrl.startsWith('/api/show')) {
        // ...existing code for orchestrator state logging...
    }
    next();
});


// Mount routers
app.use('/api', healthRouter);
app.use('/api/models', modelsRouter);
app.use('/api/generate', generateRouter);
app.use('/api/config', configRouter);
app.use('/api/orchestrator/config', orchestratorConfigRouter);
app.use('/api/servers', serversRouter);
app.use('/api/generate', generateRouter);
app.use('/api/chat/universe', universeRouter);
app.use('/api/chat/character', characterRouter);
app.use('/api/chat/message', messageRouter);
app.use('/api/tags', tagsRouter);
app.use('/api/orchestrator/benchmarks', benchmarksRouter);
app.use('/api/orchestrator/performance', performanceRouter);
app.use('/api/orchestrator', orchestratorRouter);
app.use('/api/orchestrator', modelMapRouter);
app.use('/', ollamaCompatRouter);
app.use('/api', ollamaCompatRouter);

app.use('/v1', openaiCompatRouter);
app.use('/api/v1', openaiCompatRouter);

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
// Manual post-chunking reprocessing endpoint
import { manualPostChunkingRouter } from './routes/rag/index.js';
app.use('/api/rag', manualPostChunkingRouter);

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
    logError(`[ERROR HANDLER] Unhandled error: ${details}`);
    if (stack) logError(`[ERROR HANDLER] Stack: ${stack}`);
    const response: { error: string; details?: string } = { error: 'Internal server error' };
    if (details !== undefined) response.details = details;
    res.status(500).json(response);
});

// Initialize RAG system asynchronously
async function initializeRAGSystem() {
    try {
        const ragServiceManager = await getRAGServiceManager();
        // Set the singleton for ragNodeService (required for all RAG node/relationship CRUD)
        setRagManager(ragServiceManager);
        const { createSimpleRAGRouter } = await import('./rag/routes/simple-rag.routes.js');
        const ragRouter = createSimpleRAGRouter(ragServiceManager);
        app.use('/api/rag', ragRouter);
    } catch (error) {
        logError(`Failed to initialize RAG system: ${error instanceof Error ? error.message : String(error)}`);
    }
}

initializeRAGSystem().catch(error => {
    logError(`RAG system initialization failed: ${error instanceof Error ? error.message : String(error)}`);
});

// Initialize Performance RAG system asynchronously
async function initializePerformanceRAGSystem() {
    try {
        const { getOrchestratorInstance } = await import('./orchestrator-instance.js');
        const orchestrator = getOrchestratorInstance();
        const { getModelPerformanceRAGService } = await import('./services/modelPerformanceRAG.service.js');
        await getModelPerformanceRAGService(orchestrator);
    } catch (error) {
        logError(`Failed to initialize Performance RAG system: ${error instanceof Error ? error.message : String(error)}`);
    }
}

setTimeout(() => {
    initializePerformanceRAGSystem().catch(error => {
        logError(`Performance RAG system initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    });
}, 2000);

// Initialize Character Memory system asynchronously
async function initializeCharacterMemorySystem() {
    try {
        const characterMemoryRouter = await import('./routes/characterMemory.js');
        app.use('/api/memory', characterMemoryRouter.default);
    } catch (error) {
        logError(`Failed to initialize Character Memory system: ${error instanceof Error ? error.message : String(error)}`);
    }
}

initializeCharacterMemorySystem().catch(error => {
    logError(`Character Memory system initialization failed: ${error instanceof Error ? error.message : String(error)}`);
});

// Initialize database connection
async function initializeDatabase() {
    try {
        await sharedDatabaseConnection.connect();
    } catch (error) {
        logError(`Failed to connect to MongoDB database: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}

await initializeDatabase();

export default app;
