/**
 * Content Keys Database Schema
 * 
 * MongoDB collection schema for storing wrapped content keys
 * Used for collaborative encryption in the RAG system
 */

import { ObjectId } from 'mongodb';
import { mongoDBConnection } from '../config/mongodb.config.js';

/**
 * Wrapped content key for a single collaborator
 */
export interface WrappedContentKey {
    userId: string;           // User ID who can unwrap this key
    wrappedKey: string;       // Content key encrypted with user's public key
    algorithm: string;        // Wrapping algorithm (e.g., 'rsa-oaep')
    createdAt: Date;          // When this wrapped key was created
}

/**
 * Content key document structure
 */
export interface ContentKeysDocument {
    _id?: ObjectId;
    universeId: string;               // Universe this key encrypts
    contentKeyId: string;             // Unique identifier for this content key
    wrappedKeys: WrappedContentKey[]; // Content key wrapped for each collaborator
    keyMetadata: {
        algorithm: string;              // Content encryption algorithm (e.g., 'aes-256-gcm')
        keyLength: number;              // Key length in bytes
        createdAt: Date;                // When content key was generated
        rotatedAt?: Date;               // When key was last rotated
        version: number;                // Key version for rotation tracking
    };
    status: 'active' | 'rotated' | 'revoked';
    createdAt: Date;
    updatedAt: Date;
}

/**
 * Content Keys Database Service
 * 
 * Handles CRUD operations for content keys in MongoDB
 * CRITICAL: Both backend and ai-server use this service for key sharing
 */
export class ContentKeysService {
    private readonly collectionName = 'contentKeys';

    /**
     * Get MongoDB collection for content keys
     */
    private async getCollection() {
        const client = mongoDBConnection.getClient();
        if (!client) {
            throw new Error('MongoDB client not initialized');
        }
        return client.db().collection<ContentKeysDocument>(this.collectionName);
    }

    /**
     * Create indexes for the content keys collection
     */
    async createIndexes(): Promise<void> {
        const collection = await this.getCollection();

        await collection.createIndexes([
            // Unique index on universeId + status (one active key per universe)
            {
                key: { universeId: 1, status: 1 },
                unique: true,
                partialFilterExpression: { status: 'active' },
                name: 'unique_active_universe_key'
            },
            // Index on contentKeyId for direct key lookups
            { key: { contentKeyId: 1 }, unique: true },
            // Index on universe for finding keys by universe
            { key: { universeId: 1 } },
            // Index on status for filtering active keys
            { key: { status: 1 } },
            // Index on collaborator user IDs for access checking
            { key: { 'wrappedKeys.userId': 1 } },
            // Index on creation date for cleanup operations
            { key: { createdAt: 1 } },
            // Compound index for version queries
            { key: { universeId: 1, 'keyMetadata.version': -1 } }
        ]);
    }

    /**
     * Store a content key with wrapped keys for collaborators
     * 
     * @param contentKey - Content key document to store
     * @returns Stored document
     */
    async storeContentKey(contentKey: Omit<ContentKeysDocument, '_id' | 'createdAt' | 'updatedAt'>): Promise<ContentKeysDocument> {
        const collection = await this.getCollection();

        const document: ContentKeysDocument = {
            ...contentKey,
            createdAt: new Date(),
            updatedAt: new Date()
        };

        const result = await collection.insertOne(document);

        return {
            ...document,
            _id: result.insertedId
        };
    }

    /**
     * Get active content key for a universe
     * 
     * @param universeId - Universe to get content key for
     * @returns Content key document or null if not found
     */
    async getActiveContentKey(universeId: string): Promise<ContentKeysDocument | null> {
        const collection = await this.getCollection();

        return await collection.findOne({
            universeId,
            status: 'active'
        });
    }

    /**
     * Get content key by ID
     * 
     * @param contentKeyId - Content key ID to look up
     * @returns Content key document or null if not found
     */
    async getContentKeyById(contentKeyId: string): Promise<ContentKeysDocument | null> {
        const collection = await this.getCollection();

        return await collection.findOne({ contentKeyId });
    }

    /**
     * Add a wrapped key for a new collaborator
     * 
     * @param contentKeyId - Content key to add collaborator to
     * @param wrappedKey - Wrapped key for the new collaborator
     * @returns True if collaborator was added
     */
    async addCollaborator(contentKeyId: string, wrappedKey: WrappedContentKey): Promise<boolean> {
        const collection = await this.getCollection();

        // Check if user already has access
        const existing = await collection.findOne({
            contentKeyId,
            'wrappedKeys.userId': wrappedKey.userId
        });

        if (existing) {
            return false; // User already has access
        }

        const result = await collection.updateOne(
            { contentKeyId, status: 'active' },
            {
                $push: { wrappedKeys: wrappedKey },
                $set: { updatedAt: new Date() }
            }
        );

        return result.modifiedCount > 0;
    }

