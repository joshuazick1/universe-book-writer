/**
 * Memory Details Panel - Expandable panel showing detailed memory information
 * 
 * Features:
 * - Full memory content and metadata display
 * - Memory editing and validation
 * - Related memories and connections
 * - Usage analytics and history
 * - Memory actions (edit, delete, link, etc.)
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    XMarkIcon,
    PencilIcon,
    TrashIcon,
    LinkIcon,
    StarIcon,
    ClockIcon,
    TagIcon,
    ExclamationTriangleIcon,
    CheckCircleIcon,
    BookOpenIcon,
    ChatBubbleLeftIcon,
    SparklesIcon,
    EyeIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { CharacterMemory, MemoryUsageMetrics, ValidationError } from '../../types/character-chat';
import { MemoryTypeIcon } from './MemoryTypeIcon';

interface MemoryDetailsPanelProps {
    memoryId: string;
    onClose: () => void;
    onAction?: (action: string, memory: CharacterMemory) => void;
    showAdvancedFeatures: boolean;
    isEditable?: boolean;
}

export const MemoryDetailsPanel: React.FC<MemoryDetailsPanelProps> = ({
    memoryId,
    onClose,
    onAction,
    showAdvancedFeatures,
    isEditable = true
}) => {
    // State
    const [memory, setMemory] = useState<CharacterMemory | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState('');
    const [editedImportance, setEditedImportance] = useState(0);
    const [editedTags, setEditedTags] = useState<string[]>([]);
    const [newTag, setNewTag] = useState('');
    const [relatedMemories, setRelatedMemories] = useState<CharacterMemory[]>([]);
    const [usageMetrics, setUsageMetrics] = useState<MemoryUsageMetrics | null>(null);
    const [validationErrors, setValidationErrors] = useState<ValidationError[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'details' | 'related' | 'usage' | 'history'>('details');

    // Load memory data
    useEffect(() => {
        loadMemoryData();
    }, [memoryId]);

    const loadMemoryData = async () => {
        setIsLoading(true);
        try {
            // Load main memory data
            const memoryResponse = await fetch(`/api/memories/${memoryId}`);
            const memoryData = await memoryResponse.json();
            setMemory(memoryData);
            setEditedContent(memoryData.content);
            setEditedImportance(memoryData.importance);
            setEditedTags([...memoryData.tags]);

            // Load related memories if advanced features enabled
            if (showAdvancedFeatures) {
                const relatedResponse = await fetch(`/api/memories/${memoryId}/related`);
                const relatedData = await relatedResponse.json();
                setRelatedMemories(relatedData);

                // Load usage metrics
                const metricsResponse = await fetch(`/api/memories/${memoryId}/metrics`);
                const metricsData = await metricsResponse.json();
                setUsageMetrics(metricsData);
            }
        } catch (error) {
            console.error('Failed to load memory data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle memory save
    const handleSave = async () => {
        if (!memory) return;

        // Validate changes
        const errors = validateMemoryChanges();
        if (errors.length > 0) {
            setValidationErrors(errors);
            return;
        }

        try {
            const updatedMemory = {
                ...memory,
                content: editedContent,
                importance: editedImportance,
                tags: editedTags,
                updatedAt: new Date()
            };

            const response = await fetch(`/api/memories/${memoryId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(updatedMemory)
            });

            if (response.ok) {
                const savedMemory = await response.json();
                setMemory(savedMemory);
                setIsEditing(false);
                setValidationErrors([]);
                onAction?.('updated', savedMemory);
            } else {
                throw new Error('Failed to save memory');
            }
        } catch (error) {
            console.error('Failed to save memory:', error);
            setValidationErrors([{
                field: 'general',
                message: 'Failed to save changes. Please try again.',
                severity: 'error'
            }]);
        }
    };

    // Validate memory changes
    const validateMemoryChanges = (): ValidationError[] => {
        const errors: ValidationError[] = [];

        if (!editedContent.trim()) {
            errors.push({
                field: 'content',
                message: 'Memory content cannot be empty',
                severity: 'error'
            });
        }

        if (editedContent.length > 2000) {
            errors.push({
                field: 'content',
                message: 'Memory content is too long (max 2000 characters)',
                severity: 'error'
            });
        }

        if (editedImportance < 0 || editedImportance > 1) {
            errors.push({
                field: 'importance',
                message: 'Importance must be between 0 and 1',
                severity: 'error'
            });
        }

        return errors;
    };

    // Handle adding a tag
    const handleAddTag = () => {
        if (newTag.trim() && !editedTags.includes(newTag.trim())) {
            setEditedTags([...editedTags, newTag.trim()]);
            setNewTag('');
        }
    };

    // Handle removing a tag
    const handleRemoveTag = (tagToRemove: string) => {
        setEditedTags(editedTags.filter(tag => tag !== tagToRemove));
    };

    // Handle memory actions
    const handleAction = (action: string) => {
        if (!memory) return;
        onAction?.(action, memory);
    };

    // Format timestamp
    const formatTimestamp = (date: Date): string => {
        return date.toLocaleString();
    };

    // Get importance color
    const getImportanceColor = (importance: number): string => {
        if (importance >= 0.8) return 'text-red-600 bg-red-100 dark:bg-red-900/30';
        if (importance >= 0.6) return 'text-orange-600 bg-orange-100 dark:bg-orange-900/30';
        if (importance >= 0.4) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
        if (importance >= 0.2) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
        return 'text-gray-600 bg-gray-100 dark:bg-gray-800';
    };

    // Get source icon
    const getSourceIcon = (source: string) => {
        switch (source) {
            case 'book_extraction':
                return <BookOpenIcon className="w-4 h-4" />;
            case 'user_interaction':
                return <ChatBubbleLeftIcon className="w-4 h-4" />;
            case 'ai_gap_filling':
                return <SparklesIcon className="w-4 h-4" />;
            default:
                return <BookOpenIcon className="w-4 h-4" />;
        }
    };

    if (isLoading) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md">
                    <div className="flex items-center space-x-3">
                        <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span className="text-gray-900 dark:text-white">Loading memory details...</span>
                    </div>
                </div>
            </div>
        );
    }

    if (!memory) {
        return (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md">
                    <div className="text-center">
                        <ExclamationTriangleIcon className="w-12 h-12 mx-auto mb-4 text-red-500" />
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                            Memory Not Found
                        </h3>
                        <p className="text-gray-600 dark:text-gray-400 mb-4">
                            The requested memory could not be loaded.
                        </p>
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                        >
                            Close
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center space-x-3">
                        <MemoryTypeIcon type={memory.memoryType} className="w-6 h-6" />
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                            Memory Details
                        </h2>
                        <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                            {memory.memoryType.replace('_', ' ')}
                        </span>
                    </div>

                    <div className="flex items-center space-x-2">
                        {isEditable && (
                            <>
                                {isEditing ? (
                                    <>
                                        <button
                                            onClick={() => setIsEditing(false)}
                                            className="px-3 py-1 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={handleSave}
                                            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                                        >
                                            Save
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        onClick={() => setIsEditing(true)}
                                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                                        title="Edit memory"
                                    >
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                )}
                            </>
                        )}

                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Validation Errors */}
                {validationErrors.length > 0 && (
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
                        {validationErrors.map((error, index) => (
                            <div key={index} className="flex items-center space-x-2 text-red-700 dark:text-red-300">
                                <ExclamationTriangleIcon className="w-4 h-4" />
                                <span className="text-sm">{error.message}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Tabs */}
                <div className="flex border-b border-gray-200 dark:border-gray-700">
                    {(['details', 'related', 'usage', 'history'] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`px-6 py-3 text-sm font-medium capitalize ${activeTab === tab
                                    ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
                                }`}
                        >
                            {tab}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {activeTab === 'details' && (
                        <div className="space-y-6">
                            {/* Memory Content */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Content
                                </label>
                                {isEditing ? (
                                    <textarea
                                        value={editedContent}
                                        onChange={(e) => setEditedContent(e.target.value)}
                                        rows={6}
                                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                        placeholder="Memory content..."
                                    />
                                ) : (
                                    <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-lg text-gray-900 dark:text-white whitespace-pre-wrap">
                                        {memory.content}
                                    </div>
                                )}
                            </div>

                            {/* Memory Metadata */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Importance */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Importance
                                    </label>
                                    {isEditing ? (
                                        <input
                                            type="range"
                                            min="0"
                                            max="1"
                                            step="0.1"
                                            value={editedImportance}
                                            onChange={(e) => setEditedImportance(parseFloat(e.target.value))}
                                            className="w-full"
                                        />
                                    ) : (
                                        <div className="flex items-center space-x-2">
                                            <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                                <div
                                                    className="h-2 rounded-full bg-gradient-to-r from-red-400 via-yellow-400 to-green-400"
                                                    style={{ width: `${memory.importance * 100}%` }}
                                                />
                                            </div>
                                            <span className={`text-sm px-2 py-1 rounded ${getImportanceColor(memory.importance)}`}>
                                                {(memory.importance * 100).toFixed(0)}%
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Source */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Source
                                    </label>
                                    <div className="flex items-center space-x-2">
                                        {getSourceIcon(memory.memorySource)}
                                        <span className="text-sm text-gray-600 dark:text-gray-400 capitalize">
                                            {memory.memorySource.replace('_', ' ')}
                                        </span>
                                    </div>
                                </div>

                                {/* Canon Status */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Canon Status
                                    </label>
                                    <span className={`inline-flex items-center px-2 py-1 rounded text-sm ${memory.canonStatus === 'canon'
                                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                            : memory.canonStatus === 'non_canon'
                                                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                                : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                                        }`}>
                                        {memory.canonStatus === 'canon' && <CheckCircleIcon className="w-4 h-4 mr-1" />}
                                        {memory.canonStatus === 'disputed' && <ExclamationTriangleIcon className="w-4 h-4 mr-1" />}
                                        {memory.canonStatus.replace('_', ' ')}
                                    </span>
                                </div>

                                {/* Access Count */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Usage
                                    </label>
                                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                                        <EyeIcon className="w-4 h-4" />
                                        <span>Accessed {memory.accessCount} times</span>
                                    </div>
                                </div>
                            </div>

                            {/* Tags */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Tags
                                </label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {editedTags.map((tag, index) => (
                                        <span
                                            key={index}
                                            className="inline-flex items-center px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-sm"
                                        >
                                            <TagIcon className="w-3 h-3 mr-1" />
                                            {tag}
                                            {isEditing && (
                                                <button
                                                    onClick={() => handleRemoveTag(tag)}
                                                    className="ml-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                                                >
                                                    <XMarkIcon className="w-3 h-3" />
                                                </button>
                                            )}
                                        </span>
                                    ))}
                                </div>
                                {isEditing && (
                                    <div className="flex space-x-2">
                                        <input
                                            type="text"
                                            value={newTag}
                                            onChange={(e) => setNewTag(e.target.value)}
                                            onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                                            placeholder="Add tag..."
                                            className="flex-1 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-sm"
                                        />
                                        <button
                                            onClick={handleAddTag}
                                            className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                                        >
                                            Add
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Timestamps */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                                <div className="flex items-center space-x-2">
                                    <ClockIcon className="w-4 h-4" />
                                    <span>Created: {formatTimestamp(memory.createdAt)}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <ArrowPathIcon className="w-4 h-4" />
                                    <span>Updated: {formatTimestamp(memory.updatedAt)}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <EyeIcon className="w-4 h-4" />
                                    <span>Last accessed: {formatTimestamp(memory.lastAccessed)}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'related' && showAdvancedFeatures && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                Related Memories
                            </h3>
                            {relatedMemories.length > 0 ? (
                                <div className="space-y-3">
                                    {relatedMemories.map((relatedMemory) => (
                                        <div
                                            key={relatedMemory.id}
                                            className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer"
                                        >
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex items-center space-x-2">
                                                    <MemoryTypeIcon type={relatedMemory.memoryType} className="w-4 h-4" />
                                                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                                        {relatedMemory.memoryType.replace('_', ' ')}
                                                    </span>
                                                </div>
                                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                                    {(relatedMemory.importance * 100).toFixed(0)}% importance
                                                </span>
                                            </div>
                                            <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                                                {relatedMemory.content}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                    <LinkIcon className="w-8 h-8 mx-auto mb-2" />
                                    <p>No related memories found</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'usage' && showAdvancedFeatures && usageMetrics && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                Usage Analytics
                            </h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                        {usageMetrics.accessCount}
                                    </div>
                                    <div className="text-sm text-blue-600 dark:text-blue-400">
                                        Total accesses
                                    </div>
                                </div>
                                <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                                        {(usageMetrics.avgRelevanceScore * 100).toFixed(1)}%
                                    </div>
                                    <div className="text-sm text-green-600 dark:text-green-400">
                                        Avg relevance
                                    </div>
                                </div>
                                <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-lg">
                                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                                        {usageMetrics.contextAppearances}
                                    </div>
                                    <div className="text-sm text-purple-600 dark:text-purple-400">
                                        Context uses
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'history' && showAdvancedFeatures && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                Memory History
                            </h3>
                            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                                <ClockIcon className="w-8 h-8 mx-auto mb-2" />
                                <p>Memory history feature coming soon</p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Actions */}
                {!isEditing && (
                    <div className="border-t border-gray-200 dark:border-gray-700 p-6">
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => handleAction('duplicate')}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Duplicate
                            </button>
                            <button
                                onClick={() => handleAction('export')}
                                className="px-4 py-2 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
                            >
                                Export
                            </button>
                            {isEditable && (
                                <button
                                    onClick={() => handleAction('delete')}
                                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
                                >
                                    Delete
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MemoryDetailsPanel;
