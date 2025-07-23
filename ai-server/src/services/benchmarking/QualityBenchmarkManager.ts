/**
 * Quality Benchmark Manager - Simplified Implementation
 * 
 * Focuses on the core requirement: quality benchmarking on slow servers only.
 * Integrates with existing BenchmarkManager for performance data.
 */

import { BenchmarkManager } from '../../benchmarkManager.js';
import { logger } from '../../../../shared/logging/logger.js';
import Ajv from 'ajv';

// Dynamic import helpers for CommonJS modules
let bleuModule: any;
let rougeModule: any;
async function getBleu() {
    if (!bleuModule) {
        bleuModule = (await import('bleu-score')).default;
    }
    return bleuModule;
}
async function getRouge() {
    if (!rougeModule) {
        rougeModule = (await import('rouge')).default;
    }
    return rougeModule;
}

export interface QualityTestResult {
    modelEndpoint: string;
    taskType: 'json-generation' | 'conversational' | 'character-generation';
    qualityScore: number; // 0-1
    timestamp: number;
    isSlowServer: boolean;
    latencyMs?: number;
}

export interface ModelQualityData {
    modelEndpoint: string;
    jsonGenerationQuality: number;
    conversationalQuality: number;
    characterGenerationQuality: number;
    overallQuality: number;
    lastTested: number;
    recommendedFor: string[];
}

export interface ModelQualityProfile {
    modelEndpoint: string;
    qualityData: ModelQualityData;
    lastUpdated: number;
    testCount: number;
}

export class QualityBenchmarkManager {
    private benchmarkManager: BenchmarkManager;
    private qualityData: Map<string, ModelQualityData> = new Map();
    private isRunning: boolean = false;

    private backgroundInterval?: NodeJS.Timeout;
    private lastBenchmarkRun: Map<string, number> = new Map(); // modelName -> timestamp
    private inFlightBenchmarks: Set<string> = new Set(); // modelName
    private orchestrator?: any; // Will be set via setter for dynamic model/server discovery

    constructor(benchmarkManager: BenchmarkManager, orchestrator?: any) {
        this.benchmarkManager = benchmarkManager;
        if (orchestrator) this.orchestrator = orchestrator;
        this.startBackgroundTesting();
    }

    /**
     * Set orchestrator instance for model/server discovery
     */
    setOrchestrator(orchestrator: any) {
        this.orchestrator = orchestrator;
    }

