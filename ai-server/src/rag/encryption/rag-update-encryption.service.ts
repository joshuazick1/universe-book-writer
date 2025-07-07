/**
 * RAG Update Encryption Service
 * 
 * Encrypts all updates/commits to RAG nodes that are flagged as private.
 * Provides encrypted change tracking, versioning, and audit trail for sensitive content.
 */

import { BaseEncryptionService, EncryptedData, HierarchicalKeyManager } from './base-encryption.service.js';
import { RAGNode, RAGRelationship, RAGNodeMetadata } from '../core/types.js';
import { EncryptedRAGNode, EncryptedRAGRelationship } from './rag-encryption.service.js';

/**
 * Represents a single update/change to a RAG node
 */
export interface RAGUpdate {
    /** Unique identifier for the update */
    id: string;

    /** ID of the node being updated */
    nodeId: string;

    /** Universe this update belongs to */
    universeId: string;

    /** User who made the update */
    userId: string;

    /** Timestamp of the update */
    timestamp: Date;

    /** Type of update operation */
    operation: 'create' | 'update' | 'delete' | 'restore';

    /** The changes made in this update */
    changes: RAGUpdateChanges;

    /** Version number after this update */
    version: number;

    /** Previous version number (for rollback) */
    previousVersion?: number;

    /** Brief description of the change */
    description?: string;

    /** Whether this update contains sensitive/private data */
    isPrivate: boolean;

    /** Metadata about the update */
    metadata: RAGUpdateMetadata;
}

/**
 * Detailed changes in an update
 */
export interface RAGUpdateChanges {
    /** Fields that were modified */
    modifiedFields: string[];

    /** Previous values (for rollback) */
    previousValues: Record<string, any>;

    /** New values */
    newValues: Record<string, any>;

    /** Content diff for large text changes */
    contentDiff?: {
        added: string[];
        removed: string[];
        modified: Array<{ field: string; oldValue: any; newValue: any }>;
    };

    /** Relationship changes if applicable */
    relationshipChanges?: {
        added: string[];
        removed: string[];
        modified: string[];
    };
}

/**
 * Metadata about the update
 */
export interface RAGUpdateMetadata {
    /** Source of the update (UI, API, import, etc.) */
    source: string;

    /** Client information */
    clientInfo?: {
        userAgent?: string;
        ipAddress?: string;
        sessionId?: string;
    };

    /** Automated update information */
    automatedUpdate?: {
        triggerType: 'ai_enhancement' | 'auto_summarization' | 'consistency_check' | 'plugin_update';
        triggerSource: string;
    };

    /** Size metrics */
    sizeDelta?: {
        contentSizeChange: number;
        embeddingSizeChange: number;
    };

    /** Performance metrics */
    performanceMetrics?: {
        processingTime: number;
        encryptionTime?: number;
    };
}

/**
 * Encrypted version of a RAG update
 */
export interface EncryptedRAGUpdate extends Omit<RAGUpdate, 'changes' | 'description'> {
    /** Encrypted changes data */
    encryptedChanges: EncryptedData;

    /** Encrypted description */
    encryptedDescription?: EncryptedData;

    /** Hash of the original changes for integrity */
    changesHash: string;

    /** Minimal metadata for audit trails (non-sensitive) */
    publicMetadata: {
        operation: string;
        version: number;
        timestamp: Date;
        modifiedFieldCount: number;
    };
}

/**
 * Update batch for atomic operations
 */
export interface RAGUpdateBatch {
    /** Unique batch identifier */
    batchId: string;

    /** All updates in this batch */
    updates: RAGUpdate[];

    /** Batch timestamp */
    timestamp: Date;

    /** User who initiated the batch */
    userId: string;

    /** Universe this batch affects */
    universeId: string;

    /** Batch description */
    description?: string;

    /** Whether any updates in the batch are private */
    containsPrivateData: boolean;

    /** Transaction information */
    transaction: {
        startTime: Date;
        endTime?: Date;
        status: 'pending' | 'committed' | 'rolled_back' | 'failed';
        rollbackReason?: string;
    };
}

/**
 * Encrypted update batch
 */
export interface EncryptedRAGUpdateBatch extends Omit<RAGUpdateBatch, 'updates' | 'description'> {
    /** Encrypted updates array */
    encryptedUpdates: EncryptedData;

    /** Encrypted description */
    encryptedDescription?: EncryptedData;

    /** Hash of original updates for integrity */
    updatesHash: string;

    /** Public batch metadata */
    publicMetadata: {
        updateCount: number;
        affectedNodeCount: number;
        timestamp: Date;
        status: string;
    };
}

