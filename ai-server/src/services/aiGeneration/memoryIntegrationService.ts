/**
 * Memory Integration Service
 * 
 * Integrates generated characters and universes with the character memory system.
 * Handles population of memory banks with generated content and provides
 * seamless integration between generation and chat systems.
 */

import { CharacterMemoryManager } from '../textToRagParser/memory/characterMemoryManager.js';
import { DatabaseManager } from '../textToRagParser/storage/databaseManager.js';
import {
    GeneratedCharacter,
    CharacterMemory
} from '../characterGenerator/types.js';
import { GeneratedUniverse } from '../universeGenerator/types.js';

export interface MemoryIntegrationRequest {
    characterId: string;
    universeId?: string;
    memoryTypes: ('trait' | 'knowledge' | 'event' | 'relationship' | 'goal')[];
    importance_threshold?: number;
}

export interface MemoryIntegrationResult {
    success: boolean;
    memoriesCreated: number;
    memoryIds: string[];
    characterId: string;
    errors?: string[];
}

export interface UniverseMemoryIntegrationRequest {
    universeId: string;
    characterId: string;
    elements: ('history' | 'geography' | 'cultures' | 'conflicts' | 'mysteries')[];
    detail_level?: 'basic' | 'standard' | 'comprehensive';
}

export class MemoryIntegrationService {
    private memoryManager: CharacterMemoryManager;
    private dbManager: DatabaseManager;

    constructor() {
        this.dbManager = new DatabaseManager();
        this.memoryManager = new CharacterMemoryManager(this.dbManager);
    }

    /**
     * Helper method to add a memory using createUserMemory
     */
    private async addMemory(characterId: string, memory: CharacterMemory): Promise<void> {
        // Map memory types to supported types
        const memoryType = memory.type === 'goal' ? 'knowledge' : memory.type;

        await this.memoryManager.createUserMemory(
            characterId,
            memoryType as 'trait' | 'knowledge' | 'event' | 'relationship' | 'dialogue' | 'emotion',
            memory.content,
            'system_generation', // conversationId
            true, // isCanon
            false, // affectsTimeline
            memory.related_entities || []
        );
    }

    /**
     * Helper method to remove a memory (placeholder - not implemented in CharacterMemoryManager)
     */
    private async removeMemory(characterId: string, memoryId: string): Promise<void> {
        // This functionality would need to be implemented in CharacterMemoryManager
        console.warn(`Remove memory not implemented: ${memoryId} for character ${characterId}`);
    }

    /**
     * Helper method to clear memories (placeholder - not implemented in CharacterMemoryManager)
     */
    private async clearMemories(characterId: string): Promise<void> {
        // This functionality would need to be implemented in CharacterMemoryManager
        console.warn(`Clear memories not implemented for character ${characterId}`);
    }

    /**
     * Integrate a generated character into the memory system
     */
    async integrateCharacterMemories(
        character: GeneratedCharacter,
        request: MemoryIntegrationRequest
    ): Promise<MemoryIntegrationResult> {
        console.log(`Integrating character memories for ${character.name}`);

        try {
            const memories: CharacterMemory[] = [];
            const errors: string[] = [];

            // Generate memories based on requested types
            if (request.memoryTypes.includes('trait')) {
                memories.push(...await this.generateTraitMemories(character));
            }

            if (request.memoryTypes.includes('knowledge')) {
                memories.push(...await this.generateKnowledgeMemories(character));
            }

            if (request.memoryTypes.includes('event')) {
                memories.push(...await this.generateEventMemories(character));
            }

            if (request.memoryTypes.includes('relationship')) {
                memories.push(...await this.generateRelationshipMemories(character));
            }

            if (request.memoryTypes.includes('goal')) {
                memories.push(...await this.generateGoalMemories(character));
            }

            // Filter by importance threshold if specified
            const threshold = request.importance_threshold || 0.3;
            const filteredMemories = memories.filter(m => m.importance >= threshold);

            // Store memories in the memory system
            const memoryIds: string[] = [];
            for (const memory of filteredMemories) {
                try {
                    await this.addMemory(character.id, memory);
                    memoryIds.push(memory.id);
                } catch (err) {
                    const error = err instanceof Error ? err : new Error(String(err));
                    errors.push(`Failed to add memory: ${error.message}`);
                }
            }

            return {
                success: errors.length === 0,
                memoriesCreated: memoryIds.length,
                memoryIds,
                characterId: character.id,
                errors: errors.length > 0 ? errors : undefined
            };

        } catch (err) {
            console.error('Error integrating character memories:', err);
            const error = err instanceof Error ? err : new Error(String(err));
            return {
                success: false,
                memoriesCreated: 0,
                memoryIds: [],
                characterId: character.id,
                errors: [error.message]
            };
        }
    }

