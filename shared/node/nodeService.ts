/**
 * Fetch a node by its unique id.
 * @param id Node id
 * @returns Node or undefined if not found
 */
export async function getNodeById(id: string): Promise<Node | undefined> {
    const db: Db = (sharedDatabaseConnection as any).db;
    if (!db) throw new Error('MongoDB database connection not initialized');
    // Search both collections since type is unknown
    const collections = [db.collection('nodes'), db.collection('system_nodes')];
    for (const collection of collections) {
        const node = await collection.findOne({ id });
        // Validate that the result has at least id and type fields
        if (node && typeof node.id === 'string' && typeof node.type === 'string') {
            return node as unknown as Node;
        }
    }
    return undefined;
}
import { v4 as uuidv4 } from 'uuid';
import type { Collection, Db } from 'mongodb';
import type { Node, NodeInput, NodeMetadata, NodeType } from '../types/nodeTypes.ts';
import { sharedDatabaseConnection } from '../database/database.config.js';

export interface PersistentNode extends Node {
    createdAt: string;
    updatedAt: string;
}

// Helper to get the MongoDB collection for nodes
function getNodeCollection(nodeType?: NodeType): Collection<PersistentNode> {
    // Use a public .db property or adapt as needed
    const db: Db = (sharedDatabaseConnection as any).db;
    if (!db) throw new Error('MongoDB database connection not initialized');
    // Route system node types to 'system_nodes' collection
    const systemTypes = ['ai-model', 'ai-server', 'model-performance'];
    if (nodeType && systemTypes.includes(nodeType)) {
        return db.collection('system_nodes');
    }
    return db.collection('nodes');
}

export async function ensureNode(input: NodeInput): Promise<Node> {
    const validTypes: readonly string[] = [
        'universe', 'book', 'chapter', 'scene', 'character', 'location', 'item', 'note',
        'plugin-data', 'ai-model', 'ai-server', 'model-performance',
    ];
    if (!validTypes.includes(input.type)) {
        throw new TypeError(`Invalid node type: ${input.type}`);
    }

    const collection = getNodeCollection(input.type as NodeType);

    // Unique key logic
    let query: any;
    if (
        input.type === 'model-performance' &&
        input.metadata &&
        typeof input.metadata.serverId !== 'undefined' &&
        typeof input.metadata.modelName !== 'undefined'
    ) {
        query = {
            type: 'model-performance',
            'metadata.serverId': input.metadata.serverId,
            'metadata.modelName': input.metadata.modelName,
        };
    } else {
        query = {
            type: input.type,
            title: input.title,
        };
        if (input.parentId) query.parentId = input.parentId;
    }

    const match = await collection.findOne(query);
    if (match) {
        const updatedNode: PersistentNode = {
            ...match,
            metadata: { ...match.metadata, ...input.metadata },
            updatedAt: new Date().toISOString(),
        };
        await collection.updateOne({ id: match.id }, { $set: updatedNode });
        return updatedNode;
    }

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
    await collection.insertOne(node);
    return node;
}

export async function getNode(query: { type: NodeType; title: string; parentId?: string }): Promise<Node | undefined> {
    const collection = getNodeCollection(query.type as NodeType);
    const mongoQuery: any = {
        type: query.type,
        title: query.title,
    };
    if (query.parentId) mongoQuery.parentId = query.parentId;
    return await collection.findOne(mongoQuery) ?? undefined;
}

export async function queryNodesByType(nodeType: NodeType): Promise<Node[]> {
    const collection = getNodeCollection(nodeType);
    const nodes = await collection.find({ type: nodeType }).toArray();
    return nodes;
}