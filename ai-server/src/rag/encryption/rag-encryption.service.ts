/**
 * RAG-Specific Encryption Services
 * 
 * Encryption services designed specifically for RAG nodes and relationships,
 * preserving graph structure while protecting content.
 */

import { encrypt, decrypt } from '../../../../shared/encryption/encryptionService.js';
import { RAGNode, RAGRelationship, RAGNodePrivacy } from '../core/types.js';
import { EncryptedData, BaseEncryptionService, HierarchicalKeyManager } from '../../../../shared/encryption/base-encryption.service.js';

/**
 * Encrypted RAG node data
 */
export interface EncryptedRAGNode extends Omit<RAGNode, 'content' | 'summaries'> {
    /** Encrypted content */
    encryptedContent: EncryptedData;

    /** Encrypted summaries */
    encryptedSummaries: EncryptedData;

    /** Whether embeddings are encrypted (for searchable encryption) */
    encryptedEmbeddings?: EncryptedData;

    /** Original content hash for integrity */
    contentHash: string;
}

/**
 * Encrypted RAG relationship data
 */
export interface EncryptedRAGRelationship extends Omit<RAGRelationship, 'metadata'> {
    /** Encrypted metadata */
    encryptedMetadata: EncryptedData;

    /** Original metadata hash for integrity */
    metadataHash: string;

    /** Minimal metadata needed for graph traversal */
    publicMetadata: {
        universeId: string;
        description?: string;
    };
}

/**
 * RAG Node Encryption Service
 */
export class RAGNodeEncryptionService {
    constructor(private baseEncryption: BaseEncryptionService) { }

    /**
     * Encrypt a RAG node
     */
    async encryptNode(node: RAGNode): Promise<EncryptedRAGNode> {
        if (!node.privacy.encrypted) {
            throw new Error('Node is not marked for encryption');
        }

        const keyPath = HierarchicalKeyManager.getNodeKeyPath(
            node.metadata.universeId,
            node.id,
            node.metadata.sensitivity
        );

        // Encrypt main content
        const encryptedContent = await this.baseEncryption.encryptContent(
            JSON.stringify(node.content),
            keyPath,
            node.metadata.sensitivity,
            this.getStrategyForLevel(node.privacy.encryptionLevel)
        );

        // Encrypt summaries
        const encryptedSummaries = await this.baseEncryption.encryptContent(
            JSON.stringify(node.summaries),
            keyPath,
            node.metadata.sensitivity,
            this.getStrategyForLevel(node.privacy.encryptionLevel)
        );

        // Optionally encrypt embeddings for privacy-preserving search
        let encryptedEmbeddings: EncryptedData | undefined;
        if (node.metadata.sensitivity === 'restricted' && node.embeddings.length > 0) {
            encryptedEmbeddings = await this.baseEncryption.encryptContent(
                JSON.stringify(node.embeddings),
                keyPath,
                node.metadata.sensitivity,
                this.getStrategyForLevel(node.privacy.encryptionLevel)
            );
        }

        // Generate content hash
        const contentHash = this.generateContentHash(node.content, node.summaries);

        const { content, summaries, ...nodeWithoutContent } = node;

        const encryptedNode: EncryptedRAGNode = {
            ...nodeWithoutContent,
            encryptedContent,
            encryptedSummaries,
            encryptedEmbeddings,
            contentHash,
            // Clear embeddings if encrypted
            embeddings: encryptedEmbeddings ? [] : node.embeddings
        };

        return encryptedNode;
    }

