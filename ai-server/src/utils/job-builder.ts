/**
 * JobBuilder utility for creating UniversalJob instances
 * Compatible with the new queue system architecture
 */

import {
    UniversalJob,
    JobType,
    JobCategory,
    JobConstraints
} from 'shared/types/universal-job';
import { TaskType, JobPriority, OutputFormat } from 'shared/types/model-selection';

/**
 * Helper for creating jobs with intelligent model selection
 */
export class JobBuilder {
    private job: Partial<UniversalJob>;

    constructor(type: JobType, payload: Record<string, any>) {
        // Extract modelId and serverId from payload if present
        const { modelId, serverId, ...restPayload } = payload;

        this.job = {
            id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            type,
            modelId: modelId || 'default-model', // Set modelId at job level
            payload: restPayload, // Payload without modelId/serverId to avoid duplication
            category: this.inferCategory(type),
            priority: JobPriority.NORMAL,
            dependencies: [],
            metadata: {
                submittedAt: new Date(),
                tags: []
            },
            timeout: {
                executionTimeoutMs: 30000,
                queueTimeoutMs: 60000
            },
            retryPolicy: {
                maxRetries: 3,
                retryDelayMs: 1000,
                exponentialBackoff: true
            },
            constraints: {
                serverAffinity: serverId, // Set server affinity if serverId provided
                canSteal: false,
                stealable: true
            }
        };
    }

    private getMutableJob(): UniversalJob {
        return { ...this.job } as UniversalJob;
    }

    withTaskType(taskType: TaskType): JobBuilder {
        const mutableJob = this.getMutableJob();
        const existingModelRequirements = mutableJob.constraints?.modelRequirements || {};
        const newConstraints = {
            ...mutableJob.constraints,
            modelRequirements: {
                ...existingModelRequirements,
                taskType
            }
        };
        this.job = {
            ...mutableJob,
            constraints: newConstraints
        };
        return this;
    }

    withModel(modelId: string): JobBuilder {
        const mutableJob = this.getMutableJob();
        const newConstraints = {
            ...mutableJob.constraints,
            requiresModel: modelId
        };
        this.job = {
            ...mutableJob,
            modelId,
            constraints: newConstraints
        };
        return this;
    }

    withPreferredModels(models: string[]): JobBuilder {
        const mutableJob = this.getMutableJob();
        const newConstraints = {
            ...mutableJob.constraints,
            preferredModels: [...models]
        };
        this.job = {
            ...mutableJob,
            constraints: newConstraints
        };
        return this;
    }

    withQualityPreference(preferAccuracy: boolean): JobBuilder {
        const mutableJob = this.getMutableJob();
        const newConstraints = {
            ...mutableJob.constraints,
            modelRequirements: {
                ...(mutableJob.constraints?.modelRequirements || {}),
                preferAccuracy,
                preferSpeed: !preferAccuracy,
                taskType: mutableJob.constraints?.modelRequirements?.taskType || TaskType.CONVERSATION
            }
        };
        this.job = {
            ...mutableJob,
            constraints: newConstraints
        };
        return this;
    }

    withPriority(priority: JobPriority): JobBuilder {
        const mutableJob = this.getMutableJob();
        this.job = {
            ...mutableJob,
            priority
        };
        return this;
    }

    withOutputFormat(format: OutputFormat): JobBuilder {
        const mutableJob = this.getMutableJob();
        const newConstraints = {
            ...mutableJob.constraints,
            modelRequirements: {
                ...(mutableJob.constraints?.modelRequirements || {}),
                outputFormat: format,
                taskType: mutableJob.constraints?.modelRequirements?.taskType || TaskType.CONVERSATION
            }
        };
        this.job = {
            ...mutableJob,
            constraints: newConstraints
        };
        return this;
    }

    withDependencies(jobIds: string[]): JobBuilder {
        const mutableJob = this.getMutableJob();
        this.job = {
            ...mutableJob,
            dependencies: [...jobIds]
        };
        return this;
    }

    withConstraints(constraints: Partial<JobConstraints>): JobBuilder {
        const mutableJob = this.getMutableJob();
        const newConstraints = {
            ...mutableJob.constraints,
            ...constraints
        };
        this.job = {
            ...mutableJob,
            constraints: newConstraints
        };
        return this;
    }

    withMetadata(metadata: Record<string, any>): JobBuilder {
        const mutableJob = this.getMutableJob();
        const newMetadata = {
            ...(mutableJob.metadata || {}),
            ...metadata
        };
        this.job = {
            ...mutableJob,
            metadata: newMetadata
        };
        return this;
    }

    build(): UniversalJob {
        const defaults = {
            modelId: 'default-model',
            constraints: {
                canSteal: true,
                stealable: true
            } as JobConstraints
        };

        // Properly merge constraints to preserve serverAffinity
        const mergedConstraints = {
            ...defaults.constraints,
            ...this.job.constraints
        };

        // Merge with job having priority for non-null values
        const mergedJob = {
            ...defaults,
            ...this.job,
            constraints: mergedConstraints
        };

        return mergedJob as UniversalJob;
    }

    private inferCategory(type: JobType): JobCategory {
        switch (type) {
            case JobType.COLD_LATENCY:
            case JobType.WARM_LATENCY:
            case JobType.QUALITY_BENCHMARK:
                return JobCategory.BENCHMARK;

            case JobType.TEXT_CHUNKING:
            case JobType.SUMMARIZATION:
            case JobType.ENTITY_EXTRACTION:
                return JobCategory.RAG_PIPELINE;

            case JobType.EMBEDDING_GENERATION:
            case JobType.VECTOR_SEARCH:
                return JobCategory.EMBEDDING;

            case JobType.SERVER_HEALTH_CHECK:
            case JobType.MODEL_DISCOVERY:
                return JobCategory.HEALTH_CHECK;

            default:
                return JobCategory.INFERENCE;
        }
    }
}
