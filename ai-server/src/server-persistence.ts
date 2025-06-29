// Simple JSON file persistence for server list
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { AIServer } from './orchestrator.js';

// Use ESM-compatible __dirname workaround
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SERVERS_FILE = path.resolve(__dirname, '../servers.json');

export async function saveServers(servers: Omit<AIServer, 'healthy' | 'lastResponseTime' | 'models'>[]) {
    await fs.writeFile(SERVERS_FILE, JSON.stringify(servers, null, 2), 'utf-8');
}

export async function loadServers(): Promise<Omit<AIServer, 'healthy' | 'lastResponseTime' | 'models'>[]> {
    try {
        const data = await fs.readFile(SERVERS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}
