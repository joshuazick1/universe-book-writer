// orchestrator.test.ts
// Tests for /api/orchestrator endpoints

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { getOrchestratorInstance, resetOrchestratorInstance } from '../../src/orchestrator-instance';

// Import the router after mocking
const orchestratorRouter = await import('../../src/routes/orchestrator');

describe('/api/orchestrator endpoints', () => {
    let app: express.Express;
    let orchestrator: any;

    beforeAll(() => {
        // Reset orchestrator and set up test state
        resetOrchestratorInstance();
        orchestrator = getOrchestratorInstance();
    });

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/orchestrator', orchestratorRouter.default);

        // Reset all mocks
        jest.clearAllMocks();
    });

    describe('POST /models/add-fleet', () => {
        it('adds model to all servers', async () => {
            mockOrchestratorInstance.getServers.mockReturnValue([
                { id: 's1', models: [] },
                { id: 's2', models: ['foo'] },
            ]);

            const res = await request(app).post('/api/orchestrator/models/add-fleet').send({ model: 'bar' });
            expect(res.status).toBe(200);
            expect(res.body.results).toEqual([
                { serverId: 's1', status: 'added' },
                { serverId: 's2', status: 'added' },
            ]);
        });

        it('returns 400 if model missing', async () => {
            const res = await request(app).post('/api/orchestrator/models/add-fleet').send({});
            expect(res.status).toBe(400);
        });
    });

    describe('POST /models/add', () => {
        it('adds model to server', async () => {
            mockOrchestratorInstance.getServers.mockReturnValue([
                { id: 's1', models: [] },
            ]);

            const res = await request(app).post('/api/orchestrator/models/add').send({ serverId: 's1', model: 'bar' });
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('added');
        });

        it('returns 400 if params missing', async () => {
            const res = await request(app).post('/api/orchestrator/models/add').send({});
            expect(res.status).toBe(400);
        });

        it('returns 404 if server not found', async () => {
            mockOrchestratorInstance.getServers.mockReturnValue([]);
            const res = await request(app).post('/api/orchestrator/models/add').send({ serverId: 's1', model: 'bar' });
            expect(res.status).toBe(404);
        });

        it('returns 409 if model exists', async () => {
            mockOrchestratorInstance.getServers.mockReturnValue([
                { id: 's1', models: ['bar'] },
            ]);
            const res = await request(app).post('/api/orchestrator/models/add').send({ serverId: 's1', model: 'bar' });
            expect(res.status).toBe(409);
        });
    });

    describe('DELETE /models/:model', () => {
        it('removes model from all servers', async () => {
            const servers = [
                { id: 's1', models: ['foo', 'bar'] },
                { id: 's2', models: ['bar'] },
            ];
            mockOrchestratorInstance.getServers.mockReturnValue(servers);
            const res = await request(app).delete('/api/orchestrator/models/bar');
            expect(res.status).toBe(200);
            expect(res.body.results).toEqual([
                { serverId: 's1', status: 'removed' },
                { serverId: 's2', status: 'removed' },
            ]);
        });

        it('removes model from specific server', async () => {
            const servers = [{ id: 's1', models: ['foo', 'bar'] }];
            mockOrchestratorInstance.getServers.mockReturnValue(servers);
            const res = await request(app).delete('/api/orchestrator/models/bar?serverId=s1');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('removed');
        });

        it('returns 404 if model not found', async () => {
            mockOrchestratorInstance.getServers.mockReturnValue([{ id: 's1', models: ['foo'] }]);
            const res = await request(app).delete('/api/orchestrator/models/bar');
            expect(res.status).toBe(404);
        });
    });

    describe('POST /models/upload', () => {
        it('returns 200 for valid upload', async () => {
            const res = await request(app).post('/api/orchestrator/models/upload').send({});
            expect(res.status).toBe(200);
        });

        it('returns 200 for valid upload', async () => {
            const res = await request(app).post('/api/orchestrator/models/upload').send({ serverId: 's1', model: 'foo', version: '1.0.0' });
            expect(res.status).toBe(200);
        });
    });

    describe('GET /models/versions', () => {
        it('returns versions for model', async () => {
            const res = await request(app).get('/api/orchestrator/models/versions');
            expect(res.status).toBe(200);
            expect(res.body.versions).toBeDefined();
        });

        it('returns versions for model', async () => {
            const res = await request(app).get('/api/orchestrator/models/versions?model=foo');
            expect(res.status).toBe(200);
            expect(res.body.versions).toBeDefined();
        });
    });

    describe('POST /servers/add', () => {
        it('adds a new server', async () => {
            mockOrchestratorInstance.getServers.mockReturnValue([]);
            const res = await request(app).post('/api/orchestrator/servers/add').send({ id: 's1', url: 'http://s1', type: 'ollama' });
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('added');
        });

        it('returns 400 if params missing', async () => {
            const res = await request(app).post('/api/orchestrator/servers/add').send({});
            expect(res.status).toBe(400);
        });

        it('returns 409 if server exists', async () => {
            mockOrchestratorInstance.getServers.mockReturnValue([{ id: 's1' }]);
            const res = await request(app).post('/api/orchestrator/servers/add').send({ id: 's1', url: 'http://s1', type: 'ollama' });
            expect(res.status).toBe(409);
        });
    });

    describe('DELETE /servers/:id', () => {
        it('removes a server', async () => {
            const res = await request(app).delete('/api/orchestrator/servers/s1');
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('removed');
        });
    });

    describe('PUT /servers/:id/config', () => {
        it('updates maxConcurrency', async () => {
            const res = await request(app).put('/api/orchestrator/servers/s1/config').send({ maxConcurrency: 5 });
            expect(res.status).toBe(200);
            expect(res.body.status).toBe('updated');
        });
    });
});
