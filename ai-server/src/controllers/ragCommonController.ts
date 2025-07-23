// Shared logic for RAG ingestion (text/code)
// Used by ragTextController and ragCodeController
import type { Request, Response } from 'express';

/**
 * Chunk content into RAG-ready segments.
 * @param content The raw text or code to chunk
 * @param chunkSize The max size of each chunk
 * @param strategy Chunking strategy (e.g., 'paragraph', 'function', 'block')
 * @returns Array of chunked strings
 */
export function chunkContent(
    content: string,
    chunkSize: number = 1000,
    strategy: 'paragraph' | 'function' | 'block' | 'line' | 'custom' = 'paragraph'
): string[] {
    // Simple default: split by paragraphs or lines, then group into chunks
    if (strategy === 'paragraph') {
        const paragraphs = content.split(/\n\s*\n/);
        return groupChunks(paragraphs, chunkSize);
    }
    if (strategy === 'line') {
        const lines = content.split(/\n/);
        return groupChunks(lines, chunkSize);
    }
    // For 'function', 'block', 'custom', just return the whole content for now
    // (Extend with real parsing logic in ragParsers/)
    return [content];
}

function groupChunks(parts: string[], chunkSize: number): string[] {
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
 * Shared response for successful ingestion
 */
export function sendIngestionResponse(res: Response, chunks: string[], meta: object = {}) {
    res.status(200).json({
        message: 'Ingestion successful',
        chunkCount: chunks.length,
        chunks,
        ...meta
    });
}
