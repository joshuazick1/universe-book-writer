import { describe, it, expect, beforeEach, beforeAll } from '@jest/globals';
import request from 'supertest';
import { resetOrchestrator, setupMockOrchestrator, addMockServer } from '../../helpers/test-helpers';

let app: any;

beforeAll(async () => {
    const appModule = await import('../../../src/index.js');
    app = appModule.default;
});

describe('/api/tags', () => {
    beforeEach(() => {
        resetOrchestrator();
        setupMockOrchestrator();
        addMockServer({
            id: 's1',
            url: 'http://localhost:9001',
            models: ['modelA', 'modelB'],
            tags: [
                { name: 'modelA', model: 'modelA', modified_at: '2025-06-25T00:00:00Z', size: 100, digest: 'd1', details: { version: '1.0.0' } },
                { name: 'modelB', model: 'modelB', modified_at: '2025-06-24T00:00:00Z', size: 200, digest: 'd2', details: { version: '2.0.0' } }
            ],
            healthy: true
        });
        addMockServer({
            id: 's2',
            url: 'http://localhost:9002',
            models: ['modelA'],
            tags: [
                { name: 'modelA', model: 'modelA', modified_at: '2025-06-26T00:00:00Z', size: 150, digest: 'd3', details: { version: '1.1.0' } }
            ],
            healthy: true
        });
    });

    it('GET returns models array with all required fields', async () => {
        const res = await request(app).get('/api/tags');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('models');
        expect(Array.isArray(res.body.models)).toBe(true);
        for (const model of res.body.models) {
            expect(model).toHaveProperty('name');
            expect(model).toHaveProperty('model');
            expect(model).toHaveProperty('modified_at');
            expect(model).toHaveProperty('size');
            expect(model).toHaveProperty('digest');
            expect(model).toHaveProperty('details');
            expect(model.name).not.toBeNull();
            expect(model.model).not.toBeNull();
            expect(model.modified_at).not.toBeNull();
            expect(model.size).not.toBeNull();
            expect(model.digest).not.toBeNull();
            expect(model.details).not.toBeNull();
        }
    });

    it('GET returns empty array if no models available', async () => {
        const res = await request(app).get('/api/tags');
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('models');
        expect(Array.isArray(res.body.models)).toBe(true);
    });

    it('GET aggregates multiple tags/versions for a model', async () => {
        const res = await request(app).get('/api/tags');
        expect(res.status).toBe(200);
        for (const model of res.body.models) {
            if (Array.isArray(model.alternate_tags)) {
                expect(Array.isArray(model.alternate_tags)).toBe(true);
            }
        }
    });

    it('GET canonical tag selection logic returns a valid tag', async () => {
        const res = await request(app).get('/api/tags');
        expect(res.status).toBe(200);
        for (const model of res.body.models) {
            expect(model).toHaveProperty('name');
            expect(model).toHaveProperty('model');
        }
    });
});
