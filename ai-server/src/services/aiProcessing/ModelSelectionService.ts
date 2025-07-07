/**
 * Model Selection and Benchmarking Service
 * 
 * Handles intelligent model selection based on background testing and performance metrics.
 * Replaces hardcoded model preferences with data-driven decisions.
 */

export interface ModelCapabilities {
    id: string;
    name: string;
    endpoint: string;
    maxTokens: number;
    speedRating: number; // 1-10, higher is faster
    qualityRating: number; // 1-10, higher is better quality  
    complexityHandling: number; // 1-10, higher handles more complex tasks
    reliabilityScore: number; // 0-1, based on error rates
    averageLatency: number; // milliseconds
    tokensPerSecond: number;
    memoryUsage: number; // MB
    lastTested: Date;
}

export interface TaskRequirements {
    complexity: 'simple' | 'moderate' | 'complex';
    qualityLevel: 'draft' | 'standard' | 'publication' | 'professional';
    maxLatency: number; // milliseconds
    contextSize: number; // approximate token count
    domain: string;
}

export interface ModelSelection {
    selectedModel: ModelCapabilities;
    confidence: number;
    reasoning: string;
    fallbackModels: ModelCapabilities[];
    expectedLatency: number;
    expectedQuality: number;
}

export class ModelSelectionService {
    private models: Map<string, ModelCapabilities> = new Map();
    private performanceHistory: Map<string, PerformanceRecord[]> = new Map();

    constructor() {
        this.initializeModelDatabase();
    }

    /**
     * Select the optimal model for a given task
     */
    async selectModel(requirements: TaskRequirements): Promise<ModelSelection> {
        const availableModels = Array.from(this.models.values())
            .filter(model => this.isModelSuitable(model, requirements));

        if (availableModels.length === 0) {
            throw new Error('No suitable models available for the given requirements');
        }

        // Score each model based on requirements
        const scoredModels = availableModels.map(model => ({
            model,
            score: this.calculateModelScore(model, requirements)
        }));

        // Sort by score (highest first)
        scoredModels.sort((a, b) => b.score - a.score);

        const selectedModel = scoredModels[0].model;
        const fallbackModels = scoredModels.slice(1, 4).map(sm => sm.model);

        return {
            selectedModel,
            confidence: this.calculateSelectionConfidence(selectedModel, requirements),
            reasoning: this.generateSelectionReasoning(selectedModel, requirements),
            fallbackModels,
            expectedLatency: this.estimateLatency(selectedModel, requirements),
            expectedQuality: this.estimateQuality(selectedModel, requirements)
        };
    }

    /**
     * Record performance metrics for a model after use
     */
    async recordPerformance(
        modelId: string,
        actualLatency: number,
        qualityScore: number,
        success: boolean,
        errorType?: string
    ): Promise<void> {
        const record: PerformanceRecord = {
            timestamp: new Date(),
            latency: actualLatency,
            qualityScore,
            success,
            errorType
        };

        if (!this.performanceHistory.has(modelId)) {
            this.performanceHistory.set(modelId, []);
        }

        const history = this.performanceHistory.get(modelId)!;
        history.push(record);

        // Keep only last 100 records per model
        if (history.length > 100) {
            history.splice(0, history.length - 100);
        }

        // Update model capabilities based on recent performance
        this.updateModelCapabilities(modelId);
    }

    /**
     * Run background benchmarks to test model performance
     */
    async runBackgroundBenchmarks(): Promise<void> {
        console.log('[ModelSelection] Running background model benchmarks...');

        const testPrompts = this.getTestPrompts();
        const models = Array.from(this.models.values());

        for (const model of models) {
            try {
                await this.benchmarkModel(model, testPrompts);
            } catch (error) {
                console.error(`[ModelSelection] Benchmark failed for ${model.id}:`, error);
            }
        }

        console.log('[ModelSelection] Background benchmarks completed');
    }

