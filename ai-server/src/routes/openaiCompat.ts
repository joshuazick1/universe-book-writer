/**
 * OpenAI API compatibility router
 * Implements OpenAI v1 API endpoints for compatibility with OpenAI client libraries
 */

import { Router, json, urlencoded } from 'express';
import { OpenAI } from '../compat/index.js';

const router = Router();

// Add JSON body parser middleware
router.use(json());
router.use(urlencoded({ extended: true }));

// Debug logging middleware
router.use((req, res, next) => {
    console.debug(`[openaiCompat] ${req.method} ${req.path}`, {
        body: req.body?.model ? { model: req.body.model, messageCount: req.body.messages?.length } : req.body,
        query: req.query,
        headers: {
            'content-type': req.headers['content-type'],
            'authorization': req.headers.authorization ? 'Bearer [REDACTED]' : undefined
        }
    });
    next();
});

// Authentication middleware (placeholder)
router.use((req, res, next) => {
    // TODO: Implement proper API key validation
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({
            error: {
                message: 'Invalid API key provided',
                type: 'invalid_request_error',
                code: 'invalid_api_key'
            }
        });
        return;
    }

    // For now, accept any Bearer token
    // TODO: Validate against actual API key database
    next();
});

// Models endpoints
router.get('/models', OpenAI.handleListModels);
router.get('/models/:model', OpenAI.handleGetModel);

// Chat completion endpoints
router.post('/chat/completions', OpenAI.handleChatCompletions);
router.post('/completions', OpenAI.handleCompletions);

// Embeddings endpoints
router.post('/embeddings', OpenAI.handleEmbeddings);

// File management endpoints
router.get('/files', OpenAI.openaiListFilesHandler);
router.post('/files', OpenAI.openaiUploadFileHandler);
router.get('/files/:file_id', OpenAI.openaiGetFileHandler);
router.delete('/files/:file_id', OpenAI.openaiDeleteFileHandler);
router.get('/files/:file_id/content', OpenAI.openaiGetFileContentHandler);

// Assistants API endpoints
router.get('/assistants', OpenAI.openaiListAssistantsHandler);
router.post('/assistants', OpenAI.openaiCreateAssistantHandler);
router.get('/assistants/:assistant_id', OpenAI.openaiRetrieveAssistantHandler);
router.delete('/assistants/:assistant_id', OpenAI.openaiDeleteAssistantHandler);

// Thread management endpoints
router.get('/threads', OpenAI.openaiListThreadsHandler);
router.post('/threads', OpenAI.openaiCreateThreadHandler);
router.get('/threads/:thread_id', OpenAI.openaiRetrieveThreadHandler);
router.post('/threads/:thread_id', OpenAI.openaiModifyThreadHandler);
router.delete('/threads/:thread_id', OpenAI.openaiDeleteThreadHandler);

// Thread messages endpoints
router.get('/threads/:thread_id/messages', OpenAI.openaiListThreadMessagesHandler);
router.post('/threads/:thread_id/messages', OpenAI.openaiCreateThreadMessageHandler);
router.get('/threads/:thread_id/messages/:message_id', OpenAI.openaiRetrieveThreadMessageHandler);
router.post('/threads/:thread_id/messages/:message_id', OpenAI.openaiModifyThreadMessageHandler);

// Thread runs endpoints
router.get('/threads/:thread_id/runs', OpenAI.openaiListThreadRunsHandler);
router.post('/threads/:thread_id/runs', OpenAI.openaiCreateThreadRunHandler);
router.get('/threads/:thread_id/runs/:run_id', OpenAI.openaiRetrieveThreadRunHandler);
router.post('/threads/:thread_id/runs/:run_id/cancel', OpenAI.openaiCancelThreadRunHandler);
router.post('/threads/:thread_id/runs/:run_id/submit_tool_outputs', OpenAI.openaiSubmitToolOutputsHandler);

// Fine-tuning jobs endpoints
router.get('/fine-tuning/jobs', OpenAI.openaiListFineTuningJobsHandler);
router.post('/fine-tuning/jobs', OpenAI.openaiCreateFineTuningJobHandler);
router.get('/fine-tuning/jobs/:job_id', OpenAI.openaiRetrieveFineTuningJobHandler);
router.post('/fine-tuning/jobs/:job_id/cancel', OpenAI.openaiCancelFineTuningJobHandler);
router.get('/fine-tuning/jobs/:job_id/events', OpenAI.openaiListFineTuningJobEventsHandler);
router.get('/fine-tuning/jobs/:job_id/checkpoints', OpenAI.openaiListFineTuningJobCheckpointsHandler);

// Audio endpoints
router.post('/audio/transcriptions', OpenAI.openaiCreateTranscriptionHandler);
router.post('/audio/translations', OpenAI.openaiCreateTranslationHandler);
router.post('/audio/speech', OpenAI.openaiCreateSpeechHandler);

// Images endpoints
router.post('/images/generations', OpenAI.openaiCreateImageHandler);
router.post('/images/edits', OpenAI.openaiEditImageHandler);
router.post('/images/variations', OpenAI.openaiCreateImageVariationHandler);

// Moderations endpoint
router.post('/moderations', OpenAI.openaiCreateModerationHandler);

// TODO: Add more OpenAI endpoints as needed:
// - /v1/batches (batch processing)

export default router;
