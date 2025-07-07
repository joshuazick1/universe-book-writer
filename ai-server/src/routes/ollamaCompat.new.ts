/**
 * Ollama API compatibility router
 * Modularized version using the new compatibility layer
 */

import { Router, json, urlencoded } from 'express';
import { Ollama } from '../compat/index.js';

const router = Router();

// Add JSON body parser middleware
router.use(json());
router.use(urlencoded({ extended: true }));

// Debug logging middleware
router.use((req, res, next) => {
    console.debug(`[ollamaCompat] ${req.method} ${req.path}`, {
        body: req.body,
        query: req.query,
        headers: req.headers
    });
    next();
});

// Model management endpoints
router.post('/create', Ollama.handleCreate);
router.post('/pull', Ollama.handlePull);
router.post('/push', Ollama.handlePush);
router.delete('/delete', Ollama.handleDelete);
router.post('/copy', Ollama.handleCopy);
router.post('/convert', Ollama.handleConvert);
router.post('/stop', Ollama.handleStop);

// Model information endpoints
router.get('/version', Ollama.handleVersion);
router.get('/ps', Ollama.handlePs);
router.get('/tags', Ollama.handleTags);
router.get('/show', Ollama.handleShowGet);
router.post('/show', Ollama.handleShow);

// Generation endpoints
router.post('/chat', Ollama.handleChat);
router.post('/generate', Ollama.handleGenerate);
router.post('/embed', Ollama.handleEmbed);

// Embedding endpoints
router.post('/embeddings', Ollama.handleEmbeddings);

// Blob management endpoints
router.head('/blobs/:digest', Ollama.handleBlobHead);
router.post('/blobs/:digest', Ollama.handleBlobPost);

export default router;
