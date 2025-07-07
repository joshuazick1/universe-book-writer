import { jest } from '@jest/globals';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

let saveServers: any;
let loadServers: any;
let setServersFile: any;
let testFile: string;

type Server = {
    id: string;
    url: string;
    type: string;
};

beforeAll(async () => {
    const mod = await import('../src/server-persistence.js');
    saveServers = mod.saveServers;
    loadServers = mod.loadServers;
    setServersFile = mod.setServersFile;
});

beforeEach(async () => {
    // Create a unique test file for each test
    const testTempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ai-server-test-'));
    testFile = path.join(testTempDir, 'servers.json');
    setServersFile(testFile);
});

afterEach(async () => {
    // Clean up the test file
    try {
        await fs.unlink(testFile);
        await fs.rmdir(path.dirname(testFile));
    } catch (error) {
        // Directory might not be empty or file doesn't exist, that's fine
    }
});

describe('server-persistence.ts', () => {
    it('should save and load servers with special characters', async () => {
        const servers = [{ id: 's1', url: 'http://localhost/äöü?x=1&y=2', type: 'ollama' as const }];
        await saveServers(servers);
        const loaded = await loadServers();
        expect(loaded).toBeDefined();
        expect(Array.isArray(loaded)).toBe(true);
        expect(loaded.length).toBe(1);
        expect(loaded[0]).toBeDefined();
        expect(loaded[0].url).toContain('äöü');
    });

    it('should save and load a large server list', async () => {
        const servers = Array.from({ length: 1000 }, (_, i) => ({ id: `s${i}`, url: `http://host${i}`, type: 'ollama' as const }));
        await saveServers(servers);
        const loaded = await loadServers();
        expect(loaded).toBeDefined();
        expect(Array.isArray(loaded)).toBe(true);
        expect(loaded.length).toBe(1000);
        expect(loaded[999]).toBeDefined();
        expect(loaded[999].id).toBe('s999');
    });

    it('should save and load servers', async () => {
        const servers = [
            { id: 's1', url: 'http://localhost:1234', type: 'ollama' as const },
            { id: 's2', url: 'http://localhost:5678', type: 'ollama' as const }
        ];
        await saveServers(servers);
        const loaded = await loadServers();
        expect(loaded).toBeDefined();
        expect(Array.isArray(loaded)).toBe(true);
        expect(loaded.length).toBe(2);
        expect(loaded[0]).toBeDefined();
        expect(loaded[0].id).toBe('s1');
        expect(loaded[1]).toBeDefined();
        expect(loaded[1].id).toBe('s2');
    });

    it('should throw on file permission error (EACCES)', async () => {
        const servers = [{ id: 'fail', url: 'x', type: 'ollama' as const }];
        const origWrite = fs.writeFile;
        const err = Object.assign(new Error('Permission denied'), { code: 'EACCES' });
        fs.writeFile = jest.fn(() => Promise.reject(err));
        await expect(saveServers(servers)).rejects.toThrow('Permission denied');
        fs.writeFile = origWrite;
    });

    it('should log debug output when DEBUG_PERSISTENCE is set', async () => {
        process.env.DEBUG_PERSISTENCE = '1';
        const servers = [{ id: 's1', url: 'http://localhost', type: 'ollama' as const }];
        const origLog = console.log;
        let logged = '';
        console.log = (msg: string, ...args: any[]) => { logged += msg + args.join(' '); };
        await saveServers(servers);
        await loadServers();
        expect(logged).toContain('saveServers');
        expect(logged).toContain('loadServers');
        console.log = origLog;
        delete process.env.DEBUG_PERSISTENCE;
    });
    let serversFile: string;
    beforeAll(async () => {
        const mod = await import('../src/server-persistence.js');
        serversFile = mod.SERVERS_FILE;
        // eslint-disable-next-line no-console
        if (process.env.DEBUG_PERSISTENCE === '1') {
            console.log('[test] serversFile:', serversFile);
        }
    });
    beforeAll(() => {
        // eslint-disable-next-line no-console
        if (process.env.DEBUG_PERSISTENCE === '1') {
            console.log('[test] serversFile:', serversFile);
        }
    });

    beforeEach(async () => {
        // Ensure clean state before each test
        try { await fs.unlink(serversFile); } catch { }
    });
    afterEach(async () => {
        // Clean up after each test
        try { await fs.unlink(serversFile); } catch { }
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
        if (process.env.DEBUG_PERSISTENCE === '1') {
            // eslint-disable-next-line no-console
            console.log('[test] loaded (missing file):', loaded);
        }
        expect(loaded).toEqual([]);
    });

    it('should return [] if file is corrupt', async () => {
        await fs.writeFile(serversFile, 'not-json', 'utf-8');
        const loaded = await loadServers();
        if (process.env.DEBUG_PERSISTENCE === '1') {
            // eslint-disable-next-line no-console
            console.log('[test] loaded (corrupt file):', loaded);
        }
        expect(loaded).toEqual([]);
    });

    it('should return [] if file is empty', async () => {
        await fs.writeFile(serversFile, '', 'utf-8');
        const loaded = await loadServers();
        if (process.env.DEBUG_PERSISTENCE === '1') {
            // eslint-disable-next-line no-console
            console.log('[test] loaded (empty file):', loaded);
        }
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
