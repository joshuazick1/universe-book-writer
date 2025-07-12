/**
 * Types/interfaces for orchestrator state, worker info, job tracking, etc.
 * @module core/types/orchestrator
 * @see docs/RAG_Distributed_Queue_Implementation_Plan.md
 */

import type { Job, JobResult } from './queue.js';

/**
 * Worker health and registration info
 */
/**
 * Worker health and registration info
 * @property id - Unique worker ID
 * @property name - Human-readable name
 * @property lastHeartbeat - Last heartbeat ISO timestamp
 * @property status - Health status
 * @property avgResponseTimeMs - Rolling average response time (ms)
 * @property activeJobId - Currently assigned job (if any)
 * @property capabilities - Supported job types
 * @property lastResponseAt - Last time worker completed a job (ISO)
 * @property jobsCompleted - Total jobs completed
 * @property jobsFailed - Total jobs failed
 * @property jobsRetried - Total jobs retried
 * @property meta - Optional extra metadata
 */
export interface WorkerInfo {
    readonly id: string;
    readonly name: string;
    readonly lastHeartbeat: string; // ISO timestamp
    readonly status: 'healthy' | 'unresponsive' | 'offline';
    readonly avgResponseTimeMs: number;
    readonly activeJobId?: string;
    readonly capabilities: readonly string[];
    readonly lastResponseAt?: string;
    readonly jobsCompleted?: number;
    readonly jobsFailed?: number;
    readonly jobsRetried?: number;
    readonly meta?: Record<string, unknown>;
}

/**
 * Job tracking state
 */
/**
 * Job tracking state
 * @property job - The job definition
 * @property status - Current job status
 * @property assignedWorkerId - Worker currently assigned
 * @property startedAt - When job was started (ISO)
 * @property completedAt - When job was completed (ISO)
 * @property attempts - Number of assignment attempts
 * @property results - All results received (first is accepted)
 * @property error - Error message if failed
 * @property assignmentHistory - List of worker assignments and times
 */
export interface JobTracking {
    readonly job: Job;
    readonly status: 'pending' | 'in-flight' | 'completed' | 'failed' | 'reassigned';
    readonly assignedWorkerId?: string;
    readonly startedAt?: string;
    readonly completedAt?: string;
    readonly attempts: number;
    readonly results: readonly JobResult[];
    readonly error?: string;
    readonly assignmentHistory?: readonly {
        workerId: string;
        assignedAt: string;
        status: 'assigned' | 'reassigned' | 'completed' | 'failed';
    }[];
}

/**
 * Orchestrator state
 */
/**
 * Orchestrator state for monitoring and API
 * @property workers - All registered workers
 * @property jobs - All tracked jobs
 * @property queueLength - Number of pending jobs
 * @property lastUpdated - ISO timestamp
 * @property healthyWorkers - Workers currently healthy
 * @property unhealthyWorkers - Workers currently unresponsive/offline
 */
export interface OrchestratorState {
    readonly workers: readonly WorkerInfo[];
    readonly jobs: readonly JobTracking[];
    readonly queueLength: number;
    readonly lastUpdated: string;
    readonly healthyWorkers?: readonly WorkerInfo[];
    readonly unhealthyWorkers?: readonly WorkerInfo[];
}
