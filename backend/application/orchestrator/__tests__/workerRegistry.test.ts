/**
 * Unit tests for WorkerRegistry
 */
import { WorkerRegistry } from '../workerRegistry.js';
import type { WorkerInfo } from '../../../core/types/orchestrator.js';

describe('WorkerRegistry', () => {
    let registry: WorkerRegistry;
    beforeEach(() => {
        registry = new WorkerRegistry();
    });

    it('registers and retrieves a worker', () => {
        const worker: WorkerInfo = {
            id: 'w1',
            name: 'Worker1',
            lastHeartbeat: new Date().toISOString(),
            status: 'healthy',
            avgResponseTimeMs: 100,
            capabilities: ['summarize'],
        };
        registry.registerOrUpdateWorker(worker);
        expect(registry.getWorker('w1')).toEqual(worker);
    });

    it('removes a worker', () => {
        const worker: WorkerInfo = {
            id: 'w2',
            name: 'Worker2',
            lastHeartbeat: new Date().toISOString(),
            status: 'healthy',
            avgResponseTimeMs: 100,
            capabilities: ['summarize'],
        };
        registry.registerOrUpdateWorker(worker);
        registry.removeWorker('w2');
        expect(registry.getWorker('w2')).toBeUndefined();
    });
});