    /**
     * Remove a collaborator's access to a content key
     * 
     * @param contentKeyId - Content key to remove collaborator from
     * @param userId - User to remove access for
     * @returns True if collaborator was removed
     */
    async removeCollaborator(contentKeyId: string, userId: string): Promise<boolean> {
        const collection = await this.getCollection();

        const result = await collection.updateOne(
            { contentKeyId, status: 'active' },
            {
                $pull: { wrappedKeys: { userId } },
                $set: { updatedAt: new Date() }
            }
        );

        return result.modifiedCount > 0;
    }

    /**
     * Get wrapped key for a specific user and universe
     * 
     * @param universeId - Universe to get key for
     * @param userId - User to get wrapped key for
     * @returns Wrapped key or null if user has no access
     */
    async getWrappedKeyForUser(universeId: string, userId: string): Promise<WrappedContentKey | null> {
        const collection = await this.getCollection();

        const document = await collection.findOne(
            {
                universeId,
                status: 'active',
                'wrappedKeys.userId': userId
            },
            {
                projection: {
                    wrappedKeys: {
                        $elemMatch: { userId }
                    }
                }
            }
        );

        return document?.wrappedKeys?.[0] || null;
    }

    /**
     * Check if a user has access to a universe's content key
     * 
     * @param universeId - Universe to check access for
     * @param userId - User to check access for
     * @returns True if user has access
     */
    async hasUserAccess(universeId: string, userId: string): Promise<boolean> {
        const collection = await this.getCollection();

        const count = await collection.countDocuments({
            universeId,
            status: 'active',
            'wrappedKeys.userId': userId
        });

        return count > 0;
    }

    /**
     * Get all collaborators for a universe
     * 
     * @param universeId - Universe to get collaborators for
     * @returns Array of user IDs who have access
     */
    async getCollaborators(universeId: string): Promise<string[]> {
        const collection = await this.getCollection();

        const document = await collection.findOne(
            { universeId, status: 'active' },
            { projection: { wrappedKeys: 1 } }
        );

        return document?.wrappedKeys.map(wk => wk.userId) || [];
    }

    /**
     * Rotate a content key (mark old as rotated, create new)
     * 
     * @param universeId - Universe to rotate key for
     * @returns True if rotation was successful
     */
    async rotateContentKey(universeId: string): Promise<boolean> {
        const collection = await this.getCollection();

        // Mark current key as rotated
        const result = await collection.updateOne(
            { universeId, status: 'active' },
            {
                $set: {
                    status: 'rotated' as const,
                    'keyMetadata.rotatedAt': new Date(),
                    updatedAt: new Date()
                }
            }
        );

        return result.modifiedCount > 0;
    }

    /**
     * Revoke a content key (mark as revoked)
     * 
     * @param contentKeyId - Content key to revoke
     * @returns True if key was revoked
     */
    async revokeContentKey(contentKeyId: string): Promise<boolean> {
        const collection = await this.getCollection();

        const result = await collection.updateOne(
            { contentKeyId },
            {
                $set: {
                    status: 'revoked' as const,
                    updatedAt: new Date()
                }
            }
        );

        return result.modifiedCount > 0;
    }

    /**
     * Get content keys by status
     * 
     * @param status - Status to filter by
     * @returns Array of content key documents
     */
    async getContentKeysByStatus(status: 'active' | 'rotated' | 'revoked'): Promise<ContentKeysDocument[]> {
        const collection = await this.getCollection();

        return await collection.find({ status }).toArray();
    }

    /**
     * Clean up old content keys
     * 
     * @param olderThan - Delete keys older than this date
     * @returns Number of keys deleted
     */
    async cleanupOldKeys(olderThan: Date): Promise<number> {
        const collection = await this.getCollection();

        const result = await collection.deleteMany({
            $or: [
                { status: 'rotated', updatedAt: { $lt: olderThan } },
                { status: 'revoked', updatedAt: { $lt: olderThan } }
            ]
        });

        return result.deletedCount;
    }

    /**
     * Get statistics about content keys
     * 
     * @returns Key statistics
     */
    async getKeyStatistics(): Promise<{
        total: number;
        active: number;
        rotated: number;
        revoked: number;
        universes: number;
    }> {
        const collection = await this.getCollection();

        const stats = await collection.aggregate([
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    active: {
                        $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] }
                    },
                    rotated: {
                        $sum: { $cond: [{ $eq: ['$status', 'rotated'] }, 1, 0] }
                    },
                    revoked: {
                        $sum: { $cond: [{ $eq: ['$status', 'revoked'] }, 1, 0] }
                    },
                    universes: { $addToSet: '$universeId' }
                }
            },
            {
                $project: {
                    _id: 0,
                    total: 1,
                    active: 1,
                    rotated: 1,
                    revoked: 1,
                    universes: { $size: '$universes' }
                }
            }
        ]).toArray();

        const result = stats[0] as any;

        return result || {
            total: 0,
            active: 0,
            rotated: 0,
            revoked: 0,
            universes: 0
        };
    }
}

/**
 * Singleton instance for content keys service
 */
export const contentKeysService = new ContentKeysService();
