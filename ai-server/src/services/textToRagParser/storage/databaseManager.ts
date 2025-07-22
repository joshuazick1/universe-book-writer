/**
 * Database Manager - MongoDB-backed character memory storage and retrieval
 * 
 * Provides persistent storage for character memories using the shared MongoDB database.
 * Replaces the previous in-memory implementation with full database persistence.
 */

import type { CharacterMemory, GapFillingRequest, GapFillingResult, CharGenMemory } from '../../../../../shared/types/nodeTypes.js';
import { mongoGeneratorService } from '../../database/mongoGeneratorService.js';
import { v4 as uuidv4 } from 'uuid';

export class DatabaseManager {
    /**
     * Get shared memories by event ID
     */
    async getSharedMemoriesByEvent(eventId: string): Promise<any[]> {
        // Uses production implementation in mongoGeneratorService
        return mongoGeneratorService.getSharedMemoriesByEvent(eventId);
    }

    /**
     * Get shared memories by time (or time range)
     */
    async getSharedMemoriesByTime(timestamp: string): Promise<any[]> {
        // Uses production implementation in mongoGeneratorService
        return mongoGeneratorService.getSharedMemoriesByTime(timestamp);
    }

    /**
     * Get shared memories involving a character
     */
    async getSharedMemoriesByCharacter(characterId: string): Promise<any[]> {
        // Uses production implementation in mongoGeneratorService
        return mongoGeneratorService.getSharedMemoriesByCharacter(characterId);
    }

    /**
     * Convert textToRagParser CharacterMemory to characterGenerator CharacterMemory
     */
    private convertToCharGenMemory(memory: CharacterMemory): CharGenMemory {
        return {
            id: memory.id,
            type: this.mapMemoryType(memory.memoryType),
            content: memory.content,
            importance: memory.importance,
            emotional_weight: 0.5, // Default value - not available in textToRagParser type
            related_entities: memory.associatedEntities,
            timestamp: memory.createdAt,
            source: memory.memorySource,
            tags: [],
            contextual_info: {
                characterId: memory.characterId,
                accessCount: memory.accessCount,
                lastAccessed: memory.lastAccessed,
                updatedAt: memory.updatedAt,
                canonStatus: (memory.canonStatus === 'canon' || memory.canonStatus === 'non_canon' || memory.canonStatus === 'gap_filling') ? memory.canonStatus : 'canon',
                timelineAnchor: memory.timelineAnchor,
                sourceChunk: memory.sourceChunk,
                gapFillingContext: memory.gapFillingContext
            }
        };
    }

    /**
     * Convert characterGenerator CharacterMemory to textToRagParser CharacterMemory
     */
    private convertFromCharGenMemory(memory: CharGenMemory): CharacterMemory {
        const contextualInfo = memory.contextual_info || {};
        // Defensive: always use array for tags
        const safeTags = Array.isArray(memory.tags) ? memory.tags : [];
        return {
            id: memory.id,
            characterId: contextualInfo.characterId || '',
            memoryType: this.reverseMapMemoryType(memory.type),
            content: memory.content,
            importance: memory.importance,
            timelineAnchor: contextualInfo.timelineAnchor,
            associatedEntities: memory.related_entities,
            sourceChunk: contextualInfo.sourceChunk,
            accessCount: contextualInfo.accessCount || 0,
            lastAccessed: contextualInfo.lastAccessed || new Date(),
            createdAt: memory.timestamp,
            updatedAt: contextualInfo.updatedAt || new Date(),
            memorySource: memory.source as any,
            canonStatus: (contextualInfo.canonStatus === 'canon' || contextualInfo.canonStatus === 'non_canon' || contextualInfo.canonStatus === 'gap_filling') ? contextualInfo.canonStatus : 'canon',
            gapFillingContext: contextualInfo.gapFillingContext,
            tags: safeTags
        };
    }

    /**
     * Map textToRagParser memory types to characterGenerator types
     */
    private mapMemoryType(type: CharacterMemory['memoryType']): CharGenMemory['type'] {
        switch (type) {
            case 'trait': return 'trait';
            case 'relationship': return 'relationship';
            case 'event': return 'event';
            case 'knowledge': return 'knowledge';
            case 'dialogue': return 'knowledge'; // Map dialogue to knowledge
            case 'emotion': return 'trait'; // Map emotion to trait
            default: return 'knowledge';
        }
    }

    /**
     * Reverse map characterGenerator memory types to textToRagParser types
     */
    private reverseMapMemoryType(type: CharGenMemory['type']): CharacterMemory['memoryType'] {
        switch (type) {
            case 'trait': return 'trait';
            case 'relationship': return 'relationship';
            case 'event': return 'event';
            case 'knowledge': return 'knowledge';
            case 'goal': return 'knowledge'; // Map goal to knowledge
            default: return 'knowledge';
        }
    }

