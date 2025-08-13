/**
 * Scheduler Type Definitions
 * 
 * TypeScript interfaces and types for scheduler components.
 * Defines job scheduling structures, priority enums, configuration, and status types.
 */

import { BenchmarkType } from '../../../shared/types/aiQualityBenchmark.js';
import { JobType } from '../../../shared/types/universal-job.js';
import { NodeType } from '../../../shared/types/nodeTypes.js';

/**
 * Priority levels for benchmark scheduling
 */
export enum SchedulerPriority {
    CRITICAL = 'critical',  // Missing essential benchmarks for active models
    HIGH = 'high',         // Missing performance/latency data
    MEDIUM = 'medium',     // Missing quality benchmarks
    LOW = 'low'           // Missing extended benchmarks
}

/**
 * Scheduling frequency options
 */
export enum ScheduleFrequency {
    IMMEDIATE = 'immediate',
    HOURLY = 'hourly',
    DAILY = 'daily',
    WEEKLY = 'weekly',
    MONTHLY = 'monthly'
}

/**
 * Types of automated scheduling policies
 */
export enum SchedulingPolicy {
    MISSING_ONLY = 'missing_only',        // Only schedule missing benchmarks
    REFRESH_STALE = 'refresh_stale',      // Re-test stale benchmarks
    COMPREHENSIVE = 'comprehensive',      // Both missing and stale
    USAGE_BASED = 'usage_based'          // Priority based on model usage
}

/**
 * Benchmark staleness configuration
 */
export interface BenchmarkStalenessConfig {
    // Performance/latency metrics refresh frequently
    performanceMaxAge: number;  // hours
    latencyMaxAge: number;      // hours

    // Quality metrics refresh less frequently
    qualityMaxAge: number;      // days
    extendedMaxAge: number;     // days

    // Health check frequency
    healthCheckMaxAge: number;  // hours

    // Add urgency thresholds for benchmarks
    urgencyThresholds: Record<string, number>;
}

/**
 * Scheduled job definition
 */
export interface ScheduledJob {
    id: string;
    serverId: string;
    modelId: string;
    benchmarkTypes: BenchmarkType[];
    jobType: JobType;
    priority: SchedulerPriority;
    scheduledAt: Date;
    executedAt?: Date;
    completedAt?: Date;
    status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'cancelled';
    retryCount: number;
    maxRetries: number;
    errorMessage?: string;
    metadata?: Record<string, any>;
}

/**
 * Scheduler configuration
 */
export interface SchedulerConfig {
    enabled: boolean;
    maxConcurrentJobs: number;
    defaultRetries: number;
    batchSize: number;

    // Scheduling intervals
    missingBenchmarkCheckInterval: number;  // minutes
    stalenessCheckInterval: number;         // hours
    healthCheckInterval: number;            // hours

    // Staleness thresholds
    staleness: BenchmarkStalenessConfig;

    // Rate limiting
    maxJobsPerHour: number;
    maxJobsPerDay: number;

    // Priority weights
    priorityWeights: {
        modelUsage: number;      // 0-1, weight of model usage frequency
        benchmarkAge: number;    // 0-1, weight of benchmark staleness
        serverHealth: number;    // 0-1, weight of server availability
        businessImpact: number;  // 0-1, weight of business criticality
    };

    // Scheduling policies
    defaultPolicy: SchedulingPolicy;
    allowRefreshJobs: boolean;

    // Resource management
    resourceLimits: {
        maxMemoryUsage: number;  // MB
        maxCpuUsage: number;     // percentage
        diskSpaceThreshold: number;  // MB
    };
}

/**
 * Scheduler status and statistics
 */
export interface SchedulerStatus {
    enabled: boolean;
    isRunning: boolean;
    lastCheckAt?: Date;
    nextCheckAt?: Date;

    // Job statistics
    totalJobsScheduled: number;
    totalJobsCompleted: number;
    totalJobsFailed: number;
    activeJobs: number;
    queuedJobs: number;