    /**
     * Decrypt a RAG node
     */
    async decryptNode(encryptedNode: EncryptedRAGNode): Promise<RAGNode> {
        const keyPath = HierarchicalKeyManager.getNodeKeyPath(
            encryptedNode.metadata.universeId,
            encryptedNode.id,
            encryptedNode.metadata.sensitivity
        );

        // Decrypt content
        const contentJson = await this.baseEncryption.decryptContent(
            encryptedNode.encryptedContent,
            keyPath
        );
        const content = JSON.parse(contentJson);

        // Decrypt summaries
        const summariesJson = await this.baseEncryption.decryptContent(
            encryptedNode.encryptedSummaries,
            keyPath
        );
        const summaries = JSON.parse(summariesJson);

        // Decrypt embeddings if present
        let embeddings = encryptedNode.embeddings;
        if (encryptedNode.encryptedEmbeddings) {
            const embeddingsJson = await this.baseEncryption.decryptContent(
                encryptedNode.encryptedEmbeddings,
                keyPath
            );
            embeddings = JSON.parse(embeddingsJson);
        }

        // Verify integrity
        const expectedHash = this.generateContentHash(content, summaries);
        if (expectedHash !== encryptedNode.contentHash) {
            throw new Error('Content integrity verification failed');
        }

        const { encryptedContent, encryptedSummaries, encryptedEmbeddings, contentHash, ...nodeWithoutEncrypted } = encryptedNode;

        const decryptedNode: RAGNode = {
            ...nodeWithoutEncrypted,
            content,
            summaries,
            embeddings
        };

        return decryptedNode;
    }

    /**
     * Check if a node needs encryption
     */
    shouldEncrypt(node: RAGNode): boolean {
        return node.privacy.encrypted || node.metadata.sensitivity !== 'public';
    }

    /**
     * Update encryption for a node (when sensitivity changes)
     */
    async updateEncryption(node: RAGNode): Promise<RAGNode | EncryptedRAGNode> {
        const classification = this.baseEncryption.classifyAndEncrypt(
            node.content.description,
            node.type,
            node.metadata
        );

        // Update privacy settings based on classification
        const updatedPrivacy: RAGNodePrivacy = {
            ...node.privacy,
            encrypted: classification.shouldEncrypt,
            encryptionLevel: this.getEncryptionLevel(classification.classification.sensitivity)
        };

        const updatedNode: RAGNode = {
            ...node,
            privacy: updatedPrivacy,
            metadata: {
                ...node.metadata,
                sensitivity: classification.classification.sensitivity
            }
        };

        // Encrypt if needed
        if (classification.shouldEncrypt) {
            return await this.encryptNode(updatedNode);
        }

        return updatedNode;
    }

    private getStrategyForLevel(level?: string): string | undefined {
        switch (level) {
            case 'restricted':
                return 'chacha20-poly1305';
            case 'sensitive':
            case 'basic':
                return 'aes-256-gcm';
            default:
                return undefined;
        }
    }

    private getEncryptionLevel(sensitivity: string): 'basic' | 'sensitive' | 'restricted' {
        switch (sensitivity) {
            case 'restricted':
                return 'restricted';
            case 'sensitive':
                return 'sensitive';
            default:
                return 'basic';
        }
    }

    private generateContentHash(content: any, summaries: any): string {
        const crypto = require('crypto');
        const hashData = { content, summaries };
        const hashString = JSON.stringify(hashData, Object.keys(hashData).sort());
        return crypto.createHash('sha256').update(hashString).digest('hex');
    }
}

/**
 * RAG Relationship Encryption Service
 */
export class RAGRelationshipEncryptionService {
    constructor(private baseEncryption: BaseEncryptionService) { }

