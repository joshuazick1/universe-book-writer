import type { Request, Response, NextFunction } from 'express';
// NOTE: This import assumes the backend is built and linked as a workspace dependency (see monorepo setup)
import { addEnrichmentJob } from '@verseforge/backend/infrastructure/queue/bullmqQueue.js';
import { storeRawText } from '../pipeline/storeRawText.js';
import { generateId } from '../../../shared/utils/generateId.js';
import { pipelineTasks, PIPELINE_TASKS } from '../../../shared/utils/pipelineTasks.js';
// PIPELINE_TASKS now exported from shared/utils/pipelineTasks.ts
import { selectBestModel } from '../../orchestrator/ModelSelector.js';

// Helper: send SSE event
function sendSSE(res: Response, event: string, data: any) {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
}

// --- Manual Post-Chunking Controller ---
import { manualPostChunking } from './manualPostChunkingController.js';

export { manualPostChunking };


import { chunkTextByParagraph, groupChunks } from '../services/ragChunker.js';
import { parseMarkdownBlocks } from '../services/ragParsers/markdownParser.js';
import { sendIngestionResponse } from './ragCommonController.js';
import * as ragNodeService from '../services/ragNodeService.js';
import { aiSummarizeChunk } from '../services/aiSummarizer.js';
import { aiExtractEntitiesFromChunk, extractEntitiesFromSummary } from '../services/entityExtractor.js';
import { aiExtractRelationshipsFromChunk } from '../services/relationshipExtractor.js';
import { aiExtractLoreFromChunk } from '../services/loreExtractor.js';
import { aiExtractDialogueFromChunk } from '../services/dialogueExtractor.js';
import { aiClassifyMoodAndThemeFromChunk } from '../services/moodThemeClassifier.js';
import { aiGenerateCharacterMemories } from '../services/aiGenerateCharacterMemories.js';
// ...existing code...

/**
 * Controller for RAG text ingestion and file/chunk versioning
 * Handles POST /api/rag/ingest/text and file version endpoints
 */
// Import (or stub) file storage and diff utilities
// import * as fileStorage from '../rag/core/fileStorage';
// import * as chunkDiff from '../rag/core/chunkDiff';

