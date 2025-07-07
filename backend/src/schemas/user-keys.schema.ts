/**
 * User Keys Database Schema
 * 
 * MongoDB collection schema for storing user RSA key pairs
 * Used for collaborative encryption in the RAG system
 */

import { ObjectId } from 'mongodb';
import { mongoDBConnection } from '../config/mongodb.config.js';

/**
 * User key pair document structure
 */
export interface UserKeysDocument {
    _id?: ObjectId;
    userId: string;                  // User ID reference
    publicKey: string;              // RSA public key in PEM format
    encryptedPrivateKey: string;    // Private key encrypted with user password
    keyType: 'RSA' | 'ECDH';        // Key algorithm type
    keyMetadata: {
        modulusLength: number;        // Key strength (e.g., 2048, 4096)
        algorithm: string;            // Key algorithm details
        createdAt: Date;              // When key was generated
        lastUsed?: Date;              // When key was last used
    };
    status: 'active' | 'revoked' | 'expired';
    createdAt: Date;
    updatedAt: Date;
}

/**
 * User Keys Database Service
 * 
 * Handles CRUD operations for user key pairs in MongoDB
 */
export class UserKeysService {
    private readonly collectionName = 'userKeys';

    /**
     * Get MongoDB collection for user keys
     */
    private async getCollection() {
        const client = mongoDBConnection.getClient();
        if (!client) {
            throw new Error('MongoDB client not initialized');
        }
        return client.db().collection<UserKeysDocument>(this.collectionName);
    }

    /**
     * Create indexes for the user keys collection
     */
    async createIndexes(): Promise<void> {
        const collection = await this.getCollection();

        await collection.createIndexes([
            // Unique index on userId - each user has one key pair
            { key: { userId: 1 }, unique: true },
            // Index on key type for filtering
            { key: { keyType: 1 } },
            // Index on status for filtering active keys
            { key: { status: 1 } },
            // Index on creation date for cleanup operations
            { key: { createdAt: 1 } },
            // Compound index for user + status queries
            { key: { userId: 1, status: 1 } }
        ]);
    }

    /**
     * Store a user's key pair
     * 
     * @param keyPair - User key pair to store
     * @returns Stored document
     */
    async storeUserKeys(keyPair: Omit<UserKeysDocument, '_id' | 'createdAt' | 'updatedAt'>): Promise<UserKeysDocument> {
        const collection = await this.getCollection();

        const document: UserKeysDocument = {
            ...keyPair,
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
     * Get a user's key pair
     * 
     * @param userId - User ID to get keys for
     * @returns User key pair or null if not found
     */
    async getUserKeys(userId: string): Promise<UserKeysDocument | null> {
        const collection = await this.getCollection();

        return await collection.findOne({
            userId,
            status: 'active'
        });
    }

    /**
     * Update user's key pair (for key rotation)
     * 
     * @param userId - User ID to update
     * @param updates - Fields to update
     * @returns Updated document
     */
    async updateUserKeys(
        userId: string,
        updates: Partial<UserKeysDocument>
    ): Promise<UserKeysDocument | null> {
        const collection = await this.getCollection();

        const result = await collection.findOneAndUpdate(
            { userId, status: 'active' },
            {
                $set: {
                    ...updates,
                    updatedAt: new Date()
                }
            },
            { returnDocument: 'after' }
        );

        return result.value;
    }

    /**
     * Revoke a user's key pair
     * 
     * @param userId - User ID to revoke keys for
     * @returns True if keys were revoked
     */
    async revokeUserKeys(userId: string): Promise<boolean> {
        const collection = await this.getCollection();

        const result = await collection.updateOne(
            { userId, status: 'active' },
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
     * Get public key for a user
     * 
     * @param userId - User ID to get public key for
     * @returns Public key in PEM format or null
     */
    async getUserPublicKey(userId: string): Promise<string | null> {
        const collection = await this.getCollection();

        const document = await collection.findOne(
            { userId, status: 'active' },
            { projection: { publicKey: 1 } }
        );

        return document?.publicKey || null;
    }

    /**
     * Get public keys for multiple users
     * 
     * @param userIds - Array of user IDs
     * @returns Map of userId to public key
     */
    async getMultipleUserPublicKeys(userIds: string[]): Promise<Map<string, string>> {
        const collection = await this.getCollection();

        const documents = await collection.find(
            { userId: { $in: userIds }, status: 'active' },
            { projection: { userId: 1, publicKey: 1 } }
        ).toArray();

        const keyMap = new Map<string, string>();
        documents.forEach(doc => {
            keyMap.set(doc.userId, doc.publicKey);
        });

        return keyMap;
    }

    /**
     * Clean up expired or revoked keys
     * 
     * @param olderThan - Delete keys older than this date
     * @returns Number of keys deleted
     */
    async cleanupOldKeys(olderThan: Date): Promise<number> {
        const collection = await this.getCollection();

        const result = await collection.deleteMany({
            $or: [
                { status: 'revoked', updatedAt: { $lt: olderThan } },
                { status: 'expired', updatedAt: { $lt: olderThan } }
            ]
        });

        return result.deletedCount;
    }
}

/**
 * Singleton instance for user keys service
 */
export const userKeysService = new UserKeysService();
