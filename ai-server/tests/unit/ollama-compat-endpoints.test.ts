/**
 * Ollama API Compatibility: Unsupported/Edge Endpoint Tests
 * Ensures /api/create, /api/convert, /api/stop, /api/push match Ollama status/response for all edge cases.
 */

import request from 'supertest';
import app from '../../src/index';
import { ensureMockServersInitialized, installOllamaServerFetchMock } from '../helpers/test-helpers.js';
import { getOrchestratorInstance, resetOrchestratorInstance } from '../../src/orchestrator-instance.js';

describe('Ollama API Compatibility - Unsupported/Edge Endpoints', () => {
    beforeEach(() => {
        resetOrchestratorInstance();
        const orchestrator = getOrchestratorInstance();
        ensureMockServersInitialized(orchestrator, [
            {
                id: 'mock1',
                url: 'http://localhost:9999',
                models: ['test-model'],
                healthy: true
            }
        ]);
        installOllamaServerFetchMock(orchestrator);
    });
    describe('/api/create', () => {
        it('returns 400 with structured error for missing fields', async () => {
            const res = await request(app).post('/api/create').send({});
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toHaveProperty('message');
            expect(res.body.error).toHaveProperty('type', 'invalid_request_error');
        });

        it('returns 404 with plain text for missing model', async () => {
            const res = await request(app).post('/api/create').send({ model: 'missing-model' });
            expect(res.status).toBe(404);
            expect(res.text).toBe('404 page not found');
        });

        it('returns 400 for invalid payload types', async () => {
            const res = await request(app).post('/api/create').send('not-an-object');
            // Should handle invalid JSON gracefully
            expect([400, 415, 422]).toContain(res.status);
        });

        it('returns 400 with structured error for missing required fields (edge case)', async () => {
            const res = await request(app).post('/api/create').send({ foo: 'bar' });
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toHaveProperty('message');
            expect(res.body.error).toHaveProperty('type', 'invalid_request_error');
        });
    });
    describe('/api/push', () => {
        it('returns 400 with structured error for unsupported (no model)', async () => {
            const res = await request(app).post('/api/push').send({});
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toHaveProperty('message');
            expect(res.body.error).toHaveProperty('type', 'invalid_request_error');
        });

        it('returns 404 with plain text for missing model', async () => {
            const res = await request(app).post('/api/push').send({ name: 'missing-model' });
            expect(res.status).toBe(404);
            expect(res.text).toBe('404 page not found');
        });

        it('returns 400 for invalid payload types', async () => {
            const res = await request(app).post('/api/push').send('not-an-object');
            expect([400, 415, 422]).toContain(res.status);
        });

        it('returns 400 with structured error for missing required fields (edge case)', async () => {
            const res = await request(app).post('/api/push').send({ foo: 'bar' });
            expect(res.status).toBe(400);
            expect(res.body).toHaveProperty('error');
            expect(res.body.error).toHaveProperty('message');
            expect(res.body.error).toHaveProperty('type', 'invalid_request_error');
        });
    });
    describe('/api/convert', () => {
        it('returns 405 with plain text for unsupported', async () => {
            const res = await request(app).post('/api/convert').send({});
            expect(res.status).toBe(405);
            expect(res.text).toBe('405 method not allowed');
        });
        it('returns 404 with plain text for missing model', async () => {
            const res = await request(app).post('/api/convert').send({ model: 'missing-model' });
            expect(res.status).toBe(404);
            expect(res.text).toBe('404 page not found');
        });
        it('returns 400 for invalid payload types', async () => {
            const res = await request(app).post('/api/convert').send('not-an-object');
            expect([400, 415, 422, 405]).toContain(res.status);
        });
    });
    describe('/api/stop', () => {
        it('returns 404 with plain text for unsupported', async () => {
            const res = await request(app).post('/api/stop').send({});
            expect(res.status).toBe(404);
            expect(res.text).toBe('404 page not found');
        });
        it('returns 404 with plain text for missing model', async () => {
            const res = await request(app).post('/api/stop').send({ model: 'missing-model' });
            expect(res.status).toBe(404);
            expect(res.text).toBe('404 page not found');
        });
        it('returns 400 for invalid payload types', async () => {
            const res = await request(app).post('/api/stop').send('not-an-object');
            expect([400, 415, 422, 404]).toContain(res.status);
        });
    });
});
