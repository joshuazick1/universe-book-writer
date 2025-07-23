/**
 * Message Actions - Action buttons for chat messages
 * 
 * Features:
 * - Edit, regenerate, speak, and other message actions
 * - Conditional action availability based on message type
 * - Hover states and tooltips
 * - Keyboard shortcuts
 */

import React, { useState } from 'react';
import {
    PencilIcon,
    ArrowPathIcon,
    SpeakerWaveIcon,
    SpeakerXMarkIcon,
    ShareIcon,
    ClipboardIcon,
    EllipsisVerticalIcon,
    HandThumbUpIcon,
    HandThumbDownIcon
} from '@heroicons/react/24/outline';
import { ChatMessage } from '../../types/character-chat';

interface MessageActionsProps {
    message: ChatMessage;
    onEdit?: () => void;
    onRegenerate?: () => void;
    onSpeak?: () => void;
    onCopy?: () => void;
    onShare?: () => void;
    onReact?: (reaction: 'like' | 'dislike') => void;
    isSpeaking?: boolean;
    canEdit?: boolean;
    canRegenerate?: boolean;
    showReactions?: boolean;
    compact?: boolean;
}

export const MessageActions: React.FC<MessageActionsProps> = ({
    message,
    onEdit,
    onRegenerate,
    onSpeak,
    onCopy,
    onShare,
    onReact,
    isSpeaking = false,
    canEdit = false,
    canRegenerate = false,
    showReactions = true,
    compact = false
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const [copied, setCopied] = useState(false);

    // Handle copy to clipboard
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(message.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            onCopy?.();
        } catch (error) {
            console.error('Failed to copy message:', error);
        }
    };

    // Handle keyboard shortcuts
    React.useEffect(() => {
        const handleKeyPress = (event: KeyboardEvent) => {
            if (event.ctrlKey || event.metaKey) {
                switch (event.key) {
                    case 'c':
                        if (showMenu) {
                            event.preventDefault();
                            handleCopy();
                        }
                        break;
                    case 'e':
                        if (showMenu && canEdit) {
                            event.preventDefault();
                            onEdit?.();
                        }
                        break;
                    case 'r':
                        if (showMenu && canRegenerate) {
                            event.preventDefault();
                            onRegenerate?.();
                        }
                        break;
                }
            }
        };

        if (showMenu) {
            document.addEventListener('keydown', handleKeyPress);
            return () => document.removeEventListener('keydown', handleKeyPress);
        }
    }, [showMenu, canEdit, canRegenerate, onEdit, onRegenerate]);

    if (compact) {
        return (
            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                {onSpeak && (
                    <button
                        onClick={onSpeak}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                        title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                    >
                        {isSpeaking ? (
                            <SpeakerXMarkIcon className="w-4 h-4" />
                        ) : (
                            <SpeakerWaveIcon className="w-4 h-4" />
                        )}
                    </button>
                )}

                <button
                    onClick={handleCopy}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                    title={copied ? 'Copied!' : 'Copy message'}
                >
                    <ClipboardIcon className="w-4 h-4" />
                </button>

                <div className="relative">
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded"
                        title="More actions"
                    >
                        <EllipsisVerticalIcon className="w-4 h-4" />
                    </button>

                    {showMenu && (
                        <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg py-1 z-10 min-w-32">
                            {canEdit && (
                                <button
                                    onClick={() => {
                                        onEdit?.();
                                        setShowMenu(false);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                >
                                    <PencilIcon className="w-4 h-4" />
                                    <span>Edit</span>
                                </button>
                            )}

                            {canRegenerate && (
                                <button
                                    onClick={() => {
                                        onRegenerate?.();
                                        setShowMenu(false);
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                                >
                                    <ArrowPathIcon className="w-4 h-4" />
                                    <span>Regenerate</span>
                                </button>
                            )}

                            <button
                                onClick={() => {
                                    onShare?.();
                                    setShowMenu(false);
                                }}
                                className="w-full px-3 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center space-x-2"
                            >
                                <ShareIcon className="w-4 h-4" />
                                <span>Share</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    return (
        <div className="message-actions flex items-center space-x-2">
            {/* Primary Actions */}
            <div className="flex items-center space-x-1">
                {canEdit && (
                    <button
                        onClick={onEdit}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Edit message (Ctrl+E)"
                    >
                        <PencilIcon className="w-4 h-4" />
                    </button>
                )}

                {canRegenerate && (
                    <button
                        onClick={onRegenerate}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Regenerate response (Ctrl+R)"
                    >
                        <ArrowPathIcon className="w-4 h-4" />
                    </button>
                )}

                {onSpeak && (
                    <button
                        onClick={onSpeak}
                        className={`p-2 rounded-lg transition-colors ${isSpeaking
                                ? 'text-blue-600 bg-blue-100 dark:bg-blue-900/30'
                                : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                        title={isSpeaking ? 'Stop speaking' : 'Read aloud'}
                    >
                        {isSpeaking ? (
                            <SpeakerXMarkIcon className="w-4 h-4" />
                        ) : (
                            <SpeakerWaveIcon className="w-4 h-4" />
                        )}
                    </button>
                )}

                <button
                    onClick={handleCopy}
                    className={`p-2 rounded-lg transition-colors ${copied
                            ? 'text-green-600 bg-green-100 dark:bg-green-900/30'
                            : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                    title={copied ? 'Copied!' : 'Copy message (Ctrl+C)'}
                >
                    <ClipboardIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Reactions */}
            {showReactions && onReact && (
                <div className="flex items-center space-x-1 border-l border-gray-200 dark:border-gray-700 pl-2">
                    <button
                        onClick={() => onReact('like')}
                        className="p-2 text-gray-400 hover:text-green-600 dark:hover:text-green-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Like message"
                    >
                        <HandThumbUpIcon className="w-4 h-4" />
                    </button>

                    <button
                        onClick={() => onReact('dislike')}
                        className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                        title="Dislike message"
                    >
                        <HandThumbDownIcon className="w-4 h-4" />
                    </button>
                </div>
            )}

            {/* Secondary Actions */}
            <div className="flex items-center space-x-1 border-l border-gray-200 dark:border-gray-700 pl-2">
                <button
                    onClick={onShare}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                    title="Share message"
                >
                    <ShareIcon className="w-4 h-4" />
                </button>
            </div>

            {/* Click outside to close menu */}
            {showMenu && (
                <div
                    className="fixed inset-0 z-0"
                    onClick={() => setShowMenu(false)}
                />
            )}
        </div>
    );
};

export default MessageActions;
