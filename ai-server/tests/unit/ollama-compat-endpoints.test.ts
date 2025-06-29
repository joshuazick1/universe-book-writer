/**
 * Ollama API Compatibility: Unsupported/Edge Endpoint Tests
 * Ensures /api/create, /api/convert, /api/stop, /api/push match Ollama status/response for all edge cases.
 */
import request from 'supertest';
import express from 'express';
import app from '../../src/index';
import { setupMockOrchestrator, resetOrchestrator, addMockServer } from '../helpers/test-helpers';

describe('Ollama API Compatibility - Unsupported/Edge Endpoints', () => {
    beforeEach(() => {
        resetOrchestrator();
        setupMockOrchestrator();
        // Add a default mock server for endpoints that require it
        addMockServer({
            id: 'mock1',
            url: 'http://localhost:9999',
            models: ['test-model'],
            healthy: true
        });
    });
    describe('/api/create', () => {
        it('returns 200 with error array for missing fields', async () => {
            const res = await request(app).post('/api/create').send({});
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body[0]).toHaveProperty('error');
            expect(res.body[0]).toHaveProperty('status', 400);
        });
        it('returns 404 with plain text for missing model', async () => {
            const res = await request(app).post('/api/create').send({ model: 'missing-model' });
            expect(res.status).toBe(404);
            expect(res.text).toBe('404 page not found');
        });
    });
    describe('/api/push', () => {
        it('returns 200 with array of status/error objects for unsupported (no model)', async () => {
            const res = await request(app).post('/api/push').send({});
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            expect(res.body[0]).toHaveProperty('error');
            expect(res.body[0]).toHaveProperty('status', 400);
        });
        it('returns 404 with plain text for missing model', async () => {
            const res = await request(app).post('/api/push').send({ model: 'missing-model' });
            expect(res.status).toBe(404);
            expect(res.text).toBe('404 page not found');
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
    });
});
