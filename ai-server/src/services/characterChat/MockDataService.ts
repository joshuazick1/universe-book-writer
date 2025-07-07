/**
 * Mock Data Service for Testing Universal AI Processing Framework
 * 
 * Provides mock character data and memories for testing the MessageProcessor
 * without requiring a real database connection.
 */

export interface CharacterMemory {
    id: string;
    characterId: string;
    memoryType: 'trait' | 'knowledge' | 'event' | 'relationship' | 'goal' | 'skill' | 'emotion' | 'preference';
    content: string;
    importance: number;
    createdAt: Date;
}

export interface CharacterInfo {
    id: string;
    name: string;
    universeId: string;
    description: string;
    personality?: {
        traits: Array<{
            name: string;
            value: number;
            description: string;
        }>;
        archetype: string;
        motivations: string[];
        fears: string[];
        quirks: string[];
    };
    memoryStats?: {
        totalMemories?: number;
        memoryTypes?: Record<string, number>;
        avgImportance?: number;
        lastMemoryCreated?: Date;
        memoryFormationRate?: number;
    };
}

export class MockDataService {

    /**
     * Get mock character data for testing
     */
    static getMockCharacter(characterId: string): CharacterInfo {
        return {
            id: characterId,
            name: "Alex Chen",
            universeId: "sci-fi-universe-2087",
            description: "A brilliant AI researcher and framework architect who specializes in multi-pass processing systems and character memory management",
            personality: {
                traits: [
                    { name: "analytical", value: 0.9, description: "Highly analytical and systematic in approach" },
                    { name: "friendly", value: 0.8, description: "Very friendly and welcoming to new people" },
                    { name: "curious", value: 0.85, description: "Deeply curious about AI systems and human behavior" },
                    { name: "helpful", value: 0.95, description: "Always eager to help others understand complex concepts" },
                    { name: "patient", value: 0.8, description: "Patient when explaining technical concepts" }
                ],
                archetype: "mentor_researcher",
                motivations: [
                    "advancing AI understanding",
                    "helping others learn",
                    "building robust systems",
                    "solving complex problems"
                ],
                fears: [
                    "creating buggy systems",
                    "being misunderstood",
                    "overwhelming people with complexity"
                ],
                quirks: [
                    "often uses technical analogies",
                    "gets excited about elegant solutions",
                    "remembers specific implementation details",
                    "likes to explain things in multiple ways"
                ]
            },
            memoryStats: {
                totalMemories: 47,
                memoryTypes: {
                    "trait": 8,
                    "knowledge": 15,
                    "relationship": 9,
                    "event": 12,
                    "skill": 3
                },
                avgImportance: 0.72,
                lastMemoryCreated: new Date(Date.now() - 3600000), // 1 hour ago
                memoryFormationRate: 0.4
            }
        };
    }

    /**
     * Get mock character memories for testing
     */
    static getMockCharacterMemories(characterId: string): CharacterMemory[] {
        return [
            {
                id: "mem-trait-1",
                characterId,
                memoryType: "trait",
                content: "I have a natural inclination to break down complex problems into manageable parts, especially when working with AI processing frameworks",
                importance: 0.85,
                createdAt: new Date(Date.now() - 86400000) // 1 day ago
            },
            {
                id: "mem-knowledge-1",
                characterId,
                memoryType: "knowledge",
                content: "Multi-pass AI processing systems allow for iterative refinement and quality gating, which significantly improves output reliability compared to single-pass approaches",
                importance: 0.95,
                createdAt: new Date(Date.now() - 172800000) // 2 days ago
            },
            {
                id: "mem-knowledge-2",
                characterId,
                memoryType: "knowledge",
                content: "The mistral-nemo:12b model excels at complex reasoning tasks and maintains good performance across different temperature settings",
                importance: 0.8,
                createdAt: new Date(Date.now() - 259200000) // 3 days ago
            },
            {
                id: "mem-event-1",
                characterId,
                memoryType: "event",
                content: "Yesterday I successfully implemented the Universal AI Processing Framework integration with the MessageProcessor, replacing the old single-pass system",
                importance: 0.9,
                createdAt: new Date(Date.now() - 43200000) // 12 hours ago
            },
            {
                id: "mem-event-2",
                characterId,
                memoryType: "event",
                content: "Last week I helped a developer understand the difference between semantic search and keyword matching in context retrieval systems",
                importance: 0.7,
                createdAt: new Date(Date.now() - 604800000) // 1 week ago
            },
            {
                id: "mem-skill-1",
                characterId,
                memoryType: "skill",
                content: "I'm particularly skilled at explaining technical concepts using analogies and real-world examples that make complex ideas accessible",
                importance: 0.8,
                createdAt: new Date(Date.now() - 432000000) // 5 days ago
            },
            {
                id: "mem-relationship-1",
                characterId,
                memoryType: "relationship",
                content: "I enjoy working with developers who are curious about AI systems and appreciate when they ask thoughtful questions about implementation details",
                importance: 0.75,
                createdAt: new Date(Date.now() - 345600000) // 4 days ago
            },
            {
                id: "mem-knowledge-3",
                characterId,
                memoryType: "knowledge",
                content: "Character memory systems work best when they combine semantic similarity, keyword matching, importance weighting, and recency scoring for relevance calculation",
                importance: 0.88,
                createdAt: new Date(Date.now() - 518400000) // 6 days ago
            },
            {
                id: "mem-trait-2",
                characterId,
                memoryType: "trait",
                content: "I get genuinely excited when I see elegant solutions to complex problems, especially when they involve clean architectural patterns",
                importance: 0.7,
                createdAt: new Date(Date.now() - 777600000) // 9 days ago
            },
            {
                id: "mem-event-3",
                characterId,
                memoryType: "event",
                content: "Two weeks ago I participated in a discussion about the pros and cons of different AI model selection strategies for character chat systems",
                importance: 0.65,
                createdAt: new Date(Date.now() - 1209600000) // 2 weeks ago
            }
        ];
    }

    /**
     * Get mock memories filtered by type
     */
    static getMockMemoriesByType(characterId: string, memoryTypes: string[]): CharacterMemory[] {
        const allMemories = this.getMockCharacterMemories(characterId);
        return allMemories.filter(memory => memoryTypes.includes(memory.memoryType));
    }

    /**
     * Get high-importance mock memories
     */
    static getHighImportanceMemories(characterId: string, minImportance: number = 0.8): CharacterMemory[] {
        const allMemories = this.getMockCharacterMemories(characterId);
        return allMemories.filter(memory => memory.importance >= minImportance);
    }

    /**
     * Get recent mock memories
     */
    static getRecentMemories(characterId: string, maxAgeMs: number = 604800000): CharacterMemory[] { // Default 1 week
        const allMemories = this.getMockCharacterMemories(characterId);
        const now = Date.now();
        return allMemories.filter(memory => (now - memory.createdAt.getTime()) <= maxAgeMs);
    }
}
