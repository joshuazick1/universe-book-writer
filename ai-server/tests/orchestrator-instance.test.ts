import { jest } from '@jest/globals';

// Mock the persistence module before importing any other modules
jest.unstable_mockModule('../src/orchestrator-persistence.js', () => ({
    saveServersToDisk: jest.fn(),
    loadServersFromDisk: jest.fn(() => [])
}));

let orchestratorInstance: any;
let AIOrchestrator: any;
let persistenceMock: any;

beforeAll(async () => {
    persistenceMock = await import('../src/orchestrator-persistence.js');
    orchestratorInstance = await import('../src/orchestrator-instance.js');
    AIOrchestrator = (await import('../src/orchestrator.js')).AIOrchestrator;
});

describe('orchestrator-instance.ts', () => {
    afterEach(() => {
        orchestratorInstance.resetOrchestratorInstance();
        jest.clearAllMocks();
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

    it('should handle error/fallback logic in addServer/removeServer patching', async () => {
        const orchestrator = orchestratorInstance.getOrchestratorInstance();

        // Simulate saveServersToDisk throwing
        (persistenceMock.saveServersToDisk as jest.Mock).mockImplementation(() => {
            throw new Error('Disk error');
        });

        expect(() => orchestrator.addServer({ id: 'fail', url: 'http://fail', type: 'ollama' })).toThrow('Disk error');

        // Reset mock and test removeServer
        (persistenceMock.saveServersToDisk as jest.Mock).mockImplementation(() => {
            throw new Error('Disk error');
        });

        expect(() => orchestrator.removeServer('fail')).toThrow('Disk error');
    });
});
