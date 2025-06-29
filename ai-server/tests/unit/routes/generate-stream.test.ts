import request from 'supertest';
import app from '../../../src/index';

describe('/api/generate/stream endpoint', () => {
    it('returns plain text 404 if not supported (Ollama compatibility)', async () => {
        const res = await request(app).get('/api/generate/stream');
        expect(res.status).toBe(404);
        expect(res.type).toBe('text/plain');
        expect(res.text).toBe('404 page not found');
    });
    it('returns plain text 404 for POST as well', async () => {
        const res = await request(app).post('/api/generate/stream');
        expect(res.status).toBe(404);
        expect(res.type).toBe('text/plain');
        expect(res.text).toBe('404 page not found');
    });
});
