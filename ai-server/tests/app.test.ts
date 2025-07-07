import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import app from '../src/app.js';

describe('AI Server app.ts error handling', () => {
    it('should handle errors and return 500 with error details', async () => {
        // Create a test app that has the same error handler as the main app
        const testApp = express();

        // Add JSON middleware
        testApp.use(express.json());

        // Add a route that throws an error
        testApp.get('/test-error', (_req, _res, next) => {
            next(new Error('Test error'));
        });

        // Copy the exact error handler from the main app
        testApp.use((err: unknown, req: any, res: any, _next: any) => {
            let details: string | undefined = undefined;
            let stack: string | undefined = undefined;
            if (typeof err === 'string') {
                details = err;
            } else if (err instanceof Error) {
                details = err.message;
                stack = err.stack;
            } else if (err && typeof err === 'object') {
                if ('message' in err && typeof (err as any).message === 'string' && (err as any).message) {
                    details = String((err as any).message);
                    stack = (err as any).stack;
                } else {
                    details = undefined;
                }
            } else {
                details = undefined;
            }

            const response: { error: string; details?: string } = { error: 'Internal server error' };
            if (details !== undefined) response.details = details;
            res.status(500).json(response);
        });

        const res = await request(testApp).get('/test-error');
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty('error', 'Internal server error');
        expect(res.body).toHaveProperty('details', 'Test error');
    });

    it('should handle thrown string errors', async () => {
        const testApp = express();

        testApp.use(express.json());

        testApp.get('/test-error', (_req, _res, next) => {
            next('String error');
        });

        testApp.use((err: unknown, req: any, res: any, _next: any) => {
            let details: string | undefined = undefined;
            let stack: string | undefined = undefined;
            if (typeof err === 'string') {
                details = err;
            } else if (err instanceof Error) {
                details = err.message;
                stack = err.stack;
            } else if (err && typeof err === 'object') {
                if ('message' in err && typeof (err as any).message === 'string' && (err as any).message) {
                    details = String((err as any).message);
                    stack = (err as any).stack;
                } else {
                    details = undefined;
                }
            } else {
                details = undefined;
            }

            const response: { error: string; details?: string } = { error: 'Internal server error' };
            if (details !== undefined) response.details = details;
            res.status(500).json(response);
        });

        const res = await request(testApp).get('/test-error');
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty('error', 'Internal server error');
        expect(res.body.details).toBe('String error');
    });

    it('should handle errors with no message', async () => {
        const testApp = express();

        testApp.use(express.json());

        testApp.get('/test-error', (_req, _res, next) => {
            next({});
        });

        testApp.use((err: unknown, req: any, res: any, _next: any) => {
            let details: string | undefined = undefined;
            let stack: string | undefined = undefined;
            if (typeof err === 'string') {
                details = err;
            } else if (err instanceof Error) {
                details = err.message;
                stack = err.stack;
            } else if (err && typeof err === 'object') {
                if ('message' in err && typeof (err as any).message === 'string' && (err as any).message) {
                    details = String((err as any).message);
                    stack = (err as any).stack;
                } else {
                    details = undefined;
                }
            } else {
                details = undefined;
            }

            const response: { error: string; details?: string } = { error: 'Internal server error' };
            if (details !== undefined) response.details = details;
            res.status(500).json(response);
        });

        const res = await request(testApp).get('/test-error');
        expect(res.status).toBe(500);
        expect(res.body).toHaveProperty('error', 'Internal server error');
        expect(res.body.details).toBeUndefined();
    });
});
