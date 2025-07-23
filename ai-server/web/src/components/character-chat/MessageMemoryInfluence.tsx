/**
 * Message Memory Influence - Shows which memories influenced a chat response
 * 
 * Features:
 * - Visual representation of memory influence on responses
 * - Clickable memory references with hover details
 * - Influence strength indicators
 * - Memory type color coding
 * - Expandable detailed view
 */

import React, { useState } from 'react';
import { 
    ChevronDownIcon, 
    ChevronUpIcon,
    InformationCircleIcon 
} from '@heroicons/react/24/outline';
import { MemoryTypeIcon } from './MemoryTypeIcon';

interface MessageMemoryInfluenceProps {
    memoryInfluence: Map<string, number>;
    contextUsed: string[];
    className?: string;
    maxVisible?: number;
    onMemoryClick?: (memoryId: string) => void;
}

export const MessageMemoryInfluence: React.FC<MessageMemoryInfluenceProps> = ({
    memoryInfluence,
    contextUsed,
    className = '',
    maxVisible = 3,
    onMemoryClick
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [memories, setMemories] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);

    // Get sorted memory influences
    const sortedInfluences = Array.from(memoryInfluence.entries())
        .sort(([, a], [, b]) => b - a)
        .slice(0, isExpanded ? undefined : maxVisible);

    // Load memory details when component mounts
    React.useEffect(() => {
        loadMemoryDetails();
    }, [memoryInfluence]);

    const loadMemoryDetails = async () => {
        if (memoryInfluence.size === 0) return;
        
        setLoading(true);
        try {
            const memoryIds = Array.from(memoryInfluence.keys());
            const response = await fetch('/api/memories/batch', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: memoryIds })
            });
            const memoryData = await response.json();
            setMemories(memoryData);
        } catch (error) {
            console.error('Failed to load memory details:', error);
        } finally {
            setLoading(false);
        }
    };

    // Get memory by ID
    const getMemoryById = (id: string) => {
        return memories.find(m => m.id === id);
    };

    // Get influence color based on strength
    const getInfluenceColor = (influence: number): string => {
        if (influence >= 0.8) return 'bg-red-500';
        if (influence >= 0.6) return 'bg-orange-500';
        if (influence >= 0.4) return 'bg-yellow-500';
        if (influence >= 0.2) return 'bg-blue-500';
        return 'bg-gray-500';
    };

    // Get influence text color
    const getInfluenceTextColor = (influence: number): string => {
        if (influence >= 0.8) return 'text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30';
        if (influence >= 0.6) return 'text-orange-700 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/30';
        if (influence >= 0.4) return 'text-yellow-700 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/30';
        if (influence >= 0.2) return 'text-blue-700 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/30';
        return 'text-gray-700 bg-gray-100 dark:text-gray-300 dark:bg-gray-800';
    };

    if (memoryInfluence.size === 0) {
        return null;
    }

    return (
        <div className={`message-memory-influence ${className}`}>
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                        <InformationCircleIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            Memory Influence
                        </span>
                        <span className="text-xs text-blue-600 dark:text-blue-400">
                            {memoryInfluence.size} memories used
                        </span>
                    </div>
                    
                    {memoryInfluence.size > maxVisible && (
                        <button
                            onClick={() => setIsExpanded(!isExpanded)}
                            className="flex items-center space-x-1 text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
                        >
                            <span>{isExpanded ? 'Show less' : `Show all ${memoryInfluence.size}`}</span>
                            {isExpanded ? (
                                <ChevronUpIcon className="w-3 h-3" />
                            ) : (
                                <ChevronDownIcon className="w-3 h-3" />
                            )}
                        </button>
                    )}
                </div>

                {/* Memory Influences */}
                {loading ? (
                    <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                        <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                        <span>Loading memory details...</span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {sortedInfluences.map(([memoryId, influence]) => {
                            const memory = getMemoryById(memoryId);
                            
                            return (
                                <div
                                    key={memoryId}
                                    className="flex items-center space-x-3 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-600 cursor-pointer transition-colors"
                                    onClick={() => onMemoryClick?.(memoryId)}
                                >
                                    {/* Memory Type Icon */}
                                    {memory && (
                                        <MemoryTypeIcon 
                                            type={memory.memoryType} 
                                            className="w-4 h-4 flex-shrink-0" 
                                        />
                                    )}
                                    
                                    {/* Memory Content Preview */}
                                    <div className="flex-1 min-w-0">
                                        {memory ? (
                                            <>
                                                <div className="text-xs text-gray-600 dark:text-gray-400 capitalize mb-1">
                                                    {memory.memoryType.replace('_', ' ')}
                                                </div>
                                                <div className="text-sm text-gray-900 dark:text-white truncate">
                                                    {memory.content}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="text-sm text-gray-500 dark:text-gray-400">
                                                Loading memory...
                                            </div>
                                        )}
                                    </div>
                                    
                                    {/* Influence Indicator */}
                                    <div className="flex items-center space-x-2 flex-shrink-0">
                                        {/* Influence Bar */}
                                        <div className="w-12 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                                className={`h-2 rounded-full transition-all duration-300 ${getInfluenceColor(influence)}`}
                                                style={{ width: `${influence * 100}%` }}
                                            />
                                        </div>
                                        
                                        {/* Influence Percentage */}
                                        <span className={`text-xs px-2 py-1 rounded font-medium ${getInfluenceTextColor(influence)}`}>
                                            {(influence * 100).toFixed(0)}%
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Summary Stats */}
                {!loading && memories.length > 0 && (
                    <div className="mt-3 pt-2 border-t border-blue-200 dark:border-blue-800">
                        <div className="grid grid-cols-3 gap-4 text-xs">
                            <div className="text-center">
                                <div className="font-medium text-blue-900 dark:text-blue-100">
                                    {(Array.from(memoryInfluence.values()).reduce((a, b) => a + b, 0) / memoryInfluence.size * 100).toFixed(1)}%
                                </div>
                                <div className="text-blue-600 dark:text-blue-400">
                                    Avg Influence
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="font-medium text-blue-900 dark:text-blue-100">
                                    {new Set(memories.map(m => m?.memoryType).filter(Boolean)).size}
                                </div>
                                <div className="text-blue-600 dark:text-blue-400">
                                    Memory Types
                                </div>
                            </div>
                            <div className="text-center">
                                <div className="font-medium text-blue-900 dark:text-blue-100">
                                    {Math.max(...Array.from(memoryInfluence.values())) * 100}%
                                </div>
                                <div className="text-blue-600 dark:text-blue-400">
                                    Max Influence
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default MessageMemoryInfluence;
