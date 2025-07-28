/**
 * Node Service - Shared Utility
 *
 * Provides core node creation, retrieval, and update logic for use across backend, ai-server, and plugins.
 *
 * @module shared/node/nodeService
 * @see docs/SHARED_DIRECTORY_STREAMLINED_UPDATE_GUIDE.md
 */

import { v4 as uuidv4 } from 'uuid';
import { promises as fs } from 'fs';
import path from 'path';
import type { Node, NodeInput, NodeMetadata, NodeType } from '../types/nodeTypes.ts';

// Extend Node type for persistence (createdAt/updatedAt)
export interface PersistentNode extends Node {
    createdAt: string;
    updatedAt: string;
}

/**
 * Ensures a node exists with the given properties. Creates if not found.
 * @param input - Node input data (type, title, parentId, metadata)
 * @returns The ensured node object
 * @example
 * const universeNode = await ensureNode({ type: 'universe', title: 'Star Trek', metadata: { universeId: 'st' } });
 */
export async function ensureNode(input: NodeInput): Promise<Node> {
    // Validate input.type is a valid NodeType (runtime check for extra safety)
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

    // Simple persistent storage: local JSON file (per environment)
    const DB_PATH = path.resolve(process.cwd(), 'node-data.json');
    let nodes: PersistentNode[] = [];
    try {
        const raw = await fs.readFile(DB_PATH, 'utf8');
        nodes = JSON.parse(raw);
    } catch (err) {
        // File does not exist or is invalid, start fresh
        nodes = [];
    }

    // Unique key logic: for model-performance, use type+title+metadata.serverId+metadata.modelName
    let match: Node | undefined;
    if (
        input.type === 'model-performance' &&
        input.metadata &&
        typeof input.metadata.serverId !== 'undefined' &&
        typeof input.metadata.modelName !== 'undefined'
    ) {
        match = nodes.find(n =>
            n.type === 'model-performance' &&
            n.metadata &&
            n.metadata.serverId === input.metadata!.serverId &&
            n.metadata.modelName === input.metadata!.modelName
        );
    } else {
        // Fallback: match by type+title+parentId
        match = nodes.find(n =>
            n.type === input.type &&
            n.title === input.title &&
            n.parentId === (input.parentId ?? undefined)
        );
    }

    if (match) {
        // Update metadata if needed
        match.metadata = { ...match.metadata, ...input.metadata };
        (match as PersistentNode).updatedAt = new Date().toISOString();
        await fs.writeFile(DB_PATH, JSON.stringify(nodes, null, 2), 'utf8');
        return match;
    }

    // Create new node
    const now = new Date().toISOString();
    const node: PersistentNode = {
        id: uuidv4(),
        type: input.type as NodeType,
        title: input.title,
        parentId: input.parentId ?? undefined,
        metadata: input.metadata ?? {},
        createdAt: now,
        updatedAt: now,
    };
    nodes.push(node);
    await fs.writeFile(DB_PATH, JSON.stringify(nodes, null, 2), 'utf8');
    return node;
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

/**
 * Retrieves a node by type and title (and optional parentId) from persistent storage.
 * @param query - { type, title, parentId? }
 * @returns The found node or undefined if not found
 * @example
 * const node = await getNode({ type: 'ai-model', title: 'llama3.2:latest' });
 */
export async function getNode(query: { type: NodeType; title: string; parentId?: string }): Promise<Node | undefined> {
    const DB_PATH = path.resolve(process.cwd(), 'node-data.json');
    let nodes: PersistentNode[] = [];
    try {
        const raw = await fs.readFile(DB_PATH, 'utf8');
        nodes = JSON.parse(raw);
    } catch (err) {
        // File does not exist or is invalid, treat as no nodes
        return undefined;
    }
    // Match by type, title, and parentId (if provided)
    return nodes.find(n =>
        n.type === query.type &&
        n.title === query.title &&
        (typeof query.parentId === 'undefined' ? true : n.parentId === query.parentId)
    );
}
