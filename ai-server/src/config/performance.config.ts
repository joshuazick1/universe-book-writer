/**
 * @fileoverview Performance configuration constants for the benchmark storage architecture.
 * @module ai-server/config/performance
 *
 * Configuration values for performance aggregation, scoring, and load balancing.
 *
 * @example
 * import { PERFORMANCE_CONFIG } from 'ai-server/src/config/performance.config';
 *
 * @edgecase
 * Handles minimum thresholds and aggregation intervals.
 */

export const PERFORMANCE_CONFIG = {
    /**
     * Maximum number of benchmark scores to retain per model-performance node
     */
    SCORE_RETENTION_LIMIT: 20,

    /**
     * Interval between automated aggregations (in milliseconds)
     * Default: 5 minutes
     */
    AGGREGATION_INTERVAL_MS: 300000,

    /**
     * Weight for quality score in combined scoring
     */
    QUALITY_WEIGHT: 0.4,

    /**
     * Weight for performance score in combined scoring
     */
    PERFORMANCE_WEIGHT: 0.4,

    /**
     * Weight for reliability score in combined scoring
     */
    RELIABILITY_WEIGHT: 0.2,

    /**
     * Minimum number of benchmark scores required before aggregation
     */
    MIN_SCORES_FOR_AGGREGATION: 5,

    /**
     * Default health score for new servers
     */
    DEFAULT_HEALTH_SCORE: 100,

    /**
     * Default uptime percentage for new servers
     */
    DEFAULT_UPTIME: 99.9,

    /**
     * Latency threshold (ms) that affects health score
     */
    LATENCY_THRESHOLD_MS: 2000,

    /**
     * Health score penalty for exceeding latency threshold
     */
    LATENCY_PENALTY: 10,

    /**
     * Maximum number of aggregation retries
     */
    MAX_AGGREGATION_RETRIES: 3,

    /**
     * Delay between aggregation retries (ms)
     */
    AGGREGATION_RETRY_DELAY_MS: 5000,

    /**
     * Timeout for aggregation operations (ms)
     */
    AGGREGATION_TIMEOUT_MS: 30000,

    /**
     * Minimum confidence score for model recommendations
     */
    MIN_RECOMMENDATION_CONFIDENCE: 0.7,

    /**
     * Maximum age of performance data for inclusion in aggregations (ms)
     * Default: 24 hours
     */
    MAX_DATA_AGE_MS: 24 * 60 * 60 * 1000,

    /**
     * Default task types for quality assessment
     */
    DEFAULT_TASK_TYPES: ['creative-writing', 'fact-extraction', 'code-generation'] as const,

    /**
     * Performance profile calculation settings
     */
    PERFORMANCE_PROFILE: {
        /**
         * Weight for cold latency in performance calculations
         */
        COLD_LATENCY_WEIGHT: 0.3,

        /**
         * Weight for warm latency in performance calculations
         */
        WARM_LATENCY_WEIGHT: 0.7,

        /**
         * Minimum number of warm latency samples required
         */
        MIN_WARM_SAMPLES: 3,
    },

    /**
     * Load balancer configuration
     */
    LOAD_BALANCER: {
        /**
         * Default server selection strategy
         */
        DEFAULT_STRATEGY: 'weighted-round-robin',

        /**
         * Weight adjustment factor for server performance
         */
        WEIGHT_ADJUSTMENT_FACTOR: 0.1,

        /**
         * Minimum weight for any server
         */
        MIN_SERVER_WEIGHT: 0.1,

        /**
         * Maximum weight for any server
         */
        MAX_SERVER_WEIGHT: 1.0,
    },

    /**
     * AI analytics configuration
     */
    AI_ANALYTICS: {
        /**
         * Minimum data points required for AI analysis
         */
        MIN_DATA_POINTS: 100,

        /**
         * Confidence threshold for AI recommendations
         */
        AI_CONFIDENCE_THRESHOLD: 0.8,

        /**
         * Maximum analysis duration (ms)
         */
        MAX_ANALYSIS_DURATION_MS: 60000,
    },
} as const;

/**
 * Type definitions for configuration values
 */
export type PerformanceConfigKey = keyof typeof PERFORMANCE_CONFIG;
export type TaskType = typeof PERFORMANCE_CONFIG.DEFAULT_TASK_TYPES[number];

/**
 * Validation function for performance configuration
 */
export function validatePerformanceConfig(): boolean {
    const totalWeight = PERFORMANCE_CONFIG.QUALITY_WEIGHT +
        PERFORMANCE_CONFIG.PERFORMANCE_WEIGHT +
        PERFORMANCE_CONFIG.RELIABILITY_WEIGHT;

    if (Math.abs(totalWeight - 1.0) > 0.001) {
        throw new Error(`Performance weights must sum to 1.0, got ${totalWeight}`);
    }

    if (PERFORMANCE_CONFIG.SCORE_RETENTION_LIMIT < 1) {
        throw new Error('Score retention limit must be at least 1');
    }

    if (PERFORMANCE_CONFIG.MIN_SCORES_FOR_AGGREGATION < 1) {
        throw new Error('Minimum scores for aggregation must be at least 1');
    }

    return true;
}

/**
 * Get configuration value with type safety
 */
export function getPerformanceConfig<K extends PerformanceConfigKey>(key: K): typeof PERFORMANCE_CONFIG[K] {
    return PERFORMANCE_CONFIG[key];
}

/**
 * Configuration for different environments
 */
export const ENV_CONFIGS = {
    development: {
        ...PERFORMANCE_CONFIG,
        AGGREGATION_INTERVAL_MS: 60000, // 1 minute for faster development cycles
        MIN_SCORES_FOR_AGGREGATION: 2,  // Lower threshold for testing
    },

    testing: {
        ...PERFORMANCE_CONFIG,
        AGGREGATION_INTERVAL_MS: 10000, // 10 seconds for rapid testing
        MIN_SCORES_FOR_AGGREGATION: 1,  // Single score for testing
        AGGREGATION_TIMEOUT_MS: 5000,   // Shorter timeout for tests
    },

    production: PERFORMANCE_CONFIG,
} as const;

/**
 * Get environment-specific configuration
 */
export function getEnvConfig(env: keyof typeof ENV_CONFIGS = 'production') {
    return ENV_CONFIGS[env];
}
