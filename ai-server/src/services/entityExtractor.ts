/**
 * Extracts named entities from a text chunk using the user-selected AI model.
 * Supports: character, location, organization, object, event, etc.
 * @param text The text chunk to analyze
 * @param opts Options: { model: string, universeId: string }
 * @returns Array of extracted entities (with type and fields)
 */
import { getModelForUniverse } from './modelSelector.js';
import fetch from 'node-fetch';

/**
 * Enhanced NER: Accepts prior group/chunk summaries as context for improved accuracy and continuity.
 * @param text The text chunk to analyze
 * @param opts Options: { model: string, universeId: string, priorSummaries?: string[] }
 * @returns Array of extracted entities (with type and fields)
 */
export async function aiExtractEntitiesFromChunk(
    text: string,
    opts: { model?: string; universeId: string; priorSummaries?: string[] }
): Promise<any[]> {
    const model = opts.model || (await getModelForUniverse(opts.universeId, opts.model));
    const context = opts.priorSummaries && opts.priorSummaries.length > 0
        ? `\n\nContext (broad summaries of previous narrative):\n- ${opts.priorSummaries.join('\n- ')}`
        : '';
    try {
        const prompt = `Extract all named entities from the following story chunk.\n\nFor each entity, return a JSON object with:\n- type (character, organization, location, object, event, etc.)\n- name (canonical name)\n- description (a rich, context-aware summary of the entity, 1-2 sentences)\n- aliases (array of all found aliases, nicknames, alternate spellings, or titles; empty array if none)\n- all other relevant fields (see schema)\n- confidence (0-1, optional)\n${context}\n\nChunk:\n${text}`;
        const response = await fetch('http://localhost:5100/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt, stream: false })
        });
        if (!response.ok) throw new Error(`LLM API error: ${response.status}`);
        const data: any = await response.json();
        // Try to parse the response as JSON array
        try {
            const entities = typeof data.response === 'string' ? JSON.parse(data.response) : [];
            if (Array.isArray(entities)) {
                // Ensure description and aliases fields exist
                return entities.map(e => ({
                    ...e,
                    description: typeof e.description === 'string' ? e.description : '',
                    aliases: Array.isArray(e.aliases) ? e.aliases : [],
                }));
            }
            return [];
        } catch {
            // If not valid JSON, return empty array
            return [];
        }
    } catch (err) {
        // Fallback: return empty array if LLM call fails
        return [];
    }
}

/**
 * Legacy extractor for summaries (for compatibility with controller)
 * @param summary The summary string or object
 * @returns Array of entities (empty for now)
 */
export function extractEntitiesFromSummary(summary: any): any[] {
    // TODO: Implement extraction from summary if needed
    return [];
}
