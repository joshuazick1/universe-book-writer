// Mock fetch BEFORE any imports
const mockFetch = jest.fn();
global.fetch = mockFetch as any;

// Mock node-fetch module as well for good measure
jest.mock('node-fetch', () => mockFetch);

import { describe, it, expect, beforeEach, afterEach, beforeAll, jest } from '@jest/globals';
import request from 'supertest';
import { AIOrchestrator } from '../../../src/orchestrator.js';
import { ensureMockServersInitialized, setServerModels, setServerTags } from '../../helpers/test-helpers.js';

let app: any;
let orchestrator: AIOrchestrator;

beforeAll(async () => {
    const appModule = await import('../../../src/index.js');
    app = appModule.default;
});

afterAll(() => {
    jest.restoreAllMocks();
});

beforeEach(() => {
    orchestrator = new AIOrchestrator();
    // Set the orchestrator on app.locals so the routes use our test orchestrator
    app.locals.orchestrator = orchestrator;

    // Reset and configure the fetch mock for each test
    mockFetch.mockReset();
    mockFetch.mockImplementation(async (...args: unknown[]) => {
        const url = args[0] as string;
        const server = orchestrator.getServers().find((s: any) => url.includes(s.url));
        if (server && Array.isArray((server as any).tags)) {
            return {
                ok: true,
                status: 200,
                json: async () => ({ models: (server as any).tags })
            } as any;
        }
        return {
            ok: true,
            status: 200,
            json: async () => ({ models: [] })
        } as any;
    });
});

describe('/api/tags advanced/edge cases', () => {
    let fetchCallCount = 0;
    function debugOrchestratorState(label: string) {
        process.stdout.write(`\nDEBUG [${label}] orchestrator servers: ${JSON.stringify(orchestrator.getServers(), null, 2)}\n`);
        process.stdout.write(`DEBUG [${label}] all models: ${JSON.stringify(orchestrator.getServers().flatMap((s: any) => s.models), null, 2)}\n`);
        process.stdout.write(`DEBUG [${label}] all tags: ${JSON.stringify(orchestrator.getServers().map((s: any) => ({ id: s.id, tags: (s as any).tags })), null, 2)}\n`);
        process.stdout.write(`DEBUG [${label}] fetchCallCount: ${fetchCallCount}\n`);
    }
    function setupFetchForAllServers() {
        fetchCallCount = 0;
        // Update the existing mock to count calls
        mockFetch.mockImplementation(async (...args: unknown[]) => {
            const url = args[0] as string;
            fetchCallCount++;
            process.stdout.write(`DEBUG [fetch] Called with URL: ${url}\n`);
            const server = orchestrator.getServers().find((s: any) => url.includes(s.url));
            process.stdout.write(`DEBUG [fetch] Found server: ${server ? server.id : 'none'}\n`);
            if (server && Array.isArray((server as any).tags)) {
                const response = { models: (server as any).tags };
                process.stdout.write(`DEBUG [fetch] Returning response: ${JSON.stringify(response)}\n`);
                return { ok: true, status: 200, json: async () => response } as any;
            }
            process.stdout.write(`DEBUG [fetch] Returning empty models\n`);
            return { ok: true, status: 200, json: async () => ({ models: [] }) } as any;
        });
        process.stdout.write(`\nDEBUG [setupFetchForAllServers] fetch mock set up\n`);
    }
    function assertOrchestratorHasServer(serverId: string) {
        const server = orchestrator.getServers().find((s: any) => s.id === serverId);
        expect(server).toBeDefined();
    }
    it('GET handles a model with missing fields gracefully', async () => {
        console.log('TEST: Starting missing fields test');
        ensureMockServersInitialized(orchestrator, [
            { id: 's3', url: 'http://localhost:9003', models: ['modelC'], healthy: true }
        ]);
        console.log('TEST: After ensureMockServersInitialized:', JSON.stringify(orchestrator.getServers(), null, 2));
        setServerModels(orchestrator, 's3', ['modelC']);
        console.log('TEST: After setServerModels:', JSON.stringify(orchestrator.getServers(), null, 2));
        setServerTags(orchestrator, 's3', [{ model: 'modelC' }]);
        console.log('TEST: After setServerTags:', JSON.stringify(orchestrator.getServers(), null, 2));

        // Use test-friendly cache refresh instead of relying on fetch
        (orchestrator as any).refreshTagsCacheFromServerData();
        console.log('TEST: After refreshTagsCacheFromServerData');

        console.log('TEST: About to make request to /api/tags');
        const res = await request(app).get('/api/tags');
        console.log('TEST: Response status:', res.status);
        console.log('TEST: Response body:', JSON.stringify(res.body));
        expect(res.status).toBe(200);
        const model = res.body.models.find((m: any) => m.model === 'modelC');
        expect(model).toBeDefined();
        expect(model.size).toBeDefined();
        expect(model.digest).toBeDefined();
        expect(model.details).toBeDefined();
    });
    it('GET includes a model present on only one server', async () => {
        ensureMockServersInitialized(orchestrator, [
            { id: 's4', url: 'http://localhost:9004', models: ['uniqueModel'], healthy: true }
        ]);
        setServerModels(orchestrator, 's4', ['uniqueModel']);
        setServerTags(orchestrator, 's4', [{ model: 'uniqueModel', name: 'uniqueModel', size: 123, digest: 'abc', details: {} }]);

        // Use test-friendly cache refresh
        (orchestrator as any).refreshTagsCacheFromServerData();

        const res = await request(app).get('/api/tags');
        expect(res.status).toBe(200);
        const model = res.body.models.find((m: any) => m.model === 'uniqueModel');
        expect(model).toBeDefined();
        expect(model.name).toBe('uniqueModel');
    });
    it('GET skips a server that returns invalid data but still aggregates from others', async () => {
        ensureMockServersInitialized(orchestrator, [
            { id: 's5', url: 'http://localhost:9005', models: [], healthy: true },
            { id: 's6', url: 'http://localhost:9006', models: ['modelA'], healthy: true }
        ]);
        setServerModels(orchestrator, 's6', ['modelA']);
        setServerTags(orchestrator, 's5', [{}]);
        setServerTags(orchestrator, 's6', [{ model: 'modelA', size: 99, digest: 'def', details: {} }]);

        // Use test-friendly cache refresh
        (orchestrator as any).refreshTagsCacheFromServerData();

        const res = await request(app).get('/api/tags');
        expect(res.status).toBe(200);
        const model = res.body.models.find((m: any) => m.model === 'modelA');
        expect(model).toBeDefined();
        expect(model.size).toBe(99);
    });
    it('GET does not fail if all servers are down or return invalid', async () => {
        // No servers configured, should return empty array
        const res = await request(app).get('/api/tags');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.models)).toBe(true);
        expect(res.body.models.length).toBe(0);
    });
});
