/**
 * Quality Benchmark Scheduling Utility
 *
 * Determines the next scheduled time for a quality benchmark based on the latest quality scores.
 * Top-performing models are benchmarked more frequently than low-performing ones.
 *
 * Example policy:
 *   - Score >= 0.85: daily
 *   - 0.7 <= Score < 0.85: every 3 days
 *   - Score < 0.7: every 7 days
 *
 * @module scheduleNextQualityBenchmark
 */

import { QualityBenchmarkScore } from 'shared/types/aiQualityBenchmark.js';

/**
 * Return type for scheduleNextQualityBenchmark.
 */
export interface NextBenchmarkSchedule {
    nextBenchmark: string;
    shouldRun: boolean;
    intervalDays: number;
}

/**
 * Determines the next scheduled time for a quality benchmark based on the latest quality scores.
 *
 * @param benchmarks - The latest array of QualityBenchmarkScore for the model.
 * @param now - Optional: current Date (for testing/override)
 * @returns An object with nextBenchmark (ISO string), shouldRun (boolean), and intervalDays (number)
 */
export function scheduleNextQualityBenchmark(
    benchmarks: readonly QualityBenchmarkScore[],
    now?: Date
): NextBenchmarkSchedule {
    const nowDate = now ?? new Date();
    if (!benchmarks || benchmarks.length === 0) {
        // If no benchmarks, schedule for immediate run
        return { nextBenchmark: nowDate.toISOString(), shouldRun: true, intervalDays: 0 };
    }
    // Use the average score across all types
    const avgScore = benchmarks.reduce((sum: number, b: QualityBenchmarkScore) => sum + (typeof b.score === 'number' ? b.score : 0), 0) / benchmarks.length;
    let intervalDays = 7;
    if (avgScore >= 0.85) {
        intervalDays = 1;
    } else if (avgScore >= 0.7) {
        intervalDays = 3;
    }
    const next = new Date(nowDate.getTime() + intervalDays * 24 * 60 * 60 * 1000);
    return {
        nextBenchmark: next.toISOString(),
        shouldRun: nowDate >= next ? true : false,
        intervalDays
    };
}
