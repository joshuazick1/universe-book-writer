import { getModelForUniverse } from './modelSelector.js';
import fetch from 'node-fetch';

/**
 * Summarizes a chunk of text using the user-selected AI model.
 * @param text The text chunk to summarize
 * @param opts Options: { model: string, universeId: string }
 * @returns A summary object (structure can be extended)
 */
export async function aiSummarizeChunk(
    text: string,
    opts: { model?: string; universeId: string }
): Promise<{ summary: string }> {
    // Get the model to use (user-selected, fallback to default)
    const model = opts.model || (await getModelForUniverse(opts.universeId, opts.model));

    // Call Ollama or other LLM API for summarization
    // This example assumes Ollama is running locally with a /api/generate endpoint
    try {
        const response = await fetch('http://localhost:5100/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                model,
                prompt: `Summarize the following story chunk for world-building and entity extraction.\n\n${text}`,
                stream: false
            })
        });
        if (!response.ok) {
            throw new Error(`LLM API error: ${response.status}`);
        }
        const data = (await response.json()) as { response: string };
        // Ollama returns { response: string, ... }
        return { summary: data.response };
    } catch (err) {
        // Fallback: return a mock summary if LLM call fails
        return {
            summary: `Summary for chunk: ${text.substring(0, 100)}... [model: ${model}] (LLM unavailable)`
        };
    }
}
