/**
 * RAG Storage Schema Definitions for MongoDB
 * 
 * Fresh database schemas optimized for RAG-first architecture with native
 * encryption support. This is part of the clean slate backend redesign.
 * 
 * DESIGN PRINCIPLES:
 * - RAG system is authoritative source for all narrative content
 * - Database serves as high-performance index and metadata store
 * - Hybrid storage: RAG content + DB performance indexes
 * - Native support for mixed encryption levels
 * - No migration - fresh schema optimized for new architecture
 */

/**
 * RAG Storage Schema Definitions for MongoDB
 * 
 * Fresh database schemas optimized for RAG-first architecture with native
 * encryption support. This is part of the clean slate backend redesign.
 * 
 * DESIGN PRINCIPLES:
 * - RAG system is authoritative source for all narrative content
 * - Database serves as high-performance index and metadata store
 * - Hybrid storage: RAG content + DB performance indexes
 * - Native support for mixed encryption levels
 * - No migration - fresh schema optimized for new architecture
 */

import { ObjectId } from 'mongodb';

// ========================================
// RAG NODE STORAGE SCHEMA
// ========================================

/**
 * Primary storage schema for RAG nodes in MongoDB
 * This serves as the database index layer for the RAG system
 */
export interface IRAGNodeDocument {
    _id?: ObjectId;

    // Core identification
    ragId: string;                    // Maps to RAG system node ID
    universeId: string;               // Universe isolation
    nodeType: string;                 // character, location, plot_point, etc.
    title: string;                    // Display name

    // Performance indexes
    searchableText: string;           // Unencrypted searchable content
    tags: string[];                   // Fast filtering tags
    categories: string[];             // Content categorization

    // Encryption metadata
    encryptionLevel: 'none' | 'partial' | 'full';
    encryptedFields: string[];        // Which fields are encrypted
    keyHierarchy: string;             // Key derivation path

    // Temporal indexing
    timelinePosition?: number;        // Numerical position for sorting
    stardateEquivalent?: number;      // Plugin-specific temporal mapping
    temporalRelations: string[];      // IDs of related temporal events

    // Relationships (for fast graph queries)
    directConnections: ObjectId[];    // Connected node IDs
    relationshipTypes: string[];      // Types of connections
    connectionStrengths: number[];    // Weighted connections

    // Content summary levels (unencrypted for performance)
    briefSummary: string;             // Layer 3+ context
    mediumSummary: string;            // Layer 2 context
    detailedSummary: string;          // Layer 1 context

    // Plugin integration
    pluginType?: string;              // star-trek, star-wars, generic-scifi
    pluginMetadata: Record<string, any>;

    // Collaboration and versioning
    authorId: string;                 // Content creator
    collaborators: string[];          // Authorized editors
    versionHash: string;              // RAG content version identifier
    lastSyncedAt: Date;               // Last RAG sync timestamp

    // Audit and analytics
    accessCount: number;              // Usage analytics
    lastAccessedAt: Date;             // Performance optimization
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Validation schema for RAG nodes
 */
export const RAGNodeValidation = {
    required: ['ragId', 'universeId', 'nodeType', 'title', 'authorId', 'versionHash'],

    indexes: [
        { ragId: 1 },                               // Unique index
        { universeId: 1 },                          // Universe filtering
        { nodeType: 1 },                            // Type filtering
        { searchableText: 'text', title: 'text' },  // Combined text index for search
        { tags: 1 },                                // Tag filtering
        { categories: 1 },                          // Category filtering
        { encryptionLevel: 1 },                     // Encryption filtering
        { timelinePosition: 1 },                    // Timeline sorting
        { stardateEquivalent: 1 },                  // Plugin timeline
        { authorId: 1 },                            // Author filtering
        { lastAccessedAt: -1 },                     // Performance optimization
        { createdAt: -1 },                          // Recent content
        { updatedAt: -1 },                          // Recent updates

        // Compound indexes for performance
        { universeId: 1, nodeType: 1 },
        { universeId: 1, timelinePosition: 1 },
        { authorId: 1, updatedAt: -1 },
        { encryptionLevel: 1, universeId: 1 }
    ],

    validate: (node: Partial<IRAGNodeDocument>): string[] => {
        const errors: string[] = [];

        if (!node.ragId) errors.push('ragId is required');
        if (!node.universeId) errors.push('universeId is required');
        if (!node.nodeType) errors.push('nodeType is required');
        if (!node.title) errors.push('title is required');
        if (!node.authorId) errors.push('authorId is required');
        if (!node.versionHash) errors.push('versionHash is required');

        if (node.encryptionLevel && !['none', 'partial', 'full'].includes(node.encryptionLevel)) {
            errors.push('encryptionLevel must be none, partial, or full');
        }

        if (node.connectionStrengths && node.directConnections) {
            if (node.connectionStrengths.length !== node.directConnections.length) {
                errors.push('connectionStrengths must match directConnections length');
            }
        }

        return errors;
    }
};

// ========================================
// RAG RELATIONSHIP STORAGE SCHEMA
// ========================================

/**
 * Storage schema for relationships between RAG nodes
 */
export interface IRAGRelationshipDocument {
    _id?: ObjectId;

