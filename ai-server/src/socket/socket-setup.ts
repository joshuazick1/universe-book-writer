/**
 * Socket.IO Setup for AI Server
 * 
 * Provides basic WebSocket support for the character chat interface
 */

import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { logger } from '../../../shared/logging/logger.js';

export function setupSocketIO(httpServer: HttpServer): Server {
    const io = new Server(httpServer, {
        cors: {
            origin: ["http://localhost:5174", "http://localhost:5100", "*"], // Allow both Vite dev server and AI server
            methods: ["GET", "POST"],
            credentials: true
        },
        transports: ['websocket', 'polling'],
        allowEIO3: true
    });

    logger.info('Setting up Socket.IO server...');

    // Default namespace for general connections
    io.on('connection', (socket) => {
        logger.debug(`Client connected: ${socket.id}`);

        socket.on('disconnect', (reason) => {
            logger.debug(`Client disconnected: ${socket.id}, reason: ${reason}`);
        });

        // Basic ping/pong for connection testing
        socket.on('ping', () => {
            socket.emit('pong');
        });
    });

    // Character chat namespace
    const characterChatNamespace = io.of('/character-chat');

    characterChatNamespace.on('connection', (socket) => {
        logger.debug(`Character chat client connected: ${socket.id}`);

        // Join conversation room
        socket.on('join_conversation', ({ conversationId }) => {
            socket.join(conversationId);
            logger.debug(`Client ${socket.id} joined conversation: ${conversationId}`);
            socket.emit('conversation_joined', { conversationId });
        });

        // Leave conversation room
        socket.on('leave_conversation', ({ conversationId }) => {
            socket.leave(conversationId);
            logger.debug(`Client ${socket.id} left conversation: ${conversationId}`);
        });

        // Handle chat messages with three-pass processing
        socket.on('send_message', async (data) => {
            try {
                const { conversationId, message, characterId, enableContextVisualization } = data;

                logger.debug(`Processing message in conversation ${conversationId}: ${message}`);

                // Echo the user message back to all clients
                characterChatNamespace.to(conversationId).emit('message_received', {
                    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    conversationId,
                    senderId: 'user',
                    content: message,
                    timestamp: new Date(),
                    type: 'user_message'
                });

                // Emit context gathering events if visualization is enabled
                if (enableContextVisualization) {
                    characterChatNamespace.to(conversationId).emit('context:gathering_started', {
                        searchQuery: message,
                        characterId: characterId
                    });
                }

                // **PASS 1: Context Requirement Analysis**
                characterChatNamespace.to(conversationId).emit('context:analyzing_requirements', {
                    message: message,
                    characterId: characterId
                });

                // Simulate quick analysis (in real implementation, this would be instant)
                await new Promise(resolve => setTimeout(resolve, 200));

                // Mock context analysis result
                const contextAnalysis = {
                    requiresContext: message.trim().toLowerCase().length > 10, // Simple heuristic
                    complexity: message.length < 20 ? 'simple' : message.length < 50 ? 'moderate' : 'complex',
                    contextTypes: ['personality', 'memories'],
                    confidence: 0.8,
                    reasoning: message.length < 20 ? 'Simple greeting or response' : 'Complex query requiring context'
                };

                characterChatNamespace.to(conversationId).emit('context:requirements_analyzed', {
                    analysis: contextAnalysis
                });

                // **PASS 2: Context Gathering (if needed)**
                let contextResult: {
                    selectedMemories: Array<{ id: string, content: string, relevance: number }>;
                    relevanceScores: Map<string, number>;
                    totalMemoriesEvaluated: number;
                    contextSummary: string;
                    processingTime: number;
                } = {
                    selectedMemories: [],
                    relevanceScores: new Map(),
                    totalMemoriesEvaluated: 0,
                    contextSummary: 'No context required',
                    processingTime: 0
                };

                if (contextAnalysis.requiresContext) {
                    characterChatNamespace.to(conversationId).emit('context:gathering_memories', {
                        searchQuery: message,
                        expectedMemories: contextAnalysis.complexity === 'complex' ? 15 : 8
                    });

                    // Simulate memory gathering
                    await new Promise(resolve => setTimeout(resolve, 800));

                    // Mock memory results
                    const mockMemories: Array<{ id: string, content: string, relevance: number }> = [
                        { id: 'mem1', content: 'Character enjoys logical discussions', relevance: 0.7 },
                        { id: 'mem2', content: 'Character has experience with scientific topics', relevance: 0.6 }
                    ];

                    contextResult = {
                        selectedMemories: mockMemories,
                        relevanceScores: new Map([['mem1', 0.7], ['mem2', 0.6]]),
                        totalMemoriesEvaluated: 25,
                        contextSummary: `Selected ${mockMemories.length} relevant memories`,
                        processingTime: 800
                    };

                    characterChatNamespace.to(conversationId).emit('context:memories_found', {
                        memories: mockMemories,
                        relevanceScores: Object.fromEntries(contextResult.relevanceScores),
                        totalEvaluated: contextResult.totalMemoriesEvaluated
                    });
                }

                characterChatNamespace.to(conversationId).emit('context:selection_complete', {
                    contextSummary: contextResult.contextSummary,
                    memoryCount: contextResult.selectedMemories.length
                });

                // **PASS 3: Response Generation**
                characterChatNamespace.to(conversationId).emit('response:generating', {
                    modelSelected: contextAnalysis.complexity === 'simple' ? 'llama3.2' :
                        contextAnalysis.complexity === 'complex' ? 'mistral-nemo:12b' : 'llama3.1:8b',
                    temperature: contextAnalysis.complexity === 'simple' ? 0.4 : 0.7,
                    contextUsed: contextResult.selectedMemories.length > 0
                });

                // Show character typing
                characterChatNamespace.to(conversationId).emit('character_typing', {
                    characterId,
                    isTyping: true
                });

                // Simulate response generation time based on complexity
                const generationTime = contextAnalysis.complexity === 'simple' ? 1000 :
                    contextAnalysis.complexity === 'moderate' ? 2000 : 3000;

                await new Promise(resolve => setTimeout(resolve, generationTime));

                // Stop typing indicator
                characterChatNamespace.to(conversationId).emit('character_typing', {
                    characterId,
                    isTyping: false
                });

                // Generate context-aware response
                let responseContent;
                if (contextAnalysis.complexity === 'simple') {
                    // Simple responses for greetings
                    const simpleResponses = [
                        "Hello there!",
                        "Greetings! How may I assist you?",
                        "Good to see you again.",
                        "How are you doing today?"
                    ];
                    responseContent = simpleResponses[Math.floor(Math.random() * simpleResponses.length)];
                } else {
                    // More complex responses using context
                    if (contextResult.selectedMemories.length > 0) {
                        responseContent = `Interesting question about "${message}". Based on my understanding and experiences, I find this topic quite engaging. Let me share my thoughts...`;
                    } else {
                        responseContent = `That's a thoughtful question: "${message}". Let me consider this carefully...`;
                    }
                }

                // Send final character response
                characterChatNamespace.to(conversationId).emit('message_received', {
                    id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    conversationId,
                    senderId: characterId,
                    content: responseContent,
                    timestamp: new Date(),
                    type: 'character_message',
                    characterResponse: {
                        emotionalState: contextAnalysis.complexity === 'simple' ? 'friendly' : 'thoughtful',
                        confidence: contextAnalysis.confidence,
                        memoryImpact: contextResult.selectedMemories.length * 0.1,
                        modelUsed: contextAnalysis.complexity === 'simple' ? 'llama3.2' :
                            contextAnalysis.complexity === 'complex' ? 'mistral-nemo:12b' : 'llama3.1:8b',
                        processingPasses: {
                            contextAnalysis: contextAnalysis,
                            contextGathering: contextResult,
                            totalProcessingTime: 200 + (contextAnalysis.requiresContext ? 800 : 0) + generationTime
                        }
                    },
                    memoryInfluence: Object.fromEntries(contextResult.relevanceScores),
                    contextUsed: contextResult.selectedMemories.map(m => ({
                        id: m.id,
                        content: m.content,
                        relevance: contextResult.relevanceScores.get(m.id) || 0
                    }))
                });

                // Emit completion event
                characterChatNamespace.to(conversationId).emit('response:complete', {
                    messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    processingTime: 200 + (contextAnalysis.requiresContext ? 800 : 0) + generationTime,
                    passes: {
                        contextAnalysis: { completed: true, time: 200 },
                        contextGathering: { completed: contextAnalysis.requiresContext, time: contextAnalysis.requiresContext ? 800 : 0 },
                        responseGeneration: { completed: true, time: generationTime }
                    }
                });

            } catch (error) {
                logger.error(`Error handling message: ${error instanceof Error ? error.message : String(error)}`);
                socket.emit('error', { message: 'Failed to process message' });
            }
        });

        // Handle character memory updates
        socket.on('memory_updated', (data) => {
            const { conversationId, memoryId, characterId } = data;
            logger.debug(`Memory updated for character ${characterId}: ${memoryId}`);

            // Broadcast memory update to other clients in the conversation
            socket.to(conversationId).emit('character_memory_updated', {
                characterId,
                memoryId,
                timestamp: new Date()
            });
        });

        socket.on('disconnect', (reason) => {
            logger.debug(`Character chat client disconnected: ${socket.id}, reason: ${reason}`);
        });
    });

    logger.info('Socket.IO server setup complete');
    logger.debug('Available namespaces: / (default), /character-chat');

    return io;
}
