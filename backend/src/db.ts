import { mongoDBConnection, MONGODB_CONFIG } from './config/mongodb.config.js';
import type { Db } from 'mongodb';

/**
 * Returns the connected MongoDB database instance.
 * Ensures the connection is established before returning the DB.
 */
export async function getDb(): Promise<Db> {
    const client = await mongoDBConnection.connect();
    return client.db(MONGODB_CONFIG.dbName);
}
