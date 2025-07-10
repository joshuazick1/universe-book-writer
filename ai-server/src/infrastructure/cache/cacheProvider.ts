// ai-server/src/infrastructure/cache/cacheProvider.ts
// Simple in-memory cache provider with LRU logic (can be replaced with Redis)

interface CacheEntry<T> {
    value: T;
    timestamp: number;
}

export class LRUCache<K, V> {
    private cache = new Map<K, CacheEntry<V>>();
    private readonly maxSize: number;
    constructor(maxSize = 100) {
        this.maxSize = maxSize;
    }
    get(key: K): V | undefined {
        const entry = this.cache.get(key);
        if (!entry) return undefined;
        // Update LRU order
        this.cache.delete(key);
        this.cache.set(key, { ...entry, timestamp: Date.now() });
        return entry.value;
    }
    set(key: K, value: V) {
        if (this.cache.has(key)) this.cache.delete(key);
        else if (this.cache.size >= this.maxSize) {
            // Remove least recently used
            const iterator = this.cache.keys();
            const lruKey = iterator.next().value as K;
            if (lruKey !== undefined) {
                this.cache.delete(lruKey);
            }
        }
        this.cache.set(key, { value, timestamp: Date.now() });
    }
    invalidate(key: K) {
        this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
}


export const universeCache = new LRUCache<string, any>(50);
export const bookCache = new LRUCache<string, any>(100);
export const chapterCache = new LRUCache<string, any>(200);

// Character and Section caches for canonical node and deduplication pipeline
export const characterCache = new LRUCache<string, any>(300);
export const sectionCache = new LRUCache<string, any>(500);

// Optional: cache for deduplication status/review (clustered candidates, etc.)
export const deduplicationStatusCache = new LRUCache<string, any>(20);

// Invalidation helpers
export function invalidateCharacterCache(characterId: string) {
    characterCache.invalidate(characterId);
}

export function invalidateSectionCache(sectionId: string) {
    sectionCache.invalidate(sectionId);
}

export function invalidateDeduplicationStatusCache(key: string = 'default') {
    deduplicationStatusCache.invalidate(key);
}

export function clearAllCaches() {
    universeCache.clear();
    bookCache.clear();
    chapterCache.clear();
    characterCache.clear();
    sectionCache.clear();
    deduplicationStatusCache.clear();
}
