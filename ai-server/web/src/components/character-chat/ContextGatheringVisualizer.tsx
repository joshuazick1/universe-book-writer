/**
 * Context Gathering Visualizer - Shows real-time memory search and context assembly
 * 
 * Features:
 * - Animated semantic search through memory database
 * - Live relevance score calculation
 * - Visual context assembly process
 * - Memory selection and filtering animation
 * - Token counting and context optimization
 * - Debug mode for detailed process visualization
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    MagnifyingGlassIcon,
    CpuChipIcon,
    DocumentTextIcon,
    SparklesIcon,
    ChartBarIcon,
    ClockIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import {
    ContextGatheringState,
    CharacterMemory,
    SemanticSearchResult,
    ContextAssemblyStep
} from '../../types/character-chat';

interface ContextGatheringVisualizerProps {
    state: ContextGatheringState;
    memories: CharacterMemory[];
    showAdvancedMetrics: boolean;
    onMemorySelect?: (memory: CharacterMemory) => void;
    debugMode?: boolean;
}

export const ContextGatheringVisualizer: React.FC<ContextGatheringVisualizerProps> = ({
    state,
    memories = [],
    showAdvancedMetrics,
    onMemorySelect,
    debugMode = false
}) => {
    // State for animations and visualizations
    const [searchAnimation, setSearchAnimation] = useState<'idle' | 'searching' | 'complete'>('idle');
    const [assemblyStep, setAssemblyStep] = useState<ContextAssemblyStep>('idle');
    const [visibleMemories, setVisibleMemories] = useState<Set<string>>(new Set());
    const [searchProgress, setSearchProgress] = useState(0);
    const [tokenCount, setTokenCount] = useState(0);
    const [contextOptimization, setContextOptimization] = useState<{
        originalCount: number;
        optimizedCount: number;
        compressionRatio: number;
    } | null>(null);

    // Animation refs
    const searchVisualizationRef = useRef<HTMLDivElement>(null);
    const assemblyVisualizationRef = useRef<HTMLDivElement>(null);

    // Update visualization state when context gathering state changes
    useEffect(() => {
        if (state.isGathering) {
            setSearchAnimation('searching');
            setAssemblyStep('searching');
            setVisibleMemories(new Set());
            setSearchProgress(0);
        } else {
            setSearchAnimation('complete');
            setAssemblyStep('complete');
            setVisibleMemories(new Set(state.selectedMemories.map(m => m.id)));
        }
    }, [state.isGathering, state.selectedMemories]);

    // Animate search progress
    useEffect(() => {
        if (state.searchResults.length > 0 && searchAnimation === 'searching') {
            const timer = setInterval(() => {
                setSearchProgress(prev => {
                    const next = prev + 10;
                    if (next >= 100) {
                        clearInterval(timer);
                        return 100;
                    }
                    return next;
                });
            }, 100);

            return () => clearInterval(timer);
        }
    }, [state.searchResults, searchAnimation]);

    // Calculate token count for context prompt
    useEffect(() => {
        if (state.contextPrompt) {
            const approxTokens = state.contextPrompt.split(/\s+/).length * 1.3; // Rough token estimation
            setTokenCount(Math.round(approxTokens));

            // Simulate context optimization
            const originalTokens = state.selectedMemories.reduce((sum, memory) =>
                sum + memory.content.split(/\s+/).length * 1.3, 0
            );

            setContextOptimization({
                originalCount: Math.round(originalTokens),
                optimizedCount: Math.round(approxTokens),
                compressionRatio: originalTokens > 0 ? approxTokens / originalTokens : 1
            });
        }
    }, [state.contextPrompt, state.selectedMemories]);

    // Get search visualization ripples
    const getSearchRipples = () => {
        if (searchAnimation !== 'searching') return [];

        return Array.from({ length: 3 }, (_, i) => (
            <div
                key={i}
                className="absolute inset-0 border-2 border-blue-400 rounded-full opacity-70"
                style={{
                    animation: `ripple 2s infinite ${i * 0.5}s`,
                    animationDelay: `${i * 0.5}s`
                }}
            />
        ));
    };

    // Get memory relevance color
    const getRelevanceColor = (score: number): string => {
        if (score >= 0.8) return 'text-green-600 bg-green-100 dark:bg-green-900/30';
        if (score >= 0.6) return 'text-blue-600 bg-blue-100 dark:bg-blue-900/30';
        if (score >= 0.4) return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30';
        return 'text-gray-600 bg-gray-100 dark:bg-gray-800';
    };

    // Format relevance score
    const formatScore = (score: number): string => {
        return (score * 100).toFixed(1) + '%';
    };

    return (
        <div className="context-gathering-visualizer bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                    <div className="relative">
                        <CpuChipIcon className="w-6 h-6 text-blue-600" />
                        {state.isGathering && (
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                        )}
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        Context Gathering
                    </h4>
                </div>

                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                    {state.selectedMemories.length > 0 && (
                        <span className="flex items-center space-x-1">
                            <CheckCircleIcon className="w-4 h-4 text-green-500" />
                            <span>{state.selectedMemories.length} memories selected</span>
                        </span>
                    )}

                    {tokenCount > 0 && (
                        <span className="flex items-center space-x-1">
                            <DocumentTextIcon className="w-4 h-4" />
                            <span>{tokenCount.toLocaleString()} tokens</span>
                        </span>
                    )}
                </div>
            </div>

            {/* Main Visualization Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Search Visualization */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 h-64">
                        <h5 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                            <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
                            Semantic Search
                        </h5>

                        <div
                            ref={searchVisualizationRef}
                            className="relative h-32 bg-gray-50 dark:bg-gray-900 rounded-lg flex items-center justify-center overflow-hidden"
                        >
                            {/* Search Ripples */}
                            {getSearchRipples()}

                            {/* Search Status */}
                            <div className="relative z-10 text-center">
                                {searchAnimation === 'idle' && (
                                    <div className="text-gray-400">
                                        <MagnifyingGlassIcon className="w-8 h-8 mx-auto mb-2" />
                                        <p className="text-sm">Ready to search</p>
                                    </div>
                                )}

                                {searchAnimation === 'searching' && (
                                    <div className="text-blue-600">
                                        <div className="w-8 h-8 mx-auto mb-2 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                        <p className="text-sm">Searching memories...</p>
                                    </div>
                                )}

                                {searchAnimation === 'complete' && (
                                    <div className="text-green-600">
                                        <CheckCircleIcon className="w-8 h-8 mx-auto mb-2" />
                                        <p className="text-sm">Search complete</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Search Progress */}
                        {state.isGathering && (
                            <div className="mt-4">
                                <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                                    <span>Progress</span>
                                    <span>{searchProgress}%</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                    <div
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${searchProgress}%` }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Memory Selection Visualization */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 h-64">
                        <h5 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                            <ChartBarIcon className="w-4 h-4 mr-2" />
                            Relevance Scoring
                        </h5>

                        <div className="space-y-2 max-h-40 overflow-y-auto">
                            {state.searchResults.slice(0, 5).map((memory) => {
                                const relevanceScore = state.relevanceScores.get(memory.id) || 0;
                                const isSelected = state.selectedMemories.some(m => m.id === memory.id);

                                return (
                                    <div
                                        key={memory.id}
                                        className={`p-2 rounded border transition-all duration-300 cursor-pointer ${isSelected
                                            ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/30'
                                            : 'border-gray-200 dark:border-gray-700 hover:border-gray-300'
                                            }`}
                                        onClick={() => onMemorySelect?.(memory)}
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span className="text-xs text-gray-600 dark:text-gray-400 capitalize">
                                                {memory.memoryType.replace('_', ' ')}
                                            </span>
                                            <span className={`text-xs px-2 py-1 rounded ${getRelevanceColor(relevanceScore)}`}>
                                                {formatScore(relevanceScore)}
                                            </span>
                                        </div>
                                        <p className="text-xs text-gray-800 dark:text-gray-200 line-clamp-2">
                                            {memory.content}
                                        </p>

                                        {/* Relevance Bar */}
                                        <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1">
                                            <div
                                                className="bg-gradient-to-r from-red-400 via-yellow-400 to-green-400 h-1 rounded-full transition-all duration-500"
                                                style={{ width: `${relevanceScore * 100}%` }}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Context Assembly */}
                <div className="lg:col-span-1">
                    <div className="bg-white dark:bg-gray-800 rounded-lg p-4 h-64">
                        <h5 className="font-medium text-gray-900 dark:text-white mb-4 flex items-center">
                            <DocumentTextIcon className="w-4 h-4 mr-2" />
                            Context Assembly
                        </h5>

                        <div className="space-y-3">
                            {/* Assembly Steps */}
                            <div className="space-y-2">
                                <div className={`flex items-center space-x-2 ${assemblyStep === 'searching' ? 'text-blue-600' :
                                    assemblyStep === 'complete' ? 'text-green-600' : 'text-gray-400'
                                    }`}>
                                    <div className={`w-2 h-2 rounded-full ${assemblyStep === 'searching' ? 'bg-blue-600 animate-pulse' :
                                        assemblyStep === 'complete' ? 'bg-green-600' : 'bg-gray-400'
                                        }`} />
                                    <span className="text-sm">Memory selection</span>
                                </div>

                                <div className={`flex items-center space-x-2 ${state.selectedMemories.length > 0 ? 'text-blue-600' : 'text-gray-400'
                                    }`}>
                                    <div className={`w-2 h-2 rounded-full ${state.selectedMemories.length > 0 ? 'bg-blue-600 animate-pulse' : 'bg-gray-400'
                                        }`} />
                                    <span className="text-sm">Context building</span>
                                </div>

                                <div className={`flex items-center space-x-2 ${state.contextPrompt ? 'text-green-600' : 'text-gray-400'
                                    }`}>
                                    <div className={`w-2 h-2 rounded-full ${state.contextPrompt ? 'bg-green-600' : 'bg-gray-400'
                                        }`} />
                                    <span className="text-sm">Prompt construction</span>
                                </div>
                            </div>

                            {/* Context Stats */}
                            {showAdvancedMetrics && contextOptimization && (
                                <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-900 rounded">
                                    <h6 className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        Context Optimization
                                    </h6>
                                    <div className="space-y-1 text-xs">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Original:</span>
                                            <span className="text-gray-900 dark:text-gray-100">
                                                {contextOptimization.originalCount.toLocaleString()} tokens
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Optimized:</span>
                                            <span className="text-gray-900 dark:text-gray-100">
                                                {contextOptimization.optimizedCount.toLocaleString()} tokens
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600 dark:text-gray-400">Efficiency:</span>
                                            <span className={`font-medium ${contextOptimization.compressionRatio < 0.8 ? 'text-green-600' : 'text-yellow-600'
                                                }`}>
                                                {(contextOptimization.compressionRatio * 100).toFixed(1)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Debug Information */}
            {debugMode && showAdvancedMetrics && (
                <div className="mt-6 bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h5 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center">
                        <CpuChipIcon className="w-4 h-4 mr-2" />
                        Debug Information
                    </h5>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <h6 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Search Results</h6>
                            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                                <li>Total memories: {memories.length}</li>
                                <li>Search results: {state.searchResults.length}</li>
                                <li>Selected: {state.selectedMemories.length}</li>
                                <li>Avg relevance: {
                                    state.relevanceScores.size > 0
                                        ? formatScore(Array.from(state.relevanceScores.values()).reduce((a, b) => a + b, 0) / state.relevanceScores.size)
                                        : '0%'
                                }</li>
                            </ul>
                        </div>

                        <div>
                            <h6 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Context Metrics</h6>
                            <ul className="space-y-1 text-gray-600 dark:text-gray-400">
                                <li>Context length: {state.contextPrompt.length} chars</li>
                                <li>Estimated tokens: {tokenCount.toLocaleString()}</li>
                                <li>Memory types: {new Set(state.selectedMemories.map(m => m.memoryType)).size}</li>
                                <li>Time span: {
                                    state.selectedMemories.length > 0
                                        ? (() => {
                                            const dates = state.selectedMemories.map(m => m.createdAt.getTime());
                                            const span = Math.max(...dates) - Math.min(...dates);
                                            const days = Math.floor(span / (1000 * 60 * 60 * 24));
                                            return `${days} days`;
                                        })()
                                        : '0 days'
                                }</li>
                            </ul>
                        </div>
                    </div>

                    {/* Context Prompt Preview */}
                    {state.contextPrompt && (
                        <div className="mt-4">
                            <h6 className="font-medium text-gray-700 dark:text-gray-300 mb-2">Context Prompt Preview</h6>
                            <div className="bg-white dark:bg-gray-800 rounded border p-3 text-xs font-mono text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto">
                                {state.contextPrompt.substring(0, 500)}
                                {state.contextPrompt.length > 500 && '...'}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* CSS for animations */}
            <style>{`
                @keyframes ripple {
                    0% {
                        transform: scale(0.8);
                        opacity: 1;
                    }
                    100% {
                        transform: scale(2.4);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
    );
};

export default ContextGatheringVisualizer;
