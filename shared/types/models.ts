/**
 * ServerModelBenchmark - Canonical type for model/server performance analytics
 * Used for analytics, scoring, and categorization in PerformanceAnalytics
 */
export interface ServerModelBenchmark {
    serverId: string;
    modelName: string;
    latencyMs: number;
    throughput: number;
    lastTested: number;
    modelLoadTimeMs?: number;
    averageLatency?: number;
    stabilityScore?: number;
    qualityScore?: number;
}
/**
 * Enhanced Model Selection Types (for DRY refactor)
 * @module shared/types/models
 */
export interface ModelSelectionCriteria {
    taskType: 'chat' | 'writing' | 'character-generation' | 'world-building' | 'analysis' | 'editing' | 'json-generation' | 'rag-processing';
    complexityLevel: 'trivial' | 'simple' | 'moderate' | 'complex' | 'expert';
    qualityRequirement: 'draft' | 'standard' | 'publication' | 'professional';
    maxLatencyMs?: number;
    prioritizeQuality: boolean;
    prioritizeSpeed: boolean;
    userTier?: 'free' | 'premium' | 'enterprise';
}

export interface ModelSelectionResult {
    selectedModel: string;
    confidence: number; // 0-1
    reasoning: string;
    alternatives: Array<{
        model: string;
        score: number;
        tradeoff: string;
    }>;
    estimatedLatencyMs: number;
    estimatedQualityScore: number;
    serverInfo: {
        isSlowServer: boolean;
        latencyMs: number;
        load: number;
    };
}

export interface ModelCapability {
    modelEndpoint: string;
    strengths: string[];
    weaknesses: string[];
    optimalUseCases: string[];
    resourceRequirements: 'low' | 'medium' | 'high';
    reliabilityScore: number; // 0-1
}
/**
 * ModelRecommendation
 * Metadata for a model recommendation in the RAG pipeline UI.
 * @module shared/types/models
 */
export interface ModelRecommendation {
    readonly name: string;
    readonly friendlyName?: string;
    readonly quality?: string; // e.g. "High", "Medium", "Low"
    readonly isRecommended?: boolean;
    readonly description?: string;
}

export type ModelId = string;

import type { LatencyMetrics, ThroughputMetrics } from './aiQualityBenchmark.js';

export interface ModelQualityReport {
    readonly modelId: ModelId;
    readonly accuracy: number;
    /**
     * Latency metrics (cold, warm, warmup, all warm times)
     */
    readonly latency: LatencyMetrics;
    /**
     * Throughput metrics (average, all times)
     */
    readonly throughput: ThroughputMetrics;
    readonly lastBenchmarked: string;
}

export interface ModelMetadata {
    readonly id: ModelId;
    readonly name: string;
    readonly description?: string;
    readonly tags?: string[];
    readonly quality?: string;
    readonly isRecommended?: boolean;
}
