/**
 * Enhanced Parser Engine for Phase 2 - Text-to-RAG Parser backend service
 * Integrates dual-AI processing, relationship extraction, and confidence filtering
 */

import { EventEmitter } from 'events';
import {
    ProcessingJob,
    ProcessingResult,
    ParsingOptions,
    ParsingContext,
    EnhancedParsedEntity,
    ChunkAnalysis,
    EnhancedParsingOptions,
    DualAiProcessingOptions,
    ConfidenceThresholds,
    FilteringOptions
} from '../core/interfaces.js';
import { EntityType, EntityCandidate } from '../core/entityTypes.js';
import { deduplicateCharacterCandidates, enforceCanonicalCharacterNode } from '../utils/aiDeduplicationHelper.js';
import { TextChunker } from '../utils/textChunker.js';
import { PrimaryParser, PrimaryParseResult } from '../parsers/primaryParser.js';
import { DualAiProcessor, DualAiResult } from '../processors/dualAiProcessor.js';
import { ConfidenceFilter } from '../processors/confidenceFilter.js';
import { RelationshipExtractor } from '../parsers/relationshipExtractor.js';
import { getRAGServiceManager } from '../../../rag/instance.js';
import { logger } from '../../../../../shared/logging/logger.js';

export class ParserEngine extends EventEmitter {
    private primaryParser: PrimaryParser;
    private dualAiProcessor: DualAiProcessor;
    private confidenceFilter: ConfidenceFilter;
    private relationshipExtractor: RelationshipExtractor;
    private ragService: any;
    private aiServerUrl: string;

    constructor(aiServerUrl: string = 'http://localhost:5100') {
        super();
        this.aiServerUrl = aiServerUrl;
        this.primaryParser = new PrimaryParser(aiServerUrl);
        this.dualAiProcessor = new DualAiProcessor(aiServerUrl);
        this.confidenceFilter = new ConfidenceFilter();
        this.relationshipExtractor = new RelationshipExtractor(aiServerUrl);

        // Forward events from dual-AI processor
        this.dualAiProcessor.on('stageUpdate', (stage) => {
            this.emit('processingStage', stage);
        });
        this.dualAiProcessor.on('progressUpdate', (progress) => {
            this.emit('stageProgress', progress);
        });
    }

    /**
     * Initialize the parser engine
     */
    async initialize(): Promise<void> {
        try {
            this.ragService = await getRAGServiceManager();
            logger.info('Enhanced parser engine initialized successfully');
        } catch (error) {
            logger.error(`Failed to initialize parser engine: ${error}`);
            throw error;
        }
    }