    /**
     * Run quality test on a model endpoint (only if it's a slow server)
     */
    async testModelQuality(modelEndpoint: string): Promise<QualityTestResult | null> {
        // Check if this is a slow server
        const serverInfo = this.getServerInfo(modelEndpoint);
        if (!serverInfo.isSlowServer) {
            logger.warn(`Quality Test: Skipping fast server ${modelEndpoint} - preserving for users`);
            return null;
        }

        logger.info(`Quality Test: Starting quality benchmark for ${modelEndpoint}`);

        try {
            // Simulate quality testing for different task types
            const jsonQuality = await this.testJSONGeneration(modelEndpoint);
            const conversationalQuality = await this.testConversational(modelEndpoint);
            const characterQuality = await this.testCharacterGeneration(modelEndpoint);

            const overallQuality = (jsonQuality + conversationalQuality + characterQuality) / 3;

            // Store results
            this.updateQualityData(modelEndpoint, {
                jsonGenerationQuality: jsonQuality,
                conversationalQuality: conversationalQuality,
                characterGenerationQuality: characterQuality,
                overallQuality,
                lastTested: Date.now()
            });

            logger.info(`Quality Test: Completed for ${modelEndpoint} - Overall: ${overallQuality.toFixed(2)}`);

            return {
                modelEndpoint,
                taskType: 'json-generation', // Primary test
                qualityScore: overallQuality,
                timestamp: Date.now(),
                isSlowServer: serverInfo.isSlowServer,
                latencyMs: serverInfo.latencyMs
            };

        } catch (error) {
            logger.error(`Quality Test: Failed for ${modelEndpoint}: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }

    /**
     * Test JSON generation quality
     */
    private async testJSONGeneration(modelEndpoint: string): Promise<number> {
        // Real JSON generation test
        const testPrompts = [
            'Generate a JSON object for a Star Trek character with name, rank, and backstory.',
            'Create a JSON structure for a starship with specifications and crew.'
        ];

        let totalScore = 0;
        for (const prompt of testPrompts) {
            const response = await this.callModelAPI(modelEndpoint, prompt);
            const score = await this.evaluateJSONResponse(response);
            totalScore += score;
        }

        return totalScore / testPrompts.length;
    }

    /**
     * Test conversational quality
     */
    private async testConversational(modelEndpoint: string): Promise<number> {
        const testPrompts = [
            'You are Captain Picard. Respond to: "Good morning, Captain."',
            'As Picard, handle a diplomatic crisis with the Romulans.'
        ];

        let totalScore = 0;
        for (const prompt of testPrompts) {
            const response = await this.callModelAPI(modelEndpoint, prompt);
            const score = await this.evaluateConversationalResponse(response);
            totalScore += score;
        }

        return totalScore / testPrompts.length;
    }

    /**
     * Test character generation quality
     */
    private async testCharacterGeneration(modelEndpoint: string): Promise<number> {
        const testPrompts = [
            'Create a unique Starfleet officer with detailed background.',
            'Design an alien diplomat with cultural traits.'
        ];

        let totalScore = 0;
        for (const prompt of testPrompts) {
            const response = await this.callModelAPI(modelEndpoint, prompt);
            const score = await this.evaluateCharacterResponse(response);
            totalScore += score;
        }

        return totalScore / testPrompts.length;
    }

    /**
     * Call the real model API endpoint with the given prompt
     */
    /**
     * Call the real model API endpoint with the given prompt, with retries and error handling
     */
    private async callModelAPI(modelEndpoint: string, prompt: string, maxRetries = 3, baseDelayMs = 500): Promise<string> {
        let attempt = 0;
        let lastError: any = null;
        while (attempt <= maxRetries) {
            try {
                const response = await fetch(modelEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ prompt })
                });
                if (!response.ok) {
                    throw new Error(`Model call failed: ${response.status} ${response.statusText}`);
                }
                const data = await response.json();
                // Try to return the most likely response field
                return data.text || data.response || JSON.stringify(data);
            } catch (error) {
                lastError = error;
                logger.warn(`callModelAPI attempt ${attempt + 1} failed for ${modelEndpoint}: ${error instanceof Error ? error.message : String(error)}`);
                if (attempt < maxRetries) {
                    // Exponential backoff
                    const delay = baseDelayMs * Math.pow(2, attempt);
                    await new Promise(res => setTimeout(res, delay));
                }
            }
            attempt++;
        }
        logger.error(`callModelAPI failed after ${maxRetries + 1} attempts for ${modelEndpoint}: ${lastError instanceof Error ? lastError.message : String(lastError)}`);
        throw lastError;
    }

    /**
     * Evaluate JSON response quality
     */
    /**
     * Evaluate JSON response quality using schema validation and BLEU/ROUGE metrics
     */
    private async evaluateJSONResponse(response: string): Promise<number> {
        // Reference output for BLEU/ROUGE comparison (could be improved with multiple refs)
        const reference = '{"name": "Jean-Luc Picard", "rank": "Captain", "backstory": "Experienced Starfleet officer"}';
        let score = 0;
        let parsed: any = null;
        const ajv = new (Ajv as any)();
        const schema = {
            type: 'object',
            required: ['name', 'rank', 'backstory'],
            properties: {
                name: { type: 'string' },
                rank: { type: 'string' },
                backstory: { type: 'string' }
            }
        };
        try {
            parsed = JSON.parse(response);
        } catch (err) {
            logger.error('Malformed JSON: ' + (err instanceof Error ? err.message : String(err)));
            return 0.1;
        }
        // Schema validation
        const validate = ajv.compile(schema);
        if (!validate(parsed)) {
            logger.warn('JSON schema validation failed: ' + JSON.stringify(validate.errors));
            score += 0.2;
        } else {
            score += 0.5;
        }
        // BLEU/ROUGE metrics
        try {
            const bleu = await getBleu();
            const rouge = await getRouge();
            // BLEU expects arrays of tokens
            const bleuScore = bleu.bleu(response.split(' '), [reference.split(' ')]).score / 100;
            // ROUGE expects strings
            const rougeScores = rouge(response, reference);
            const rougeF1 = rougeScores.rougeL ? rougeScores.rougeL.f1 : 0;
            score += 0.2 * bleuScore + 0.2 * rougeF1;
        } catch (err) {
            logger.warn('BLEU/ROUGE metric error: ' + (err instanceof Error ? err.message : String(err)));
        }
        return Math.min(score, 1.0);
    }

    /**
     * Evaluate conversational response quality
     */
    /**
     * Evaluate conversational response quality using BLEU/ROUGE and prompt adherence
     */
    private async evaluateConversationalResponse(response: string): Promise<number> {
        // Reference output for BLEU/ROUGE comparison
        const reference = 'Good morning, Number One. What is our status?';
        let score = 0.4; // Base score
        // BLEU/ROUGE metrics
        try {
            const bleu = await getBleu();
            const rouge = await getRouge();
            const bleuScore = bleu.bleu(response.split(' '), [reference.split(' ')]).score / 100;
            const rougeScores = rouge(response, reference);
            const rougeF1 = rougeScores.rougeL ? rougeScores.rougeL.f1 : 0;
            score += 0.2 * bleuScore + 0.2 * rougeF1;
        } catch (err) {
            logger.warn('BLEU/ROUGE metric error: ' + (err instanceof Error ? err.message : String(err)));
        }
        // Check for character-appropriate responses
        const picardPhrases = ['number one', 'engage', 'make it so'];
        const foundPhrases = picardPhrases.filter(phrase =>
            response.toLowerCase().includes(phrase)
        );
        score += foundPhrases.length * 0.05;
        // Check response length and structure
        if (response.length > 20 && response.length < 200) {
            score += 0.1;
        }
        // Penalize empty or irrelevant responses
        if (!response || response.trim().length < 5) {
            logger.warn('Empty or irrelevant conversational response');
            score = Math.min(score, 0.2);
        }
        return Math.min(score, 1.0);
    }

    /**
     * Evaluate character generation quality
     */
    /**
     * Evaluate character generation response using BLEU/ROUGE and detail/creativity checks
     */
    private async evaluateCharacterResponse(response: string): Promise<number> {
        // Reference output for BLEU/ROUGE comparison
        const reference = 'Commander Sarah Chen, a brilliant tactical officer with experience in deep space exploration.';
        let score = 0.4; // Base score
        // BLEU/ROUGE metrics
        try {
            const bleu = await getBleu();
            const rouge = await getRouge();
            const bleuScore = bleu.bleu(response.split(' '), [reference.split(' ')]).score / 100;
            const rougeScores = rouge(response, reference);
            const rougeF1 = rougeScores.rougeL ? rougeScores.rougeL.f1 : 0;
            score += 0.2 * bleuScore + 0.2 * rougeF1;
        } catch (err) {
            logger.warn('BLEU/ROUGE metric error: ' + (err instanceof Error ? err.message : String(err)));
        }
        // Check for character details
        const detailKeywords = ['officer', 'background', 'experience', 'personality', 'skills'];
        const foundDetails = detailKeywords.filter(keyword =>
            response.toLowerCase().includes(keyword)
        );
        score += foundDetails.length * 0.05;
        // Check for creativity indicators
        if (response.length > 50) score += 0.1;
        if (response.includes('unique') || response.includes('special')) score += 0.05;
        // Penalize empty or irrelevant responses
        if (!response || response.trim().length < 5) {
            logger.warn('Empty or irrelevant character generation response');
            score = Math.min(score, 0.2);
        }
        return Math.min(score, 1.0);
    }

    /**
     * Get server information to determine if it's slow
     */
    private getServerInfo(modelEndpoint: string): { isSlowServer: boolean; latencyMs?: number } {
        try {
            // Extract server ID and model from endpoint
            const parts = modelEndpoint.split(':');
            const serverId = parts[0] || 'unknown';
            const model = parts[1] || 'unknown';

            // Get benchmark data
            const benchmark = this.benchmarkManager.getBenchmark(serverId, model);
            const latencyMs = benchmark?.latencyMs || 5000;

            // Consider servers with latency > 2000ms as "slow"
            return {
                isSlowServer: latencyMs > 2000,
                latencyMs
            };
        } catch {
            return { isSlowServer: true }; // Default to slow for safety
        }
    }

    /**
     * Update quality data for a model
     */
    private updateQualityData(modelEndpoint: string, data: Partial<ModelQualityData>): void {
        const existing = this.qualityData.get(modelEndpoint) || {
            modelEndpoint,
            jsonGenerationQuality: 0,
            conversationalQuality: 0,
            characterGenerationQuality: 0,
            overallQuality: 0,
            lastTested: 0,
            recommendedFor: []
        };

        const updated: ModelQualityData = { ...existing, ...data };

        // Update recommendations based on scores
        updated.recommendedFor = [];
        if (updated.jsonGenerationQuality > 0.7) updated.recommendedFor.push('json-generation');
        if (updated.conversationalQuality > 0.7) updated.recommendedFor.push('conversational');
        if (updated.characterGenerationQuality > 0.7) updated.recommendedFor.push('character-generation');

        this.qualityData.set(modelEndpoint, updated);
    }

    /**
     * Get quality data for a model
     */
    getModelQuality(modelEndpoint: string): ModelQualityData | undefined {
        return this.qualityData.get(modelEndpoint);
    }

    /**
     * Get quality profile for a model
     */
    getModelQualityProfile(modelEndpoint: string): ModelQualityProfile | undefined {
        const qualityData = this.qualityData.get(modelEndpoint);
        if (!qualityData) return undefined;

        return {
            modelEndpoint,
            qualityData,
            lastUpdated: qualityData.lastTested,
            testCount: 1 // Simplified for now
        };
    }

    /**
     * Get best model for a specific task type
     */
    getBestModelForTask(taskType: string): string | null {
        let bestModel: string | null = null;
        let bestScore = 0;

        for (const [endpoint, data] of this.qualityData.entries()) {
            let score = 0;

            switch (taskType) {
                case 'json-generation':
                    score = data.jsonGenerationQuality;
                    break;
                case 'conversational':
                    score = data.conversationalQuality;
                    break;
                case 'character-generation':
                    score = data.characterGenerationQuality;
                    break;
                default:
                    score = data.overallQuality;
            }

            if (score > bestScore) {
                bestScore = score;
                bestModel = endpoint;
            }
        }

        return bestModel;
    }

    /**
     * Start background quality testing
     */

    private startBackgroundTesting(): void {
        // Run quality tests every hour (actual scheduling is per-model)
        this.backgroundInterval = setInterval(async () => {
            if (this.isRunning) return;
            this.isRunning = true;
            try {
                await this.runAutomatedBenchmarks();
            } catch (error) {
                logger.error(`Quality Test: Automated benchmark scheduling failed: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
                this.isRunning = false;
            }
        }, 60 * 60 * 1000); // 1 hour
        logger.info('Quality Test: Started automated benchmark scheduling (hourly checks)');
    }

    /**
     * Automated benchmark scheduling and execution
     * - Discovers all models/servers from orchestrator
     * - Schedules benchmarks per model based on size
     * - Runs on slowest server for each model
     * - Ensures only one benchmark per model is in flight
     */
    private async runAutomatedBenchmarks(): Promise<void> {
        if (!this.orchestrator || typeof this.orchestrator.getServers !== 'function') {
            logger.warn('Quality Test: Orchestrator not set or missing getServers(). Skipping automated benchmarks.');
            return;
        }
        const servers = this.orchestrator.getServers();
        // Build model -> [servers] map
        const modelToServers: Record<string, any[]> = {};
        for (const server of servers) {
            if (!server.healthy || !Array.isArray(server.models)) continue;
            for (const model of server.models) {
                if (!modelToServers[model]) modelToServers[model] = [];
                modelToServers[model].push(server);
            }
        }
        const now = Date.now();
        for (const [model, serverList] of Object.entries(modelToServers)) {
            // Determine model size (parse from model name, e.g. "llama2-7b", "mistral-8x22b")
            const sizeB = this.parseModelSizeB(model);
            let intervalMs = 24 * 60 * 60 * 1000; // default: daily
            if (sizeB >= 30) intervalMs = 7 * 24 * 60 * 60 * 1000; // 7 days
            else if (sizeB >= 12) intervalMs = 3 * 24 * 60 * 60 * 1000; // 3 days
            // Check last run
            const lastRun = this.lastBenchmarkRun.get(model) || 0;
            if (now - lastRun < intervalMs) continue; // Not due yet
            if (this.inFlightBenchmarks.has(model)) continue; // Already running
            // Find slowest server for this model
            let slowest: any = null;
            let maxLatency = -1;
            for (const server of serverList) {
                const bench = this.benchmarkManager.getBenchmark(server.id, model);
                const latency = bench?.latencyMs ?? 99999;
                if (latency > maxLatency) {
                    maxLatency = latency;
                    slowest = server;
                }
            }
            if (!slowest) continue;
            // Compose endpoint string as used elsewhere (e.g. "serverId:model")
            const modelEndpoint = `${slowest.id}:${model}`;
            this.inFlightBenchmarks.add(model);
            this.testModelQuality(modelEndpoint)
                .then(() => {
                    this.lastBenchmarkRun.set(model, Date.now());
                })
                .catch((err) => {
                    logger.error(`Quality Test: Benchmark failed for ${modelEndpoint}: ${err instanceof Error ? err.message : String(err)}`);
                })
                .finally(() => {
                    this.inFlightBenchmarks.delete(model);
                });
        }
    }

    /**
     * Parse model size in B (billion params) from model name string
     * e.g. "llama2-7b" => 7, "mistral-8x22b" => 22, "mixtral-8x22b" => 22
     */
    private parseModelSizeB(model: string): number {
        const match = model.match(/(\d+)(?:x)?(\d*)b/i);
        if (!match) return 7; // default to 7B if unknown
        if (match[2]) return parseInt(match[2], 10);
        return parseInt(match[1], 10);
    }

    /**
     * Run background tests on slow servers
     */
    private async runBackgroundTests(): Promise<void> {
        // Test some example models (in real implementation, get from orchestrator)
        const testModels = ['server1:llama2', 'server2:mistral', 'server3:codellama'];

        for (const modelEndpoint of testModels) {
            const serverInfo = this.getServerInfo(modelEndpoint);

            if (serverInfo.isSlowServer) {
                await this.testModelQuality(modelEndpoint);

                // Add delay between tests
                await new Promise(resolve => setTimeout(resolve, 30000)); // 30 seconds
            }
        }
    }

    /**
     * Get quality report for all models
     */
    getQualityReport(): {
        models: ModelQualityData[];
        recommendations: { taskType: string; bestModel: string; score: number }[];
        summary: { totalModels: number; averageQuality: number; lastUpdate: number };
    } {
        const models = Array.from(this.qualityData.values());

        const recommendations = [
            'json-generation',
            'conversational',
            'character-generation'
        ].map(taskType => {
            const bestModel = this.getBestModelForTask(taskType);
            const modelData = bestModel ? this.qualityData.get(bestModel) : null;
            let score = 0;

            if (modelData) {
                switch (taskType) {
                    case 'json-generation': score = modelData.jsonGenerationQuality; break;
                    case 'conversational': score = modelData.conversationalQuality; break;
                    case 'character-generation': score = modelData.characterGenerationQuality; break;
                }
            }

            return {
                taskType,
                bestModel: bestModel || 'None',
                score
            };
        });

        const averageQuality = models.length > 0
            ? models.reduce((sum, m) => sum + m.overallQuality, 0) / models.length
            : 0;

        const lastUpdate = models.length > 0
            ? Math.max(...models.map(m => m.lastTested))
            : 0;

        return {
            models,
            recommendations,
            summary: {
                totalModels: models.length,
                averageQuality,
                lastUpdate
            }
        };
    }

    /**
     * Stop background testing
     */
    stop(): void {
        if (this.backgroundInterval) {
            clearInterval(this.backgroundInterval);
            this.backgroundInterval = undefined;
        }
        logger.info('Quality Test: Stopped background testing');
    }
}