    private initializeModelDatabase(): void {
        // Initialize with known Ollama models and estimated capabilities
        // TODO: Replace with actual performance data from testing

        const models: ModelCapabilities[] = [
            {
                id: 'llama3.2',
                name: 'Llama 3.2',
                endpoint: 'llama3.2',
                maxTokens: 4096,
                speedRating: 9,
                qualityRating: 6,
                complexityHandling: 5,
                reliabilityScore: 0.9,
                averageLatency: 500,
                tokensPerSecond: 50,
                memoryUsage: 1500,
                lastTested: new Date()
            },
            {
                id: 'llama3.1:8b',
                name: 'Llama 3.1 8B',
                endpoint: 'llama3.1:8b',
                maxTokens: 8192,
                speedRating: 7,
                qualityRating: 8,
                complexityHandling: 7,
                reliabilityScore: 0.85,
                averageLatency: 800,
                tokensPerSecond: 35,
                memoryUsage: 3000,
                lastTested: new Date()
            },
            {
                id: 'mistral-nemo:12b',
                name: 'Mistral Nemo 12B',
                endpoint: 'mistral-nemo:12b',
                maxTokens: 16384,
                speedRating: 5,
                qualityRating: 9,
                complexityHandling: 9,
                reliabilityScore: 0.8,
                averageLatency: 1200,
                tokensPerSecond: 25,
                memoryUsage: 5000,
                lastTested: new Date()
            },
            {
                id: 'mistral',
                name: 'Mistral 7B',
                endpoint: 'mistral',
                maxTokens: 8192,
                speedRating: 8,
                qualityRating: 7,
                complexityHandling: 6,
                reliabilityScore: 0.88,
                averageLatency: 600,
                tokensPerSecond: 40,
                memoryUsage: 2500,
                lastTested: new Date()
            }
        ];

        models.forEach(model => {
            this.models.set(model.id, model);
        });
    }

    private isModelSuitable(model: ModelCapabilities, requirements: TaskRequirements): boolean {
        // Check if model can handle the complexity
        const complexityScore = {
            'simple': 3,
            'moderate': 6,
            'complex': 8
        }[requirements.complexity];

        if (model.complexityHandling < complexityScore) {
            return false;
        }

        // Check if model can meet latency requirements
        if (model.averageLatency > requirements.maxLatency) {
            return false;
        }

        // Check context size (rough estimate)
        if (requirements.contextSize > model.maxTokens * 0.8) {
            return false;
        }

        return true;
    }

    private calculateModelScore(model: ModelCapabilities, requirements: TaskRequirements): number {
        let score = 0;

        // Quality weight based on quality requirements
        const qualityWeight = {
            'draft': 0.3,
            'standard': 0.5,
            'publication': 0.7,
            'professional': 0.9
        }[requirements.qualityLevel];

        // Speed weight (inverse of quality weight)
        const speedWeight = 1 - qualityWeight;

        // Calculate weighted score
        score += model.qualityRating * qualityWeight * 10;
        score += model.speedRating * speedWeight * 10;
        score += model.complexityHandling * 5; // Always important
        score += model.reliabilityScore * 20; // Reliability is crucial

        // Penalty for high latency if time is important
        if (requirements.maxLatency < 2000) {
            score -= Math.max(0, (model.averageLatency - requirements.maxLatency) / 100);
        }

        return score;
    }

    private calculateSelectionConfidence(model: ModelCapabilities, requirements: TaskRequirements): number {
        // Base confidence on model reliability and suitability
        let confidence = model.reliabilityScore;

        // Adjust based on how well matched the model is to requirements
        const complexityMatch = {
            'simple': model.complexityHandling >= 3 ? 0.1 : -0.2,
            'moderate': model.complexityHandling >= 6 ? 0.1 : -0.1,
            'complex': model.complexityHandling >= 8 ? 0.1 : -0.3
        }[requirements.complexity];

        confidence += complexityMatch;

        // Adjust based on recent performance history
        const history = this.performanceHistory.get(model.id);
        if (history && history.length > 5) {
            const recentSuccess = history.slice(-10).filter(r => r.success).length / Math.min(10, history.length);
            confidence = confidence * 0.7 + recentSuccess * 0.3;
        }

        return Math.max(0.1, Math.min(0.95, confidence));
    }

