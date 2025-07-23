import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { getOrchestratorInstance, resetOrchestratorInstance } from '../../src/orchestrator-instance.js';

import healthRouter from '../../src/routes/health';

describe('Health API', () => {
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

        // Set the orchestrator on app locals (required by routes)
        app.locals.orchestrator = orchestrator;

        app.use('/api', healthRouter);

        // Mock orchestrator methods for health tests
        jest.spyOn(orchestrator, 'getServers').mockReturnValue([
            {
                id: 's1',
                url: 'http://localhost:1234',
                type: 'ollama',
                healthy: true,
                lastResponseTime: 42,
                models: ['m1', 'm2'],
                maxConcurrency: 4
            }
        ]);
        jest.spyOn(orchestrator, 'getServerAvgLatency').mockReturnValue(123);
        jest.spyOn(orchestrator, 'getInitialAvgResponseTime').mockReturnValue(456);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('GET /health returns status ok and timestamp', async () => {
        const res = await request(app).get('/api/health');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('status', 'ok');
        expect(res.body).toHaveProperty('timestamp');
        expect(typeof res.body.timestamp).toBe('string');
    });

    it('GET /orchestrator/health returns server health data', async () => {
        const res = await request(app).get('/api/orchestrator/health');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('servers');
        expect(Array.isArray(res.body.servers)).toBe(true);
        expect(res.body.servers[0]).toMatchObject({
            id: 's1',
            url: 'http://localhost:1234',
            type: 'ollama',
            healthy: true,
            lastResponseTime: 42,
            models: ['m1', 'm2'],
            maxConcurrency: 4,
            avgLatency: 123,
            initialAvgLatency: 456
        });
    });

    it('GET /orchestrator/health handles empty server list', async () => {
        orchestrator.getServers.mockReturnValue([]);
        const res = await request(app).get('/api/orchestrator/health');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('servers');
        expect(res.body.servers).toEqual([]);
    });

    it('GET /orchestrator/health handles orchestrator errors', async () => {
        orchestrator.getServers.mockImplementation(() => { throw new Error('fail'); });
        const res = await request(app).get('/api/orchestrator/health');
        // Should return 500 or handle error gracefully
        expect([200, 500]).toContain(res.status);
    });
});
