/**
 * Types and interfaces for intelligent model selection
 */

// Task types for intelligent model selection
export enum TaskType {
    CREATIVE_WRITING = 'creative-writing',
    TECHNICAL_WRITING = 'technical-writing',
    CODE_GENERATION = 'code-generation',
    CODE_REVIEW = 'code-review',
    DATA_ANALYSIS = 'data-analysis',
    QUESTION_ANSWERING = 'question-answering',
    SUMMARIZATION = 'summarization',
    TRANSLATION = 'translation',
    CONVERSATION = 'conversation',
    REAL_TIME_CONVERSATION = 'real-time-conversation',
    FUNCTION_CALLING = 'function-calling',
    JSON_GENERATION = 'json-generation',
    EMBEDDING_GENERATION = 'embedding-generation',
    CLASSIFICATION = 'classification',
    SENTIMENT_ANALYSIS = 'sentiment-analysis',
    ENTITY_EXTRACTION = 'entity-extraction',
    SYSTEM_MONITORING = 'system-monitoring'
}

// Output format requirements
export enum OutputFormat {
    PLAIN_TEXT = 'plain-text',
    MARKDOWN = 'markdown',
    JSON = 'json',
    XML = 'xml',
    CODE = 'code',
    STRUCTURED_DATA = 'structured-data'
}

// Job priority levels
export enum JobPriority {
    LOW = 'low',
    NORMAL = 'normal',
    HIGH = 'high',
    CRITICAL = 'critical'
}

// Model requirements for intelligent selection
export interface ModelRequirements {
    readonly taskType: TaskType;
    readonly minQualityScore?: number;
    readonly maxLatencyMs?: number;
    readonly preferAccuracy?: boolean;
    readonly preferSpeed?: boolean;
    readonly contextLength?: number;
    readonly outputFormat?: OutputFormat;
    readonly specialFeatures?: string[];
}

// Model information with capabilities
export interface ModelInfo {
    readonly id: string;
    readonly name: string;
    readonly contextLength: number;
    readonly supportedFormats?: OutputFormat[];
    readonly capabilities?: string[];
    readonly memoryRequirementMB: number;
    readonly parameterCount?: number;
}

// Benchmark data for model performance
export interface ModelBenchmarks {
    readonly modelId: string;
    readonly taskType: TaskType;
    readonly qualityScore?: number;
    readonly avgLatencyMs?: number;
    readonly tokensPerSecond?: number;
    readonly memoryUsageMB?: number;
    readonly energyEfficiency?: number;
    readonly successRate?: number;
    readonly lastUpdated: Date;
}

// Model scoring weights for different criteria
export interface ModelScoringWeights {
    readonly quality: number;
    readonly speed: number;
}

// Task type metrics and rankings
export interface TaskTypeMetrics {
    readonly taskType: TaskType;
    readonly averageLatency: number;
    readonly averageQuality: number;
    readonly topPerformingModels: string[];
    readonly benchmarkCount: number;
}

export interface ModelRanking {
    readonly modelId: string;
    readonly rank: number;
    readonly score: number;
    readonly benchmarkData: ModelBenchmarks;
}

// Server scoring weights for load balancer
export interface ServerScoringWeights {
    readonly health: number;
    readonly load: number;
    readonly latency: number;
    readonly errorRate: number;
    readonly gpu: number;
    readonly memory: number;
    readonly queueDepth: number;
    readonly model: number;
    readonly proximity: number;
    readonly history: number;
    readonly specialization: number;
}
