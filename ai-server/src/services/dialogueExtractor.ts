import { getModelForUniverse } from './modelSelector.js';
import fetch from 'node-fetch';

/**
 * Extracts dialogue, inner thoughts, and attributed quotations from a text chunk using the user-selected AI model.
 * Each result includes speaker, quote, location, target, tone, and context.
 * @param text The text chunk to analyze
 * @param opts Options: { model: string, universeId: string }
 * @returns Array of extracted dialogue objects
 */
/**
 * Enhanced Dialogue Attribution: Accepts prior group/chunk summaries as context for improved accuracy and continuity.
 * @param text The text chunk to analyze
 * @param opts Options: { model: string, universeId: string, priorSummaries?: string[] }
 * @returns Array of extracted dialogue objects
 */
export async function aiExtractDialogueFromChunk(
    text: string,
    opts: { model?: string; universeId: string; priorSummaries?: string[] }
): Promise<any[]> {
    const model = opts.model || (await getModelForUniverse(opts.universeId, opts.model));
    const context = opts.priorSummaries && opts.priorSummaries.length > 0
        ? `\n\nContext (broad summaries of previous narrative):\n- ${opts.priorSummaries.join('\n- ')}`
        : '';
    try {
        const prompt = `Extract all character dialogue, inner thoughts, and attributed quotations from the following story chunk.\n\nFor each, return a JSON object with:\n- type: 'dialogue'\n- speaker (character name)\n- quote (the spoken or thought text)\n- location (if available)\n- target (who is being addressed, if any)\n- tone (emotion or style, if available)\n- context (brief description of the situation)\n- confidence (0-1, optional)\n${context}\n\nChunk:\n${text}`;
        const response = await fetch('http://localhost:5100/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt, stream: false })
        });
        if (!response.ok) throw new Error(`LLM API error: ${response.status}`);
        const data: any = await response.json();
        try {
            const dialogue = typeof data.response === 'string' ? JSON.parse(data.response) : [];
            if (Array.isArray(dialogue)) return dialogue;
            return [];
        } catch {
            return [];
        }
    } catch (err) {
        return [];
    }
}
