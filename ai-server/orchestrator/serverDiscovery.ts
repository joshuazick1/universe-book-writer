import { getOrchestratorInstance } from '../src/orchestrator-instance.js';
// ai-server/orchestrator/serverDiscovery.ts
// Discovery and health management for model servers using RAG
import { getModelPerformanceRAGService } from '../src/services/modelPerformanceRAG.service.js';



/**
 * Mark a server as unhealthy for a given model (persistent, via RAG).
 */
export async function markServerUnhealthy(modelId: string, serverId: string, reason = 'unknown', expiryMs = 24 * 60 * 60 * 1000): Promise<void> {
    const orchestrator = getOrchestratorInstance();
    const ragService = await getModelPerformanceRAGService(orchestrator);
    const ragManager = ragService.getRagManager();
    const benchmarkManager = ragService['benchmarkManager'];
    const { HealthStatusService } = await import('../src/services/healthStatusService.js');
    await HealthStatusService.syncModelServerHealthStatus({
        ragManager,
        benchmarkManager,
        serverId,
        modelName: modelId,
        status: 'unhealthy',
        reason,
        expiryMs
    });
    // Optionally, log or trigger additional hooks here
}


/**
 * Get only healthy servers for a model (filters out unhealthy ones, via RAG).
 */
export async function getHealthyServersForModel(modelId: string): Promise<string[]> {
    const orchestrator = getOrchestratorInstance();
    const ragService = await getModelPerformanceRAGService(orchestrator);
    const ragManager = ragService.getRagManager();
    const allRegisteredServers = orchestrator.getServers();
    const allServers = allRegisteredServers.filter((s: any) => s.models.includes(modelId));
    // Try both nodeType and type for compatibility
    let perfNodes = await ragManager.searchNodes('', { nodeType: 'model-performance', modelName: modelId }, 1000);
    if (!perfNodes || perfNodes.length === 0) {
        perfNodes = await ragManager.searchNodes('', { type: 'model-performance', modelName: modelId }, 1000);
    }
    // If still empty, try searching for all model-performance nodes (no modelName filter)
    if (!perfNodes || perfNodes.length === 0) {
        const allPerfNodes = await ragManager.searchNodes('', { nodeType: 'model-performance' }, 1000);
        const allPerfNodesType = await ragManager.searchNodes('', { type: 'model-performance' }, 1000);
        // Try to filter manually for modelName
        const matching = (allPerfNodesType || []).filter((n: any) => {
            const attrModel = n?.content?.attributes?.modelName;
            const metaModel = n?.metadata?.modelName;
            const match = attrModel === modelId || metaModel === modelId;
            return match;
        });
        perfNodes = matching;
    }
    // (console logs removed)
    // If still no model-performance nodes exist, treat all servers as healthy
    if (!perfNodes || perfNodes.length === 0) {
        return allServers.map((s: any) => s.id);
    }
    const unhealthyServers = new Set(
        (perfNodes || [])
            .filter((n: any) => {
                const health = n?.content?.attributes?.health;
                const isUnhealthy = health?.status === 'unhealthy';
                const notExpired = health && new Date(health.expiresAt) > new Date();
                if (isUnhealthy && notExpired) {
                }
                return isUnhealthy && notExpired;
            })
            .map((n: any) => n?.content?.attributes?.serverId)
    );
    const healthyServers = allServers
        .map((s: any) => s.id)
        .filter((id: string) => !unhealthyServers.has(id));
    return healthyServers;
}


/**
 * Get servers for a model, filtering out unhealthy ones (default for orchestrator, via RAG).
 */
export async function getServersForModel(modelId: string): Promise<string[]> {
    return getHealthyServersForModel(modelId);
}

/**
 * Get server latency for a model (not implemented in RAG, returns 9999).
 */
export async function getServerLatency(serverId: string, modelId: string): Promise<number> {
    // Measure latency by POSTing to /api/generate endpoint and timing the response
    const url = `http://${serverId.replace(/^https?:\/\//, '').replace(/\/$/, '')}/api/generate`;
    // Use a minimal, deterministic prompt for consistent latency measurement
    const payload = {
        model: modelId,
        prompt: 'ping',
        stream: false,
        options: {
            temperature: 0,
            max_tokens: 1
        }
    };
    const fetch = (global as any).fetch || require('node-fetch');
    const start = Date.now();
    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            timeout: 8000 // 8s timeout for latency check
        });
        const elapsed = Date.now() - start;
        if (!response.ok) {
            console.error(`[getServerLatency] Non-OK response from ${url}:`, response.status, response.statusText);
            return 9999;
        }
        // Optionally, parse and check the response for errors
        let result;
        try {
            result = await response.json();
        } catch (jsonErr) {
            console.error(`[getServerLatency] Failed to parse JSON from ${url}:`, jsonErr);
            return 9999;
        }
        // If the response contains an error, treat as failure
        if (result && result.error) {
            console.error(`[getServerLatency] Error in /api/generate response from ${url}:`, result.error);
            return 9999;
        }
        // Return the measured round-trip time in ms
        return elapsed;
    } catch (err) {
        console.error(`[getServerLatency] Error fetching latency from ${url}:`, err);
        return 9999;
    }
}
