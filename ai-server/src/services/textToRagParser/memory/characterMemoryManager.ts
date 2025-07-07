/**
 * Character Memory Manager - Core logic for managing character memories
 * including gap-filling, retrieval, and approval workflows
 */

import { CharacterMemory, GapFillingRequest, GapFillingResult, MemoryApprovalRequest } from '../core/interfaces.js';
import { DatabaseManager } from '../storage/databaseManager.js';
import { GapFillingGenerator } from './gapFillingGenerator.js';
import { MemoryRetrieval } from './memoryRetrieval.js';
import { MemoryScoring } from './memoryScoring.js';

export class CharacterMemoryManager {
    private dbManager: DatabaseManager;
    private gapFillingGenerator: GapFillingGenerator;
    private memoryRetrieval: MemoryRetrieval;
    private memoryScoring: MemoryScoring;

    constructor(dbManager: DatabaseManager) {
        this.dbManager = dbManager;
        this.gapFillingGenerator = new GapFillingGenerator(dbManager);
        this.memoryRetrieval = new MemoryRetrieval(dbManager);
        this.memoryScoring = new MemoryScoring();
    }

    /**
     * Create a new character memory from book extraction
     */
    async createBookMemory(
        characterId: string,
        memoryType: CharacterMemory['memoryType'],
        content: string,
        sourceChunk?: number,
        timelineAnchor?: string,
        associatedEntities: string[] = []
    ): Promise<CharacterMemory> {
        const memory: CharacterMemory = {
            id: this.generateMemoryId(),
            characterId,
            memoryType,
            content,
            importance: await this.memoryScoring.calculateImportance(content, memoryType),
            timelineAnchor,
            associatedEntities,
            sourceChunk,
            accessCount: 0,
            lastAccessed: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            memorySource: 'book_extraction',
            canonStatus: 'canon',
            affectsTimeline: true
        };

        await this.dbManager.saveCharacterMemory(memory);
        return memory;
    }

    /**
     * Create a new character memory from user interaction
     */
    async createUserMemory(
        characterId: string,
        memoryType: CharacterMemory['memoryType'],
        content: string,
        conversationId: string,
        isCanon: boolean = false,
        affectsTimeline: boolean = false,
        associatedEntities: string[] = []
    ): Promise<CharacterMemory> {
        const memory: CharacterMemory = {
            id: this.generateMemoryId(),
            characterId,
            memoryType,
            content,
            importance: await this.memoryScoring.calculateImportance(content, memoryType),
            associatedEntities,
            accessCount: 0,
            lastAccessed: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
            memorySource: 'user_interaction',
            canonStatus: isCanon ? 'canon' : 'non_canon',
            conversationId,
            affectsTimeline
        };

        await this.dbManager.saveCharacterMemory(memory);
        return memory;
    }

    /**
     * Generate gap-filling memories for "What was X doing while Y happened?" queries
     */
    async generateGapFillingMemory(request: GapFillingRequest): Promise<GapFillingResult> {
        // Get existing character memories for context
        const characterMemories = await this.memoryRetrieval.getCharacterMemories(request.characterId);
        
        // Get character traits and established patterns
        const characterTraits = await this.memoryRetrieval.getCharacterTraits(request.characterId);
        
        // Generate the gap-filling scenario
        const result = await this.gapFillingGenerator.generateScenario(
            request,
            characterMemories,
            characterTraits
        );

        // Save the gap-filling memory (unapproved)
        await this.dbManager.saveCharacterMemory(result.memory);

        return result;
    }

    /**
     * Handle user approval/rejection of gap-filling memories
     */
    async processMemoryApproval(request: MemoryApprovalRequest): Promise<CharacterMemory> {
        const memory = await this.dbManager.getCharacterMemory(request.memoryId);
        if (!memory) {
            throw new Error(`Memory not found: ${request.memoryId}`);
        }

        if (memory.memorySource !== 'ai_gap_filling') {
            throw new Error('Only gap-filling memories can be approved/rejected');
        }

        // Update the memory with approval status
        memory.gapFillingContext = {
            ...memory.gapFillingContext!,
            userApproved: request.approved,
            approvalDate: new Date(),
            reviewNotes: request.reviewNotes
        };

        // If approved, change status
        if (request.approved) {
            memory.canonStatus = 'canon';
            memory.affectsTimeline = true;
        }

        // If user provided modified content, update it
        if (request.modifiedContent) {
            memory.content = request.modifiedContent;
            memory.updatedAt = new Date();
        }

        await this.dbManager.updateCharacterMemory(memory);
        return memory;
    }

    /**
     * Get memories for a character with source filtering
     */
    async getMemories(
        characterId: string,
        options: {
            includeGapFilling?: boolean;
            includeUnapproved?: boolean;
            memoryTypes?: CharacterMemory['memoryType'][];
            canonOnly?: boolean;
            limit?: number;
        } = {}
    ): Promise<CharacterMemory[]> {
        return this.memoryRetrieval.getFilteredMemories(characterId, options);
    }

    /**
     * Get relevant memories for a specific context or query
     */
    async getRelevantMemories(
        characterId: string,
        context: string,
        options: {
            includeGapFilling?: boolean;
            limit?: number;
        } = {}
    ): Promise<CharacterMemory[]> {
        return this.memoryRetrieval.getRelevantMemories(characterId, context, options);
    }

    /**
     * Get all pending gap-filling memories awaiting approval
     */
    async getPendingGapFillingMemories(characterId?: string): Promise<CharacterMemory[]> {
        return this.memoryRetrieval.getPendingGapFillingMemories(characterId);
    }

    /**
     * Update memory access tracking
     */
    async trackMemoryAccess(memoryId: string): Promise<void> {
        const memory = await this.dbManager.getCharacterMemory(memoryId);
        if (memory) {
            memory.accessCount++;
            memory.lastAccessed = new Date();
            await this.dbManager.updateCharacterMemory(memory);
        }
    }

    /**
     * Delete a memory (with proper validation for gap-filling memories)
     */
    async deleteMemory(memoryId: string, reason?: string): Promise<boolean> {
        const memory = await this.dbManager.getCharacterMemory(memoryId);
        if (!memory) {
            return false;
        }

        // Log deletion reason for gap-filling memories
        if (memory.memorySource === 'ai_gap_filling' && reason) {
            // Could log this for analysis of why gap-filling memories are rejected
            console.log(`Gap-filling memory deleted: ${memoryId}, Reason: ${reason}`);
        }

        return this.dbManager.deleteCharacterMemory(memoryId);
    }

    private generateMemoryId(): string {
        return `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
}