    /**
     * Integrate universe information into character memories
     */
    async integrateUniverseMemories(
        universe: GeneratedUniverse,
        character: GeneratedCharacter,
        request: UniverseMemoryIntegrationRequest
    ): Promise<MemoryIntegrationResult> {
        console.log(`Integrating universe memories for ${character.name} in ${universe.name}`);

        try {
            const memories: CharacterMemory[] = [];

            // Generate universe-related memories based on requested elements
            if (request.elements.includes('history')) {
                memories.push(...await this.generateUniverseHistoryMemories(universe, character));
            }

            if (request.elements.includes('geography')) {
                memories.push(...await this.generateGeographyMemories(universe, character));
            }

            if (request.elements.includes('cultures')) {
                memories.push(...await this.generateCultureMemories(universe, character));
            }

            if (request.elements.includes('conflicts')) {
                memories.push(...await this.generateConflictMemories(universe, character));
            }

            if (request.elements.includes('mysteries')) {
                memories.push(...await this.generateMysteryMemories(universe, character));
            }

            // Store memories
            const memoryIds: string[] = [];
            const errors: string[] = [];

            for (const memory of memories) {
                try {
                    await this.addMemory(character.id, memory);
                    memoryIds.push(memory.id);
                } catch (err) {
                    const error = err instanceof Error ? err : new Error(String(err));
                    errors.push(`Failed to add universe memory: ${error.message}`);
                }
            }

            return {
                success: errors.length === 0,
                memoriesCreated: memoryIds.length,
                memoryIds,
                characterId: character.id,
                errors: errors.length > 0 ? errors : undefined
            };

        } catch (err) {
            console.error('Error integrating universe memories:', err);
            const error = err instanceof Error ? err : new Error(String(err));
            return {
                success: false,
                memoriesCreated: 0,
                memoryIds: [],
                characterId: character.id,
                errors: [error.message]
            };
        }
    }

    /**
     * Update character memories when character is modified
     */
    async updateCharacterMemories(
        characterId: string,
        updatedCharacter: GeneratedCharacter,
        changedFields: string[]
    ): Promise<MemoryIntegrationResult> {
        console.log(`Updating memories for character ${characterId}, changed fields:`, changedFields);

        try {
            // For now, just create new memories instead of updating existing ones
            // The actual memory retrieval would need a compatible interface
            const newMemories: CharacterMemory[] = [];

            if (changedFields.includes('personality') || changedFields.includes('traits')) {
                newMemories.push(...await this.generateTraitMemories(updatedCharacter));
            }

            if (changedFields.includes('backstory') || changedFields.includes('formativeEvents')) {
                newMemories.push(...await this.generateEventMemories(updatedCharacter));
            }

            if (changedFields.includes('goals')) {
                newMemories.push(...await this.generateGoalMemories(updatedCharacter));
            }

            // Add new memories
            const memoryIds: string[] = [];
            const errors: string[] = [];

            for (const memory of newMemories) {
                try {
                    await this.addMemory(characterId, memory);
                    memoryIds.push(memory.id);
                } catch (err) {
                    const error = err instanceof Error ? err : new Error(String(err));
                    errors.push(`Failed to add updated memory: ${error.message}`);
                }
            }

            return {
                success: errors.length === 0,
                memoriesCreated: memoryIds.length,
                memoryIds,
                characterId,
                errors: errors.length > 0 ? errors : undefined
            };

        } catch (err) {
            console.error('Error updating character memories:', err);
            const error = err instanceof Error ? err : new Error(String(err));
            return {
                success: false,
                memoriesCreated: 0,
                memoryIds: [],
                characterId,
                errors: [error.message]
            };
        }
    }

    // ============================================
    // MEMORY GENERATION METHODS
    // ============================================

