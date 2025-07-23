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

    it('should not run benchmarks for unhealthy servers', async () => {
        const s1 = orchestrator.getServers()[0];
        // Clear any existing benchmarks for this server
        for (const m of s1.models) {
            orchestrator.setBenchmark(s1.id, m, { latencyMs: 1, throughput: 1, lastTested: Date.now() });
        }
        s1.healthy = false;
        await orchestrator.runBenchmarks();
        for (const m of s1.models) {
            // If unhealthy, benchmark should not be updated (should remain as set above)
            const bench = orchestrator.getBenchmark(s1.id, m);
            // Accept either unchanged (old) or undefined, but not a new value
            expect(bench?.latencyMs === 1 && bench?.throughput === 1).toBe(true);
        }
    });

    it('should overwrite existing benchmark with setBenchmark', () => {
        const now = Date.now();
        orchestrator.setBenchmark('s1', 'm1', { latencyMs: 100, throughput: 10, lastTested: now });
        expect(orchestrator.getBenchmark('s1', 'm1')).toEqual({ latencyMs: 100, throughput: 10, lastTested: now });
        orchestrator.setBenchmark('s1', 'm1', { latencyMs: 50, throughput: 20, lastTested: now + 1 });
        expect(orchestrator.getBenchmark('s1', 'm1')).toEqual({ latencyMs: 50, throughput: 20, lastTested: now + 1 });
    });

    it('should return undefined for missing benchmark', () => {
        expect(orchestrator.getBenchmark('nope', 'nope')).toBeUndefined();
    });

    it('should not decrement in-flight below zero', () => {
        expect(orchestrator.getInFlight('s1', 'm1')).toBe(0);
        orchestrator.decrementInFlight('s1', 'm1');
        expect(orchestrator.getInFlight('s1', 'm1')).toBe(0);
    });

    it('should handle increment/decrement for unknown server/model', () => {
        expect(orchestrator.getInFlight('unknown', 'unknown')).toBe(0);
        orchestrator.incrementInFlight('unknown', 'unknown');
        expect(orchestrator.getInFlight('unknown', 'unknown')).toBe(1);
        orchestrator.decrementInFlight('unknown', 'unknown');
        expect(orchestrator.getInFlight('unknown', 'unknown')).toBe(0);
    });

    it('should handle extreme benchmark values', () => {
        const now = Date.now();
        orchestrator.setBenchmark('s1', 'm1', { latencyMs: 0, throughput: 0, lastTested: now });
        expect(orchestrator.getBenchmark('s1', 'm1')).toEqual({ latencyMs: 0, throughput: 0, lastTested: now });
        orchestrator.setBenchmark('s1', 'm1', { latencyMs: 1e9, throughput: 1e6, lastTested: now + 1 });
        expect(orchestrator.getBenchmark('s1', 'm1')).toEqual({ latencyMs: 1e9, throughput: 1e6, lastTested: now + 1 });
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
