
/**
 * Script: produce-benchmark-jobs.ts
 * Description: Loads benchmark datasets from benchmarks/suites/, generates jobs, and submits them to the BullMQ queue.
 * Usage: npx tsx scripts/produce-benchmark-jobs.ts [suiteName]
 */

import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

// Import strict types and schemas from your backend core/types
import type { Job } from '../backend/core/types/queue.js';
import { JobSchema } from '../backend/core/types/queue.schema.js';

// --- Configuration ---
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const QUEUE_NAME = process.env.BENCHMARK_QUEUE_NAME || 'enrichment-jobs';
const SUITES_DIR = path.resolve(__dirname, '../benchmarks/suites');

// --- Helper: Load all suite files ---
async function getSuiteFiles(): Promise<string[]> {
    const files = await fs.readdir(SUITES_DIR);
    return files.filter(f => f.endsWith('.json'));
}

// --- Helper: Load suite data ---
async function loadSuiteData(suiteFile: string): Promise<unknown[]> {
    const filePath = path.join(SUITES_DIR, suiteFile);
    const raw = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(raw);
}

// --- Main ---
async function main() {
    const suiteArg = process.argv[2]; // Optional: suite name
    const redis = new (IORedis as any)(REDIS_URL);
    const queue = new Queue(QUEUE_NAME, { connection: redis });

    // Determine which suites to process
    const suiteFiles = await getSuiteFiles();
    const suitesToProcess = suiteArg
        ? suiteFiles.filter(f => f.replace(/\.json$/, '') === suiteArg)
        : suiteFiles;

    if (suitesToProcess.length === 0) {
        console.error(`No benchmark suites found${suiteArg ? ` for "${suiteArg}"` : ''}.`);
        process.exit(1);
    }

    let totalJobs = 0;
    for (const suiteFile of suitesToProcess) {
        const suiteName = suiteFile.replace(/\.json$/, '');
        const items = await loadSuiteData(suiteFile);

        if (!Array.isArray(items)) {
            console.warn(`Suite ${suiteName} is not an array, skipping.`);
            continue;
        }

        for (const [i, itemRaw] of items.entries()) {
            // Defensive: parse item as Record<string, unknown>
            const item = itemRaw as Record<string, unknown>;
            // Infer job type from suiteName or item.type
            const type = typeof item.type === 'string' ? item.type : suiteName;

            // Compose job
            const job: Job = {
                id: uuidv4(),
                chunkId: typeof item.chunkId === 'string' ? item.chunkId : `${suiteName}-${i}`,
                type,
                payload: item,
                version: 1,
                metadata: {
                    benchmark: true,
                    benchmarkSuite: suiteName,
                },
            };

            // Validate job
            try {
                JobSchema.parse(job);
            } catch (err) {
                console.error(`Invalid job in suite "${suiteName}" at index ${i}:`, err);
                continue;
            }

            // Submit to queue
            await queue.add(type, job, {
                removeOnComplete: true,
                removeOnFail: false,
            });
            totalJobs++;
            console.log(`✅ Submitted job for suite "${suiteName}" [${i + 1}/${items.length}]`);
        }
    }

    await queue.close();
    await redis.quit();
    console.log(`\nDone. Submitted ${totalJobs} benchmark jobs.`);
}

main().catch(err => {
    console.error('Fatal error in benchmark job producer:', err);
    process.exit(1);
});
