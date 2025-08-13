/**
 * RAGNode - Rich node type for RAG integration (AI server/backend sync)
 * Includes all properties expected by backend/AI server for sync and enrichment.
 */
export interface RAGNode {
  id: string;
  type: string;
  title?: string;
  parentId?: string;
  metadata?: Record<string, any>;
  privacy?: {
    level?: 'none' | 'partial' | 'full';
    encryptedFields?: string[];
    keyHierarchy?: string;
  };
  temporal?: {
    position?: number;
    stardateEquivalent?: number;
    relations?: string[];
  };
  summaries?: {
    brief?: string;
    medium?: string;
    detailed?: string;
  };
  pluginData?: Record<string, any>;
  content?: any;
  [key: string]: any; // Allow extra fields for forward compatibility
}

/**
 * RAGRelationship - Rich relationship type for RAG integration (AI server/backend sync)
 * Includes all properties expected by backend/AI server for sync and enrichment.
 */
export interface RAGRelationship {
  id: string;
  universeId?: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: string;
  strength?: number;
  bidirectional?: boolean;
  temporal?: {
    scope?: 'event' | 'always' | 'period';
    validFrom?: number;
    validUntil?: number;
    context?: string[];
  };
  metadata?: Record<string, any>;
  pluginType?: string;
  pluginMetadata?: Record<string, any>;
  authorId?: string;
  versionHash?: string;
  [key: string]: any;
}
/**
 * AI Suggestion type for form fields and context-aware recommendations.
 * Used for universe/book/chapter suggestions.
 */