    /**
     * Process a text parsing job with Phase 2 enhancements
     */
    /**
     * Process a text parsing job with in-memory character aggregation and deduplication
     */
    async processJob(job: ProcessingJob): Promise<ProcessingResult> {
        const startTime = Date.now();

        logger.info(`Starting enhanced text parsing job ${job.id}`);
        this.emit('jobProgress', job.id, { phase: 'initialization', progress: 0 });

        try {
            // Extract enhanced parsing options from job
            const options = this.extractEnhancedOptionsFromJob(job);
            job.status = 'processing';
            job.progress = { currentChunk: 0, totalChunks: 0, currentPhase: 'chunking' };

            let result: ProcessingResult;
            // --- Step 1: Parse and aggregate all entities in memory ---
            if (options.enableDualAiProcessing) {
                result = await this.processWithDualAi(job, options);
            } else {
                result = await this.processWithPrimaryParser(job, options);
            }



            /**
             * --- Step 2: In-memory candidate aggregation using EntityCandidate<T> ---
             * Aggregates all entity candidates in memory by type, collecting all metadata and references.
             * This structure is extensible for future deduplication/review of other entity types.
             */
            const aggregatedCandidates: Record<string, EntityCandidate[]> = {};
            for (const entity of result.entities) {
                const type = entity.type;
                if (!aggregatedCandidates[type]) {
                    aggregatedCandidates[type] = [];
                }
                // Convert to EntityCandidate structure (future: add more fields as needed)
                const candidate: EntityCandidate = {
                    ...entity,
                    // Optionally map/normalize fields here
                };
                aggregatedCandidates[type].push(candidate);
            }


            // --- Step 3: Deduplicate character candidates (two-stage: heuristic + AI) ---
            let canonicalCharacters: EnhancedParsedEntity[] = [];
            const bookId = (job as any).bookId || (job.options && job.options.bookId);
            const chapterId = (job as any).chapterId || (job.options && job.options.chapterId);
            if (aggregatedCandidates['character'] && aggregatedCandidates['character'].length > 0) {
                // Map EntityCandidate to EnhancedParsedEntity for deduplication
                const characterEntities: EnhancedParsedEntity[] = aggregatedCandidates['character'].map((c) => ({
                    ...c,
                    type: 'character' as const,
                    id: typeof c.id === 'string' && c.id.length > 0 ? c.id : `${job.universeId || 'universe'}-character-${(c.name || c.title || '').toLowerCase().replace(/\s+/g, '-')}`,
                    createdAt: c.createdAt instanceof Date ? c.createdAt : (typeof c.createdAt === 'string' && c.createdAt.length > 0 ? new Date(c.createdAt) : new Date()),
                    updatedAt: c.updatedAt instanceof Date ? c.updatedAt : (typeof c.updatedAt === 'string' && c.updatedAt.length > 0 ? new Date(c.updatedAt) : new Date()),
                    description: typeof c.description === 'string' ? c.description : '',
                    confidence: typeof c.confidence === 'number' ? c.confidence : 0,
                    metadata: c.metadata && typeof c.metadata === 'object' && !Array.isArray(c.metadata) ? c.metadata as Record<string, any> : undefined,
                }));
                // Deduplicate and enforce canonical node structure
                const dedupedCandidates = await deduplicateCharacterCandidates(characterEntities, {
                    universeId: job.universeId,
                    bookId,
                    chapterId
                });
                canonicalCharacters = dedupedCandidates.map((c) => {
                    const node = enforceCanonicalCharacterNode(c, {
                        universeId: job.universeId,
                        bookId,
                        chapterId
                    });
                    return {
                        ...node,
                        id: node.id || `${job.universeId || 'universe'}-character-${(node.name || node.title || '').toLowerCase().replace(/\s+/g, '-')}`,
                        createdAt: node.createdAt || new Date().toISOString(),
                        updatedAt: node.updatedAt || new Date().toISOString(),
                    };
                });
            }

            // --- Step 5: Merge canonical character nodes with other entities (future: deduplicate other types) ---
            // For now, only deduplicate characters; other types are aggregated as-is
            const nonCharacterEntities: EnhancedParsedEntity[] = Object.entries(aggregatedCandidates)
                .filter(([type]) => type !== 'character')
                .flatMap(([, entities]) =>
                    (entities as EntityCandidate[]).map((e) => ({
                        ...e,
                        type: e.type as EntityType,
                        id: typeof e.id === 'string' && e.id.length > 0 ? e.id : `${job.universeId || 'universe'}-${e.type}-${(e.name || e.title || '').toLowerCase().replace(/\s+/g, '-')}`,
                        createdAt: e.createdAt instanceof Date ? e.createdAt : (typeof e.createdAt === 'string' && e.createdAt.length > 0 ? new Date(e.createdAt) : new Date()),
                        updatedAt: e.updatedAt instanceof Date ? e.updatedAt : (typeof e.updatedAt === 'string' && e.updatedAt.length > 0 ? new Date(e.updatedAt) : new Date()),
                        description: typeof e.description === 'string' ? e.description : '',
                        confidence: typeof e.confidence === 'number' ? e.confidence : 0,
                        metadata: e.metadata && typeof e.metadata === 'object' && !Array.isArray(e.metadata) ? e.metadata as Record<string, any> : undefined,
                    }))
                );
            result.entities = [...nonCharacterEntities, ...canonicalCharacters];

            // --- Step 6: Apply confidence filtering if enabled ---
            if (options.confidenceFiltering?.enabled) {
                result = await this.applyConfidenceFiltering(result, options);
            }

            // --- Step 7: Create RAG nodes if requested ---
            if (options.autoCreateRAGNodes) {
                result = await this.createRAGNodesForResult(result, job.universeId, job.userId);
            }

            const processingTime = Date.now() - startTime;
            result.processingTime = processingTime;

            logger.info(`Enhanced text parsing job ${job.id} completed: ${result.entities.length} entities in ${processingTime}ms`);
            this.emit('jobProgress', job.id, { phase: 'completed', progress: 100 });
            return result;
        } catch (error) {
            logger.error(`Enhanced text parsing job ${job.id} failed: ${error}`);
            throw error;
        }
    }

