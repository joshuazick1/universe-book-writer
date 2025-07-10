/**
 * Generic in-memory entity candidate for aggregation and deduplication.
 * Extensible for all entity types (character, location, item, lore, etc.).
 *
 * @template T - Additional metadata or references for the entity type
 */
export interface EntityCandidate<T = unknown> {
    /** Canonical node type (e.g., 'character', 'location', etc.) */
    type: CanonicalNodeType | string;
    /** Canonical name/title of the entity */
    name: string;
    /** Optional display title */
    title?: string;
    /** Description or summary */
    description?: string;
    /** Confidence score (0.0-1.0) */
    confidence?: number;
    /** Aliases or alternate names */
    aliases?: string[];
    /** All available metadata and references (IDs, context, etc.) */
    metadata?: T;
    /** Source references (section/chunk index, offsets, etc.) */
    sourceSectionIndex?: number;
    sourceSectionText?: string;
    startOffset?: number;
    endOffset?: number;
    /** Canonical parent/relationship fields */
    universeId?: string;
    bookId?: string;
    chapterId?: string;
    documentId?: string;
    sectionId?: string;
    /** Appearance references for character/entity */
    appearanceBookIds?: string[];
    appearanceChapterIds?: string[];
    appearanceSectionIds?: string[];
    /** Source references for deduplication and traceability */
    sourceReferences?: Array<{
        documentId?: string;
        sectionId?: string;
        offset?: number;
        context?: string;
        extractor?: string;
    }>;
    /** Entity-specific context for AI-powered deduplication */
    contextWindow?: string;
    /** Pronoun/ambiguous reference links for advanced AI deduplication */
    pronounLinks?: string[];
    /** Any additional extensible fields for future types */
    [key: string]: unknown;
}
/**
 * Canonical node type string literals for strict validation and type safety.
 */
export type CanonicalNodeType =
    | 'universe'
    | 'book'
    | 'chapter'
    | 'document'
    | 'section'
    | 'character'
    | 'note';

/**
 * Canonical node type constants for reference and validation.
 */
export const CANONICAL_NODE_TYPES: CanonicalNodeType[] = [
    'universe',
    'book',
    'chapter',
    'document',
    'section',
    'character',
    'note',
];

/**
 * Utility: Check if a string is a canonical node type.
 */
export function isCanonicalNodeType(type: string): type is CanonicalNodeType {
    return CANONICAL_NODE_TYPES.includes(type as CanonicalNodeType);
}
/**
 * Enhanced entity types for the Text-to-RAG Parser backend service
 */

export enum EntityType {
    // Core entity types
    CHARACTER = 'character',
    LOCATION = 'location',
    EVENT = 'event',
    LORE = 'lore',
    PLOT_POINT = 'plot_point',
    ORGANIZATION = 'organization',
    OBJECT = 'object',
    DIALOGUE = 'dialogue',
    SOURCE_TEXT = 'source_text',

    // Enhanced entity types
    ARTIFACT = 'artifact',
    TECHNOLOGY = 'technology',
    VEHICLE = 'vehicle',
    WEAPON = 'weapon',
    CONCEPT = 'concept',
    PROPHECY = 'prophecy',
    LEGEND = 'legend',
    DOCUMENT = 'document',
    TIMELINE_MARKER = 'timeline_marker',
    FACTION = 'faction',
    SPECIES = 'species',
    LANGUAGE = 'language',
    CULTURE = 'culture',
    RELIGION = 'religion',
    GOVERNMENT = 'government',
    LAW = 'law',
    EMOTION = 'emotion',
    CUSTOM = 'custom'
}

export enum RelationshipType {
    // Character relationships
    FAMILY = 'family',
    FRIEND = 'friend',
    ENEMY = 'enemy',
    ALLY = 'ally',
    MENTOR = 'mentor',
    STUDENT = 'student',
    ROMANTIC = 'romantic',
    RIVAL = 'rival',
    SUBORDINATE = 'subordinate',
    SUPERIOR = 'superior',

