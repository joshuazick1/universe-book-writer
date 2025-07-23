/**
 * Main Character Chat Interface - Dual-pane chat with memory timeline visualization
 * 
 * Features:
 * - Real-time chat with AI characters
 * - Scrollable memory timeline showing character memories
 * - Live context visualization showing memory retrieval process
 * - Memory influence tracking for each response
 * - Multi-character conversation support
 * - Real-time memory formation from conversations
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
    ChatMessagePanel,
    MemoryTimelineVisualization,
    ContextGatheringVisualizer,
    CharacterPersonalityDisplay,
    MemoryInfluenceTracker,
    CharacterSwitcher,
    ConversationHistoryManager
} from '../../components/character-chat';
import {
    CharacterMemory,
    ChatMessage,
    ContextGatheringState,
    CharacterInfo,
    ConversationState
} from '../../types/character-chat';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useCharacterMemory } from '../../hooks/useCharacterMemory';

interface CharacterChatInterfaceProps {
    initialCharacterId?: string;
    universeId?: string;
    showAdvancedFeatures?: boolean;
    enableMultiCharacter?: boolean;
}

export const CharacterChatInterface: React.FC<CharacterChatInterfaceProps> = ({
    initialCharacterId,
    universeId,
    showAdvancedFeatures = true,
    enableMultiCharacter = false
}) => {
    // State Management
    const [activeCharacterId, setActiveCharacterId] = useState<string>(initialCharacterId || '');
    const [characters, setCharacters] = useState<CharacterInfo[]>([]);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [isGeneratingResponse, setIsGeneratingResponse] = useState(false);
    const [conversationId, setConversationId] = useState<string>('');

    // Memory and Context State
    const [memories, setMemories] = useState<CharacterMemory[]>([]);
    const [contextGatheringState, setContextGatheringState] = useState<ContextGatheringState>({
        isGathering: false,
        searchResults: [],
        selectedMemories: [],
        relevanceScores: new Map(),
        contextPrompt: ''
    });
    const [memoryInfluence, setMemoryInfluence] = useState<Map<string, number>>(new Map());

    // UI State
    const [layoutMode, setLayoutMode] = useState<'dual-pane' | 'timeline-focus' | 'chat-focus'>('dual-pane');
    const [showContextVisualization, setShowContextVisualization] = useState(true);
    const [timelineFilter, setTimelineFilter] = useState<'all' | 'relevant' | 'recent'>('all');

    // Refs
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const timelineContainerRef = useRef<HTMLDivElement>(null);

    // Custom Hooks
    const { socket, isConnected, sendMessage } = useWebSocket('/character-chat');
    const {
        getCharacterMemories,
        getMemoryContext,
        createMemoryFromConversation,
        updateMemoryRelevance
    } = useCharacterMemory();

    // Initialize character and conversation
    useEffect(() => {
        if (activeCharacterId) {
            initializeCharacterChat(activeCharacterId);
        }
    }, [activeCharacterId]);

    // Load characters list for the universe if multi-character is enabled
    useEffect(() => {
        if (enableMultiCharacter && universeId) {
            loadUniverseCharacters();
        }
    }, [enableMultiCharacter, universeId]);

    // Load characters for character switching
    const loadUniverseCharacters = async () => {
        if (!universeId) return;

        try {
            const response = await fetch(`/api/chat/universes/${universeId}/characters`);
            const data = await response.json();

            if (data.success) {
                setCharacters(data.characters);
            }
        } catch (error) {
            console.error('Failed to load universe characters:', error);
        }
    };

    // Socket event listeners
    useEffect(() => {
        if (!socket) return;

        socket.on('context:gathering_started', handleContextGatheringStarted);
        socket.on('context:memories_found', handleMemoriesFound);
        socket.on('context:selection_complete', handleContextSelectionComplete);
        socket.on('response:generating', handleResponseGenerating);
        socket.on('response:streaming', handleResponseStreaming);
        socket.on('response:complete', handleResponseComplete);
        socket.on('memory:created', handleMemoryCreated);
        socket.on('memory:updated', handleMemoryUpdated);

        return () => {
            socket.off('context:gathering_started');
            socket.off('context:memories_found');
            socket.off('context:selection_complete');
            socket.off('response:generating');
            socket.off('response:streaming');
            socket.off('response:complete');
            socket.off('memory:created');
            socket.off('memory:updated');
        };
    }, [socket]);

    // Initialize character chat session
    const initializeCharacterChat = async (characterId: string) => {
        try {
            // Load character information from our new API
            const characterResponse = await fetch(`/api/chat/characters/${characterId}`);
            const characterData = await characterResponse.json();

            if (!characterData.success) {
                throw new Error('Failed to load character data');
            }

            const character = characterData.character;

            // Load character memories
            const memories = await getCharacterMemories(characterId);
            setMemories(memories || []); // Ensure it's always an array

            // Create new conversation session
            const conversationResponse = await fetch('/api/chat/conversations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterId,
                    universeId,
                    type: 'character_chat'
                })
            });
            const conversation = await conversationResponse.json();
            setConversationId(conversation.id);

            // Join socket room for this conversation
            if (socket) {
                socket.emit('join_conversation', { conversationId: conversation.id });
            }

        } catch (error) {
            console.error('Failed to initialize character chat:', error);
        }
    };

    // Handle sending a chat message
    const handleSendMessage = useCallback(async (content: string) => {
        if (!activeCharacterId || !conversationId || !content.trim()) return;

        const userMessage: ChatMessage = {
            id: `msg_${Date.now()}`,
            conversationId,
            characterId: activeCharacterId,
            content: content.trim(),
            role: 'user',
            timestamp: new Date(),
            memoryInfluence: new Map(),
            contextUsed: []
        };

        setMessages(prev => [...prev, userMessage]);
        setIsGeneratingResponse(true);
        setContextGatheringState(prev => ({ ...prev, isGathering: true }));

        // Send message to backend for processing
        try {
            await sendMessage('chat:send_message', {
                conversationId,
                characterId: activeCharacterId,
                content: content.trim(),
                enableContextVisualization: showContextVisualization,
                memoryFilters: {
                    types: timelineFilter === 'all' ? undefined : ['recent'],
                    importance_threshold: 0.3
                }
            });
        } catch (error) {
            console.error('Failed to send message:', error);
            setIsGeneratingResponse(false);
            setContextGatheringState(prev => ({ ...prev, isGathering: false }));
        }
    }, [activeCharacterId, conversationId, showContextVisualization, timelineFilter, sendMessage]);

    // Socket Event Handlers
    const handleContextGatheringStarted = (data: { searchQuery: string; totalMemories: number }) => {
        setContextGatheringState(prev => ({
            ...prev,
            isGathering: true,
            searchResults: [],
            selectedMemories: [],
            relevanceScores: new Map()
        }));
    };

    const handleMemoriesFound = (data: {
        memories: CharacterMemory[];
        relevanceScores: Array<{ memoryId: string; score: number }>
    }) => {
        const relevanceMap = new Map(
            data.relevanceScores.map(rs => [rs.memoryId, rs.score])
        );

        setContextGatheringState(prev => ({
            ...prev,
            searchResults: data.memories,
            relevanceScores: relevanceMap
        }));
    };

    const handleContextSelectionComplete = (data: {
        selectedMemories: CharacterMemory[];
        contextPrompt: string;
    }) => {
        setContextGatheringState(prev => ({
            ...prev,
            selectedMemories: data.selectedMemories,
            contextPrompt: data.contextPrompt
        }));
    };

    const handleResponseGenerating = () => {
        // AI is now generating response
    };

    const handleResponseStreaming = (data: {
        messageId: string;
        content: string;
        isComplete: boolean;
        memoryInfluence?: Array<{ memoryId: string; influence: number }>;
    }) => {
        setMessages(prev => {
            const existingIndex = prev.findIndex(m => m.id === data.messageId);

            const message: ChatMessage = {
                id: data.messageId,
                conversationId,
                characterId: activeCharacterId,
                content: data.content,
                role: 'assistant',
                timestamp: new Date(),
                memoryInfluence: new Map(
                    data.memoryInfluence?.map(mi => [mi.memoryId, mi.influence]) || []
                ),
                contextUsed: contextGatheringState.selectedMemories.map(m => m.id),
                isStreaming: !data.isComplete
            };

            if (existingIndex >= 0) {
                const updated = [...prev];
                updated[existingIndex] = message;
                return updated;
            } else {
                return [...prev, message];
            }
        });

        // Update memory influence tracking
        if (data.memoryInfluence) {
            setMemoryInfluence(new Map(
                data.memoryInfluence.map(mi => [mi.memoryId, mi.influence])
            ));
        }
    };

    const handleResponseComplete = (data: {
        messageId: string;
        newMemories?: CharacterMemory[];
    }) => {
        setIsGeneratingResponse(false);
        setContextGatheringState(prev => ({
            ...prev,
            isGathering: false
        }));

        // Add any new memories formed during conversation
        if (data.newMemories) {
            setMemories(prev => [...prev, ...(data.newMemories || [])]);
        }

        // Final message update
        setMessages(prev =>
            prev.map(m =>
                m.id === data.messageId
                    ? { ...m, isStreaming: false }
                    : m
            )
        );
    };

    const handleMemoryCreated = (data: { memory: CharacterMemory }) => {
        setMemories(prev => [...prev, data.memory]);
    };

    const handleMemoryUpdated = (data: { memory: CharacterMemory }) => {
        setMemories(prev =>
            prev.map(m => m.id === data.memory.id ? data.memory : m)
        );
    };

    // Handle character switching
    const handleCharacterSwitch = (characterId: string) => {
        setActiveCharacterId(characterId);
        setMessages([]); // Clear messages when switching characters
        setMemoryInfluence(new Map());
    };

    // Layout configuration
    const getLayoutClasses = () => {
        switch (layoutMode) {
            case 'timeline-focus':
                return 'grid grid-cols-1 lg:grid-cols-3 gap-6 h-full';
            case 'chat-focus':
                return 'grid grid-cols-3 lg:grid-cols-4 gap-6 h-full';
            default:
                return 'grid grid-cols-1 lg:grid-cols-2 gap-6 h-full';
        }
    };

    const getChatPanelClasses = () => {
        switch (layoutMode) {
            case 'timeline-focus':
                return 'lg:col-span-1 order-2 lg:order-1';
            case 'chat-focus':
                return 'col-span-2 lg:col-span-3 order-1';
            default:
                return 'order-1';
        }
    };

    const getTimelinePanelClasses = () => {
        switch (layoutMode) {
            case 'timeline-focus':
                return 'lg:col-span-2 order-1 lg:order-2';
            case 'chat-focus':
                return 'col-span-1 order-2';
            default:
                return 'order-2';
        }
    };

    return (
        <div className="character-chat-interface h-screen bg-gray-50 dark:bg-gray-900">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                            Character Chat Interface
                        </h1>

                        {/* Character Switcher */}
                        {enableMultiCharacter && (
                            <CharacterSwitcher
                                characters={characters}
                                activeCharacterId={activeCharacterId}
                                onCharacterSelect={setActiveCharacterId}
                            />
                        )}
                    </div>

                    {/* Layout Controls */}
                    <div className="flex items-center space-x-3">
                        <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                            <button
                                onClick={() => setLayoutMode('chat-focus')}
                                className={`px-3 py-1 rounded ${layoutMode === 'chat-focus'
                                    ? 'bg-white dark:bg-gray-600 shadow'
                                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                Chat Focus
                            </button>
                            <button
                                onClick={() => setLayoutMode('dual-pane')}
                                className={`px-3 py-1 rounded ${layoutMode === 'dual-pane'
                                    ? 'bg-white dark:bg-gray-600 shadow'
                                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                Dual Pane
                            </button>
                            <button
                                onClick={() => setLayoutMode('timeline-focus')}
                                className={`px-3 py-1 rounded ${layoutMode === 'timeline-focus'
                                    ? 'bg-white dark:bg-gray-600 shadow'
                                    : 'hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                            >
                                Timeline Focus
                            </button>
                        </div>

                        {/* Feature Toggles */}
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={showContextVisualization}
                                onChange={(e) => setShowContextVisualization(e.target.checked)}
                                className="mr-2"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">
                                Context Visualization
                            </span>
                        </label>
                    </div>
                </div>

                {/* Character Personality Display */}
                {activeCharacterId && (
                    <CharacterPersonalityDisplay
                        character={{
                            id: activeCharacterId,
                            name: activeCharacterId.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                            universeId: universeId || 'unknown_universe',
                            description: 'Loading character information...',
                            personality: {
                                traits: [],
                                archetype: 'Unknown',
                                motivations: [],
                                fears: [],
                                quirks: []
                            },
                            avatar: undefined,
                            memoryStats: {
                                totalMemories: memories.length,
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
                            totalMessageCount: messages.length
                        }}
                        compact={!showAdvancedFeatures}
                        showBackground={showAdvancedFeatures}
                    />
                )}
            </div>

            {/* Main Interface */}
            <div className={`${getLayoutClasses()} p-6 overflow-hidden`}>
                {/* Chat Panel */}
                <div className={`${getChatPanelClasses()} flex flex-col space-y-4`}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg flex-1 flex flex-col">
                        {/* Chat Messages */}
                        <ChatMessagePanel
                            messages={messages}
                            isGeneratingResponse={isGeneratingResponse}
                            memoryInfluence={memoryInfluence}
                            onSendMessage={handleSendMessage}
                            showMemoryInfluence={showAdvancedFeatures}
                            contextGatheringState={contextGatheringState}
                        />
                    </div>

                    {/* Context Gathering Visualizer */}
                    {showContextVisualization && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4">
                            <ContextGatheringVisualizer
                                state={contextGatheringState}
                                memories={memories}
                                showAdvancedMetrics={showAdvancedFeatures}
                            />
                        </div>
                    )}
                </div>

                {/* Memory Timeline Panel */}
                <div className={`${getTimelinePanelClasses()} flex flex-col space-y-4`}>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg flex-1 flex flex-col">
                        <MemoryTimelineVisualization
                            memories={memories}
                            activeMemories={contextGatheringState.selectedMemories}
                            memoryInfluence={memoryInfluence}
                            relevanceScores={contextGatheringState.relevanceScores}
                            filter={timelineFilter}
                            onFilterChange={setTimelineFilter}
                            showAdvancedFeatures={showAdvancedFeatures}
                        />
                    </div>

                    {/* Memory Influence Tracker */}
                    {showAdvancedFeatures && memoryInfluence.size > 0 && (
                        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg">
                            <MemoryInfluenceTracker
                                memoryInfluence={memoryInfluence}
                                memories={memories}
                                currentMessage={messages && messages.length > 0 ? messages[messages.length - 1] : undefined}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Conversation History Manager */}
            {showAdvancedFeatures && (
                <ConversationHistoryManager
                    conversations={[]} // Empty array for now
                    activeConversationId={conversationId}
                    onConversationSelect={(id) => setConversationId(id)}
                    compact={true}
                />
            )}

            {/* Connection Status */}
            <div className="fixed bottom-4 right-4">
                <div className={`px-3 py-1 rounded-full text-sm font-medium ${isConnected
                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                    : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                    {isConnected ? 'Connected' : 'Connecting...'}
                </div>
            </div>
        </div>
    );
};

export default CharacterChatInterface;
