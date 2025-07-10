import type { Request, Response } from 'express';

import { chunkCodeByLine, groupChunks } from '../services/ragChunker.js';
import { parsePythonBlocks } from '../services/ragParsers/pythonParser.js';
import { parseJsonBlocks } from '../services/ragParsers/jsonParser.js';
import { sendIngestionResponse } from './ragCommonController.js';

/**
 * Controller for RAG code ingestion
 * Handles POST /api/rag/ingest/code
 */
export const ragCodeController = {
    ingestCode: (req: Request, res: Response) => {
        const { content, chunkSize = 1000, chunkStrategy = 'function', type, language, metadata } = req.body;
        let chunks: string[];
        if (type === 'python') {
            const blocks = parsePythonBlocks(content);
            chunks = groupChunks(blocks, chunkSize);
        } else if (type === 'json') {
            const blocks = parseJsonBlocks(content);
            chunks = groupChunks(blocks, chunkSize);
        } else {
            chunks = chunkCodeByLine(content, chunkSize);
        }
        sendIngestionResponse(res, chunks, { type, language, metadata });
    }
};
