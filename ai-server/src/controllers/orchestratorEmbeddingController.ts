/**
 * Orchestrator controller for embedding requests
 * @module orchestratorEmbeddingController
 */
import { Request, Response, Router } from 'express';
import { getOrchestrator } from '../compat/shared/index.js';
import { embedHandlerParallel } from '../compat/ollama/embed-parallel.js';

/**
 * POST /api/orchestrator/embed
 * Accepts { text: string, model?: string } and returns { embedding: number[] }
 * @param req Express request
 * @param res Express response
 */
import { logger } from '../../../shared/logging/logger.js';

export async function orchestratorEmbed(req: Request, res: Response): Promise<void> {
  const { text, model = 'nomic-embed-text:latest' } = req.body;
  logger.debug(
    `[orchestratorEmbed] Received embedding request: model=${model}, text=${text?.slice(0, 80)}`
  );
  if (typeof text !== 'string' || !text.trim()) {
    logger.warn('[orchestratorEmbed] Missing or invalid text');
    res.status(400).json({ error: 'Missing or invalid text' });
    return;
  }
  try {
    const orchestrator = await getOrchestrator(req);
    logger.debug(`[orchestratorEmbed] Orchestrator instance acquired`);
    // Timeout and retry logic
    const MAX_RETRIES = 2;
    const TIMEOUT_MS = 4000;
    let lastError = null;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      logger.debug(`[orchestratorEmbed] Attempt ${attempt + 1} for model=${model}`);
      try {
        const result = await orchestrator.tryRequestWithFailover(
          model,
          async (server: { url: string; id: string }) => {
            logger.debug(
              `[orchestratorEmbed] Trying server ${server.id} (${server.url}) for embedding`
            );
            const fetch = (await import('node-fetch')).default;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);
            try {
              const resp = await fetch(`${server.url}/api/embed`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ model, input: text }),
                signal: controller.signal,
              });
              clearTimeout(timeout);
              logger.debug(
                `[orchestratorEmbed] Server ${server.id} responded with status ${resp.status}`
              );
              if (!resp.ok) {
                const rawText = await resp.text();
                logger.error(
                  `[orchestratorEmbed] Error from server ${server.id}: status ${resp.status}, response: ${rawText}`
                );
                throw new Error(`Server ${server.id} returned status ${resp.status}: ${rawText}`);
              }
              const rawText = await resp.text();
              console.log(`[orchestratorEmbed] RAW RESPONSE from server ${server.id}:`, rawText);
              let data: any;
              try {
                data = JSON.parse(rawText);
              } catch (e) {
                logger.error(
                  `[orchestratorEmbed] Failed to parse JSON from server ${server.id}: ${e}`
                );
                throw new Error('Invalid JSON response');
              }
              logger.debug(
                `[orchestratorEmbed] Server ${server.id} returned embeddings: ${Array.isArray(data.embeddings) ? 'valid' : 'invalid'}`
              );
              if (!Array.isArray(data.embeddings) || !Array.isArray(data.embeddings[0]))
                throw new Error('No embedding returned');
              return data.embeddings[0];
            } catch (err) {
              clearTimeout(timeout);
              logger.error(
                `[orchestratorEmbed] Error during fetch from server ${server.id}: ${String(err)}`
              );
              throw err;
            }
          }
        );
        logger.info(`[orchestratorEmbed] Embedding successful for model=${model}`);
        res.json({ embedding: result });
        return;
      } catch (err) {
        lastError = err;
        logger.warn(`[orchestratorEmbed] Attempt ${attempt + 1} failed: ${String(err)}`);
        // If timeout or network error, retry
        if (
          attempt < MAX_RETRIES &&
          (String(err).includes('abort') ||
            String(err).includes('timeout') ||
            String(err).includes('network'))
        ) {
          continue;
        } else {
          break;
        }
      }
    }
    logger.error(`[orchestratorEmbed] All attempts failed. Last error: ${String(lastError)}`);
    res.status(500).json({ error: 'Embedding failed', details: String(lastError) });
  } catch (err) {
    logger.error(`[orchestratorEmbed] Fatal error: ${String(err)}`);
    res.status(500).json({ error: 'Embedding failed', details: String(err) });
  }
}

const router = Router();

// Define a new endpoint for the parallel embedding handler
router.post('/api/orchestrator/embed-parallel', embedHandlerParallel);

export default router;

/**
 * README: orchestratorEmbeddingController
 * Usage:
 *   POST /api/orchestrator/embed
 *   Body: { text: string, model?: string }
 *   Response: { embedding: number[] }
 * Edge cases: empty text, service errors
 */