    // Object relationships  
    OWNS = 'owns',
    SEEKS = 'seeks',
    CREATED = 'created',
    DESTROYED = 'destroyed',
    REPRESENTS = 'represents',
    USES = 'uses',
    GUARDS = 'guards',
    CONTAINS = 'contains',

    // Location relationships
    RULES = 'rules',
    LIVES_IN = 'lives_in',
    TRAVELED_TO = 'traveled_to',
    BORN_IN = 'born_in',
    LOCATED_IN = 'located_in',
    ADJACENT_TO = 'adjacent_to',
    CONTROLS = 'controls',
    VISITS = 'visits',

    // Knowledge relationships
    CITES = 'cites',
    BELIEVES = 'believes',
    KNOWS = 'knows',
    REMEMBERS = 'remembers',
    TEACHES = 'teaches',
    LEARNS = 'learns',
    DISCOVERS = 'discovers',

    // Event relationships
    PARTICIPATES_IN = 'participates_in',
    WITNESSED = 'witnessed',
    CAUSED = 'caused',
    PREVENTED = 'prevented',
    INFLUENCED = 'influenced',
    RESULTED_FROM = 'resulted_from',

    // Temporal relationships
    BEFORE = 'before',
    AFTER = 'after',
    DURING = 'during',
    CONCURRENT = 'concurrent',

    // Generic
    ASSOCIATED_WITH = 'associated_with',
    PART_OF = 'part_of',
    MEMBER_OF = 'member_of',
    OPPOSED_TO = 'opposed_to',
    SIMILAR_TO = 'similar_to',
    DIFFERENT_FROM = 'different_from',
    RELATED_TO = 'related_to',
    LEADS = 'leads',
    WORKS_FOR = 'works_for',
    APPRENTICE = 'apprentice',
    NEAR = 'near',
    CONNECTED_TO = 'connected_to',
    AFFECTS = 'affects'
}

// Confidence levels for entity filtering
export enum ConfidenceLevel {
    VERY_LOW = 'very_low',
    LOW = 'low',
    MEDIUM = 'medium',
    HIGH = 'high',
    VERY_HIGH = 'very_high'
}