    /**
     * Generate trait-based memories from character personality
     */
    private async generateTraitMemories(character: GeneratedCharacter): Promise<CharacterMemory[]> {
        const memories: CharacterMemory[] = [];

        // Core identity memory
        memories.push({
            id: this.generateMemoryId(),
            type: 'trait',
            content: `My name is ${character.name}. I am a ${character.species || 'human'} ${character.currentStatus?.occupation || 'individual'}.`,
            importance: 1.0,
            emotional_weight: 0.5,
            related_entities: [character.name],
            timestamp: new Date(),
            source: 'character_generation',
            tags: ['identity', 'core']
        });

        // Personality trait memories
        if (character.personality?.traits) {
            for (const trait of character.personality.traits.slice(0, 5)) {
                memories.push({
                    id: this.generateMemoryId(),
                    type: 'trait',
                    content: `I am ${trait.name.toLowerCase()}: ${trait.description}. This trait strongly influences how I approach situations.`,
                    importance: trait.strength || 0.7,
                    emotional_weight: 0.5, // Use a default since emotional_impact doesn't exist on PersonalityTrait
                    related_entities: [character.name],
                    timestamp: new Date(),
                    source: 'character_generation',
                    tags: ['personality', trait.name.toLowerCase()]
                });
            }
        }

        // Values and beliefs
        if (character.personality?.values) {
            for (const value of character.personality.values.slice(0, 3)) {
                memories.push({
                    id: this.generateMemoryId(),
                    type: 'trait',
                    content: `I strongly believe in ${value.toLowerCase()}. This value guides my decisions and actions.`,
                    importance: 0.8,
                    emotional_weight: 0.7,
                    related_entities: [character.name],
                    timestamp: new Date(),
                    source: 'character_generation',
                    tags: ['values', 'beliefs']
                });
            }
        }

        return memories;
    }

    /**
     * Generate knowledge-based memories from character skills and education
     */
    private async generateKnowledgeMemories(character: GeneratedCharacter): Promise<CharacterMemory[]> {
        const memories: CharacterMemory[] = [];

        // Professional knowledge
        if (character.skills) {
            for (const skill of character.skills.slice(0, 5)) {
                const proficiencyLevel = typeof skill === 'object' ? skill.level : 'intermediate';
                const skillName = typeof skill === 'object' ? skill.name : skill;

                memories.push({
                    id: this.generateMemoryId(),
                    type: 'knowledge',
                    content: `I have ${proficiencyLevel} level expertise in ${skillName}. This knowledge came from my training and experience.`,
                    importance: 0.6,
                    emotional_weight: 0.3,
                    related_entities: [character.name, skillName],
                    timestamp: new Date(),
                    source: 'character_generation',
                    tags: ['skills', 'professional', skillName.toLowerCase().replace(/\s+/g, '_')]
                });
            }
        }

        // Educational background
        if (character.backstory?.education) {
            memories.push({
                id: this.generateMemoryId(),
                type: 'knowledge',
                content: `My educational background: ${character.backstory.education}. This foundation shapes how I understand the world.`,
                importance: 0.7,
                emotional_weight: 0.4,
                related_entities: [character.name],
                timestamp: new Date(),
                source: 'character_generation',
                tags: ['education', 'background']
            });
        }

        // Language knowledge
        if (character.languages) {
            for (const language of character.languages) {
                memories.push({
                    id: this.generateMemoryId(),
                    type: 'knowledge',
                    content: `I can speak ${language}. This allows me to communicate with different groups of people.`,
                    importance: 0.5,
                    emotional_weight: 0.2,
                    related_entities: [character.name, language],
                    timestamp: new Date(),
                    source: 'character_generation',
                    tags: ['languages', language.toLowerCase()]
                });
            }
        }

        return memories;
    }

    /**
     * Generate event-based memories from character backstory
     */
    private async generateEventMemories(character: GeneratedCharacter): Promise<CharacterMemory[]> {
        const memories: CharacterMemory[] = [];

        // Formative events
        if (character.backstory?.formativeEvents) {
            for (const event of character.backstory.formativeEvents.slice(0, 5)) {
                // Map impact enum to numeric value
                const impactMap = { 'minor': 0.3, 'moderate': 0.5, 'major': 0.7, 'life_changing': 0.9 };
                const importance = impactMap[event.impact] || 0.5;

                memories.push({
                    id: this.generateMemoryId(),
                    type: 'event',
                    content: `When I was ${event.age || 'young'}, ${event.event}. This experience had a significant impact on who I became.`,
                    importance,
                    emotional_weight: 0.6, // Use emotionalImpact if it's a string description
                    related_entities: [character.name, ...(event.witnesses || [])],
                    timestamp: new Date(),
                    source: 'character_generation',
                    tags: ['backstory', 'formative', 'life_event'],
                    contextual_info: {
                        age_when_occurred: event.age,
                        location: event.location,
                        witnesses: event.witnesses
                    }
                });
            }
        }

        // Childhood summary
        if (character.backstory?.childhood) {
            memories.push({
                id: this.generateMemoryId(),
                type: 'event',
                content: `My childhood: ${character.backstory.childhood}. These early experiences shaped my fundamental worldview.`,
                importance: 0.8,
                emotional_weight: 0.7,
                related_entities: [character.name],
                timestamp: new Date(),
                source: 'character_generation',
                tags: ['childhood', 'formative', 'background']
            });
        }

        // Major achievements
        if (character.backstory?.achievements) {
            for (const achievement of character.backstory.achievements.slice(0, 3)) {
                memories.push({
                    id: this.generateMemoryId(),
                    type: 'event',
                    content: `I achieved: ${achievement}. This accomplishment is something I'm proud of and demonstrates my capabilities.`,
                    importance: 0.7,
                    emotional_weight: 0.8,
                    related_entities: [character.name],
                    timestamp: new Date(),
                    source: 'character_generation',
                    tags: ['achievements', 'accomplishments', 'pride']
                });
            }
        }

        return memories;
    }

