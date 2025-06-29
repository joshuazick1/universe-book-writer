import { jest } from '@jest/globals';
let orchestratorInstance: any;
let AIOrchestrator: any;

beforeAll(async () => {
    orchestratorInstance = await import('../src/orchestrator-instance');
    AIOrchestrator = (await import('../src/orchestrator')).AIOrchestrator;
});

describe('orchestrator-instance.ts', () => {
    afterEach(() => {
        orchestratorInstance.resetOrchestratorInstance();
    });

    it('should create a singleton orchestrator instance', () => {
        const inst1 = orchestratorInstance.getOrchestratorInstance();
        const inst2 = orchestratorInstance.getOrchestratorInstance();
        expect(inst1).toBe(inst2);
        expect(inst1).toBeInstanceOf(AIOrchestrator);
    });

    it('should reset the orchestrator singleton', () => {
        const inst1 = orchestratorInstance.getOrchestratorInstance();
        orchestratorInstance.resetOrchestratorInstance();
        const inst2 = orchestratorInstance.getOrchestratorInstance();
        expect(inst1).not.toBe(inst2);
        expect(inst2).toBeInstanceOf(AIOrchestrator);
    });

    it('should handle error/fallback logic in addServer/removeServer patching', () => {
        const orchestrator = orchestratorInstance.getOrchestratorInstance();
        // Simulate addServer/saveServersToDisk throwing
        const spy = jest.spyOn(
            require('../src/orchestrator-persistence'),
            'saveServersToDisk'
        ).mockImplementation(() => { throw new Error('Disk error'); });
        expect(() => orchestrator.addServer({ id: 'fail', url: 'http://fail', type: 'ollama' })).toThrow('Disk error');
        spy.mockRestore();
        // Simulate removeServer/saveServersToDisk throwing
        const spy2 = jest.spyOn(
            require('../src/orchestrator-persistence'),
            'saveServersToDisk'
        ).mockImplementation(() => { throw new Error('Disk error'); });
        expect(() => orchestrator.removeServer('fail')).toThrow('Disk error');
        spy2.mockRestore();
    });
});
