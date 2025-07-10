// Shared chunking logic for RAG ingestion (text and code)
// This service can be extended to use advanced chunking strategies or external parsers

/**
 * Chunk an array of strings into groups not exceeding a max character length.
 * Used by both text and code chunkers.
 * @param parts Array of string segments (e.g., paragraphs, lines, blocks)
 * @param chunkSize Max characters per chunk
 * @returns Array of chunked strings
 */
export function groupChunks(parts: string[], chunkSize: number): string[] {
    const chunks: string[] = [];
    let current = '';
    for (const part of parts) {
        if ((current + part).length > chunkSize && current.length > 0) {
            chunks.push(current);
            current = '';
        }
        current += (current ? '\n' : '') + part;
    }
    if (current) chunks.push(current);
    return chunks;
}

/**
 * Chunk plain text by paragraphs (default for text ingestion)
 */
export function chunkTextByParagraph(content: string, chunkSize: number): string[] {
    const paragraphs = content.split(/\n\s*\n/);
    return groupChunks(paragraphs, chunkSize);
}

/**
 * Chunk code by lines (default fallback for code ingestion)
 */
export function chunkCodeByLine(content: string, chunkSize: number): string[] {
    const lines = content.split(/\n/);
    return groupChunks(lines, chunkSize);
}

// More advanced chunkers (e.g., by function, class, block) can be added here or in ragParsers/
