/**
 * Uses the user-selected AI model to map relationships between extracted entities in a chunk.
 * @param entities Array of entities extracted from the chunk
 * @param text The original text chunk
 * @param opts Options: { model: string, universeId: string }
 * @returns Array of relationship objects and (optionally) enriched entity metadata
 */
import { getModelForUniverse } from './modelSelector.js';
import fetch from 'node-fetch';

export async function aiExtractRelationshipsFromChunk(
    entities: any[],
    text: string,
    opts: { model?: string; universeId: string }
): Promise<{ relationships: any[]; entityMetadata: any[] }> {
    const model = opts.model || (await getModelForUniverse(opts.universeId, opts.model));
    try {
        const prompt = `Given the following story chunk and its extracted entities, identify ALL relationships between them.\n\nFor each relationship, return a JSON object with:\n- from (canonical name or unique reference of the source entity)\n- to (canonical name or unique reference of the target entity)\n- type (specific relationship type, e.g., affiliation, rivalry, ownership, family, mentor, etc.)\n- description (rich, context-aware explanation of the relationship, 1-2 sentences)\n- confidence (0-1, optional)\n- source_text (the exact text supporting this relationship, if available)\n\nReturn a JSON array of these relationship objects.\n\nAlso, if you can enrich any entity with additional metadata (e.g., role, affiliation, rivalries, relationships), return a JSON array of entity metadata updates.\n\nEntities:\n${JSON.stringify(entities, null, 2)}\n\nChunk:\n${text}`;
        const response = await fetch('http://localhost:5100/api/generate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ model, prompt, stream: false })
        });
        if (!response.ok) throw new Error(`LLM API error: ${response.status}`);
        const data: any = await response.json();
        // Try to parse the response as { relationships: [], entityMetadata: [] }
        try {
            const result = typeof data.response === 'string' ? JSON.parse(data.response) : {};
            return {
                relationships: Array.isArray(result.relationships) ? result.relationships : [],
                entityMetadata: Array.isArray(result.entityMetadata) ? result.entityMetadata : []
            };
        } catch {
            return { relationships: [], entityMetadata: [] };
        }
    } catch (err) {
        return { relationships: [], entityMetadata: [] };
    }
}
