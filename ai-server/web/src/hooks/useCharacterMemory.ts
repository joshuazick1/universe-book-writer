/**
 * Character Memory Hook - Manages character memory operations
 * 
 * Features:
 * - Memory retrieval and filtering
 * - Memory creation and updates
 * - Context gathering and relevance scoring
 * - Memory search and semantic similarity
 * - Gap-filling and validation
 * - Usage analytics and metrics
 */

import { useState, useCallback, useRef } from 'react';
import { CharacterMemory, MemoryFilter, SemanticSearchResult } from '../types/character-chat';

interface MemoryContextRequest {
    characterId: string;
    query: string;
    filters?: MemoryFilter[];
    maxMemories?: number;
    relevanceThreshold?: number;
}

interface MemoryContextResponse {
    memories: CharacterMemory[];
    relevanceScores: Map<string, number>;
    contextPrompt: string;
    searchMetrics: {
        totalSearched: number;
        totalRelevant: number;
        avgRelevance: number;
        searchTime: number;
    };
}

interface GapFillingRequest {
    characterId: string;
    scenario: string;
    timeframe: string;
    context: string[];
    detail_level?: 'basic' | 'standard' | 'comprehensive';
}

export const useCharacterMemory = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [cache, setCache] = useState<Map<string, any>>(new Map());

    // Refs for caching and optimization
    const cacheTimeouts = useRef<Map<string, NodeJS.Timeout>>(new Map());
    const requestQueue = useRef<Map<string, Promise<any>>>(new Map());

    // Cache management
    const getCacheKey = (operation: string, params: any): string => {
        return `${operation}_${JSON.stringify(params)}`;
    };

    const setCacheValue = useCallback((key: string, value: any, ttl: number = 300000) => { // 5 minutes default
        setCache(prev => new Map(prev.set(key, value)));

        // Clear existing timeout
        const existingTimeout = cacheTimeouts.current.get(key);
        if (existingTimeout) {
            clearTimeout(existingTimeout);
        }

        // Set new timeout
        const timeout = setTimeout(() => {
            setCache(prev => {
                const newCache = new Map(prev);
                newCache.delete(key);
                return newCache;
            });
            cacheTimeouts.current.delete(key);
        }, ttl);

        cacheTimeouts.current.set(key, timeout);
    }, []);

    // Deduplicate concurrent requests
    const deduplicateRequest = useCallback(<T>(key: string, requestFn: () => Promise<T>): Promise<T> => {
        const existing = requestQueue.current.get(key);
        if (existing) {
            return existing;
        }

        const promise = requestFn().finally(() => {
            requestQueue.current.delete(key);
        });

        requestQueue.current.set(key, promise);
        return promise;
    }, []);

    // Get character memories
    const getCharacterMemories = useCallback(async (
        characterId: string,
        filters: MemoryFilter[] = []
    ): Promise<CharacterMemory[]> => {
        const cacheKey = getCacheKey('memories', { characterId, filters });
        const cached = cache.get(cacheKey);

        if (cached) {
            return cached;
        }

        return deduplicateRequest(cacheKey, async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/chat/characters/${characterId}/memories`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ filters })
                });

                if (!response.ok) {
                    throw new Error(`Failed to fetch memories: ${response.statusText}`);
                }

                const memories = await response.json();

                // Parse dates
                const parsedMemories = memories.map((memory: any) => ({
                    ...memory,
                    createdAt: new Date(memory.createdAt),
                    updatedAt: new Date(memory.updatedAt),
                    lastAccessed: new Date(memory.lastAccessed)
                }));

                setCacheValue(cacheKey, parsedMemories);
                return parsedMemories;

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to fetch memories';
                setError(errorMessage);
                // Return empty array instead of throwing to prevent undefined
                return [];
            } finally {
                setIsLoading(false);
            }
        });
    }, [cache, deduplicateRequest, setCache]);

    // Get memory context for chat
    const getMemoryContext = useCallback(async (
        request: MemoryContextRequest
    ): Promise<MemoryContextResponse> => {
        const cacheKey = getCacheKey('context', request);
        const cached = cache.get(cacheKey);

        if (cached) {
            return cached;
        }

        return deduplicateRequest(cacheKey, async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch('/api/memory/context', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(request)
                });

                if (!response.ok) {
                    throw new Error(`Failed to get memory context: ${response.statusText}`);
                }

                const contextData = await response.json();

                // Parse and process response
                const result: MemoryContextResponse = {
                    memories: contextData.memories.map((memory: any) => ({
                        ...memory,
                        createdAt: new Date(memory.createdAt),
                        updatedAt: new Date(memory.updatedAt),
                        lastAccessed: new Date(memory.lastAccessed)
                    })),
                    relevanceScores: new Map(Object.entries(contextData.relevanceScores)),
                    contextPrompt: contextData.contextPrompt,
                    searchMetrics: contextData.searchMetrics
                };

                setCacheValue(cacheKey, result, 60000); // Shorter cache for context (1 minute)
                return result;

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to get memory context';
                setError(errorMessage);
                // Return safe default instead of throwing
                return {
                    memories: [],
                    relevanceScores: new Map(),
                    contextPrompt: '',
                    searchMetrics: {
                        totalSearched: 0,
                        totalRelevant: 0,
                        avgRelevance: 0,
                        searchTime: 0
                    }
                };
            } finally {
                setIsLoading(false);
            }
        });
    }, [cache, deduplicateRequest, setCache]);

    // Create memory from conversation
    const createMemoryFromConversation = useCallback(async (
        characterId: string,
        conversationId: string,
        content: string,
        memoryType: CharacterMemory['memoryType'],
        metadata: {
            importance?: number;
            associatedEntities?: string[];
            emotionalValence?: number;
            tags?: string[];
        } = {}
    ): Promise<CharacterMemory> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/memory/create', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    characterId,
                    conversationId,
                    content,
                    memoryType,
                    memorySource: 'user_interaction',
                    ...metadata
                })
            });

            if (!response.ok) {
                throw new Error(`Failed to create memory: ${response.statusText}`);
            }

            const memory = await response.json();

            // Parse dates
            const parsedMemory = {
                ...memory,
                createdAt: new Date(memory.createdAt),
                updatedAt: new Date(memory.updatedAt),
                lastAccessed: new Date(memory.lastAccessed)
            };

            // Invalidate relevant caches
            const keysToInvalidate = Array.from(cache.keys()).filter(key =>
                key.includes(characterId) || key.includes('memories')
            );
            keysToInvalidate.forEach(key => {
                setCache(prev => {
                    const newCache = new Map(prev);
                    newCache.delete(key);
                    return newCache;
                });
            });

            return parsedMemory;

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to create memory';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, [cache, setCache]);

    // Update memory relevance based on usage
    const updateMemoryRelevance = useCallback(async (
        memoryId: string,
        relevanceScore: number,
        context: string
    ): Promise<void> => {
        try {
            await fetch(`/api/memories/${memoryId}/relevance`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    relevanceScore,
                    context,
                    timestamp: new Date().toISOString()
                })
            });

            // Update access count and last accessed time
            await fetch(`/api/memories/${memoryId}/access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    accessTime: new Date().toISOString(),
                    relevanceScore
                })
            });

        } catch (err) {
            console.error('Failed to update memory relevance:', err);
            // Don't throw here as this is not critical to user experience
        }
    }, []);

    // Search memories semantically
    const searchMemories = useCallback(async (
        characterId: string,
        query: string,
        options: {
            limit?: number;
            filters?: MemoryFilter[];
            includeRelevanceScores?: boolean;
        } = {}
    ): Promise<SemanticSearchResult[]> => {
        const cacheKey = getCacheKey('search', { characterId, query, options });
        const cached = cache.get(cacheKey);

        if (cached) {
            return cached;
        }

        return deduplicateRequest(cacheKey, async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch('/api/memory/search', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        characterId,
                        query,
                        ...options
                    })
                });

                if (!response.ok) {
                    throw new Error(`Failed to search memories: ${response.statusText}`);
                }

                const results = await response.json();

                // Parse dates in memories
                const parsedResults = results.map((result: any) => ({
                    ...result,
                    memory: {
                        ...result.memory,
                        createdAt: new Date(result.memory.createdAt),
                        updatedAt: new Date(result.memory.updatedAt),
                        lastAccessed: new Date(result.memory.lastAccessed)
                    }
                }));

                setCacheValue(cacheKey, parsedResults, 120000); // 2 minute cache for search
                return parsedResults;

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to search memories';
                setError(errorMessage);
                throw new Error(errorMessage);
            } finally {
                setIsLoading(false);
            }
        });
    }, [cache, deduplicateRequest, setCache]);

    // Generate gap-filling memory
    const generateGapFillingMemory = useCallback(async (
        request: GapFillingRequest
    ): Promise<CharacterMemory> => {
        setIsLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/memory/gap-filling', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(request)
            });

            if (!response.ok) {
                throw new Error(`Failed to generate gap-filling memory: ${response.statusText}`);
            }

            const memory = await response.json();

            // Parse dates
            const parsedMemory = {
                ...memory,
                createdAt: new Date(memory.createdAt),
                updatedAt: new Date(memory.updatedAt),
                lastAccessed: new Date(memory.lastAccessed)
            };

            return parsedMemory;

        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to generate gap-filling memory';
            setError(errorMessage);
            throw new Error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Get memory analytics
    const getMemoryAnalytics = useCallback(async (
        characterId: string,
        timeRange?: { start: Date; end: Date }
    ) => {
        const cacheKey = getCacheKey('analytics', { characterId, timeRange });
        const cached = cache.get(cacheKey);

        if (cached) {
            return cached;
        }

        return deduplicateRequest(cacheKey, async () => {
            setIsLoading(true);
            setError(null);

            try {
                const response = await fetch(`/api/chat/characters/${characterId}/memory-analytics`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ timeRange })
                });

                if (!response.ok) {
                    throw new Error(`Failed to get memory analytics: ${response.statusText}`);
                }

                const analytics = await response.json();
                setCacheValue(cacheKey, analytics, 300000); // 5 minute cache
                return analytics;

            } catch (err) {
                const errorMessage = err instanceof Error ? err.message : 'Failed to get memory analytics';
                setError(errorMessage);
                throw new Error(errorMessage);
            } finally {
                setIsLoading(false);
            }
        });
    }, [cache, deduplicateRequest, setCache]);

    // Clear cache
    const clearCache = useCallback((pattern?: string) => {
        if (pattern) {
            const keysToDelete = Array.from(cache.keys()).filter(key => key.includes(pattern));
            keysToDelete.forEach(key => {
                setCache(prev => {
                    const newCache = new Map(prev);
                    newCache.delete(key);
                    return newCache;
                });
            });
        } else {
            setCache(new Map());
            cacheTimeouts.current.forEach(timeout => clearTimeout(timeout));
            cacheTimeouts.current.clear();
        }
    }, [cache]);

    return {
        // State
        isLoading,
        error,
        cacheSize: cache.size,

        // Memory operations
        getCharacterMemories,
        getMemoryContext,
        createMemoryFromConversation,
        updateMemoryRelevance,
        searchMemories,
        generateGapFillingMemory,
        getMemoryAnalytics,

        // Cache management
        clearCache
    };
};

export default useCharacterMemory;