    /**
     * Encrypt a RAG relationship
     */
    async encryptRelationship(relationship: RAGRelationship): Promise<EncryptedRAGRelationship> {
        if (!relationship.privacy.encrypted) {
            throw new Error('Relationship is not marked for encryption');
        }

        const keyPath = HierarchicalKeyManager.getRelationshipKeyPath(
            relationship.metadata.universeId,
            relationship.id
        );

        // Encrypt metadata while preserving structure for graph traversal
        const encryptedMetadata = await this.baseEncryption.encryptContent(
            JSON.stringify(relationship.metadata),
            keyPath,
            this.getEncryptionLevel(relationship.privacy.encryptionLevel),
            this.getStrategyForLevel(relationship.privacy.encryptionLevel)
        );

        // Generate metadata hash
        const metadataHash = this.generateMetadataHash(relationship.metadata);

        const { metadata, ...relationshipWithoutMetadata } = relationship;

        const encryptedRelationship: EncryptedRAGRelationship = {
            ...relationshipWithoutMetadata,
            encryptedMetadata,
            metadataHash,
            publicMetadata: {
                universeId: relationship.metadata.universeId,
                description: '[Encrypted]'
            }
        };

        return encryptedRelationship;
    }

    /**
     * Decrypt a RAG relationship
     */
    async decryptRelationship(encryptedRelationship: EncryptedRAGRelationship): Promise<RAGRelationship> {
        const keyPath = HierarchicalKeyManager.getRelationshipKeyPath(
            encryptedRelationship.publicMetadata.universeId,
            encryptedRelationship.id
        );

        // Decrypt metadata
        const metadataJson = await this.baseEncryption.decryptContent(
            encryptedRelationship.encryptedMetadata,
            keyPath
        );
        const metadata = JSON.parse(metadataJson);

        // Verify integrity
        const expectedHash = this.generateMetadataHash(metadata);
        if (expectedHash !== encryptedRelationship.metadataHash) {
            throw new Error('Metadata integrity verification failed');
        }

        const { encryptedMetadata, metadataHash, publicMetadata, ...relationshipWithoutEncrypted } = encryptedRelationship;

        const decryptedRelationship: RAGRelationship = {
            ...relationshipWithoutEncrypted,
            metadata
        };

        return decryptedRelationship;
    }

    /**
     * Create searchable encrypted relationship
     * Preserves graph structure while encrypting sensitive metadata
     */
    async createSearchableEncrypted(relationship: RAGRelationship): Promise<EncryptedRAGRelationship> {
        // Keep graph structure unencrypted for traversal
        const publicMetadata = {
            universeId: relationship.metadata.universeId,
            description: '[Encrypted]'
        };

        // Encrypt sensitive metadata
        const sensitiveMetadata = {
            ...relationship.metadata,
            universeId: undefined, // Remove from encrypted payload
            description: relationship.metadata.description
        };

        const keyPath = HierarchicalKeyManager.getRelationshipKeyPath(
            relationship.metadata.universeId,
            relationship.id
        );

        const encryptedMetadata = await this.baseEncryption.encryptContent(
            JSON.stringify(sensitiveMetadata),
            keyPath,
            this.getEncryptionLevel(relationship.privacy.encryptionLevel),
            this.getStrategyForLevel(relationship.privacy.encryptionLevel)
        );

        const metadataHash = this.generateMetadataHash(relationship.metadata);

        return {
            ...relationship,
            publicMetadata,
            encryptedMetadata,
            metadataHash
        } as EncryptedRAGRelationship;
    }

    private getStrategyForLevel(level?: string): string | undefined {
        switch (level) {
            case 'restricted':
                return 'chacha20-poly1305';
            case 'sensitive':
            case 'basic':
                return 'aes-256-gcm';
            default:
                return undefined;
        }
    }

    private getEncryptionLevel(level?: string): string {
        return level || 'basic';
    }

    private generateMetadataHash(metadata: any): string {
        const crypto = require('crypto');
        const hashString = JSON.stringify(metadata, Object.keys(metadata).sort());
        return crypto.createHash('sha256').update(hashString).digest('hex');
    }
}

/**
 * Timeline Encryption Service for temporal data
 */
export class RAGTimelineEncryptionService {
    constructor(private baseEncryption: BaseEncryptionService) { }

