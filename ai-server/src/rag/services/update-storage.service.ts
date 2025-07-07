/**
 * RAG Update Storage Service
 * 
 * Manages persistent storage and retrieval of encrypted RAG updates.
 * Provides version history, audit trails, and rollback capabilities for private content.
 */

import {
    RAGUpdate,
    RAGUpdateBatch,
    EncryptedRAGUpdate,
    EncryptedRAGUpdateBatch,
    RAGUpdateHistoryQuery,
    RAGUpdateEncryptionService
} from '../encryption/rag-update-encryption.service.js';
import { RAGNode, RAGRelationship } from '../core/types.js';
import { EncryptedRAGNode, EncryptedRAGRelationship } from '../encryption/rag-encryption.service.js';

/**
 * Update storage backend interface
 */
export interface RAGUpdateStorageBackend {
    // Single update operations
    storeUpdate(update: RAGUpdate | EncryptedRAGUpdate): Promise<void>;
    retrieveUpdate(updateId: string): Promise<RAGUpdate | EncryptedRAGUpdate | null>;
    deleteUpdate(updateId: string): Promise<void>;

    // Batch operations
    storeBatch(batch: RAGUpdateBatch | EncryptedRAGUpdateBatch): Promise<void>;
    retrieveBatch(batchId: string): Promise<RAGUpdateBatch | EncryptedRAGUpdateBatch | null>;
    deleteBatch(batchId: string): Promise<void>;

    // History queries
    getNodeHistory(nodeId: string, limit?: number): Promise<(RAGUpdate | EncryptedRAGUpdate)[]>;
    getUniverseHistory(universeId: string, query: RAGUpdateHistoryQuery): Promise<{
        updates: (RAGUpdate | EncryptedRAGUpdate)[];
        total: number;
        hasMore: boolean;
    }>;
    getUserHistory(userId: string, query: RAGUpdateHistoryQuery): Promise<(RAGUpdate | EncryptedRAGUpdate)[]>;

    // Cleanup operations
    purgeOldUpdates(universeId: string, olderThan: Date): Promise<number>;
    compactHistory(nodeId: string, keepVersions: number): Promise<void>;
}

/**
 * Update index for fast queries
 */
export interface RAGUpdateIndex {
    /** Update ID */
    id: string;

    /** Node ID this update affects */
    nodeId: string;

    /** Universe ID */
    universeId: string;

    /** User who made the update */
    userId: string;

    /** Update timestamp */
    timestamp: Date;

    /** Type of operation */
    operation: 'create' | 'update' | 'delete' | 'restore';

    /** Version number after update */
    version: number;

    /** Previous version number */
    previousVersion?: number;

    /** Whether this update is encrypted */
    encrypted: boolean;

    /** Whether this update is part of a batch */
    batchId?: string;

    /** Number of fields modified */
    modifiedFieldCount: number;

    /** Size change in bytes */
    sizeDelta: number;

    /** Brief description (unencrypted) */
    briefDescription?: string;

    /** Performance metrics */
    processingTime?: number;
    encryptionTime?: number;

    /** Source of the update */
    source: string;
}

/**
 * Database index interface for update history
 */
export interface RAGUpdateDatabaseIndex {
    // Index operations
    indexUpdate(update: RAGUpdate | EncryptedRAGUpdate): Promise<void>;
    removeUpdateIndex(updateId: string): Promise<void>;
    indexBatch(batch: RAGUpdateBatch | EncryptedRAGUpdateBatch): Promise<void>;
    removeBatchIndex(batchId: string): Promise<void>;

    // Query operations
    findUpdatesByNode(nodeId: string, limit?: number, offset?: number): Promise<RAGUpdateIndex[]>;
    findUpdatesByUser(userId: string, query: RAGUpdateHistoryQuery): Promise<RAGUpdateIndex[]>;
    findUpdatesByTimeRange(start: Date, end: Date, universeId?: string): Promise<RAGUpdateIndex[]>;
    findUpdatesByOperation(operation: string, universeId?: string): Promise<RAGUpdateIndex[]>;

