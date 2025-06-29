import { AIOrchestrator } from './orchestrator.js';
import { saveServersToDisk, loadServersFromDisk } from './orchestrator-persistence.js';
import { saveBenchmarksToDisk, loadBenchmarksFromDisk } from './orchestrator-benchmark-persistence.js';

// Singleton orchestrator instance
let orchestrator: AIOrchestrator | null = null;

/**
 * Get the singleton orchestrator instance.
 * Always returns the same instance unless resetOrchestrator is called.
 */
export function getOrchestratorInstance(): AIOrchestrator {
    if (!orchestrator) {
        orchestrator = new AIOrchestrator();
        // Load servers from disk and add to orchestrator
        const persisted = loadServersFromDisk();
        for (const s of persisted) {
            orchestrator.addServer({ id: s.id, url: s.url, type: s.type });
        }
        // (Benchmark persistence removed)
    }
    return orchestrator;
}
// (Benchmark persistence patch removed)

// Patch addServer/removeServer to persist
// Patch addServer/removeServer to persist
const origAdd = AIOrchestrator.prototype.addServer;
AIOrchestrator.prototype.addServer = function (server) {
    origAdd.call(this, server);
    saveServersToDisk(this.getServers());
};
const origRemove = AIOrchestrator.prototype.removeServer;
AIOrchestrator.prototype.removeServer = function (id) {
    origRemove.call(this, id);
    saveServersToDisk(this.getServers());
};

/**
 * Reset the orchestrator singleton (for test isolation only).
 * After calling this, the next getOrchestratorInstance() will create a new orchestrator.
 */
export function resetOrchestratorInstance(): void {
    orchestrator = null;
}

// Default export for legacy usage (for app code)
export default getOrchestratorInstance;