/**
 * Update history query parameters
 */
export interface RAGUpdateHistoryQuery {
    /** Node ID to get history for */
    nodeId?: string;

    /** Universe ID to filter by */
    universeId?: string;

    /** User ID to filter by */
    userId?: string;

    /** Time range */
    timeRange?: {
        start: Date;
        end: Date;
    };

    /** Update operations to include */
    operations?: ('create' | 'update' | 'delete' | 'restore')[];

    /** Include only private updates */
    privateOnly?: boolean;

    /** Pagination */
    limit?: number;
    offset?: number;

    /** Sort order */
    sortBy?: 'timestamp' | 'version';
    sortOrder?: 'asc' | 'desc';
}

/**
 * RAG Update Encryption Service
 */
export class RAGUpdateEncryptionService {
    constructor(private baseEncryption: BaseEncryptionService) { }

    /**
     * Encrypt a RAG update for private content
     */
    async encryptUpdate(update: RAGUpdate): Promise<EncryptedRAGUpdate> {
        if (!update.isPrivate) {
            throw new Error('Update is not marked as private - encryption not required');
        }

        const keyPath = HierarchicalKeyManager.getUpdateKeyPath(
            update.universeId,
            update.nodeId,
            update.id
        );

        // Encrypt the changes data
        const encryptedChanges = await this.baseEncryption.encryptContent(
            JSON.stringify(update.changes),
            keyPath,
            'sensitive', // All private updates are at least sensitive
            'aes-256-gcm'
        );

        // Encrypt description if present
        let encryptedDescription: EncryptedData | undefined;
        if (update.description) {
            encryptedDescription = await this.baseEncryption.encryptContent(
                update.description,
                keyPath,
                'sensitive',
                'aes-256-gcm'
            );
        }

        // Generate integrity hash
        const changesHash = this.generateChangesHash(update.changes);

        // Create public metadata (non-sensitive)
        const publicMetadata = {
            operation: update.operation,
            version: update.version,
            timestamp: update.timestamp,
            modifiedFieldCount: update.changes.modifiedFields.length
        };

        const { changes, description, ...updateWithoutSensitive } = update;

        const encryptedUpdate: EncryptedRAGUpdate = {
            ...updateWithoutSensitive,
            encryptedChanges,
            encryptedDescription,
            changesHash,
            publicMetadata
        };

        return encryptedUpdate;
    }

    /**
     * Decrypt a RAG update
     */
    async decryptUpdate(encryptedUpdate: EncryptedRAGUpdate): Promise<RAGUpdate> {
        const keyPath = HierarchicalKeyManager.getUpdateKeyPath(
            encryptedUpdate.universeId,
            encryptedUpdate.nodeId,
            encryptedUpdate.id
        );

        // Decrypt changes
        const changesJson = await this.baseEncryption.decryptContent(
            encryptedUpdate.encryptedChanges,
            keyPath
        );
        const changes = JSON.parse(changesJson);

        // Decrypt description if present
        let description: string | undefined;
        if (encryptedUpdate.encryptedDescription) {
            description = await this.baseEncryption.decryptContent(
                encryptedUpdate.encryptedDescription,
                keyPath
            );
        }

        // Verify integrity
        const expectedHash = this.generateChangesHash(changes);
        if (expectedHash !== encryptedUpdate.changesHash) {
            throw new Error('Update integrity verification failed');
        }

        const { encryptedChanges, encryptedDescription, changesHash, publicMetadata, ...updateWithoutEncrypted } = encryptedUpdate;

        const decryptedUpdate: RAGUpdate = {
            ...updateWithoutEncrypted,
            changes,
            description
        };

        return decryptedUpdate;
    }

