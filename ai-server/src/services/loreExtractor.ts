import { getModelForUniverse } from './modelSelector.js';
import fetch from 'node-fetch';

/**
 * Extracts lore and timeline markers from a text chunk using the user-selected AI model.
 * Supports: myth, legend, prophecy, age, cycle, timeline_marker, etc.
 * @param text The text chunk to analyze
 * @param opts Options: { model: string, universeId: string }
 * @returns Array of extracted lore and timeline_marker objects
 */
/**
 * Enhanced Lore/Timeline Extraction: Accepts prior group/chunk summaries as context for improved accuracy and continuity.
 * @param text The text chunk to analyze
 * @param opts Options: { model: string, universeId: string, priorSummaries?: string[] }
 * @returns Array of extracted lore and timeline_marker objects
 */
export async function aiExtractLoreFromChunk(
    text: string,
    opts: { model?: string; universeId: string; priorSummaries?: string[] }
): Promise<any[]> {
    const model = opts.model || (await getModelForUniverse(opts.universeId, opts.model));
    const context = opts.priorSummaries && opts.priorSummaries.length > 0
        ? `\n\nContext (broad summaries of previous narrative):\n- ${opts.priorSummaries.join('\n- ')}`
        : '';
    try {
        const prompt = `Extract all lore, myths, prophecies, legends, cycles, and timeline markers from the following story chunk.\n\nFor each, return a JSON object with:\n- type (lore, timeline_marker, myth, legend, prophecy, age, cycle, etc.)\n- all relevant fields (see schema)\n- confidence (0-1, optional)\n- For timeline_marker, if the marker is a relative time expression (e.g., 'a few days later', 'the next morning'), include a 'relative_to' field with the referenced event/chunk name or id if possible.\n- For absolute markers (e.g., specific dates), include the explicit date.\n${context}\n\nChunk:\n${text}`;
        const response = await fetch('http://localhost:5100/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt, stream: false })
        });
        if (!response.ok) throw new Error(`LLM API error: ${response.status}`);
        const data: any = await response.json();
        try {
            const lore = typeof data.response === 'string' ? JSON.parse(data.response) : [];
            if (Array.isArray(lore)) return lore;
            return [];
        } catch {
            return [];
        }
    } catch (err) {
        return [];
    }
}
