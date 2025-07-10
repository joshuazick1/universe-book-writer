/**
 * Shared Database Configuration for AI Server
 * 
 * This module provides access to the shared MongoDB instance used by both
 * the main backend and AI server. Uses the same connection pool and database.
 */

import { MongoClient, Db, Collection } from 'mongodb';

// Database configuration matching backend
export const AI_SERVER_DB_CONFIG = {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017',
    dbName: process.env.MONGODB_DB_NAME || 'verseforge',
    options: {
        maxPoolSize: 10,
        minPoolSize: 2,
        maxIdleTimeMS: 60000,
        connectTimeoutMS: 5000,
        serverSelectionTimeoutMS: 5000,
    },
};

class SharedDatabaseConnection {
    private static instance: SharedDatabaseConnection;
    private client: MongoClient | null = null;
    private db: Db | null = null;

    private constructor() { }

    public static getInstance(): SharedDatabaseConnection {
        if (!SharedDatabaseConnection.instance) {
            SharedDatabaseConnection.instance = new SharedDatabaseConnection();
        }
        return SharedDatabaseConnection.instance;
    }

    public async connect(): Promise<Db> {
        if (this.db) {
            return this.db;
        }

        try {
            this.client = await MongoClient.connect(AI_SERVER_DB_CONFIG.uri, AI_SERVER_DB_CONFIG.options);
            this.db = this.client.db(AI_SERVER_DB_CONFIG.dbName);

            // Create AI-specific indexes
            await this.createAIIndexes();

            console.log('AI Server connected to shared MongoDB database.');
            return this.db;
        } catch (error) {
            console.error('Error connecting AI Server to MongoDB:', error);
            throw error;
        }
    }

    public async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
            console.log('AI Server MongoDB connection closed.');
        }
    }

    public getDatabase(): Db | null {
        return this.db;
    }

    public getClient(): MongoClient | null {
        return this.client;
    }

    private async createAIIndexes(): Promise<void> {
        if (!this.db) {
            throw new Error('Database not initialized');
        }

        // Character memories collection indexes
        await this.db.collection('character_memories').createIndexes([
            { key: { characterId: 1 } },
            { key: { memoryType: 1 } },
            { key: { memorySource: 1 } },
            { key: { canonStatus: 1 } },
            { key: { importance: -1 } },
            { key: { createdAt: -1 } },
            { key: { timelineAnchor: 1 } },
            // Compound indexes for common queries
            { key: { characterId: 1, memoryType: 1 } },
            { key: { characterId: 1, importance: -1 } },
            { key: { characterId: 1, canonStatus: 1 } },
        ]);

        // Generated universes collection indexes
        await this.db.collection('generated_universes').createIndexes([
            { key: { name: 1 }, unique: true },
            { key: { creatorId: 1 } },
            { key: { genre: 1 } },
            { key: { createdAt: -1 } },
        ]);

        // Generated characters collection indexes
        await this.db.collection('generated_characters').createIndexes([
            { key: { name: 1, universeId: 1 } },
            { key: { universeId: 1 } },
            { key: { creatorId: 1 } },
            { key: { role: 1 } },
            { key: { storyImportance: 1 } },
            { key: { createdAt: -1 } },
        ]);

        console.log('AI Server MongoDB indexes created successfully.');
    }
}

export const sharedDatabaseConnection = SharedDatabaseConnection.getInstance();

// Collection type helpers

export interface DatabaseCollections {
    characters: Collection;
    generated_characters: Collection;
    universes: Collection;
    generated_universes: Collection;
    character_memories: Collection;
    users: Collection;
    api_keys: Collection;
}


export const getCollections = async (): Promise<DatabaseCollections> => {
    const db = await sharedDatabaseConnection.connect();
    return {
        characters: db.collection('characters'),
        generated_characters: db.collection('generated_characters'),
        universes: db.collection('universes'),
        generated_universes: db.collection('generated_universes'),
        character_memories: db.collection('character_memories'),
        users: db.collection('users'),
        api_keys: db.collection('api_keys'),
    };
};
