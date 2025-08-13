/**
 * Scheduler Configuration
 * 
 * Configuration settings for the automatic benchmark scheduler.
 * Defines scheduling intervals, priority thresholds, resource limits,
 * and environment-specific scheduler settings.
 */

import {
    SchedulerConfig,
    BenchmarkStalenessConfig,
    SchedulingPolicy,
    SchedulerPriority
} from '../types/scheduler.types.js';

/**
 * Default staleness configuration
 * Performance/latency: 1-6 hours, Quality: 7-30 days
 */
const DEFAULT_STALENESS_CONFIG: BenchmarkStalenessConfig = {
    // Performance and latency benchmarks need frequent updates
    performanceMaxAge: 6,    // hours - cold/warm performance
    latencyMaxAge: 3,        // hours - server latency

    // Quality benchmarks are more stable
    qualityMaxAge: 7,        // days - creative writing, character consistency
    extendedMaxAge: 30,      // days - world building, emotional depth

    // Health checks need regular updates
    healthCheckMaxAge: 2,    // hours - server health status

    // Urgency thresholds for immediate refresh
    urgencyThresholds: {
        performance: 1, // hours
        latency: 2,     // hours
        quality: 3,     // days
        extended: 7,    // days
        healthCheck: 1  // hours
    }
};

/**
 * Default scheduler configuration
 */
const DEFAULT_CONFIG: SchedulerConfig = {
    enabled: process.env.SCHEDULER_ENABLED !== 'false',
    maxConcurrentJobs: parseInt(process.env.SCHEDULER_MAX_CONCURRENT_JOBS || '5'),
    defaultRetries: parseInt(process.env.SCHEDULER_DEFAULT_RETRIES || '3'),
    batchSize: parseInt(process.env.SCHEDULER_BATCH_SIZE || '10'),

    // Check intervals
    missingBenchmarkCheckInterval: parseInt(process.env.SCHEDULER_MISSING_CHECK_INTERVAL || '30'), // 30 minutes
    stalenessCheckInterval: parseInt(process.env.SCHEDULER_STALENESS_CHECK_INTERVAL || '2'),       // 2 hours
    healthCheckInterval: parseInt(process.env.SCHEDULER_HEALTH_CHECK_INTERVAL || '1'),             // 1 hour

    // Staleness thresholds
    staleness: {
        performanceMaxAge: parseInt(process.env.SCHEDULER_PERFORMANCE_MAX_AGE || '6'),
        latencyMaxAge: parseInt(process.env.SCHEDULER_LATENCY_MAX_AGE || '3'),
        qualityMaxAge: parseInt(process.env.SCHEDULER_QUALITY_MAX_AGE || '7'),
        extendedMaxAge: parseInt(process.env.SCHEDULER_EXTENDED_MAX_AGE || '30'),
        healthCheckMaxAge: parseInt(process.env.SCHEDULER_HEALTH_MAX_AGE || '2'),

        // Urgency thresholds for immediate refresh
        urgencyThresholds: {
            performance: 1, // hours
            latency: 2,     // hours
            quality: 3,     // days
            extended: 7,    // days
            healthCheck: 1  // hours
        }
    },

    // Rate limiting
    maxJobsPerHour: parseInt(process.env.SCHEDULER_MAX_JOBS_PER_HOUR || '50'),
    maxJobsPerDay: parseInt(process.env.SCHEDULER_MAX_JOBS_PER_DAY || '500'),

    // Priority weights (must sum to 1.0)
    priorityWeights: {
        modelUsage: parseFloat(process.env.SCHEDULER_WEIGHT_MODEL_USAGE || '0.4'),
        benchmarkAge: parseFloat(process.env.SCHEDULER_WEIGHT_BENCHMARK_AGE || '0.3'),
        serverHealth: parseFloat(process.env.SCHEDULER_WEIGHT_SERVER_HEALTH || '0.2'),
        businessImpact: parseFloat(process.env.SCHEDULER_WEIGHT_BUSINESS_IMPACT || '0.1')
    },

    // Policies
    defaultPolicy: (process.env.SCHEDULER_DEFAULT_POLICY as SchedulingPolicy) || SchedulingPolicy.COMPREHENSIVE,
    allowRefreshJobs: process.env.SCHEDULER_ALLOW_REFRESH !== 'false',

    // Resource limits
    resourceLimits: {
        maxMemoryUsage: parseInt(process.env.SCHEDULER_MAX_MEMORY_MB || '1024'),      // 1GB
        maxCpuUsage: parseInt(process.env.SCHEDULER_MAX_CPU_PERCENT || '80'),         // 80%
        diskSpaceThreshold: parseInt(process.env.SCHEDULER_MIN_DISK_SPACE_MB || '5120') // 5GB
    }
};

/**
 * Environment-specific configurations
 */
const ENVIRONMENT_CONFIGS = {
    development: {
        ...DEFAULT_CONFIG,
        maxConcurrentJobs: 2,
        batchSize: 5,
        missingBenchmarkCheckInterval: 60, // 1 hour in dev
        maxJobsPerHour: 20,
        maxJobsPerDay: 100
    },

    testing: {
        ...DEFAULT_CONFIG,
        enabled: false, // Disabled in tests by default
        maxConcurrentJobs: 1,
        batchSize: 3,
        missingBenchmarkCheckInterval: 120, // 2 hours in testing
        maxJobsPerHour: 10,
        maxJobsPerDay: 50,
        staleness: {
            ...DEFAULT_STALENESS_CONFIG,
            performanceMaxAge: 24,  // 24 hours in testing
            qualityMaxAge: 14       // 14 days in testing
        }
    },

    production: {
        ...DEFAULT_CONFIG,
        maxConcurrentJobs: 10,
        batchSize: 20,
        missingBenchmarkCheckInterval: 15, // 15 minutes in production
        maxJobsPerHour: 100,
        maxJobsPerDay: 1000
    }
};

