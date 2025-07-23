/**
 * Encrypted RAG Node Schema
 * 
 * MongoDB schema for storing encrypted RAG nodes with preserved structure
 * for graph traversal while hiding content from unauthorized users.
 */

import { CreateIndexesOptions, IndexSpecification } from 'mongodb';
import { MONGODB_CONFIG } from '../config/mongodb.config.js';

/**
 * Encrypted RAG Node document structure
 */
export interface EncryptedRAGNodeDocument {
    /** Unique identifier for the node (unencrypted for graph traversal) */
    nodeId: string;

    /** Universe this node belongs to (unencrypted for access control) */
    universeId: string;

    /** Content key ID used to encrypt this node */
    contentKeyId: string;

    /** Node type (unencrypted for filtering and graph operations) */
    type: string;

    /** Encrypted title */
    encryptedTitle: string;

    /** Encrypted content data */
    encryptedContent: string;

    /** Encrypted summaries */
    encryptedSummaries: string;

    /** Encrypted vector embeddings */
    encryptedEmbeddings: string;

    /** Encrypted metadata */
    encryptedMetadata: string;

    /** Encrypted temporal data */
    encryptedTemporal?: string;

    /** Encrypted plugin data */
    encryptedPluginData?: string;

    /** Encryption metadata */
    encryptionMeta: {
        algorithm: string;
        keyDerivationPath: string;
        initializationVector: string;
        authenticationTag: string;
        encryptedAt: Date;
    };

    /** Unencrypted relationship metadata for graph traversal */
    relationshipMeta: {
        incomingConnectionCount: number;
        outgoingConnectionCount: number;
        relationshipTypes: string[];
        lastGraphUpdate: Date;
    };

    /** Access control metadata (unencrypted for authorization) */
    accessMeta: {
        ownerId: string;
        sensitivity: 'public' | 'private' | 'sensitive' | 'restricted';
        collaboratorIds: string[];
        isShared: boolean;
        accessLevel: 'read' | 'write' | 'admin';
    };

    /** Timestamps (unencrypted for system operations) */
    timestamps: {
        created: Date;
        modified: Date;
        lastAccessed?: Date;
        contentHash: string; // Hash of encrypted content for change detection
    };

    /** Search index metadata (encrypted search tokens) */
    searchMeta?: {
        encryptedTokens: string[];
        tokenHash: string;
        lastIndexed: Date;
    };
}

/**
 * Schema validation for encrypted RAG nodes
 */
export const encryptedRAGNodeSchema = {
    $jsonSchema: {
        bsonType: 'object',
        required: [
            'nodeId',
            'universeId',
            'contentKeyId',
            'type',
            'encryptedTitle',
            'encryptedContent',
            'encryptedSummaries',
            'encryptedEmbeddings',
            'encryptedMetadata',
            'encryptionMeta',
            'relationshipMeta',
            'accessMeta',
            'timestamps'
        ],
        properties: {
            nodeId: {
                bsonType: 'string',
                description: 'Unique identifier for the node'
            },
            universeId: {
                bsonType: 'string',
                description: 'Universe this node belongs to'
            },
            contentKeyId: {
                bsonType: 'string',
                description: 'Content key ID used to encrypt this node'
            },
            type: {
                bsonType: 'string',
                enum: [
                    'character',
                    'location',
                    'plot_point',
                    'event',
                    'lore',
                    'book',
                    'chapter',
                    'scene',
                    'dialogue',
                    'universe',
                    'species',
                    'technology',
                    'organization',
                    'custom'
                ],
                description: 'Node type for filtering and graph operations'
            },
            encryptedTitle: {
                bsonType: 'string',
                description: 'Encrypted title'
            },
            encryptedContent: {
                bsonType: 'string',
                description: 'Encrypted content data'
            },
            encryptedSummaries: {
                bsonType: 'string',
                description: 'Encrypted summaries'
            },
            encryptedEmbeddings: {
                bsonType: 'string',
                description: 'Encrypted vector embeddings'
            },
            encryptedMetadata: {
                bsonType: 'string',
                description: 'Encrypted metadata'
            },
            encryptedTemporal: {
                bsonType: 'string',
                description: 'Encrypted temporal data'
            },
            encryptedPluginData: {
                bsonType: 'string',
                description: 'Encrypted plugin data'
            },
            encryptionMeta: {
                bsonType: 'object',
                required: ['algorithm', 'keyDerivationPath', 'initializationVector', 'authenticationTag', 'encryptedAt'],
                properties: {
                    algorithm: {
                        bsonType: 'string',
                        enum: ['AES-256-GCM', 'ChaCha20-Poly1305'],
                        description: 'Encryption algorithm used'
                    },
                    keyDerivationPath: {
                        bsonType: 'string',
                        description: 'Key derivation path for hierarchical encryption'
                    },
                    initializationVector: {
                        bsonType: 'string',
                        description: 'Initialization vector for encryption'
                    },
                    authenticationTag: {
                        bsonType: 'string',
                        description: 'Authentication tag for integrity verification'
                    },
                    encryptedAt: {
                        bsonType: 'date',
                        description: 'Timestamp when content was encrypted'
                    }
                }
            },
            relationshipMeta: {
                bsonType: 'object',
                required: ['incomingConnectionCount', 'outgoingConnectionCount', 'relationshipTypes', 'lastGraphUpdate'],
                properties: {
                    incomingConnectionCount: {
                        bsonType: 'int',
                        minimum: 0,
                        description: 'Number of incoming connections'
                    },
                    outgoingConnectionCount: {
                        bsonType: 'int',
                        minimum: 0,
                        description: 'Number of outgoing connections'
                    },
                    relationshipTypes: {
                        bsonType: 'array',
                        items: {
                            bsonType: 'string'
                        },
                        description: 'Types of relationships this node participates in'
                    },
                    lastGraphUpdate: {
                        bsonType: 'date',
                        description: 'Last time graph metadata was updated'
                    }
                }
            },
            accessMeta: {
                bsonType: 'object',
                required: ['ownerId', 'sensitivity', 'collaboratorIds', 'isShared', 'accessLevel'],
                properties: {
                    ownerId: {
                        bsonType: 'string',
                        description: 'User ID of the node owner'
                    },
                    sensitivity: {
                        bsonType: 'string',
                        enum: ['public', 'private', 'sensitive', 'restricted'],
                        description: 'Content sensitivity level'
                    },
                    collaboratorIds: {
                        bsonType: 'array',
                        items: {
                            bsonType: 'string'
                        },
                        description: 'List of collaborator user IDs'
                    },
                    isShared: {
                        bsonType: 'bool',
                        description: 'Whether this node is shared with collaborators'
                    },
                    accessLevel: {
                        bsonType: 'string',
                        enum: ['read', 'write', 'admin'],
                        description: 'Access level for collaborators'
                    }
                }
            },
            timestamps: {
                bsonType: 'object',
                required: ['created', 'modified', 'contentHash'],
                properties: {
                    created: {
                        bsonType: 'date',
                        description: 'Creation timestamp'
                    },
                    modified: {
                        bsonType: 'date',
                        description: 'Last modification timestamp'
                    },
                    lastAccessed: {
                        bsonType: 'date',
                        description: 'Last access timestamp'
                    },
                    contentHash: {
                        bsonType: 'string',
                        description: 'Hash of encrypted content for change detection'
                    }
                }
            },
            searchMeta: {
                bsonType: 'object',
                required: ['encryptedTokens', 'tokenHash', 'lastIndexed'],
                properties: {
                    encryptedTokens: {
                        bsonType: 'array',
                        items: {
                            bsonType: 'string'
                        },
                        description: 'Encrypted search tokens'
                    },
                    tokenHash: {
                        bsonType: 'string',
                        description: 'Hash of token collection for verification'
                    },
                    lastIndexed: {
                        bsonType: 'date',
                        description: 'Last time search tokens were updated'
                    }
                }
            }
        }
    }
};

