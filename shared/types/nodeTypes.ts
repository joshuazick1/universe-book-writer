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
