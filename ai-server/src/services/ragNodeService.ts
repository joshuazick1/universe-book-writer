/**
 * Returns all entity nodes for a given pipeline session and universe.
 * Used for deduplication and cross-chunk linking after entity extraction.
 * @param sessionId - The pipeline session ID
 * @param universeId - The universe ID
 * @returns Array of entity nodes
 */


export async function getAllEntitiesForSession(sessionId: string, universeId: string): Promise<RAGNode[]> {
    const manager = ensureManager();
    // Search for all nodes of type 'character', 'organization', 'species', etc. that are considered entities
    // and have the correct universeId and sessionId in metadata.
    const entityTypes = [
        'character', 'organization', 'species', 'technology', 'location', 'event', 'lore', 'dialogue', 'custom'
    ];
    const nodes = await manager.searchNodes('', { universeId });
    return nodes.filter(
        n => entityTypes.includes(n.type) &&
            n.metadata?.universeId === universeId &&
            n.metadata?.sessionId === sessionId
    );
}
/**
 * Returns all entities linked to a given chunk node.
 * @param chunkNodeId - The chunk node ID
 * @returns Array of entity nodes (stub implementation)
 */
export async function getEntitiesByChunkId(chunkNodeId: string): Promise<any[]> {
    // Real MongoDB implementation
    // This assumes a 'ragNodes' collection and that entity nodes have a 'chunkNodeId' field
    const { sharedDatabaseConnection } = await import('../config/database.config.js');
    const db = await sharedDatabaseConnection.connect();
    return db.collection('ragNodes').find({ type: 'entity', chunkNodeId }).toArray();
}

/**
 * Creates a relationship node between entities (stub implementation).
 * @param rel - Relationship data
 * @returns The created relationship node
 */
export async function createRelationshipNode(rel: any): Promise<any> {
    // Real MongoDB implementation
    const { sharedDatabaseConnection } = await import('../config/database.config.js');
    const db = await sharedDatabaseConnection.connect();
    const result = await db.collection('ragRelationships').insertOne({ ...rel, createdAt: new Date() });
    return { ...rel, id: result.insertedId };
}

/**
 * Returns all events for a given character node (stub implementation).
 * @param characterNodeId - The character node ID
 * @returns Array of event nodes
 */
export async function getEventsByCharacterId(characterNodeId: string): Promise<any[]> {
    // Real MongoDB implementation
    const { sharedDatabaseConnection } = await import('../config/database.config.js');
    const db = await sharedDatabaseConnection.connect();
    return db.collection('ragNodes').find({ type: 'event', characterNodeId }).toArray();
}
/**
 * Get all chunk nodes for a given universe and book.
 * @param universeId string
 * @param bookId string
 * @returns Promise<RAGNode[]>
 */
export async function getChunksByBook(universeId: string, bookId: string): Promise<RAGNode[]> {
    const manager = ensureManager();
    // Use 'source_chunk' as the type for RAG pipeline chunk nodes
    const nodes = await manager.searchNodes(bookId, {
        universeId,
        type: 'source_chunk',
        'metadata.bookId': bookId
    });
    // Fallback: filter by metadata if searchNodes doesn't support dot notation
    return Array.isArray(nodes)
        ? nodes.filter(n => n.type === 'source_chunk' && n.metadata?.universeId === universeId && n.metadata?.bookId === bookId)
        : [];
}
// --- File/Chunk Versioning, Diff, Rollback, Migration ---

/**
 * Get all versions for a canonical file
 */

import * as fileStorage from '../rag/core/fileStorage.js';
import * as chunking from '../rag/core/chunking.js';
import * as chunkDiff from '../rag/core/chunkDiff.js';
import type { FileVersionMeta, ChunkMeta } from '../rag/core/types.js';

export async function getFileVersions(fileId: string): Promise<FileVersionMeta[]> {
    return fileStorage.getFileVersions(fileId);
}

/**
 * Get a diff preview for a file version
 */

// Returns a diff preview for a file version vs previous version
export async function getFileDiffPreview(versionId: string): Promise<any> {
    // Find the fileId and previous version
    const dirs = await fileStorage.getFileVersionsDirs();
    for (const fileId of dirs) {
        const versions = await fileStorage.getFileVersions(fileId);
        const idx = versions.findIndex((v: FileVersionMeta) => v.id === versionId);
        if (idx > 0) {
            const prev = versions[idx - 1];
            const curr = versions[idx];
            const prevBuf = await fileStorage.getFileBuffer(prev.id);
            const currBuf = await fileStorage.getFileBuffer(curr.id);
            const prevChunks = chunking.chunkTextByParagraph(prevBuf.toString());
            const currChunks = chunking.chunkTextByParagraph(currBuf.toString());
            const diff = chunkDiff.diffChunks(prevChunks.map((c: { id: string }) => c.id), currChunks.map((c: { id: string }) => c.id));
            return diff;
        }
    }
    return { error: 'No previous version found' };
}

