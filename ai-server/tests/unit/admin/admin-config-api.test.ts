import { describe, it, expect, beforeEach, beforeAll, jest } from '@jest/globals';
import request from 'supertest';
import { ensureMockServersInitialized, installOllamaServerFetchMock } from '../../helpers/test-helpers.js';
import { getOrchestratorInstance, resetOrchestratorInstance } from '../../../src/orchestrator-instance.js';

let app: any;

beforeAll(async () => {
    const appModule = await import('../../../src/index.js');
    app = appModule.default;
});

beforeEach(() => {
    jest.clearAllMocks();
    resetOrchestratorInstance();
    const orchestrator = getOrchestratorInstance();
    ensureMockServersInitialized(orchestrator, [
        {
            id: 'mock1',
            url: 'http://localhost:9999',
            models: ['test-model'],
            tags: [{
                name: 'test-model',
                model: 'test-model',
                modified_at: new Date().toISOString(),
                size: 1234,
                digest: 'abc',
                details: { version: '1.0.0' }
            }],
            healthy: true
        }
    ]);
    installOllamaServerFetchMock(orchestrator);
});

describe('/api/config', () => {
    it('GET returns current config', async () => {
        const res = await request(app).get('/api/config');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('modelDir');
    });
    it('POST updates config and returns new config', async () => {
        const res = await request(app).post('/api/config').send({ modelDir: '/new' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(res.body.config).toHaveProperty('modelDir', '/new');
    });
    it('POST with invalid body merges config (edge case)', async () => {
        const res = await request(app).post('/api/config').send({ extra: 123 });
        expect(res.status).toBe(200);
        expect(res.body.config).toHaveProperty('extra', 123);
    });
});

describe('/api/orchestrator/config', () => {
    it('GET returns orchestrator settings', async () => {
        const res = await request(app).get('/api/orchestrator/config');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('servers');
        expect(res.body).toHaveProperty('cooldownMs');
    });
    it('POST updates servers and cooldown', async () => {
        const servers = [{ id: 'test', url: 'http://localhost:9999', type: 'ollama' }];
        const res = await request(app).post('/api/orchestrator/config').send({ servers, cooldownMs: 1234 });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(Array.isArray(res.body.servers)).toBe(true);
        expect(res.body.cooldownMs).toBe(1234);
    });
    it('POST with invalid servers does not crash', async () => {
        const res = await request(app).post('/api/orchestrator/config').send({ servers: 'not-an-array' });
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.servers)).toBe(true);
    });
    it('POST with missing body does not crash', async () => {
        const res = await request(app).post('/api/orchestrator/config').send({});
        expect(res.status).toBe(200);
        expect(Array.isArray(res.body.servers)).toBe(true);
    });
});

describe('/api/servers', () => {
    it('GET returns list of servers', async () => {
        const res = await request(app).get('/api/servers');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('servers');
        expect(Array.isArray(res.body.servers)).toBe(true);
    });
    it('POST replaces servers (success)', async () => {
        const servers = [{ id: 'test2', url: 'http://localhost:9998', type: 'ollama' }];
        const res = await request(app).post('/api/servers').send({ servers });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('success', true);
        expect(Array.isArray(res.body.servers)).toBe(true);
    });
    it('POST with missing servers returns 400', async () => {
        const res = await request(app).post('/api/servers').send({});
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });
    it('POST with servers not array returns 400', async () => {
        const res = await request(app).post('/api/servers').send({ servers: 'bad' });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });
});
