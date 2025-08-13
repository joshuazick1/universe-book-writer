/**
 * AI Quality Benchmark Types
 * Defines generic benchmark types and scoring rubrics for extensible model evaluation.
 * Updated terminology:
 * - Latency: Server infrastructure response time (model-agnostic)
 * - Cold Performance: Initial model performance including load time
 * - Warmup Tests: Quality benchmarks to prepare the model
 * - Warm Performance: Optimized model performance after warmup
 * @module shared/types/aiQualityBenchmark
 */

export type BenchmarkType =
    | 'task-planning'
    | 'json-assembly'
    | 'creative-writing'
    | 'typescript-quality'
    | 'dialogue-generation'
    | 'fact-extraction'
    | 'summarization'
    | 'content-moderation'
    | 'permissive-content'
    | 'style-transfer'
    | 'advanced-code-generation'
    | 'node-graph-construction'
    | 'long-form-generation'
    | 'protocol-compliance'
    // New book writing specific benchmarks
    | 'character-consistency'      // Maintaining character traits across chapters
    | 'plot-coherence'            // Logical story progression and continuity
    | 'world-building'            // Creating consistent fictional universes
    | 'emotional-depth'           // Character development and emotional resonance
    | 'pacing-rhythm'             // Story tempo and chapter flow
    | 'genre-adherence'           // Following specific genre conventions
    | 'conflict-resolution'       // Building and resolving story tensions
    | 'narrative-voice'           // Consistent narrator perspective
    | 'scene-transitions'         // Smooth chapter/scene connections
    | 'thematic-consistency'      // Maintaining story themes throughout
    // Vibe coding specific benchmarks
    | 'code-style-consistency'    // Maintaining coding style across files
    | 'variable-naming'           // Consistent and meaningful naming
    | 'comment-quality'           // Helpful and accurate code documentation
    | 'error-handling'            // Robust error handling patterns
    | 'performance-awareness'     // Efficient algorithm choices
    | 'security-consciousness'    // Secure coding practices
    | 'maintainability'           // Code that's easy to modify and extend
    // Embedding model specific benchmarks
    | 'embedding-quality'         // Semantic similarity and vector quality
    | 'embedding-speed'           // Embedding generation performance
    | 'vector-similarity'         // Quality of similarity calculations
    | 'embedding-dimensions'      // Vector dimension consistency
    | 'embedding-clustering';     // Quality of semantic clustering

/** Server infrastructure latency (model-agnostic endpoints like /api/tags, /api/version) */
export interface ServerLatencyMetrics {
    /** Average response time for /api/tags (ms) */
    tagsLatency: number;
    /** Average response time for /api/version (ms) */
    versionLatency: number;
    /** Average response time for /api/ps (ms) */
    psLatency: number;
    /** Overall server health score (0-1) */
    healthScore: number;
}

/** Model cold performance metrics (includes model load time) */
export interface ColdPerformanceMetrics {
    /** Time to first token (ms) - includes model loading */
    timeToFirstToken: number;
    /** Tokens per second for cold start */
    tokensPerSecond: number;
    /** Total response time (ms) */
    totalResponseTime: number;
    /** Model loading overhead (ms) */
    loadingOverhead: number;
}

/** Model warm performance metrics (optimized performance) */
export interface WarmPerformanceMetrics {
    /** Time to first token (ms) - optimized */
    timeToFirstToken: number;
    /** Tokens per second for warm model */
    tokensPerSecond: number;
    /** Average response time (ms) */
    averageResponseTime: number;
    /** Performance consistency score (0-1) */
    consistencyScore: number;
}

/** Legacy latency metrics for backward compatibility */
export interface LatencyMetrics {
    /** Cold start latency (ms) */
    cold: number;
    /** Average warm latency (ms) */
    warmAvg: number;
    /** Warmup time (ms) */
    warmup: number;
    /** All warm latencies (ms) */
    warmAll: number[];
}

export interface ThroughputMetrics {
    /** Average throughput (ms/request) */
    average: number;
    /** All request times (ms) */
    all: number[];
}

/** Embedding model performance metrics */
export interface EmbeddingMetrics {
    /** Embedding dimensions */
    dimensions: number;
    /** Embeddings generated per second */
    embeddingsPerSecond: number;
    /** Average semantic similarity score (0-1) */
    semanticSimilarityScore: number;
    /** Vector clustering quality score (0-1) */
    clusteringQualityScore: number;
    /** Vector consistency score (0-1) */
    vectorConsistencyScore: number;
}

export interface QualityBenchmarkScore {
    /** Benchmark type */
    readonly type: BenchmarkType;
    /** Score value (0-1 or rubric-specific) */
    readonly score: number;
    /** Optional rubric details */
    readonly rubric?: string;
    /** ISO timestamp of benchmark */
    readonly timestamp: string;
    /** Optional latency metrics for this benchmark (legacy) */
    readonly latency?: LatencyMetrics;
    /** Optional throughput metrics for this benchmark (legacy) */
    readonly throughput?: ThroughputMetrics;
    /** Cold performance metrics for this benchmark */
    readonly coldPerformance?: ColdPerformanceMetrics;
    /** Warm performance metrics for this benchmark */
    readonly warmPerformance?: WarmPerformanceMetrics;
    /** Embedding metrics for embedding models */
    readonly embeddingMetrics?: EmbeddingMetrics;
}

export interface ModelQualityBenchmarks {
    /** Model identifier */
    readonly modelId: string;
    /** Map of benchmark type to score */
    readonly benchmarks: Readonly<Record<BenchmarkType, QualityBenchmarkScore>>;

    // New metrics structure
    /** Server infrastructure latency per server */
    readonly serverLatencyMetrics?: Readonly<Record<string, ServerLatencyMetrics>>;
    /** Cold performance metrics per server */
    readonly serverColdPerformance?: Readonly<Record<string, ColdPerformanceMetrics>>;
    /** Warm performance metrics per server */
    readonly serverWarmPerformance?: Readonly<Record<string, WarmPerformanceMetrics>>;

    // Legacy metrics for backward compatibility
    /** Latency per server (ms) - legacy, for compatibility */
    readonly serverLatencies: Readonly<Record<string, number>>;
    /** Full latency metrics per server - legacy */
    readonly serverLatencyDetails?: Readonly<Record<string, LatencyMetrics>>;
    /** Throughput metrics per server - legacy */
    readonly serverThroughput?: Readonly<Record<string, ThroughputMetrics>>;
}

/**
 * Example usage:
 * const modelBenchmarks: ModelQualityBenchmarks = {
 *   modelId: 'ollama-mistral',
 *   benchmarks: {
 *     'task-planning': { type: 'task-planning', score: 0.95, timestamp: '2025-07-24T12:00:00Z' },
 *     'json-assembly': { type: 'json-assembly', score: 0.90, timestamp: '2025-07-24T12:00:00Z' },
 *   },
 *   serverLatencies: { 'serverA': 120, 'serverB': 140 }
 * };
 */

export type ModelId = string;

export interface PromptRequest {
    modelId: ModelId;
    prompt: string;
}

export interface PromptResponse {
    modelId: ModelId;
    prompt: string;
    text: string;
    metadata?: Record<string, any>;
}