    /**
     * Generate relationship-based memories
     */
    private async generateRelationshipMemories(character: GeneratedCharacter): Promise<CharacterMemory[]> {
        const memories: CharacterMemory[] = [];

        // Use connections instead of relationships since relationships doesn't exist on GeneratedCharacter
        if (character.connections) {
            for (const connection of character.connections.slice(0, 5)) {
                memories.push({
                    id: this.generateMemoryId(),
                    type: 'relationship',
                    content: `${connection.name} is my ${connection.relationship}. ${connection.description}. Our relationship is important to me.`,
                    importance: connection.importance || 0.6,
                    emotional_weight: 0.6,
                    related_entities: [character.name, connection.name],
                    timestamp: new Date(),
                    source: 'character_generation',
                    tags: ['relationships', connection.relationship, connection.name.toLowerCase().replace(/\s+/g, '_')]
                });
            }
        }

        return memories;
    }

    /**
     * Generate goal-based memories
     */
    private async generateGoalMemories(character: GeneratedCharacter): Promise<CharacterMemory[]> {
        const memories: CharacterMemory[] = [];

        // Immediate goals
        if (character.goals?.immediate) {
            for (const goal of character.goals.immediate.slice(0, 3)) {
                memories.push({
                    id: this.generateMemoryId(),
                    type: 'goal',
                    content: `Right now, I want to ${goal.toLowerCase()}. This is something I'm actively working towards.`,
                    importance: 0.8,
                    emotional_weight: 0.6,
                    related_entities: [character.name],
                    timestamp: new Date(),
                    source: 'character_generation',
                    tags: ['goals', 'immediate', 'current']
                });
            }
        }

        // Long-term goals
        if (character.goals?.longTerm) {
            for (const goal of character.goals.longTerm.slice(0, 2)) {
                memories.push({
                    id: this.generateMemoryId(),
                    type: 'goal',
                    content: `In the long term, I aspire to ${goal.toLowerCase()}. This dream motivates many of my decisions.`,
                    importance: 0.9,
                    emotional_weight: 0.8,
                    related_entities: [character.name],
                    timestamp: new Date(),
                    source: 'character_generation',
                    tags: ['goals', 'long_term', 'aspirations']
                });
            }
        }

        return memories;
    }

    // ============================================
    // UNIVERSE MEMORY GENERATION METHODS
    // ============================================

    private async generateUniverseHistoryMemories(
        universe: GeneratedUniverse,
        character: GeneratedCharacter
    ): Promise<CharacterMemory[]> {
        const memories: CharacterMemory[] = [];

        // Current era knowledge
        if (universe.history?.currentEra) {
            memories.push({
                id: this.generateMemoryId(),
                type: 'knowledge',
                content: `I live in the ${universe.history.currentEra.name}. ${universe.history.currentEra.keyEvents?.slice(0, 2).join(' ')}`,
                importance: 0.7,
                emotional_weight: 0.4,
                related_entities: [character.name, universe.name],
                timestamp: new Date(),
                source: 'universe_integration',
                tags: ['history', 'current_era', universe.name.toLowerCase().replace(/\s+/g, '_')]
            });
        }

        return memories;
    }

