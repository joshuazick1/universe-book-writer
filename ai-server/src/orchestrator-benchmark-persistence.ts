// orchestrator-benchmark-persistence.ts
// Utilities to persist and restore orchestrator benchmark results to disk
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { ServerModelBenchmark } from './orchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PERSIST_PATH = path.join(__dirname, '../data/orchestrator-benchmarks.json');

export function saveBenchmarksToDisk(benchmarks: Record<string, ServerModelBenchmark>): void {
    try {
        fs.mkdirSync(path.dirname(PERSIST_PATH), { recursive: true });
        fs.writeFileSync(PERSIST_PATH, JSON.stringify(benchmarks, null, 2), 'utf-8');
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to persist orchestrator benchmarks:', err);
    }
}

export function loadBenchmarksFromDisk(): Record<string, ServerModelBenchmark> {
    try {
        if (!fs.existsSync(PERSIST_PATH)) return {};
        const raw = fs.readFileSync(PERSIST_PATH, 'utf-8');
        const obj = JSON.parse(raw);
        if (typeof obj === 'object' && obj !== null) return obj;
        return {};
    } catch (err) {
        // eslint-disable-next-line no-console
        console.error('Failed to load orchestrator benchmarks:', err);
        return {};
    }
}
