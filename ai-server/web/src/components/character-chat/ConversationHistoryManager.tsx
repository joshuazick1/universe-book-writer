/**
 * Conversation History Manager - Manages conversation history and sessions
 * 
 * Features:
 * - List of previous conversations
 * - Conversation search and filtering
 * - Conversation metadata (date, message count, etc.)
 * - Conversation actions (continue, archive, delete)
 */

import React, { useState } from 'react';
import {
    ClockIcon,
    ChatBubbleLeftIcon,
    MagnifyingGlassIcon,
    EllipsisVerticalIcon,
    ArchiveBoxIcon,
    TrashIcon,
    PlayIcon
} from '@heroicons/react/24/outline';
import { ConversationState } from '../../types/character-chat';

interface ConversationHistoryManagerProps {
    conversations: ConversationState[];
    activeConversationId?: string;
    onConversationSelect: (conversationId: string) => void;
    onConversationArchive?: (conversationId: string) => void;
    onConversationDelete?: (conversationId: string) => void;
    onNewConversation?: () => void;
    compact?: boolean;
}

export const ConversationHistoryManager: React.FC<ConversationHistoryManagerProps> = ({
    conversations = [],
    activeConversationId,
    onConversationSelect,
    onConversationArchive,
    onConversationDelete,
    onNewConversation,
    compact = false
}) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'active' | 'archived'>('all');
    const [showMenu, setShowMenu] = useState<string | null>(null);

    const filteredConversations = conversations.filter(conversation => {
        const matchesSearch = conversation.title.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesFilter = filter === 'all' || conversation.status === filter;
        return matchesSearch && matchesFilter;
    });

    const formatDate = (date: Date) => {
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (days === 0) return 'Today';
        if (days === 1) return 'Yesterday';
        if (days < 7) return `${days} days ago`;
        return date.toLocaleDateString();
    };

    if (compact) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        Recent Conversations
                    </h3>
                    {onNewConversation && (
                        <button
                            onClick={onNewConversation}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 text-xs font-medium"
                        >
                            New
                        </button>
                    )}
                </div>

                <div className="space-y-2 max-h-40 overflow-y-auto">
                    {filteredConversations.slice(0, 5).map((conversation) => (
                        <button
                            key={conversation.id}
                            onClick={() => onConversationSelect(conversation.id)}
                            className={`w-full flex items-center space-x-2 p-2 text-left rounded-md transition-colors ${conversation.id === activeConversationId
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                        >
                            <ChatBubbleLeftIcon className="w-4 h-4 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium truncate">
                                    {conversation.title}
                                </div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {conversation.messageCount} messages • {formatDate(conversation.lastActivity)}
                                </div>
                            </div>
                        </button>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        Conversation History
                    </h3>
                    {onNewConversation && (
                        <button
                            onClick={onNewConversation}
                            className="px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm"
                        >
                            New Conversation
                        </button>
                    )}
                </div>

                {/* Search and Filter */}
                <div className="space-y-3">
                    <div className="relative">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search conversations..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                        />
                    </div>

                    <div className="flex space-x-1">
                        {(['all', 'active', 'archived'] as const).map((filterOption) => (
                            <button
                                key={filterOption}
                                onClick={() => setFilter(filterOption)}
                                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${filter === filterOption
                                        ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Conversation List */}
            <div className="max-h-96 overflow-y-auto">
                {filteredConversations.length === 0 ? (
                    <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                        <ChatBubbleLeftIcon className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No conversations found</p>
                        {searchTerm && (
                            <p className="text-xs mt-1">Try a different search term</p>
                        )}
                    </div>
                ) : (
                    <div className="divide-y divide-gray-200 dark:divide-gray-700">
                        {filteredConversations.map((conversation) => (
                            <div
                                key={conversation.id}
                                className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${conversation.id === activeConversationId
                                        ? 'bg-indigo-50 dark:bg-indigo-900/20'
                                        : ''
                                    }`}
                            >
                                <div className="flex items-start justify-between">
                                    <button
                                        onClick={() => onConversationSelect(conversation.id)}
                                        className="flex-1 text-left"
                                    >
                                        <div className="flex items-center space-x-2 mb-1">
                                            <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                                                {conversation.title}
                                            </h4>
                                            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${conversation.status === 'active'
                                                    ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                                                    : conversation.status === 'paused'
                                                        ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                                                        : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                                }`}>
                                                {conversation.status}
                                            </span>
                                        </div>

                                        <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-gray-400">
                                            <div className="flex items-center space-x-1">
                                                <ChatBubbleLeftIcon className="w-3 h-3" />
                                                <span>{conversation.messageCount} messages</span>
                                            </div>
                                            <div className="flex items-center space-x-1">
                                                <ClockIcon className="w-3 h-3" />
                                                <span>{formatDate(conversation.lastActivity)}</span>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Actions Menu */}
                                    <div className="relative">
                                        <button
                                            onClick={() => setShowMenu(showMenu === conversation.id ? null : conversation.id)}
                                            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                                        >
                                            <EllipsisVerticalIcon className="w-4 h-4" />
                                        </button>

                                        {showMenu === conversation.id && (
                                            <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-10 min-w-32">
                                                <button
                                                    onClick={() => {
                                                        onConversationSelect(conversation.id);
                                                        setShowMenu(null);
                                                    }}
                                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                                >
                                                    <PlayIcon className="w-4 h-4" />
                                                    <span>Continue</span>
                                                </button>

                                                {onConversationArchive && conversation.status !== 'archived' && (
                                                    <button
                                                        onClick={() => {
                                                            onConversationArchive(conversation.id);
                                                            setShowMenu(null);
                                                        }}
                                                        className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                                    >
                                                        <ArchiveBoxIcon className="w-4 h-4" />
                                                        <span>Archive</span>
                                                    </button>
                                                )}

                                                {onConversationDelete && (
                                                    <button
                                                        onClick={() => {
                                                            onConversationDelete(conversation.id);
                                                            setShowMenu(null);
                                                        }}
                                                        className="w-full px-3 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center space-x-2"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                        <span>Delete</span>
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Click outside to close menu */}
            {showMenu && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setShowMenu(null)}
                />
            )}
        </div>
    );
};

export default ConversationHistoryManager;
