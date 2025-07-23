import * as fs from 'fs';
import * as path from 'path';
import type { JobResult } from '../../core/types/queue.js';
import type { QualityVerdict, TaskRubric } from '../../core/types/qualityJudger.js';
import { lengthValidator } from './validators/lengthValidator.js';
import { schemaValidator } from './validators/schemaValidator.js';
import { regexValidator } from './validators/regexValidator.js';
import { referenceMetricsValidator } from './validators/referenceMetricsValidator.js';
import { entityCountValidator } from './validators/entityCountValidator.js';
import { aiAssistedValidator } from './validators/aiAssistedValidator.js';

/**
 * QualityJudgerService
 * Evaluates the quality of model/worker responses for enrichment jobs.
 * Supports automated and AI-assisted validation. Integrates with orchestrator.
 * @module application/quality-judger/QualityJudgerService
 */


/**
 * QualityJudgerService
 * Evaluates the quality of model/worker responses for enrichment jobs.
 * Supports automated and AI-assisted validation. Integrates with orchestrator.
 * Logs all sub-scores, errors, and rationales for observability.
 *
 * Usage:
 *   const judger = new QualityJudgerService();
 *   const verdict = await judger.evaluate(result, 'summarize', referenceData);
 */
export class QualityJudgerService {
    private rubrics: Record<string, TaskRubric> = {};

    constructor() {
        this.loadRubrics();
    }

    /**
     * Loads all rubric JSON files from the rubrics directory.
     * Logs loaded rubrics for observability.
     */
    private loadRubrics() {
        const dir = path.join(__dirname, 'rubrics');
        if (!fs.existsSync(dir)) return;
        for (const file of fs.readdirSync(dir)) {
            if (file.endsWith('.json')) {
                try {
                    const rubric: TaskRubric = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
                    this.rubrics[rubric.taskType] = rubric;
                    // eslint-disable-next-line no-console
                    console.log(`[QualityJudger] Loaded rubric for taskType: ${rubric.taskType}`);
                } catch (err) {
                    // eslint-disable-next-line no-console
                    console.error(`[QualityJudger] Failed to load rubric ${file}:`, err);
                }
            }
        }
    }

    /**
     * Evaluate a job result for a given task type and (optionally) reference data.
     * Runs all relevant validators and AI checks, aggregates scores, and logs details.
     * @param result JobResult
     * @param taskType string
     * @param referenceData any (optional)
     * @returns QualityVerdict
     */
    /**
     * Evaluate a job result for a given task type and (optionally) reference data.
     * Runs all relevant validators and AI checks, aggregates scores, and logs details.
     * Persists all sub-scores, verdicts, and rationales for observability and analytics.
     * @param result JobResult
     * @param taskType string
     * @param referenceData any (optional)
     * @returns QualityVerdict
     */
    async evaluate(result: JobResult, taskType: string, referenceData?: unknown): Promise<QualityVerdict> {
        const rubric = this.rubrics[taskType];
        if (!rubric) {
            // eslint-disable-next-line no-console
            console.warn(`[QualityJudger] No rubric found for taskType: ${taskType}. Passing by default.`);
            return { passed: true, score: 1.0, rationale: 'No rubric found, passing by default.' };
        }
        let totalScore = 0;
        let rationale = '';
        let details: Record<string, unknown> = {};
        let metricCount = 0;
        let failedMetrics: string[] = [];
        for (const metric of rubric.metrics) {
            let passed = false;
            let metricScore = 0;
            try {
                switch (metric.validator) {
                    case 'length': {
                        passed = lengthValidator((result.result as any).summary || '', metric.params as any);
                        metricScore = passed ? 1 : 0;
                        break;
                    }
                    case 'schema': {
                        passed = schemaValidator(result.result, metric.params as any);
                        metricScore = passed ? 1 : 0;
                        break;
                    }
                    case 'regex': {
                        const res = regexValidator((result.result as any).summary || '', metric.params as any);
                        passed = res.passed;
                        metricScore = res.score;
                        break;
                    }
                    case 'reference': {
                        // Only pass two arguments as per validator signature
                        const res = referenceMetricsValidator((result.result as any).summary || '', metric.params as any);
                        passed = res.passed;
                        metricScore = res.score;
                        break;
                    }
                    case 'entityCount': {
                        const res = entityCountValidator(result.result, metric.params as any);
                        passed = res.passed;
                        metricScore = res.score;
                        break;
                    }
                    case 'aiAssisted':
                    case 'llm': {
                        // Use LLM validator for both aiAssisted and llm
                        const { llmValidator } = await import('./validators/llmValidator.js');
                        const res = await llmValidator((result.result as any).summary || '', metric.params as any);
                        passed = res.passed;
                        metricScore = res.score;
                        break;
                    }
                    default: {
                        // eslint-disable-next-line no-console
                        console.warn(`[QualityJudger] Unknown validator: ${metric.validator}. Passing by default.`);
                        passed = true;
                        metricScore = 1;
                    }
                }
            } catch (err) {
                // eslint-disable-next-line no-console
                console.error(`[QualityJudger] Error in validator '${metric.validator}' for metric '${metric.name}':`, err);
                passed = false;
                metricScore = 0;
                rationale += `Error in ${metric.name}. `;
            }
            totalScore += metricScore * metric.weight;
            details[metric.name] = { passed, metricScore };
            metricCount++;
            // eslint-disable-next-line no-console
            console.log(`[QualityJudger] Metric '${metric.name}': passed=${passed}, score=${metricScore}`);
            if (!passed) {
                rationale += `Failed: ${metric.name}. `;
                failedMetrics.push(metric.name);
            }
        }
        // Use default threshold 0.8 (or adjust if rubric is extended in the future)
        const threshold = 0.8;
        const passed = totalScore >= threshold;
        // eslint-disable-next-line no-console
        console.log(`[QualityJudger] Final verdict for jobId=${result.jobId}, taskType=${taskType}: passed=${passed}, score=${totalScore}, failedMetrics=${failedMetrics.join(',')}`);
        return {
            passed,
            score: totalScore,
            rationale: rationale || 'All metrics passed.',
            details,
        };
    }
}
