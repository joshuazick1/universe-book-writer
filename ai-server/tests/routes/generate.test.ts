


import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import { AIOrchestrator } from '../../src/orchestrator';
// Always import the router dynamically in beforeEach

// --- PATCH: Always mock node-fetch for all tests ---
const mockFetch = jest.fn();
jest.unstable_mockModule('node-fetch', () => ({
    __esModule: true,
    default: mockFetch,
}));
const setNodeFetchMock = (mockImpl: any) => {
    // Clear previous mock and set new implementation
    mockFetch.mockReset();
    mockFetch.mockImplementation(mockImpl);
};



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
        mockFetch.mockReset();
        generateRouter = null; // Will be imported in each test if needed
    });


    it('returns 400 if model or prompt is missing', async () => {
        generateRouter = (await import('../../src/routes/generate')).default;
        app.use('/api/generate', generateRouter);
        const res = await request(app).post('/api/generate').send({ model: '', prompt: '' });
        expect(res.status).toBe(400);
        expect(res.body).toHaveProperty('error');
    });



    it('returns 404 if no healthy servers for model', async () => {
        generateRouter = (await import('../../src/routes/generate')).default;
        app.use('/api/generate', generateRouter);
        // No servers added
        const res = await request(app).post('/api/generate').send({ model: 'foo', prompt: 'bar' });
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
    });


    it('handles /stream route with 404', async () => {
        generateRouter = (await import('../../src/routes/generate')).default;
        app.use('/api/generate', generateRouter);
        const res = await request(app).get('/api/generate/stream');
        expect(res.status).toBe(404);
        expect(res.text).toMatch(/404/);
    });



    it('handles error thrown in tryRequestWithFailover (model not found)', async () => {
        orchestrator.addServer({ id: 's1', url: 'http://mock', type: 'ollama' });
        orchestrator.getServers()[0].healthy = true;
        orchestrator.getServers()[0].models = ['foo'];
        orchestrator.tryRequestWithFailover = jest.fn(() => { throw new Error('model not found'); });
        generateRouter = (await import('../../src/routes/generate')).default;
        app.use('/api/generate', generateRouter);
        const res = await request(app).post('/api/generate').send({ model: 'foo', prompt: 'bar' });
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
    });


    it('handles error thrown in tryRequestWithFailover (other error)', async () => {
        orchestrator.addServer({ id: 's1', url: 'http://mock', type: 'ollama' });
        orchestrator.getServers()[0].healthy = true;
        orchestrator.getServers()[0].models = ['foo'];
        orchestrator.tryRequestWithFailover = jest.fn(() => { throw new Error('server down'); });
        generateRouter = (await import('../../src/routes/generate')).default;
        app.use('/api/generate', generateRouter);
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
        setNodeFetchMock(() => Promise.resolve({
            status: 200,
            headers: { get: () => 'application/json' },
            json: async () => ({ result: 'ok' })
        }));
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
        setNodeFetchMock(() => Promise.resolve({
            status: 200,
            headers: { get: () => 'application/x-ndjson' },
            text: async () => '{"response":"a"}\n{"response":"b","done":true,"done_reason":"stop"}\n'
        }));
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
        setNodeFetchMock(() => Promise.resolve({
            status: 200,
            headers: { get: () => 'application/json' },
            body: {
                async *[Symbol.asyncIterator]() {
                    yield chunks[0];
                    yield chunks[1];
                }
            }
        }));
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
        setNodeFetchMock(() => Promise.resolve({
            status: 404,
            headers: { get: () => 'application/json' },
            json: async () => ({ error: 'model not found' })
        }));
        generateRouter = (await import('../../src/routes/generate')).default;
        app.use('/api/generate', generateRouter);
        const res = await request(app).post('/api/generate').send({ model: 'foo', prompt: 'bar' });
        expect(res.status).toBe(404);
        expect(res.body).toHaveProperty('error');
    });
});
