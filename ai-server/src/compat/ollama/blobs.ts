import type { Request, Response, NextFunction } from 'express';
import type { AIServer } from '../../orchestrator.js';
import {
    handleCompatibilityError,
    sendErrorResponse,
    getOrchestrator
} from '../shared/index.js';

/**
 * HEAD/POST /api/blobs/:digest
 * Blob management for model files (HEAD checks existence, POST uploads blob data).
 *
 * HEAD: Checks if blob exists (200 if exists, 404 if not)
 * POST: Uploads blob data (binary body)
 *
 * @example
 * // HEAD /api/blobs/sha256:abc123
 * // POST /api/blobs/sha256:abc123 (binary body)
 */
export async function blobHeadHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { digest } = req.params;

        if (!digest) {
            sendErrorResponse(
                res,
                400,
                'Missing digest parameter',
                'invalid_request_error'
            );
            return;
        }

        const orchestrator = await getOrchestrator(req);

        // Try to check blob existence on any healthy server
        // Since this is a blob check, we'll try all servers and return 200 if any has it
        const servers = orchestrator.getServers().filter((s: AIServer) => s.healthy);

        if (servers.length === 0) {
            res.sendStatus(503); // Service unavailable
            return;
        }

        let found = false;
        for (const server of servers) {
            try {
                const fetch = (await import('node-fetch')).default;
                const resp = await fetch(`${server.url}/api/blobs/${digest}`, {
                    method: 'HEAD'
                });

                if (resp.ok) {
                    found = true;
                    break;
                }
            } catch (error) {
                console.warn(`[ollama-blobs] HEAD check failed for server ${server.id}:`, error);
                // Continue checking other servers
            }
        }

        res.sendStatus(found ? 200 : 404);

    } catch (error) {
        console.error('[ollama-blobs] HEAD error:', error);
        handleCompatibilityError(res, error, 'Failed to check blob existence');
    }
}

export async function blobPostHandler(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
        const { digest } = req.params;

        if (!digest) {
            sendErrorResponse(
                res,
                400,
                'Missing digest parameter',
                'invalid_request_error'
            );
            return;
        }

        const orchestrator = await getOrchestrator(req);

        // For blob upload, we'll upload to the first healthy server
        // In a real implementation, you might want to upload to multiple servers for redundancy
        const servers = orchestrator.getServers().filter((s: AIServer) => s.healthy);

        if (servers.length === 0) {
            sendErrorResponse(
                res,
                503,
                'No healthy servers available for blob upload',
                'service_unavailable'
            );
            return;
        }

        const server = servers[0];

        try {
            const fetch = (await import('node-fetch')).default;
            const resp = await fetch(`${server.url}/api/blobs/${digest}`, {
                method: 'POST',
                headers: {
                    'Content-Type': req.headers['content-type'] || 'application/octet-stream',
                    'Content-Length': req.headers['content-length'] || '0'
                },
                body: req // Pass the request stream directly
            });

            if (!resp.ok) {
                const rawText = await resp.text();
                console.error(`[ollama-blobs] Upload error from ${server.url}: status ${resp.status}, response:`, rawText);
                sendErrorResponse(
                    res,
                    resp.status,
                    `Upload failed: ${rawText}`,
                    'upload_error'
                );
                return;
            }

            res.status(201).json({ status: 'uploaded', digest });

        } catch (error) {
            console.error(`[ollama-blobs] Upload failed for server ${server.id}:`, error);
            sendErrorResponse(
                res,
                500,
                'Blob upload failed',
                'upload_error'
            );
        }

    } catch (error) {
        console.error('[ollama-blobs] POST error:', error);
        handleCompatibilityError(res, error, 'Failed to upload blob');
    }
}
