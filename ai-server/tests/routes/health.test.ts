import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

jest.mock('../../src/orchestrator-instance', () => ({
    getOrchestratorInstance: jest.fn()
}));

import healthRouter from '../../src/routes/health';
import * as orchestratorInstance from '../../src/orchestrator-instance';

describe('Health API', () => {
    let app: express.Express;
    beforeEach(() => {
        app = express();
        app.use(express.json());
        app.use('/api', healthRouter);
        (orchestratorInstance.getOrchestratorInstance as jest.Mock).mockReset();
        (orchestratorInstance.getOrchestratorInstance as jest.Mock).mockReturnValue({
            getServers: jest.fn(() => [
                {
                    id: 's1',
                    url: 'http://localhost:1234',
                    type: 'ollama',
                    healthy: true,
                    lastResponseTime: 42,
                    models: ['m1', 'm2'],
                    maxConcurrency: 4
                }
            ]),
            getServerAvgLatency: jest.fn(() => 123),
            getInitialAvgResponseTime: jest.fn(() => 456)
        });
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
        (orchestratorInstance.getOrchestratorInstance as jest.Mock).mockReturnValue({
            getServers: jest.fn(() => []),
            getServerAvgLatency: jest.fn(),
            getInitialAvgResponseTime: jest.fn()
        });
        const res = await request(app).get('/api/orchestrator/health');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('servers');
        expect(res.body.servers).toEqual([]);
    });

    it('GET /orchestrator/health handles orchestrator errors', async () => {
        (orchestratorInstance.getOrchestratorInstance as jest.Mock).mockImplementation(() => { throw new Error('fail'); });
        const res = await request(app).get('/api/orchestrator/health');
        // Should return 500 or handle error gracefully
        expect([200, 500]).toContain(res.status);
    });
});
