/**
 * Ollama Job Executor - Handles Ollama API proxy jobs
 */

import { JobType, UniversalJob } from 'shared/types/universal-job';
import { ServerId } from 'shared/types/server';
import { JobExecutor } from '../universal-worker.service.js';
import { JobExecutionResult } from '../universal-queue.service.js';
import { logger } from '../../../../shared/logging/logger.js';

export class OllamaJobExecutor implements JobExecutor {
    public readonly supportedJobTypes: JobType[] = [
        JobType.OLLAMA_GENERATE,
        JobType.OLLAMA_CHAT,
        JobType.OLLAMA_EMBEDDINGS,
        JobType.OLLAMA_PULL,
        JobType.OLLAMA_PUSH,
        JobType.OLLAMA_CREATE,
        JobType.OLLAMA_DELETE,
        JobType.OLLAMA_COPY,
        JobType.OLLAMA_SHOW,
        JobType.OLLAMA_TAGS,
        JobType.OLLAMA_PS
    ];

    public async executeJob(job: UniversalJob, serverId: ServerId): Promise<JobExecutionResult> {
        const startTime = Date.now();
        logger.info(`[OllamaExecutor] Executing ${job.type} job ${job.id} on server ${serverId}`);

        try {
            let result: any;

            switch (job.type) {
                case JobType.OLLAMA_GENERATE:
                    result = await this.executeOllamaGenerate(job, serverId);
                    break;

                case JobType.OLLAMA_CHAT:
                    result = await this.executeOllamaChat(job, serverId);
                    break;

                case JobType.OLLAMA_EMBEDDINGS:
                    result = await this.executeOllamaEmbeddings(job, serverId);
                    break;

                case JobType.OLLAMA_TAGS:
                    result = await this.executeOllamaTags(job, serverId);
                    break;

                case JobType.OLLAMA_PS:
                    result = await this.executeOllamaPS(job, serverId);
                    break;

                // Add other cases as needed
                default:
                    result = await this.executeGenericOllamaCall(job, serverId);
            }

            const executionTime = Date.now() - startTime;
            return {
                jobId: job.id,
                success: true,
                result,
                executionTimeMs: executionTime,
                serverId
            };

        } catch (error) {
            const executionTime = Date.now() - startTime;
            const errorMessage = error instanceof Error ? error.message : 'Unknown Ollama error';

            logger.error(`[OllamaExecutor] Ollama job ${job.id} failed: ${errorMessage}`);

            return {
                jobId: job.id,
                success: false,
                error: errorMessage,
                executionTimeMs: executionTime,
                serverId
            };
        }
    }

    private async executeOllamaGenerate(job: UniversalJob, serverId: ServerId): Promise<any> {
        const endpoint = `${serverId}/api/generate`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(job.payload)
        });

        if (!response.ok) {
            throw new Error(`Ollama generate failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    private async executeOllamaChat(job: UniversalJob, serverId: ServerId): Promise<any> {
        const endpoint = `${serverId}/api/chat`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(job.payload)
        });

        if (!response.ok) {
            throw new Error(`Ollama chat failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    private async executeOllamaEmbeddings(job: UniversalJob, serverId: ServerId): Promise<any> {
        const endpoint = `${serverId}/api/embeddings`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(job.payload)
        });

        if (!response.ok) {
            throw new Error(`Ollama embeddings failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    private async executeOllamaTags(job: UniversalJob, serverId: ServerId): Promise<any> {
        const endpoint = `${serverId}/api/tags`;
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`Ollama tags failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    private async executeOllamaPS(job: UniversalJob, serverId: ServerId): Promise<any> {
        const endpoint = `${serverId}/api/ps`;
        const response = await fetch(endpoint, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            throw new Error(`Ollama ps failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }

    private async executeGenericOllamaCall(job: UniversalJob, serverId: ServerId): Promise<any> {
        // Extract API path from job type (e.g., OLLAMA_PULL -> /api/pull)
        const apiPath = job.type.replace('ollama-', '').replace('-', '/');
        const endpoint = `${serverId}/api/${apiPath}`;

        const method = job.payload?.method || 'POST';
        const requestInit: RequestInit = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        if (method !== 'GET' && job.payload) {
            requestInit.body = JSON.stringify(job.payload);
        }

        const response = await fetch(endpoint, requestInit);

        if (!response.ok) {
            throw new Error(`Ollama ${apiPath} failed: ${response.status} ${response.statusText}`);
        }

        return await response.json();
    }
}
