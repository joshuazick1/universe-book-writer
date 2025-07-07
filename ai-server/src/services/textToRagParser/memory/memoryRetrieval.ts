/**
 * Memory Retrieval System - Advanced retrieval and filtering for character memories
 * Respects memory source distinctions and provides context-aware retrieval
 */

import { CharacterMemory } from '../core/interfaces.js';
import { DatabaseManager } from '../storage/databaseManager.js';

export class MemoryRetrieval {
    private dbManager: DatabaseManager;

    constructor(dbManager: DatabaseManager) {
        this.dbManager = dbManager;
    }

    /**
     * Get all memories for a character with comprehensive filtering
     */
    async getFilteredMemories(
        characterId: string,
        options: {
            includeGapFilling?: boolean;
            includeUnapproved?: boolean;
            memoryTypes?: CharacterMemory['memoryType'][];
            canonOnly?: boolean;
            memorySource?: CharacterMemory['memorySource'][];
            limit?: number;
            sortBy?: 'importance' | 'recency' | 'access_count' | 'timeline';
        } = {}
    ): Promise<CharacterMemory[]> {
        let memories = await this.dbManager.getCharacterMemories(characterId);

        // Apply filtering based on options
        memories = this.applyMemoryFilters(memories, options);

        // Sort memories
        memories = this.sortMemories(memories, options.sortBy || 'importance');

        // Apply limit
        if (options.limit) {
            memories = memories.slice(0, options.limit);
        }

        return memories;
    }

    /**
     * Get memories relevant to a specific context using semantic similarity
     */
    async getRelevantMemories(
        characterId: string,
        context: string,
        options: {
            includeGapFilling?: boolean;
            limit?: number;
            relevanceThreshold?: number;
        } = {}
    ): Promise<CharacterMemory[]> {
        const allMemories = await this.getFilteredMemories(characterId, {
            includeGapFilling: options.includeGapFilling,
            includeUnapproved: false // Never include unapproved memories in relevance search
        });

        // Calculate relevance scores
        const scoredMemories = await this.scoreMemoryRelevance(allMemories, context);

        // Filter by relevance threshold
        const threshold = options.relevanceThreshold || 0.3;
        const relevantMemories = scoredMemories.filter(item => item.relevanceScore >= threshold);

        // Sort by relevance score
        relevantMemories.sort((a, b) => b.relevanceScore - a.relevanceScore);

        // Apply limit
        const limit = options.limit || 10;
        return relevantMemories.slice(0, limit).map(item => item.memory);
    }

    /**
     * Get memories anchored to a specific timeline point
     */
    async getTimelineMemories(
        characterId: string,
        timelineAnchor: string,
        range: 'before' | 'during' | 'after' | 'around' = 'around'
    ): Promise<CharacterMemory[]> {
        const memories = await this.getFilteredMemories(characterId, {
            canonOnly: true // Only canon memories for timeline queries
        });

        return memories.filter(memory => {
            if (!memory.timelineAnchor) return false;
            return this.isTimelineRelevant(memory.timelineAnchor, timelineAnchor, range);
        });
    }

    /**
     * Get memories about relationships with other characters
     */
    async getRelationshipMemories(
        characterId: string,
        otherCharacter: string
    ): Promise<CharacterMemory[]> {
        const memories = await this.getFilteredMemories(characterId, {
            memoryTypes: ['relationship', 'dialogue', 'event'],
            canonOnly: true
        });

        return memories.filter(memory => 
            memory.content.toLowerCase().includes(otherCharacter.toLowerCase()) ||
            memory.associatedEntities.some(entity => 
                entity.toLowerCase().includes(otherCharacter.toLowerCase())
            )
        );
    }

    /**
     * Get all character memories (for building context)
     */
    async getCharacterMemories(characterId: string): Promise<CharacterMemory[]> {
        return this.dbManager.getCharacterMemories(characterId);
    }

    /**
     * Get character traits specifically
     */
    async getCharacterTraits(characterId: string): Promise<CharacterMemory[]> {
        return this.getFilteredMemories(characterId, {
            memoryTypes: ['trait'],
            canonOnly: true
        });
    }

    /**
     * Get all pending gap-filling memories awaiting approval
     */
    async getPendingGapFillingMemories(characterId?: string): Promise<CharacterMemory[]> {
        const baseQuery = characterId ? 
            await this.dbManager.getCharacterMemories(characterId) :
            await this.dbManager.getAllCharacterMemories();

        return baseQuery.filter(memory => 
            memory.memorySource === 'ai_gap_filling' &&
            memory.gapFillingContext &&
            memory.gapFillingContext.userApproved === undefined
        );
    }

    /**
     * Get approved gap-filling memories (now part of character canon)
     */
    async getApprovedGapFillingMemories(characterId: string): Promise<CharacterMemory[]> {
        const memories = await this.getFilteredMemories(characterId, {
            includeGapFilling: true
        });

        return memories.filter(memory => 
            memory.memorySource === 'ai_gap_filling' &&
            memory.gapFillingContext?.userApproved === true
        );
    }

    /**
     * Get memories by conversation ID (for user interaction tracking)
     */
    async getConversationMemories(conversationId: string): Promise<CharacterMemory[]> {
        const allMemories = await this.dbManager.getAllCharacterMemories();
        return allMemories.filter(memory => memory.conversationId === conversationId);
    }

