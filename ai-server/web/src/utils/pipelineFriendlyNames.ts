/**
 * pipelineFriendlyNames
 * Maps canonical pipeline task names to user-friendly display names.
 * Extend this mapping as new pipeline tasks are added.
 */
export const pipelineFriendlyNames: Record<string, string> = {
    'text_ingest': 'Text Ingestion',
    'preprocess': 'Preprocessing',
    'model_selection': 'Model Selection',
    'embedding': 'Embedding Generation',
    'indexing': 'Indexing',
    'quality_check': 'Quality Check',
    'finalize': 'Finalize',
    // Add more canonical task names as needed
};

/**
 * Returns a user-friendly name for a pipeline task.
 * Falls back to the original name if not found.
 * @param taskName - Canonical pipeline task name
 */
export function getPipelineFriendlyName(taskName: string): string {
    return pipelineFriendlyNames[taskName] || taskName;
}