    /**
     * Extract enhanced parsing options from job context
     */
    private extractEnhancedOptionsFromJob(job: ProcessingJob): EnhancedParsingOptions {
        // Default enhanced options with Phase 2 features
        const defaultOptions: EnhancedParsingOptions = {
            useChunking: job.sourceText.length > 2000,
            chunkSize: 2000,
            model: 'llama3.1:8b',
            universeId: job.universeId,
            confidenceThreshold: 0.6,
            enableRelationshipExtraction: true,
            enableContextualUpdates: true,
            autoCreateRAGNodes: true,
            userId: job.userId,
            // Phase 2 enhancements
            enableDualAiProcessing: true,
            dualAiOptions: {
                contextualModel: 'llama3.1:8b',
                enableRelationshipExtraction: true,
                enableEntityRefinement: true,
                crossValidation: true
            },
            confidenceFiltering: {
                enabled: true,
                thresholds: {
                    accept: 0.8,
                    review: 0.6,
                    reject: 0.4,
                    globalMinimum: 0.3
                },
                options: {
                    adaptiveThresholds: true,
                    contextualAdjustment: true
                }
            },
            relationshipExtraction: {
                enabled: true,
                confidenceThreshold: 0.7,
                maxRelationshipsPerEntity: 10
            }
        };

        // Merge with any job-specific options
        if (job.options) {
            return { ...defaultOptions, ...job.options };
        }

        return defaultOptions;
    }

    /**
     * Process job using dual-AI pipeline
     */
    private async processWithDualAi(job: ProcessingJob, options: EnhancedParsingOptions): Promise<ProcessingResult> {
        const startTime = Date.now();

        // Initialize progress tracking
        if (!job.progress) {
            job.progress = {
                currentChunk: 0,
                totalChunks: 0,
                currentPhase: 'initializing'
            };
        }

        // Step 1: Chunk the text
        job.progress.currentPhase = 'chunking';
        this.emit('jobProgress', job.id, { phase: 'chunking', progress: 10 });

        const chunks = this.chunkText(job.sourceText, options);
        if (job.progress) {
            job.progress.totalChunks = chunks.length;
        }

        logger.info(`Processing ${chunks.length} chunks with dual-AI pipeline`);

        // Step 2: Process chunks with dual-AI
        if (job.progress) {
            job.progress.currentPhase = 'dual_ai_processing';
        }
        this.emit('jobProgress', job.id, { phase: 'dual_ai_processing', progress: 20 });

        const allEntities: EnhancedParsedEntity[] = [];
        const chunkAnalyses: ChunkAnalysis[] = [];


        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            job.progress.currentChunk = i + 1;

            this.emit('jobProgress', job.id, {
                phase: 'dual_ai_processing',
                progress: 20 + (70 * (i / chunks.length))
            });

            try {
                // Create a temporary job for this chunk
                const chunkJob: ProcessingJob = {
                    ...job,
                    id: `${job.id}-chunk-${i}`,
                    sourceText: chunk.text
                };

                const dualAiResult: DualAiResult = await this.dualAiProcessor.processJob(
                    chunkJob,
                    {
                        primaryModel: options.model || 'llama3.1:8b',
                        contextualModel: options.dualAiOptions?.contextualModel || 'llama3.1:8b',
                        enableRelationshipExtraction: options.dualAiOptions?.enableRelationshipExtraction || true,
                        enableEntityRefinement: options.dualAiOptions?.enableEntityRefinement,
                        enableContextualUpdates: options.dualAiOptions?.enableContextualUpdates ?? true,
                        crossValidation: options.dualAiOptions?.crossValidation ?? true
                    }
                );

                // Add entities from dual-AI processing
                for (const entity of dualAiResult.entities) {
                    entity.sourceChunk = {
                        index: i,
                        text: chunk.text.substring(0, 200) + '...',
                        startOffset: chunk.startOffset,
                        endOffset: chunk.endOffset
                    };
                    allEntities.push(entity);
                }

                // Add relationships if they exist
                if (dualAiResult.relationships) {
                    for (const relationship of dualAiResult.relationships) {
                        // Associate relationships with their source entities
                        const sourceEntity = allEntities.find(e => e.name === relationship.sourceEntityId);
                        if (sourceEntity) {
                            if (!sourceEntity.relationships) {
                                sourceEntity.relationships = [];
                            }
                            sourceEntity.relationships.push(relationship);
                        }
                    }
                }

                // Store chunk analysis
                chunkAnalyses.push({
                    chunkIndex: i,
                    entities: dualAiResult.entities,
                    entitiesFound: dualAiResult.entities.length,
                    relationshipsFound: dualAiResult.relationships?.length || 0,
                    processingTime: dualAiResult.processingTime || 0,
                    confidence: dualAiResult.confidence ?? 0
                });

                logger.debug(`Chunk ${i + 1}/${chunks.length}: ${dualAiResult.entities.length} entities, ${dualAiResult.relationships?.length || 0} relationships`);

            } catch (error) {
                logger.error(`Failed to process chunk ${i + 1}: ${error}`);
                const errorMessage = error instanceof Error ? error.message : String(error);
                // Continue with other chunks
                chunkAnalyses.push({
                    chunkIndex: i,
                    entities: [],
                    entitiesFound: 0,
                    relationshipsFound: 0,
                    processingTime: 0,
                    confidence: 0,
                    error: errorMessage
                });
            }
        }

