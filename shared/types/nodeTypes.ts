/**
 * CharGenMemory - Character Generator Memory format (used by mongoGeneratorService)
 * This type is used for persistent storage and conversion between CharacterMemory and DB format.
 */
export interface CharGenMemory {
    id: string;
    type: 'trait' | 'relationship' | 'event' | 'knowledge' | 'goal';
    content: string;
    importance: number;
    emotional_weight: number;
    related_entities: string[];
    timestamp: Date;
    source: string;
    tags: string[];
    contextual_info?: {
        characterId?: string;
        accessCount?: number;
        lastAccessed?: Date;
        updatedAt?: Date;
        canonStatus?: string;
        timelineAnchor?: string;
        sourceChunk?: number;
        gapFillingContext?: CharacterMemory['gapFillingContext'];
    };
}
/**
 * CharacterMemory - AI/Gap-filling/Interaction memory for a character
 * Used for advanced memory modeling and gap-filling in RAG pipelines.
 */
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

    memorySource: 'book_extraction' | 'user_interaction' | 'ai_gap_filling';
    canonStatus: 'canon' | 'non_canon' | 'gap_filling';

    gapFillingContext?: {
        triggerQuery: string;
        timelineEvent: string;
        scenarioContext: string;
        plausibilityScore: number;
        characterConsistency: number;
        narrativeHarmony: number;
        evidenceSupport: number;
        generatedAt: Date;
        userApproved?: boolean;
        approvalDate?: Date;
        reviewNotes?: string;
    };

    conversationId?: string;
    affectsTimeline?: boolean;
    /**
     * Optional tags for advanced filtering and categorization (added for CharGenMemory compatibility)
     */
    tags?: string[];
}

export interface GapFillingRequest {
    characterId: string;
    query: string;
    timelineContext: string;
    timelineAnchor?: string;
    constraints?: {
        mustInclude?: string[];
        mustAvoid?: string[];
        characterFocus?: string[];
        locationConstraints?: string[];
    };
}

export interface GapFillingResult {
    memory: CharacterMemory;
    alternatives?: CharacterMemory[];
    reasoning: string;
    evidenceUsed: string[];
    conflictWarnings?: string[];
}

export interface MemoryApprovalRequest {
    memoryId: string;
    approved: boolean;
    reviewNotes?: string;
    modifiedContent?: string;
}
/**
 * Shared types for Universe, Book, and Chapter entities.
 * Used by both frontend and backend for strict typing.
 *
 * @module shared/types/nodeTypes
 */

export interface Universe {
    readonly id: string;
    readonly type: 'universe';
    readonly title: string;
    readonly metadata?: Record<string, unknown>;
}

export interface Book {
    readonly id: string;
    readonly type: 'book';
    readonly universeId: string;
    readonly title: string;
    readonly metadata?: Record<string, unknown>;
    readonly chapters?: Chapter[];
}