export interface AISuggestion {
  field: string;
  value: unknown;
  reasoning?: string;
  confidence?: number;
  source?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Diff object for suggested changes to form fields.
 * Used for inline diff display and suggestion application.
 */
export interface DiffObject {
  field: string;
  original: unknown;
  suggested: unknown;
  summary?: string;
  metadata?: Record<string, unknown>;
}
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
 * CharacterMemory - Character memory format (used by AI for gap filling and user interaction)
 * This type is used for in-memory representation of character memories.
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

/**
 * Universe node type
 * Represents a universe in the worldbuilding system.
 * @example
 * const universe: Universe = {
 *   id: 'univ-1',
 *   type: 'universe',
 *   title: 'Star Trek',
 *   summary: 'A future of exploration and diplomacy.',
 *   lore: 'The Federation, warp travel, etc.',
 *   rules: 'Prime Directive, etc.',
 *   metadata: { genre: 'Sci-Fi' }
 * };
 */
export interface Universe {
  readonly id: string;
  readonly type: 'universe';
  readonly title: string;
  /** Short summary of the universe */
  readonly summary?: string;
  /** Worldbuilding lore, myths, or background */
  readonly lore?: string;
  /** Universe rules, laws, or constraints */
  readonly rules?: string;
  /** Arbitrary metadata */
  readonly metadata?: Record<string, unknown>;
  /** AI suggestions for universe fields */
  readonly suggestions?: AISuggestion[];
  /** Diff objects for suggested changes */
  readonly diffs?: DiffObject[];
  /** Context enrichment for universe node */
  readonly contextEnrichment?: UniverseContextEnrichment;
  /** Semantic vector embeddings for universe node */
  readonly embeddings?: number[];
}

/**
 * Book node type
 * Represents a book within a universe.
 * @example
 * const book: Book = {
 *   id: 'book-1',
 *   type: 'book',
 *   universeId: 'univ-1',
 *   title: 'The Next Generation',
 *   summary: 'Adventures of the Enterprise-D.',
 *   lore: 'Picard, Data, Q, etc.',
 *   rules: 'Starfleet protocols',
 *   metadata: { published: 1987 },
 *   chapters: []
 * };
 */
export interface Book {
  readonly id: string;
  readonly type: 'book';
  readonly universeId: string;
  readonly title: string;
  /** Short summary of the book */
  readonly summary?: string;
  /** Book-specific lore or background */
  readonly lore?: string;
  /** Book rules, constraints, or themes */
  readonly rules?: string;
  /** Arbitrary metadata */
  readonly metadata?: Record<string, unknown>;
  /** Chapters in the book */
  readonly chapters?: Chapter[];
  /** AI suggestions for book fields */
  readonly suggestions?: AISuggestion[];
  /** Diff objects for suggested changes */
  readonly diffs?: DiffObject[];
  /** Context enrichment for book node */
  readonly contextEnrichment?: BookContextEnrichment;
  /** Semantic vector embeddings for book node */
  readonly embeddings?: number[];
}

/**
 * Chapter node type
 * Represents a chapter within a book.
 * @example
 * const chapter: Chapter = {
 *   id: 'chap-1',
 *   type: 'chapter',
 *   universeId: 'univ-1',
 *   bookId: 'book-1',
 *   title: 'Encounter at Farpoint',
 *   summary: 'Enterprise investigates Farpoint Station.',
 *   lore: 'Q appears, tests humanity.',
 *   rules: 'No interference with locals.',
 *   description: 'Pilot episode.',
 *   content: 'Full text...',
 *   metadata: { airDate: '1987-09-28' }
 * };
 */
export interface Chapter {
  readonly id: string;
  readonly type: 'chapter';
  readonly universeId: string;
  readonly bookId: string;
  readonly title: string;
  /** Short summary of the chapter */
  readonly summary?: string;
  /** Chapter-specific lore or background */
  readonly lore?: string;
  /** Chapter rules, constraints, or themes */
  readonly rules?: string;
  /** Description of the chapter */
  readonly description?: string;
  /** Full content of the chapter */
  readonly content?: string;
  /** Arbitrary metadata */
  readonly metadata?: Record<string, unknown>;
  /** AI suggestions for chapter fields */
  readonly suggestions?: AISuggestion[];
  /** Diff objects for suggested changes */
  readonly diffs?: DiffObject[];
  /** Context enrichment for chapter node */
  readonly contextEnrichment?: ChapterContextEnrichment;
  /** Semantic vector embeddings for chapter node */
  readonly embeddings?: number[];
}

/**
 * Diff object for suggested changes to form fields.
 * Used for inline diff display and suggestion application.
 */
export interface UniverseContextEnrichment {
  relatedBooks?: string[];
  relatedChapters?: string[];
  pluginData?: Record<string, unknown>;
  aiInsights?: Record<string, unknown>;
}

/**
 * Context enrichment for Book node.
 */
export interface BookContextEnrichment {
  relatedUniverse?: string;
  relatedChapters?: string[];
  pluginData?: Record<string, unknown>;
  aiInsights?: Record<string, unknown>;
}

/**
 * Context enrichment for Chapter node.
 */
export interface ChapterContextEnrichment {
  relatedUniverse?: string;
  relatedBook?: string;
  pluginData?: Record<string, unknown>;
  aiInsights?: Record<string, unknown>;
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
  /** Semantic vector embeddings for character node */
  readonly embeddings?: number[];
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
  /** Semantic vector embeddings for location node */
  readonly embeddings?: number[];
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
  /** Semantic vector embeddings for item node */
  readonly embeddings?: number[];
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
  readonly description?: string;
  readonly summary?: string;
  readonly content?: string;
  readonly metadata?: Record<string, unknown>;
  /** Semantic vector embeddings for lore node */
  readonly embeddings?: number[];
}
// Re-export RAGRelationship for repository/service use
// Removed re-export of RAGRelationship from ragTypes.js; now defined in this file.

/**
 * Species node type
 * Represents a species in the universe.
 * @example
 * const species: Species = {
 *   id: 'species-1',
 *   type: 'species',
 *   universeId: 'univ-1',
 *   name: 'Vulcan',
 *   description: 'A logical and peaceful species.',
 *   metadata: { lifespan: '200 years' }
 * };
 */
export interface Species {
  readonly id: string;
  readonly type: 'species';
  readonly universeId: string;
  readonly name: string;
  readonly description?: string;
  readonly metadata?: Record<string, unknown>;
  /** Semantic vector embeddings for species node */
  readonly embeddings?: number[];
}

/**
 * Faction node type
 * Represents a faction in the universe.
 * @example
 * const faction: Faction = {
 *   id: 'faction-1',
 *   type: 'faction',
 *   universeId: 'univ-1',
 *   name: 'Starfleet',
 *   description: 'The exploratory and defense service of the United Federation of Planets.',
 *   metadata: { founded: '2161' }
 * };
 */
export interface Faction {
  readonly id: string;
  readonly type: 'faction';
  readonly universeId: string;
  readonly name: string;
  readonly description?: string;
  readonly metadata?: Record<string, unknown>;
  /** Semantic vector embeddings for faction node */
  readonly embeddings?: number[];
}

/**
 * TimelineEvent node type
 * Represents an event in the timeline of the universe.
 * @example
 * const timelineEvent: TimelineEvent = {
 *   id: 'event-1',
 *   type: 'timelineEvent',
 *   universeId: 'univ-1',
 *   description: 'First contact with the Vulcans.',
 *   metadata: { date: '2063-04-05' }
 * };
 */
export interface TimelineEvent {
  readonly id: string;
  readonly type: 'timelineEvent';
  readonly universeId: string;
  readonly description: string;
  readonly metadata?: Record<string, unknown>;
  /** Semantic vector embeddings for timeline event node */
  readonly embeddings?: number[];
}

export interface Node {
  id: string;
  type: string;
  title?: string;
  parentId?: string;
  metadata?: Record<string, any>;
  /** Array of benchmark score entries for model-performance nodes */
  scores?: Array<{
    runCode: string;
    timestamp: string;
    coldLatency?: number;
    warmLatencies?: number[];
    qualityResults?: Partial<Record<string, any>>;
  }>;
  /** Aggregated quality score for ai-model nodes */
  avgQualityScore?: number;
  /** Best (lowest) latency for ai-model nodes */
  bestLatency?: number;
  /** Last aggregation run code */
  lastAggregatedRun?: string;
  /** Last aggregation timestamp */
  lastAggregatedAt?: string;
  /** Semantic vector embeddings for node */
  embeddings?: number[];
  benchmarks?: Record<string, any>;
  modelId?: string;
  serverId?: string;
}

export interface NodeInput {
  type: string;
  title?: string;
  parentId?: string;
  metadata?: Record<string, any>;
  attributes?: Record<string, any>;
  /** Array of benchmark score entries for model-performance nodes */
  scores?: Array<{
    runCode: string;
    timestamp: string;
    coldLatency?: number;
    warmLatencies?: number[];
    qualityResults?: Partial<Record<string, any>>;
  }>;
  /** Aggregated quality score for ai-model nodes */
  avgQualityScore?: number;
  /** Best (lowest) latency for ai-model nodes */
  bestLatency?: number;
  /** Last aggregation run code */
  lastAggregatedRun?: string;
  /** Last aggregation timestamp */
  lastAggregatedAt?: string;
  /** Semantic vector embeddings for node input */
  embeddings?: number[];
}

export interface NodeMetadata {
  [key: string]: any;
}

export type NodeType = 'universe' | 'book' | 'chapter' | 'character' | 'location' | 'item' | 'lore' | 'species' | 'faction' | 'timelineEvent' | 'ai-model' | 'model-performance' | 'ai-server';

export interface CharacterChatProcessor {
  processMessage: (message: string) => Promise<string>;
}
