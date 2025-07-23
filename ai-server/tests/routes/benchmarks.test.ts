
import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getOrchestratorInstance, resetOrchestratorInstance } from '../../src/orchestrator-instance.js';

// ES Module __dirname equivalent
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let benchmarksRouter: any;
// Targeted debug output for module resolution
// eslint-disable-next-line no-console
console.log('[benchmarks.test] __dirname:', __dirname);
// eslint-disable-next-line no-console
console.log('[benchmarks.test] process.cwd():', process.cwd());

describe('Benchmarks API', () => {
    let app: express.Express;
    let orchestrator: any;

    beforeAll(async () => {
        // Targeted debug output for import resolution
        // eslint-disable-next-line no-console
        console.log('[benchmarks.test] importing benchmarks router');
        benchmarksRouter = (await import('../../src/routes/benchmarks.js')).default;

        // Reset orchestrator and set up test state
        resetOrchestratorInstance();
        orchestrator = getOrchestratorInstance();
    });

    beforeEach(() => {
        app = express();
        app.use(express.json());

        // Set the orchestrator on app locals (required by routes)
        app.locals.orchestrator = orchestrator;

        app.use('/api/orchestrator/benchmarks', benchmarksRouter);

        // Mock orchestrator methods for benchmarks tests
        jest.spyOn(orchestrator, 'getServers').mockReturnValue([
            { id: 's1', models: ['m1', 'm2'] },
            { id: 's2', models: ['m3'] }
        ]);
        jest.spyOn(orchestrator, 'getBenchmark').mockReturnValue({ latencyMs: 100, throughput: 10 });
        jest.spyOn(orchestrator, 'getInFlight').mockReturnValue(0);
        jest.spyOn(orchestrator, 'runBenchmarks').mockResolvedValue(undefined);
        jest.spyOn(orchestrator, 'benchmarkServerModel').mockResolvedValue(undefined);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('GET /api/orchestrator/benchmarks returns all benchmarks', async () => {
        const res = await request(app).get('/api/orchestrator/benchmarks/');
        expect(res.status).toBe(200);
        expect(res.body.benchmarks.length).toBe(3);
        expect(orchestrator.getBenchmark).toHaveBeenCalled();
    });

    it('POST /api/orchestrator/benchmarks/run triggers all benchmarks', async () => {
        const res = await request(app).post('/api/orchestrator/benchmarks/run');
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(orchestrator.runBenchmarks).toHaveBeenCalled();
    });

    it('POST /api/orchestrator/benchmarks/server triggers all models for a server', async () => {
        const res = await request(app)
            .post('/api/orchestrator/benchmarks/server')
            .send({ serverId: 's1' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.serverId).toBe('s1');
        expect(orchestrator.benchmarkServerModel).toHaveBeenCalledTimes(2);
    });

    it('POST /api/orchestrator/benchmarks/server triggers a specific model', async () => {
        const res = await request(app)
            .post('/api/orchestrator/benchmarks/server')
            .send({ serverId: 's1', model: 'm1' });
        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.serverId).toBe('s1');
        expect(res.body.model).toBe('m1');
        expect(orchestrator.benchmarkServerModel).toHaveBeenCalledWith(
            expect.objectContaining({ id: 's1' }),
            'm1'
        );
    });

    it('POST /api/orchestrator/benchmarks/server returns 404 for missing server', async () => {
        orchestrator.getServers.mockReturnValue([]);
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
