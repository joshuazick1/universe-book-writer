// model-map.test.ts
// Tests for /api/orchestrator/model-map endpoint

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { getOrchestratorInstance, resetOrchestratorInstance } from '../../src/orchestrator-instance';

// Import the router after mocking
const modelMapRouter = await import('../../src/routes/modelMap');

describe('/api/orchestrator/model-map', () => {
    let app: express.Express;
    let orchestrator: any;

    beforeAll(() => {
        // Reset orchestrator and set up test state
        resetOrchestratorInstance();
        orchestrator = getOrchestratorInstance();
    });

    beforeEach(() => {
        app = express();
        app.use('/api/orchestrator', modelMapRouter.default);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('returns modelToServers and serverToModels mappings', async () => {
        const mockServers = [
            { id: 'server1', models: ['modelA', 'modelB'] },
            { id: 'server2', models: ['modelB', 'modelC'] },
        ];
        const mockModelToServers = {
            modelA: ['server1'],
            modelB: ['server1', 'server2'],
            modelC: ['server2'],
        };

        jest.spyOn(orchestrator, 'getServers').mockReturnValue(mockServers);
        jest.spyOn(orchestrator, 'getCachedModelMap').mockResolvedValue(mockModelToServers);

        const res = await request(app).get('/api/orchestrator/model-map');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            modelToServers: mockModelToServers,
            serverToModels: {
                server1: ['modelA', 'modelB'],
                server2: ['modelB', 'modelC'],
            },
        });
    });

    it('handles empty servers and model map', async () => {
        jest.spyOn(orchestrator, 'getServers').mockReturnValue([]);
        jest.spyOn(orchestrator, 'getCachedModelMap').mockResolvedValue({});

        const res = await request(app).get('/api/orchestrator/model-map');
        expect(res.status).toBe(200);
        expect(res.body).toEqual({ modelToServers: {}, serverToModels: {} });
    });

    it('handles orchestrator.getCachedModelMap errors', async () => {
        jest.spyOn(orchestrator, 'getServers').mockReturnValue([{ id: 's1', models: [] }]);
        jest.spyOn(orchestrator, 'getCachedModelMap').mockRejectedValue(new Error('fail'));

        const res = await request(app).get('/api/orchestrator/model-map');
        // Should still return serverToModels, but modelToServers may be undefined or error
        expect(res.status).toBe(200);
        expect(res.body.serverToModels).toEqual({ s1: [] });
        // modelToServers may be undefined or error, but should not throw
    });
});
