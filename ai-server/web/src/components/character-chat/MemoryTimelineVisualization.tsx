/**
 * Memory Timeline Visualization - Scrollable timeline showing character memories
 * with real-time context highlighting and relevance scoring
 * 
 * Features:
 * - Smooth scrollable timeline of character memories
 * - Real-time highlighting of memories used for context
 * - Visual relevance scores and influence indicators
 * - Memory type filtering and search
 * - Expandable memory details
 * - Temporal navigation controls
 */

import React, { useState, useEffect, useRef, useCallback, forwardRef, useImperativeHandle } from 'react';
import { FixedSizeList as List } from 'react-window';
import {
    ChevronUpIcon,
    ChevronDownIcon,
    FunnelIcon,
    MagnifyingGlassIcon,
    ClockIcon,
    StarIcon,
    BookOpenIcon,
    ChatBubbleLeftIcon,
    UserIcon,
    SparklesIcon
} from '@heroicons/react/24/outline';
import {
    CharacterMemory,
    MemoryTimelineNode,
    MemoryFilter,
    TemporalPeriod
} from '../../types/character-chat';
import { MemoryTypeIcon } from './MemoryTypeIcon';
import { MemoryDetailsPanel } from './MemoryDetailsPanel';
import { MemoryInfluenceFlow } from './MemoryInfluenceFlow';

interface MemoryTimelineVisualizationProps {
    memories: CharacterMemory[];
    activeMemories: CharacterMemory[];
    memoryInfluence: Map<string, number>;
    relevanceScores: Map<string, number>;
    filter: 'all' | 'relevant' | 'recent';
    onFilterChange: (filter: 'all' | 'relevant' | 'recent') => void;
    showAdvancedFeatures: boolean;
    onMemorySelect?: (memory: CharacterMemory) => void;
    onMemoryAction?: (action: string, memory: CharacterMemory) => void;
}

export interface MemoryTimelineRef {
    scrollToMemory: (memoryId: string) => void;
    scrollToTime: (timestamp: Date) => void;
    highlightMemories: (memoryIds: string[]) => void;
}

export const MemoryTimelineVisualization = forwardRef<
    MemoryTimelineRef,
    MemoryTimelineVisualizationProps
