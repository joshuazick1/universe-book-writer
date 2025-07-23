/**
 * Tests for MongoPluginRepository
 */

// @ts-nocheck - Disable TypeScript checking for mock configuration issues
import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { MongoClient, Db, Collection, ObjectId } from 'mongodb';
import { PluginType, PluginState } from '@verseforge/core';
import type { PluginRegistryEntry, PluginMetadata, PluginConfig } from '@verseforge/core';
import { MongoPluginRepository } from '../../../../src/infrastructure/persistence/mongo-plugin.repository.js';

// Mock MongoDB
jest.mock('mongodb');

describe('MongoPluginRepository', () => {
    let repository: MongoPluginRepository;
    let mockClient: jest.Mocked<MongoClient>;
    let mockDb: jest.Mocked<Db>;
    let mockCollection: jest.Mocked<Collection>;

    const mockMetadata: PluginMetadata = {
        name: 'test-plugin',
        version: '1.0.0',
        description: 'Test plugin',
        author: 'Test Author',
        type: PluginType.CORE,
        dependencies: {},
    };

    const mockConfig: PluginConfig = {
        enabled: true,
        settings: {},
    };
    const mockEntry: PluginRegistryEntry = {
        id: 'test-plugin-id',
        pluginMetadata: mockMetadata,
        config: mockConfig,
        state: PluginState.UNLOADED,
        loadPath: '/path/to/plugin',
        dependents: [],
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
    };

    beforeEach(() => {
        jest.clearAllMocks();    // Setup MongoDB mocks
        mockCollection = {
            createIndex: jest.fn().mockResolvedValue('index-name' as any),
            findOne: jest.fn(),
            find: jest.fn(),
            insertOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            deleteOne: jest.fn(),
            countDocuments: jest.fn(),
        } as any;

        mockDb = {
            collection: jest.fn().mockReturnValue(mockCollection),
        } as any;

        mockClient = {
            db: jest.fn().mockReturnValue(mockDb),
        } as any;

        repository = new MongoPluginRepository(mockClient, 'test_db');
    });

    afterEach(() => {
        jest.resetAllMocks();
    });

    describe('constructor', () => {
        it('should initialize with custom database name', () => {
            const customRepo = new MongoPluginRepository(mockClient, 'custom_db');
            expect(mockClient.db).toHaveBeenCalledWith('custom_db');
        });

        it('should initialize with default database name', () => {
            const defaultRepo = new MongoPluginRepository(mockClient);
            expect(mockClient.db).toHaveBeenCalledWith('verseforge');
        });
    });

    describe('initialize', () => {
        it('should create all required indexes', async () => {
            await repository.initialize();

            expect(mockCollection.createIndex).toHaveBeenCalledTimes(5);
            expect(mockCollection.createIndex).toHaveBeenCalledWith(
                { 'pluginMetadata.name': 1 },
                { unique: true }
            );
            expect(mockCollection.createIndex).toHaveBeenCalledWith({ 'pluginMetadata.type': 1 });
            expect(mockCollection.createIndex).toHaveBeenCalledWith({ state: 1 });
            expect(mockCollection.createIndex).toHaveBeenCalledWith({ 'pluginMetadata.dependencies': 1 });
            expect(mockCollection.createIndex).toHaveBeenCalledWith({ dependents: 1 });
        });
    });

    describe('findByName', () => {
        it('should find a plugin by name', async () => {
            mockCollection.findOne.mockResolvedValue(mockEntry);

            const result = await repository.findByName('test-plugin');

            expect(mockCollection.findOne).toHaveBeenCalledWith({ 'pluginMetadata.name': 'test-plugin' });
            expect(result).toEqual(mockEntry);
        });

        it('should return null when plugin not found', async () => {
            mockCollection.findOne.mockResolvedValue(null);

            const result = await repository.findByName('nonexistent-plugin');

            expect(result).toBeNull();
        });
    });

    describe('findByType', () => {
        it('should find plugins by type', async () => {
            const mockCursor = {
                toArray: jest.fn().mockResolvedValue([mockEntry] as any),
            };
            mockCollection.find.mockReturnValue(mockCursor as any);

            const result = await repository.findByType(PluginType.CORE);

            expect(mockCollection.find).toHaveBeenCalledWith({ 'pluginMetadata.type': PluginType.CORE });
            expect(result).toEqual([mockEntry]);
        });

        it('should return empty array when no plugins found', async () => {
            const mockCursor = {
                toArray: jest.fn().mockResolvedValue([]),
            };
            mockCollection.find.mockReturnValue(mockCursor as any);

            const result = await repository.findByType(PluginType.UNIVERSE);

            expect(result).toEqual([]);
        });
    });

    describe('findByState', () => {
        it('should find plugins by state', async () => {
            const mockCursor = {
                toArray: jest.fn().mockResolvedValue([mockEntry]),
            };
            mockCollection.find.mockReturnValue(mockCursor as any);

            const result = await repository.findByState(PluginState.ACTIVE);

            expect(mockCollection.find).toHaveBeenCalledWith({ state: PluginState.ACTIVE });
            expect(result).toEqual([mockEntry]);
        });
    });

    describe('findAll', () => {
        it('should find all plugins', async () => {
            const mockCursor = {
                toArray: jest.fn().mockResolvedValue([mockEntry]),
            };
            mockCollection.find.mockReturnValue(mockCursor as any);

            const result = await repository.findAll();

            expect(mockCollection.find).toHaveBeenCalledWith({});
            expect(result).toEqual([mockEntry]);
        });
    });
    describe('save', () => {
        it('should save a plugin registry entry', async () => {
            const insertedId = new ObjectId();
            mockCollection.insertOne.mockResolvedValue({ insertedId } as any);
            mockCollection.findOne.mockResolvedValue({ ...mockEntry, _id: insertedId });

            const result = await repository.save(mockEntry);

            expect(mockCollection.insertOne).toHaveBeenCalled();
            expect(mockCollection.findOne).toHaveBeenCalledWith({ _id: insertedId });
            // The mapFromMongo method adds lastError and metadata fields that might be undefined
            expect(result).toEqual({
                ...mockEntry,
                lastError: undefined,
                metadata: undefined
            });
        });

        it('should throw error when save fails', async () => {
            const insertedId = new ObjectId();
            mockCollection.insertOne.mockResolvedValue({ insertedId } as any);
            mockCollection.findOne.mockResolvedValue(null);

            await expect(repository.save(mockEntry)).rejects.toThrow('Failed to save plugin registry entry');
        });
    }); describe('update', () => {
        it('should update a plugin registry entry', async () => {
            const updates = { state: PluginState.ACTIVE };
            const updatedEntry = { ...mockEntry, ...updates, updatedAt: new Date(), _id: new ObjectId() };

            mockCollection.findOneAndUpdate.mockResolvedValue(updatedEntry as any);

            const result = await repository.update('test-plugin-id', updates);

            expect(mockCollection.findOneAndUpdate).toHaveBeenCalledWith(
                { id: 'test-plugin-id' },
                { $set: expect.objectContaining(updates) },
                { returnDocument: 'after' }
            );
            // The mapFromMongo method removes _id field and adds lastError and metadata fields that might be undefined
            const { _id, ...expectedEntry } = updatedEntry;
            expect(result).toEqual({
                ...expectedEntry,
                lastError: undefined,
                metadata: undefined
            });
        });

        it('should return null when plugin not found', async () => {
            mockCollection.findOneAndUpdate.mockResolvedValue(null);

            const result = await repository.update('nonexistent-id', { state: PluginState.ACTIVE });

            expect(result).toBeNull();
        });
    });

    describe('delete', () => {
        it('should delete a plugin registry entry', async () => {
            mockCollection.deleteOne.mockResolvedValue({ deletedCount: 1 } as any);

            const result = await repository.delete('test-plugin-id');

            expect(mockCollection.deleteOne).toHaveBeenCalledWith({ id: 'test-plugin-id' });
            expect(result).toBe(true);
        });

        it('should return false when plugin not found', async () => {
            mockCollection.deleteOne.mockResolvedValue({ deletedCount: 0 } as any);

            const result = await repository.delete('nonexistent-id');

            expect(result).toBe(false);
        });
    });

    describe('exists', () => {
        it('should return true when plugin exists', async () => {
            mockCollection.countDocuments.mockResolvedValue(1);

            const result = await repository.exists('test-plugin');

            expect(mockCollection.countDocuments).toHaveBeenCalledWith({ 'pluginMetadata.name': 'test-plugin' });
            expect(result).toBe(true);
        });

        it('should return false when plugin does not exist', async () => {
            mockCollection.countDocuments.mockResolvedValue(0);

            const result = await repository.exists('nonexistent-plugin');

            expect(result).toBe(false);
        });
    });

    describe('findDependents', () => {
        it('should find plugins that depend on the given plugin', async () => {
            const mockCursor = {
                toArray: jest.fn().mockResolvedValue([mockEntry]),
            };
            mockCollection.find.mockReturnValue(mockCursor as any);

            const result = await repository.findDependents('dependency-plugin');

            expect(mockCollection.find).toHaveBeenCalledWith({
                $or: [
                    { dependents: 'dependency-plugin' },
                    { [`pluginMetadata.dependencies.dependency-plugin`]: { $exists: true } },
                ],
            });
            expect(result).toEqual([mockEntry]);
        });

        it('should return empty array when no dependents found', async () => {
            const mockCursor = {
                toArray: jest.fn().mockResolvedValue([]),
            };
            mockCollection.find.mockReturnValue(mockCursor as any);

            const result = await repository.findDependents('no-dependents-plugin');

            expect(result).toEqual([]);
        });
    });

    describe('findDependencies', () => {
        it('should find dependencies of a plugin', async () => {
            const pluginWithDeps = {
                ...mockEntry,
                pluginMetadata: {
                    ...mockMetadata,
                    dependencies: { 'dep-plugin': '1.0.0' },
                },
            };

            // Mock finding the plugin first
            mockCollection.findOne.mockResolvedValue(pluginWithDeps);

            // Mock finding the dependencies
            const mockCursor = {
                toArray: jest.fn().mockResolvedValue([mockEntry]),
            };
            mockCollection.find.mockReturnValue(mockCursor as any);

            const result = await repository.findDependencies('test-plugin');

            expect(mockCollection.findOne).toHaveBeenCalledWith({ 'pluginMetadata.name': 'test-plugin' });
            expect(mockCollection.find).toHaveBeenCalledWith({
                'pluginMetadata.name': { $in: ['dep-plugin'] },
            });
            expect(result).toEqual([mockEntry]);
        });

        it('should return empty array when plugin not found', async () => {
            mockCollection.findOne.mockResolvedValue(null);

            const result = await repository.findDependencies('nonexistent-plugin');

            expect(result).toEqual([]);
        });

        it('should return empty array when plugin has no dependencies', async () => {
            mockCollection.findOne.mockResolvedValue(mockEntry);

            const result = await repository.findDependencies('test-plugin');

            expect(result).toEqual([]);
        });
    });

    describe('mapFromMongo', () => {
        it('should map MongoDB document with _id to domain object', () => {
            const mongoDoc = {
                _id: new ObjectId(),
                pluginMetadata: mockMetadata,
                config: mockConfig,
                state: PluginState.UNLOADED,
                loadPath: '/path/to/plugin',
                dependents: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            // Access private method for testing
            const result = (repository as any).mapFromMongo(mongoDoc);

            expect(result.id).toBe(mongoDoc._id.toString());
            expect(result.pluginMetadata).toEqual(mockMetadata);
            expect(result.config).toEqual(mockConfig);
            expect(result.state).toBe(PluginState.UNLOADED);
        });

        it('should map MongoDB document with existing id', () => {
            const mongoDoc = {
                id: 'existing-id',
                _id: new ObjectId(),
                pluginMetadata: mockMetadata,
                config: mockConfig,
                state: PluginState.UNLOADED,
                loadPath: '/path/to/plugin',
                dependents: [],
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const result = (repository as any).mapFromMongo(mongoDoc);

            expect(result.id).toBe('existing-id');
        }); it('should handle missing optional fields', () => {
            const mongoDoc = {
                id: 'test-id',
                pluginMetadata: mockMetadata,
                config: mockConfig,
                state: PluginState.UNLOADED,
                loadPath: '/path/to/plugin',
                createdAt: new Date(),
                updatedAt: new Date(),
            };

            const result = (repository as any).mapFromMongo(mongoDoc);

            expect(result.dependents).toEqual([]);
            expect(result.lastError).toBeUndefined();
            expect(result.metadata).toBeUndefined();
        });
    });

    describe('mapToMongo', () => {
        it('should map domain object to MongoDB document', () => {
            const result = (repository as any).mapToMongo(mockEntry);

            expect(result.id).toBe(mockEntry.id);
            expect(result.pluginMetadata).toEqual(mockEntry.pluginMetadata);
            expect(result.config).toEqual(mockEntry.config);
            expect(result._id).toBeInstanceOf(ObjectId);
        });
    });

    describe('close', () => {
        it('should close without errors', async () => {
            await expect(repository.close()).resolves.toBeUndefined();
        });
    });
});
