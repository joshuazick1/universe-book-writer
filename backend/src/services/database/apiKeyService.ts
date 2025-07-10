// API Key Service for backend (shared with ai-server)
// This should use the same MongoDB and schema as the ai-server

import { ObjectId } from 'mongodb';
import { getDb } from '../../db.js';

export interface ApiKey {
    key: string;
    userId: string;
    createdAt: Date;
    lastUsedAt?: Date;
    revoked?: boolean;
    scopes?: string[];
}

const COLLECTION = 'api_keys';

export const apiKeyService = {
    async listApiKeys(userId: string): Promise<ApiKey[]> {
        const db = await getDb();
        return db.collection(COLLECTION).find({ userId }).toArray();
    },

    async createApiKey(userId: string, scopes: string[] = []): Promise<ApiKey> {
        const key = generateApiKey();
        const doc: ApiKey = {
            key,
            userId,
            createdAt: new Date(),
            scopes,
            revoked: false,
        };
        const db = await getDb();
        await db.collection(COLLECTION).insertOne(doc);
        return doc;
    },

    async revokeApiKey(userId: string, key: string): Promise<void> {
        const db = await getDb();
        await db.collection(COLLECTION).updateOne({ userId, key }, { $set: { revoked: true } });
    },
};

function generateApiKey(): string {
    // Simple random key generator (replace with secure version in production)
    return (
        Math.random().toString(36).slice(2) +
        Math.random().toString(36).slice(2) +
        Math.random().toString(36).slice(2)
    );
}