/**
 * Priority mappings for different benchmark types
 */
export const BENCHMARK_PRIORITY_MAP = {
    // Critical - basic performance and quality
    'task-planning': SchedulerPriority.CRITICAL,
    'json-assembly': SchedulerPriority.CRITICAL,

    // High - essential quality benchmarks
    'creative-writing': SchedulerPriority.HIGH,
    'character-consistency': SchedulerPriority.HIGH,
    'dialogue-generation': SchedulerPriority.HIGH,
    'typescript-quality': SchedulerPriority.HIGH,

    // Medium - standard benchmarks
    'plot-coherence': SchedulerPriority.MEDIUM,
    'fact-extraction': SchedulerPriority.MEDIUM,
    'summarization': SchedulerPriority.MEDIUM,

    // Low - extended benchmarks
    'world-building': SchedulerPriority.LOW,
    'emotional-depth': SchedulerPriority.LOW,
    'style-transfer': SchedulerPriority.LOW,
    'long-form-generation': SchedulerPriority.LOW,
    'advanced-code-generation': SchedulerPriority.LOW,
    'content-moderation': SchedulerPriority.LOW
};

/**
 * Get scheduler configuration for the current environment
 */
export function getSchedulerConfig(): SchedulerConfig {
    const env = process.env.NODE_ENV || 'development';
    const config = ENVIRONMENT_CONFIGS[env as keyof typeof ENVIRONMENT_CONFIGS] || DEFAULT_CONFIG;

    // Validate priority weights sum to 1.0
    const totalWeight = Object.values(config.priorityWeights).reduce((sum, weight) => sum + weight, 0);
    if (Math.abs(totalWeight - 1.0) > 0.01) {
        console.warn(`[SchedulerConfig] Priority weights sum to ${totalWeight}, should be 1.0. Using defaults.`);
        config.priorityWeights = DEFAULT_CONFIG.priorityWeights;
    }

    return config;
}

/**
 * Get staleness configuration
 */
export function getStalenessConfig(): BenchmarkStalenessConfig {
    return getSchedulerConfig().staleness;
}

/**
 * Check if benchmark type is considered stale
 */
export function isBenchmarkStale(
    benchmarkType: string,
    lastTested: Date | string,
    config?: BenchmarkStalenessConfig
): boolean {
    const stalenessConfig = config || getStalenessConfig();
    const testDate = typeof lastTested === 'string' ? new Date(lastTested) : lastTested;
    const now = new Date();
    const ageHours = (now.getTime() - testDate.getTime()) / (1000 * 60 * 60);
    const ageDays = ageHours / 24;

    // Performance and quality benchmarks (treat as performance for faster refresh)
    if (['typescript-quality', 'advanced-code-generation', 'task-planning'].includes(benchmarkType)) {
        return ageHours > stalenessConfig.performanceMaxAge;
    }

    // Core quality benchmarks 
    if (['creative-writing', 'character-consistency', 'dialogue-generation',
        'plot-coherence', 'json-assembly'].includes(benchmarkType)) {
        return ageDays > stalenessConfig.qualityMaxAge;
    }

    // Extended benchmarks
    return ageDays > stalenessConfig.extendedMaxAge;
}

/**
 * Get recommended scheduling frequency for a benchmark type
 */
export function getRecommendedFrequency(benchmarkType: string): 'hourly' | 'daily' | 'weekly' | 'monthly' {
    // Performance and task planning - frequent updates
    if (['typescript-quality', 'advanced-code-generation', 'task-planning'].includes(benchmarkType)) {
        return 'hourly';
    }

    // Essential quality benchmarks - daily updates
    if (['creative-writing', 'character-consistency', 'dialogue-generation', 'json-assembly'].includes(benchmarkType)) {
        return 'daily';
    }

    // Standard quality benchmarks - weekly updates
    if (['plot-coherence', 'fact-extraction', 'summarization'].includes(benchmarkType)) {
        return 'weekly';
    }

    // Extended benchmarks - monthly updates
    return 'monthly';
}

/**
 * Development and testing helper functions
 */
export const SchedulerConfigHelpers = {
    /**
     * Create a minimal config for testing
     */
    createTestConfig(overrides: Partial<SchedulerConfig> = {}): SchedulerConfig {
        return {
            ...ENVIRONMENT_CONFIGS.testing,
            ...overrides
        };
    },

    /**
     * Validate configuration
     */
    validateConfig(config: SchedulerConfig): { valid: boolean; errors: string[] } {
        const errors: string[] = [];

        if (config.maxConcurrentJobs < 1) {
            errors.push('maxConcurrentJobs must be at least 1');
        }

        if (config.batchSize < 1) {
            errors.push('batchSize must be at least 1');
        }

        const totalWeight = Object.values(config.priorityWeights).reduce((sum, weight) => sum + weight, 0);
        if (Math.abs(totalWeight - 1.0) > 0.01) {
            errors.push(`Priority weights must sum to 1.0, got ${totalWeight}`);
        }

        if (config.maxJobsPerHour < 1) {
            errors.push('maxJobsPerHour must be at least 1');
        }

        return { valid: errors.length === 0, errors };
    }
};
