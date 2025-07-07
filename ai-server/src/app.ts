import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import modelsRouter from './routes/models.js';
import generateRouter from './routes/generate.js';
import configRouter from './routes/config.js';
import orchestratorConfigRouter from './routes/orchestratorConfig.js';
import serversRouter from './routes/servers.js';
import ollamaCompatRouter from './routes/ollamaCompat.js';
import openaiCompatRouter from './routes/openaiCompat.js';
import tagsRouter from './routes/tags.js';
import benchmarksRouter from './routes/benchmarks.js';
import orchestratorRouter from './routes/orchestrator.js';
import modelMapRouter from './routes/modelMap.js';
import performanceRouter from './routes/performance.js';
import { getRAGServiceManager } from './rag/instance.js';
import { createTextToRAGRoutes, initializeTextToRAGService } from './routes/textToRag.js';
import { logError, logInfo, logWarn, logDebug } from './logger.js';
import type { Request, Response, NextFunction } from 'express';
import generatorRouter from './routes/generatorsNew.js';
import characterChatRouter from './routes/characterChat.js';
// Database initialization
import { sharedDatabaseConnection } from './config/database.config.js';



const app = express();
app.use(cors());
// Increase JSON body size limit to 10mb to avoid 'request entity too large' errors
app.use(express.json({ limit: '10mb' }));


// Specialized debugging for orchestrator health/model aggregation issues
import { getOrchestratorInstance } from './orchestrator-instance.js';
app.use((req: Request, res: Response, next: NextFunction) => {
    if (req.originalUrl.startsWith('/api/tags') || req.originalUrl.startsWith('/api/show')) {
        // Log orchestrator state before handling request
        // ...existing code...
    }
    next();
});


logInfo('=== AI Server starting up ===');
logDebug('Debug: Express app initialized');


// Mount routers
app.use('/api', healthRouter);
app.use('/api/models', modelsRouter);
app.use('/api/generate', generateRouter);
app.use('/api/config', configRouter);
app.use('/api/orchestrator/config', orchestratorConfigRouter);
app.use('/api/servers', serversRouter);

// Mount character & universe generator routes
app.use('/api/generate', generatorRouter);

// Mount character chat routes
app.use('/api/chat', characterChatRouter);

// Mount specific API routes BEFORE the compatibility layers to avoid conflicts
app.use('/api/tags', tagsRouter);
app.use('/api/orchestrator/benchmarks', benchmarksRouter);
app.use('/api/orchestrator/performance', performanceRouter);
app.use('/api/orchestrator', orchestratorRouter);
app.use('/api/orchestrator', modelMapRouter);

// Mount Ollama-compatible endpoints at both / and /api for Open WebUI compatibility
app.use('/', ollamaCompatRouter); // for /v1/chat/completions, /create, etc.
app.use('/api', ollamaCompatRouter); // for /api/v1/chat/completions, etc.

// Mount OpenAI-compatible endpoints
app.use('/v1', openaiCompatRouter); // for /v1/models, /v1/chat/completions, etc.
app.use('/api/v1', openaiCompatRouter); // alternative mounting point

// Mount RAG routes
// Note: RAG routes will be mounted asynchronously after initialization
// app.use('/api/rag', ragRouter);


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
            // For plain objects with no message, details should be undefined
            details = undefined;
        }
    } else {
        // null, undefined, or other types
        details = undefined;
    }
    logError(`[ERROR HANDLER] Unhandled error: ${details}`);
    if (stack) logDebug(`[ERROR HANDLER] Stack: ${stack}`);
    // Only include details if defined, to match test expectations
    const response: { error: string; details?: string } = { error: 'Internal server error' };
    if (details !== undefined) response.details = details;
    res.status(500).json(response);
});

