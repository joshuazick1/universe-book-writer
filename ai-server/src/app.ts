import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import modelsRouter from './routes/models.js';
import generateRouter from './routes/generate.js';
import configRouter from './routes/config.js';
import orchestratorConfigRouter from './routes/orchestratorConfig.js';
import serversRouter from './routes/servers.js';
import ollamaCompatRouter from './routes/ollamaCompat.js';
import tagsRouter from './routes/tags.js';
import benchmarksRouter from './routes/benchmarks.js';
import orchestratorRouter from './routes/orchestrator.js';
import modelMapRouter from './routes/modelMap.js';
import { logError, logInfo, logWarn, logDebug } from './logger.js';
import type { Request, Response, NextFunction } from 'express';


const app = express();
app.use(cors());
app.use(express.json());


logInfo('=== AI Server starting up ===');
logDebug('Debug: Express app initialized');

// Mount routers
app.use('/api', healthRouter);
app.use('/api/models', modelsRouter);
app.use('/api/generate', generateRouter);
app.use('/api/config', configRouter);
app.use('/api/orchestrator/config', orchestratorConfigRouter);
app.use('/api/servers', serversRouter);
app.use('/api', ollamaCompatRouter); // for /api/create, /api/push, etc.
app.use('/api/tags', tagsRouter);
app.use('/api/orchestrator/benchmarks', benchmarksRouter);
app.use('/api/orchestrator', orchestratorRouter);
app.use('/api/orchestrator', modelMapRouter);

// Error handler
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
    logError(`[ERROR HANDLER] Unhandled error: ${err?.message || err}`);
    logDebug(`[ERROR HANDLER] Stack: ${err?.stack}`);
    res.status(500).json({ error: 'Internal server error', details: err?.message });
});

export default app;
