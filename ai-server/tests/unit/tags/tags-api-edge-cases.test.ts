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
});

describe('/api/tags advanced/edge cases', () => {
    let fetchSpy: any;
    beforeEach(async () => {
        await request(app).post('/api/orchestrator/config').send({ servers: [] });
        fetchSpy = jest.spyOn(global, 'fetch' as any).mockImplementation(async (...args: unknown[]) => {
            const url = args[0] as string;
            const server = orchestrator.getServers().find((s: any) => url.includes(s.url));
            if (server && Array.isArray((server as any).tags)) {
                return { ok: true, json: async () => ({ models: (server as any).tags }) } as any;
            }
            return { ok: true, json: async () => ({ models: [] }) } as any;
        });
    });
    afterEach(() => {
        fetchSpy.mockRestore();
    });
    let fetchCallCount = 0;
    function debugOrchestratorState(label: string) {
        process.stdout.write(`\nDEBUG [${label}] orchestrator servers: ${JSON.stringify(orchestrator.getServers(), null, 2)}\n`);
        process.stdout.write(`DEBUG [${label}] all models: ${JSON.stringify(orchestrator.getServers().flatMap((s: any) => s.models), null, 2)}\n`);
        process.stdout.write(`DEBUG [${label}] all tags: ${JSON.stringify(orchestrator.getServers().map((s: any) => ({ id: s.id, tags: (s as any).tags })), null, 2)}\n`);
        process.stdout.write(`DEBUG [${label}] fetchCallCount: ${fetchCallCount}\n`);
    }
    function setupFetchForAllServers() {
        fetchCallCount = 0;
        fetchSpy.mockImplementation(async (url: string) => {
            fetchCallCount++;
            const server = orchestrator.getServers().find((s: any) => url.includes(s.url));
            if (server && Array.isArray((server as any).tags)) {
                return { ok: true, json: async () => ({ models: (server as any).tags }) } as any;
            }
            return { ok: true, json: async () => ({ models: [] }) } as any;
        });
        process.stdout.write(`\nDEBUG [setupFetchForAllServers] fetch mock set up\n`);
    }
    function assertOrchestratorHasServer(serverId: string) {
        const server = orchestrator.getServers().find((s: any) => s.id === serverId);
        expect(server).toBeDefined();
    }
    it('GET handles a model with missing fields gracefully', async () => {
        // Debug: POST start
        process.stdout.write('DEBUG: Starting POST /api/orchestrator/config for s3\n');
        await request(app)
            .post('/api/orchestrator/config')
            .send({ servers: [{ id: 's3', url: 'http://localhost:9003', type: 'ollama' }] });
        process.stdout.write('DEBUG: POST /api/orchestrator/config for s3 completed\n');
        ensureMockServersInitialized(orchestrator, [
            { id: 's3', url: 'http://localhost:9003', models: ['modelC'], healthy: true }
        ]);
        process.stdout.write('DEBUG: After ensureMockServersInitialized: ' + JSON.stringify(orchestrator.getServers(), null, 2) + '\n');
        setServerModels(orchestrator, 's3', ['modelC']);
        process.stdout.write('DEBUG: After setServerModels: ' + JSON.stringify(orchestrator.getServers(), null, 2) + '\n');
        setServerTags(orchestrator, 's3', [{ model: 'modelC' }]);
        process.stdout.write('DEBUG: After setServerTags: ' + JSON.stringify(orchestrator.getServers(), null, 2) + '\n');
        setupFetchForAllServers();
        assertOrchestratorHasServer('s3');
        await orchestrator.updateAllStatus();
        process.stdout.write('DEBUG: Orchestrator servers before request: ' + JSON.stringify(orchestrator.getServers(), null, 2) + '\n');
        const res = await request(app).get('/api/tags');
        process.stdout.write('DEBUG: Response body for missing fields: ' + JSON.stringify(res.body) + '\n');
        expect(res.status).toBe(200);
        const model = res.body.models.find((m: any) => m.model === 'modelC');
        expect(model).toBeDefined();
        expect(model.size).toBeDefined();
        expect(model.digest).toBeDefined();
        expect(model.details).toBeDefined();
    });
    it('GET includes a model present on only one server', async () => {
        process.stdout.write('DEBUG: Starting POST /api/orchestrator/config for s4\n');
        await request(app)
            .post('/api/orchestrator/config')
            .send({ servers: [{ id: 's4', url: 'http://localhost:9004', type: 'ollama' }] });
        process.stdout.write('DEBUG: POST /api/orchestrator/config for s4 completed\n');
        ensureMockServersInitialized(orchestrator, [
            { id: 's4', url: 'http://localhost:9004', models: ['uniqueModel'], healthy: true }
        ]);
        process.stdout.write('DEBUG: After ensureMockServersInitialized: ' + JSON.stringify(orchestrator.getServers(), null, 2) + '\n');
        setServerModels(orchestrator, 's4', ['uniqueModel']);
        process.stdout.write('DEBUG: After setServerModels: ' + JSON.stringify(orchestrator.getServers(), null, 2) + '\n');
        setServerTags(orchestrator, 's4', [{ model: 'uniqueModel', name: 'uniqueModel', size: 123, digest: 'abc', details: {} }]);
        process.stdout.write('DEBUG: After setServerTags: ' + JSON.stringify(orchestrator.getServers(), null, 2) + '\n');
        setupFetchForAllServers();
        assertOrchestratorHasServer('s4');
        await orchestrator.updateAllStatus();
        process.stdout.write('DEBUG: Orchestrator servers before request: ' + JSON.stringify(orchestrator.getServers(), null, 2) + '\n');
        const res = await request(app).get('/api/tags');
        process.stdout.write('DEBUG: Response body for uniqueModel: ' + JSON.stringify(res.body) + '\n');
        expect(res.status).toBe(200);
        const model = res.body.models.find((m: any) => m.model === 'uniqueModel');
        expect(model).toBeDefined();
        expect(model.name).toBe('uniqueModel');
    });
    it('GET skips a server that returns invalid data but still aggregates from others', async () => {
        process.stdout.write('DEBUG: Starting POST /api/orchestrator/config for s5/s6\n');
        await request(app)
            .post('/api/orchestrator/config')
            .send({
                servers: [
                    { id: 's5', url: 'http://localhost:9005', type: 'ollama' },
                    { id: 's6', url: 'http://localhost:9006', type: 'ollama' }
                ]
            });
        process.stdout.write('DEBUG: POST /api/orchestrator/config for s5/s6 completed\n');
        ensureMockServersInitialized(orchestrator, [
            { id: 's5', url: 'http://localhost:9005', models: [], healthy: true },
            { id: 's6', url: 'http://localhost:9006', models: ['modelA'], healthy: true }
        ]);
        process.stdout.write('DEBUG: After ensureMockServersInitialized: ' + JSON.stringify(orchestrator.getServers(), null, 2) + '\n');
        setServerModels(orchestrator, 's6', ['modelA']);
        process.stdout.write('DEBUG: After setServerModels: ' + JSON.stringify(orchestrator.getServers(), null, 2) + '\n');
        setServerTags(orchestrator, 's5', [{}]);
        setServerTags(orchestrator, 's6', [{ model: 'modelA', size: 99, digest: 'def', details: {} }]);
        process.stdout.write('DEBUG: After setServerTags: ' + JSON.stringify(orchestrator.getServers(), null, 2) + '\n');
        setupFetchForAllServers();
        assertOrchestratorHasServer('s5');
        assertOrchestratorHasServer('s6');
        await orchestrator.updateAllStatus();
        process.stdout.write('DEBUG: Orchestrator servers before request: ' + JSON.stringify(orchestrator.getServers(), null, 2) + '\n');
        const res = await request(app).get('/api/tags');
        process.stdout.write('DEBUG: Response body for modelA: ' + JSON.stringify(res.body) + '\n');
        expect(res.status).toBe(200);
        const model = res.body.models.find((m: any) => m.model === 'modelA');
        expect(model).toBeDefined();
        expect(model.size).toBe(99);
    });
    it('GET does not fail if all servers are down or return invalid', async () => {
        await request(app).post('/api/orchestrator/config').send({ servers: [] });
        fetchSpy.mockImplementation(async () => {
            return { ok: false, json: async () => ({}) } as any;
        });
        const res = await request(app).get('/api/tags');
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.models)).toBe(true);
        expect(res.body.models.length).toBe(0);
    });
});
