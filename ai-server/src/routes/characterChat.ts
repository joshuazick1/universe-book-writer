/**
 * Character Selection API Routes
 * 
 * REST endpoints for character and universe selection in the chat interface.
 * Integrates with the RAG database to fetch available characters and universes.
 */

import { Router, Request, Response, RequestHandler } from 'express';

const router = Router();

/**
 * GET /api/chat/universes
 * Get all available universes for character chat from RAG database
 */
const getUniverses: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;

        // Try to fetch from RAG database first
        let universes: any[] = [];

        try {
            // Filter by nodeType using the filters parameter
            const filters = JSON.stringify({ nodeType: 'universe' });
            const ragResponse = await fetch(`http://localhost:5100/api/rag/nodes?filters=${encodeURIComponent(filters)}&limit=100`);
            if (ragResponse.ok) {
                const ragData = await ragResponse.json();

                if (ragData.nodes && ragData.nodes.length > 0) {
                    // Filter client-side as well to ensure we only get universe nodes
                    const universeNodes = ragData.nodes.filter((node: any) => node.nodeType === 'universe');

                    // Count characters for each universe
                    const universesWithCounts = await Promise.all(universeNodes.map(async (node: any) => {
                        let characterCount = 0;
                        try {
                            // Fetch characters for this universe to get count
                            const charFilters = JSON.stringify({
                                nodeType: 'character',
                                universeId: node.nodeId
                            });
                            const charResponse = await fetch(`http://localhost:5100/api/rag/nodes?filters=${encodeURIComponent(charFilters)}&limit=1000`);
                            if (charResponse.ok) {
                                const charData = await charResponse.json();
                                if (charData.nodes) {
                                    // Filter client-side to ensure we only count character nodes for this universe
                                    const characterNodes = charData.nodes.filter((charNode: any) =>
                                        charNode.nodeType === 'character' &&
                                        (charNode.universeId === node.nodeId || charNode.properties?.universeId === node.nodeId)
                                    );
                                    characterCount = characterNodes.length;
                                }
                            }
                        } catch (err) {
                            console.warn(`Failed to count characters for universe ${node.nodeId}:`, err);
                        }

                        return {
                            id: node.nodeId,
                            name: node.properties?.name || node.title || 'Unnamed Universe',
                            description: node.properties?.description || node.content || 'No description available',
                            genre: node.properties?.genre || 'unknown',
                            characterCount,
                            createdAt: new Date(node.createdAt || Date.now()),
                            status: 'active'
                        };
                    }));

                    universes = universesWithCounts;
                }
            }
        } catch (ragError) {
            console.warn('RAG system not available, using fallback data:', ragError);
        }

        // If no universes found in RAG, return empty list
        if (universes.length === 0) {
            res.json({
                success: true,
                universes: [],
                count: 0,
                isFromRAG: false,
                message: 'No universes found in RAG database. Create a universe first to start chatting with characters!'
            });
            return;
        }

        res.json({
            success: true,
            universes,
            count: universes.length,
            isFromRAG: true
        });

    } catch (error) {
        console.error('Failed to get universes:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * GET /api/chat/universes/:universeId/characters
 * Get all characters available for chat in a specific universe from RAG database
 */
const getUniverseCharacters: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { universeId } = req.params;
        const { limit = '50', offset = '0' } = req.query;

        let characters: any[] = [];

        // Try to fetch from RAG database first
        try {
            // Filter by nodeType and universeId using the filters parameter
            const filters = JSON.stringify({
                nodeType: 'character',
                universeId: universeId
            });
            const ragResponse = await fetch(`http://localhost:5100/api/rag/nodes?filters=${encodeURIComponent(filters)}&limit=${limit}&offset=${offset}`);
            if (ragResponse.ok) {
                const ragData = await ragResponse.json();

                if (ragData.nodes && ragData.nodes.length > 0) {
                    // Filter client-side as well to ensure we only get character nodes for this universe
                    const characterNodes = ragData.nodes.filter((node: any) =>
                        node.nodeType === 'character' &&
                        (node.universeId === universeId || node.properties?.universeId === universeId)
                    );
                    characters = characterNodes.map((node: any) => ({
                        id: node.nodeId,
                        name: node.properties?.name || node.title || 'Unnamed Character',
                        description: node.properties?.description || node.content || 'No description available',
                        universeId: node.universeId || universeId,
                        personality: {
                            traits: node.properties?.traits || ['mysterious'],
                            archetype: node.properties?.archetype || 'Unknown',
                            motivations: node.properties?.motivations || [],
                            fears: node.properties?.fears || [],
                            quirks: node.properties?.quirks || []
                        },
                        avatar: node.properties?.avatar ? {
                            url: node.properties.avatar,
                            alt: `${node.properties?.name || 'Character'} avatar`
                        } : undefined,
                        status: 'active',
                        lastActive: new Date(),
                        conversationCount: 0,
                        totalMessageCount: 0
                    }));
                }
            }
        } catch (ragError) {
            console.warn('RAG system not available for characters:', ragError);
        }

        // Return characters (empty if none found)
        res.json({
            success: true,
            characters,
            universeId,
            count: characters.length,
            message: characters.length === 0 ? 'No characters found. Create characters in this universe first!' : undefined
        });

    } catch (error) {
        console.error('Failed to get universe characters:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * GET /api/chat/characters/:characterId
 * Get detailed information about a specific character
 */
const getCharacter: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { characterId } = req.params;

        // Try to fetch character from RAG database by searching for nodeId
        try {
            // Search for character by nodeId since the endpoint expects RAG id, not nodeId
            const filters = JSON.stringify({
                nodeType: 'character',
                nodeId: characterId
            });
            const ragResponse = await fetch(`http://localhost:5100/api/rag/nodes?filters=${encodeURIComponent(filters)}&limit=1`);
            if (ragResponse.ok) {
                const ragData = await ragResponse.json();

                if (ragData.nodes && ragData.nodes.length > 0) {
                    const node = ragData.nodes[0];
                    const character = {
                        id: node.nodeId,
                        name: node.properties?.name || node.title || 'Unnamed Character',
                        fullName: node.properties?.fullName || node.properties?.name || node.title,
                        description: node.properties?.description || node.content || 'No description available',
                        universeId: node.universeId || 'unknown',
                        personality: {
                            traits: node.properties?.traits || [],
                            archetype: node.properties?.archetype || 'Unknown',
                            motivations: node.properties?.motivations || [],
                            fears: node.properties?.fears || [],
                            quirks: node.properties?.quirks || []
                        },
                        avatar: node.properties?.avatar ? {
                            url: node.properties.avatar,
                            alt: `${node.properties?.name || 'Character'} avatar`
                        } : undefined,
                        memoryStats: {
                            totalMemories: 0,
                            memoryTypes: {},
                            avgImportance: 0.5,
                            lastMemoryCreated: new Date(),
                            memoryFormationRate: 0
                        },
                        chatSettings: {
                            responseStyle: 'character_appropriate',
                            verbosity: 'normal',
                            emotionalExpression: 0.5,
                            creativityLevel: 0.5,
                            memoryIntegrationLevel: 'balanced'
                        },
                        status: 'active',
                        lastActive: new Date(),
                        conversationCount: 0,
                        totalMessageCount: 0,
                        backstory: node.properties?.backstory || 'Character backstory to be developed',
                        currentSituation: node.properties?.currentSituation || 'Current situation unknown'
                    };

                    res.json({
                        success: true,
                        character
                    });
                    return;
                }
            }
        } catch (ragError) {
            console.warn('RAG system not available for character details:', ragError);
        }

        // Character not found
        res.status(404).json({
            error: 'Character not found',
            characterId,
            message: 'Character not found in RAG database'
        });

    } catch (error) {
        console.error('Failed to get character:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * POST /api/chat/populate-sample-data
 * Populate the RAG database with sample universes and characters for testing
 */
const populateSampleData: RequestHandler = async (req: Request, res: Response) => {
    try {
        const results = {
            universes: [] as any[],
            characters: [] as any[],
            errors: [] as string[]
        };

        // Sample universes to create
        const sampleUniverses = [
            {
                nodeId: 'star_trek_universe',
                nodeType: 'universe',
                title: 'Star Trek Universe',
                content: 'The future of humanity and alien civilizations exploring space through the United Federation of Planets.',
                properties: {
                    name: 'Star Trek Universe',
                    description: 'Sci-fi universe featuring space exploration, diplomacy, and diverse alien species',
                    genre: 'sci-fi',
                    timeFrame: '23rd-24th century',
                    themes: ['exploration', 'diversity', 'diplomacy', 'technology']
                },
                tags: ['sci-fi', 'space', 'federation', 'future'],
                universeId: 'star_trek_universe'
            },
            {
                nodeId: 'fantasy_realm',
                nodeType: 'universe',
                title: 'Mystical Fantasy Realm',
                content: 'A magical world filled with wizards, dragons, and ancient mysteries.',
                properties: {
                    name: 'Mystical Fantasy Realm',
                    description: 'Classic fantasy universe with magic, mythical creatures, and epic quests',
                    genre: 'fantasy',
                    timeFrame: 'medieval-like era',
                    themes: ['magic', 'adventure', 'heroism', 'good vs evil']
                },
                tags: ['fantasy', 'magic', 'medieval', 'dragons'],
                universeId: 'fantasy_realm'
            }
        ];

        // Sample characters
        const sampleCharacters = [
            {
                nodeId: 'spock_prime',
                nodeType: 'character',
                title: 'Mr. Spock',
                content: 'Half-Vulcan, half-human science officer aboard the USS Enterprise. Known for his logical approach to problems and internal struggle between emotion and logic.',
                properties: {
                    name: 'Spock',
                    species: 'Half-Vulcan, Half-Human',
                    occupation: 'Science Officer',
                    personality: 'Logical, curious, loyal, conflicted',
                    traits: ['logical', 'intelligent', 'loyal', 'analytical'],
                    archetype: 'The Mentor',
                    motivations: ['scientific discovery', 'protecting crew', 'understanding humanity'],
                    fears: ['loss of control', 'emotional overwhelming'],
                    quirks: ['raised eyebrow', 'precise speech', 'mind melds']
                },
                tags: ['vulcan', 'science-officer', 'enterprise', 'logical'],
                universeId: 'star_trek_universe'
            },
            {
                nodeId: 'gandalf_wizard',
                nodeType: 'character',
                title: 'Gandalf the Grey',
                content: 'An ancient and wise wizard who guides heroes on their quests. Known for his deep knowledge of Middle-earth and its history.',
                properties: {
                    name: 'Gandalf',
                    species: 'Maia (Wizard)',
                    occupation: 'Wizard/Guide',
                    personality: 'Wise, patient, protective, mysterious',
                    traits: ['wise', 'powerful', 'patient', 'mysterious'],
                    archetype: 'The Wise Mentor',
                    motivations: ['protecting the realm', 'guiding heroes', 'defeating darkness'],
                    fears: ['corruption of power', 'failure to protect innocents'],
                    quirks: ['pipe smoking', 'staff tapping', 'cryptic advice']
                },
                tags: ['wizard', 'magic', 'mentor', 'wise'],
                universeId: 'fantasy_realm'
            }
        ];

        // Create universes in RAG
        for (const universe of sampleUniverses) {
            try {
                const response = await fetch('http://localhost:5100/api/rag/nodes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(universe)
                });

                if (response.ok) {
                    const data = await response.json();
                    results.universes.push(data);
                } else {
                    const error = await response.text();
                    results.errors.push(`Failed to create universe ${universe.title}: ${error}`);
                }
            } catch (error) {
                results.errors.push(`Error creating universe ${universe.title}: ${error}`);
            }
        }

        // Create characters in RAG
        for (const character of sampleCharacters) {
            try {
                const response = await fetch('http://localhost:5100/api/rag/nodes', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(character)
                });

                if (response.ok) {
                    const data = await response.json();
                    results.characters.push(data);
                } else {
                    const error = await response.text();
                    results.errors.push(`Failed to create character ${character.title}: ${error}`);
                }
            } catch (error) {
                results.errors.push(`Error creating character ${character.title}: ${error}`);
            }
        }

        res.json({
            success: true,
            message: 'Sample data population completed',
            results,
            summary: {
                universesCreated: results.universes.length,
                charactersCreated: results.characters.length,
                errors: results.errors.length
            }
        });

    } catch (error) {
        console.error('Failed to populate sample data:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * POST /api/characters/:characterId/memories
 * Get memories for a specific character with optional filtering
 */
const getCharacterMemories: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { characterId } = req.params;
        const { filters } = req.body;

        // For now, return mock memory data since we don't have a full memory system yet
        const mockMemories = [
            {
                id: `memory_${characterId}_1`,
                characterId,
                content: "First meeting with the crew aboard the Enterprise",
                type: "first_impression",
                importance: 0.9,
                tags: ["crew", "enterprise", "first_meeting"],
                timestamp: new Date(Date.now() - 86400000), // 1 day ago
                emotional_impact: 0.7,
                context: {
                    location: "USS Enterprise Bridge",
                    participants: ["Kirk", "McCoy", "Scotty"],
                    situation: "New assignment briefing"
                }
            },
            {
                id: `memory_${characterId}_2`,
                characterId,
                content: "Discovering an anomalous scientific reading",
                type: "discovery",
                importance: 0.8,
                tags: ["science", "discovery", "anomaly"],
                timestamp: new Date(Date.now() - 43200000), // 12 hours ago
                emotional_impact: 0.6,
                context: {
                    location: "Science Lab",
                    participants: ["Self"],
                    situation: "Routine scientific analysis"
                }
            }
        ];

        // Apply basic filtering if provided
        let filteredMemories = mockMemories;
        if (filters) {
            if (filters.type) {
                filteredMemories = filteredMemories.filter(m => m.type === filters.type);
            }
            if (filters.minImportance) {
                filteredMemories = filteredMemories.filter(m => m.importance >= filters.minImportance);
            }
            if (filters.tags && filters.tags.length > 0) {
                filteredMemories = filteredMemories.filter(m =>
                    filters.tags.some((tag: string) => m.tags.includes(tag))
                );
            }
        }

        res.json({
            success: true,
            memories: filteredMemories,
            totalCount: filteredMemories.length,
            characterId
        });

    } catch (error) {
        console.error('Failed to get character memories:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * POST /api/characters/:characterId/memory-analytics
 * Get memory analytics for a specific character
 */
const getCharacterMemoryAnalytics: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { characterId } = req.params;
        const { timeRange } = req.body;

        // Mock analytics data since we don't have a full analytics system yet
        const mockAnalytics = {
            characterId,
            timeRange: timeRange || 'all',
            totalMemories: 2,
            memoryTypes: {
                'first_impression': 1,
                'discovery': 1
            },
            emotionalDistribution: {
                'positive': 0.6,
                'neutral': 0.3,
                'negative': 0.1
            },
            memoryFormationRate: {
                'daily': 0.5,
                'weekly': 3.5,
                'monthly': 15
            },
            importanceDistribution: {
                'high': 1,
                'medium': 1,
                'low': 0
            },
            mostCommonTags: [
                { tag: 'science', count: 1 },
                { tag: 'crew', count: 1 },
                { tag: 'enterprise', count: 1 }
            ],
            memoryTimeline: [
                {
                    date: new Date(Date.now() - 86400000).toISOString(),
                    count: 1,
                    avgImportance: 0.9
                },
                {
                    date: new Date(Date.now() - 43200000).toISOString(),
                    count: 1,
                    avgImportance: 0.8
                }
            ]
        };

        res.json({
            success: true,
            analytics: mockAnalytics,
            characterId
        });

    } catch (error) {
        console.error('Failed to get character memory analytics:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * POST /api/conversations
 * Create a new conversation session
 */
const createConversation: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { characterId, universeId, type } = req.body;

        if (!characterId) {
            res.status(400).json({
                error: 'characterId is required'
            });
            return;
        }

        // Generate a new conversation ID
        const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

        // For now, create a simple conversation object
        // In a full implementation, this would be stored in a database
        const conversation = {
            id: conversationId,
            characterId,
            universeId: universeId || 'unknown',
            type: type || 'character_chat',
            status: 'active',
            createdAt: new Date(),
            lastActivity: new Date(),
            messageCount: 0,
            participants: [characterId],
            metadata: {
                chatSettings: {
                    responseStyle: 'character_appropriate',
                    verbosity: 'normal',
                    emotionalExpression: 0.5
                }
            }
        };

        res.status(201).json(conversation);

    } catch (error) {
        console.error('Failed to create conversation:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

/**
 * POST /api/chat/process-message
 * Test endpoint for the new Universal AI Processing Framework with MessageProcessor
 */
const processMessage: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { characterId, message, conversationId, enableContextVisualization = true } = req.body;

        if (!characterId || !message) {
            res.status(400).json({
                error: 'Missing required fields',
                message: 'characterId and message are required'
            });
            return;
        }

        // Import and create MessageProcessor instance
        const { CharacterChatProcessor } = await import('../services/characterChat/MessageProcessor.js');
        const processor = new CharacterChatProcessor();

        // Create a test request
        const chatRequest = {
            id: `test-${Date.now()}`,
            type: 'chat' as const,
            complexity: 'moderate' as const,
            domain: 'character-chat',
            scope: 'atomic' as const,
            qualityRequirement: 'standard' as const,
            ragDomain: `character:${characterId}`,
            content: message,
            timestamp: new Date(),
            characterId,
            conversationId: conversationId || `conv-${Date.now()}`,
            conversationHistory: [], // Empty for test
            enableContextVisualization
        };

        // Process the message using our Universal AI Framework
        const response = await processor.processMessage(chatRequest);

        res.json({
            success: true,
            response,
            frameworkUsed: 'Universal AI Processing Framework',
            processingDetails: {
                passesExecuted: response.processingMetrics.passesExecuted,
                totalTime: response.processingMetrics.totalExecutionTime,
                qualityScore: response.qualityScore,
                confidence: response.confidence
            }
        });

    } catch (error) {
        console.error('Failed to process message:', error);
        res.status(500).json({
            error: 'Internal server error',
            message: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined
        });
    }
};

// Route definitions
router.get('/universes', getUniverses);
router.get('/universes/:universeId/characters', getUniverseCharacters);
router.get('/characters/:characterId', getCharacter);
router.post('/characters/:characterId/memories', getCharacterMemories);
router.post('/characters/:characterId/memory-analytics', getCharacterMemoryAnalytics);
router.post('/conversations', createConversation);
router.post('/populate-sample-data', populateSampleData);
router.post('/process-message', processMessage); // New test endpoint for Universal AI Framework
router.post('/process-message', processMessage);

export default router;