/**
 * Get a diff between two file versions
 */

export async function getFileDiffBetweenVersions(versionA: string, versionB: string): Promise<any> {
    const dirs = await fileStorage.getFileVersionsDirs();
    let aBuf: Buffer | null = null, bBuf: Buffer | null = null;
    for (const fileId of dirs) {
        const versions = await fileStorage.getFileVersions(fileId);
        for (const v of versions) {
            if ((v as FileVersionMeta).id === versionA) aBuf = await fileStorage.getFileBuffer(versionA);
            if ((v as FileVersionMeta).id === versionB) bBuf = await fileStorage.getFileBuffer(versionB);
        }
    }
    if (!aBuf || !bBuf) return { error: 'Version(s) not found' };
    const aChunks = chunking.chunkTextByParagraph(aBuf.toString());
    const bChunks = chunking.chunkTextByParagraph(bBuf.toString());
    return chunkDiff.diffChunks(aChunks.map((c: { id: string }) => c.id), bChunks.map((c: { id: string }) => c.id));
}

/**
 * Rollback to a previous file version
 */

export async function rollbackFileToVersion(versionId: string): Promise<void> {
    // Find fileId for versionId
    const dirs = await fileStorage.getFileVersionsDirs();
    for (const fileId of dirs) {
        const versions = await fileStorage.getFileVersions(fileId);
        if (versions.some((v: FileVersionMeta) => v.id === versionId)) {
            await fileStorage.rollbackToVersion(fileId, versionId);
            return;
        }
    }
    throw new Error('Version not found');
}

/**
 * Migrate content from a file version
 */

export async function migrateFileVersion(versionId: string, migrationData: any): Promise<void> {
    // Find fileId for versionId
    const dirs = await fileStorage.getFileVersionsDirs();
    for (const fileId of dirs) {
        const versions = await fileStorage.getFileVersions(fileId);
        if (versions.some((v: FileVersionMeta) => v.id === versionId)) {
            await fileStorage.migrateFileVersion(fileId, versionId, migrationData);
            return;
        }
    }
    throw new Error('Version not found');
}

// Utility to list all fileId directories under STORAGE_ROOT (implemented in fileStorage)
/**
 * Utility: Find a node by universeId and type (e.g., for universe lookup)
 */
export async function findNodeByUniverseAndType(universeId: string, type: string): Promise<RAGNode | null> {
    const manager = ensureManager();
    const nodes = await manager.searchNodes(universeId, { universeId, type });
    if (Array.isArray(nodes) && nodes.length > 0) {
        return nodes[0];
    }
    return null;
}

import { RAGServiceManager } from '../rag/manager.js';
import type { RAGNode, RAGRelationship } from '../rag/core/types.js';

/**
 * Real ragNodeService: Entity/relationship CRUD and upsert logic for RAG pipeline.
 * Wraps the RAGServiceManager and provides entity upsert, metadata update, and relationship management.
 */

// Singleton RAG manager instance (should be initialized at app startup)
let ragManager: RAGServiceManager | null = null;

export function setRagManager(manager: RAGServiceManager) {
    ragManager = manager;
}

function ensureManager() {
    if (!ragManager) throw new Error('RAGServiceManager not initialized. Call setRagManager() at startup.');
    return ragManager;
}

/**
 * Create or get an entity node by unique fields (type + name + universeId).
 * If an entity with the same type, name, and universe exists, return it; otherwise, create it.
 */
