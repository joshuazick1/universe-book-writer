import { getModelForUniverse } from './modelSelector.js';
import fetch from 'node-fetch';

/**
 * Extracts mood and theme classifications from a text chunk using the user-selected AI model.
 * Accepts prior group/chunk summaries as context for improved accuracy and continuity.
 * @param text The text chunk to analyze
 * @param opts Options: { model: string, universeId: string, priorSummaries?: string[] }
 * @returns Array of extracted mood and theme objects
 */
export async function aiClassifyMoodAndThemeFromChunk(
    text: string,
    opts: { model?: string; universeId: string; priorSummaries?: string[] }
): Promise<any[]> {
    const model = opts.model || (await getModelForUniverse(opts.universeId, opts.model));
    const context = opts.priorSummaries && opts.priorSummaries.length > 0
        ? `\n\nContext (broad summaries of previous narrative):\n- ${opts.priorSummaries.join('\n- ')}`
        : '';
    try {
        const prompt = `Classify the mood and thematic elements of the following story chunk.\n\nFor each, return a JSON object with:\n- type: 'mood' or 'theme'\n- tone (for mood)\n- scene_reference (for mood, if available)\n- label (for theme)\n- supporting_text (for theme, if available)\n- confidence (0-1, optional)\n${context}\n\nChunk:\n${text}`;
        const response = await fetch('http://localhost:5100/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt, stream: false })
        });
        if (!response.ok) throw new Error(`LLM API error: ${response.status}`);
        const data: any = await response.json();
        try {
            const results = typeof data.response === 'string' ? JSON.parse(data.response) : [];
            if (Array.isArray(results)) return results;
            return [];
        } catch {
            return [];
        }
    } catch (err) {
        return [];
    }
}
