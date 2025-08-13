import { ModelId } from '../../../shared/types/aiQualityBenchmark.js';

/**
 * Simulates fetching a response from an AI model.
 * @param modelId - The ID of the model to query.
 * @param prompt - The prompt to send to the model.
 * @returns A simulated response from the model.
 */
export async function fetchModelResponse(modelId: ModelId, prompt: string): Promise<{ text: string; metadata?: Record<string, any> }> {
    // Simulated delay to mimic network latency
    await new Promise((resolve) => setTimeout(resolve, 100));

    // Simulated response
    return {
        text: `Response from model ${modelId} for prompt: ${prompt}`,
        metadata: { length: prompt.length },
    };
}
