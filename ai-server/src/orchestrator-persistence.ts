// orchestrator-persistence.ts
// Utilities to persist and restore orchestrator server registrations to disk
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AIServer } from './orchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PERSIST_PATH = path.join(__dirname, '../data/orchestrator-servers.json');

export function saveServersToDisk(servers: AIServer[]): void {
    try {
        fs.mkdirSync(path.dirname(PERSIST_PATH), { recursive: true });
        fs.writeFileSync(PERSIST_PATH, JSON.stringify(servers, null, 2), 'utf-8');
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to persist orchestrator servers:', err);
    }
}

export function loadServersFromDisk(): AIServer[] {
    try {
        if (!fs.existsSync(PERSIST_PATH)) return [];
        const raw = fs.readFileSync(PERSIST_PATH, 'utf-8');
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
        return [];
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load orchestrator servers:', err);
        return [];
    }
}
