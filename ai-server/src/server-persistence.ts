// Simple JSON file persistence for server list
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AIServer } from './orchestrator.js';

// Use ESM-compatible __dirname workaround
const __dirname = path.dirname(fileURLToPath(import.meta.url));
export let SERVERS_FILE = path.resolve(__dirname, '../servers.json');

// Debug: log the resolved servers file path
if (process.env.DEBUG_PERSISTENCE === '1') {
    // eslint-disable-next-line no-console
    console.log('[server-persistence] SERVERS_FILE:', SERVERS_FILE);
}

// Allow tests to override the file path
export function setServersFile(filePath: string) {
    SERVERS_FILE = filePath;
}

export async function saveServers(servers: Omit<AIServer, 'healthy' | 'lastResponseTime' | 'models'>[]) {
    if (process.env.DEBUG_PERSISTENCE === '1') {
        // eslint-disable-next-line no-console
        console.log('[server-persistence] saveServers writing to:', SERVERS_FILE, 'data:', servers);
    }
    await fs.writeFile(SERVERS_FILE, JSON.stringify(servers, null, 2), 'utf-8');
}

export async function loadServers(): Promise<Omit<AIServer, 'healthy' | 'lastResponseTime' | 'models'>[]> {
    try {
        const data = await fs.readFile(SERVERS_FILE, 'utf-8');
        if (process.env.DEBUG_PERSISTENCE === '1') {
            // eslint-disable-next-line no-console
            console.log('[server-persistence] loadServers read from:', SERVERS_FILE, 'data:', data);
        }
        if (!data.trim()) return [];
        const parsed = JSON.parse(data);
        if (Array.isArray(parsed)) return parsed;
        return [];
    } catch (err) {
        if (process.env.DEBUG_PERSISTENCE === '1') {
            // eslint-disable-next-line no-console
            console.log('[server-persistence] loadServers error:', err);
        }
        return [];
    }
}
