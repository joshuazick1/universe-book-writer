import { getModelForUniverse } from './modelSelector.js';
import fetch from 'node-fetch';

/**
 * Extracts unresolved questions, mysteries, foreshadowing, and narrative breadcrumbs from a text chunk using the user-selected AI model.
 * Accepts prior group/chunk summaries as context for improved accuracy and continuity.
 * @param text The text chunk to analyze
 * @param opts Options: { model: string, universeId: string, priorSummaries?: string[] }
 * @returns Array of extracted unresolved_question objects
 */
export async function aiExtractUnresolvedQuestionsFromChunk(
    text: string,
    opts: { model?: string; universeId: string; priorSummaries?: string[] }
): Promise<any[]> {
    const model = opts.model || (await getModelForUniverse(opts.universeId, opts.model));
    const context = opts.priorSummaries && opts.priorSummaries.length > 0
        ? `\n\nContext (broad summaries of previous narrative):\n- ${opts.priorSummaries.join('\n- ')}`
        : '';
    try {
        const prompt = `Extract all unresolved questions, mysteries, foreshadowing, and narrative breadcrumbs from the following story chunk.\n\nFor each, return a JSON object with:\n- type: 'unresolved_question'\n- question (the mystery or unresolved issue)\n- context (brief description of the situation)\n- related_entities (array, if any)\n- confidence (0-1, optional)\n${context}\n\nChunk:\n${text}`;
        const response = await fetch('http://localhost:5100/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt, stream: false })
        });
        if (!response.ok) throw new Error(`LLM API error: ${response.status}`);
        const data: any = await response.json();
        try {
            const questions = typeof data.response === 'string' ? JSON.parse(data.response) : [];
            if (Array.isArray(questions)) return questions;
            return [];
        } catch {
            return [];
        }
    } catch (err) {
        return [];
    }
}