    // Core identification
    relationshipId: string;           // Maps to RAG system relationship ID
    universeId: string;               // Universe isolation

    // Relationship definition
    sourceNodeId: string;             // Source RAG node ID
    targetNodeId: string;             // Target RAG node ID
    relationshipType: string;         // friendship, rivalry, location, etc.

    // Relationship properties
    strength: number;                 // Connection strength (0-1)
    bidirectional: boolean;           // Is relationship mutual?
    temporalScope: 'always' | 'period' | 'event'; // Temporal constraint

    // Temporal constraints
    validFrom?: number;               // Timeline start position
    validUntil?: number;              // Timeline end position
    temporalContext: string[];        // Related events/periods

    // Encryption and privacy
    encryptionLevel: 'none' | 'partial' | 'full';
    encryptedProperties: string[];    // Which properties are encrypted

    // Plugin integration
    pluginType?: string;
    pluginMetadata: Record<string, any>;

    // Collaboration
    authorId: string;
    versionHash: string;
    lastSyncedAt: Date;

    createdAt: Date;
    updatedAt: Date;
}

/**
 * Validation schema for RAG relationships
 */
export const RAGRelationshipValidation = {
    required: ['relationshipId', 'universeId', 'sourceNodeId', 'targetNodeId', 'relationshipType', 'authorId', 'versionHash'],

    indexes: [
        { relationshipId: 1 },                      // Unique index
        { universeId: 1 },                          // Universe filtering
        { sourceNodeId: 1 },                        // Source node queries
        { targetNodeId: 1 },                        // Target node queries
        { relationshipType: 1 },                    // Type filtering
        { validFrom: 1 },                           // Timeline filtering
        { validUntil: 1 },                          // Timeline filtering
        { createdAt: -1 },                          // Recent relationships

        // Compound indexes for relationship queries
        { sourceNodeId: 1, relationshipType: 1 },
        { targetNodeId: 1, relationshipType: 1 },
        { universeId: 1, validFrom: 1, validUntil: 1 }
    ],

    validate: (relationship: Partial<IRAGRelationshipDocument>): string[] => {
        const errors: string[] = [];

        if (!relationship.relationshipId) errors.push('relationshipId is required');
        if (!relationship.universeId) errors.push('universeId is required');
        if (!relationship.sourceNodeId) errors.push('sourceNodeId is required');
        if (!relationship.targetNodeId) errors.push('targetNodeId is required');
        if (!relationship.relationshipType) errors.push('relationshipType is required');
        if (!relationship.authorId) errors.push('authorId is required');
        if (!relationship.versionHash) errors.push('versionHash is required');

        if (relationship.strength !== undefined && (relationship.strength < 0 || relationship.strength > 1)) {
            errors.push('strength must be between 0 and 1');
        }

        if (relationship.temporalScope && !['always', 'period', 'event'].includes(relationship.temporalScope)) {
            errors.push('temporalScope must be always, period, or event');
        }

        if (relationship.encryptionLevel && !['none', 'partial', 'full'].includes(relationship.encryptionLevel)) {
            errors.push('encryptionLevel must be none, partial, or full');
        }

        return errors;
    }
};

// ========================================
// UNIVERSE METADATA SCHEMA
// ========================================

/**
 * Universe-level metadata and configuration
 */
export interface IUniverseDocument {
    _id?: ObjectId;

    universeId: string;               // Unique universe identifier
    name: string;                     // Display name
    description: string;              // Universe description

    // Plugin configuration
    pluginType: string;               // star-trek, star-wars, etc.
    pluginVersion: string;            // Plugin version
    pluginConfig: Record<string, any>; // Plugin-specific settings

    // Encryption settings
    defaultEncryptionLevel: 'none' | 'partial' | 'full';
    encryptionKey: string;            // Universe master key ID

    // Timeline configuration
    timelineSystem: string;           // stardate, bby-aby, gregorian
    timelineOrigin: number;           // Zero point for timeline
    timelineUnits: string;            // years, stardates, etc.

    // Collaboration settings
    ownerId: string;                  // Universe creator
    collaborators: string[];          // Authorized users
    visibility: 'private' | 'shared' | 'public';

    // Analytics
    nodeCount: number;                // Cached node count
    relationshipCount: number;        // Cached relationship count
    lastActivityAt: Date;             // Last content modification

