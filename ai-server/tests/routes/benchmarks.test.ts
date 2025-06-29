import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

let benchmarksRouter: any;
let orchestratorInstance: any;

describe('Benchmarks API', () => {
    let app: express.Express;
    let orchestratorMock: any;

    beforeAll(async () => {
        await jest.unstable_mockModule('../../src/orchestrator-instance', () => ({
            getOrchestratorInstance: jest.fn(),
            __esModule: true
        }));
        benchmarksRouter = (await import('../../src/routes/benchmarks')).default;
        orchestratorInstance = await import('../../src/orchestrator-instance');
    });

    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api/orchestrator/benchmarks', benchmarksRouter);
        orchestratorMock = {
            getServers: jest.fn(() => [
                { id: 's1', models: ['m1', 'm2'] },
                { id: 's2', models: ['m3'] }
            ]),
            getBenchmark: jest.fn(() => ({ latencyMs: 100, throughput: 10 })),
            getInFlight: jest.fn(() => 0),
            runBenchmarks: jest.fn(async () => { }),
            benchmarkServerModel: jest.fn(async () => { })
        };
        orchestratorInstance.getOrchestratorInstance.mockReturnValue(orchestratorMock);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('GET /api/orchestrator/benchmarks returns all benchmarks', async () => {
        const res = await request(app).get('/api/orchestrator/benchmarks/');
        expect(res.status).toBe(200);
        expect(res.body.benchmarks.length).toBe(3);
        expect(orchestratorMock.getBenchmark).toHaveBeenCalled();
    });

    it('POST /api/orchestrator/benchmarks/run triggers all benchmarks', async () => {
        const res = await request(app).post('/api/orchestrator/benchmarks/run');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(orchestratorMock.runBenchmarks).toHaveBeenCalled();
    });

    it('POST /api/orchestrator/benchmarks/server triggers all models for a server', async () => {
        const res = await request(app)
            .post('/api/orchestrator/benchmarks/server')
            .send({ serverId: 's1' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.serverId).toBe('s1');
        expect(orchestratorMock.benchmarkServerModel).toHaveBeenCalledTimes(2);
    });

    it('POST /api/orchestrator/benchmarks/server triggers a specific model', async () => {
        const res = await request(app)
            .post('/api/orchestrator/benchmarks/server')
            .send({ serverId: 's1', model: 'm1' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.serverId).toBe('s1');
        expect(res.body.model).toBe('m1');
        expect(orchestratorMock.benchmarkServerModel).toHaveBeenCalledWith(
            expect.objectContaining({ id: 's1' }),
            'm1'
        );
    });

    it('POST /api/orchestrator/benchmarks/server returns 404 for missing server', async () => {
        orchestratorMock.getServers.mockReturnValue([]);
        const res = await request(app)
            .post('/api/orchestrator/benchmarks/server')
            .send({ serverId: 'notfound' });
        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/server not found/i);
    });

    it('POST /api/orchestrator/benchmarks/server returns 404 for missing model', async () => {
        const res = await request(app)
            .post('/api/orchestrator/benchmarks/server')
            .send({ serverId: 's1', model: 'notfound' });
        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/model not found/i);
    });
});
