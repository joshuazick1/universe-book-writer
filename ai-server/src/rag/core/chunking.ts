
import { createHash } from 'crypto';

export interface Chunk {
    id: string; // hash of content
    text: string;
    index: number;
}

function hashChunk(text: string): string {
    return createHash('sha1').update(text).digest('hex');
}

/**
 * Chunk text by paragraphs with stable IDs (hash-based)
 */
export function chunkTextByParagraph(text: string, chunkSize: number = 1000): Chunk[] {
    const paragraphs = text.split(/\n\s*\n/).filter(Boolean);
    return paragraphs.map((p, i) => ({
        id: hashChunk(p),
        text: p,
        index: i,
    }));
}

/**
 * Chunk text by sentences with stable IDs (hash-based)
 */
export function chunkTextBySentence(text: string, chunkSize: number = 1000): Chunk[] {
    const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
    let chunks: Chunk[] = [];
    let buffer = '';
    let idx = 0;
    for (let i = 0; i < sentences.length; i++) {
        if ((buffer + sentences[i]).length > chunkSize && buffer) {
            chunks.push({ id: hashChunk(buffer), text: buffer, index: idx++ });
            buffer = '';
        }
        buffer += (buffer ? ' ' : '') + sentences[i];
    }
    if (buffer) {
        chunks.push({ id: hashChunk(buffer), text: buffer, index: idx++ });
    }
    return chunks;
}

/**
 * Group chunks (for markdown blocks, etc.) with stable IDs
 */
export function groupChunks(blocks: string[], chunkSize: number = 1000): Chunk[] {
    let chunks: Chunk[] = [];
    let buffer = '';
    let idx = 0;
    for (let i = 0; i < blocks.length; i++) {
        if ((buffer + blocks[i]).length > chunkSize && buffer) {
            chunks.push({ id: hashChunk(buffer), text: buffer, index: idx++ });
            buffer = '';
        }
        buffer += (buffer ? '\n' : '') + blocks[i];
    }
    if (buffer) {
        chunks.push({ id: hashChunk(buffer), text: buffer, index: idx++ });
    }
    return chunks;
}
