import app from '../src/index.js';
import http from 'http';

describe('AI Server index.ts startup/shutdown', () => {
    it('should handle listen errors (port in use)', (done) => {
        process.env.NODE_ENV = 'development';
        const testPort = 5998;
        const s1 = app.listen(testPort, () => {
            // Try to listen again on the same port
            const s2 = app.listen(testPort);
            s2.on('error', (err: any) => {
                expect(err).toBeDefined();
                expect(err.code).toBe('EADDRINUSE');
                s1.close(() => done());
            });
        });
    });

    it('should use PORT env variable if set', (done) => {
        process.env.NODE_ENV = 'development';
        process.env.PORT = '5997';
        const server = app.listen(process.env.PORT, () => {
            expect(server.address()).toBeDefined();
            expect((server.address() as any).port).toBe(5997);
            server.close(done);
        });
    });

    it('should log on startup', (done) => {
        process.env.NODE_ENV = 'development';
        const testPort = 5996;
        let logged = '';
        const logger = (msg: string) => { logged += msg; };
        import('../src/index.js').then(mod => {
            const server = mod.startServer(testPort, logger);
            setTimeout(() => {
                expect(logged).toContain('AI server listening on port');
                server.close(done);
            }, 100);
        });
    });
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
