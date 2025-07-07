/**
 * Quality Benchmark Manager - Simplified Implementation
 * 
 * Focuses on the core requirement: quality benchmarking on slow servers only.
 * Integrates with existing BenchmarkManager for performance data.
 */

import { BenchmarkManager } from '../../benchmarkManager.js';
import { logInfo, logError, logWarn, logDebug } from '../../logger.js';

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

export class QualityBenchmarkManager {
    private benchmarkManager: BenchmarkManager;
    private qualityData: Map<string, ModelQualityData> = new Map();
    private isRunning: boolean = false;
    private backgroundInterval?: NodeJS.Timeout;

    constructor(benchmarkManager: BenchmarkManager) {
        this.benchmarkManager = benchmarkManager;
        this.startBackgroundTesting();
    }

    /**
     * Run quality test on a model endpoint (only if it's a slow server)
     */
    async testModelQuality(modelEndpoint: string): Promise<QualityTestResult | null> {
        // Check if this is a slow server
        const serverInfo = this.getServerInfo(modelEndpoint);
        if (!serverInfo.isSlowServer) {
            logWarn(`Quality Test: Skipping fast server ${modelEndpoint} - preserving for users`);
            return null;
        }

        logInfo(`Quality Test: Starting quality benchmark for ${modelEndpoint}`);

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

            logInfo(`Quality Test: Completed for ${modelEndpoint} - Overall: ${overallQuality.toFixed(2)}`);

            return {
                modelEndpoint,
                taskType: 'json-generation', // Primary test
                qualityScore: overallQuality,
                timestamp: Date.now(),
                isSlowServer: serverInfo.isSlowServer,
                latencyMs: serverInfo.latencyMs
            };

        } catch (error) {
            logError(`Quality Test: Failed for ${modelEndpoint}: ${error instanceof Error ? error.message : String(error)}`);
            return null;
        }
    }

    /**
     * Test JSON generation quality
     */
    private async testJSONGeneration(modelEndpoint: string): Promise<number> {
        // Simulate JSON generation test
        // In a real implementation, this would send prompts and evaluate responses

        const testPrompts = [
            'Generate a JSON object for a Star Trek character with name, rank, and backstory.',
            'Create a JSON structure for a starship with specifications and crew.'
        ];

        let totalScore = 0;
        for (const prompt of testPrompts) {
            // Simulate API call and evaluation
            const response = await this.simulateModelCall(modelEndpoint, prompt);
            const score = this.evaluateJSONResponse(response);
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
            const response = await this.simulateModelCall(modelEndpoint, prompt);
            const score = this.evaluateConversationalResponse(response);
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
            const response = await this.simulateModelCall(modelEndpoint, prompt);
            const score = this.evaluateCharacterResponse(response);
            totalScore += score;
        }

        return totalScore / testPrompts.length;
    }

    /**
     * Simulate model API call (replace with real implementation)
     */
    private async simulateModelCall(modelEndpoint: string, prompt: string): Promise<string> {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));

        // Return simulated response based on prompt type
        if (prompt.includes('JSON')) {
            return '{"name": "Jean-Luc Picard", "rank": "Captain", "backstory": "Experienced Starfleet officer"}';
        } else if (prompt.includes('Picard')) {
            return 'Good morning, Number One. What is our status?';
        } else {
            return 'Commander Sarah Chen, a brilliant tactical officer with experience in deep space exploration.';
        }
    }

    /**
     * Evaluate JSON response quality
     */
    private evaluateJSONResponse(response: string): number {
        try {
            const parsed = JSON.parse(response);
            if (typeof parsed === 'object' && parsed !== null) {
                // Check for required fields
                const hasName = 'name' in parsed;
                const hasDetails = Object.keys(parsed).length >= 3;
                return (hasName ? 0.5 : 0) + (hasDetails ? 0.5 : 0);
            }
            return 0.3;
        } catch {
            return 0.1; // Poor JSON format
        }
    }

    /**
     * Evaluate conversational response quality
     */
    private evaluateConversationalResponse(response: string): number {
        let score = 0.5; // Base score

        // Check for character-appropriate responses
        const picardPhrases = ['number one', 'engage', 'make it so'];
        const foundPhrases = picardPhrases.filter(phrase =>
            response.toLowerCase().includes(phrase)
        );

        score += foundPhrases.length * 0.2;

        // Check response length and structure
        if (response.length > 20 && response.length < 200) {
            score += 0.2;
        }

        return Math.min(score, 1.0);
    }

    /**
     * Evaluate character generation quality
     */
    private evaluateCharacterResponse(response: string): number {
        let score = 0.4; // Base score

        // Check for character details
        const detailKeywords = ['officer', 'background', 'experience', 'personality', 'skills'];
        const foundDetails = detailKeywords.filter(keyword =>
            response.toLowerCase().includes(keyword)
        );

        score += foundDetails.length * 0.1;

        // Check for creativity indicators
        if (response.length > 50) score += 0.2;
        if (response.includes('unique') || response.includes('special')) score += 0.1;

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
        // Run quality tests every 6 hours
        this.backgroundInterval = setInterval(async () => {
            if (this.isRunning) return;

            this.isRunning = true;
            try {
                await this.runBackgroundTests();
            } catch (error) {
                logError(`Quality Test: Background testing failed: ${error instanceof Error ? error.message : String(error)}`);
            } finally {
                this.isRunning = false;
            }
        }, 6 * 60 * 60 * 1000); // 6 hours

        logInfo('Quality Test: Started background testing (6-hour intervals)');
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
        logInfo('Quality Test: Stopped background testing');
    }
}