    // Statistics
    getUpdateStats(universeId: string): Promise<{
        totalUpdates: number;
        encryptedUpdates: number;
        updatesByOperation: Record<string, number>;
        updatesByUser: Record<string, number>;
        avgUpdatesPerDay: number;
        oldestUpdate?: Date;
        newestUpdate?: Date;
    }>;

    // Cleanup helpers
    findOldUpdates(universeId: string, olderThan: Date): Promise<RAGUpdateIndex[]>;
    findExcessUpdates(nodeId: string, keepVersions: number): Promise<RAGUpdateIndex[]>;
}

/**
 * Main RAG Update Storage Service
 */
export class RAGUpdateStorageService {
    constructor(
        private updateBackend: RAGUpdateStorageBackend,
        private updateIndex: RAGUpdateDatabaseIndex,
        private updateEncryption: RAGUpdateEncryptionService
    ) { }

    /**
     * Store a new update with automatic encryption for private content
     */
    async storeUpdate(update: RAGUpdate): Promise<void> {
        let processedUpdate: RAGUpdate | EncryptedRAGUpdate = update;

        // Encrypt if the update contains private data
        if (update.isPrivate) {
            const startTime = Date.now();
            processedUpdate = await this.updateEncryption.encryptUpdate(update);
            const encryptionTime = Date.now() - startTime;

            // Add encryption time to performance metrics
            if (!processedUpdate.metadata.performanceMetrics) {
                processedUpdate.metadata.performanceMetrics = { processingTime: 0 };
            }
            processedUpdate.metadata.performanceMetrics.encryptionTime = encryptionTime;
        }

        // Store in backend
        await this.updateBackend.storeUpdate(processedUpdate);

        // Index for fast queries
        await this.updateIndex.indexUpdate(processedUpdate);
    }

    /**
     * Store a batch of updates with encryption
     */
    async storeBatch(batch: RAGUpdateBatch): Promise<void> {
        let processedBatch: RAGUpdateBatch | EncryptedRAGUpdateBatch = batch;

        // Encrypt if batch contains private data
        if (batch.containsPrivateData) {
            processedBatch = await this.updateEncryption.encryptUpdateBatch(batch);
        }

        // Store batch
        await this.updateBackend.storeBatch(processedBatch);

        // Index batch
        await this.updateIndex.indexBatch(processedBatch);

        // Store individual updates for granular access
        for (const update of batch.updates) {
            await this.storeUpdate(update);
        }
    }

    /**
     * Retrieve and decrypt an update
     */
    async retrieveUpdate(updateId: string): Promise<RAGUpdate | null> {
        const storedUpdate = await this.updateBackend.retrieveUpdate(updateId);
        if (!storedUpdate) return null;

        // Decrypt if encrypted
        if ('encryptedChanges' in storedUpdate) {
            return await this.updateEncryption.decryptUpdate(storedUpdate as EncryptedRAGUpdate);
        }

        return storedUpdate as RAGUpdate;
    }

    /**
     * Retrieve and decrypt a batch
     */
    async retrieveBatch(batchId: string): Promise<RAGUpdateBatch | null> {
        const storedBatch = await this.updateBackend.retrieveBatch(batchId);
        if (!storedBatch) return null;

        // Decrypt if encrypted
        if ('encryptedUpdates' in storedBatch) {
            return await this.updateEncryption.decryptUpdateBatch(storedBatch as EncryptedRAGUpdateBatch);
        }

        return storedBatch as RAGUpdateBatch;
    }

    /**
     * Get complete history for a node with decryption
     */
    async getNodeHistory(nodeId: string, limit?: number): Promise<RAGUpdate[]> {
        const storedUpdates = await this.updateBackend.getNodeHistory(nodeId, limit);
        const decryptedUpdates: RAGUpdate[] = [];

        for (const storedUpdate of storedUpdates) {
            if ('encryptedChanges' in storedUpdate) {
                try {
                    const decrypted = await this.updateEncryption.decryptUpdate(storedUpdate as EncryptedRAGUpdate);
                    decryptedUpdates.push(decrypted);
                } catch (error) {
                    console.warn(`Failed to decrypt update ${storedUpdate.id}:`, error);
                    // Skip encrypted updates that can't be decrypted (user may not have access)
                }
            } else {
                decryptedUpdates.push(storedUpdate as RAGUpdate);
            }
        }

        return decryptedUpdates;
    }

