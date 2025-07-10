/**
 * Core interfaces for the Text-to-RAG Parser backend service
 */

import { EntityType, RelationshipType } from './entityTypes.js';

// Alias for backward compatibility
export interface ParsedEntity extends EnhancedParsedEntity { }

/**
 * Canonical enhanced entity structure for Text-to-RAG pipeline.
 * Extensible for advanced AI-powered deduplication, traceability, and future entity types.
 */
export interface EnhancedParsedEntity {
    /** Unique entity ID (canonical, stable across deduplication) */
    id: string;
    /** Canonical entity type (e.g., 'character', 'location', etc.) */
    type: EntityType | 'character';
    /** Canonical name/title of the entity */
    name: string;
    /** Optional display title */
    title?: string;
    /** Description or summary */
    description: string;
    /** Confidence score (0.0-1.0) */
    confidence: number;
    /** Relationships to other entities */
    relationships?: EntityRelationship[];
    /** All available metadata and references */
    metadata?: Record<string, any>;
    /** Source chunk information (for traceability) */
    sourceChunk?: {
        index: number;
        text: string;
        startOffset: number;
        endOffset: number;
    };
    /** Full source text for this entity (optional) */
    sourceText?: string;
    /** Last update timestamp */
    updatedAt: Date;
    /** Creation timestamp */
    createdAt: Date;
    // --- Canonical/character-specific fields ---
    /** Aliases or alternate names */
    aliases?: string[];
    /** Universe ID for canonical linkage */
    universeId?: string;
    /** Book IDs where this entity appears */
    appearanceBookIds?: string[];
    /** Chapter IDs where this entity appears */
    appearanceChapterIds?: string[];
    /** Section IDs where this entity appears */
    appearanceSectionIds?: string[];
    // --- Extensible fields for advanced deduplication and traceability ---
    /** Pronoun/ambiguous reference links for advanced AI deduplication */
    pronounLinks?: string[];
    /** Context window (textual context for this entity, for AI-powered deduplication) */
    contextWindow?: string;
    /** Source references for traceability and provenance */
    sourceReferences?: Array<{
        documentId?: string;
        sectionId?: string;
        offset?: number;
        context?: string;
        extractor?: string;
    }>;
}

export interface EntityRelationship {
    id: string;
    sourceEntityId: string;
    targetEntityId: string;
    targetEntityName: string;
    relationshipType: RelationshipType;
    type: RelationshipType; // Alias for backward compatibility
    description?: string;
    confidence: number;
    sourceContext: string;
    evidence?: string;
    bidirectional?: boolean;
}

export interface ChunkAnalysis {
    chunkIndex: number;
    entitiesFound: number;
    relationshipsFound: number;
    processingTime: number;
    confidence: number;
    error?: string;
    summary?: string;
    tags?: string[];
    characters?: string[];
    locations?: string[];
    organizations?: string[];
    objects?: string[];
    themes?: string[];
    mood?: string;
    pov?: string;
    timelineAnchor?: string;
    dialogues?: Array<{
        speaker: string;
        quote: string;
        context?: string;
    }>;
    unresolvedQuestions?: string[];
    settingDetails?: string;
    entities: EnhancedParsedEntity[];
}

export interface TextChunk {
    index: number;
    text: string;
    startPosition: number;
    endPosition: number;
    wordCount: number;
}

export interface ProcessingJob {
    id: string;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    type: 'text_parsing' | 'entity_extraction' | 'relationship_analysis';
    universeId: string;
    userId: string;
    sourceText: string;
    chunks: TextChunk[];
    results?: ProcessingResult;
    error?: string;
    options?: any; // Phase 2: Additional options
    createdAt: Date;
    startedAt?: Date;
    completedAt?: Date;
    progress?: {
        currentChunk: number;
        totalChunks: number;
        currentPhase: string;
    };
}

export interface ProcessingResult {
    jobId: string;
    entities: EnhancedParsedEntity[];
    confidence?: number; // Overall confidence score
    chunkAnalyses: ChunkAnalysis[];
    statistics: {
        totalEntities: number;
        entityTypes: Record<string, number>;
        avgConfidence: number;
        processingTime: number;
        chunksProcessed: number;
        confidenceFiltering?: {
            originalCount: number;
            filteredCount: number;
            rejectedCount: number;
        };
        ragNodesCreated?: number;
    };
    ragNodesCreated?: string[]; // IDs of created RAG nodes
    processingTime?: number; // Total processing time
    relationships?: EntityRelationship[]; // Phase 2: Extracted relationships
    metadata?: any; // Phase 2: Additional metadata
}

export interface ParsingOptions {
    useChunking: boolean;
    chunkSize: number;
    model: string;
    universeId: string;
    confidenceThreshold: number;
    enableRelationshipExtraction: boolean;
    enableContextualUpdates: boolean;
    autoCreateRAGNodes: boolean;
    userId: string;
    // Phase 2 enhanced options
    enableDualAiProcessing?: boolean;
    dualAiOptions?: any;
    confidenceFiltering?: any;
    relationshipExtraction?: any;
    temperature?: number; // For AI requests
}

export interface EnhancedParsingOptions extends ParsingOptions {
    // Phase 2 enhancements
    enableDualAiProcessing: boolean;
    dualAiOptions?: Partial<DualAiProcessingOptions>;
    confidenceFiltering?: {
        enabled: boolean;
        thresholds?: Partial<ConfidenceThresholds>;
        options?: Partial<FilteringOptions>;
    };
    relationshipExtraction?: {
        enabled: boolean;
        confidenceThreshold: number;
        maxRelationshipsPerEntity?: number;
    };
}

