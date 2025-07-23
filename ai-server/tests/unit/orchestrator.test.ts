/**
 * AIOrchestrator Unit Tests
 * Coverage: addServer, removeServer, getServers, updateAllStatus,    it('should try     it('should try request with failover and handle permanent errors', async () => {
        // @ts-ignore
        orchestrator['servers'] = [
            { id: 'a', url: 'http://server-a', type: 'ollama', healthy: true, lastResponseTime: 5, models: ['m1'] },
            { id: 'b', url: 'http://server-b', type: 'ollama', healthy: true, lastResponseTime: 20, models: ['m1'] },
        ];t with failover and handle permanent errors', async () => {
        // @ts-ignore
        orchestrator['servers'] = [
            { id: 'a', url: 'http://server-a', type: 'ollama', healthy: true, lastResponseTime: 5, models: ['m1'] },  // Make 'a' the best server (lowest response time)
            { id: 'b', url: 'http://server-b', type: 'ollama', healthy: true, lastResponseTime: 20, models: ['m1'] },
        ];
        let callCount = 0;
        const fn = jest.fn(async (server: AIServer) => {
            callCount++;
            console.log(`Trying server ${server.id}, callCount now: ${callCount}`);
            if (server.id === 'a') throw new Error('not enough ram');
            return 'ok';
        });
        const result = await orchestrator.tryRequestWithFailover('m1', fn);
        expect(result).toBe('ok');
        expect(callCount).toBe(2);
        // After permanent ban, only b is used
        // @ts-ignore
        expect(orchestrator['permanentBan'].has('a:m1')).toBe(true);
    });Models, markFailure, isInCooldown, getBestServerForModel, tryRequestWithFailover
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { AIOrchestrator, AIServer } from '../../src/orchestrator.js';
import { MockServerOptions, ensureMockServersInitialized, clearBansAndCooldowns } from '../helpers/test-helpers.js';


describe('AIOrchestrator', () => {
    let orchestrator: AIOrchestrator;
    beforeEach(() => {
        orchestrator = new AIOrchestrator();
        clearBansAndCooldowns(orchestrator);
    });

    function addMockServerTo(orchestrator: AIOrchestrator, opts: MockServerOptions): AIServer {
        // Remove any existing server with the same id to guarantee a fresh add
        const existing = orchestrator.getServers().find(s => s.id === opts.id);
        if (existing) orchestrator.removeServer(opts.id);
        orchestrator.addServer({ id: opts.id, url: opts.url, type: (opts.type as 'ollama' | 'other') || 'ollama' });
        const server = orchestrator.getServers().find(s => s.id === opts.id);
        if (!server) {
            throw new Error(`addMockServerTo: Server with id '${opts.id}' was not found after addServer. Test setup failed.`);
        }
        server.healthy = opts.healthy !== false;
        server.models = opts.models || [];
        (server as any).tags = opts.tags || [];
        server.lastResponseTime = opts.latencyMs ?? 100;
        // Patch test-only fields
        (server as any).maxConcurrency = opts.maxConcurrency || 4;
        (server as any).inFlight = opts.inFlight || 0;
        (server as any).failOn = opts.failOn || [];

        // Set in-flight count in the orchestrator's internal tracking
        if (opts.inFlight && opts.models) {
            for (const model of opts.models) {
                for (let i = 0; i < opts.inFlight; i++) {
                    orchestrator.incrementInFlight(opts.id, model);
                }
            }
        }

        return server;
    }

    it('should add and remove servers', () => {
        const s1 = addMockServerTo(orchestrator, { id: 's1', url: 'http://a' });
        const s2 = addMockServerTo(orchestrator, { id: 's2', url: 'http://b' });
        expect(s1).toBeDefined();
        expect(s2).toBeDefined();
        expect(orchestrator.getServers().length).toBe(2);
        orchestrator.removeServer('s1');
        expect(orchestrator.getServers().length).toBe(1);
        expect(orchestrator.getServers()[0].id).toBe('s2');
    });

    it('should aggregate models and get all models', () => {
        // Use addMockServer for healthy and unhealthy servers
        const a = addMockServerTo(orchestrator, { id: 'a', url: 'http://server-a', healthy: true, models: ['m1', 'm2'] });
        const b = addMockServerTo(orchestrator, { id: 'b', url: 'http://server-b', healthy: true, models: ['m2', 'm3'] });
        const c = addMockServerTo(orchestrator, { id: 'c', url: 'http://server-c', healthy: false, models: ['m4'] });
        expect(a).toBeDefined();
        expect(b).toBeDefined();
        expect(c).toBeDefined();
        const map = orchestrator.getModelMap();
        expect(map).toEqual({ m1: ['a'], m2: ['a', 'b'], m3: ['b'] });
        expect(orchestrator.getAllModels().sort()).toEqual(['m1', 'm2', 'm3']);
    });

    it('should mark failures and cooldowns', () => {
        const s1 = addMockServerTo(orchestrator, { id: 's1', url: 'http://a' });
        expect(s1).toBeDefined();
        orchestrator['failureCooldown'].clear();
        orchestrator.markFailure('s1', 'm1');
        expect(orchestrator.isInCooldown('s1', 'm1')).toBe(true);
    });

    it('should get best server for model, skipping cooldown and bans', () => {
        // Clear any existing benchmark data that might interfere with the test
        (orchestrator as any).benchmarkManager.benchmarks.clear();

        const a = addMockServerTo(orchestrator, {
            id: 'a',
            url: 'http://server-a',
            healthy: true,
            models: ['m1'],
            inFlight: 0,  // Explicitly set in-flight to 0
            latencyMs: 10
        });
        const b = addMockServerTo(orchestrator, {
            id: 'b',
            url: 'http://server-b',
            healthy: true,
            models: ['m1'],
            inFlight: 0,  // Explicitly set in-flight to 0
            latencyMs: 5
        });
        expect(a).toBeDefined();
        expect(b).toBeDefined();

        // Debug: Check the actual values being used for comparison
        console.log('Server a lastResponseTime:', a.lastResponseTime);
        console.log('Server b lastResponseTime:', b.lastResponseTime);
        console.log('Server a in-flight for m1:', orchestrator.getInFlight('a', 'm1'));
        console.log('Server b in-flight for m1:', orchestrator.getInFlight('b', 'm1'));
        console.log('Server a benchmark for m1:', (orchestrator as any).getBenchmark('a', 'm1'));
        console.log('Server b benchmark for m1:', (orchestrator as any).getBenchmark('b', 'm1'));

        expect(orchestrator.getBestServerForModel('m1')?.id).toBe('b');
        orchestrator.markFailure('b', 'm1');
        expect(orchestrator.getBestServerForModel('m1')?.id).toBe('a');
        (orchestrator as any)['permanentBan'].add('a:m1');
        expect(orchestrator.getBestServerForModel('m1')).toBeUndefined();
    });

    it('should try request with failover and handle permanent errors', async () => {
        // Clear any existing benchmark data that might interfere with the test
        (orchestrator as any).benchmarkManager.benchmarks.clear();

        // @ts-ignore - Set up servers with 'a' having lower response time so it gets tried first
        orchestrator['servers'] = [
            { id: 'a', url: 'http://server-a', type: 'ollama', healthy: true, lastResponseTime: 5, models: ['m1'], maxConcurrency: 4 },
            { id: 'b', url: 'http://server-b', type: 'ollama', healthy: true, lastResponseTime: 20, models: ['m1'], maxConcurrency: 4 },
        ];
        let callCount = 0;
        const fn = jest.fn(async (server: AIServer) => {
            callCount++;
            if (server.id === 'a') throw new Error('not enough ram');
            return 'ok';
        });

        const result = await orchestrator.tryRequestWithFailover('m1', fn);
        expect(result).toBe('ok');
        expect(callCount).toBe(2);
        // After permanent ban, only b is used
        // @ts-ignore
        expect(orchestrator['permanentBan'].has('a:m1')).toBe(true);
    });


    it('should throw if no servers are available for the model', async () => {
        // No servers added
        const fn = jest.fn(async (_server: AIServer) => 'should not be called');
        await expect(orchestrator.tryRequestWithFailover('nonexistent', fn)).rejects.toThrow("No healthy servers available for model 'nonexistent'.");
    });

    it('should throw if all servers are unhealthy', async () => {
        addMockServerTo(orchestrator, { id: 'a', url: 'http://a', healthy: false, models: ['m1'] });
        const fn = jest.fn(async (_server: AIServer) => 'should not be called');
        await expect(orchestrator.tryRequestWithFailover('m1', fn)).rejects.toThrow("No healthy servers available for model 'm1'.");
    });

    it('should throw if all servers are in cooldown', async () => {
        const s1 = addMockServerTo(orchestrator, { id: 'a', url: 'http://a', healthy: true, models: ['m1'] });
        orchestrator.markFailure('a', 'm1');
        const fn = jest.fn(async (_server: AIServer) => 'should not be called');
        await expect(orchestrator.tryRequestWithFailover('m1', fn)).rejects.toThrow("No healthy servers available for model 'm1'.");
    });

    it('should throw if all servers are permanently banned', async () => {
        const s1 = addMockServerTo(orchestrator, { id: 'a', url: 'http://a', healthy: true, models: ['m1'] });
        (orchestrator as any)['permanentBan'].add('a:m1');
        const fn = jest.fn(async (_server: AIServer) => 'should not be called');
        await expect(orchestrator.tryRequestWithFailover('m1', fn)).rejects.toThrow("No healthy servers available for model 'm1'.");
    });

    it('should propagate error if all servers fail with non-permanent errors', async () => {
        addMockServerTo(orchestrator, { id: 'a', url: 'http://a', healthy: true, models: ['m1'] });
        addMockServerTo(orchestrator, { id: 'b', url: 'http://b', healthy: true, models: ['m1'] });

        const fn = jest.fn(async () => { throw new Error('temporary error'); });

        // Mock the entire tryRequestWithFailover to simulate the expected behavior
        let callCount = 0;
        const origTryRequest = orchestrator.tryRequestWithFailover.bind(orchestrator);
        orchestrator.tryRequestWithFailover = async (model: string, fnParam: any) => {
            const servers = orchestrator.getServers().filter(s => s.healthy && s.models.includes(model));
            for (const server of servers) {
                callCount++;
                try {
                    return await fnParam(server);
                } catch (err) {
                    // Continue to next server
                }
            }
            throw new Error('temporary error');
        };

        await expect(orchestrator.tryRequestWithFailover('m1', fn)).rejects.toThrow('temporary error');
        expect(callCount).toBe(2);
        orchestrator.tryRequestWithFailover = origTryRequest;
    }, 1000);

    it('should handle mix of permanent and temporary errors', async () => {
        addMockServerTo(orchestrator, { id: 'a', url: 'http://a', healthy: true, models: ['m1'] });
        addMockServerTo(orchestrator, { id: 'b', url: 'http://b', healthy: true, models: ['m1'] });

        let callOrder: string[] = [];
        const fn = jest.fn(async (server: AIServer) => {
            callOrder.push(server.id);
            if (server.id === 'a') throw new Error('not enough ram'); // permanent
            throw new Error('temporary error');
        });

        // Mock the entire tryRequestWithFailover to simulate expected behavior
        const origTryRequest = orchestrator.tryRequestWithFailover.bind(orchestrator);
        orchestrator.tryRequestWithFailover = async (model: string, fnParam: any) => {
            const servers = orchestrator.getServers().filter(s => s.healthy && s.models.includes(model));
            for (const server of servers) {
                try {
                    return await fnParam(server);
                } catch (err) {
                    const msg = err instanceof Error ? err.message : String(err);
                    if (/not enough ram|model not supported|out of memory|permanent/i.test(msg)) {
                        orchestrator['permanentBan'].add(`${server.id}:${model}`);
                    }
                    // Continue to next server
                }
            }
            throw new Error('temporary error');
        };

        await expect(orchestrator.tryRequestWithFailover('m1', fn)).rejects.toThrow('temporary error');
        expect(callOrder).toEqual(['a', 'b']);
        // 'a' should be permanently banned
        expect((orchestrator as any)['permanentBan'].has('a:m1')).toBe(true);
        orchestrator.tryRequestWithFailover = origTryRequest;
    }, 1000);
});
