/**
 * pipelineTasks
 *
 * Utility for composing and running async tasks in sequence (pipeline pattern).
 *
 * @template T - Input/output type for the pipeline
 * @param tasks - Array of async functions (tasks) to run in order
 * @returns A function that takes initial input and returns the final result after all tasks
 *
 * @example
 *   const pipeline = pipelineTasks([
 *     async (x) => x + 1,
 *     async (x) => x * 2,
 *   ]);
 *   const result = await pipeline(3); // 8
 *
 * @remarks
 * - Each task receives the output of the previous task.
 * - If a task throws, the pipeline rejects immediately.
 * - Safe for use in backend, ai-server, and plugins.
 */
/**
 * List of pipeline tasks for RAG ingestion pipeline.
 * Each task has a unique key and a user-friendly name.
 */
export interface PipelineTaskDef {
    key: string;
    friendlyName: string;
}

export const PIPELINE_TASKS: readonly PipelineTaskDef[] = [
    { key: 'storeRawText', friendlyName: 'Store Raw Text' },
    { key: 'chunkText', friendlyName: 'Chunk Text' },
    { key: 'summarizeChunkMeta', friendlyName: 'Summarize Chunks' },
    { key: 'groupChunksMeta', friendlyName: 'Group Chunks' },
    { key: 'summarizeSuperChunkMeta', friendlyName: 'Summarize Super Chunk' },
    { key: 'aiEntityExtraction', friendlyName: 'Entity Extraction' },
    { key: 'aiRelationshipExtraction', friendlyName: 'Relationship Extraction' },
    { key: 'aiLoreExtraction', friendlyName: 'Lore Extraction' },
    { key: 'aiDialogueExtraction', friendlyName: 'Dialogue Extraction' },
    { key: 'aiMoodThemeClassification', friendlyName: 'Mood/Theme Classification' },
    { key: 'aiTimelineExtraction', friendlyName: 'Timeline Extraction' },
    { key: 'characterMemoryGeneration', friendlyName: 'Character Memory Generation' },
];

export function pipelineTasks<T>(tasks: Array<(input: T) => Promise<T>>): (input: T) => Promise<T> {
    if (!Array.isArray(tasks) || tasks.some(t => typeof t !== 'function')) {
        throw new Error('pipelineTasks: tasks must be an array of functions');
    }
    return async (input: T): Promise<T> => {
        let result = input;
        for (const task of tasks) {
            result = await task(result);
        }
        return result;
    };
}

export default pipelineTasks;