export interface ParsingContext {
    sourceText?: string;
    chunkIndex?: number;
    totalChunks?: number;
    previousEntities?: EnhancedParsedEntity[];
    universeId?: string;
    universeContext?: any;
    userPreferences?: any;
    processingOptions?: EnhancedParsingOptions;
}

export interface QueuedJob {
    job: ProcessingJob;
    priority: number;
    retryCount: number;
    maxRetries: number;
}

// Phase 2 Enhanced Types
export interface DualAiResult {
    entities: EnhancedParsedEntity[];
    relationships: EntityRelationship[];
    processingTime?: number;
    overallConfidence?: number;
    primaryResult?: PrimaryParseResult;
    contextualUpdates?: ContextualUpdateResult;
}

export interface PrimaryParseResult {
    entities: EnhancedParsedEntity[];
    relationships: EntityRelationship[];
    confidence: number;
    processingTime: number;
    overallConfidence?: number;
    requiresContextualUpdate?: boolean;
}

export interface ContextualUpdateResult {
    updatedEntities: EnhancedParsedEntity[];
    newRelationships: EntityRelationship[];
    processingTime: number;
    confidenceAdjustments: Array<{
        entityId: string;
        oldConfidence: number;
        newConfidence: number;
        reason: string;
    }>;
}

export interface FilteringResult {
    entities: EnhancedParsedEntity[];
    relationships: EntityRelationship[];
    statistics: {
        originalCount: number;
        filteredCount: number;
        rejectedCount: number;
        rejectedEntities: Array<{
            entity: EnhancedParsedEntity;
            reason: string;
        }>;
    };
}

export interface ConfidenceThresholds {
    accept: number;
    review: number;
    reject: number;
    entityTypeThresholds?: Partial<Record<EntityType, number>>;
    globalMinimum: number;
}

export interface FilteringOptions {
    strictMode?: boolean;
    allowLowConfidenceDialogue?: boolean;
    prioritizeUniqueEntities?: boolean;
    adaptiveThresholds?: boolean;
    contextualAdjustment?: boolean;
    thresholds?: ConfidenceThresholds;
}

export interface DualAiProcessingOptions {
    // Primary parsing options
    primaryModel: string;
    primaryTemperature?: number;

    // Contextual processing options
    contextualModel: string;
    contextualTemperature?: number;

    // Processing control
    enableRelationshipExtraction: boolean;
    enableEntityRefinement?: boolean;
    enableContextualUpdates?: boolean;
    crossValidation?: boolean;

    // Relationship extraction
    relationshipConfidenceThreshold?: number;
    maxRelationshipsPerEntity?: number;
}

// Character Memory System Interfaces
export interface CharacterMemory {
    id: string;
    characterId: string;
    memoryType: 'trait' | 'relationship' | 'event' | 'knowledge' | 'dialogue' | 'emotion';
    content: string;
    importance: number; // 0-1
    timelineAnchor?: string;
    associatedEntities: string[];
    sourceChunk?: number;
    accessCount: number;
    lastAccessed: Date;
    createdAt: Date;
    updatedAt: Date;

    // Memory source distinction
    memorySource: 'book_extraction' | 'user_interaction' | 'ai_gap_filling';
    canonStatus: 'canon' | 'non_canon' | 'gap_filling';

    // For AI gap-filling memories ("What was Dan doing while this was going on?")
    gapFillingContext?: {
        triggerQuery: string;         // The original "what was X doing" question
        timelineEvent: string;        // The main event happening at this time
        scenarioContext: string;      // Brief description of the scenario being gap-filled
        plausibilityScore: number;    // How believable this gap-filler is (0-1)
        characterConsistency: number; // How well it matches character traits (0-1)
        narrativeHarmony: number;     // How well it fits the story world (0-1)
        evidenceSupport: number;      // How much existing canon supports this (0-1)
        generatedAt: Date;           // When this gap-filler was created
        userApproved?: boolean;       // Has user explicitly approved this gap-filler
        approvalDate?: Date;         // When user approved/rejected this
        reviewNotes?: string;        // User's notes on why they approved/rejected
    };

    // User interaction context (when source is 'user_interaction')
    conversationId?: string;          // Link to the conversation that created this
    affectsTimeline?: boolean;        // Whether this should impact story events (always false for gap-filling)
}

export interface GapFillingRequest {
    characterId: string;
    query: string;                    // "What was X doing while Y happened?"
    timelineContext: string;          // Description of the main event
    timelineAnchor?: string;          // Timeline reference point
    constraints?: {
        mustInclude?: string[];       // Elements that must be included
        mustAvoid?: string[];         // Elements to avoid
        characterFocus?: string[];    // Other characters to consider
        locationConstraints?: string[]; // Where this could/couldn't happen
    };
}

export interface GapFillingResult {
    memory: CharacterMemory;
    alternatives?: CharacterMemory[]; // Other plausible scenarios
    reasoning: string;               // Why this scenario was generated
    evidenceUsed: string[];         // What canon information informed this
    conflictWarnings?: string[];    // Potential conflicts with existing canon
}

export interface MemoryApprovalRequest {
    memoryId: string;
    approved: boolean;
    reviewNotes?: string;
    modifiedContent?: string;       // If user wants to edit the content
}
