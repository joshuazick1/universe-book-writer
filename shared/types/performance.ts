/**
 * @fileoverview Shared type definitions for Performance entities.
 * @module shared/types/performance
 *
 * Defines interfaces and types for model and server performance metrics.
 *
 * @example
 * import { PerformanceMetrics } from 'shared/types/performance';
 *
 * @edgecase
 * Handles missing metrics and plugin-specific extensions.
 */

export interface PerformanceMetrics {
    readonly serverId: string;
    readonly modelId: string;
    readonly latencyMs: number;
    readonly throughput: number;
    readonly timestamp: string;
    readonly metadata?: Record<string, unknown>;
}

export interface QualityBreakdown {
    [taskType: string]: {
        avg: number;
        min: number;
        max: number;
        servers: number;
    };
}

export interface PerformanceProfile {
    avgColdLatency: number;
    avgWarmLatency: number;
    bestServer?: string;
    worstServer?: string;
}

export interface LoadBalancerWeights {
    qualityWeight: number;
    performanceWeight: number;
    reliabilityWeight: number;
    combinedScore: number;
}

export interface ServerHealth {
    endpointLatency: number;
    healthScore: number;
    uptime: number;
}

export interface ServerPerformanceProfile {
    avgColdLatency: number;
    avgWarmLatency: number;
    bestModel?: string;
    worstModel?: string;
    modelsServed: number;
}

export type TaskType = 'creative-writing' | 'fact-extraction' | 'code-generation';

export interface TaskRequirements {
    taskType: TaskType;
    minQualityScore?: number;
    maxLatency?: number;
    minTokensPerSecond?: number;
    preferredModels?: string[];
    excludeModels?: string[];
}

export interface ModelSelection {
    modelId: string;
    serverId: string;
    confidence: number;
    estimatedQuality: number;
    estimatedLatency: number;
    reasoning: string[];
}

export interface ServerRequirements {
    minHealthScore?: number;
    maxLatency?: number;
    preferredModels?: string[];
}

export interface ServerSelection {
    serverId: string;
    confidence: number;
    reasoning: string[];
}

export interface ModelRanking {
    modelId: string;
    score: number;
    rank: number;
}

export interface ModelPerformanceNode {
    type: 'model-performance';
    title: string;
    metadata: Record<string, any>;
    qualityResults: {
        [taskType: string]: {
            score: number;
        };
    };
    coldLatency: number;
    warmLatencies: number[];
    serverId: string;
}

export interface AiModelNode {
    type: 'ai-model';
    title: string;
    metadata: {
        modelId: string;
        lastAggregated: string;
        serverCount: number;
    };
    avgQualityScore: number;
    qualityBreakdown: QualityBreakdown;
    performanceProfile: PerformanceProfile;
    loadBalancerWeights: LoadBalancerWeights;
    aggregatedScores?: QualityBreakdown;
}

export interface AiServerNode {
    type: 'ai-server';
    title: string;
    metadata: {
        serverId: string;
        lastHealthCheck: string;
        modelCount: number;
    };
    serverHealth: ServerHealth;
    performanceProfile: ServerPerformanceProfile;
    aggregatedScores?: QualityBreakdown;
}

export type Node = ModelPerformanceNode | AiModelNode | AiServerNode;