    /**
     * Encrypt a batch of updates
     */
    async encryptUpdateBatch(batch: RAGUpdateBatch): Promise<EncryptedRAGUpdateBatch> {
        if (!batch.containsPrivateData) {
            throw new Error('Batch does not contain private data - encryption not required');
        }

        const keyPath = HierarchicalKeyManager.getBatchKeyPath(
            batch.universeId,
            batch.batchId
        );

        // Encrypt individual updates first
        const encryptedUpdates: (RAGUpdate | EncryptedRAGUpdate)[] = [];
        for (const update of batch.updates) {
            if (update.isPrivate) {
                encryptedUpdates.push(await this.encryptUpdate(update));
            } else {
                encryptedUpdates.push(update);
            }
        }

        // Encrypt the entire updates array
        const encryptedUpdatesData = await this.baseEncryption.encryptContent(
            JSON.stringify(encryptedUpdates),
            keyPath,
            'sensitive',
            'aes-256-gcm'
        );

        // Encrypt description if present
        let encryptedDescription: EncryptedData | undefined;
        if (batch.description) {
            encryptedDescription = await this.baseEncryption.encryptContent(
                batch.description,
                keyPath,
                'sensitive',
                'aes-256-gcm'
            );
        }

        // Generate integrity hash
        const updatesHash = this.generateBatchHash(batch.updates);

        // Create public metadata
        const publicMetadata = {
            updateCount: batch.updates.length,
            affectedNodeCount: new Set(batch.updates.map(u => u.nodeId)).size,
            timestamp: batch.timestamp,
            status: batch.transaction.status
        };

        const { updates, description, ...batchWithoutSensitive } = batch;

        const encryptedBatch: EncryptedRAGUpdateBatch = {
            ...batchWithoutSensitive,
            encryptedUpdates: encryptedUpdatesData,
            encryptedDescription,
            updatesHash,
            publicMetadata
        };

        return encryptedBatch;
    }

    /**
     * Decrypt a batch of updates
     */
    async decryptUpdateBatch(encryptedBatch: EncryptedRAGUpdateBatch): Promise<RAGUpdateBatch> {
        const keyPath = HierarchicalKeyManager.getBatchKeyPath(
            encryptedBatch.universeId,
            encryptedBatch.batchId
        );

        // Decrypt updates array
        const updatesJson = await this.baseEncryption.decryptContent(
            encryptedBatch.encryptedUpdates,
            keyPath
        );
        const updatesData = JSON.parse(updatesJson);

        // Decrypt individual updates if they are encrypted
        const updates: RAGUpdate[] = [];
        for (const updateData of updatesData) {
            if (updateData.encryptedChanges) {
                // This is an encrypted update
                updates.push(await this.decryptUpdate(updateData as EncryptedRAGUpdate));
            } else {
                // This is a plain update
                updates.push(updateData as RAGUpdate);
            }
        }

        // Decrypt description if present
        let description: string | undefined;
        if (encryptedBatch.encryptedDescription) {
            description = await this.baseEncryption.decryptContent(
                encryptedBatch.encryptedDescription,
                keyPath
            );
        }

        // Verify integrity
        const expectedHash = this.generateBatchHash(updates);
        if (expectedHash !== encryptedBatch.updatesHash) {
            throw new Error('Batch integrity verification failed');
        }

        const { encryptedUpdates, encryptedDescription, updatesHash, publicMetadata, ...batchWithoutEncrypted } = encryptedBatch;

        const decryptedBatch: RAGUpdateBatch = {
            ...batchWithoutEncrypted,
            updates,
            description
        };

        return decryptedBatch;
    }

    /**
     * Create an update record for a node change
     */
    createUpdate(
        nodeId: string,
        universeId: string,
        userId: string,
        operation: 'create' | 'update' | 'delete' | 'restore',
        previousNode: RAGNode | EncryptedRAGNode | null,
        newNode: RAGNode | EncryptedRAGNode | null,
        description?: string
    ): RAGUpdate {
        const timestamp = new Date();
        const updateId = this.generateUpdateId(nodeId, timestamp);

        // Determine if this is a private update
        const isPrivate = this.isUpdatePrivate(previousNode, newNode);

        // Calculate changes
        const changes = this.calculateChanges(previousNode, newNode);

        // Determine version number
        const version = this.calculateVersion(previousNode, newNode, operation);
        const previousVersion = previousNode?.metadata.version;

        const update: RAGUpdate = {
            id: updateId,
            nodeId,
            universeId,
            userId,
            timestamp,
            operation,
            changes,
            version,
            previousVersion,
            description,
            isPrivate,
            metadata: {
                source: 'api', // This could be determined from context
                sizeDelta: this.calculateSizeDelta(previousNode, newNode),
                performanceMetrics: {
                    processingTime: 0 // Will be filled in by caller
                }
            }
        };

        return update;
    }

    /**
     * Check if an update should be encrypted (contains private data)
     */
    private isUpdatePrivate(
        previousNode: RAGNode | EncryptedRAGNode | null,
        newNode: RAGNode | EncryptedRAGNode | null
    ): boolean {
        // Check if either node is marked as private/encrypted
        if (previousNode && previousNode.privacy.encrypted) return true;
        if (newNode && newNode.privacy.encrypted) return true;

        // Check sensitivity levels
        if (previousNode && previousNode.metadata.sensitivity !== 'public') return true;
        if (newNode && newNode.metadata.sensitivity !== 'public') return true;

        return false;
    }

