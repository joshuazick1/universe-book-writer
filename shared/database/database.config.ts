/**
 * Helper to get commonly used collections for universe/character generation and memory.
 * Returns a promise resolving to an object with named collections.
 */
import type { Collection } from 'mongodb';
export async function getCollections(): Promise<{
    generated_universes: Collection;
    generated_characters: Collection;
    character_memories: Collection;
    users: Collection;
    api_keys: Collection;
    items: Collection;
    lore: Collection;
    species: Collection;
    factions: Collection;
    timeline_events: Collection;
    relationships: Collection;
    universes: Collection;
    locations: Collection;
}> {
    await sharedDatabaseConnection.connect();
    const db = sharedDatabaseConnection.db!;
    return {
        generated_universes: db.collection('generated_universes'),
        generated_characters: db.collection('generated_characters'),
        character_memories: db.collection('character_memories'),
        users: db.collection('users'),
        api_keys: db.collection('api_keys'),
        items: db.collection('items'),
        lore: db.collection('lore'),
        species: db.collection('species'),
        factions: db.collection('factions'),
        timeline_events: db.collection('timeline_events'),
        relationships: db.collection('relationships'),
        universes: db.collection('universes'),
        locations: db.collection('locations'),
    };
}
/**
 * Shared MongoDB Database Connection
 *
 * This module provides a singleton connection to MongoDB for use across backend, ai-server, plugins, and shared utilities.
 *
 * Usage:
 *   import { sharedDatabaseConnection } from '../database/database.config';
 *
 * Ensure you call sharedDatabaseConnection.connect() before using the connection.
 *
 * @module shared/database/database.config
 */

import { MongoClient, Db } from 'mongodb';

export class SharedDatabaseConnection {
    private client: MongoClient | null = null;
    public db: Db | null = null;
    private uri: string;
    private dbName: string;

    constructor(uri: string, dbName: string) {
        this.uri = uri;
        this.dbName = dbName;
    }

    async connect(): Promise<void> {
        if (this.client && this.db) return;
        this.client = new MongoClient(this.uri);
        await this.client.connect();
        this.db = this.client.db(this.dbName);
    }

    async disconnect(): Promise<void> {
        if (this.client) {
            await this.client.close();
            this.client = null;
            this.db = null;
        }
    }
}

// Example: URI and DB name can be set via environment variables or config
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const DB_NAME = process.env.DB_NAME || 'universe_book_writer';

export const sharedDatabaseConnection = new SharedDatabaseConnection(MONGO_URI, DB_NAME);