// Entity type utilities
export class EntityTypeUtils {
    /**
     * Get display name for entity type
     */
    static getDisplayName(type: EntityType): string {
        return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Check if entity type is a character type
     */
    static isCharacterType(type: EntityType): boolean {
        return type === EntityType.CHARACTER;
    }

    /**
     * Check if entity type is a location type
     */
    static isLocationType(type: EntityType): boolean {
        return type === EntityType.LOCATION;
    }

    /**
     * Check if entity type is an event type
     */
    static isEventType(type: EntityType): boolean {
        return type === EntityType.EVENT;
    }

    /**
     * Get default confidence threshold for entity type
     */
    static getDefaultConfidenceThreshold(type: EntityType): number {
        switch (type) {
            case EntityType.CHARACTER:
                return 0.8;
            case EntityType.LOCATION:
                return 0.7;
            case EntityType.EVENT:
                return 0.75;
            case EntityType.DIALOGUE:
                return 0.6;
            case EntityType.ORGANIZATION:
                return 0.7;
            case EntityType.ARTIFACT:
                return 0.65;
            case EntityType.LORE:
                return 0.6;
            default:
                return 0.6;
        }
    }

    /**
     * Get all entity types as array
     */
    static getAllTypes(): EntityType[] {
        return Object.values(EntityType);
    }

    /**
     * Validate entity type
     */
    static isValidType(type: string): type is EntityType {
        return Object.values(EntityType).includes(type as EntityType);
    }

    /**
     * Get compatible relationship types for two entity types
     */
    static getCompatibleRelationships(type1: EntityType, type2: EntityType): RelationshipType[] {
        // Define compatible relationships based on entity types
        const compatibilityMap: Record<string, RelationshipType[]> = {
            [`${EntityType.CHARACTER}-${EntityType.CHARACTER}`]: [
                RelationshipType.FAMILY, RelationshipType.FRIEND, RelationshipType.ENEMY,
                RelationshipType.ALLY, RelationshipType.MENTOR, RelationshipType.APPRENTICE
            ],
            [`${EntityType.CHARACTER}-${EntityType.LOCATION}`]: [
                RelationshipType.LIVES_IN, RelationshipType.VISITS, RelationshipType.RULES
            ],
            [`${EntityType.CHARACTER}-${EntityType.ORGANIZATION}`]: [
                RelationshipType.MEMBER_OF, RelationshipType.LEADS, RelationshipType.WORKS_FOR
            ],
            [`${EntityType.CHARACTER}-${EntityType.OBJECT}`]: [
                RelationshipType.OWNS, RelationshipType.USES, RelationshipType.CREATED
            ],
            [`${EntityType.LOCATION}-${EntityType.LOCATION}`]: [
                RelationshipType.CONTAINS, RelationshipType.NEAR, RelationshipType.CONNECTED_TO
            ],
            [`${EntityType.EVENT}-${EntityType.CHARACTER}`]: [
                RelationshipType.PARTICIPATES_IN, RelationshipType.CAUSED, RelationshipType.AFFECTS
            ]
        };

        const key = `${type1}-${type2}`;
        const reverseKey = `${type2}-${type1}`;

        return compatibilityMap[key] || compatibilityMap[reverseKey] || [RelationshipType.RELATED_TO];
    }

    /**
     * Get confidence level for a numeric confidence value
     */
    static getConfidenceLevel(confidence: number): 'low' | 'medium' | 'high' {
        if (confidence >= 0.8) return 'high';
        if (confidence >= 0.6) return 'medium';
        return 'low';
    }
}

export interface EntityMetadata {
    universe?: string;
    pluginType?: string;
    sensitivity?: 'low' | 'medium' | 'high';
    tags?: string[];
    categories?: string[];
    timelinePosition?: number;
    chapterReference?: string;
    pageReference?: string;
    authorNotes?: string;
    verificationStatus?: 'unverified' | 'verified' | 'disputed';
    importance?: number; // 0-1 scale
}

export interface DialogueEntity {
    type: EntityType.DIALOGUE;
    speaker: string;
    addressee?: string;
    quote: string;
    context: string;
    emotion?: string;
    significance: 'low' | 'medium' | 'high' | 'critical';
    reveals?: string[];
    foreshadows?: string[];
}

export interface EventEntity {
    type: EntityType.EVENT;
    eventType: 'battle' | 'discovery' | 'meeting' | 'death' | 'birth' | 'coronation' | 'betrayal' | 'alliance' | 'custom';
    participants: string[];
    location?: string;
    timeline: {
        anchor: string;
        sequence?: number;
        duration?: string;
    };
    consequences: string[];
    historicalSignificance: number;
}

export interface ArtifactEntity {
    type: EntityType.ARTIFACT;
    artifactType: 'weapon' | 'tool' | 'scroll' | 'crystal' | 'book' | 'relic' | 'technology';
    powers?: string[];
    origin?: string;
    currentOwner?: string;
    historicalOwners?: string[];
    culturalSignificance?: string;
    physicalDescription?: string;
}

export interface LocationEntity {
    type: EntityType.LOCATION;
    locationType: 'city' | 'region' | 'building' | 'room' | 'planet' | 'dimension' | 'natural' | 'artificial';
    geography?: string;
    climate?: string;
    population?: number;
    government?: string;
    culture?: string;
    resources?: string[];
    strategicImportance?: string;
}

export interface CharacterEntity {
    type: EntityType.CHARACTER;
    characterType: 'protagonist' | 'antagonist' | 'supporting' | 'minor' | 'mentioned';
    species?: string;
    occupation?: string;
    affiliations?: string[];
    personalityTraits?: string[];
    physicalDescription?: string;
    background?: string;
    motivations?: string[];
    fears?: string[];
    skills?: string[];
    equipment?: string[];
}
