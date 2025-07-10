// JSON parser for RAG ingestion
// Splits JSON into top-level objects/arrays for chunking

/**
 * Parse JSON content into top-level objects/arrays for chunking.
 * @param content JSON string
 * @returns Array of JSON blocks (strings)
 */
export function parseJsonBlocks(content: string): string[] {
    try {
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed)) {
            return parsed.map(item => JSON.stringify(item, null, 2));
        }
        if (typeof parsed === 'object' && parsed !== null) {
            return Object.keys(parsed).map(key => JSON.stringify({ [key]: parsed[key] }, null, 2));
        }
        return [JSON.stringify(parsed, null, 2)];
    } catch (e) {
        // Fallback: return the whole content as one block
        return [content];
    }
}
