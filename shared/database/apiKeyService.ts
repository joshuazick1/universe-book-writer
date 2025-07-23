/**
 * apiKeyService
 *
 * Provides basic API key management utilities for backend and plugins.
 *
 * Usage:
 *   import { apiKeyService } from 'shared/database';
 *   const valid = await apiKeyService.validateKey(key);
 *
 * Edge Cases:
 *   - Handles missing/invalid keys.
 *   - Designed for extension (e.g., DB-backed, in-memory, etc).
 *
 * @remarks
 * - This is a minimal, stateless, in-memory implementation for demonstration.
 * - Replace with persistent storage as needed.
 */

export interface ApiKeyRecord {
    readonly key: string;
    readonly userId: string;
    readonly createdAt: string;
    readonly revoked?: boolean;
}

const apiKeys: ApiKeyRecord[] = [];

export const apiKeyService = {
    /**
     * Validates an API key.
     * @param key - The API key string
     * @returns The ApiKeyRecord if valid, otherwise null
     */
    async validateKey(key: string): Promise<ApiKeyRecord | null> {
        if (!key) return null;
        const rec = apiKeys.find(k => k.key === key && !k.revoked);
        return rec || null;
    },

    /**
     * Adds a new API key record.
     * @param record - The ApiKeyRecord to add
     */
    async addKey(record: ApiKeyRecord): Promise<void> {
        apiKeys.push(record);
    },

    /**
     * Revokes an API key.
     * @param key - The API key string
     * @returns True if revoked, false if not found
     */
    async revokeKey(key: string): Promise<boolean> {
        const rec = apiKeys.find(k => k.key === key);
        if (rec) {
            (rec as any).revoked = true;
            return true;
        }
        return false;
    },

    /**
     * Lists all API keys (for admin/testing only).
     */
    async listKeys(): Promise<readonly ApiKeyRecord[]> {
        return apiKeys.slice();
    },
};

export default apiKeyService;
