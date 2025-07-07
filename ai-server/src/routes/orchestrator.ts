import { Router } from 'express';
import type { Request, Response } from 'express';
import { getOrchestratorInstance } from '../orchestrator-instance.js';

/**
 * Orchestrator API routes for model and server management.
 * Implements endpoints for adding/removing/uploading models, managing servers, and listing model versions.
 * All logic is delegated to the orchestrator instance and application layer per CLEAN_BACKEND_ARCHITECTURE_PLAN.md.
 *
 * Endpoints:
 *   POST   /api/orchestrator/models/add      - Add a model to a specific server
 *   DELETE /api/orchestrator/models/:model   - Remove a model from a specific server or all servers
 *   POST   /api/orchestrator/models/upload   - Upload a new model (with versioning support)
 *   GET    /api/orchestrator/models/versions - List all versions of a model
 *   POST   /api/orchestrator/servers/add     - Add a new server (with config)
 *   DELETE /api/orchestrator/servers/:id     - Remove a server
 *   PATCH  /api/orchestrator/servers/:id     - Update server config (concurrency, health, etc.)
 */

const router = Router();


// POST /api/orchestrator/models/add-fleet
/**
 * Add a model to all servers in the fleet.
 * Request body: { model: string }
 * Response: { success: true, model, results: Array<{ serverId, status, error? }> }
 */
router.post('/models/add-fleet', ((req: Request, res: Response) => {
    const { model } = req.body || {};
    if (!model) {
        return res.status(400).json({ error: 'model is required' });
    }
    const orchestrator = getOrchestratorInstance();
    const results = [];
    for (const server of orchestrator.getServers()) {
        if (server.models.includes(model)) {
            results.push({ serverId: server.id, status: 'exists' });
        } else {
            try {
                server.models.push(model);
                results.push({ serverId: server.id, status: 'added' });
            } catch (err) {
                results.push({ serverId: server.id, status: 'error', error: (err instanceof Error ? err.message : String(err)) });
            }
        }
    }
    return res.status(200).json({ success: true, model, results });
}) as any);

// POST /api/orchestrator/models/add
router.post('/models/add', ((req: Request, res: Response) => {
    const { serverId, model } = req.body || {};
    if (!serverId || !model) {
        return res.status(400).json({ error: 'serverId and model are required' });
    }
    const orchestrator = getOrchestratorInstance();
    const server = orchestrator.getServers().find(s => s.id === serverId);
    if (!server) {
        return res.status(404).json({ error: `Server '${serverId}' not found` });
    }
    if (server.models.includes(model)) {
        return res.status(409).json({ error: `Model '${model}' already exists on server '${serverId}'` });
    }
    server.models.push(model);
    return res.status(200).json({ success: true, serverId, model });
}) as any);

// DELETE /api/orchestrator/models/:model
router.delete('/models/:model', ((req: Request, res: Response) => {
    const { model } = req.params;
    const { serverId } = req.query;
    const orchestrator = getOrchestratorInstance();
    let found = false;
    if (serverId) {
        const server = orchestrator.getServers().find(s => s.id === serverId);
        if (!server) return res.status(404).json({ error: `Server '${serverId}' not found` });
        const idx = server.models.indexOf(model);
        if (idx !== -1) {
            server.models.splice(idx, 1);
            found = true;
        }
    } else {
        for (const server of orchestrator.getServers()) {
            const idx = server.models.indexOf(model);
            if (idx !== -1) {
                server.models.splice(idx, 1);
                found = true;
            }
        }
    }
    if (!found) return res.status(404).json({ error: `Model '${model}' not found on any server` });
    return res.status(200).json({ success: true, model });
}) as any);

// POST /api/orchestrator/models/upload
router.post('/models/upload', ((req: Request, res: Response) => {
    const { serverId, model, version } = req.body || {};
    if (!serverId || !model || !version) {
        return res.status(400).json({ error: 'serverId, model, and version are required' });
    }
    // TODO: handle file upload (multipart/form-data)
    // For now, just simulate success
    return res.status(200).json({ success: true, serverId, model, version });
}) as any);

