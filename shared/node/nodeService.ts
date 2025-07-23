/**
 * Node Service - Shared Utility
 *
 * Provides core node creation, retrieval, and update logic for use across backend, ai-server, and plugins.
 *
 * @module shared/node/nodeService
 * @see docs/SHARED_DIRECTORY_STREAMLINED_UPDATE_GUIDE.md
 */

import { v4 as uuidv4 } from 'uuid';
import type { Node, NodeInput, NodeMetadata, NodeType } from '../types/nodeTypes.ts';

/**
 * Ensures a node exists with the given properties. Creates if not found.
 * @param input - Node input data (type, title, parentId, metadata)
 * @returns The ensured node object
 * @example
 * const universeNode = await ensureNode({ type: 'universe', title: 'Star Trek', metadata: { universeId: 'st' } });
 */
export async function ensureNode(input: NodeInput): Promise<Node> {
    // This is a placeholder implementation. Replace with actual DB logic in your app.
    // In production, this should check for existing node by unique keys, then create if not found.
    // Validate input.type is a valid NodeType (runtime check for extra safety)
    // Dynamically get all possible NodeType values from the type definition
    const validTypes: readonly string[] = [
        'universe',
        'book',
        'chapter',
        'scene',
        'character',
        'location',
        'item',
        'note',
        'plugin-data',
        'ai-model',
        'ai-server',
        'model-performance',
    ];
    if (!validTypes.includes(input.type)) {
        throw new TypeError(`Invalid node type: ${input.type}`);
    }
    return {
        id: uuidv4(),
        type: input.type as NodeType,
        title: input.title,
        parentId: input.parentId ?? null,
        metadata: input.metadata ?? {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    };
}

/**
 * Node input shape for creation/upsert.
 * @typedef {Object} NodeInput
 * @property {NodeType} type - Node type (e.g., 'universe', 'book', 'chapter')
 * @property {string} title - Node title
 * @property {string} [parentId] - Optional parent node ID
 * @property {NodeMetadata} [metadata] - Optional metadata
 */

/**
 * Node object shape.
 * @typedef {Object} Node
 * @property {string} id - Node unique ID
 * @property {string} type - Node type
 * @property {string} title - Node title
 * @property {string|null} parentId - Parent node ID or null
 * @property {NodeMetadata} metadata - Node metadata
 * @property {string} createdAt - ISO timestamp
 * @property {string} updatedAt - ISO timestamp
 */

// Add additional shared node utilities here as needed.
