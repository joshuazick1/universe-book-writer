import { ragService } from './ragService';

/**
 * Manually trigger post-chunking pipeline steps for a given universe/book/chapter/character selection.
 *
 * @param params - The filter params (universe, book, chapter, character)
 * @returns Progress/result object from backend
 */
export async function runManualPostChunking(params: {
    universeId?: string;
    bookId?: string;
    chapterId?: string;
    characterId?: string;
}): Promise<any> {
    // Use the main ragService if it exposes a method for this endpoint
    if (typeof (ragService as any).manualPostChunking === 'function') {
        return (ragService as any).manualPostChunking(params);
    }
    // Fallback: direct fetch (legacy or dev mode)
    const response = await fetch('http://localhost:5100/api/rag/manual-post-chunking', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(params),
    });
    if (!response.ok) {
        throw new Error(`Failed to run post-chunking: ${response.statusText}`);
    }
    return response.json();
}
