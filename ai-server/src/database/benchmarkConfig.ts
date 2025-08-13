/**
 * @fileoverview Database schema and configuration utilities for benchmarking.
 * @module src/database/benchmarkConfig
 *
 * Provides CRUD operations and schema management for benchmark configurations.
 *
 * @example
 * import { getBenchmarkConfig } from 'src/database/benchmarkConfig';
 *
 * @edgecase
 * Handles missing configurations and schema migrations.
 */

import { MongoClient, WithId, FindOneAndUpdateOptions } from 'mongodb';

const client = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017');
const db = client.db('universe_book_writer');
const collection = db.collection<BenchmarkConfig>('benchmark_config');

export interface BenchmarkConfig {
    serverId: string;
    maxJobs: number;
    priority: number;
    frequency: string;
}

/**
 * Retrieves the benchmark configuration for a specific server.
 * @param serverId - The ID of the server
 * @returns The benchmark configuration
 */
export async function getBenchmarkConfig(serverId: string): Promise<BenchmarkConfig | null> {
    return await collection.findOne({ serverId });
}

/**
 * Updates the benchmark configuration for a specific server.
 * @param config - The benchmark configuration to update
 * @returns The updated benchmark configuration
 */
export async function updateBenchmarkConfig(config: BenchmarkConfig): Promise<BenchmarkConfig | null> {
    const options: FindOneAndUpdateOptions = { upsert: true, returnDocument: 'after' };
    const result = await collection.findOneAndUpdate(
        { serverId: config.serverId },
        { $set: config },
        options
    );
    if (result && typeof result === 'object' && 'value' in result) {
        return result.value as BenchmarkConfig;
    }
    return null;
}

/**
 * Deletes the benchmark configuration for a specific server.
 * @param serverId - The ID of the server
 * @returns True if the configuration was deleted, otherwise false
 */
export async function deleteBenchmarkConfig(serverId: string): Promise<boolean> {
    const result = await collection.deleteOne({ serverId });
    return result.deletedCount > 0;
}

/**
 * Migrates the database schema for benchmark configurations.
 * @returns True if the migration was successful, otherwise false
 */
export async function migrateBenchmarkConfigSchema(): Promise<boolean> {
    try {
        await collection.createIndex({ serverId: 1 }, { unique: true });
        return true;
    } catch (error) {
        console.error('Error migrating benchmark_config schema:', error);
        return false;
    }
}

/**
 * Retrieves the effective benchmark configuration for a specific server, falling back to global config if not found.
 * @param serverId - The ID of the server
 * @returns The effective benchmark configuration
 */
export async function getEffectiveBenchmarkConfig(serverId: string): Promise<BenchmarkConfig | null> {
    const serverConfig = await getBenchmarkConfig(serverId);
    if (serverConfig) {
        return serverConfig;
    }
    return await getBenchmarkConfig('global');
}

/**
 * Sets the global benchmark configuration.
 * @param config - The global benchmark configuration to set
 * @returns The updated global benchmark configuration
 */
export async function setGlobalBenchmarkConfig(config: BenchmarkConfig): Promise<BenchmarkConfig | null> {
    config.serverId = 'global';
    return await updateBenchmarkConfig(config);
}