    // Performance metrics
    averageJobDuration: number;  // milliseconds
    successRate: number;         // percentage

    // Current workload
    currentBatchSize: number;
    estimatedCompletionTime?: Date;

    // Resource usage
    memoryUsage: number;         // MB
    cpuUsage: number;           // percentage
    diskSpaceUsed: number;      // MB
}

/**
 * Gap analysis result
 */
export interface BenchmarkGap {
    serverId: string;
    modelId: string;
    nodeId: string;
    missingBenchmarks: BenchmarkType[];
    staleBenchmarks: BenchmarkType[];
    lastTested?: Date;
    priority: SchedulerPriority;
    estimatedDuration: number;  // minutes
    schedulingRecommendation: {
        frequency: ScheduleFrequency;
        nextScheduleTime: Date;
        reason: string;
    };
}

/**
 * Batch scheduling request
 */
export interface BatchScheduleRequest {
    gaps: BenchmarkGap[];
    policy: SchedulingPolicy;
    maxJobs?: number;
    priorityFilter?: SchedulerPriority[];
    serverFilter?: string[];
    modelFilter?: string[];
}

/**
 * Batch scheduling result
 */
export interface BatchScheduleResult {
    totalGaps: number;
    jobsScheduled: number;
    jobsSkipped: number;
    estimatedCompletionTime: Date;
    scheduledJobs: ScheduledJob[];
    skippedReasons: {
        rateLimited: number;
        resourceLimited: number;
        alreadyScheduled: number;
        serverUnavailable: number;
        other: number;
    };
}

/**
 * Scheduler event types for monitoring
 */
export enum SchedulerEventType {
    JOB_SCHEDULED = 'job_scheduled',
    JOB_STARTED = 'job_started',
    JOB_COMPLETED = 'job_completed',
    JOB_FAILED = 'job_failed',
    JOB_CANCELLED = 'job_cancelled',
    BATCH_STARTED = 'batch_started',
    BATCH_COMPLETED = 'batch_completed',
    SCHEDULER_STARTED = 'scheduler_started',
    SCHEDULER_STOPPED = 'scheduler_stopped',
    ERROR_OCCURRED = 'error_occurred',
    RESOURCE_LIMIT_REACHED = 'resource_limit_reached'
}

/**
 * Scheduler event for monitoring and logging
 */
export interface SchedulerEvent {
    type: SchedulerEventType;
    timestamp: Date;
    jobId?: string;
    batchId?: string;
    serverId?: string;
    modelId?: string;
    details: Record<string, any>;
    duration?: number;  // milliseconds
    errorMessage?: string;
}

/**
 * Historical performance data for a model-server combination
 */
export interface BenchmarkHistory {
    serverId: string;
    modelId: string;
    benchmarkType: BenchmarkType;
    testHistory: {
        timestamp: Date;
        score: number;
        duration: number;
        jobId: string;
    }[];
    averageScore: number;
    scoreVariance: number;
    averageDuration: number;
    lastTested: Date;
    testCount: number;
    stalenessLevel: 'fresh' | 'aging' | 'stale' | 'critical';
}

/**
 * Re-testing recommendation
 */
export interface RetestRecommendation {
    serverId: string;
    modelId: string;
    benchmarkType: BenchmarkType;
    currentAge: number;  // days or hours
    maxAge: number;
    urgency: 'low' | 'medium' | 'high' | 'critical';
    recommendation: 'schedule_now' | 'schedule_soon' | 'schedule_routine' | 'no_action';
    nextTestDate: Date;
    reason: string;
    historicalPerformance?: BenchmarkHistory;
}

/**
 * Node type definition
 */
export interface Node {
    id: string;
    type: NodeType;
    benchmarks?: BenchmarkType[];  // Optional benchmarks property
    modelId?: string;              // Optional model ID
    serverId?: string;             // Optional server ID
}
