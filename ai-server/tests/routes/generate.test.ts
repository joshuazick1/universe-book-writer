

import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { AIOrchestrator } from '../../src/orchestrator';
// Always import the router dynamically in beforeEach

// Helper to patch node-fetch for ESM
// Accepts any type for mockImpl to avoid TS errors
function setNodeFetchMock(mockImpl: any) {
    jest.unstable_mockModule('node-fetch', () => ({
        __esModule: true,
        default: mockImpl,
    }));
}



describe('POST /api/generate', () => {
    let app: express.Express;
    let orchestrator: AIOrchestrator;
    let generateRouter: any;
    beforeEach(async () => {
        orchestrator = new AIOrchestrator();
        app = express();
        app.use(express.json());
        app.use((req, res, next) => {
            req.app.locals.orchestrator = orchestrator;
            next();
        });
        jest.clearAllMocks();
        generateRouter = null; // Will be imported in each test if needed
    });

    it('returns 400 if model or prompt is missing', async () => {
        const res = await request(app).post('/api/generate').send({ model: '', prompt: '' });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });


    it('returns 404 if no healthy servers for model', async () => {
        // No servers added
        const res = await request(app).post('/api/generate').send({ model: 'foo', prompt: 'bar' });
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
    });

    it('handles /stream route with 404', async () => {
        const res = await request(app).get('/api/generate/stream');
        expect(res.status).toBe(404);
        expect(res.text).toMatch(/404/);
    });


    it('handles error thrown in tryRequestWithFailover (model not found)', async () => {
        // Add a healthy server for the model
        orchestrator.addServer({ id: 's1', url: 'http://mock', type: 'ollama' });
        orchestrator.getServers()[0].healthy = true;
        orchestrator.getServers()[0].models = ['foo'];
        // Patch tryRequestWithFailover to throw
        orchestrator.tryRequestWithFailover = jest.fn(() => { throw new Error('model not found'); });
        const res = await request(app).post('/api/generate').send({ model: 'foo', prompt: 'bar' });
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
    });

    it('handles error thrown in tryRequestWithFailover (other error)', async () => {
        orchestrator.addServer({ id: 's1', url: 'http://mock', type: 'ollama' });
        orchestrator.getServers()[0].healthy = true;
        orchestrator.getServers()[0].models = ['foo'];
        orchestrator.tryRequestWithFailover = jest.fn(() => { throw new Error('server down'); });
        const res = await request(app).post('/api/generate').send({ model: 'foo', prompt: 'bar' });
        expect(res.status).toBe(502);
        expect(res.body).toHaveProperty('error');
        expect(res.body).toHaveProperty('message');
    });


    it('handles non-streaming JSON response', async () => {
        orchestrator.addServer({ id: 's1', url: 'http://mock', type: 'ollama' });
        orchestrator.getServers()[0].healthy = true;
        orchestrator.getServers()[0].models = ['foo'];
        orchestrator.tryRequestWithFailover = jest.fn(async (_model: any, cb: any) => {
            await cb({ url: 'http://mock' });
        }) as typeof orchestrator.tryRequestWithFailover;
        // @ts-expect-error
        setNodeFetchMock(jest.fn().mockResolvedValue({
            status: 200,
            headers: { get: () => 'application/json' },
            json: async () => ({ result: 'ok' })
        }) as unknown as any);
        generateRouter = (await import('../../src/routes/generate')).default;
        app.use('/api/generate', generateRouter);
        const res = await request(app).post('/api/generate').send({ model: 'foo', prompt: 'bar' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('result', 'ok');
    });


    it('handles NDJSON response (non-stream)', async () => {
        orchestrator.addServer({ id: 's1', url: 'http://mock', type: 'ollama' });
        orchestrator.getServers()[0].healthy = true;
        orchestrator.getServers()[0].models = ['foo'];
        orchestrator.tryRequestWithFailover = jest.fn(async (_model: any, cb: any) => {
            await cb({ url: 'http://mock' });
        }) as typeof orchestrator.tryRequestWithFailover;
        // @ts-expect-error
        setNodeFetchMock(jest.fn().mockResolvedValue({
            status: 200,
            headers: { get: () => 'application/x-ndjson' },
            text: async () => '{"response":"a"}\n{"response":"b","done":true,"done_reason":"stop"}\n'
        }) as unknown as any);
        generateRouter = (await import('../../src/routes/generate')).default;
        app.use('/api/generate', generateRouter);
        const res = await request(app).post('/api/generate').send({ model: 'foo', prompt: 'bar' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('response', 'ab');
        expect(res.body).toHaveProperty('done', true);
        expect(res.body).toHaveProperty('done_reason', 'stop');
    });


    it('handles streaming response', async () => {
        orchestrator.addServer({ id: 's1', url: 'http://mock', type: 'ollama' });
        orchestrator.getServers()[0].healthy = true;
        orchestrator.getServers()[0].models = ['foo'];
        orchestrator.tryRequestWithFailover = jest.fn(async (_model: any, cb: any) => {
            await cb({ url: 'http://mock' });
        }) as typeof orchestrator.tryRequestWithFailover;
        const chunks = [Buffer.from('chunk1'), Buffer.from('chunk2')];
        // @ts-expect-error
        setNodeFetchMock(jest.fn().mockResolvedValue({
            status: 200,
            headers: { get: () => 'application/json' },
            body: {
                async *[Symbol.asyncIterator]() {
                    yield chunks[0];
                    yield chunks[1];
                }
            }
        }) as unknown as any);
        generateRouter = (await import('../../src/routes/generate')).default;
        app.use('/api/generate', generateRouter);
        const res = await request(app).post('/api/generate').send({ model: 'foo', prompt: 'bar', stream: true });
        expect(res.status).toBe(200);
        expect(res.header['content-type']).toMatch(/application\/x-ndjson/);
        expect(res.text).toContain('chunk1');
        expect(res.text).toContain('chunk2');
    });

    it('handles model not found in downstream JSON', async () => {
        orchestrator.addServer({ id: 's1', url: 'http://mock', type: 'ollama' });
        orchestrator.getServers()[0].healthy = true;
        orchestrator.getServers()[0].models = ['foo'];
        orchestrator.tryRequestWithFailover = jest.fn(async (_model: any, cb: any) => {
            await cb({ url: 'http://mock' });
        }) as typeof orchestrator.tryRequestWithFailover;
        // @ts-expect-error
        setNodeFetchMock(jest.fn().mockResolvedValue({
            status: 404,
            headers: { get: () => 'application/json' },
            json: async () => ({ error: 'model not found' })
        }) as unknown as any);
        generateRouter = (await import('../../src/routes/generate')).default;
        app.use('/api/generate', generateRouter);
        const res = await request(app).post('/api/generate').send({ model: 'foo', prompt: 'bar' });
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
    });
});
