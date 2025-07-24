/**
 * Chat Controller
 * Handles universe/character selection and chat message processing endpoints.
 * Extracted from characterChat.ts for modularization.
 */
import { Request, Response, RequestHandler } from 'express';

/**
 * GET /api/chat/universes
 * Get all available universes for character chat from RAG database
 */
export const getUniverses: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { userId } = req.query;
        let universes: any[] = [];
        try {
            const filters = JSON.stringify({ nodeType: 'universe' });
            const ragResponse = await fetch(`http://localhost:5100/api/rag/nodes?filters=${encodeURIComponent(filters)}&limit=100`);
            if (ragResponse.ok) {
                const ragData = await ragResponse.json();
                if (ragData.nodes && ragData.nodes.length > 0) {
                    const universeNodes = ragData.nodes.filter((node: any) => node.nodeType === 'universe');
                    const universesWithCounts = await Promise.all(universeNodes.map(async (node: any) => {
                        let characterCount = 0;
                        try {
                            const charFilters = JSON.stringify({ nodeType: 'character', universeId: node.nodeId });
                            const charResponse = await fetch(`http://localhost:5100/api/rag/nodes?filters=${encodeURIComponent(charFilters)}&limit=1000`);
                            if (charResponse.ok) {
                                const charData = await charResponse.json();
                                if (charData.nodes) {
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
export const getUniverseCharacters: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { universeId } = req.params;
        const { limit = '50', offset = '0' } = req.query;
        let characters: any[] = [];
        try {
            const filters = JSON.stringify({ nodeType: 'character', universeId: universeId });
            const ragResponse = await fetch(`http://localhost:5100/api/rag/nodes?filters=${encodeURIComponent(filters)}&limit=${limit}&offset=${offset}`);
            if (ragResponse.ok) {
                const ragData = await ragResponse.json();
                if (ragData.nodes && ragData.nodes.length > 0) {
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
export const getCharacter: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { characterId } = req.params;
        try {
            const filters = JSON.stringify({ nodeType: 'character', nodeId: characterId });
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
 * POST /api/chat/process-message
 * Test endpoint for the new Universal AI Processing Framework with MessageProcessor
 */
export const processMessage: RequestHandler = async (req: Request, res: Response) => {
    try {
        const { characterId, message, conversationId, enableContextVisualization = true } = req.body;
        if (!characterId || !message) {
            res.status(400).json({
                error: 'Missing required fields',
                message: 'characterId and message are required'
            });
            return;
        }
        const { CharacterChatMessageProcessor } = await import('../services/characterChat/MessageProcessor.js');
        const processor = new CharacterChatMessageProcessor();
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
            conversationHistory: [],
            enableContextVisualization
        };
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
