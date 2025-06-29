import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import app from '../src/app';

describe('AI Server app.ts error handling', () => {
    it('should handle errors and return 500 with error details', async () => {
        // Create a route that throws an error to trigger the error handler
        const errorApp = express();
        errorApp.use('/error', (_req, _res, next) => {
            next(new Error('Test error'));
        });
        // Mount the app's error handler
        errorApp.use(app._router.stack[app._router.stack.length - 1].handle);

        const res = await request(errorApp).get('/error');
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty('error', 'Internal server error');
        expect(res.body).toHaveProperty('details', 'Test error');
    });

    it('should handle thrown string errors', async () => {
        const errorApp = express();
        errorApp.use('/error', (_req, _res, next) => {
            next('String error');
        });
        errorApp.use(app._router.stack[app._router.stack.length - 1].handle);

        const res = await request(errorApp).get('/error');
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty('error', 'Internal server error');
        expect(res.body.details).toBe('String error');
    });

    it('should handle errors with no message', async () => {
        const errorApp = express();
        errorApp.use('/error', (_req, _res, next) => {
            next({});
        });
        errorApp.use(app._router.stack[app._router.stack.length - 1].handle);

        const res = await request(errorApp).get('/error');
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty('error', 'Internal server error');
        expect(res.body.details).toBeUndefined();
    });
});
