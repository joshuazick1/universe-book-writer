import { jest } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';

let saveServers: any;
let loadServers: any;

type Server = {
    id: string;
    url: string;
    type: string;
};

beforeAll(async () => {
    const mod = await import('../src/server-persistence');
    saveServers = mod.saveServers;
    loadServers = mod.loadServers;
});

describe('server-persistence.ts', () => {
    const serversFile = path.resolve(
        path.dirname(require.resolve('../src/server-persistence.ts')),
        '../servers.json'
    );

    afterEach(async () => {
        try {
            await fs.unlink(serversFile);
        } catch { }
    });

    it('should save and load servers', async () => {
        const servers = [{ id: 's1', url: 'http://localhost', type: 'ollama' as const }];
        await saveServers(servers);
        const loaded = await loadServers();
        expect(Array.isArray(loaded)).toBe(true);
        expect(loaded[0].id).toBe('s1');
    });

    it('should return [] if file does not exist', async () => {
        try { await fs.unlink(serversFile); } catch { }
        const loaded = await loadServers();
        expect(loaded).toEqual([]);
    });

    it('should return [] if file is corrupt', async () => {
        await fs.writeFile(serversFile, 'not-json', 'utf-8');
        const loaded = await loadServers();
        expect(loaded).toEqual([]);
    });

    it('should return [] if file is empty', async () => {
        await fs.writeFile(serversFile, '', 'utf-8');
        const loaded = await loadServers();
        expect(loaded).toEqual([]);
    });

    it('should throw on write error', async () => {
        const servers = [{ id: 'fail', url: 'x', type: 'ollama' as const }];
        const origWrite = fs.writeFile;
        fs.writeFile = jest.fn(() => Promise.reject(new Error('Disk full')));
        await expect(saveServers(servers)).rejects.toThrow('Disk full');
        fs.writeFile = origWrite;
    });

    it('should recover from read error', async () => {
        const origRead = fs.readFile;
        // @ts-expect-error: purposely mocking to throw
        fs.readFile = jest.fn(() => Promise.reject(new Error('Read error')));
        const loaded = await loadServers();
        expect(loaded).toEqual([]);
        fs.readFile = origRead;
    });
});