export interface Chapter {
    readonly id: string;
    readonly type: 'chapter';
    readonly universeId: string;
    readonly bookId: string;
    readonly title: string;
    readonly description?: string;
    readonly content?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Character node type
 * Represents a character in a universe, book, or chapter.
 * @example
 * const character: Character = {
 *   id: 'char-1',
 *   type: 'character',
 *   universeId: 'univ-1',
 *   name: 'Jean-Luc Picard',
 *   aliases: ['Picard', 'Captain Picard'],
 *   appearanceBookIds: ['book-1'],
 *   appearanceChapterIds: ['chap-1'],
 *   metadata: { species: 'Human', rank: 'Captain' }
 * };
 */
export interface Character {
    readonly id: string;
    readonly type: 'character';
    readonly universeId: string;
    readonly name: string;
    readonly aliases?: readonly string[];
    readonly appearanceBookIds?: readonly string[];
    readonly appearanceChapterIds?: readonly string[];
    readonly appearanceSectionIds?: readonly string[];
    readonly description?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Location node type
 * Represents a location in the universe.
 * @example
 * const location: Location = {
 *   id: 'loc-1',
 *   type: 'location',
 *   universeId: 'univ-1',
 *   name: 'Enterprise Bridge',
 *   description: 'Main command center of the USS Enterprise',
 *   metadata: { deck: 1 }
 * };
 */
export interface Location {
    readonly id: string;
    readonly type: 'location';
    readonly universeId: string;
    readonly name: string;
    readonly description?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Item node type
 * Represents an item or artifact in the universe.
 * @example
 * const item: Item = {
 *   id: 'item-1',
 *   type: 'item',
 *   universeId: 'univ-1',
 *   name: 'Phaser',
 *   description: 'Standard Starfleet sidearm',
 *   metadata: { powerLevel: 'stun' }
 * };
 */
export interface Item {
    readonly id: string;
    readonly type: 'item';
    readonly universeId: string;
    readonly name: string;
    readonly description?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Lore node type
 * Represents a lore entry, myth, legend, or worldbuilding fact.
 * @example
 * const lore: Lore = {
 *   id: 'lore-1',
 *   type: 'lore',
 *   universeId: 'univ-1',
 *   title: 'The Prime Directive',
 *   summary: 'Non-interference with developing civilizations',
 *   metadata: { category: 'law' }
 * };
 */
export interface Lore {
    readonly id: string;
    readonly type: 'lore';
    readonly universeId: string;
    readonly title: string;
    readonly summary?: string;
    readonly content?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Species node type
 * Represents a species or race in the universe.
 * @example
 * const species: Species = {
 *   id: 'species-1',
 *   type: 'species',
 *   universeId: 'univ-1',
 *   name: 'Vulcan',
 *   description: 'Logical, telepathic humanoids',
 *   metadata: { homeworld: 'Vulcan' }
 * };
 */
export interface Species {
    readonly id: string;
    readonly type: 'species';
    readonly universeId: string;
    readonly name: string;
    readonly description?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * Faction node type
 * Represents a faction, organization, or group in the universe.
 * @example
 * const faction: Faction = {
 *   id: 'faction-1',
 *   type: 'faction',
 *   universeId: 'univ-1',
 *   name: 'Starfleet',
 *   description: 'Exploration and defense arm of the Federation',
 *   metadata: { founded: 2161 }
 * };
 */
export interface Faction {
    readonly id: string;
    readonly type: 'faction';
    readonly universeId: string;
    readonly name: string;
    readonly description?: string;
    readonly metadata?: Record<string, unknown>;
}

/**
 * TimelineEvent node type
 * Represents an event in the universe timeline.
 * @example
 * const event: TimelineEvent = {
 *   id: 'event-1',
 *   type: 'timeline-event',
 *   universeId: 'univ-1',
 *   title: 'First Contact with Vulcans',
 *   date: '2063-04-05',
 *   description: 'Humans meet Vulcans for the first time',
 *   metadata: { location: 'Montana, Earth' }
 * };
 */
export interface TimelineEvent {
    readonly id: string;
    readonly type: 'timeline-event';
    readonly universeId: string;
    readonly title: string;
    readonly date?: string;
    readonly description?: string;
    readonly metadata?: Record<string, unknown>;
}
/**
 * Node Types - Shared
 *
 * Defines TypeScript interfaces for nodes, node input, and node metadata.
 * Used by shared/node/nodeService and other modules.
 *
 * @module shared/types/nodeTypes
 */

/**
 * Metadata for a node (arbitrary key-value pairs).
 */
export interface NodeMetadata {
    readonly [key: string]: unknown;
}

/**
 * Input shape for creating or upserting a node.
 */
export interface NodeInput {
    /**
     * Node type (must be a valid NodeType string)
     */
    readonly type: NodeType;
    readonly title: string;
    readonly parentId?: string;
    readonly metadata?: NodeMetadata;
}

/**
 * Node type string literal union.
 * Extend as needed for new node types.
 */
export type NodeType =
    | 'universe'
    | 'book'
    | 'chapter'
    | 'scene'
    | 'character'
    | 'location'
    | 'item'
    | 'lore'
    | 'species'
    | 'faction'
    | 'timeline-event'
    | 'note'
    | 'plugin-data'
    | 'ai-model'
    | 'ai-server'
    | 'model-performance';

/**
 * Node relationship mapping interface (extended for RAG compatibility).
 */
export interface NodeRelationship {
    readonly id?: string;
    readonly parentId?: string;
    readonly childIds?: readonly string[];
    readonly fromNodeId?: string;
    readonly toNodeId?: string;
    readonly type?: import('./ragTypes.js').RAGRelationshipType;
    readonly weight?: number;
    readonly metadata?: import('./ragTypes.js').RAGRelationshipMetadata;
    readonly temporal?: import('./ragTypes.js').RAGRelationshipTemporal;
    readonly privacy?: import('./ragTypes.js').RAGRelationshipPrivacy;
    readonly timestamps?: import('./ragTypes.js').RAGTimestamps;
    readonly sourceNodeId?: string;
    readonly targetNodeId?: string;
    readonly relationshipType?: string;
    readonly strength?: number;
    readonly bidirectional?: boolean;
}

/**
 * Node object shape (extended for RAG compatibility).
 */
export interface Node {
    readonly id: string;
    readonly type: NodeType | import('./ragTypes.js').RAGNodeType;
    readonly title: string;
    readonly parentId?: string | null;
    readonly metadata: NodeMetadata | import('./ragTypes.js').RAGNodeMetadata;
    readonly content?: import('./ragTypes.js').RAGNodeContent;
    readonly summaries?: import('./ragTypes.js').RAGNodeSummaries;
    readonly embeddings?: number[];
    readonly privacy?: import('./ragTypes.js').RAGNodePrivacy;
    readonly temporal?: import('./ragTypes.js').RAGTemporalData;
    readonly pluginData?: Record<string, any>;
    readonly timestamps?: import('./ragTypes.js').RAGTimestamps;
    readonly active?: boolean;
    readonly createdAt?: string;
    readonly updatedAt?: string;
}