    /**
     * Encrypt timeline data while preserving temporal ordering
     */
    async encryptTimelineData(
        nodeId: string,
        universeId: string,
        timelineData: any,
        preserveOrdering: boolean = true
    ): Promise<EncryptedData> {
        const keyPath = ['universe', universeId, 'timeline', nodeId];

        if (preserveOrdering) {
            // Encrypt content but preserve timestamp structure for ordering
            const { timestamps, ...sensitiveData } = timelineData;

            const encryptedContent = await this.baseEncryption.encryptContent(
                JSON.stringify(sensitiveData),
                keyPath,
                'sensitive'
            );

            // Return structure that preserves ordering capability
            return {
                ...encryptedContent,
                data: JSON.stringify({
                    timestamps,
                    encryptedData: encryptedContent.data
                })
            };
        } else {
            // Full encryption
            return await this.baseEncryption.encryptContent(
                JSON.stringify(timelineData),
                keyPath,
                'sensitive'
            );
        }
    }

    /**
     * Decrypt timeline data
     */
    async decryptTimelineData(
        encryptedData: EncryptedData,
        nodeId: string,
        universeId: string,
        preservedOrdering: boolean = true
    ): Promise<any> {
        const keyPath = ['universe', universeId, 'timeline', nodeId];

        if (preservedOrdering) {
            const decryptedJson = await this.baseEncryption.decryptContent(encryptedData, keyPath);
            const { timestamps, encryptedData: innerEncrypted } = JSON.parse(decryptedJson);

            const innerEncryptedData: EncryptedData = {
                ...encryptedData,
                data: innerEncrypted
            };

            const sensitiveDataJson = await this.baseEncryption.decryptContent(innerEncryptedData, keyPath);
            const sensitiveData = JSON.parse(sensitiveDataJson);

            return {
                timestamps,
                ...sensitiveData
            };
        } else {
            const decryptedJson = await this.baseEncryption.decryptContent(encryptedData, keyPath);
            return JSON.parse(decryptedJson);
        }
    }
}

/**
 * Vector Encryption Service for encrypted semantic embeddings
 */
export class RAGVectorEncryptionService {
    constructor(private baseEncryption: BaseEncryptionService) { }

    /**
     * Encrypt vector embeddings while preserving searchability (if possible)
     * Note: This is a placeholder for advanced cryptographic techniques
     */
    async encryptVector(
        vector: number[],
        nodeId: string,
        universeId: string,
        preserveSearchability: boolean = false
    ): Promise<EncryptedData> {
        const keyPath = ['universe', universeId, 'vectors', nodeId];

        if (preserveSearchability) {
            // TODO: Implement homomorphic encryption or other privacy-preserving techniques
            // For now, just encrypt the vector
            console.warn('Searchable vector encryption not yet implemented, using standard encryption');
        }

        return await this.baseEncryption.encryptContent(
            JSON.stringify(vector),
            keyPath,
            'sensitive'
        );
    }

    /**
     * Decrypt vector embeddings
     */
    async decryptVector(
        encryptedData: EncryptedData,
        nodeId: string,
        universeId: string
    ): Promise<number[]> {
        const keyPath = ['universe', universeId, 'vectors', nodeId];

        const decryptedJson = await this.baseEncryption.decryptContent(encryptedData, keyPath);
        return JSON.parse(decryptedJson);
    }

    /**
     * Create searchable encrypted vector using privacy-preserving techniques
     * This is a placeholder for future implementation
     */
    async createSearchableEncryptedVector(
        vector: number[],
        nodeId: string,
        universeId: string
    ): Promise<{ encryptedVector: EncryptedData; searchVector?: number[] }> {
        // TODO: Implement techniques like:
        // - Homomorphic encryption
        // - Secure multi-party computation
        // - Locality-sensitive hashing with encryption
        // - Order-preserving encryption for similarity search

        const encryptedVector = await this.encryptVector(vector, nodeId, universeId, false);

        return {
            encryptedVector,
            searchVector: undefined // Would contain privacy-preserving search representation
        };
    }
}
