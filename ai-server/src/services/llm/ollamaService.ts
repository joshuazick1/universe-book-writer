import { OllamaService } from '../../services/textToRagParser/ai/ollamaService.js';

/**
 * Calls the Ollama LLM with the given model and prompt, returns the response string.
 * @param model - The model name (e.g., 'smollm2:135m')
 * @param prompt - The prompt string to send to the LLM
 * @returns The generated response string
 */
export async function getOllamaModelResponse(model: string, prompt: string): Promise<string> {
    const ollama = new OllamaService('http://localhost:5100');
    // The OllamaService expects the model as an option
    return ollama.generateText(prompt, { model });
}
