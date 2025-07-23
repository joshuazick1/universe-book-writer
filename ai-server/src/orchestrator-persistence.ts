/**
 * orchestrator-persistence.ts
 * Utilities to persist and restore orchestrator server registrations to disk.
 * All functions are robust: they never throw, and always return a safe value on error.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { AIServer } from './orchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PERSIST_PATH = path.join(__dirname, '../data/orchestrator-servers.json');


/**
 * Saves the orchestrator server list to disk. Never throws.
 * @param servers Array of AIServer objects to persist.
 */
export function saveServersToDisk(servers: AIServer[]): void {
    try {
        fs.mkdirSync(path.dirname(PERSIST_PATH), { recursive: true });
        fs.writeFileSync(PERSIST_PATH, JSON.stringify(servers, null, 2), 'utf-8');
    } catch (err) {
        // Optionally log error for debugging or monitoring
        // console.error('Failed to persist orchestrator servers:', err);
    }
}


/**
 * Loads the orchestrator server list from disk. Never throws.
 * @returns Array of AIServer objects, or [] if file is missing, corrupt, or not an array.
 */
export function loadServersFromDisk(): AIServer[] {
    try {
        if (!fs.existsSync(PERSIST_PATH)) return [];
        const raw = fs.readFileSync(PERSIST_PATH, 'utf-8');
        if (!raw.trim()) return [];
        const arr = JSON.parse(raw);
        if (Array.isArray(arr)) return arr;
        return [];
    } catch (err) {
        // Optionally log error for debugging or monitoring
        // console.error('Failed to load orchestrator servers:', err);
        return [];
    }
}