    /**
     * Query universe update history with optional decryption
     */
    async queryUniverseHistory(
        universeId: string,
        query: RAGUpdateHistoryQuery,
        decryptPrivate: boolean = true
    ): Promise<{
        updates: RAGUpdate[];
        total: number;
        hasMore: boolean;
    }> {
        const result = await this.updateBackend.getUniverseHistory(universeId, query);
        const decryptedUpdates: RAGUpdate[] = [];

        for (const storedUpdate of result.updates) {
            if ('encryptedChanges' in storedUpdate && decryptPrivate) {
                try {
                    const decrypted = await this.updateEncryption.decryptUpdate(storedUpdate as EncryptedRAGUpdate);
                    decryptedUpdates.push(decrypted);
                } catch (error) {
                    console.warn(`Failed to decrypt update ${storedUpdate.id}:`, error);
                }
            } else if (!('encryptedChanges' in storedUpdate)) {
                decryptedUpdates.push(storedUpdate as RAGUpdate);
            }
            // Skip encrypted updates if decryptPrivate is false
        }

        return {
            updates: decryptedUpdates,
            total: result.total,
            hasMore: result.hasMore
        };
    }

    /**
     * Rollback a node to a previous version
     */
    async rollbackNode(
        nodeId: string,
        targetVersion: number,
        userId: string,
        reason: string
    ): Promise<RAGNode | EncryptedRAGNode> {
        // Get update history to find the target version
        const history = await this.getNodeHistory(nodeId);

        // Find the update that created the target version
        const targetUpdate = history.find(update => update.version === targetVersion);
        if (!targetUpdate) {
            throw new Error(`Version ${targetVersion} not found for node ${nodeId}`);
        }

        // Reconstruct the node at that version
        const restoredNode = await this.reconstructNodeAtVersion(nodeId, targetVersion);

        // Create a restore update
        const currentNode = await this.getCurrentNode(nodeId);
        const restoreUpdate = this.updateEncryption.createUpdate(
            nodeId,
            targetUpdate.universeId,
            userId,
            'restore',
            currentNode,
            restoredNode,
            `Rollback to version ${targetVersion}: ${reason}`
        );

        // Store the restore update
        await this.storeUpdate(restoreUpdate);

        return restoredNode;
    }

    /**
     * Get update statistics for a universe
     */
    async getUpdateStatistics(universeId: string): Promise<{
        totalUpdates: number;
        encryptedUpdates: number;
        updatesByOperation: Record<string, number>;
        updatesByUser: Record<string, number>;
        avgUpdatesPerDay: number;
        oldestUpdate?: Date;
        newestUpdate?: Date;
        storageStats: {
            totalSize: number;
            encryptedSize: number;
            compressionRatio?: number;
        };
    }> {
        const indexStats = await this.updateIndex.getUpdateStats(universeId);

        // Calculate storage statistics
        const storageStats = await this.calculateStorageStats(universeId);

        return {
            ...indexStats,
            storageStats
        };
    }

