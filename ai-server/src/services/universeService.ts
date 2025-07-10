import { universeCache } from '../infrastructure/cache/cacheProvider.js';
import type { Universe } from '../models/Universe.js';
import { fetchUniverses, createUniverse, updateUniverse, deleteUniverse } from '../repositories/ragNodeRepository.js';
/**
 * Create a new universe and invalidate cache.
 */
export async function createUniverseAndInvalidate(universe: Universe): Promise<Universe> {
    const result = await createUniverse(universe);
    invalidateUniverseCache();
    return result;
}

/**
 * Update a universe and invalidate cache.
 */
export async function updateUniverseAndInvalidate(id: string, update: Partial<Universe>): Promise<boolean> {
    const result = await updateUniverse(id, update);
    if (result) invalidateUniverseCache();
    return result;
}

/**
 * Delete a universe and invalidate cache.
 */
export async function deleteUniverseAndInvalidate(id: string): Promise<boolean> {
    const result = await deleteUniverse(id);
    if (result) invalidateUniverseCache();
    return result;
}

/**
 * Fetch all universes, using cache if available.
 */
export async function getUniverses(): Promise<Universe[]> {
    const cacheKey = 'all';
    const cached = universeCache.get(cacheKey);
    if (cached) return cached;
    const universes = await fetchUniverses();
    universeCache.set(cacheKey, universes);
    return universes;
}

/**
 * Invalidate universe cache (call on create/update/delete)
 */
export function invalidateUniverseCache() {
    universeCache.clear();
}
