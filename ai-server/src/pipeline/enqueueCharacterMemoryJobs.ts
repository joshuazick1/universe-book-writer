/**
 * Enqueues characterMemoryGeneration jobs for each character or shared event/character pair.
 * Attaches all gathered context, event references, and prompt instructions to the job payload.
 * Streams SSE events for job enqueuing, progress, and completion.
 *
 * @param characterMemories - Array of character_memory nodes
 * @param enqueueJob - Function to enqueue a job in the distributed queue
 * @param sse - Function to stream SSE events (optional)
 * @param pipelineSessionId - The pipeline session ID
 * @param apiVersion - API version string
 * @param eventVersion - Event version string
 * @returns Array of enqueued job IDs
 */
import type { RAGNode } from '../rag/core/types.js';

export interface EnqueueJobFn {
    (jobType: string, payload: any): Promise<string>;
}

export interface SSEFn {
    (event: string, data: any): void;
}

export async function enqueueCharacterMemoryJobs(
    characterMemories: RAGNode[],
    enqueueJob: EnqueueJobFn,
    sse?: SSEFn,
    pipelineSessionId?: string,
    apiVersion: string = 'v1',
    eventVersion: string = 'v1'
): Promise<string[]> {
    const jobIds: string[] = [];
    for (const memory of characterMemories) {
        const payload = {
            memoryNodeId: memory.id,
            characterId: memory.content?.attributes?.characterId,
            eventId: memory.content?.attributes?.eventId,
            sharedMemoryId: memory.content?.attributes?.sharedMemoryId,
            context: memory.content?.description,
            sessionId: pipelineSessionId,
            apiVersion,
            eventVersion
        };
        const jobId = await enqueueJob('characterMemoryGeneration', payload);
        jobIds.push(jobId);
        if (sse) {
            sse('character_memory_job_enqueued', {
                jobId,
                memoryNodeId: memory.id,
                characterId: payload.characterId,
                eventId: payload.eventId,
                sharedMemoryId: payload.sharedMemoryId,
                sessionId: pipelineSessionId
            });
        }
    }
    return jobIds;
}
