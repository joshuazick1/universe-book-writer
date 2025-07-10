import request from 'supertest';
import express, { Express } from 'express';
import { createRAGUpdateRoutes, requireAuth } from './update.routes.js';

// Mock services
const mockUpdateStorage = {
    retrieveBatch: jest.fn(),
    retrieveUpdate: jest.fn(),
};
const mockUpdateEncryption = {};
const mockRagStorage = {};

const mockUser = { id: 'user-1' };

function setupApp() {
    const app: Express = express();
    app.use(express.json());
    // Simulate auth middleware
    app.use((req, _res, next) => {
        req.user = mockUser;
        next();
    });
    app.use(createRAGUpdateRoutes({
        updateStorage: mockUpdateStorage as any,
        updateEncryption: mockUpdateEncryption as any,
        ragStorage: mockRagStorage as any,
    }));
    return app;
}

describe('RAG Update Routes - Batch & Update Details', () => {
    let app: Express;

    beforeEach(() => {
        app = setupApp();
        jest.clearAllMocks();
    });

    describe('GET /api/rag/updates/batch/:batchId', () => {
        it('returns 401 if unauthenticated', async () => {
            const unauthApp = express();
            unauthApp.use(express.json());
            unauthApp.use(createRAGUpdateRoutes({
                updateStorage: mockUpdateStorage as any,
                updateEncryption: mockUpdateEncryption as any,
                ragStorage: mockRagStorage as any,
            }));
            const res = await request(unauthApp).get('/batch/batch-1');
            expect(res.status).toBe(401);
        });

        it('returns 404 if batch not found', async () => {
            mockUpdateStorage.retrieveBatch.mockResolvedValue(null);
            const res = await request(app).get('/batch/batch-404');
            expect(res.status).toBe(404);
            expect(res.body.error).toMatch(/not found/i);
        });

        it('returns batch details if found and user has access', async () => {
            mockUpdateStorage.retrieveBatch.mockResolvedValue({ batchId: 'batch-1', universeId: 'univ-1' });
            const res = await request(app).get('/batch/batch-1');
            expect(res.status).toBe(200);
            expect(res.body.batch).toBeDefined();
            expect(res.body.batchId).toBe('batch-1');
        });
    });

    describe('GET /api/rag/updates/:updateId', () => {
        it('returns 401 if unauthenticated', async () => {
            const unauthApp = express();
            unauthApp.use(express.json());
            unauthApp.use(createRAGUpdateRoutes({
                updateStorage: mockUpdateStorage as any,
                updateEncryption: mockUpdateEncryption as any,
                ragStorage: mockRagStorage as any,
            }));
            const res = await request(unauthApp).get('/update-1');
            expect(res.status).toBe(401);
        });

        it('returns 404 if update not found', async () => {
            mockUpdateStorage.retrieveUpdate.mockResolvedValue(null);
            const res = await request(app).get('/update-404');
            expect(res.status).toBe(404);
            expect(res.body.error).toMatch(/not found/i);
        });

        it('returns update details if found and user has access', async () => {
            mockUpdateStorage.retrieveUpdate.mockResolvedValue({ id: 'update-1', universeId: 'univ-1' });
            const res = await request(app).get('/update-1');
            expect(res.status).toBe(200);
            expect(res.body.update).toBeDefined();
            expect(res.body.updateId).toBe('update-1');
        });
    });
});