/**
 * Indexes for encrypted RAG nodes
 */
export const encryptedRAGNodeIndexes: IndexSpecification[] = [
    // Primary lookup indexes
    { nodeId: 1 },
    { universeId: 1 },
    { contentKeyId: 1 },

    // Access control indexes
    { 'accessMeta.ownerId': 1 },
    { 'accessMeta.collaboratorIds': 1 },
    { 'accessMeta.sensitivity': 1 },

    // Graph traversal indexes
    { universeId: 1, type: 1 },
    { universeId: 1, 'relationshipMeta.relationshipTypes': 1 },

    // Temporal indexes
    { 'timestamps.created': 1 },
    { 'timestamps.modified': 1 },
    { 'timestamps.lastAccessed': 1 },

    // Search indexes
    { 'searchMeta.tokenHash': 1 },
    { 'searchMeta.lastIndexed': 1 },

    // Compound indexes for common queries
    { universeId: 1, 'accessMeta.ownerId': 1, type: 1 },
    { universeId: 1, 'accessMeta.collaboratorIds': 1, type: 1 },
    { universeId: 1, 'accessMeta.sensitivity': 1, 'timestamps.modified': -1 },
    { contentKeyId: 1, 'timestamps.modified': -1 }
];

/**
 * Collection configuration
 */
export const encryptedRAGNodeCollectionConfig = {
    collectionName: 'encrypted_rag_nodes',
    databaseName: MONGODB_CONFIG.dbName,
    schema: encryptedRAGNodeSchema,
    indexes: encryptedRAGNodeIndexes,
    indexOptions: {
        background: true,
        sparse: true
    } as CreateIndexesOptions
};

/**
 * Helper types for working with encrypted RAG nodes
 */
export type EncryptedRAGNodeCreate = Omit<EncryptedRAGNodeDocument, 'timestamps'> & {
    timestamps: Omit<EncryptedRAGNodeDocument['timestamps'], 'created' | 'modified'>;
};

export type EncryptedRAGNodeUpdate = Partial<Pick<EncryptedRAGNodeDocument,
    'encryptedTitle' | 'encryptedContent' | 'encryptedSummaries' | 'encryptedEmbeddings' |
    'encryptedMetadata' | 'encryptedTemporal' | 'encryptedPluginData' | 'relationshipMeta' |
    'accessMeta' | 'searchMeta'
>>;

export type EncryptedRAGNodeFilter = {
    nodeId?: string;
    universeId?: string;
    contentKeyId?: string;
    type?: string;
    'accessMeta.ownerId'?: string;
    'accessMeta.collaboratorIds'?: { $in: string[] };
    'accessMeta.sensitivity'?: string;
    'timestamps.created'?: { $gte?: Date; $lte?: Date };
    'timestamps.modified'?: { $gte?: Date; $lte?: Date };
    $or?: Array<{
        'accessMeta.ownerId'?: string;
        'accessMeta.collaboratorIds'?: { $in: string[] };
    }>;
};
