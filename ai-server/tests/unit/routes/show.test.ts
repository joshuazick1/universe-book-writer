import { describe, it, expect, beforeEach, beforeAll, jest } from '@jest/globals';
import request from 'supertest';
import { ensureMockServersInitialized, installOllamaServerFetchMock, setServerHealth } from '../../helpers/test-helpers.js';
import { getOrchestratorInstance, resetOrchestratorInstance } from '../../../src/orchestrator-instance.js';

let app: any;

const TEST_MODEL = 'modelC';
const TEST_TAG = {
    name: TEST_MODEL,
    model: TEST_MODEL,
    modified_at: '2025-01-01T00:00:00Z',
    size: 12345,
    digest: 'abc123',
    details: { foo: 'bar' },
};

beforeAll(async () => {
    // Setup orchestrator and mocks BEFORE importing the app, so the singleton is shared
    resetOrchestratorInstance();
    // Always use the default export to get the orchestrator singleton
    const getOrchestratorInstance = (await import('../../../src/orchestrator-instance.ts')).default;
    const orchestrator = getOrchestratorInstance();
    // ...existing code...
    ensureMockServersInitialized(orchestrator, [
        {
            id: 'mock-server',
            url: 'http://mock-server',
            healthy: true,
            models: [TEST_MODEL],
            tags: [TEST_TAG],
        }
    ]);
    // Set up fetch mock BEFORE any orchestrator calls
    installOllamaServerFetchMock(orchestrator);
    // Force the mock server to always be healthy
    setServerHealth(orchestrator, 'mock-server', true);
    // Use test-friendly cache refresh and also update status with mock
    (orchestrator as any).refreshTagsCacheFromServerData();
    await orchestrator.updateAllStatus(); // This should use the fetch mock
    // ...existing code...
    const appModule = await import('../../../src/index.js');
    app = appModule.default;
    // Attach orchestrator to app.locals for explicit sharing
    app.locals.orchestrator = orchestrator;
    // ...existing code...
});

beforeEach(() => {
    jest.clearAllMocks();
    // Do not reset or re-initialize orchestrator here, to preserve singleton state for the app
});

describe('/api/show endpoint', () => {
    it('returns 405 for GET (Ollama compatibility)', async () => {
        const res = await request(app).get('/api/show');
        expect(res.status).toBe(405);
        expect(res.type).toBe('text/plain');
        expect(res.text).toBe('405 method not allowed');
    });

    it('returns 400 for POST with missing model', async () => {
        const res = await request(app).post('/api/show').send({});
        expect(res.status).toBe(400);
        expect(res.body).toEqual({
            error: {
                message: 'model is required',
                type: 'invalid_request_error'
            }
        });
    });

    it('returns 404 for POST with missing model name', async () => {
        const res = await request(app).post('/api/show').send({ model: 'missing-model' });
        expect(res.status).toBe(404);
        expect(res.body).toEqual({
            error: {
                message: "model 'missing-model' not found",
                type: 'not_found_error'
            }
        });
    });

    it('returns 200 and model info for POST with valid model', async () => {
        const res = await request(app)
            .post('/api/show')
            .set('Accept', 'application/json')
            .set('Content-Type', 'application/json')
            .send({ model: TEST_MODEL });
        // ...existing code...
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('name', TEST_MODEL);
        expect(res.body).toHaveProperty('modified_at');
        expect(res.body).toHaveProperty('size');
        expect(res.body).toHaveProperty('digest');
        expect(res.body).toHaveProperty('details');
    });
});
