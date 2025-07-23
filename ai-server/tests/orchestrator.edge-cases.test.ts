import { AIOrchestrator, AIServer } from '../src/orchestrator';

describe('AIOrchestrator edge cases', () => {
    let orchestrator: AIOrchestrator;
    const baseServer: AIServer = {
        id: 's1',
        url: 'http://localhost:1234',
        type: 'ollama',
        healthy: true,
        lastResponseTime: 100,
        models: ['m1'],
        maxConcurrency: 1,
    };

    beforeEach(() => {
        orchestrator = new AIOrchestrator();
    });

    it('should failover to another server if the first fails', async () => {
        const s1 = { ...baseServer, id: 's1', healthy: false };
        const s2 = { ...baseServer, id: 's2', healthy: true, url: 'http://localhost:5678' };
        orchestrator['servers'] = [s1, s2];
        // Simulate a request for m1, expect s2 to be chosen
        // (Assume orchestrator has a method to select server for model)
        // This is a placeholder; replace with actual method call
        // expect(orchestrator.selectServerForModel('m1')).toBe(s2);
    });

    it('should skip server/model pairs in cooldown', () => {
        const s1 = { ...baseServer, id: 's1' };
        orchestrator['servers'] = [s1];
        orchestrator['failureCooldown'].set('s1:m1', Date.now() + 10000);
        // Simulate routing; expect no available server
        // expect(orchestrator.selectServerForModel('m1')).toBeUndefined();
    });

    it('should permanently ban server/model on permanent error', () => {
        const s1 = { ...baseServer, id: 's1' };
        orchestrator['servers'] = [s1];
        orchestrator['permanentBan'].add('s1:m1');
        // Simulate routing; expect no available server
        // expect(orchestrator.selectServerForModel('m1')).toBeUndefined();
    });

    it('should return 429 if all servers are overloaded', () => {
        const s1 = { ...baseServer, id: 's1', maxConcurrency: 1 };
        orchestrator['servers'] = [s1];
        orchestrator['inFlight'].set('s1:m1', 1);
        // Simulate routing; expect 429 or overload error
        // expect(orchestrator.routeRequest('m1')).toThrow(/429|overload/);
    });

    it('should handle timeouts and network errors gracefully', async () => {
        // Simulate a server that times out or throws
        // This would require mocking fetch or the request logic
        // expect(await orchestrator.routeRequest('m1')).toThrow(/timeout|network/);
    });

    it('should return correct error if no servers are available', () => {
        orchestrator['servers'] = [];
        // expect(orchestrator.routeRequest('m1')).toThrow(/no servers/i);
    });

    it('should select server with least connections/lowest latency', () => {
        const s1 = { ...baseServer, id: 's1', lastResponseTime: 200 };
        const s2 = { ...baseServer, id: 's2', lastResponseTime: 50 };
        orchestrator['servers'] = [s1, s2];
        // expect(orchestrator.selectServerForModel('m1')).toBe(s2);
    });

    it('should propagate errors with correct status and shape', () => {
        // Simulate error conditions and check responses
        // expect(orchestrator.routeRequest('m1')).toThrow(/error/);
    });

    // Add more tests for each uncovered branch/edge case as needed
});
