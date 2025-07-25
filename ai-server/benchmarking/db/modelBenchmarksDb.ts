// ai-server/benchmarking/db/modelBenchmarksDb.ts
// Persistent file-based storage for model benchmarks (fallback for environments without DB)
import { ModelQualityBenchmarks } from '../../../shared/types/aiQualityBenchmark.js';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BENCHMARKS_FILE = path.resolve(__dirname, 'model-benchmarks.json');

async function readBenchmarksFile(): Promise<Record<string, ModelQualityBenchmarks>> {
    try {
        const data = await fs.readFile(BENCHMARKS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') return {};
        throw err;
    }
}

async function writeBenchmarksFile(store: Record<string, ModelQualityBenchmarks>): Promise<void> {
    await fs.writeFile(BENCHMARKS_FILE, JSON.stringify(store, null, 2), 'utf-8');
}

export async function getModelBenchmarks(): Promise<ModelQualityBenchmarks[]> {
    const store = await readBenchmarksFile();
    return Object.values(store);
}

export async function saveModelBenchmarks(benchmark: ModelQualityBenchmarks): Promise<void> {
    const store = await readBenchmarksFile();
    store[benchmark.modelId] = benchmark;
    await writeBenchmarksFile(store);
}
