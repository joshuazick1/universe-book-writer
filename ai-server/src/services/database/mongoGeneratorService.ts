// ============================================
// SHARED MEMORY QUERIES (STUBS)
// ============================================

/**
 * Get shared memories by event ID
 */

/**
 * Get shared memories by event ID (production implementation)
 */
export async function getSharedMemoriesByEvent(eventId: string): Promise<any[]> {
    return mongoGeneratorService.getSharedMemoriesByEvent(eventId);
}

/**
 * Get shared memories by time (or time range)
 */

/**
 * Get shared memories by time (production implementation)
 */
export async function getSharedMemoriesByTime(timestamp: string): Promise<any[]> {
    return mongoGeneratorService.getSharedMemoriesByTime(timestamp);
}

/**
 * Get shared memories involving a character
 */

/**
 * Get shared memories by character (production implementation)
 */
export async function getSharedMemoriesByCharacter(characterId: string): Promise<any[]> {
    return mongoGeneratorService.getSharedMemoriesByCharacter(characterId);
}
/**
 * MongoDB Service for AI Generation Systems
 * 
 * Provides MongoDB persistence for universe and character generation,
 * as well as character memory management.
 */

import { ObjectId, Collection } from 'mongodb';
import { getCollections } from '../../config/database.config.js';
import type {
    GeneratedUniverse,
    UniverseGenerationRequest
} from '../universeGenerator/types.js';
import type {
    GeneratedCharacter,
    CharacterMemory,
    CharacterGenerationRequest
} from '../characterGenerator/types.js';

export class MongoGeneratorService {
    private collections: Awaited<ReturnType<typeof getCollections>> | null = null;

    private async getCollections() {
        if (!this.collections) {
            this.collections = await getCollections();
        }
        return this.collections;
    }

    // ============================================
    // UNIVERSE PERSISTENCE
    // ============================================

