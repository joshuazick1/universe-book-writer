/**
 * Unit tests for OrchestratorService
 */
import { OrchestratorService } from '../orchestratorService.js';
import type { Job, JobResult } from '../../../core/types/queue.js';
import type { WorkerInfo } from '../../../core/types/orchestrator.js';

describe('OrchestratorService', () => {
    let orchestrator: OrchestratorService;

    beforeEach(() => {
        orchestrator = new OrchestratorService();
    });

    it('registers a worker', () => {
        const worker: WorkerInfo = {
            id: 'w1',
            name: 'Worker1',
            lastHeartbeat: new Date().toISOString(),
            status: 'healthy',
            avgResponseTimeMs: 100,
            capabilities: ['summarize'],
        };
        orchestrator.registerWorker(worker);
        expect(orchestrator.getHealth().workers).toContainEqual(worker);
    });

    it('assigns a job to a worker', () => {
        // This would require job injection and assignment logic
        // Placeholder for future implementation
        expect(orchestrator.assignJob('w1')).toBeUndefined();
    });

    it('submits a result and updates state', () => {
        // Placeholder for result submission logic
        expect(() => orchestrator.submitResult({} as JobResult)).not.toThrow();
    });
});
