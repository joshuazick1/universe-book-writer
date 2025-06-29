/**
 * Universe Repository Implementation
 * 
 * MongoDB implementation of the universe repository interface providing
 * complete CRUD operations, search capabilities, and plugin data management.
 */

import { Collection, MongoClient, Db } from 'mongodb';
import { UniverseEntity, UniverseRepository } from '../../core/entities/universe.entity.js';
import { UniverseSearchParams, PaginatedUniverseResult } from '../../core/interfaces/universe.interfaces.js';
import { UserEncryptionService } from '../../core/services/user-encryption.service.js';
import { UniverseEncryptionService, type EncryptedUniverseData } from '../../core/services/universe-encryption-updated.service.js';
import { UserRepository } from '../../core/interfaces/user.repository.js';

/**
 * MongoDB Universe Repository Implementation
 */
export class MongoUniverseRepository implements UniverseRepository {
    private db: Db;
    private client: MongoClient;
    private collection: Collection;
    private syncEventsCollection: Collection;
    private collaboratorsCollection: Collection;
    private preservationCollection: Collection;
    private encryptionService: UniverseEncryptionService;

    constructor(
        db: Db,
        client: MongoClient,
        userRepository: UserRepository,
        encryptionService?: UniverseEncryptionService
    ) {
        this.db = db;
        this.client = client;
        this.collection = db.collection('universes');
        this.syncEventsCollection = db.collection('universe_sync_events');
        this.collaboratorsCollection = db.collection('universe_collaborators');
        this.preservationCollection = db.collection('plugin_data_preservation');

        // Initialize encryption service with user-level salt support
        if (encryptionService) {
            this.encryptionService = encryptionService;
        } else {
            const userEncryptionService = new UserEncryptionService(userRepository);
            this.encryptionService = new UniverseEncryptionService(userEncryptionService);
        }
    }
    /**
     * Save universe to database with encryption support for private universes
     */
    async save(universe: UniverseEntity): Promise<void> {
        try {
            // Check if encryption is required
            if (universe.isEncryptionRequired()) {
                // Create encrypted version
                const encryptedData = await universe.createEncryptedData(this.encryptionService);

                // Store minimal metadata + encrypted data
                const docToSave = {
                    id: universe.id,
                    owner_id: universe.owner_id,
                    sync_token: universe.sync_token,
                    created_at: universe.created_at,
                    updated_at: universe.updated_at,
                    is_encrypted: true,
                    encrypted_data: encryptedData,
                    // Store searchable metadata (not encrypted)
                    searchable_name: universe.name, // For search functionality
                    plugin_id: universe.plugin_config.active_plugin
                };

                await this.collection.replaceOne(
                    { id: universe.id },
                    docToSave,
                    { upsert: true }
                );
            } else {
                // Store unencrypted (public universe)
                const universeData = universe.toObject();
                const docToSave = {
                    ...universeData,
                    is_encrypted: false
                };

                await this.collection.replaceOne(
                    { id: universe.id },
                    docToSave,
                    { upsert: true }
                );
            }
        } catch (error) {
            throw new Error(`Failed to save universe: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Find universe by ID with decryption support
     */
    async findById(id: string): Promise<UniverseEntity | null> {
        try {
            const universeData = await this.collection.findOne({ id });

            if (!universeData) {
                return null;
            }

            // Check if data is encrypted
            if (universeData.is_encrypted && universeData.encrypted_data) {
                // Decrypt the data
                const basicInfo = {
                    id: universeData.id,
                    created_at: universeData.created_at,
                    updated_at: universeData.updated_at,
                    sync_token: universeData.sync_token
                };

                return await UniverseEntity.fromEncryptedData(
                    universeData.encrypted_data,
                    this.encryptionService,
                    universeData.owner_id,
                    basicInfo
                );
            } else {
                // Data is not encrypted, use normal deserialization
                return UniverseEntity.fromObject(universeData);
            }
        } catch (error) {
            throw new Error(`Failed to find universe by ID: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Find universes by owner ID with decryption support
     */
    async findByOwnerId(ownerId: string): Promise<UniverseEntity[]> {
        try {
            const cursor = this.collection.find({ owner_id: ownerId }).sort({ updated_at: -1 });
            const universeDocs = await cursor.toArray();

            // Handle both encrypted and unencrypted universes
            const universes: UniverseEntity[] = [];

            for (const doc of universeDocs) {
                if (doc.is_encrypted && doc.encrypted_data) {
                    // Decrypt the data
                    const basicInfo = {
                        id: doc.id,
                        created_at: doc.created_at,
                        updated_at: doc.updated_at,
                        sync_token: doc.sync_token
                    };

                    const universe = await UniverseEntity.fromEncryptedData(
                        doc.encrypted_data,
                        this.encryptionService,
                        doc.owner_id,
                        basicInfo
                    );
                    universes.push(universe);
                } else {
                    // Data is not encrypted, use normal deserialization
                    universes.push(UniverseEntity.fromObject(doc));
                }
            }

            return universes;
        } catch (error) {
            throw new Error(`Failed to find universes by owner: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Find universes by plugin ID with decryption support
     */
    async findByPluginId(pluginId: string): Promise<UniverseEntity[]> {
        try {
            // For encrypted universes, we need to search using the stored plugin_id field
            const cursor = this.collection.find({
                $or: [
                    { 'plugin_config.active_plugin': pluginId }, // Unencrypted universes
                    { 'plugin_id': pluginId } // Encrypted universes (metadata stored separately)
                ]
            }).sort({ updated_at: -1 });
            const universeDocs = await cursor.toArray();

            // Handle both encrypted and unencrypted universes
            const universes: UniverseEntity[] = [];

            for (const doc of universeDocs) {
                if (doc.is_encrypted && doc.encrypted_data) {
                    // Decrypt the data
                    const basicInfo = {
                        id: doc.id,
                        created_at: doc.created_at,
                        updated_at: doc.updated_at,
                        sync_token: doc.sync_token
                    };

                    const universe = await UniverseEntity.fromEncryptedData(
                        doc.encrypted_data,
                        this.encryptionService,
                        doc.owner_id,
                        basicInfo
                    );

                    // Verify plugin matches after decryption
                    if (universe.plugin_config.active_plugin === pluginId) {
                        universes.push(universe);
                    }
                } else {
                    // Data is not encrypted, use normal deserialization
                    universes.push(UniverseEntity.fromObject(doc));
                }
            }

            return universes;
        } catch (error) {
            throw new Error(`Failed to find universes by plugin: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Delete universe
     */
    async delete(id: string): Promise<void> {
        try {
            // Check if running in replica set mode (supports transactions)
            const serverStatus = await this.db.admin().serverStatus();
            const isReplicaSet = serverStatus.repl && serverStatus.repl.setName;

            if (isReplicaSet) {
                // Use transaction for consistency in replica set
                const session = this.client.startSession();

                try {
                    await session.withTransaction(async () => {
                        // Delete universe
                        await this.collection.deleteOne({ id }, { session });

                        // Delete related sync events
                        await this.syncEventsCollection.deleteMany({ universe_id: id }, { session });

                        // Delete collaborator records
                        await this.collaboratorsCollection.deleteMany({ universe_id: id }, { session });

                        // Keep preservation data for recovery (don't delete)
                    });
                } finally {
                    await session.endSession();
                }
            } else {
                // Use simple deletion for standalone MongoDB (development/testing)
                await this.collection.deleteOne({ id });
                await this.syncEventsCollection.deleteMany({ universe_id: id });
                await this.collaboratorsCollection.deleteMany({ universe_id: id });
                // Keep preservation data for recovery (don't delete)
            }
        } catch (error) {
            throw new Error(`Failed to delete universe: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    /**
     * Search universes with text search and decryption support
     */
    async search(query: string, ownerId?: string): Promise<UniverseEntity[]> {
        try {
            // For encrypted universes, we can only search using the searchable_name field
            const searchFilter: any = {
                $or: [
                    { $text: { $search: query } }, // Unencrypted universes
                    { searchable_name: { $regex: query, $options: 'i' } } // Encrypted universes
                ]
            };

            if (ownerId) {
                searchFilter.owner_id = ownerId;
            }

            const cursor = this.collection
                .find(searchFilter)
                .sort({ updated_at: -1 });

            const universeDocs = await cursor.toArray();

            // Handle both encrypted and unencrypted universes
            const universes: UniverseEntity[] = [];

            for (const doc of universeDocs) {
                if (doc.is_encrypted && doc.encrypted_data) {
                    // Decrypt the data
                    const basicInfo = {
                        id: doc.id,
                        created_at: doc.created_at,
                        updated_at: doc.updated_at,
                        sync_token: doc.sync_token
                    };

                    const universe = await UniverseEntity.fromEncryptedData(
                        doc.encrypted_data,
                        this.encryptionService,
                        doc.owner_id,
                        basicInfo
                    );
                    universes.push(universe);
                } else {
                    // Data is not encrypted, use normal deserialization
                    universes.push(UniverseEntity.fromObject(doc));
                }
            }

            return universes;
        } catch (error) {
            throw new Error(`Failed to search universes: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Advanced search with multiple filters
     */
    async searchAdvanced(params: UniverseSearchParams): Promise<PaginatedUniverseResult> {
        try {
            const filter: any = {};

            // Text search
            if (params.query) {
                filter.$text = { $search: params.query };
            }

            // Owner filter
            if (params.owner_id) {
                filter.owner_id = params.owner_id;
            }

            // Plugin filter
            if (params.plugin_id) {
                filter['plugin_config.active_plugin'] = params.plugin_id;
            }

            // Sub-universe filter
            if (params.sub_universe) {
                filter['plugin_config.sub_universe'] = params.sub_universe;
            }

            // Privacy filter
            if (params.is_private !== undefined) {
                filter['settings.is_private'] = params.is_private;
            }

            // Date range filters
            if (params.created_after || params.created_before) {
                filter.created_at = {};
                if (params.created_after) {
                    filter.created_at.$gte = params.created_after;
                }
                if (params.created_before) {
                    filter.created_at.$lte = params.created_before;
                }
            }

            // Pagination
            const limit = Math.min(params.limit || 20, 100); // Max 100 results
            const offset = params.offset || 0;

            // Count total results
            const total_count = await this.collection.countDocuments(filter);

            // Execute search
            let cursor = this.collection.find(filter);

            // Sorting
            if (params.query) {
                cursor = cursor.sort({ score: { $meta: 'textScore' }, updated_at: -1 });
            } else {
                cursor = cursor.sort({ updated_at: -1 });
            }

            // Apply pagination
            cursor = cursor.skip(offset).limit(limit);

            const universeDocs = await cursor.toArray();
            const universes = universeDocs.map(doc => UniverseEntity.fromObject(doc));

            // Calculate pagination info
            const total_pages = Math.ceil(total_count / limit);
            const current_page = Math.floor(offset / limit) + 1;
            const has_next = offset + limit < total_count;
            const has_previous = offset > 0;

            return {
                universes,
                total_count,
                current_page,
                total_pages,
                has_next,
                has_previous
            };
        } catch (error) {
            throw new Error(`Failed to perform advanced search: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Check if universe name is available for user
     */
    async isNameAvailable(name: string, ownerId: string, excludeId?: string): Promise<boolean> {
        try {
            const filter: any = { name, owner_id: ownerId };

            if (excludeId) {
                filter.id = { $ne: excludeId };
            }

            const existing = await this.collection.findOne(filter);
            return existing === null;
        } catch (error) {
            throw new Error(`Failed to check name availability: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get universe statistics
     */
    async getStatistics(ownerId?: string): Promise<any> {
        try {
            const matchStage = ownerId ? { $match: { owner_id: ownerId } } : { $match: {} };

            const pipeline = [
                matchStage,
                {
                    $group: {
                        _id: null,
                        total_universes: { $sum: 1 },
                        private_universes: {
                            $sum: { $cond: [{ $eq: ['$settings.is_private', true] }, 1, 0] }
                        },
                        collaborative_universes: {
                            $sum: { $cond: [{ $eq: ['$settings.allow_collaboration', true] }, 1, 0] }
                        },
                        plugins: { $addToSet: '$plugin_config.active_plugin' },
                        canon_levels: { $addToSet: '$plugin_config.canon_compliance' }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        total_universes: 1,
                        private_universes: 1,
                        collaborative_universes: 1,
                        plugin_count: { $size: '$plugins' },
                        plugins: 1,
                        canon_levels: 1
                    }
                }
            ];

            const result = await this.collection.aggregate(pipeline).toArray();
            return result[0] || {
                total_universes: 0,
                private_universes: 0,
                collaborative_universes: 0,
                plugin_count: 0,
                plugins: [],
                canon_levels: []
            };
        } catch (error) {
            throw new Error(`Failed to get statistics: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get recently updated universes
     */
    async getRecentlyUpdated(ownerId?: string, limit: number = 10): Promise<UniverseEntity[]> {
        try {
            const filter = ownerId ? { owner_id: ownerId } : {};

            const cursor = this.collection
                .find(filter)
                .sort({ updated_at: -1 })
                .limit(limit);

            const universeDocs = await cursor.toArray();

            return universeDocs.map(doc => UniverseEntity.fromObject(doc));
        } catch (error) {
            throw new Error(`Failed to get recently updated universes: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Get universes with specific plugin and sub-universe
     */
    async findByPluginAndSubUniverse(pluginId: string, subUniverse: string): Promise<UniverseEntity[]> {
        try {
            const cursor = this.collection.find({
                'plugin_config.active_plugin': pluginId,
                'plugin_config.sub_universe': subUniverse
            }).sort({ updated_at: -1 });

            const universeDocs = await cursor.toArray();

            return universeDocs.map(doc => UniverseEntity.fromObject(doc));
        } catch (error) {
            throw new Error(`Failed to find universes by plugin and sub-universe: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Update universe sync token
     */
    async updateSyncToken(id: string, syncToken: string): Promise<void> {
        try {
            await this.collection.updateOne(
                { id },
                {
                    $set: {
                        sync_token: syncToken,
                        updated_at: new Date()
                    }
                }
            );
        } catch (error) {
            throw new Error(`Failed to update sync token: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Bulk update universe sync tokens
     */
    async bulkUpdateSyncTokens(updates: { id: string; syncToken: string }[]): Promise<void> {
        try {
            const bulkOps = updates.map(update => ({
                updateOne: {
                    filter: { id: update.id },
                    update: {
                        $set: {
                            sync_token: update.syncToken,
                            updated_at: new Date()
                        }
                    }
                }
            }));

            if (bulkOps.length > 0) {
                await this.collection.bulkWrite(bulkOps);
            }
        } catch (error) {
            throw new Error(`Failed to bulk update sync tokens: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
}