export async function createOrGetEntityNode(entity: {
    type: string;
    name: string;
    universeId: string;
    ownerId: string;
    [key: string]: any;
}): Promise<RAGNode> {
    const manager = ensureManager();
    // 1. Search for existing nodes by type, name, universe
    let nodes = await manager.searchNodes(entity.name, {
        universeId: entity.universeId,
        type: entity.type
    });
    // 2. Also search by aliases if provided
    if (entity.attributes && Array.isArray(entity.attributes.aliases) && entity.attributes.aliases.length > 0) {
        for (const alias of entity.attributes.aliases) {
            const aliasNodes = await manager.searchNodes(alias, {
                universeId: entity.universeId,
                type: entity.type
            });
            nodes = nodes.concat(aliasNodes);
        }
    }
    // 3. Deduplicate found nodes
    const seen = new Set();
    nodes = nodes.filter(n => {
        const key = n.id;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
    // 4. Fuzzy match: check for close matches by name/alias (simple case-insensitive match, can be improved)
    const allAliases: string[] = (entity.attributes && Array.isArray(entity.attributes.aliases)) ? (entity.attributes.aliases as string[]).map((a: string) => a.toLowerCase()) : [];
    let match = nodes.find(n =>
        n.type === entity.type &&
        n.metadata?.universeId === entity.universeId &&
        (
            n.title.toLowerCase() === entity.name.toLowerCase() ||
            (Array.isArray(n.content?.attributes?.aliases) && (n.content.attributes.aliases as string[]).some((a: string) => allAliases.includes(a.toLowerCase())))
        )
    );
    // 5. If no exact match, try fuzzy (substring) match
    if (!match) {
        match = nodes.find(n =>
            n.type === entity.type &&
            n.metadata?.universeId === entity.universeId &&
            (
                n.title.toLowerCase().includes(entity.name.toLowerCase()) ||
                allAliases.some((alias: string) => n.title.toLowerCase().includes(alias))
            )
        );
    }
    // 6. If match found, update with new aliases/descriptions if needed
    if (match) {
        let updated = false;
        // Merge aliases
        const existingAliases: string[] = Array.isArray(match.content?.attributes?.aliases) ? match.content.attributes.aliases as string[] : [];
        const newAliases = allAliases.filter((a: string) => !existingAliases.map((ea: string) => ea.toLowerCase()).includes(a));
        if (newAliases.length > 0) {
            match.content.attributes = {
                ...match.content.attributes,
                aliases: [...existingAliases, ...newAliases]
            };
            updated = true;
        }
        // Update description if the new one is richer (longer)
        if (entity.description && entity.description.length > (match.content.description?.length || 0)) {
            match.content.description = entity.description;
            updated = true;
        }
        if (updated) {
            await manager.updateNode(match.id, { content: match.content });
        }
        return match;
    }
    // 7. No match: create new entity node
    const now = new Date();
    const nodeData = {
        type: entity.type as import('../rag/core/types.js').RAGNodeType,
        title: entity.name,
        content: {
            description: entity.description || entity.name,
            attributes: entity.attributes || {},
            structured: entity.structured || undefined,
            fullText: entity.fullText || undefined
        },
        summaries: { brief: '', medium: '', detailed: '' },
        embeddings: [],
        metadata: {
            universeId: entity.universeId,
            ownerId: entity.ownerId,
            tags: [entity.type, 'entity'],
            sensitivity: 'public',
            version: 1,
            ...entity.metadata
        },
        privacy: { encrypted: false, shareable: true },
        timestamps: { created: now, modified: now },
        active: true
    };
    return await manager.createNode(nodeData);
}

/**
 * Update entity metadata by entity node ID.
 */
export async function updateEntityMetadata(entityId: string, meta: any): Promise<RAGNode> {
    const manager = ensureManager();
    const node = await manager.getNode(entityId);
    if (!node) throw new Error(`Entity node not found: ${entityId}`);
    const updated = await manager.updateNode(entityId, { metadata: { ...node.metadata, ...meta } });
    return updated;
}

/**
 * Get a node by ID.
 */
export async function getNodeById(nodeId: string): Promise<RAGNode | null> {
    const manager = ensureManager();
    return await manager.getNode(nodeId);
}

/**
 * Create a new node (generic, not just entity).
 */
export async function createNode(node: Omit<RAGNode, 'id'>): Promise<RAGNode> {
    const manager = ensureManager();
    return await manager.createNode(node);
}

/**
 * Update a node by ID.
 */
export async function updateNode(id: string, data: Partial<RAGNode>): Promise<RAGNode> {
    const manager = ensureManager();
    return await manager.updateNode(id, data);
}

/**
 * Delete a node by ID.
 */
export async function deleteNode(id: string): Promise<boolean> {
    const manager = ensureManager();
    await manager.deleteNode(id);
    return true;
}

/**
 * Create a new relationship between nodes.
 */
export async function createRelationship(rel: Omit<RAGRelationship, 'id'>): Promise<RAGRelationship> {
    const manager = ensureManager();
    return await manager.createRelationship(rel);
}

/**
 * Get a relationship by ID.
 */
export async function getRelationship(id: string): Promise<RAGRelationship | null> {
    const manager = ensureManager();
    return await manager.getRelationship(id);
}

/**
 * Update a relationship by ID.
 */
export async function updateRelationship(id: string, data: Partial<RAGRelationship>): Promise<RAGRelationship> {
    const manager = ensureManager();
    const rel = await manager.getRelationship(id);
    if (!rel) throw new Error(`Relationship not found: ${id}`);
    return await manager.updateRelationship(id, { ...rel, ...data });
}

/**
 * Delete a relationship by ID.
 */
export async function deleteRelationship(id: string): Promise<boolean> {
    const manager = ensureManager();
    await manager.deleteRelationship(id);
    return true;
}
