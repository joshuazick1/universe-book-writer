/**
 * Model Availability Service
 * 
 * Service to check which models are actually available on each server
 * before creating benchmark jobs.
 */

import { ServerId } from '../../../shared/types/server.js';
import { logger } from '../../../shared/logging/logger.js';
import { decodeIfBase64 } from '../utils/decodeUtils.js';

export interface ModelAvailability {
    serverId: ServerId;
    availableModels: string[];
    lastChecked: Date;
    isHealthy: boolean;
}

export class ModelAvailabilityService {
    private modelCache = new Map<ServerId, ModelAvailability>();
    private cacheExpiryMs = 5 * 60 * 1000; // 5 minutes

    /**
     * Get available models for a specific server
     */
    async getAvailableModels(serverId: ServerId): Promise<string[]> {
        // Check cache first
        const cached = this.modelCache.get(serverId);
        if (cached && (Date.now() - cached.lastChecked.getTime()) < this.cacheExpiryMs) {
            return cached.availableModels;
        }

        try {
            const decodedServerId = decodeIfBase64(serverId);
            logger.debug(`[ModelAvailability] Checking available models on ${serverId} -> ${decodedServerId}`);

            const response = await fetch(`${decodedServerId}/api/tags`, {
                method: 'GET',
                signal: AbortSignal.timeout(5000)
            });

            if (!response.ok) {
                throw new Error(`Server responded with ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();
            const models = data.models?.map((model: any) => model.name) || [];

            // Update cache
            this.modelCache.set(serverId, {
                serverId,
                availableModels: models,
                lastChecked: new Date(),
                isHealthy: true
            });

            logger.info(`[ModelAvailability] Found ${models.length} models on ${serverId}: ${models.join(', ')}`);
            return models;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.warn(`[ModelAvailability] Failed to get models from ${serverId}: ${errorMessage}`);

            // Cache failure result
            this.modelCache.set(serverId, {
                serverId,
                availableModels: [],
                lastChecked: new Date(),
                isHealthy: false
            });

            return [];
        }
    }

    /**
     * Check if a specific model is available on a server
     */
    async isModelAvailable(serverId: ServerId, modelId: string): Promise<boolean> {
        const availableModels = await this.getAvailableModels(serverId);
        return availableModels.includes(modelId);
    }

    /**
     * Get all server-model combinations that are actually available
     */
    async getAvailableServerModelCombinations(serverIds: ServerId[]): Promise<Array<{ serverId: ServerId, modelId: string }>> {
        const combinations: Array<{ serverId: ServerId, modelId: string }> = [];

        for (const serverId of serverIds) {
            const models = await this.getAvailableModels(serverId);
            for (const modelId of models) {
                combinations.push({ serverId, modelId });
            }
        }

        return combinations;
    }

    /**
     * Clear cache for a specific server or all servers
     */
    clearCache(serverId?: ServerId): void {
        if (serverId) {
            this.modelCache.delete(serverId);
        } else {
            this.modelCache.clear();
        }
        logger.debug(`[ModelAvailability] Cleared cache${serverId ? ` for ${serverId}` : ''}`);
    }
}