    createdAt: Date;
    updatedAt: Date;
}

/**
 * Validation schema for universes
 */
export const UniverseValidation = {
    required: ['universeId', 'name', 'pluginType', 'pluginVersion', 'ownerId'],

    indexes: [
        { universeId: 1 },                          // Unique index
        { name: 'text', description: 'text' },      // Combined text search
        { pluginType: 1 },                          // Plugin filtering
        { ownerId: 1 },                             // Owner filtering
        { visibility: 1 },                          // Visibility filtering
        { lastActivityAt: -1 },                     // Activity sorting
        { createdAt: -1 },                          // Recent universes

        // Compound indexes
        { ownerId: 1, updatedAt: -1 },
        { visibility: 1, lastActivityAt: -1 }
    ],

    validate: (universe: Partial<IUniverseDocument>): string[] => {
        const errors: string[] = [];

        if (!universe.universeId) errors.push('universeId is required');
        if (!universe.name) errors.push('name is required');
        if (!universe.pluginType) errors.push('pluginType is required');
        if (!universe.pluginVersion) errors.push('pluginVersion is required');
        if (!universe.ownerId) errors.push('ownerId is required');

        if (universe.defaultEncryptionLevel && !['none', 'partial', 'full'].includes(universe.defaultEncryptionLevel)) {
            errors.push('defaultEncryptionLevel must be none, partial, or full');
        }

        if (universe.visibility && !['private', 'shared', 'public'].includes(universe.visibility)) {
            errors.push('visibility must be private, shared, or public');
        }

        if (universe.nodeCount !== undefined && universe.nodeCount < 0) {
            errors.push('nodeCount must be non-negative');
        }

        if (universe.relationshipCount !== undefined && universe.relationshipCount < 0) {
            errors.push('relationshipCount must be non-negative');
        }

        return errors;
    }
};

// ========================================
// COLLECTION NAMES
// ========================================

export const COLLECTIONS = {
    RAG_NODES: 'rag_nodes',
    RAG_RELATIONSHIPS: 'rag_relationships',
    UNIVERSES: 'universes'
} as const;

// ========================================
// HELPER TYPES FOR INTEGRATION
// ========================================

/**
 * Query interfaces for the hybrid RAG+DB system
 */
export interface RAGNodeQuery {
    universeId: string;
    nodeType?: string;
    searchText?: string;
    tags?: string[];
    encryptionLevel?: 'none' | 'partial' | 'full';
    timelineRange?: { from?: number; to?: number };
    pluginType?: string;
    limit?: number;
    offset?: number;
}

export interface RAGRelationshipQuery {
    universeId: string;
    sourceNodeId?: string;
    targetNodeId?: string;
    relationshipType?: string;
    temporalScope?: 'always' | 'period' | 'event';
    timelinePosition?: number;
    limit?: number;
    offset?: number;
}

/**
 * Database operation results
 */
export interface RAGNodeSearchResult {
    nodes: IRAGNodeDocument[];
    totalCount: number;
    facets: {
        nodeTypes: Record<string, number>;
        tags: Record<string, number>;
        encryptionLevels: Record<string, number>;
    };
}

export interface RAGRelationshipSearchResult {
    relationships: IRAGRelationshipDocument[];
    totalCount: number;
    relationshipTypes: Record<string, number>;
}

/**
 * Index creation helper
 */
export interface IndexDefinition {
    [key: string]: 1 | -1 | 'text' | '2d' | '2dsphere';
}

/**
 * Database initialization configuration
 */
export interface RAGDatabaseConfig {
    collections: typeof COLLECTIONS;
    indexes: {
        [key: string]: IndexDefinition[];
    };
    validation: {
        [key: string]: {
            required: string[];
            validate: (doc: any) => string[];
        };
    };
}

// ========================================
// HELPER TYPES FOR INTEGRATION
// ========================================

/**
 * Query interfaces for the hybrid RAG+DB system
 */
export interface RAGNodeQuery {
    universeId: string;
    nodeType?: string;
    searchText?: string;
    tags?: string[];
    encryptionLevel?: 'none' | 'partial' | 'full';
    timelineRange?: { from?: number; to?: number };
    pluginType?: string;
    limit?: number;
    offset?: number;
}

export interface RAGRelationshipQuery {
    universeId: string;
    sourceNodeId?: string;
    targetNodeId?: string;
    relationshipType?: string;
    temporalScope?: 'always' | 'period' | 'event';
    timelinePosition?: number;
    limit?: number;
    offset?: number;
}

/**
 * Database operation results
 */
export interface RAGNodeSearchResult {
    nodes: IRAGNodeDocument[];
    totalCount: number;
    facets: {
        nodeTypes: Record<string, number>;
        tags: Record<string, number>;
        encryptionLevels: Record<string, number>;
    };
}

export interface RAGRelationshipSearchResult {
    relationships: IRAGRelationshipDocument[];
    totalCount: number;
    relationshipTypes: Record<string, number>;
}