        logger.info(`Dual-AI processing completed: ${allEntities.length} entities from ${chunks.length} chunks`);

        // Step 3: Post-process entities
        job.progress.currentPhase = 'post_processing';
        this.emit('jobProgress', job.id, { phase: 'post_processing', progress: 90 });

        const processedEntities = await this.postProcessEntities(allEntities, job.universeId);

        const processingTime = Date.now() - startTime;
        const statistics = this.generateStatistics(processedEntities, processingTime, chunks.length);

        return {
            jobId: job.id,
            entities: processedEntities,
            chunkAnalyses,
            statistics,
            processingTime
        };
    }

    /**
     * Process job using primary parser only (Phase 1 method)
     */
    private async processWithPrimaryParser(job: ProcessingJob, options: EnhancedParsingOptions): Promise<ProcessingResult> {
        const startTime = Date.now();

        // Initialize progress tracking
        if (!job.progress) {
            job.progress = {
                currentChunk: 0,
                totalChunks: 0,
                currentPhase: 'initializing'
            };
        }

        // Step 1: Chunk the text
        job.progress.currentPhase = 'chunking';
        this.emit('jobProgress', job.id, { phase: 'chunking', progress: 10 });

        const chunks = this.chunkText(job.sourceText, options);
        job.progress.totalChunks = chunks.length;

        // Step 2: Parse chunks with primary parser
        job.progress.currentPhase = 'parsing';
        this.emit('jobProgress', job.id, { phase: 'parsing', progress: 20 });

        const allEntities: EnhancedParsedEntity[] = [];
        const chunkAnalyses: ChunkAnalysis[] = [];


        for (let i = 0; i < chunks.length; i++) {
            const chunk = chunks[i];
            job.progress.currentChunk = i + 1;

            this.emit('jobProgress', job.id, {
                phase: 'parsing',
                progress: 20 + (60 * (i / chunks.length))
            });

            try {
                const parseResult: PrimaryParseResult = await this.primaryParser.parseChunk(
                    chunk.text,
                    i,
                    {
                        universeId: options.universeId,
                        processingOptions: options
                    },
                    options.model
                );

                // Add source section information to entities
                for (const entity of parseResult.entities) {
                    entity.sourceChunk = {
                        index: i,
                        text: chunk.text.substring(0, 200) + '...',
                        startOffset: chunk.startOffset,
                        endOffset: chunk.endOffset
                    };
                    allEntities.push(entity);
                }

                // Store chunk analysis
                chunkAnalyses.push({
                    chunkIndex: i,
                    entities: parseResult.entities,
                    entitiesFound: parseResult.entities.length,
                    relationshipsFound: 0, // Primary parser doesn't extract relationships
                    processingTime: parseResult.processingTime,
                    confidence: parseResult.confidence
                });

            } catch (error) {
                logger.error(`Failed to parse chunk ${i + 1}: ${error}`);
                const errorMessage = error instanceof Error ? error.message : String(error);
                chunkAnalyses.push({
                    chunkIndex: i,
                    entities: [],
                    entitiesFound: 0,
                    relationshipsFound: 0,
                    processingTime: 0,
                    confidence: 0,
                    error: errorMessage
                });
            }
        }

        logger.info(`Primary parsing completed: ${allEntities.length} entities from ${chunks.length} chunks`);

        // Step 3: Post-process entities
        job.progress.currentPhase = 'post_processing';
        this.emit('jobProgress', job.id, { phase: 'post_processing', progress: 80 });

        const processedEntities = await this.postProcessEntities(allEntities, job.universeId);

        const processingTime = Date.now() - startTime;
        const statistics = this.generateStatistics(processedEntities, processingTime, chunks.length);

        return {
            jobId: job.id,
            entities: processedEntities,
            chunkAnalyses,
            statistics,
            processingTime
        };
    }

    /**
     * Apply confidence filtering to processing results
     */
    private async applyConfidenceFiltering(
        result: ProcessingResult,
        options: EnhancedParsingOptions
    ): Promise<ProcessingResult> {
        if (!options.confidenceFiltering?.enabled) {
            return result;
        }

        logger.info(`Applying confidence filtering to ${result.entities.length} entities`);

        const filteringOptions = {
            strictMode: false,
            allowLowConfidenceDialogue: true,
            prioritizeUniqueEntities: true,
            adaptiveThresholds: true,
            contextualAdjustment: true,
            thresholds: options.confidenceFiltering.thresholds || {
                accept: 0.8,
                review: 0.6,
                reject: 0.4,
                globalMinimum: 0.3
            },
            ...options.confidenceFiltering.options
        };

        const filteringResult = await this.confidenceFilter.filterEntities(
            result.entities,
            result.relationships || [],
            filteringOptions
        );

        logger.info(`Confidence filtering: ${result.entities.length} -> ${filteringResult.entities.length} entities`);

        return {
            ...result,
            entities: filteringResult.entities,
            relationships: filteringResult.relationships,
            statistics: {
                ...result.statistics,
                confidenceFiltering: {
                    originalCount: result.entities.length,
                    filteredCount: filteringResult.entities.length,
                    rejectedCount: result.entities.length - filteringResult.entities.length
                }
            }
        };
    }

    /**
     * Create RAG nodes for processing result
     */
    private async createRAGNodesForResult(
        result: ProcessingResult,
        universeId: string,
        userId: string
    ): Promise<ProcessingResult> {
        try {
            const ragNodesCreated = await this.createRAGNodes(result.entities, universeId, userId);

            return {
                ...result,
                ragNodesCreated: ragNodesCreated.length > 0 ? ragNodesCreated : undefined,
                statistics: {
                    ...result.statistics,
                    ragNodesCreated: ragNodesCreated.length
                }
            };
        } catch (error) {
            logger.error(`Failed to create RAG nodes: ${error}`);
            return result;
        }
    }

    /**
     * Split text into canonical sections based on options
     */
    private chunkText(text: string, options: ParsingOptions) {
        if (!options.useChunking || text.length <= options.chunkSize) {
            return [{
                sectionIndex: 0,
                text: text,
                startOffset: 0,
                endOffset: text.length,
                wordCount: text.split(/\s+/).length
            }];
        }
        return TextChunker.sectionText(text, {
            maxSectionSize: options.chunkSize,
            overlapSize: Math.min(200, options.chunkSize * 0.1),
            respectSentences: true,
            respectParagraphs: true
        });
    }

    /**
     * Post-process entities for deduplication and enhancement
     */
    private async postProcessEntities(
        entities: EnhancedParsedEntity[],
        universeId: string
    ): Promise<EnhancedParsedEntity[]> {
        // Basic deduplication by name and type
        const entityMap = new Map<string, EnhancedParsedEntity>();

        for (const entity of entities) {
            const key = `${entity.type}:${entity.name.toLowerCase()}`;
            const existing = entityMap.get(key);

            if (existing) {
                // Merge entities - keep the one with higher confidence
                if (entity.confidence > existing.confidence) {
                    // Merge descriptions
                    entity.description = this.mergeDescriptions(existing.description, entity.description);
                    // Merge relationships
                    entity.relationships = this.mergeRelationships(
                        existing.relationships || [],
                        entity.relationships || []
                    );
                    entityMap.set(key, entity);
                } else {
                    // Keep existing but merge information
                    existing.description = this.mergeDescriptions(existing.description, entity.description);
                    existing.relationships = this.mergeRelationships(
                        existing.relationships || [],
                        entity.relationships || []
                    );
                }
            } else {
                entityMap.set(key, entity);
            }
        }

        // Filter by confidence threshold
        const filtered = Array.from(entityMap.values()).filter(entity => entity.confidence >= 0.6);

        logger.debug(`Post-processing: ${entities.length} -> ${filtered.length} entities after deduplication and filtering`);

        return filtered;
    }

    /**
     * Merge entity descriptions intelligently
     */
    private mergeDescriptions(desc1: string, desc2: string): string {
        if (!desc1) return desc2;
        if (!desc2) return desc1;

        // Simple merge - in a real implementation, this would be more sophisticated
        if (desc1.length >= desc2.length) {
            return desc1;
        } else {
            return desc2;
        }
    }

    /**
     * Merge relationship arrays
     */
    private mergeRelationships(rels1: any[], rels2: any[]): any[] {
        const merged = [...rels1];

        for (const rel2 of rels2) {
            const exists = merged.some(rel1 =>
                rel1.targetEntityName === rel2.targetEntityName &&
                rel1.relationshipType === rel2.relationshipType
            );

            if (!exists) {
                merged.push(rel2);
            }
        }

        return merged;
    }

    /**
     * Create RAG nodes from entities
     */
    private async createRAGNodes(
        entities: EnhancedParsedEntity[],
        universeId: string,
        userId: string
    ): Promise<string[]> {
        const createdNodeIds: string[] = [];

        if (!this.ragService) {
            logger.error('RAG service not available for node creation');
            return createdNodeIds;
        }

        for (const entity of entities) {
            try {
                const nodeData = {
                    type: entity.type,
                    content: {
                        name: entity.name,
                        description: entity.description,
                        confidence: entity.confidence,
                        sourceChunk: entity.sourceChunk,
                        extractedFrom: 'text_parser'
                    },
                    metadata: {
                        universeId,
                        title: entity.name,
                        tags: [entity.type, 'auto_extracted'],
                        sensitivity: entity.confidence > 0.8 ? 'low' : 'medium',
                        authorId: userId,
                        extractionMetadata: entity.metadata
                    }
                };

                const createdNode = await this.ragService.createNode(nodeData);
                createdNodeIds.push(createdNode.id);

                logger.debug(`Created RAG node ${createdNode.id} for entity ${entity.name}`);

            } catch (error) {
                logger.error(`Failed to create RAG node for entity ${entity.name}: ${error}`);
                // Continue with other entities
            }
        }

        return createdNodeIds;
    }

    /**
     * Generate processing statistics
     */
    private generateStatistics(
        entities: EnhancedParsedEntity[],
        processingTime: number,
        chunksProcessed: number
    ) {
        const entityTypes: Record<string, number> = {};
        let totalConfidence = 0;

        for (const entity of entities) {
            entityTypes[entity.type] = (entityTypes[entity.type] || 0) + 1;
            totalConfidence += entity.confidence;
        }

        const avgConfidence = entities.length > 0 ? totalConfidence / entities.length : 0;

        return {
            totalEntities: entities.length,
            entityTypes,
            avgConfidence,
            processingTime,
            chunksProcessed
        };
    }
}