// GET /api/orchestrator/models/versions
router.get('/models/versions', ((req: Request, res: Response) => {
    const { model } = req.query;
    if (!model) return res.status(400).json({ error: 'model is required' });
    // Simulate version lookup (stub)
    // In a real system, this would query a model registry or metadata store
    return res.status(200).json({ model, versions: ['1.0.0', '1.1.0', '2.0.0'] });
}) as any);

// POST /api/orchestrator/servers/add
router.post('/servers/add', ((req: Request, res: Response) => {
    const { id, url, type, maxConcurrency } = req.body || {};
    if (!id || !url || !type) {
        return res.status(400).json({ error: 'id, url, and type are required' });
    }
    const orchestrator = getOrchestratorInstance();
    if (orchestrator.getServers().some(s => s.id === id)) {
        return res.status(409).json({ error: `Server '${id}' already exists` });
    }
    orchestrator.addServer({ id, url, type, maxConcurrency });
    return res.status(200).json({ success: true, id, url, type, maxConcurrency });
}) as any);

// DELETE /api/orchestrator/servers/:id
router.delete('/servers/:id', ((req: Request, res: Response) => {
    const { id } = req.params;
    const orchestrator = getOrchestratorInstance();
    if (!orchestrator.getServers().some(s => s.id === id)) {
        return res.status(404).json({ error: `Server '${id}' not found` });
    }
    orchestrator.removeServer(id);
    return res.status(200).json({ success: true, id });
}) as any);

// PATCH /api/orchestrator/servers/:id
router.patch('/servers/:id', ((req: Request, res: Response) => {
    const { id } = req.params;
    const { maxConcurrency } = req.body || {};
    const orchestrator = getOrchestratorInstance();
    const server = orchestrator.getServers().find(s => s.id === id);
    if (!server) return res.status(404).json({ error: `Server '${id}' not found` });
    if (typeof maxConcurrency === 'number') server.maxConcurrency = maxConcurrency;
    return res.status(200).json({ success: true, id, maxConcurrency });
}) as any);

// GET /api/orchestrator/model-map
/**
 * Get model-to-servers and server-to-models mapping
 */
router.get('/model-map', ((req: Request, res: Response) => {
    const orchestrator = getOrchestratorInstance();
    const servers = orchestrator.getServers();

    const modelToServers: Record<string, string[]> = {};
    const serverToModels: Record<string, string[]> = {};

    // Build the mappings
    for (const server of servers) {
        serverToModels[server.id] = [...server.models];

        for (const model of server.models) {
            if (!modelToServers[model]) {
                modelToServers[model] = [];
            }
            modelToServers[model].push(server.id);
        }
    }

    return res.json({
        modelToServers,
        serverToModels,
        totalModels: Object.keys(modelToServers).length,
        totalServers: servers.length,
        totalCombinations: Object.values(serverToModels).reduce((sum, models) => sum + models.length, 0)
    });
}) as any);

// GET /api/orchestrator/rag/analytics
/**
 * Get comprehensive analytics from the RAG system including usage statistics,
 * model deployment stats, and frequent combinations.
 */
router.get('/rag/analytics', (async (req: Request, res: Response) => {
    try {
        const orchestrator = getOrchestratorInstance();
        const ragService = await orchestrator.getRAGService();

        if (!ragService) {
            return res.status(503).json({
                error: 'RAG service not available',
                message: 'The orchestrator RAG integration is not initialized'
            });
        }

        // Get comprehensive analytics data
        const [deploymentStats, frequentCombinations] = await Promise.all([
            ragService.getModelDeploymentStats(),
            ragService.getFrequentModelServerCombinations({
                limit: 50,
                includeMetrics: true
            })
        ]);

        return res.json({
            analytics: {
                deploymentStats,
                frequentCombinations,
                timestamp: new Date().toISOString()
            }
        });
    } catch (error: any) {
        return res.status(500).json({
            error: 'Failed to fetch RAG analytics',
            message: error.message
        });
    }
}) as any);

