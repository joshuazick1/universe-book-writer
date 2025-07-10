import type { Request, Response } from 'express';
import * as ragNodeService from '../services/ragNodeService.js';
import { runPostChunkingPipeline } from '../services/textToRagParser/postChunkingPipeline.js';

/**
 * Manually re-run post-chunking pipeline steps for a book.
 * POST /api/rag/manual-post-chunking
 * Body: { universeId: string, bookId: string }
 */
export async function manualPostChunking(req: Request, res: Response) {
    const { universeId, bookId } = req.body;
    if (!universeId || !bookId) {
        return res.status(400).json({ error: 'Missing universeId or bookId' });
    }
    try {
        // Fetch all chunk nodes for the book
        const chunks = await ragNodeService.getChunksByBook(universeId, bookId);
        if (!chunks || chunks.length === 0) {
            return res.status(404).json({ error: 'No chunks found for this book' });
        }
        // Call the post-chunking pipeline for all chunks, including de-duplication
        const result = await runPostChunkingPipeline(chunks, { universeId, bookId });
        return res.json({ message: 'Manual post-chunking triggered', ...result });
    } catch (err) {
        return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
    }
}