>(({
    memories = [],
    activeMemories = [],
    memoryInfluence = new Map(),
    relevanceScores = new Map(),
    filter,
    onFilterChange,
    showAdvancedFeatures,
    onMemorySelect,
    onMemoryAction
}, ref) => {
    // State
    const [selectedMemoryId, setSelectedMemoryId] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [memoryTypeFilter, setMemoryTypeFilter] = useState<string[]>(['all']);
    const [importanceFilter, setImportanceFilter] = useState<[number, number]>([0, 1]);
    const [sortBy, setSortBy] = useState<'chronological' | 'relevance' | 'importance'>('chronological');
    const [showFilters, setShowFilters] = useState(false);
    const [temporalView, setTemporalView] = useState<'linear' | 'clustered'>('linear');
    const [highlightedMemories, setHighlightedMemories] = useState<Set<string>>(new Set());

    // Refs
    const listRef = useRef<List>(null);
    const timelineContainerRef = useRef<HTMLDivElement>(null);
    const memoryIndexMap = useRef<Map<string, number>>(new Map());

    // Expose methods through ref
    useImperativeHandle(ref, () => ({
        scrollToMemory: (memoryId: string) => {
            const index = memoryIndexMap.current.get(memoryId);
            if (index !== undefined && listRef.current) {
                listRef.current.scrollToItem(index, 'center');
                setHighlightedMemories(new Set([memoryId]));
                setTimeout(() => setHighlightedMemories(new Set()), 3000);
            }
        },
        scrollToTime: (timestamp: Date) => {
            const sortedMemories = getSortedAndFilteredMemories();
            const index = sortedMemories.findIndex(memory =>
                memory.createdAt >= timestamp
            );
            if (index !== -1 && listRef.current) {
                listRef.current.scrollToItem(index, 'center');
            }
        },
        highlightMemories: (memoryIds: string[]) => {
            setHighlightedMemories(new Set(memoryIds));
        }
    }));

    // Build memory index map when memories change
    useEffect(() => {
        const sortedMemories = getSortedAndFilteredMemories();
        const indexMap = new Map<string, number>();
        sortedMemories.forEach((memory, index) => {
            indexMap.set(memory.id, index);
        });
        memoryIndexMap.current = indexMap;
    }, [memories, searchQuery, memoryTypeFilter, importanceFilter, sortBy]);

    // Filter and sort memories
    const getSortedAndFilteredMemories = useCallback(() => {
        // Ensure memories is always an array
        if (!memories || !Array.isArray(memories)) {
            return [];
        }

        let filtered = memories;

        // Apply search filter
        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(memory =>
                memory.content.toLowerCase().includes(query) ||
                memory.memoryType.toLowerCase().includes(query) ||
                memory.associatedEntities.some(entity =>
                    entity.toLowerCase().includes(query)
                )
            );
        }

        // Apply memory type filter
        if (!memoryTypeFilter.includes('all')) {
            filtered = filtered.filter(memory =>
                memoryTypeFilter.includes(memory.memoryType)
            );
        }

        // Apply importance filter
        filtered = filtered.filter(memory =>
            memory.importance >= importanceFilter[0] &&
            memory.importance <= importanceFilter[1]
        );

        // Apply main filter
        const safeActiveMemories = activeMemories || [];
        switch (filter) {
            case 'relevant':
                filtered = filtered.filter(memory =>
                    safeActiveMemories.some(active => active.id === memory.id) ||
                    relevanceScores.has(memory.id)
                );
                break;
            case 'recent':
                const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
                filtered = filtered.filter(memory =>
                    memory.createdAt >= twentyFourHoursAgo ||
                    memory.lastAccessed >= twentyFourHoursAgo
                );
                break;
        }

        // Sort memories
        return filtered.sort((a, b) => {
            switch (sortBy) {
                case 'relevance':
                    const scoreA = relevanceScores.get(a.id) || 0;
                    const scoreB = relevanceScores.get(b.id) || 0;
                    return scoreB - scoreA;
                case 'importance':
                    return b.importance - a.importance;
                case 'chronological':
                default:
                    return b.createdAt.getTime() - a.createdAt.getTime();
            }
        });
    }, [memories, searchQuery, memoryTypeFilter, importanceFilter, filter, sortBy, activeMemories, relevanceScores]);

    // Get memory timeline nodes
    const getTimelineNodes = useCallback((): MemoryTimelineNode[] => {
        const sortedMemories = getSortedAndFilteredMemories();
        const safeActiveMemories = activeMemories || [];

        return sortedMemories.map((memory, index) => ({
            memory,
            isActive: safeActiveMemories.some(active => active.id === memory.id),
            relevanceScore: relevanceScores.get(memory.id) || 0,
            influenceScore: memoryInfluence.get(memory.id) || 0,
            isHighlighted: highlightedMemories.has(memory.id),
            position: {
                index,
                timestamp: memory.createdAt,
                relativeTime: getRelativeTimeString(memory.createdAt)
            }
        }));
    }, [getSortedAndFilteredMemories, activeMemories, relevanceScores, memoryInfluence, highlightedMemories]);

    // Get relative time string
    const getRelativeTimeString = (timestamp: Date): string => {
        const now = new Date();
        const diff = now.getTime() - timestamp.getTime();
        const minutes = Math.floor(diff / (1000 * 60));
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));

        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return `${days}d ago`;
    };

    // Handle memory selection
    const handleMemorySelect = (memory: CharacterMemory) => {
        setSelectedMemoryId(memory.id);
        onMemorySelect?.(memory);
    };

    // Memory item renderer for virtual list
    const MemoryItem = ({ index, style }: { index: number; style: React.CSSProperties }) => {
        const timelineNodes = getTimelineNodes();
        const node = timelineNodes[index];

        if (!node) return null;

        const { memory, isActive, relevanceScore, influenceScore, isHighlighted } = node;

        return (
            <div style={style} className="px-4 py-2">
                <div
                    className={`memory-timeline-item relative p-4 rounded-lg border transition-all duration-200 cursor-pointer ${isActive
                        ? 'border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-md'
                        : isHighlighted
                            ? 'border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 shadow-md'
                            : selectedMemoryId === memory.id
                                ? 'border-purple-400 bg-purple-50 dark:bg-purple-900/20 shadow-md'
                                : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                        }`}
                    onClick={() => handleMemorySelect(memory)}
                >
                    {/* Memory Header */}
                    <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center space-x-2">
                            <MemoryTypeIcon
                                type={memory.memoryType}
                                className="w-5 h-5"
                            />
                            <span className="text-sm font-medium text-gray-600 dark:text-gray-400 capitalize">
                                {memory.memoryType.replace('_', ' ')}
                            </span>
                            {memory.memorySource === 'ai_gap_filling' && (
                                <SparklesIcon className="w-4 h-4 text-purple-500" title="AI Generated" />
                            )}
                        </div>

                        <div className="flex items-center space-x-2 text-xs text-gray-500 dark:text-gray-400">
                            <ClockIcon className="w-3 h-3" />
                            <span>{getRelativeTimeString(memory.createdAt)}</span>
                        </div>
                    </div>

                    {/* Memory Content */}
                    <p className="text-sm text-gray-900 dark:text-gray-100 mb-3 line-clamp-3">
                        {memory.content}
                    </p>

                    {/* Memory Metrics */}
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            {/* Importance Score */}
                            <div className="flex items-center space-x-1">
                                <StarIcon className="w-4 h-4 text-amber-500" />
                                <span className="text-xs text-gray-600 dark:text-gray-400">
                                    {(memory.importance * 100).toFixed(0)}%
                                </span>
                            </div>

                            {/* Relevance Score */}
                            {relevanceScore > 0 && (
                                <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                    <span className="text-xs text-blue-600 dark:text-blue-400">
                                        {(relevanceScore * 100).toFixed(0)}% relevant
                                    </span>
                                </div>
                            )}

                            {/* Influence Score */}
                            {influenceScore > 0 && (
                                <div className="flex items-center space-x-1">
                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                    <span className="text-xs text-green-600 dark:text-green-400">
                                        {(influenceScore * 100).toFixed(0)}% influence
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Access Count */}
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                            Accessed {memory.accessCount} times
                        </div>
                    </div>

                    {/* Memory Influence Flow Animation */}
                    {isActive && showAdvancedFeatures && (
                        <MemoryInfluenceFlow
                            influencingMemories={[memory]}
                            isActive={true}
                        />
                    )}

                    {/* Associated Entities */}
                    {memory.associatedEntities.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                            {memory.associatedEntities.slice(0, 3).map((entity, index) => (
                                <span
                                    key={index}
                                    className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                                >
                                    {entity}
                                </span>
                            ))}
                            {memory.associatedEntities.length > 3 && (
                                <span className="inline-block px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded">
                                    +{memory.associatedEntities.length - 3} more
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const timelineNodes = getTimelineNodes();

    return (
        <div className="memory-timeline-visualization h-full flex flex-col">
            {/* Header */}
            <div className="flex-shrink-0 p-4 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Memory Timeline
                    </h3>

                    <div className="flex items-center space-x-2">
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                            {timelineNodes.length} memories
                        </span>

                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`p-2 rounded-lg transition-colors ${showFilters
                                ? 'bg-blue-100 text-blue-600 dark:bg-blue-900 dark:text-blue-300'
                                : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600'
                                }`}
                        >
                            <FunnelIcon className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Search Bar */}
                <div className="relative mb-4">
                    <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                        type="text"
                        placeholder="Search memories..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                </div>

                {/* Filter Controls */}
                {showFilters && (
                    <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                        {/* Main Filter Tabs */}
                        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
                            {(['all', 'relevant', 'recent'] as const).map((filterOption) => (
                                <button
                                    key={filterOption}
                                    onClick={() => onFilterChange(filterOption)}
                                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${filter === filterOption
                                        ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow'
                                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                                        }`}
                                >
                                    {filterOption.charAt(0).toUpperCase() + filterOption.slice(1)}
                                </button>
                            ))}
                        </div>

                        {/* Sort Options */}
                        <div className="flex items-center space-x-4">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Sort by:</span>
                            <select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value as any)}
                                className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-800 text-sm"
                            >
                                <option value="chronological">Chronological</option>
                                <option value="relevance">Relevance</option>
                                <option value="importance">Importance</option>
                            </select>
                        </div>

                        {/* Memory Type Filters */}
                        <div>
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                                Memory Types:
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {['all', 'trait', 'knowledge', 'event', 'relationship', 'goal', 'skill'].map((type) => (
                                    <button
                                        key={type}
                                        onClick={() => {
                                            if (type === 'all') {
                                                setMemoryTypeFilter(['all']);
                                            } else {
                                                setMemoryTypeFilter(prev =>
                                                    prev.includes('all')
                                                        ? [type]
                                                        : prev.includes(type)
                                                            ? prev.filter(t => t !== type)
                                                            : [...prev.filter(t => t !== 'all'), type]
                                                );
                                            }
                                        }}
                                        className={`px-2 py-1 text-xs rounded border transition-colors ${memoryTypeFilter.includes(type)
                                            ? 'bg-blue-100 border-blue-300 text-blue-700 dark:bg-blue-900 dark:border-blue-600 dark:text-blue-300'
                                            : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300'
                                            }`}
                                    >
                                        {type.charAt(0).toUpperCase() + type.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Timeline List */}
            <div className="flex-1 overflow-hidden" ref={timelineContainerRef}>
                {timelineNodes.length > 0 ? (
                    <List
                        ref={listRef}
                        width="100%"
                        height={timelineContainerRef.current?.clientHeight || 600}
                        itemCount={timelineNodes.length}
                        itemSize={160}
                        className="memory-timeline-list"
                    >
                        {MemoryItem}
                    </List>
                ) : (
                    <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                        <div className="text-center">
                            <BookOpenIcon className="w-12 h-12 mx-auto mb-4 text-gray-300 dark:text-gray-600" />
                            <p className="text-lg font-medium mb-2">No memories found</p>
                            <p className="text-sm">
                                {searchQuery ? 'Try adjusting your search or filters' : 'Start a conversation to create memories'}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Memory Details Panel */}
            {selectedMemoryId && (
                <MemoryDetailsPanel
                    memoryId={selectedMemoryId}
                    onClose={() => setSelectedMemoryId(null)}
                    onAction={onMemoryAction}
                    showAdvancedFeatures={showAdvancedFeatures}
                />
            )}
        </div>
    );
});

export default MemoryTimelineVisualization;
