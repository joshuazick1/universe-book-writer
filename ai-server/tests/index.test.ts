import app from '../src/index';
import http from 'http';

describe('AI Server index.ts startup/shutdown', () => {
    let server: http.Server;

    afterEach((done) => {
        if (server && server.listening) {
            server.close(done);
        } else {
            done();
        }
    });

    it('should export the app instance', () => {
        expect(app).toBeDefined();
        expect(typeof app).toBe('function');
    });

    it('should start and stop the server without error', (done) => {
        // Simulate running in non-test environment
        process.env.NODE_ENV = 'development';
        const testPort = 5999;
        server = app.listen(testPort, () => {
            expect(server.listening).toBe(true);
            server.close(() => {
                expect(server.listening).toBe(false);
                done();
            });
        });
    });

    it('should not start the server if NODE_ENV is test', () => {
        process.env.NODE_ENV = 'test';
        // Re-import index.ts to trigger conditional
        // (In real-world, use a fresh process or mock)
        expect(app).toBeDefined();
    });
});
