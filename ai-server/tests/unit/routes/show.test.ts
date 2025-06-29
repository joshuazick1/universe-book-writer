import request from 'supertest';
import app from '../../../src/index';

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
        expect(res.body).toEqual({ error: 'model is required' });
    });

    it('returns 404 for POST with missing model name', async () => {
        const res = await request(app).post('/api/show').send({ model: 'missing-model' });
        expect(res.status).toBe(404);
        expect(res.body).toEqual({ error: "model 'missing-model' not found" });
    });

    it('returns 200 and model info for POST with valid model', async () => {
        const res = await request(app).post('/api/show').send({ model: 'test-model' });
        expect(res.status).toBe(200);
        expect(res.body).toHaveProperty('name', 'test-model');
        expect(res.body).toHaveProperty('modified_at');
        expect(res.body).toHaveProperty('size');
        expect(res.body).toHaveProperty('digest');
        expect(res.body).toHaveProperty('details');
    });
});