// GET /api/orchestrator/rag/model-performance
/**
 * Search for model performance data in the RAG system.
 * Query params: search (string), limit (number)
 */
router.get('/rag/model-performance', (async (req: Request, res: Response) => {
    try {
        const { search, limit } = req.query;
        const orchestrator = getOrchestratorInstance();
        const ragService = await orchestrator.getRAGService();

        if (!ragService) {
            return res.status(503).json({
                error: 'RAG service not available'
            });
        }

        const query = search as string || 'model performance server';
        const results = await ragService.queryModelPerformance(query);

        // Transform results for frontend consumption
        const performanceData = results.slice(0, Number(limit) || 100).map((node: any) => {
            const attributes = node.content?.attributes || {};
            return {
                id: node.id,
                serverId: attributes.serverId,
                modelName: attributes.modelName,
                performanceMetrics: attributes.performanceMetrics || {},
                usageFrequency: attributes.usageFrequency || {},
                usagePatterns: attributes.usagePatterns || {},
                lastUsed: attributes.lastUsed,
                totalUsageCount: attributes.totalUsageCount || 0
            };
        });

        return res.json({
            query,
            count: performanceData.length,
            performanceData
        });
    } catch (error: any) {
        return res.status(500).json({
            error: 'Failed to query model performance',
            message: error.message
        });
    }
}) as any);

// GET /api/orchestrator/rag/best-models
/**
 * Get best performing models for a specific task from RAG analysis.
 * Query params: taskType, maxLatency, minThroughput, quality
 */
router.get('/rag/best-models', (async (req: Request, res: Response) => {
    try {
        const { taskType, maxLatency, minThroughput, quality } = req.query;
        const orchestrator = getOrchestratorInstance();
        const ragService = await orchestrator.getRAGService();

        if (!ragService) {
            return res.status(503).json({
                error: 'RAG service not available'
            });
        }

        const requirements: any = {};
        if (maxLatency) requirements.maxLatency = Number(maxLatency);
        if (minThroughput) requirements.minThroughput = Number(minThroughput);
        if (quality) requirements.quality = quality as string;

        const bestModels = await ragService.getBestModelsForTask(
            taskType as string || 'general',
            requirements
        );

        return res.json({
            taskType: taskType || 'general',
            requirements,
            bestModels,
            count: bestModels.length
        });
    } catch (error: any) {
        return res.status(500).json({
            error: 'Failed to get best models',
            message: error.message
        });
    }
}) as any);

// GET /api/orchestrator/rag/usage-stats
/**
 * Get usage statistics for a specific time range.
 * Query params: startDate, endDate, serverId, modelName, taskType
 */
router.get('/rag/usage-stats', (async (req: Request, res: Response) => {
    try {
        const { startDate, endDate, serverId, modelName, taskType } = req.query;
        const orchestrator = getOrchestratorInstance();
        const ragService = await orchestrator.getRAGService();

        if (!ragService) {
            return res.status(503).json({
                error: 'RAG service not available'
            });
        }

        // Default to last 30 days if no dates provided
        const end = endDate ? new Date(endDate as string) : new Date();
        const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

        const filters: any = {};
        if (serverId) filters.serverId = serverId as string;
        if (modelName) filters.modelName = modelName as string;
        if (taskType) filters.taskType = taskType as string;

        const usageStats = await ragService.getUsageStatsByTimeRange(
            { startDate: start, endDate: end },
            filters
        );

        return res.json({
            timeRange: { startDate: start, endDate: end },
            filters,
            usageStats
        });
    } catch (error: any) {
        return res.status(500).json({
            error: 'Failed to get usage statistics',
            message: error.message
        });
    }
}) as any);

export default router;
