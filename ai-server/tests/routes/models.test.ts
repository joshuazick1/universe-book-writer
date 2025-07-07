// models.test.ts
// Tests for /api/models and /api/models/:model endpoints

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { getOrchestratorInstance, resetOrchestratorInstance } from '../../src/orchestrator-instance';
import modelsRouter from '../../src/routes/models';

describe('/api/models endpoints', () => {
    let app: express.Express;
    let orchestrator: any;

    beforeAll(() => {
        // Reset orchestrator and set up test state
        resetOrchestratorInstance();
        orchestrator = getOrchestratorInstance();
    });

    beforeEach(() => {
        app = express();
        app.use('/api/models', modelsRouter);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('GET / returns 404 plain text', async () => {
        const res = await request(app).get('/api/models');
        expect(res.status).toBe(404);
        expect(res.text).toBe('404 page not found');
        expect(res.headers['content-type']).toMatch(/text\/plain/);
    });

    it('GET /:model returns 400 if model param missing', async () => {
        const res = await request(app).get('/api/models/');
        expect(res.status).toBe(400);
        expect(res.body.error).toMatch(/Model name is required/);
    });

    it('GET /:model returns 404 if model not found on any server', async () => {
        jest.spyOn(orchestrator, 'getServers').mockReturnValue([
            { healthy: true, models: ['foo'], url: 'http://localhost:1234' },
        ]);
        const res = await request(app).get('/api/models/bar');
        expect(res.status).toBe(404);
        expect(res.body.error).toMatch(/model 'bar' not found/);
    });

    it('GET /:model aggregates info from all healthy servers', async () => {
        global.fetch = jest.fn()
            .mockResolvedValueOnce({ ok: true, json: async () => ({ name: 'bar', tags: ['a'] }) })
            .mockResolvedValueOnce({ ok: true, json: async () => ({ name: 'bar', tags: ['b'] }) }) as any;
        jest.spyOn(orchestrator, 'getServers').mockReturnValue([
            { healthy: true, models: ['bar'], url: 'http://s1' },
            { healthy: true, models: ['bar'], url: 'http://s2' },
        ]);
        const res = await request(app).get('/api/models/bar');
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('bar');
        expect(res.body.tags.sort()).toEqual(['a', 'b']);
    });

    it('GET /:model skips unhealthy servers', async () => {
        global.fetch = jest.fn().mockResolvedValue({ ok: true, json: async () => ({ name: 'bar', tags: ['a'] }) }) as any;
        jest.spyOn(orchestrator, 'getServers').mockReturnValue([
            { healthy: false, models: ['bar'], url: 'http://s1' },
            { healthy: true, models: ['bar'], url: 'http://s2' },
        ]);
        const res = await request(app).get('/api/models/bar');
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('bar');
        expect(res.body.tags).toEqual(['a']);
    });

    it('GET /:model logs fetch errors but continues', async () => {
        const errorSpy = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);
        global.fetch = jest.fn()
            .mockRejectedValueOnce(new Error('fail'))
            .mockResolvedValueOnce({ ok: true, json: async () => ({ name: 'bar', tags: ['b'] }) }) as any;
        jest.spyOn(orchestrator, 'getServers').mockReturnValue([
            { healthy: true, models: ['bar'], url: 'http://s1' },
            { healthy: true, models: ['bar'], url: 'http://s2' },
        ]);
        const res = await request(app).get('/api/models/bar');
        expect(res.status).toBe(200);
        expect(res.body.name).toBe('bar');
        expect(res.body.tags).toEqual(['b']);
        expect(errorSpy).toHaveBeenCalledWith(expect.stringMatching(/fetch from http:\/\/s1 error: fail/));
        errorSpy.mockRestore();
    });
});
