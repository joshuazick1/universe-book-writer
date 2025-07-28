// ai-server/services/ragServiceManager.ts
// Singleton RAG Service Manager for orchestrator and RAG access

import { AIOrchestrator } from '../src/orchestrator.js';
import { ModelPerformanceRAGService } from '../src/services/modelPerformanceRAG.service.js';

let orchestrator: AIOrchestrator | null = null;
let modelPerformanceRAGService: ModelPerformanceRAGService | null = null;


/**
 * Get or initialize the orchestrator instance
 */
export async function getOrchestrator(): Promise<AIOrchestrator> {
    if (!orchestrator) {
        orchestrator = new AIOrchestrator();
        // No initialize method on AIOrchestrator
    }
    return orchestrator;
}


/**
 * Get or initialize the ModelPerformanceRAGService singleton
 */
export async function getModelPerformanceRAGService(): Promise<ModelPerformanceRAGService> {
    if (!modelPerformanceRAGService) {
        const orch = await getOrchestrator();
        modelPerformanceRAGService = new ModelPerformanceRAGService(orch);
        await modelPerformanceRAGService.initialize();
    }
    return modelPerformanceRAGService;
}


/**
 * Get a service manager object with orchestrator and ModelPerformanceRAGService
 */
export async function getRAGServiceManager() {
    return {
        orchestrator: await getOrchestrator(),
        modelPerformanceRAGService: await getModelPerformanceRAGService(),
    };
}