    private generateSelectionReasoning(model: ModelCapabilities, requirements: TaskRequirements): string {
        const reasons = [];

        if (model.qualityRating >= 8 && requirements.qualityLevel === 'professional') {
            reasons.push('high quality rating for professional requirements');
        }

        if (model.speedRating >= 8 && requirements.maxLatency < 1000) {
            reasons.push('fast response time for low latency requirements');
        }

        if (model.complexityHandling >= 8 && requirements.complexity === 'complex') {
            reasons.push('excellent complexity handling for complex tasks');
        }

        if (model.reliabilityScore >= 0.9) {
            reasons.push('high reliability score');
        }

        return `Selected ${model.name} for ${reasons.join(', ')}`;
    }

    private estimateLatency(model: ModelCapabilities, requirements: TaskRequirements): number {
        // Estimate based on context size and model characteristics
        const baseLatency = model.averageLatency;
        const contextMultiplier = Math.max(1, requirements.contextSize / 1000);

        return Math.round(baseLatency * contextMultiplier);
    }

    private estimateQuality(model: ModelCapabilities, requirements: TaskRequirements): number {
        // Quality estimate based on model capabilities and task requirements
        let quality = model.qualityRating / 10;

        // Adjust based on complexity match
        const complexityMatch = {
            'simple': model.complexityHandling >= 3,
            'moderate': model.complexityHandling >= 6,
            'complex': model.complexityHandling >= 8
        }[requirements.complexity];

        if (!complexityMatch) {
            quality *= 0.7; // Reduce quality estimate if model isn't ideal for complexity
        }

        return Math.max(0.1, Math.min(0.95, quality));
    }

    private updateModelCapabilities(modelId: string): void {
        const model = this.models.get(modelId);
        const history = this.performanceHistory.get(modelId);

        if (!model || !history || history.length < 5) {
            return;
        }

        // Update average latency
        const recentLatencies = history.slice(-20).map(r => r.latency);
        model.averageLatency = recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length;

        // Update reliability score
        const recentSuccesses = history.slice(-50).filter(r => r.success).length;
        model.reliabilityScore = recentSuccesses / Math.min(50, history.length);

        // Update quality rating based on recent scores
        const recentQualityScores = history.slice(-20)
            .filter(r => r.qualityScore > 0)
            .map(r => r.qualityScore);

        if (recentQualityScores.length > 0) {
            const avgQuality = recentQualityScores.reduce((a, b) => a + b, 0) / recentQualityScores.length;
            model.qualityRating = Math.round(avgQuality * 10);
        }

        model.lastTested = new Date();
    }

    private async benchmarkModel(model: ModelCapabilities, testPrompts: TestPrompt[]): Promise<void> {
        // TODO: Implement actual model benchmarking
        console.log(`[ModelSelection] Benchmarking ${model.name}...`);

        // This would involve running test prompts and measuring performance
        // For now, just update last tested time
        model.lastTested = new Date();
    }

    private getTestPrompts(): TestPrompt[] {
        return [
            {
                id: 'simple-greeting',
                prompt: 'Say hello in a friendly way.',
                complexity: 'simple',
                expectedTokens: 20,
                qualityCriteria: ['naturalness', 'brevity']
            },
            {
                id: 'moderate-explanation',
                prompt: 'Explain the concept of artificial intelligence in simple terms.',
                complexity: 'moderate',
                expectedTokens: 100,
                qualityCriteria: ['accuracy', 'clarity', 'completeness']
            },
            {
                id: 'complex-analysis',
                prompt: 'Analyze the philosophical implications of consciousness in artificial intelligence systems.',
                complexity: 'complex',
                expectedTokens: 300,
                qualityCriteria: ['depth', 'reasoning', 'nuance', 'structure']
            }
        ];
    }

    /**
     * Get model information by endpoint
     */
    getModelByEndpoint(endpoint: string): ModelCapabilities | null {
        for (const model of this.models.values()) {
            if (model.endpoint === endpoint) {
                return model;
            }
        }
        return null;
    }

    /**
     * Get all available models
     */
    getAllModels(): ModelCapabilities[] {
        return Array.from(this.models.values());
    }
}

interface PerformanceRecord {
    timestamp: Date;
    latency: number;
    qualityScore: number;
    success: boolean;
    errorType?: string;
}

interface TestPrompt {
    id: string;
    prompt: string;
    complexity: 'simple' | 'moderate' | 'complex';
    expectedTokens: number;
    qualityCriteria: string[];
}
