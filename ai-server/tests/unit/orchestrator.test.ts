/**
 * AIOrchestrator Unit Tests
 * Coverage: addServer, removeServer, getServers, updateAllStatus, getModelMap, getAllModels, markFailure, isInCooldown, getBestServerForModel, tryRequestWithFailover
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
        const a = addMockServerTo(orchestrator, { id: 'a', url: '', healthy: true, models: ['m1', 'm2'] });
        const b = addMockServerTo(orchestrator, { id: 'b', url: '', healthy: true, models: ['m2', 'm3'] });
        const c = addMockServerTo(orchestrator, { id: 'c', url: '', healthy: false, models: ['m4'] });
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
        const a = addMockServerTo(orchestrator, { id: 'a', url: '', healthy: true, models: ['m1'] });
        const b = addMockServerTo(orchestrator, { id: 'b', url: '', healthy: true, models: ['m1'] });
        expect(a).toBeDefined();
        expect(b).toBeDefined();
        // Manually set lastResponseTime for test ordering
        orchestrator.getServers().find(s => s.id === 'a')!.lastResponseTime = 10;
        orchestrator.getServers().find(s => s.id === 'b')!.lastResponseTime = 5;
        expect(orchestrator.getBestServerForModel('m1')?.id).toBe('b');
        orchestrator.markFailure('b', 'm1');
        expect(orchestrator.getBestServerForModel('m1')?.id).toBe('a');
        (orchestrator as any)['permanentBan'].add('a:m1');
        expect(orchestrator.getBestServerForModel('m1')).toBeUndefined();
    });

    it('should try request with failover and handle permanent errors', async () => {
        // @ts-ignore
        orchestrator['servers'] = [
            { id: 'a', url: '', type: 'ollama', healthy: true, lastResponseTime: 10, models: ['m1'] },
            { id: 'b', url: '', type: 'ollama', healthy: true, lastResponseTime: 20, models: ['m1'] },
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
});