    async saveUniverse(universe: GeneratedUniverse): Promise<void> {
        const collections = await this.getCollections();

        const doc = {
            ...universe,
            _id: new ObjectId(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await collections.generated_universes.insertOne(doc);
        console.log(`Universe "${universe.name}" saved to MongoDB`);
    }

    async getUniverse(id: string): Promise<GeneratedUniverse | null> {
        const collections = await this.getCollections();

        const doc = await collections.generated_universes.findOne({ id });
        if (!doc) return null;

        // Remove MongoDB _id for clean response
        const { _id, ...universe } = doc;
        return universe as GeneratedUniverse;
    }

    async getUniversesByCreator(creatorId: string): Promise<GeneratedUniverse[]> {
        const collections = await this.getCollections();

        const docs = await collections.generated_universes
            .find({ creatorId })
            .sort({ createdAt: -1 })
            .toArray();

        return docs.map(({ _id, ...universe }) => universe as GeneratedUniverse);
    }

    async updateUniverse(id: string, updates: Partial<GeneratedUniverse>): Promise<boolean> {
        const collections = await this.getCollections();

        const result = await collections.generated_universes.updateOne(
            { id },
            {
                $set: {
                    ...updates,
                    updatedAt: new Date()
                }
            }
        );

        return result.modifiedCount > 0;
    }

    async deleteUniverse(id: string): Promise<boolean> {
        const collections = await this.getCollections();

        // Also delete all characters in this universe
        await collections.generated_characters.deleteMany({ universeId: id });

        const result = await collections.generated_universes.deleteOne({ id });
        return result.deletedCount > 0;
    }

    // ============================================
    // CHARACTER PERSISTENCE
    // ============================================

    async saveCharacter(character: GeneratedCharacter): Promise<void> {
        const collections = await this.getCollections();

        const doc = {
            ...character,
            _id: new ObjectId(),
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        await collections.generated_characters.insertOne(doc);
        console.log(`Character "${character.name}" saved to MongoDB`);
    }

    async getCharacter(id: string): Promise<GeneratedCharacter | null> {
        const collections = await this.getCollections();

        const doc = await collections.generated_characters.findOne({ id });
        if (!doc) return null;

        const { _id, ...character } = doc;
        return character as GeneratedCharacter;
    }

    async getCharactersByUniverse(universeId: string): Promise<GeneratedCharacter[]> {
        const collections = await this.getCollections();

        const docs = await collections.generated_characters
            .find({ universeId })
            .sort({ storyImportance: 1, createdAt: -1 })
            .toArray();

        return docs.map(({ _id, ...character }) => character as GeneratedCharacter);
    }

    async getCharactersByCreator(creatorId: string): Promise<GeneratedCharacter[]> {
        const collections = await this.getCollections();

        const docs = await collections.generated_characters
            .find({ creatorId })
            .sort({ createdAt: -1 })
            .toArray();

        return docs.map(({ _id, ...character }) => character as GeneratedCharacter);
    }

    async updateCharacter(id: string, updates: Partial<GeneratedCharacter>): Promise<boolean> {
        const collections = await this.getCollections();

        const result = await collections.generated_characters.updateOne(
            { id },
            {
                $set: {
                    ...updates,
                    updatedAt: new Date()
                }
            }
        );

        return result.modifiedCount > 0;
    }

    async deleteCharacter(id: string): Promise<boolean> {
        const collections = await this.getCollections();

        // Also delete all memories for this character
        await collections.character_memories.deleteMany({ characterId: id });

        const result = await collections.generated_characters.deleteOne({ id });
        return result.deletedCount > 0;
    }

    // ============================================
    // CHARACTER MEMORY PERSISTENCE
    // ============================================

    async saveCharacterMemory(memory: CharacterMemory): Promise<void> {
        const collections = await this.getCollections();

        const doc = {
            ...memory,
            _id: new ObjectId(),
            createdAt: memory.timestamp || new Date(),
            lastAccessed: memory.timestamp || new Date(),
        };

        await collections.character_memories.insertOne(doc);
    }

    async getCharacterMemories(
        characterId: string,
        filters?: {
            memoryType?: string;
            memorySource?: string;
            canonStatus?: string;
            limit?: number;
        }
    ): Promise<CharacterMemory[]> {
        const collections = await this.getCollections();

        const query: any = { characterId };

        if (filters?.memoryType) query.memoryType = filters.memoryType;
        if (filters?.memorySource) query.memorySource = filters.memorySource;
        if (filters?.canonStatus) query.canonStatus = filters.canonStatus;

        const docs = await collections.character_memories
            .find(query)
            .sort({ importance: -1, createdAt: -1 })
            .limit(filters?.limit || 100)
            .toArray();

        return docs.map(({ _id, ...memory }) => memory as CharacterMemory);
    }

    async updateCharacterMemory(memoryId: string, updates: Partial<CharacterMemory>): Promise<boolean> {
        const collections = await this.getCollections();

        const result = await collections.character_memories.updateOne(
            { id: memoryId },
            { $set: updates }
        );

        return result.modifiedCount > 0;
    }

    async deleteCharacterMemory(memoryId: string): Promise<boolean> {
        const collections = await this.getCollections();

        const result = await collections.character_memories.deleteOne({ id: memoryId });
        return result.deletedCount > 0;
    }

    async getMemoryStats(characterId?: string): Promise<{
        totalMemories: number;
        memoryTypes: Record<string, number>;
        memorySources: Record<string, number>;
        canonStatus: Record<string, number>;
    }> {
        const collections = await this.getCollections();

        const matchStage = characterId ? { $match: { characterId } } : { $match: {} };

        const pipeline = [
            matchStage,
            {
                $group: {
                    _id: null,
                    totalMemories: { $sum: 1 },
                    memoryTypes: {
                        $push: '$memoryType'
                    },
                    memorySources: {
                        $push: '$memorySource'
                    },
                    canonStatuses: {
                        $push: '$canonStatus'
                    }
                }
            }
        ];

        const result = await collections.character_memories.aggregate(pipeline).toArray();

        if (result.length === 0) {
            return {
                totalMemories: 0,
                memoryTypes: {},
                memorySources: {},
                canonStatus: {}
            };
        }

        const stats = result[0];

        return {
            totalMemories: stats.totalMemories,
            memoryTypes: this.countArrayItems(stats.memoryTypes),
            memorySources: this.countArrayItems(stats.memorySources),
            canonStatus: this.countArrayItems(stats.canonStatuses)
        };
    }

    // ============================================
    // SEARCH AND QUERY HELPERS
    // ============================================

    async searchUniverses(query: string, limit: number = 10): Promise<GeneratedUniverse[]> {
        const collections = await this.getCollections();

        const docs = await collections.generated_universes
            .find({
                $or: [
                    { name: { $regex: query, $options: 'i' } },
                    { premise: { $regex: query, $options: 'i' } },
                    { genre: { $regex: query, $options: 'i' } }
                ]
            })
            .limit(limit)
            .toArray();

        return docs.map(({ _id, ...universe }) => universe as GeneratedUniverse);
    }

    async searchCharacters(query: string, universeId?: string, limit: number = 10): Promise<GeneratedCharacter[]> {
        const collections = await this.getCollections();

        const searchConditions: any = {
            $or: [
                { name: { $regex: query, $options: 'i' } },
                { 'personality.traits.name': { $regex: query, $options: 'i' } },
                { 'currentStatus.occupation': { $regex: query, $options: 'i' } }
            ]
        };

        if (universeId) {
            searchConditions.universeId = universeId;
        }

        const docs = await collections.generated_characters
            .find(searchConditions)
            .limit(limit)
            .toArray();

        return docs.map(({ _id, ...character }) => character as GeneratedCharacter);
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    private countArrayItems(items: string[]): Record<string, number> {
        return items.reduce((counts, item) => {
            counts[item] = (counts[item] || 0) + 1;
            return counts;
        }, {} as Record<string, number>);
    }

    async healthCheck(): Promise<{
        status: 'healthy' | 'unhealthy';
        collections: Record<string, boolean>;
        error?: string;
    }> {
        try {
            const collections = await this.getCollections();

            const collectionStatus = {
                generated_universes: !!(await collections.generated_universes.findOne({})),
                generated_characters: !!(await collections.generated_characters.findOne({})),
                character_memories: !!(await collections.character_memories.findOne({})),
            };

            return {
                status: 'healthy',
                collections: collectionStatus
            };
        } catch (error: any) {
            return {
                status: 'unhealthy',
                collections: {},
                error: error.message
            };
        }
    }
}


// ============================================
// SHARED MEMORY QUERIES (STUBS)
// ============================================

export class MongoGeneratorServiceWithSharedMemory extends MongoGeneratorService {
    /**
     * Get shared memories by event ID
     */

    /**
     * Get shared memories by event ID
     */
    async getSharedMemoriesByEvent(eventId: string): Promise<any[]> {
        // Use the main character_memories collection for now (until rag_nodes or shared_memories is added)
        // This will only return nodes with type: 'shared_memory'
        // TODO: Update to use rag_nodes or shared_memories collection if/when available
        // getCollections is private, so use a public static helper
        const collections = await getCollections();
        const docs = await collections.character_memories.find({
            type: 'shared_memory',
            $or: [
                { 'metadata.eventId': eventId },
                { 'content.attributes.eventId': eventId }
            ]
        }).toArray();
        return docs.map((doc: any) => {
            const { _id, ...node } = doc;
            return node;
        });
    }

    /**
     * Get shared memories by time (or time range)
     */

    /**
     * Get shared memories by time (or time range)
     * Accepts ISO string or Date. Matches if the event's startDate, endDate, or timestamps.created matches the timestamp.
     */
    async getSharedMemoriesByTime(timestamp: string): Promise<any[]> {
        const collections = await getCollections();
        const date = new Date(timestamp);
        // Accept both string and Date matches for flexibility
        const docs = await collections.character_memories.find({
            type: 'shared_memory',
            $or: [
                { 'temporal.startDate': { $eq: date } },
                { 'temporal.endDate': { $eq: date } },
                { 'timestamps.created': { $eq: date } },
                { 'temporal.startDate': timestamp },
                { 'temporal.endDate': timestamp },
                { 'timestamps.created': timestamp }
            ]
        }).toArray();
        return docs.map((doc: any) => {
            const { _id, ...node } = doc;
            return node;
        });
    }

    /**
     * Get shared memories involving a character
     */

    /**
     * Get shared memories involving a character
     * Looks for characterId in content.attributes.involved_entities
     */
    async getSharedMemoriesByCharacter(characterId: string): Promise<any[]> {
        const collections = await getCollections();
        const docs = await collections.character_memories.find({
            type: 'shared_memory',
            'content.attributes.involved_entities': characterId
        }).toArray();
        return docs.map((doc: any) => {
            const { _id, ...node } = doc;
            return node;
        });
    }
}

// Singleton instance
export const mongoGeneratorService = new MongoGeneratorServiceWithSharedMemory();
