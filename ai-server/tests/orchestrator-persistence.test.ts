import { jest } from '@jest/globals';

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

let persistence: any;
let orchestratorTypes: any;

type AIServer = {
    id: string;
    url: string;
    type: string;
    healthy?: boolean;
    lastResponseTime?: number;
    models?: string[];
};

beforeAll(async () => {
    persistence = await import('../src/orchestrator-persistence');
    orchestratorTypes = await import('../src/orchestrator');
});


describe('orchestrator-persistence.ts', () => {
    // Use the same logic as the implementation to construct the persist path (ESM compatible)
    const persistPath = path.join(
        path.dirname(fileURLToPath(import.meta.url)),
        '../data/orchestrator-servers.json'
    );

    beforeEach(() => {
        // Ensure clean state before each test
        if (fs.existsSync(persistPath)) {
            fs.unlinkSync(persistPath);
        }
    });
    afterEach(() => {
        // Clean up after each test
        if (fs.existsSync(persistPath)) {
            fs.unlinkSync(persistPath);
        }
    });

    it('should save and load servers to/from disk', () => {
        const servers: AIServer[] = [
            { id: 's1', url: 'http://localhost', type: 'ollama', healthy: true, lastResponseTime: 0, models: [] }
        ];
        persistence.saveServersToDisk(servers);
        const loaded = persistence.loadServersFromDisk();
        expect(Array.isArray(loaded)).toBe(true);
        expect(loaded[0].id).toBe('s1');
    });

    it('should handle missing file gracefully', () => {
        if (fs.existsSync(persistPath)) fs.unlinkSync(persistPath);
        const loaded = persistence.loadServersFromDisk();
        expect(loaded).toEqual([]);
    });

    it('should handle corrupt file gracefully', () => {
        fs.mkdirSync(path.dirname(persistPath), { recursive: true });
        fs.writeFileSync(persistPath, 'not-json', 'utf-8');
        const loaded = persistence.loadServersFromDisk();
        expect(loaded).toEqual([]);
    });

    it('should handle non-array JSON gracefully', () => {
        fs.mkdirSync(path.dirname(persistPath), { recursive: true });
        fs.writeFileSync(persistPath, JSON.stringify({ foo: 'bar' }), 'utf-8');
        const loaded = persistence.loadServersFromDisk();
        expect(loaded).toEqual([]);
    });

    it('should handle write errors gracefully', () => {
        const servers: AIServer[] = [
            { id: 's2', url: 'http://localhost', type: 'ollama', healthy: true, lastResponseTime: 0, models: [] }
        ];
        const origWrite = fs.writeFileSync;
        fs.writeFileSync = jest.fn(() => { throw new Error('Disk full'); });
        expect(() => persistence.saveServersToDisk(servers)).not.toThrow();
        fs.writeFileSync = origWrite;
    });

    it('should handle read errors gracefully', () => {
        const origRead = fs.readFileSync;
        fs.readFileSync = jest.fn(() => { throw new Error('Read error'); });
        expect(() => persistence.loadServersFromDisk()).not.toThrow();
        fs.readFileSync = origRead;
    });
});
