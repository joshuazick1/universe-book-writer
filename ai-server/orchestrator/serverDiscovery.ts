// ai-server/orchestrator/serverDiscovery.ts
// Persistent file-based storage for server discovery and latency (fallback for environments without orchestrator)
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SERVERS_FILE = path.resolve(__dirname, 'model-servers.json');
const LATENCIES_FILE = path.resolve(__dirname, 'server-latencies.json');

async function readServersFile(): Promise<Record<string, string[]>> {
    try {
        const data = await fs.readFile(SERVERS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {};
        throw err;
    }
}

async function readLatenciesFile(): Promise<Record<string, number>> {
    try {
        const data = await fs.readFile(LATENCIES_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {};
        throw err;
    }
}

export async function getServersForModel(modelId: string): Promise<string[]> {
    const servers = await readServersFile();
    return servers[modelId] || [];
}

export async function getServerLatency(serverId: string, modelId: string): Promise<number> {
    const latencies = await readLatenciesFile();
    return latencies[serverId] ?? 9999;
}