    /**
     * Cleanup old updates based on retention policy
     */
    async cleanupOldUpdates(
        universeId: string,
        retentionPolicy: {
            maxAge?: number; // days
            maxVersionsPerNode?: number;
            keepMajorVersions?: boolean;
        }
    ): Promise<{
        deletedUpdates: number;
        freedSpace: number;
    }> {
        let deletedCount = 0;
        let freedSpace = 0;

        // Clean up by age
        if (retentionPolicy.maxAge) {
            const cutoffDate = new Date(Date.now() - retentionPolicy.maxAge * 24 * 60 * 60 * 1000);
            const oldUpdates = await this.updateIndex.findOldUpdates(universeId, cutoffDate);

            for (const updateIndex of oldUpdates) {
                await this.deleteUpdate(updateIndex.id);
                deletedCount++;
                freedSpace += updateIndex.sizeDelta;
            }
        }

        // Clean up excess versions per node
        if (retentionPolicy.maxVersionsPerNode) {
            const nodeIds = await this.getUniqueNodeIds(universeId);

            for (const nodeId of nodeIds) {
                const excessUpdates = await this.updateIndex.findExcessUpdates(
                    nodeId,
                    retentionPolicy.maxVersionsPerNode
                );

                for (const updateIndex of excessUpdates) {
                    // Skip if this is a major version and we want to keep those
                    if (retentionPolicy.keepMajorVersions && this.isMajorVersion(updateIndex)) {
                        continue;
                    }

                    await this.deleteUpdate(updateIndex.id);
                    deletedCount++;
                    freedSpace += updateIndex.sizeDelta;
                }
            }
        }

        return { deletedUpdates: deletedCount, freedSpace };
    }

    /**
     * Create atomic transaction for multiple updates
     */
    async createUpdateTransaction(
        universeId: string,
        userId: string,
        description: string
    ): Promise<{
        batchId: string;
        addUpdate: (update: RAGUpdate) => void;
        commit: () => Promise<void>;
        rollback: () => Promise<void>;
    }> {
        const batchId = this.generateBatchId();
        const updates: RAGUpdate[] = [];
        let committed = false;

        const batch: RAGUpdateBatch = {
            batchId,
            updates: [],
            timestamp: new Date(),
            userId,
            universeId,
            description,
            containsPrivateData: false,
            transaction: {
                startTime: new Date(),
                status: 'pending'
            }
        };

        return {
            batchId,
            addUpdate: (update: RAGUpdate) => {
                if (committed) throw new Error('Transaction already committed');
                updates.push(update);
                if (update.isPrivate) {
                    batch.containsPrivateData = true;
                }
            },
            commit: async () => {
                if (committed) throw new Error('Transaction already committed');

                batch.updates = updates;
                batch.transaction.status = 'committed';
                batch.transaction.endTime = new Date();

                await this.storeBatch(batch);
                committed = true;
            },
            rollback: async () => {
                if (committed) throw new Error('Transaction already committed');

                batch.transaction.status = 'rolled_back';
                batch.transaction.endTime = new Date();
                batch.transaction.rollbackReason = 'Manual rollback';

                // Don't store failed transaction updates
                committed = true;
            }
        };
    }

    // Private helper methods
    private async deleteUpdate(updateId: string): Promise<void> {
        await this.updateBackend.deleteUpdate(updateId);
        await this.updateIndex.removeUpdateIndex(updateId);
    }

    private async reconstructNodeAtVersion(nodeId: string, version: number): Promise<RAGNode | EncryptedRAGNode> {
        // This would reconstruct a node by applying updates in sequence up to the target version
        // Implementation depends on how nodes are stored and updated
        throw new Error('Node reconstruction not yet implemented');
    }

    private async getCurrentNode(nodeId: string): Promise<RAGNode | EncryptedRAGNode | null> {
        // This would get the current version of a node from the main storage
        // Implementation depends on integration with main RAG storage
        throw new Error('Current node retrieval not yet implemented');
    }

    private async calculateStorageStats(universeId: string): Promise<{
        totalSize: number;
        encryptedSize: number;
        compressionRatio?: number;
    }> {
        // Calculate storage statistics
        return {
            totalSize: 0,
            encryptedSize: 0
        };
    }

    private async getUniqueNodeIds(universeId: string): Promise<string[]> {
        // Get all unique node IDs in the universe
        return [];
    }

    private isMajorVersion(updateIndex: RAGUpdateIndex): boolean {
        // Determine if this is a major version (e.g., version 1.0, 2.0, etc.)
        return updateIndex.version % 10 === 0; // Simple heuristic
    }

    private generateBatchId(): string {
        const crypto = require('crypto');
        return crypto.randomUUID();
    }
}
