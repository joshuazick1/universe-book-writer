/**
 * MongoDB implementation of Plugin Repository
 */

import type { PluginRegistryEntry, PluginState, PluginType } from '@universe-book-writer/core';
import { type Collection, type Db, type MongoClient, ObjectId } from 'mongodb';
import type { PluginRepository } from '../../core/interfaces/plugin.repository.interface.js';

/**
 * MongoDB plugin repository implementation
 */
export class MongoPluginRepository implements PluginRepository {
  private db: Db;
  private collection: Collection<PluginRegistryEntry>;

  constructor(client: MongoClient, dbName = 'universe_book_writer') {
    this.db = client.db(dbName);
    this.collection = this.db.collection<PluginRegistryEntry>('plugins');
  }

  /**
   * Initialize repository (create indexes)
   */
  async initialize(): Promise<void> {
    // Create indexes for efficient queries
    await this.collection.createIndex({ 'pluginMetadata.name': 1 }, { unique: true });
    await this.collection.createIndex({ 'pluginMetadata.type': 1 });
    await this.collection.createIndex({ state: 1 });
    await this.collection.createIndex({ 'pluginMetadata.dependencies': 1 });
    await this.collection.createIndex({ dependents: 1 });
  }

  /**
   * Find a plugin by name
   */
  async findByName(name: string): Promise<PluginRegistryEntry | null> {
    const result = await this.collection.findOne({ 'pluginMetadata.name': name });
    return result ? this.mapFromMongo(result) : null;
  }

  /**
   * Find plugins by type
   */
  async findByType(type: PluginType): Promise<PluginRegistryEntry[]> {
    const cursor = this.collection.find({ 'pluginMetadata.type': type });
    const results = await cursor.toArray();
    return results.map(r => this.mapFromMongo(r));
  }

  /**
   * Find plugins by state
   */
  async findByState(state: PluginState): Promise<PluginRegistryEntry[]> {
    const cursor = this.collection.find({ state });
    const results = await cursor.toArray();
    return results.map(r => this.mapFromMongo(r));
  }

  /**
   * Find all plugins
   */
  async findAll(): Promise<PluginRegistryEntry[]> {
    const cursor = this.collection.find({});
    const results = await cursor.toArray();
    return results.map(r => this.mapFromMongo(r));
  }

  /**
   * Save a plugin registry entry
   */
  async save(entry: PluginRegistryEntry): Promise<PluginRegistryEntry> {
    const mongoDoc = this.mapToMongo(entry);
    const result = await this.collection.insertOne(mongoDoc);

    const saved = await this.collection.findOne({ _id: result.insertedId });
    if (!saved) {
      throw new Error('Failed to save plugin registry entry');
    }

    return this.mapFromMongo(saved);
  }

  /**
   * Update a plugin registry entry
   */
  async update(
    id: string,
    updates: Partial<PluginRegistryEntry>
  ): Promise<PluginRegistryEntry | null> {
    const updateDoc = {
      ...updates,
      updatedAt: new Date(),
    };

    const result = await this.collection.findOneAndUpdate(
      { id },
      { $set: updateDoc },
      { returnDocument: 'after' }
    );

    return result ? this.mapFromMongo(result) : null;
  }

  /**
   * Delete a plugin registry entry
   */
  async delete(id: string): Promise<boolean> {
    const result = await this.collection.deleteOne({ id });
    return result.deletedCount === 1;
  }

  /**
   * Check if a plugin exists
   */
  async exists(name: string): Promise<boolean> {
    const count = await this.collection.countDocuments({ 'pluginMetadata.name': name });
    return count > 0;
  }

  /**
   * Find plugins that depend on the given plugin
   */
  async findDependents(pluginName: string): Promise<PluginRegistryEntry[]> {
    const cursor = this.collection.find({
      $or: [
        { dependents: pluginName },
        { [`pluginMetadata.dependencies.${pluginName}`]: { $exists: true } },
      ],
    });

    const results = await cursor.toArray();
    return results.map(r => this.mapFromMongo(r));
  }

  /**
   * Find plugins that the given plugin depends on
   */
  async findDependencies(pluginName: string): Promise<PluginRegistryEntry[]> {
    const plugin = await this.findByName(pluginName);
    if (!plugin) {
      return [];
    }

    const dependencyNames = Object.keys(plugin.pluginMetadata.dependencies);
    if (dependencyNames.length === 0) {
      return [];
    }

    const cursor = this.collection.find({
      'pluginMetadata.name': { $in: dependencyNames },
    });

    const results = await cursor.toArray();
    return results.map(r => this.mapFromMongo(r));
  }

  /**
   * Map MongoDB document to domain object
   */
  private mapFromMongo(doc: any): PluginRegistryEntry {
    return {
      id: doc.id || doc._id?.toString(),
      pluginMetadata: doc.pluginMetadata,
      config: doc.config,
      state: doc.state,
      loadPath: doc.loadPath,
      lastError: doc.lastError,
      dependents: doc.dependents || [],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      metadata: doc.metadata,
    };
  }

  /**
   * Map domain object to MongoDB document
   */
  private mapToMongo(entry: PluginRegistryEntry): any {
    const { id, ...rest } = entry;
    return {
      id,
      ...rest,
      _id: new ObjectId(),
    };
  }

  /**
   * Clean up and close connections
   */
  async close(): Promise<void> {
    // Connection management is handled by the MongoDB client
    // This method is for cleanup if needed
  }
}