    /**
     * Calculate what changed between two node versions
     */
    private calculateChanges(
        previousNode: RAGNode | EncryptedRAGNode | null,
        newNode: RAGNode | EncryptedRAGNode | null
    ): RAGUpdateChanges {
        const modifiedFields: string[] = [];
        const previousValues: Record<string, any> = {};
        const newValues: Record<string, any> = {};

        if (!previousNode && newNode) {
            // Node creation
            modifiedFields.push('*'); // Indicates entire node created
            newValues['*'] = 'node_created';
        } else if (previousNode && !newNode) {
            // Node deletion
            modifiedFields.push('*');
            previousValues['*'] = 'node_deleted';
        } else if (previousNode && newNode) {
            // Node update - compare fields
            const fieldsToCheck = ['title', 'content', 'summaries', 'metadata', 'privacy', 'temporal', 'pluginData'];

            for (const field of fieldsToCheck) {
                if (JSON.stringify(previousNode[field as keyof typeof previousNode]) !==
                    JSON.stringify(newNode[field as keyof typeof newNode])) {
                    modifiedFields.push(field);
                    previousValues[field] = previousNode[field as keyof typeof previousNode];
                    newValues[field] = newNode[field as keyof typeof newNode];
                }
            }
        }

        return {
            modifiedFields,
            previousValues,
            newValues
        };
    }

    /**
     * Calculate version number for the update
     */
    private calculateVersion(
        previousNode: RAGNode | EncryptedRAGNode | null,
        newNode: RAGNode | EncryptedRAGNode | null,
        operation: string
    ): number {
        if (operation === 'create') return 1;
        if (operation === 'delete') return (previousNode?.metadata.version || 0) + 1;
        if (previousNode) return previousNode.metadata.version + 1;
        return 1;
    }

    /**
     * Calculate size delta between versions
     */
    private calculateSizeDelta(
        previousNode: RAGNode | EncryptedRAGNode | null,
        newNode: RAGNode | EncryptedRAGNode | null
    ): { contentSizeChange: number; embeddingSizeChange: number } {
        const previousContentSize = previousNode ? JSON.stringify(previousNode).length : 0;
        const newContentSize = newNode ? JSON.stringify(newNode).length : 0;

        const previousEmbeddingSize = previousNode && 'embeddings' in previousNode ?
            previousNode.embeddings.length * 4 : 0; // Approximate 4 bytes per float
        const newEmbeddingSize = newNode && 'embeddings' in newNode ?
            newNode.embeddings.length * 4 : 0;

        return {
            contentSizeChange: newContentSize - previousContentSize,
            embeddingSizeChange: newEmbeddingSize - previousEmbeddingSize
        };
    }

    /**
     * Generate unique update ID
     */
    private generateUpdateId(nodeId: string, timestamp: Date): string {
        const crypto = require('crypto');
        const data = `${nodeId}-${timestamp.toISOString()}-${Math.random()}`;
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }

    /**
     * Generate integrity hash for changes
     */
    private generateChangesHash(changes: RAGUpdateChanges): string {
        const crypto = require('crypto');
        const hashString = JSON.stringify(changes, Object.keys(changes).sort());
        return crypto.createHash('sha256').update(hashString).digest('hex');
    }

    /**
     * Generate integrity hash for batch
     */
    private generateBatchHash(updates: RAGUpdate[]): string {
        const crypto = require('crypto');
        const hashData = updates.map(u => ({ id: u.id, nodeId: u.nodeId, version: u.version, changesHash: u.changes }));
        const hashString = JSON.stringify(hashData, Object.keys(hashData).sort());
        return crypto.createHash('sha256').update(hashString).digest('hex');
    }
}

/**
 * Extended hierarchical key manager for updates
 */
declare module './base-encryption.service.js' {
    namespace HierarchicalKeyManager {
        function getUpdateKeyPath(universeId: string, nodeId: string, updateId: string): string[];
        function getBatchKeyPath(universeId: string, batchId: string): string[];
    }
}

// Extend the HierarchicalKeyManager with update-specific methods
Object.assign(HierarchicalKeyManager, {
    getUpdateKeyPath(universeId: string, nodeId: string, updateId: string): string[] {
        return ['universe', universeId, 'updates', nodeId, updateId];
    },

    getBatchKeyPath(universeId: string, batchId: string): string[] {
        return ['universe', universeId, 'batches', batchId];
    }
});
