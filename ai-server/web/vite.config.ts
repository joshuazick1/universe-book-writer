import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    server: {
        port: 5174, // Changed from 5173 to avoid conflict with real frontend
        proxy: {
            '/api': 'http://localhost:5100',
            '/ws/queue': {
                target: 'http://localhost:5100',
                ws: true,
                changeOrigin: true,
            },
        },
    },
    build: {
        outDir: 'dist',
    },
});
