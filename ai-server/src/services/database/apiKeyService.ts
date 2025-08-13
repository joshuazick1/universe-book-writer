import { ObjectId, Collection } from 'mongodb';
import { getCollections } from '../../../../shared/database/database.config.js';

export interface ApiKeyRecord {
    _id?: ObjectId;
    key: string;
    userId: string;
    createdAt: Date;
    lastUsedAt?: Date;
    revoked?: boolean;
    scopes?: string[];
}


export class ApiKeyService {
    private collection: Collection<ApiKeyRecord> | null = null;

    /**
     * Get the MongoDB collection for API keys.
     */
    async getCollection(): Promise<Collection<ApiKeyRecord>> {
        if (this.collection) return this.collection;
        const collections = await getCollections();
        if (!collections.api_keys) {
            throw new Error('api_keys collection not found');
        }
        this.collection = collections.api_keys as unknown as Collection<ApiKeyRecord>;
        return this.collection;
    }

    /**
     * Find a valid (not revoked) API key record by key value.
     */
    async findByKey(key: string): Promise<ApiKeyRecord | null> {
        const col = await this.getCollection();
        const result = await col.findOne({ key, revoked: { $ne: true } });
        return result as ApiKeyRecord | null;
    }

    /**
     * Create a new API key for a user. Returns the full key (show once).
     */
    async createKey(userId: string, scopes: string[] = []): Promise<{ key: string; record: ApiKeyRecord }> {
        const col = await this.getCollection();
        const key = this.generateKey();
        const record: ApiKeyRecord = {
            key,
            userId,
            createdAt: new Date(),
            scopes,
            revoked: false
        };
        await col.insertOne(record);
        return { key, record };
    }

    /**
     * List all API key metadata for a user (never returns the full key).
     */
    async listKeysForUser(userId: string): Promise<Omit<ApiKeyRecord, 'key'>[]> {
        const col = await this.getCollection();
        const keys = await col.find({ userId }).project({ key: 0 }).toArray();
        // Cast each document to Omit<ApiKeyRecord, 'key'>
        return keys.map(doc => ({
            _id: doc._id,
            userId: doc.userId,
            createdAt: doc.createdAt,
            lastUsedAt: doc.lastUsedAt,
            revoked: doc.revoked,
            scopes: doc.scopes
        }));
    }

    /**
     * Revoke an API key by its value (for user self-service).
     */
    async revokeKey(key: string, userId: string): Promise<boolean> {
        const col = await this.getCollection();
        const result = await col.updateOne({ key, userId }, { $set: { revoked: true } });
        return result.modifiedCount > 0;
    }

    /**
     * Update the lastUsedAt timestamp for a key.
     */
    async updateLastUsedAt(key: string): Promise<void> {
        const col = await this.getCollection();
        await col.updateOne({ key }, { $set: { lastUsedAt: new Date() } });
    }

    /**
     * Generate a new API key string (prefix: sk-).
     */
    private generateKey(): string {
        return (
            'sk-' +
            [...Array(48)]
                .map(() => Math.floor(Math.random() * 36).toString(36))
                .join('')
        );
    }
}
