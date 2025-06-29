/**
 * AIOrchestrator Benchmarking & Concurrency Unit Tests
 * Coverage: runBenchmarks, getBenchmark, setBenchmark, getInFlight, incrementInFlight, decrementInFlight, concurrency-aware routing
 */
import { describe, it, expect, beforeEach } from '@jest/globals';
import { AIOrchestrator } from '../../src/orchestrator.js';


describe('AIOrchestrator Benchmarks & Concurrency', () => {
    let orchestrator: AIOrchestrator;
    beforeEach(() => {
        orchestrator = new AIOrchestrator();
        orchestrator.addServer({ id: 's1', url: 'http://a', type: 'ollama' });
        orchestrator.addServer({ id: 's2', url: 'http://b', type: 'ollama' });
        // Simulate healthy servers with models
        orchestrator.getServers().forEach(s => {
            s.healthy = true;
            s.models = ['m1', 'm2'];
        });
    });

    it('should run and store benchmarks for all server/model pairs', async () => {
        await orchestrator.runBenchmarks();
        for (const s of orchestrator.getServers()) {
            for (const m of s.models) {
                const bench = orchestrator.getBenchmark(s.id, m);
                expect(bench).toBeDefined();
                expect(typeof bench!.latencyMs).toBe('number');
                expect(typeof bench!.throughput).toBe('number');
            }
        }
    });

    it('should track in-flight requests per server/model', () => {
        expect(orchestrator.getInFlight('s1', 'm1')).toBe(0);
        orchestrator.incrementInFlight('s1', 'm1');
        expect(orchestrator.getInFlight('s1', 'm1')).toBe(1);
        orchestrator.incrementInFlight('s1', 'm1');
        expect(orchestrator.getInFlight('s1', 'm1')).toBe(2);
        orchestrator.decrementInFlight('s1', 'm1');
        expect(orchestrator.getInFlight('s1', 'm1')).toBe(1);
        orchestrator.decrementInFlight('s1', 'm1');
        expect(orchestrator.getInFlight('s1', 'm1')).toBe(0);
    });

    it('should respect maxConcurrency in getBestServerForModel', () => {
        orchestrator.getServers()[0].maxConcurrency = 1;
        orchestrator.incrementInFlight('s1', 'm1');
        // s1 is now at max concurrency, should pick s2
        const best = orchestrator.getBestServerForModel('m1');
        expect(best?.id).toBe('s2');
        // Both at max, should return undefined
        orchestrator.getServers()[1].maxConcurrency = 1;
        orchestrator.incrementInFlight('s2', 'm1');
        expect(orchestrator.getBestServerForModel('m1')).toBeUndefined();
    });
});
