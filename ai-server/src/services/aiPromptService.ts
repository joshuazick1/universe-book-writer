import { fetchModelResponse } from '../utils/modelUtils.js';
import { ModelId, PromptRequest, PromptResponse } from '../../../shared/types/aiQualityBenchmark.js';

/**
 * Sends a prompt to the AI model and retrieves the response.
 * @param params - The parameters for the prompt request.
 * @returns The AI model's response.
 */
export async function sendPromptToAI(params: {
    modelId: ModelId;
    prompt: string;
}): Promise<PromptResponse> {
    const { modelId, prompt } = params;

    // Validate input
    if (!modelId || !prompt) {
        throw new Error('Model ID and prompt are required.');
    }

    // Fetch response from the model
    const response = await fetchModelResponse(modelId, prompt);

    // Validate response
    if (!response || !response.text) {
        throw new Error('Failed to retrieve a valid response from the model.');
    }

    return {
        modelId,
        prompt,
        text: response.text,
        metadata: response.metadata || {},
    };
}