    /**
     * Apply comprehensive filtering to memory results
     */
    private applyMemoryFilters(
        memories: CharacterMemory[],
        options: any
    ): CharacterMemory[] {
        let filtered = [...memories];

        // Filter by memory types
        if (options.memoryTypes?.length) {
            filtered = filtered.filter(memory => 
                options.memoryTypes.includes(memory.memoryType)
            );
        }

        // Filter by memory source
        if (options.memorySource?.length) {
            filtered = filtered.filter(memory => 
                options.memorySource.includes(memory.memorySource)
            );
        }

        // Canon only filter
        if (options.canonOnly) {
            filtered = filtered.filter(memory => memory.canonStatus === 'canon');
        }

        // Gap-filling inclusion filter
        if (!options.includeGapFilling) {
            filtered = filtered.filter(memory => memory.memorySource !== 'ai_gap_filling');
        }

        // Unapproved inclusion filter
        if (!options.includeUnapproved) {
            filtered = filtered.filter(memory => {
                if (memory.memorySource === 'ai_gap_filling') {
                    return memory.gapFillingContext?.userApproved === true;
                }
                return true;
            });
        }

        return filtered;
    }

    /**
     * Sort memories by various criteria
     */
    private sortMemories(
        memories: CharacterMemory[],
        sortBy: 'importance' | 'recency' | 'access_count' | 'timeline'
    ): CharacterMemory[] {
        const sorted = [...memories];

        switch (sortBy) {
            case 'importance':
                sorted.sort((a, b) => b.importance - a.importance);
                break;
            case 'recency':
                sorted.sort((a, b) => b.lastAccessed.getTime() - a.lastAccessed.getTime());
                break;
            case 'access_count':
                sorted.sort((a, b) => b.accessCount - a.accessCount);
                break;
            case 'timeline':
                // Sort by timeline anchor if available, otherwise by creation date
                sorted.sort((a, b) => {
                    if (a.timelineAnchor && b.timelineAnchor) {
                        return a.timelineAnchor.localeCompare(b.timelineAnchor);
                    }
                    return a.createdAt.getTime() - b.createdAt.getTime();
                });
                break;
        }

        return sorted;
    }

    /**
     * Score memories for relevance to a given context
     */
    private async scoreMemoryRelevance(
        memories: CharacterMemory[],
        context: string
    ): Promise<Array<{ memory: CharacterMemory; relevanceScore: number }>> {
        const contextLower = context.toLowerCase();
        
        return memories.map(memory => {
            let score = 0;
            const contentLower = memory.content.toLowerCase();

            // Basic keyword matching
            const contextWords = contextLower.split(/\s+/);
            const contentWords = contentLower.split(/\s+/);
            
            let matchingWords = 0;
            contextWords.forEach(word => {
                if (word.length > 3 && contentWords.some(cWord => cWord.includes(word))) {
                    matchingWords++;
                }
            });
            
            score += (matchingWords / contextWords.length) * 0.6;

            // Memory type relevance
            if (memory.memoryType === 'trait' && contextLower.includes('character')) score += 0.2;
            if (memory.memoryType === 'relationship' && contextLower.includes('relationship')) score += 0.2;
            if (memory.memoryType === 'event' && contextLower.includes('event')) score += 0.2;

            // Importance weighting
            score += memory.importance * 0.3;

            // Recency bonus (slight)
            const daysSinceAccess = (Date.now() - memory.lastAccessed.getTime()) / (1000 * 60 * 60 * 24);
            score += Math.max(0, (30 - daysSinceAccess) / 30) * 0.1;

            return { memory, relevanceScore: Math.min(1, score) };
        });
    }

    /**
     * Check if a memory's timeline anchor is relevant to a target anchor
     */
    private isTimelineRelevant(
        memoryAnchor: string,
        targetAnchor: string,
        range: 'before' | 'during' | 'after' | 'around'
    ): boolean {
        const memoryLower = memoryAnchor.toLowerCase();
        const targetLower = targetAnchor.toLowerCase();

        switch (range) {
            case 'during':
                return memoryLower.includes(targetLower) || targetLower.includes(memoryLower);
            case 'around':
                // More flexible matching for "around" the event
                return this.isTimelineProximate(memoryLower, targetLower);
            case 'before':
                // This would need more sophisticated timeline logic
                return memoryLower.includes('before') && memoryLower.includes(targetLower);
            case 'after':
                // This would need more sophisticated timeline logic
                return memoryLower.includes('after') && memoryLower.includes(targetLower);
            default:
                return false;
        }
    }

    /**
     * Check if two timeline anchors are temporally proximate
     */
    private isTimelineProximate(anchor1: string, anchor2: string): boolean {
        // Simple proximity check - could be enhanced with more sophisticated temporal analysis
        const commonTerms = ['chapter', 'scene', 'day', 'night', 'morning', 'evening', 'battle', 'meeting'];
        
        return commonTerms.some(term => 
            anchor1.includes(term) && anchor2.includes(term)
        ) || anchor1.includes(anchor2) || anchor2.includes(anchor1);
    }
}