export const ragTextController = {
    /**
     * Get file version history
     * GET /api/rag/files/versions/:fileId
     */
    async getFileVersions(req: Request, res: Response) {
        const { fileId } = req.params;
        try {
            const versions = await ragNodeService.getFileVersions(fileId);
            res.json({ versions });
        } catch (err) {
            res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
        }
    },

    /**
     * Get diff preview for a file version
     * GET /api/rag/files/diff-preview/:versionId
     */
    async getFileDiffPreview(req: Request, res: Response) {
        const { versionId } = req.params;
        try {
            const diff = await ragNodeService.getFileDiffPreview(versionId);
            res.json(diff);
        } catch (err) {
            res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
        }
    },

    /**
     * Diff between two file versions (stub)
     * GET /api/rag/files/diff/:versionA/:versionB
     */
    async getFileDiffBetweenVersions(req: Request, res: Response) {
        const { versionA, versionB } = req.params;
        try {
            const diff = await ragNodeService.getFileDiffBetweenVersions(versionA, versionB);
            res.json(diff);
        } catch (err) {
            res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
        }
    },

    /**
     * Rollback to a previous file version
     * POST /api/rag/files/rollback/:versionId
     */
    async rollbackFileToVersion(req: Request, res: Response) {
        const { versionId } = req.params;
        try {
            await ragNodeService.rollbackFileToVersion(versionId);
            res.json({ message: `Rolled back to version ${versionId}` });
        } catch (err) {
            res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
        }
    },

    /**
     * Migrate content from a file version
     * POST /api/rag/files/migrate/:versionId
     */
    async migrateFileVersion(req: Request, res: Response) {
        const { versionId } = req.params;
        try {
            await ragNodeService.migrateFileVersion(versionId, req.body);
            res.json({ message: `Migrated content from version ${versionId}` });
        } catch (err) {
            res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
        }
    },

    /**
     * Controller Entry & Initial Validation for distributed pipeline
     * POST /api/rag/ingest/text (or SSE endpoint)
     * Step 1 of distributed pipeline: Accept, validate, and prepare metadata/context
     */

    ingestText: async (req: Request, res: Response) => {
        try {
            // Accept both JSON and form-data
            const isPost = req.method === 'POST';
            let content: string | undefined;
            let metadata: any = {};
            let chunkSize: number = 1000;
            let type: string | undefined;
            if (isPost) {
                content = req.body.content;
                metadata = req.body.metadata || {};
                chunkSize = req.body.chunkSize || 1000;
                type = req.body.type;
            } else {
                // For GET/SSE endpoints (future-proof)
                content = typeof req.query.content === 'string' ? req.query.content : undefined;
                chunkSize = req.query.chunkSize ? Number(req.query.chunkSize) : 1000;
                type = typeof req.query.type === 'string' ? req.query.type : undefined;
                if (typeof req.query.metadata === 'string') {
                    try {
                        metadata = JSON.parse(req.query.metadata);
                    } catch {
                        metadata = {};
                    }
                } else {
                    metadata = {
                        universeId: req.query.universeId,
                        userId: req.query.userId,
                        model: req.query.model
                    };
                }
            }

            // --- Validation ---
            if (!content || typeof content !== 'string' || !content.trim()) {
                return res.status(400).json({ error: 'Missing or empty content' });
            }
            if (!metadata.universeId) {
                return res.status(400).json({ error: 'Missing universeId in metadata' });
            }
            if (!metadata.userId) {
                return res.status(400).json({ error: 'Missing userId in metadata' });
            }
            // Optionally validate bookId/chapterId/model if required

            // --- API/Event Versioning ---
            const API_VERSION = 'v1';
            const EVENT_VERSION = 'v1';

            // --- Pipeline Session/Run ID ---
            const pipelineSessionId = generateId();

            // --- Orchestrator Model Selection ---
            if (!metadata.model) {
                // Select best model for this pipeline (task: 'rag_ingest')
                metadata.model = await selectBestModel({
                    task: 'rag_ingest',
                    universeId: metadata.universeId,
                    userId: metadata.userId,
                });
            }

            // --- Prepare pipeline context (step 1 only) ---
            const pipelineContext = {
                sessionId: pipelineSessionId,
                content,
                metadata,
                chunkSize,
                type,
                receivedAt: new Date().toISOString(),
                apiVersion: API_VERSION,
                eventVersion: EVENT_VERSION,
            };

            // --- Enhanced Streaming: Emit pipeline_overview ---
            // (If this is an SSE request, emit overview of all tasks with friendly names)
            // Always emit pipeline_overview (SSE context)
            const overview = {
                tasks: PIPELINE_TASKS.map((t) => ({
                    task: t.key,
                    status: 'not_queued',
                    friendlyName: t.friendlyName
                }))
            };
            sendSSE(res, 'pipeline_overview', overview);

            // --- Enqueue storeRawText job in BullMQ ---
            const jobId = generateId();
            const jobPayload = {
                universeId: metadata.universeId,
                bookId: metadata.bookId,
                chapterId: metadata.chapterId,
                text: content,
                submittedBy: metadata.userId,
                timestamp: new Date(),
                sessionId: pipelineSessionId,
                apiVersion: API_VERSION,
                eventVersion: EVENT_VERSION
            };
            // Version is always 1 for initial job
            const job = {
                id: jobId,
                chunkId: metadata.chapterId || metadata.bookId,
                type: 'storeRawText',
                payload: jobPayload,
                version: 1,
                metadata: {
                    sessionId: pipelineSessionId,
                    apiVersion: API_VERSION,
                    eventVersion: EVENT_VERSION
                },
                dependencies: []
            };
            await addEnrichmentJob('storeRawText', job);

            // --- Enqueue chunkText job in BullMQ, dependent on storeRawText completion ---
            const chunkJobId = generateId();
            const chunkJobPayload = {
                universeId: metadata.universeId,
                bookId: metadata.bookId,
                chapterId: metadata.chapterId,
                text: content,
                submittedBy: metadata.userId,
                parentVersion: 1,
                sessionId: pipelineSessionId,
                apiVersion: API_VERSION,
                eventVersion: EVENT_VERSION
            };
            const chunkJob = {
                id: chunkJobId,
                chunkId: metadata.chapterId || metadata.bookId,
                type: 'chunkText',
                payload: chunkJobPayload,
                version: 1,
                metadata: {
                    sessionId: pipelineSessionId,
                    apiVersion: API_VERSION,
                    eventVersion: EVENT_VERSION
                },
                dependencies: [jobId]
            };
            await addEnrichmentJob('chunkText', chunkJob);

            // --- Enqueue summarizeChunk jobs (parallel), dependent on chunkText completion ---
            // We enqueue a meta-job for orchestrator, as before
            const summarizeMetaJobId = generateId();
            const summarizeMetaJobPayload = {
                universeId: metadata.universeId,
                bookId: metadata.bookId,
                chapterId: metadata.chapterId,
                submittedBy: metadata.userId,
                sessionId: pipelineSessionId,
                apiVersion: API_VERSION,
                eventVersion: EVENT_VERSION,
            };
            const summarizeMetaJob = {
                id: summarizeMetaJobId,
                chunkId: metadata.chapterId || metadata.bookId,
                type: 'summarizeChunkMeta',
                payload: summarizeMetaJobPayload,
                version: 1,
                metadata: {
                    sessionId: pipelineSessionId,
                    apiVersion: API_VERSION,
                    eventVersion: EVENT_VERSION
                },
                dependencies: [chunkJobId]
            };
            await addEnrichmentJob('summarizeChunkMeta', summarizeMetaJob);

            // --- Enqueue groupChunks meta-job, dependent on all summarizeChunk jobs ---
            const groupChunksMetaJobId = generateId();
            const groupChunksMetaJobPayload = {
                universeId: metadata.universeId,
                bookId: metadata.bookId,
                chapterId: metadata.chapterId,
                submittedBy: metadata.userId,
                sessionId: pipelineSessionId,
                apiVersion: API_VERSION,
                eventVersion: EVENT_VERSION,
            };
            const groupChunksMetaJob = {
                id: groupChunksMetaJobId,
                chunkId: metadata.chapterId || metadata.bookId,
                type: 'groupChunksMeta',
                payload: groupChunksMetaJobPayload,
                version: 1,
                metadata: {
                    sessionId: pipelineSessionId,
                    apiVersion: API_VERSION,
                    eventVersion: EVENT_VERSION
                },
                dependencies: [summarizeMetaJobId]
            };
            await addEnrichmentJob('groupChunksMeta', groupChunksMetaJob);

            // --- Enqueue summarizeSuperChunk meta-job, dependent on groupChunksMeta completion ---
            const summarizeSuperChunkMetaJobId = generateId();
            const summarizeSuperChunkMetaJobPayload = {
                universeId: metadata.universeId,
                bookId: metadata.bookId,
                chapterId: metadata.chapterId,
                submittedBy: metadata.userId,
                sessionId: pipelineSessionId,
                apiVersion: API_VERSION,
                eventVersion: EVENT_VERSION,
            };
            const summarizeSuperChunkMetaJob = {
                id: summarizeSuperChunkMetaJobId,
                chunkId: metadata.chapterId || metadata.bookId,
                type: 'summarizeSuperChunkMeta',
                payload: summarizeSuperChunkMetaJobPayload,
                version: 1,
                metadata: {
                    sessionId: pipelineSessionId,
                    apiVersion: API_VERSION,
                    eventVersion: EVENT_VERSION
                },
                dependencies: [groupChunksMetaJobId]
            };
            await addEnrichmentJob('summarizeSuperChunkMeta', summarizeSuperChunkMetaJob);

            // --- Enqueue downstream AI task jobs (entity, relationship, lore, dialogue, mood/theme, timeline, character memory) ---
            // All downstream jobs depend on summarizeSuperChunkMeta
            const aiEntityExtractionJobId = generateId();
            const aiEntityExtractionJob = {
                id: aiEntityExtractionJobId,
                chunkId: metadata.chapterId || metadata.bookId,
                type: 'aiEntityExtraction',
                payload: {
                    universeId: metadata.universeId,
                    bookId: metadata.bookId,
                    chapterId: metadata.chapterId,
                    submittedBy: metadata.userId,
                    sessionId: pipelineSessionId,
                    apiVersion: API_VERSION,
                    eventVersion: EVENT_VERSION
                },
                version: 1,
                metadata: {
                    sessionId: pipelineSessionId,
                    apiVersion: API_VERSION,
                    eventVersion: EVENT_VERSION
                },
                dependencies: [summarizeSuperChunkMetaJobId]
            };
            await addEnrichmentJob('aiEntityExtraction', aiEntityExtractionJob);

            const aiRelationshipExtractionJobId = generateId();
            const aiRelationshipExtractionJob = {
                id: aiRelationshipExtractionJobId,
                chunkId: metadata.chapterId || metadata.bookId,
                type: 'aiRelationshipExtraction',
                payload: {
                    universeId: metadata.universeId,
                    bookId: metadata.bookId,
                    chapterId: metadata.chapterId,
                    submittedBy: metadata.userId,
                    sessionId: pipelineSessionId,
                    apiVersion: API_VERSION,
                    eventVersion: EVENT_VERSION
                },
                version: 1,
                metadata: {
                    sessionId: pipelineSessionId,
                    apiVersion: API_VERSION,
                    eventVersion: EVENT_VERSION
                },
                dependencies: [aiEntityExtractionJobId]
            };
            await addEnrichmentJob('aiRelationshipExtraction', aiRelationshipExtractionJob);

            const aiLoreExtractionJobId = generateId();
            const aiLoreExtractionJob = {
                id: aiLoreExtractionJobId,
                chunkId: metadata.chapterId || metadata.bookId,
                type: 'aiLoreExtraction',
                payload: {
                    universeId: metadata.universeId,
                    bookId: metadata.bookId,
                    chapterId: metadata.chapterId,
                    submittedBy: metadata.userId,
                    sessionId: pipelineSessionId,
                    apiVersion: API_VERSION,
                    eventVersion: EVENT_VERSION
                },
                version: 1,
                metadata: {
                    sessionId: pipelineSessionId,
                    apiVersion: API_VERSION,
                    eventVersion: EVENT_VERSION
                },
                dependencies: [aiRelationshipExtractionJobId]
            };
            await addEnrichmentJob('aiLoreExtraction', aiLoreExtractionJob);

            const aiDialogueExtractionJobId = generateId();
            const aiDialogueExtractionJob = {
                id: aiDialogueExtractionJobId,
                chunkId: metadata.chapterId || metadata.bookId,
                type: 'aiDialogueExtraction',
                payload: {
                    universeId: metadata.universeId,
                    bookId: metadata.bookId,
                    chapterId: metadata.chapterId,
                    submittedBy: metadata.userId,
                    sessionId: pipelineSessionId,
                    apiVersion: API_VERSION,
                    eventVersion: EVENT_VERSION
                },
                version: 1,
                metadata: {
                    sessionId: pipelineSessionId,
                    apiVersion: API_VERSION,
                    eventVersion: EVENT_VERSION
                },
                dependencies: [aiLoreExtractionJobId]
            };
            await addEnrichmentJob('aiDialogueExtraction', aiDialogueExtractionJob);

            const aiMoodThemeClassificationJobId = generateId();
            const aiMoodThemeClassificationJob = {
                id: aiMoodThemeClassificationJobId,
                chunkId: metadata.chapterId || metadata.bookId,
                type: 'aiMoodThemeClassification',
                payload: {
                    universeId: metadata.universeId,
                    bookId: metadata.bookId,
                    chapterId: metadata.chapterId,
                    submittedBy: metadata.userId,
                    sessionId: pipelineSessionId,
                    apiVersion: API_VERSION,
                    eventVersion: EVENT_VERSION
                },
                version: 1,
                metadata: {
                    sessionId: pipelineSessionId,
                    apiVersion: API_VERSION,
                    eventVersion: EVENT_VERSION
                },
                dependencies: [aiDialogueExtractionJobId]
            };
            await addEnrichmentJob('aiMoodThemeClassification', aiMoodThemeClassificationJob);

            const aiTimelineExtractionJobId = generateId();
            const aiTimelineExtractionJob = {
                id: aiTimelineExtractionJobId,
                chunkId: metadata.chapterId || metadata.bookId,
                type: 'aiTimelineExtraction',
                payload: {
                    universeId: metadata.universeId,
                    bookId: metadata.bookId,
                    chapterId: metadata.chapterId,
                    submittedBy: metadata.userId,
                    sessionId: pipelineSessionId,
                    apiVersion: API_VERSION,
                    eventVersion: EVENT_VERSION
                },
                version: 1,
                metadata: {
                    sessionId: pipelineSessionId,
                    apiVersion: API_VERSION,
                    eventVersion: EVENT_VERSION
                },
                dependencies: [aiMoodThemeClassificationJobId]
            };
            await addEnrichmentJob('aiTimelineExtraction', aiTimelineExtractionJob);

            const characterMemoryGenerationJobId = generateId();
            const characterMemoryGenerationJob = {
                id: characterMemoryGenerationJobId,
                chunkId: metadata.chapterId || metadata.bookId,
                type: 'characterMemoryGeneration',
                payload: {
                    universeId: metadata.universeId,
                    bookId: metadata.bookId,
                    chapterId: metadata.chapterId,
                    submittedBy: metadata.userId,
                    sessionId: pipelineSessionId,
                    apiVersion: API_VERSION,
                    eventVersion: EVENT_VERSION
                },
                version: 1,
                metadata: {
                    sessionId: pipelineSessionId,
                    apiVersion: API_VERSION,
                    eventVersion: EVENT_VERSION
                },
                dependencies: [aiTimelineExtractionJobId]
            };
            await addEnrichmentJob('characterMemoryGeneration', characterMemoryGenerationJob);

            // --- Respond with initial pipeline context, session ID, and job info ---
            return res.status(200).json({
                message: 'Pipeline request accepted',
                sessionId: pipelineSessionId,
                apiVersion: API_VERSION,
                eventVersion: EVENT_VERSION,
                context: pipelineContext,
                initialJobs: [
                    {
                        jobId,
                        type: 'storeRawText',
                        payload: jobPayload,
                        version: 1
                    },
                    {
                        jobId: chunkJobId,
                        type: 'chunkText',
                        payload: chunkJobPayload,
                        version: 1,
                        dependsOn: [jobId]
                    },
                    {
                        jobId: summarizeMetaJobId,
                        type: 'summarizeChunkMeta',
                        payload: summarizeMetaJobPayload,
                        version: 1,
                        dependsOn: [chunkJobId]
                    },
                    {
                        jobId: groupChunksMetaJobId,
                        type: 'groupChunksMeta',
                        payload: groupChunksMetaJobPayload,
                        version: 1,
                        dependsOn: [summarizeMetaJobId]
                    },
                    {
                        jobId: summarizeSuperChunkMetaJobId,
                        type: 'summarizeSuperChunkMeta',
                        payload: summarizeSuperChunkMetaJobPayload,
                        version: 1,
                        dependsOn: [groupChunksMetaJobId]
                    },
                    {
                        jobId: aiEntityExtractionJobId,
                        type: 'aiEntityExtraction',
                        payload: aiEntityExtractionJob.payload,
                        version: 1,
                        dependsOn: [summarizeSuperChunkMetaJobId]
                    },
                    {
                        jobId: aiRelationshipExtractionJobId,
                        type: 'aiRelationshipExtraction',
                        payload: aiRelationshipExtractionJob.payload,
                        version: 1,
                        dependsOn: [aiEntityExtractionJobId]
                    },
                    {
                        jobId: aiLoreExtractionJobId,
                        type: 'aiLoreExtraction',
                        payload: aiLoreExtractionJob.payload,
                        version: 1,
                        dependsOn: [aiRelationshipExtractionJobId]
                    },
                    {
                        jobId: aiDialogueExtractionJobId,
                        type: 'aiDialogueExtraction',
                        payload: aiDialogueExtractionJob.payload,
                        version: 1,
                        dependsOn: [aiLoreExtractionJobId]
                    },
                    {
                        jobId: aiMoodThemeClassificationJobId,
                        type: 'aiMoodThemeClassification',
                        payload: aiMoodThemeClassificationJob.payload,
                        version: 1,
                        dependsOn: [aiDialogueExtractionJobId]
                    },
                    {
                        jobId: aiTimelineExtractionJobId,
                        type: 'aiTimelineExtraction',
                        payload: aiTimelineExtractionJob.payload,
                        version: 1,
                        dependsOn: [aiMoodThemeClassificationJobId]
                    },
                    {
                        jobId: characterMemoryGenerationJobId,
                        type: 'characterMemoryGeneration',
                        payload: characterMemoryGenerationJob.payload,
                        version: 1,
                        dependsOn: [aiTimelineExtractionJobId]
                    }
                ]
            });
        } catch (err) {
            return res.status(500).json({ error: err instanceof Error ? err.message : String(err) });
        }
    },
    /**
     * SSE version: streams progress for every pipeline step
     */
    ingestTextStream: async (req: Request, res: Response, _next: NextFunction) => {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders && res.flushHeaders();
        try {
            // Support GET (EventSource) and POST (testing, future-proof)
            let content: string | undefined;
            let chunkSize: number = 1000;
            let metadata: any = {};
            let type: string | undefined;
            if (req.method === 'GET') {
                content = typeof req.query.content === 'string' ? req.query.content : undefined;
                chunkSize = req.query.chunkSize ? Number(req.query.chunkSize) : 1000;
                type = typeof req.query.type === 'string' ? req.query.type : undefined;
                if (typeof req.query.metadata === 'string') {
                    try {
                        metadata = JSON.parse(req.query.metadata);
                    } catch {
                        metadata = {};
                    }
                } else {
                    // Accept flat universeId, userId, model as query params
                    metadata = {
                        universeId: req.query.universeId,
                        userId: req.query.userId,
                        model: req.query.model
                    };
                }
            } else {
                // POST fallback
                content = req.body.content;
                chunkSize = req.body.chunkSize || 1000;
                metadata = req.body.metadata || {};
                type = req.body.type;
            }
            if (!content) throw new Error('Missing content');

            // --- Orchestrator Model Selection ---
            if (!metadata.model) {
                metadata.model = await selectBestModel({
                    task: 'rag_ingest',
                    universeId: metadata.universeId,
                    userId: metadata.userId,
                });
            }

            // --- Enhanced Streaming: Emit pipeline_overview ---
            sendSSE(res, 'pipeline_overview', {
                tasks: PIPELINE_TASKS.map(t => ({
                    task: t.key,
                    status: 'not_queued',
                    friendlyName: t.friendlyName
                }))
            });

            let chunks: string[];
            if (type === 'markdown') {
                const blocks = parseMarkdownBlocks(content);
                chunks = groupChunks(blocks, chunkSize);
            } else {
                chunks = chunkTextByParagraph(content, chunkSize);
            }
            sendSSE(res, 'chunking', { totalChunks: chunks.length });
            // 1. Write chunks to RAG nodes in the selected universe
            const universeId = metadata?.universeId || 'default-universe';
            const model = metadata?.model || 'default-model';
            const userId = metadata?.userId || 'unknown-user';
            const chunkNodeIds: string[] = [];
            for (let i = 0; i < chunks.length; i++) {
                const chunkContent = chunks[i];
                sendSSE(res, 'chunk', { index: i, textLength: chunkContent.length });
                const now = new Date();
                const node = await ragNodeService.createNode({
                    type: 'source_chunk',
                    title: `Chunk ${i + 1}`,
                    content: { description: chunkContent },
                    summaries: { brief: '', medium: '', detailed: '' },
                    embeddings: [],
                    metadata: {
                        universeId,
                        ownerId: userId,
                        tags: ['story', 'chunk'],
                        sensitivity: 'public',
                        version: 1,
                        bookId: metadata?.bookId,
                        chapterId: metadata?.chapterId
                    },
                    privacy: { encrypted: false, shareable: true },
                    timestamps: { created: now, modified: now },
                    active: true
                });
                chunkNodeIds.push(node.id);
                sendSSE(res, 'node_created', { nodeId: node.id });

                // --- Hierarchical relationships ---
                // If chapterId is provided, link chunk -> chapter, chapter -> book, book -> universe
                // If only bookId is provided (no chapter), link chunk -> book, book -> universe
                if (metadata?.chapterId) {
                    await ragNodeService.createRelationship({
                        fromNodeId: node.id,
                        toNodeId: metadata.chapterId,
                        type: 'hierarchical',
                        weight: 1,
                        metadata: { description: 'Chunk belongs to chapter', universeId, attributes: {} },
                        privacy: { encrypted: false, visibility: 'public' },
                        timestamps: { created: now, modified: now }
                    });
                    if (metadata?.bookId) {
                        await ragNodeService.createRelationship({
                            fromNodeId: metadata.chapterId,
                            toNodeId: metadata.bookId,
                            type: 'hierarchical',
                            weight: 1,
                            metadata: { description: 'Chapter belongs to book', universeId, attributes: {} },
                            privacy: { encrypted: false, visibility: 'public' },
                            timestamps: { created: now, modified: now }
                        });
                    }
                } else if (metadata?.bookId) {
                    // No chapter: link chunk directly to book
                    await ragNodeService.createRelationship({
                        fromNodeId: node.id,
                        toNodeId: metadata.bookId,
                        type: 'hierarchical',
                        weight: 1,
                        metadata: { description: 'Chunk belongs to book (no chapter)', universeId, attributes: {} },
                        privacy: { encrypted: false, visibility: 'public' },
                        timestamps: { created: now, modified: now }
                    });
                }
                // Always link book -> universe if both are present
                if (metadata?.bookId && universeId) {
                    const universeNode = await ragNodeService.findNodeByUniverseAndType(universeId, 'universe');
                    if (universeNode) {
                        await ragNodeService.createRelationship({
                            fromNodeId: metadata.bookId,
                            toNodeId: universeNode.id,
                            type: 'hierarchical',
                            weight: 1,
                            metadata: { description: 'Book belongs to universe', universeId, attributes: {} },
                            privacy: { encrypted: false, visibility: 'public' },
                            timestamps: { created: now, modified: now }
                        });
                    }
                }
            }
            // 2. For each chunk: summarize and extract entities using the selected AI
            const chunkSummaries: { nodeId: string, summary: any, entities: any[], relationships: any[], entityMetadata: any[] }[] = [];
            const allEntities: any[] = [];
            const allRelationships: any[] = [];
            const allLore: any[] = [];
            const allDialogue: any[] = [];
            for (const nodeId of chunkNodeIds) {
                const node = await ragNodeService.getNodeById(nodeId);
                if (!node) continue;
                sendSSE(res, 'summarizing', { nodeId });
                const summary = await aiSummarizeChunk(node.content.description, { model, universeId });
                await ragNodeService.updateNode(nodeId, { summaries: { brief: summary.summary, medium: '', detailed: '' } });
                sendSSE(res, 'summary', { nodeId, summary });
                sendSSE(res, 'extracting_entities', { nodeId });
                const entities = await aiExtractEntitiesFromChunk(node.content.description, { model, universeId });
                for (const entity of entities) {
                    const entityNode = await ragNodeService.createOrGetEntityNode({
                        ...entity,
                        universeId,
                        ownerId: userId,
                        // Store aliases in attributes for knowledge graph
                        attributes: {
                            ...(entity.attributes || {}),
                            aliases: Array.isArray(entity.aliases) ? entity.aliases : [],
                        },
                        // Always use the rich description if present
                        description: typeof entity.description === 'string' ? entity.description : '',
                    });
                    allEntities.push(entityNode);
                    sendSSE(res, 'entity', { nodeId, entity: entityNode });
                }
                sendSSE(res, 'extracting_relationships', { nodeId });
                const { relationships, entityMetadata } = await aiExtractRelationshipsFromChunk(entities, node.content.description, { model, universeId });
                for (const rel of relationships) {
                    await ragNodeService.createRelationship({
                        fromNodeId: rel.from,
                        toNodeId: rel.to,
                        type: rel.type || 'relates_to',
                        weight: typeof rel.confidence === 'number' ? rel.confidence : 1,
                        metadata: {
                            description: rel.description || rel.source_text || '',
                            universeId,
                            attributes: {
                                confidence: rel.confidence,
                                source_text: rel.source_text,
                                // Store any extra relationship context
                                ...((rel.attributes && typeof rel.attributes === 'object') ? rel.attributes : {})
                            }
                        },
                        privacy: { encrypted: false, visibility: 'public' },
                        timestamps: { created: new Date(), modified: new Date() }
                    });
                    allRelationships.push(rel);
                    sendSSE(res, 'relationship', { nodeId, relationship: rel });
                }
                sendSSE(res, 'extracting_lore', { nodeId });
                const loreResults = await aiExtractLoreFromChunk(node.content.description, { model, universeId });
                if (Array.isArray(loreResults)) {
                    allLore.push(...loreResults);
                    for (const lore of loreResults) sendSSE(res, 'lore', { nodeId, lore });
                }
                sendSSE(res, 'extracting_dialogue', { nodeId });
                const dialogueResults = await aiExtractDialogueFromChunk(node.content.description, { model, universeId });
                if (Array.isArray(dialogueResults)) {
                    allDialogue.push(...dialogueResults);
                    for (const d of dialogueResults) sendSSE(res, 'dialogue', { nodeId, dialogue: d });
                }
                sendSSE(res, 'extracting_mood_theme', { nodeId });
                const moodThemeResults = await aiClassifyMoodAndThemeFromChunk(node.content.description, { model, universeId });
                if (Array.isArray(moodThemeResults)) {
                    for (const mt of moodThemeResults) {
                        sendSSE(res, mt.type === 'mood' ? 'mood' : 'theme', { nodeId, [mt.type]: mt });
                    }
                }
                for (const meta of entityMetadata) {
                    await ragNodeService.updateEntityMetadata(meta.id, meta);
                }
                chunkSummaries.push({ nodeId, summary, entities, relationships, entityMetadata });
            }
            // 4. Set up node relationships (e.g., link characters to chunks, conversations, etc.)
            for (const { nodeId, summary } of chunkSummaries) {
                const entities = extractEntitiesFromSummary(summary);
                for (const entity of entities) {
                    await ragNodeService.createRelationship({
                        fromNodeId: nodeId,
                        toNodeId: entity.id,
                        type: entity.type || 'relates_to',
                        weight: 1,
                        metadata: {
                            description: '',
                            universeId,
                            attributes: {}
                        },
                        privacy: { encrypted: false, visibility: 'public' },
                        timestamps: { created: new Date(), modified: new Date() }
                    });
                    sendSSE(res, 'chunk_entity_link', { nodeId, entityId: entity.id });
                }
            }
            // === Character Memory Generation (Final Step) ===
            // 5. Contextual Cross-Chunk Linking: link lore, timeline, and dialogue nodes to referenced entities/events across all chunks
            // Link lore
            for (const lore of allLore) {
                if (Array.isArray(lore.involved_entities)) {
                    for (const refName of lore.involved_entities) {
                        const target = allEntities.find(e =>
                            e.title?.toLowerCase() === refName.toLowerCase() ||
                            (Array.isArray(e.content?.attributes?.aliases) && e.content.attributes.aliases.some((a: string) => a.toLowerCase() === refName.toLowerCase()))
                        );
                        if (target) {
                            await ragNodeService.createRelationship({
                                fromNodeId: lore.id || lore.name || '', // fallback to name if no id
                                toNodeId: target.id,
                                type: 'reference',
                                weight: 1,
                                metadata: { description: 'Cross-chunk lore/entity link', universeId, attributes: {} },
                                privacy: { encrypted: false, visibility: 'public' },
                                timestamps: { created: new Date(), modified: new Date() }
                            });
                        }
                    }
                }
            }
            // Link dialogue
            for (const dialogue of allDialogue) {
                if (dialogue.speaker) {
                    const speaker = allEntities.find(e =>
                        e.title?.toLowerCase() === dialogue.speaker.toLowerCase() ||
                        (Array.isArray(e.content?.attributes?.aliases) && e.content.attributes.aliases.some((a: string) => a.toLowerCase() === dialogue.speaker.toLowerCase()))
                    );
                    if (speaker) {
                        await ragNodeService.createRelationship({
                            fromNodeId: dialogue.id || '',
                            toNodeId: speaker.id,
                            type: 'spoken_by',
                            weight: 1,
                            metadata: { description: 'Dialogue/speaker cross-chunk link', universeId, attributes: {} },
                            privacy: { encrypted: false, visibility: 'public' },
                            timestamps: { created: new Date(), modified: new Date() }
                        });
                    }
                }
                if (dialogue.target) {
                    const target = allEntities.find(e =>
                        e.title?.toLowerCase() === dialogue.target.toLowerCase() ||
                        (Array.isArray(e.content?.attributes?.aliases) && e.content.attributes.aliases.some((a: string) => a.toLowerCase() === dialogue.target.toLowerCase()))
                    );
                    if (target) {
                        await ragNodeService.createRelationship({
                            fromNodeId: dialogue.id || '',
                            toNodeId: target.id,
                            type: 'addressed_to',
                            weight: 1,
                            metadata: { description: 'Dialogue/target cross-chunk link', universeId, attributes: {} },
                            privacy: { encrypted: false, visibility: 'public' },
                            timestamps: { created: new Date(), modified: new Date() }
                        });
                    }
                }
            }
            // Contextual cross-chunk linking for timeline_marker nodes
            const allTimelineMarkers = allLore.filter(l => l.type === 'timeline_marker');
            const absoluteMarkers = allTimelineMarkers.filter(m => m.date || m.explicit_date);
            const relativeMarkers = allTimelineMarkers.filter(m => m.relative_to);
            // Link timeline_marker to referenced entities/events as before
            for (const marker of allTimelineMarkers) {
                const references = Array.isArray(marker.involved_entities)
                    ? marker.involved_entities
                    : (Array.isArray(marker.references) ? marker.references : []);
                for (const refName of references) {
                    const target = allEntities.find(e =>
                        e.title?.toLowerCase() === refName.toLowerCase() ||
                        (Array.isArray(e.content?.attributes?.aliases) && (e.content.attributes.aliases as string[]).some((a) => a.toLowerCase() === refName.toLowerCase()))
                    );
                    if (target) {
                        await ragNodeService.createRelationship({
                            fromNodeId: marker.id || marker.name || '',
                            toNodeId: target.id,
                            type: 'reference',
                            weight: 1,
                            metadata: { description: 'Cross-chunk timeline_marker/entity link', universeId, attributes: {} },
                            privacy: { encrypted: false, visibility: 'public' },
                            timestamps: { created: new Date(), modified: new Date() }
                        });
                    }
                }
            }

            // --- Robust Temporal Reasoning & Retroactive Timeline Anchoring ---
            // Maintain a stack of timeline markers as we process
            // For each absolute marker, retroactively anchor previous unanchored relative markers
            let lastAbsoluteIdx = -1;
            for (let i = 0; i < allTimelineMarkers.length; i++) {
                const marker = allTimelineMarkers[i];
                const isAbsolute = marker.date || marker.explicit_date;
                if (isAbsolute) {
                    // Retroactively anchor previous unanchored relative markers
                    for (let j = lastAbsoluteIdx + 1; j < i; j++) {
                        const prevMarker = allTimelineMarkers[j];
                        const isRelative = prevMarker.relative_to && !prevMarker.inferred;
                        // Only anchor if not already anchored to an absolute
                        if (isRelative) {
                            // Infer the absolute date if possible (simple: copy absolute date, or mark as inferred)
                            const inferredDate = marker.date || marker.explicit_date;
                            // Update the timeline_marker node with inferred date and mark as inferred
                            if (prevMarker.id) {
                                await ragNodeService.updateNode(prevMarker.id, {
                                    content: {
                                        ...prevMarker.content,
                                        inferred: true,
                                        inferred_from: marker.id || marker.name || '',
                                        explicit_date: inferredDate
                                    }
                                });
                            }
                            // Create a temporal relationship
                            await ragNodeService.createRelationship({
                                fromNodeId: prevMarker.id || prevMarker.name || '',
                                toNodeId: marker.id || marker.name || '',
                                type: 'temporal',
                                weight: 1,
                                metadata: {
                                    description: 'Retroactively anchored relative timeline to absolute marker',
                                    universeId,
                                    attributes: { inferred: true, inferred_from: marker.id || marker.name || '' }
                                },
                                privacy: { encrypted: false, visibility: 'public' },
                                timestamps: { created: new Date(), modified: new Date() }
                            });
                        }
                    }
                    lastAbsoluteIdx = i;
                }
            }

            // Contextual linking: link relative timeline markers to nearest subsequent absolute marker (for forward-only cases)
            for (const relMarker of relativeMarkers) {
                // Find the nearest absolute marker that follows this relative marker in the chunk order
                const relIdx = allTimelineMarkers.indexOf(relMarker);
                let foundAbs: any = null;
                for (let i = relIdx + 1; i < allTimelineMarkers.length; i++) {
                    if (absoluteMarkers.includes(allTimelineMarkers[i])) {
                        foundAbs = allTimelineMarkers[i];
                        break;
                    }
                }
                if (foundAbs) {
                    await ragNodeService.createRelationship({
                        fromNodeId: relMarker.id || relMarker.name || '',
                        toNodeId: foundAbs.id || foundAbs.name || '',
                        type: 'temporal',
                        weight: 1,
                        metadata: { description: 'Relative timeline anchored to absolute marker', universeId, attributes: {} },
                        privacy: { encrypted: false, visibility: 'public' },
                        timestamps: { created: new Date(), modified: new Date() }
                    });
                }
            }
            const characterNodes = allEntities.filter(e => e.type === 'character');
            const characterMemories: Record<string, any[]> = {};
            for (const charNode of characterNodes) {
                const relatedEvents = [];
                for (const d of allDialogue) {
                    if (d.speaker && d.speaker === charNode.title) {
                        relatedEvents.push({ type: 'dialogue', content: d.quote, context: d.context });
                    }
                }
                for (const l of allLore) {
                    if (l.involved_entities && Array.isArray(l.involved_entities) && l.involved_entities.includes(charNode.title)) {
                        relatedEvents.push({ type: 'lore', content: l.description || l.name || '', context: l.source || '' });
                    }
                }
                characterMemories[charNode.id] = await aiGenerateCharacterMemories(charNode, relatedEvents, { model, universeId });
                sendSSE(res, 'character_memory', { characterId: charNode.id });
            }
            // Final event: done
            sendSSE(res, 'done', { message: 'Pipeline complete' });
            res.end();
        } catch (err) {
            sendSSE(res, 'error', { message: err instanceof Error ? err.message : String(err) });
            res.end();
        }
    },


    /**
     * Entity Deduplication & Cross-Chunk Linking
     * Called after all entity extraction jobs complete.
     * Deduplicates entities by name, alias, and key attributes, merges or links duplicates, and persists unique entities.
     * Also links entities, dialogue, lore, and timeline markers across chunks.
     */
    async deduplicateAndLinkEntities(sessionId: string, universeId: string) {
        // 1. Fetch all entity nodes for this session/universe
        const allEntities = await ragNodeService.getAllEntitiesForSession(sessionId, universeId);
        // 2. Deduplicate by name, alias, and type
        const uniqueEntities: any[] = [];
        const seenKeys = new Set<string>();
        for (const entity of allEntities) {
            const key = `${entity.type}|${entity.title.toLowerCase()}`;
            const aliases: string[] = Array.isArray(entity.content?.attributes?.aliases)
                ? entity.content.attributes.aliases.map((a: string) => a.toLowerCase())
                : [];
            if (seenKeys.has(key) || aliases.some(a => seenKeys.has(`${entity.type}|${a}`))) {
                // Find the canonical entity and link this duplicate to it
                const canonical = uniqueEntities.find(e =>
                    e.type === entity.type &&
                    (e.title.toLowerCase() === entity.title.toLowerCase() ||
                        (Array.isArray(e.content?.attributes?.aliases) &&
                            e.content.attributes.aliases.map((a: string) => a.toLowerCase()).some((a: string) => aliases.includes(a)))
                    )
                );
                if (canonical) {
                    await ragNodeService.createRelationship({
                        fromNodeId: entity.id,
                        toNodeId: canonical.id,
                        type: 'duplicate_of',
                        weight: 1,
                        metadata: { description: 'Deduplicated entity', universeId, attributes: {} },
                        privacy: { encrypted: false, visibility: 'public' },
                        timestamps: { created: new Date(), modified: new Date() }
                    });
                }
                continue;
            }
            seenKeys.add(key);
            for (const a of aliases) seenKeys.add(`${entity.type}|${a}`);
            uniqueEntities.push(entity);
        }
        // 3. Persist unique entities (if not already persisted)
        for (const entity of uniqueEntities) {
            await ragNodeService.updateNode(entity.id, { metadata: { ...entity.metadata, deduplicated: true } });
        }
        // 4. Cross-chunk linking: link entities with the same name/alias across chunks
        for (const entity of uniqueEntities) {
            for (const other of uniqueEntities) {
                if (entity.id !== other.id && entity.type === other.type) {
                    const nameMatch = entity.title.toLowerCase() === other.title.toLowerCase();
                    const aliasMatch = Array.isArray(entity.content?.attributes?.aliases) &&
                        Array.isArray(other.content?.attributes?.aliases) &&
                        entity.content.attributes.aliases.map((a: string) => a.toLowerCase()).some((a: string) =>
                            other.content.attributes.aliases.map((b: string) => b.toLowerCase()).includes(a)
                        );
                    if (nameMatch || aliasMatch) {
                        await ragNodeService.createRelationship({
                            fromNodeId: entity.id,
                            toNodeId: other.id,
                            type: 'cross_chunk_link',
                            weight: 1,
                            metadata: { description: 'Cross-chunk entity link', universeId, attributes: {} },
                            privacy: { encrypted: false, visibility: 'public' },
                            timestamps: { created: new Date(), modified: new Date() }
                        });
                    }
                }
            }
        }
        // 5. Optionally, emit SSE events for deduplication and linking
        // (Assume you have access to a response object or event emitter)
        // sendSSE(res, 'entity_deduplication_complete', { sessionId, universeId, uniqueEntities });
    },

    // (removed duplicate pipeline code)

};