    private async generateGeographyMemories(
        universe: GeneratedUniverse,
        character: GeneratedCharacter
    ): Promise<CharacterMemory[]> {
        const memories: CharacterMemory[] = [];

        // Notable locations
        if (universe.geography?.notableLocations) {
            for (const location of universe.geography.notableLocations.slice(0, 3)) {
                const locationName = typeof location === 'object' ? location.name : location;
                const locationDesc = typeof location === 'object' ? location.description : 'A significant place';

                memories.push({
                    id: this.generateMemoryId(),
                    type: 'knowledge',
                    content: `${locationName} is ${locationDesc}. It's an important location in our world.`,
                    importance: 0.5,
                    emotional_weight: 0.3,
                    related_entities: [character.name, locationName, universe.name],
                    timestamp: new Date(),
                    source: 'universe_integration',
                    tags: ['geography', 'locations', locationName.toLowerCase().replace(/\s+/g, '_')]
                });
            }
        }

        return memories;
    }

    private async generateCultureMemories(
        universe: GeneratedUniverse,
        character: GeneratedCharacter
    ): Promise<CharacterMemory[]> {
        const memories: CharacterMemory[] = [];

        // Cultural knowledge
        if (universe.cultures) {
            for (const culture of universe.cultures.slice(0, 2)) {
                const cultureName = typeof culture === 'object' ? culture.name : culture;
                const cultureDesc = typeof culture === 'object' ? culture.description : 'A culture in our world';

                memories.push({
                    id: this.generateMemoryId(),
                    type: 'knowledge',
                    content: `The ${cultureName} culture: ${cultureDesc}. Understanding different cultures helps me navigate social situations.`,
                    importance: 0.6,
                    emotional_weight: 0.4,
                    related_entities: [character.name, cultureName, universe.name],
                    timestamp: new Date(),
                    source: 'universe_integration',
                    tags: ['culture', 'society', cultureName.toLowerCase().replace(/\s+/g, '_')]
                });
            }
        }

        return memories;
    }

    private async generateConflictMemories(
        universe: GeneratedUniverse,
        character: GeneratedCharacter
    ): Promise<CharacterMemory[]> {
        const memories: CharacterMemory[] = [];

        // Current conflicts - simplified since we don't know the exact structure
        if (universe.currentConflicts) {
            memories.push({
                id: this.generateMemoryId(),
                type: 'knowledge',
                content: `There are ongoing conflicts in ${universe.name}. These conflicts affect the current state of our world.`,
                importance: 0.8,
                emotional_weight: 0.6,
                related_entities: [character.name, universe.name],
                timestamp: new Date(),
                source: 'universe_integration',
                tags: ['conflicts', 'current_events', 'politics']
            });
        }

        return memories;
    }

    private async generateMysteryMemories(
        universe: GeneratedUniverse,
        character: GeneratedCharacter
    ): Promise<CharacterMemory[]> {
        const memories: CharacterMemory[] = [];

        // For now, create a placeholder since mysteriousElements might not exist
        // In a real implementation, this would use the actual universe structure
        memories.push({
            id: this.generateMemoryId(),
            type: 'knowledge',
            content: `There are mysteries in ${universe.name} that not everyone knows about. Some things remain unexplained.`,
            importance: 0.7,
            emotional_weight: 0.5,
            related_entities: [character.name, universe.name],
            timestamp: new Date(),
            source: 'universe_integration',
            tags: ['mysteries', 'secrets', 'unknown']
        });

        return memories;
    }

    // ============================================
    // UTILITY METHODS
    // ============================================

    private generateMemoryId(): string {
        return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    private identifyMemoriesToUpdate(existingMemories: CharacterMemory[], changedFields: string[]): string[] {
        const memoriesToUpdate: string[] = [];

        for (const memory of existingMemories) {
            if (memory.source === 'character_generation') {
                // Check if this memory relates to changed fields
                if (changedFields.includes('personality') && memory.type === 'trait') {
                    memoriesToUpdate.push(memory.id);
                }
                if (changedFields.includes('backstory') && memory.type === 'event') {
                    memoriesToUpdate.push(memory.id);
                }
                if (changedFields.includes('goals') && memory.type === 'goal') {
                    memoriesToUpdate.push(memory.id);
                }
                if (changedFields.includes('skills') && memory.type === 'knowledge') {
                    memoriesToUpdate.push(memory.id);
                }
            }
        }

        return memoriesToUpdate;
    }

    /**
     * Get character memories for display or processing
     */
    async getCharacterMemories(characterId: string): Promise<any[]> {
        // For now, return empty array - would need proper implementation with compatible types
        console.warn(`Get character memories not fully implemented for ${characterId}`);
        return [];
    }

    /**
     * Clear character memories (for regeneration)
     */
    async clearCharacterMemories(characterId: string): Promise<void> {
        await this.clearMemories(characterId);
    }
}