// Initialize RAG system asynchronously
async function initializeRAGSystem() {
    try {
        logInfo('Initializing RAG system...');
        const ragServiceManager = await getRAGServiceManager();

        // Import and create the simple RAG router with all endpoints
        logDebug('Creating simple RAG router with all endpoints...');
        const { createSimpleRAGRouter } = await import('./rag/routes/simple-rag.routes.js');
        const ragRouter = createSimpleRAGRouter(ragServiceManager);

        app.use('/api/rag', ragRouter);
        logInfo('RAG system initialized and all routes mounted successfully');

        // Log available routes for debugging
        logDebug('Available RAG routes:');
        logDebug('- GET    /api/rag/health');
        logDebug('- GET    /api/rag/stats');
        logDebug('- POST   /api/rag/nodes');
        logDebug('- GET    /api/rag/nodes/:id');
        logDebug('- GET    /api/rag/nodes');
        logDebug('- PUT    /api/rag/nodes/:id');
        logDebug('- DELETE /api/rag/nodes/:id');
        logDebug('- POST   /api/rag/relationships');
        logDebug('- POST   /api/rag/context');
        logDebug('- POST   /api/rag/search');
        logDebug('- GET    /api/rag/nodes/:id/connected');
        logDebug('- GET    /api/rag/universes/:universeId/stats');
        logDebug('- POST   /api/rag/universes/:universeId/sync');

    } catch (error) {
        logError(`Failed to initialize RAG system: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            logDebug(`Stack trace: ${error.stack}`);
        }
        // RAG system is optional - server can still run without it
    }
}

// Initialize Text-to-RAG Parser system asynchronously
async function initializeTextToRAGSystem() {
    try {
        logInfo('Initializing Text-to-RAG Parser system...');

        // Initialize the service
        await initializeTextToRAGService();

        // Mount the routes
        const textToRAGRouter = createTextToRAGRoutes();
        app.use('/api/text-to-rag', textToRAGRouter);

        logInfo('Text-to-RAG Parser system initialized and routes mounted successfully');

        // Log available routes for debugging
        logDebug('Available Text-to-RAG routes:');
        logDebug('- POST   /api/text-to-rag/parse');
        logDebug('- POST   /api/text-to-rag/parse-sync');
        logDebug('- GET    /api/text-to-rag/job/:jobId/status');
        logDebug('- GET    /api/text-to-rag/job/:jobId/results');
        logDebug('- DELETE /api/text-to-rag/job/:jobId');
        logDebug('- GET    /api/text-to-rag/queue/stats');
        logDebug('- GET    /api/text-to-rag/health');

    } catch (error) {
        logError(`Failed to initialize Text-to-RAG Parser system: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            logDebug(`Stack trace: ${error.stack}`);
        }
        // Text-to-RAG system is optional - server can still run without it
    }
}

// Start RAG initialization in background
initializeRAGSystem().catch(error => {
    logError(`RAG system initialization failed: ${error instanceof Error ? error.message : String(error)}`);
});

// Initialize Performance RAG system asynchronously
async function initializePerformanceRAGSystem() {
    try {
        logInfo('Initializing Performance RAG system...');

        // Import the orchestrator instance
        const { getOrchestratorInstance } = await import('./orchestrator-instance.js');
        const orchestrator = getOrchestratorInstance();

        // Initialize Performance RAG service
        const { getModelPerformanceRAGService } = await import('./services/modelPerformanceRAG.service.js');
        await getModelPerformanceRAGService(orchestrator);

        logInfo('Performance RAG system initialized - automatic benchmark sync enabled');

    } catch (error) {
        logError(`Failed to initialize Performance RAG system: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            logDebug(`Stack trace: ${error.stack}`);
        }
        // Performance RAG system is optional - server can still run without it
    }
}

// Start Performance RAG initialization in background (after RAG system)
setTimeout(() => {
    initializePerformanceRAGSystem().catch(error => {
        logError(`Performance RAG system initialization failed: ${error instanceof Error ? error.message : String(error)}`);
    });
}, 2000); // Wait 2 seconds for RAG system to initialize first

// Start Text-to-RAG initialization in background
initializeTextToRAGSystem().catch(error => {
    logError(`Text-to-RAG system initialization failed: ${error instanceof Error ? error.message : String(error)}`);
});

// Initialize Character Memory system asynchronously
async function initializeCharacterMemorySystem() {
    try {
        logInfo('Initializing Character Memory system...');

        // Import and mount character memory routes
        const characterMemoryRouter = await import('./routes/characterMemory.js');
        app.use('/api/memory', characterMemoryRouter.default);

        logInfo('Character Memory system initialized and routes mounted successfully');

        // Log available routes for debugging
        logDebug('Available Character Memory routes:');
        logDebug('- GET    /api/memory/characters/:characterId');
        logDebug('- GET    /api/memory/characters/:characterId/relevant');
        logDebug('- POST   /api/memory/gap-filling');
        logDebug('- POST   /api/memory/approve');
        logDebug('- GET    /api/memory/pending-approvals');
        logDebug('- POST   /api/memory/book-extraction');
        logDebug('- POST   /api/memory/user-interaction');
        logDebug('- DELETE /api/memory/:memoryId');
        logDebug('- GET    /api/memory/stats');
        logDebug('- GET    /api/memory/health');

    } catch (error) {
        logError(`Failed to initialize Character Memory system: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            logDebug(`Stack trace: ${error.stack}`);
        }
        // Character Memory system is optional - server can still run without it
    }
}

// Start Character Memory initialization in background
initializeCharacterMemorySystem().catch(error => {
    logError(`Character Memory system initialization failed: ${error instanceof Error ? error.message : String(error)}`);
});

// Initialize database connection
async function initializeDatabase() {
    try {
        await sharedDatabaseConnection.connect();
        logInfo('AI Server successfully connected to shared MongoDB database');
    } catch (error) {
        logError(`Failed to connect to MongoDB database: ${error instanceof Error ? error.message : String(error)}`);
        process.exit(1);
    }
}

// Initialize database before starting the server
await initializeDatabase();

export default app;
