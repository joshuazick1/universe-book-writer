/**
 * Chat Message Panel - Main chat interface with message display and input
 * 
 * Features:
 * - Real-time message display with typing indicators
 * - Memory influence visualization for each message
 * - Rich message formatting and reactions
 * - Voice input and text-to-speech support
 * - Message editing and regeneration
 * - Export and sharing capabilities
 */

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import {
    PaperAirplaneIcon,
    MicrophoneIcon,
    SpeakerWaveIcon,
    ArrowPathIcon,
    PencilIcon,
    ShareIcon,
    ChevronDownIcon,
    ChevronUpIcon,
    SparklesIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import {
    ChatMessage,
    ContextGatheringState,
    MessageReaction,
    VoiceInputState
} from '../../types/character-chat';
import { MessageMemoryInfluence } from './MessageMemoryInfluence';
import { TypingIndicator } from './TypingIndicator';
import { MessageActions } from './MessageActions';

interface ChatMessagePanelProps {
    messages: ChatMessage[];
    isGeneratingResponse: boolean;
    memoryInfluence: Map<string, number>;
    onSendMessage: (content: string) => void;
    showMemoryInfluence: boolean;
    contextGatheringState: ContextGatheringState;
    enableVoiceInput?: boolean;
    enableTextToSpeech?: boolean;
    maxMessageLength?: number;
    placeholder?: string;
}

export interface ChatMessagePanelRef {
    scrollToBottom: () => void;
    scrollToMessage: (messageId: string) => void;
    focusInput: () => void;
    clearInput: () => void;
}

export const ChatMessagePanel = forwardRef<ChatMessagePanelRef, ChatMessagePanelProps>(({
    messages,
    isGeneratingResponse,
    memoryInfluence,
    onSendMessage,
    showMemoryInfluence,
    contextGatheringState,
    enableVoiceInput = false,
    enableTextToSpeech = false,
    maxMessageLength = 2000,
    placeholder = "Type your message to the character..."
}, ref) => {
    // State
    const [inputValue, setInputValue] = useState('');
    const [isExpanded, setIsExpanded] = useState(false);
    const [voiceInputState, setVoiceInputState] = useState<VoiceInputState>('idle');
    const [showReactions, setShowReactions] = useState<string | null>(null);
    const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState('');
    const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);

    // Refs
    const messagesContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const voiceRecognitionRef = useRef<any>(null);
    const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);

    // Expose methods through ref
    useImperativeHandle(ref, () => ({
        scrollToBottom: () => {
            if (messagesContainerRef.current) {
                messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
            }
        },
        scrollToMessage: (messageId: string) => {
            const element = document.getElementById(`message-${messageId}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        },
        focusInput: () => {
            inputRef.current?.focus();
        },
        clearInput: () => {
            setInputValue('');
        }
    }));

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (messagesContainerRef.current) {
            const container = messagesContainerRef.current;
            const isScrolledToBottom = container.scrollHeight - container.clientHeight <= container.scrollTop + 1;

            if (isScrolledToBottom) {
                setTimeout(() => {
                    container.scrollTop = container.scrollHeight;
                }, 100);
            }
        }
    }, [messages]);

    // Initialize voice recognition
    useEffect(() => {
        if (enableVoiceInput && typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
            const SpeechRecognition = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = false;
            recognition.lang = 'en-US';

            recognition.onstart = () => setVoiceInputState('listening');
            recognition.onend = () => setVoiceInputState('idle');
            recognition.onerror = () => setVoiceInputState('error');

            recognition.onresult = (event: any) => {
                const transcript = event.results[0]?.item(0)?.transcript;
                if (transcript) {
                    setInputValue(prev => prev + (prev ? ' ' : '') + transcript);
                    setVoiceInputState('idle');
                }
            };

            voiceRecognitionRef.current = recognition;
        }

        return () => {
            if (voiceRecognitionRef.current) {
                voiceRecognitionRef.current.abort();
            }
        };
    }, [enableVoiceInput]);

    // Handle message submission
    const handleSubmit = useCallback((e?: React.FormEvent) => {
        e?.preventDefault();

        const trimmedValue = inputValue.trim();
        if (!trimmedValue || isGeneratingResponse) return;

        onSendMessage(trimmedValue);
        setInputValue('');
        setIsExpanded(false);

        // Focus back on input
        setTimeout(() => inputRef.current?.focus(), 100);
    }, [inputValue, isGeneratingResponse, onSendMessage]);

    // Handle key press
    const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        } else if (e.key === 'Enter' && e.shiftKey) {
            setIsExpanded(true);
        }
    }, [handleSubmit]);

    // Handle voice input
    const handleVoiceInput = useCallback(() => {
        if (!voiceRecognitionRef.current) return;

        if (voiceInputState === 'listening') {
            voiceRecognitionRef.current.stop();
        } else {
            voiceRecognitionRef.current.start();
        }
    }, [voiceInputState]);

    // Handle text-to-speech
    const handleTextToSpeech = useCallback((messageId: string, content: string) => {
        if (!enableTextToSpeech) return;

        if (speakingMessageId === messageId) {
            // Stop current speech
            speechSynthesis.cancel();
            setSpeakingMessageId(null);
            return;
        }

        // Start new speech
        speechSynthesis.cancel(); // Stop any existing speech

        const utterance = new SpeechSynthesisUtterance(content);
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
        utterance.volume = 0.8;

        utterance.onstart = () => setSpeakingMessageId(messageId);
        utterance.onend = () => setSpeakingMessageId(null);
        utterance.onerror = () => setSpeakingMessageId(null);

        speechSynthesisRef.current = utterance;
        speechSynthesis.speak(utterance);
    }, [enableTextToSpeech, speakingMessageId]);

    // Handle message editing
    const handleEditMessage = useCallback((messageId: string, content: string) => {
        setEditingMessageId(messageId);
        setEditValue(content);
    }, []);

    const handleSaveEdit = useCallback((messageId: string) => {
        // TODO: Implement message editing API call
        console.log('Saving edit for message:', messageId, editValue);
        setEditingMessageId(null);
        setEditValue('');
    }, [editValue]);

    const handleCancelEdit = useCallback(() => {
        setEditingMessageId(null);
        setEditValue('');
    }, []);

    // Handle message regeneration
    const handleRegenerateMessage = useCallback((messageId: string) => {
        // TODO: Implement message regeneration API call
        console.log('Regenerating message:', messageId);
    }, []);

    // Format message timestamp
    const formatTimestamp = (timestamp: Date): string => {
        return timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // Get message styling
    const getMessageStyling = (message: ChatMessage) => {
        const baseClasses = "max-w-3xl mb-4 p-4 rounded-lg";

        if (message.role === 'user') {
            return `${baseClasses} bg-blue-100 dark:bg-blue-900/30 ml-auto text-right`;
        } else {
            return `${baseClasses} bg-gray-100 dark:bg-gray-800 mr-auto`;
        }
    };

    return (
        <div className="chat-message-panel h-full flex flex-col">
            {/* Messages Container */}
            <div
                ref={messagesContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth"
            >
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                        <div className="text-center">
                            <SparklesIcon className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                            <p className="text-lg font-medium mb-2">Start a conversation</p>
                            <p className="text-sm">Ask the character anything to begin chatting</p>
                        </div>
                    </div>
                ) : (
                    messages.map((message) => (
                        <div
                            key={message.id}
                            id={`message-${message.id}`}
                            className={getMessageStyling(message)}
                        >
                            {/* Message Header */}
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                                        {message.role === 'user' ? 'You' : 'Character'}
                                    </span>
                                    {message.isStreaming && (
                                        <div className="flex items-center space-x-1">
                                            <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                                            <span className="text-xs text-blue-600 dark:text-blue-400">
                                                Generating...
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div className="flex items-center space-x-2">
                                    <span className="text-xs text-gray-500 dark:text-gray-500">
                                        {formatTimestamp(message.timestamp)}
                                    </span>

                                    {/* Message Actions */}
                                    <MessageActions
                                        message={message}
                                        onEdit={() => handleEditMessage(message.id, message.content)}
                                        onRegenerate={() => handleRegenerateMessage(message.id)}
                                        onSpeak={enableTextToSpeech ? () => handleTextToSpeech(message.id, message.content) : undefined}
                                        isSpeaking={speakingMessageId === message.id}
                                        canEdit={message.role === 'user'}
                                        canRegenerate={message.role === 'assistant'}
                                    />
                                </div>
                            </div>

                            {/* Message Content */}
                            {editingMessageId === message.id ? (
                                <div className="space-y-2">
                                    <textarea
                                        value={editValue}
                                        onChange={(e) => setEditValue(e.target.value)}
                                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none"
                                        rows={3}
                                    />
                                    <div className="flex justify-end space-x-2">
                                        <button
                                            onClick={handleCancelEdit}
                                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => handleSaveEdit(message.id)}
                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                        >
                                            Save
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                                    {message.content}
                                </div>
                            )}

                            {/* Memory Influence Visualization */}
                            {showMemoryInfluence && message.role === 'assistant' && message.memoryInfluence.size > 0 && (
                                <MessageMemoryInfluence
                                    memoryInfluence={message.memoryInfluence}
                                    contextUsed={message.contextUsed || []}
                                    className="mt-3"
                                />
                            )}

                            {/* Context Gathering Indicator */}
                            {message.role === 'assistant' && contextGatheringState.isGathering &&
                                messages[messages.length - 1]?.id === message.id && (
                                    <div className="mt-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border-l-4 border-blue-400">
                                        <div className="flex items-center space-x-2 text-sm text-blue-700 dark:text-blue-300">
                                            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                            <span>Gathering context from {contextGatheringState.searchResults.length} memories...</span>
                                        </div>
                                    </div>
                                )}
                        </div>
                    ))
                )}

                {/* Typing Indicator */}
                {isGeneratingResponse && (
                    <div className="max-w-3xl p-4 rounded-lg bg-gray-100 dark:bg-gray-800 mr-auto">
                        <TypingIndicator
                            characterName="Character"
                            showContextGathering={contextGatheringState.isGathering}
                            selectedMemories={contextGatheringState.selectedMemories.length}
                        />
                    </div>
                )}
            </div>

            {/* Input Container */}
            <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-700 p-4">
                <form onSubmit={handleSubmit} className="space-y-3">
                    {/* Input Area */}
                    <div className="relative">
                        <textarea
                            ref={inputRef}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={handleKeyPress}
                            placeholder={placeholder}
                            rows={isExpanded ? 4 : 1}
                            maxLength={maxMessageLength}
                            disabled={isGeneratingResponse}
                            className="w-full p-3 pr-24 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        />

                        {/* Input Controls */}
                        <div className="absolute right-2 top-2 flex items-center space-x-1">
                            {/* Voice Input */}
                            {enableVoiceInput && (
                                <button
                                    type="button"
                                    onClick={handleVoiceInput}
                                    disabled={isGeneratingResponse}
                                    className={`p-2 rounded-lg transition-colors ${voiceInputState === 'listening'
                                        ? 'bg-red-100 text-red-600 dark:bg-red-900/30'
                                        : voiceInputState === 'error'
                                            ? 'bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30'
                                            : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400'
                                        } disabled:opacity-50`}
                                >
                                    <MicrophoneIcon className="w-4 h-4" />
                                </button>
                            )}

                            {/* Expand/Collapse */}
                            <button
                                type="button"
                                onClick={() => setIsExpanded(!isExpanded)}
                                className="p-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-600 dark:text-gray-400 rounded-lg transition-colors"
                            >
                                {isExpanded ? (
                                    <ChevronDownIcon className="w-4 h-4" />
                                ) : (
                                    <ChevronUpIcon className="w-4 h-4" />
                                )}
                            </button>

                            {/* Send Button */}
                            <button
                                type="submit"
                                disabled={!inputValue.trim() || isGeneratingResponse}
                                className="p-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                            >
                                <PaperAirplaneIcon className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Input Footer */}
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <div className="flex items-center space-x-4">
                            {voiceInputState === 'listening' && (
                                <span className="text-red-600 dark:text-red-400 animate-pulse">
                                    🎤 Listening...
                                </span>
                            )}
                            {voiceInputState === 'error' && (
                                <span className="text-yellow-600 dark:text-yellow-400">
                                    ⚠️ Voice input error
                                </span>
                            )}
                            <span>
                                Press Shift+Enter for new line
                            </span>
                        </div>

                        <span className={inputValue.length > maxMessageLength * 0.9 ? 'text-red-500' : ''}>
                            {inputValue.length} / {maxMessageLength}
                        </span>
                    </div>
                </form>
            </div>
        </div>
    );
});

export default ChatMessagePanel;
