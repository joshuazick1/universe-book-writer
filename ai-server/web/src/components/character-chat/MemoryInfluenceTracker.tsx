/**
 * Meimport React from 'react';
import { 
    CpuChipIcon,
    ChartBarIcon,
    SparklesIcon,
    ClockIcon
} from '@heroicons/react/24/outline';fluence Tracker - Tracks and visualizes how memories influence responses
 * 
 * Features:
 * - Real-time memory influence visualization
 * - Current message analysis
 * - Memory weight and relevance scores
 * - Interactive memory exploration
 */

import React from 'react';
import {
    CpuChipIcon,
    ChartBarIcon,
    SparklesIcon,
    ClockIcon
} from '@heroicons/react/24/outline';
import { CharacterMemory, ChatMessage } from '../../types/character-chat';

interface MemoryInfluenceTrackerProps {
    memoryInfluence: Map<string, number>;
    memories: CharacterMemory[];
    currentMessage?: ChatMessage;
    onMemoryClick?: (memory: CharacterMemory) => void;
    showDetails?: boolean;
}

export const MemoryInfluenceTracker: React.FC<MemoryInfluenceTrackerProps> = ({
    memoryInfluence,
    memories = [],
    currentMessage,
    onMemoryClick,
    showDetails = true
}) => {
    // Get influenced memories sorted by influence strength
    const influencedMemories = Array.from(memoryInfluence.entries())
        .map(([memoryId, influence]) => {
            const memory = memories.find(m => m.id === memoryId);
            return memory ? { memory, influence } : null;
        })
        .filter((item): item is { memory: CharacterMemory; influence: number } => item !== null)
        .sort((a, b) => b.influence - a.influence);

    if (influencedMemories.length === 0) {
        return (
            <div className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                    <CpuChipIcon className="w-5 h-5 text-gray-500" />
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Memory Influence
                    </h3>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    No active memory influences for this conversation.
                </p>
            </div>
        );
    }

    return (
        <div className="p-4">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <CpuChipIcon className="w-5 h-5 text-indigo-600" />
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                        Active Memory Influences
                    </h3>
                </div>
                <span className="text-xs text-gray-500 bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                    {influencedMemories.length} active
                </span>
            </div>

            {/* Current Message Analysis */}
            {currentMessage && showDetails && (
                <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-2 mb-2">
                        <SparklesIcon className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                            Current Response Context
                        </span>
                    </div>
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                        {influencedMemories.length} memories are influencing this response
                    </p>
                </div>
            )}

            {/* Memory Influence List */}
            <div className="space-y-2">
                {influencedMemories.slice(0, 5).map(({ memory, influence }, index) => (
                    <div
                        key={memory.id}
                        className={`p-3 rounded-lg border transition-colors ${onMemoryClick
                            ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700'
                            : ''
                            } ${influence > 0.7
                                ? 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                                : influence > 0.4
                                    ? 'bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800'
                                    : 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                            }`}
                        onClick={() => onMemoryClick?.(memory)}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${memory.memoryType === 'event'
                                        ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                                        : memory.memoryType === 'trait'
                                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200'
                                            : memory.memoryType === 'relationship'
                                                ? 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200'
                                                : 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                                        }`}>
                                        {memory.memoryType}
                                    </span>
                                    <div className="flex items-center space-x-1">
                                        <ClockIcon className="w-3 h-3 text-gray-400" />
                                        <span className="text-xs text-gray-500">
                                            {new Date(memory.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                                <p className="text-sm text-gray-900 dark:text-white line-clamp-2">
                                    {memory.content}
                                </p>
                            </div>

                            {/* Influence Strength */}
                            <div className="ml-3 flex flex-col items-end">
                                <div className="flex items-center space-x-1">
                                    <ChartBarIcon className="w-4 h-4 text-gray-400" />
                                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                        {(influence * 100).toFixed(1)}%
                                    </span>
                                </div>
                                <div className="w-16 h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
                                    <div
                                        className={`h-full rounded-full ${influence > 0.7 ? 'bg-red-500' :
                                            influence > 0.4 ? 'bg-orange-500' : 'bg-green-500'
                                            }`}
                                        style={{ width: `${influence * 100}%` }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Show More Link */}
            {influencedMemories.length > 5 && (
                <button className="w-full mt-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 font-medium">
                    Show {influencedMemories.length - 5} more memories
                </button>
            )}
        </div>
    );
};

export default MemoryInfluenceTracker;