    /**
     * Save a character memory
     */
    async saveCharacterMemory(memory: CharacterMemory): Promise<void> {
        // Ensure memory has an ID
        if (!memory.id) {
            memory.id = uuidv4();
        }

        // Set default timestamps if not present
        if (!memory.createdAt) {
            memory.createdAt = new Date();
        }
        if (!memory.lastAccessed) {
            memory.lastAccessed = new Date();
        }

        // Convert to characterGenerator format and save
        const charGenMemory = this.convertToCharGenMemory(memory);
        await mongoGeneratorService.saveCharacterMemory(charGenMemory);
    }

    /**
     * Update an existing character memory
     */
    async updateCharacterMemory(memory: CharacterMemory): Promise<void> {
        const charGenMemory = this.convertToCharGenMemory(memory);
        await mongoGeneratorService.updateCharacterMemory(memory.id, charGenMemory);
    }

    /**
     * Get a specific memory by ID
     */
    async getCharacterMemory(memoryId: string): Promise<CharacterMemory | null> {
        const memories = await mongoGeneratorService.getCharacterMemories('', { limit: 1 });
        const memory = memories.find(m => m.id === memoryId);
        if (memory && !Array.isArray(memory.tags)) {
            memory.tags = [];
        }
        return memory ? this.convertFromCharGenMemory({ ...memory, tags: memory.tags ?? [] }) : null;
    }

    /**
     * Get all memories for a character
     */
    async getCharacterMemories(characterId: string): Promise<CharacterMemory[]> {
        const charGenMemories = await mongoGeneratorService.getCharacterMemories(characterId);
        if (!Array.isArray(charGenMemories)) {
            return [];
        }
        return charGenMemories.map(m => {
            const tags = Array.isArray(m.tags) ? m.tags : [];
            return this.convertFromCharGenMemory({ ...m, tags });
        });
    }

    /**
     * Get all character memories across all characters
     */
    async getAllCharacterMemories(): Promise<CharacterMemory[]> {
        const charGenMemories = await mongoGeneratorService.getCharacterMemories(''); // Empty string gets all
        return charGenMemories.map(m => {
            const tags = Array.isArray(m.tags) ? m.tags : [];
            return this.convertFromCharGenMemory({ ...m, tags });
        });
    }

    /**
     * Delete a character memory
     */
    async deleteCharacterMemory(memoryId: string): Promise<boolean> {
        return await mongoGeneratorService.deleteCharacterMemory(memoryId);
    }
    /**
     * Get basic character information
     */
    async getCharacterBasicInfo(characterId: string): Promise<{ id: string; name: string } | null> {
        // Try to get from generated characters first
        const generatedCharacter = await mongoGeneratorService.getCharacter(characterId);
        if (generatedCharacter) {
            return {
                id: generatedCharacter.id,
                name: generatedCharacter.name
            };
        }

        // Fallback to a placeholder (could also query the main characters collection)
        return {
            id: characterId,
            name: `Character_${characterId}`
        };
    }

    /**
     * Search memories by content (simple text search)
     */
    async searchMemories(query: string, characterId?: string): Promise<CharacterMemory[]> {
        const queryLower = query.toLowerCase();
        let memoriesToSearch: CharacterMemory[];

        if (characterId) {
            memoriesToSearch = await this.getCharacterMemories(characterId);
        } else {
            memoriesToSearch = await this.getAllCharacterMemories();
        }

        return memoriesToSearch.filter(memory =>
            memory.content.toLowerCase().includes(queryLower)
        );
    }

    /**
     * Get memory statistics
     */
    async getMemoryStats(): Promise<{
        totalMemories: number;
        totalCharacters: number;
        memorySourceBreakdown: Record<string, number>;
        canonStatusBreakdown: Record<string, number>;
        pendingApprovals: number;
    }> {
        const stats = await mongoGeneratorService.getMemoryStats();

        let pendingApprovals = 0;
        const allMemories = await this.getAllCharacterMemories();
        allMemories.forEach(memory => {
            if (memory.gapFillingContext && memory.gapFillingContext.userApproved === undefined) {
                pendingApprovals++;
            }
        });

        // Get unique character count from the memories
        const uniqueCharacters = new Set(allMemories.map(m => m.characterId));

        return {
            totalMemories: stats.totalMemories,
            totalCharacters: uniqueCharacters.size,
            memorySourceBreakdown: stats.memorySources,
            canonStatusBreakdown: stats.canonStatus,
            pendingApprovals
        };
    }

    /**
     * Clear all memories (for testing purposes)
     */
    async clearAllMemories(): Promise<void> {
        console.warn('clearAllMemories not implemented for MongoDB - this would require careful database operations');
    }

    /**
     * Export memories for backup or analysis
     */
    async exportMemories(characterId?: string): Promise<CharacterMemory[]> {
        if (characterId) {
            return this.getCharacterMemories(characterId);
        } else {
            return this.getAllCharacterMemories();
        }
    }

    /**
     * Import memories from backup
     */
    async importMemories(memories: CharacterMemory[]): Promise<number> {
        let imported = 0;

        for (const memory of memories) {
            try {
                await this.saveCharacterMemory(memory);
                imported++;
            } catch (error) {
                console.error(`Failed to import memory ${memory.id}:`, error);
            }
        }

        return imported;
    }
}
