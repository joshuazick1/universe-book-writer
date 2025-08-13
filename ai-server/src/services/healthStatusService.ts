/**
 * HealthStatusService module for model/server health status logic
 * @module HealthStatusService
 * @description Provides health status update, expiry calculation, and node update logic for model/server pairs.
 * @example
 * import { HealthStatusService } from './healthStatusService';
 * await HealthStatusService.syncModelServerHealthStatus(ragManager, benchmarkManager, params);
 * // See README.md for more usage and edge cases
 */

import type { HealthStatusParams, HealthStatusUpdate } from '../../../shared/types/health.ts';
import type { NodeType } from '../../../shared/types/nodeTypes.ts';

export class HealthStatusService {
    /**
     * Sync health status for a model/server pair
     */
    static async syncModelServerHealthStatus(params: HealthStatusParams): Promise<void> {
        const {
            ragManager,
            benchmarkManager,
            serverId,
            modelName,
            status,
            reason,
            expiryMs = 24 * 60 * 60 * 1000
        } = params;
        const now = new Date();
        const nodeId = `performance:${serverId}:${modelName}`;
        let unhealthyCount = 1;
        let baseExpiryMs = expiryMs;
        let createdTime = now;
        let previousReportedAt: string | undefined = undefined;
        let lastHealthStatus: string | undefined = undefined;
        let node: any = null;
        try {
            node = await ragManager.getNode(nodeId);
            if (node && node.content && node.content.attributes) {
                const health = node.content.attributes.health || {};
                unhealthyCount = (health.unhealthyCount || 0) + (status === 'unhealthy' ? 1 : 0);
                baseExpiryMs = health.baseExpiryMs || expiryMs;
                createdTime = health.createdTime ? new Date(health.createdTime) : now;
                previousReportedAt = health.reportedAt;
                lastHealthStatus = health.status;
                benchmarkManager?.logDebug(`[HEALTH] Found existing model-performance node for ${serverId}:${modelName} with health: ${JSON.stringify(health)}`);
            } else {
                benchmarkManager?.logDebug(`[HEALTH] No existing model-performance node found for ${serverId}:${modelName}`);
            }
        } catch (err) {
            benchmarkManager?.logDebug(`[HEALTH] Error fetching model-performance node for ${serverId}:${modelName}: ${err}`);
        }
        // Exponential backoff: double expiry for each additional unhealthy mark (max 30 days)
        const maxExpiryMs = 30 * 24 * 60 * 60 * 1000;
        const calculatedExpiryMs = Math.min(baseExpiryMs * Math.pow(2, unhealthyCount - 1), maxExpiryMs);
        const expiresAt = new Date(now.getTime() + calculatedExpiryMs);
        // Update or create the model-performance node with health info
        const healthUpdate = {
            status,
            reason,
            unhealthyCount,
            baseExpiryMs,
            createdTime,
            reportedAt: now.toISOString(),
            lastHealthStatus,
            expiresAt: expiresAt.toISOString()
        };
        if (node) {
            const updatedAttributes = {
                ...node.content.attributes,
                health: healthUpdate
            };
            await ragManager.updateNode(nodeId, {
                content: {
                    ...node.content,
                    attributes: updatedAttributes
                },
                timestamps: {
                    ...node.timestamps,
                    modified: now
                }
            });
            benchmarkManager?.logDebug(`[HEALTH] Updated health for model-performance node ${nodeId}: serverId=${serverId}, modelName=${modelName}, health=${JSON.stringify(healthUpdate)}`);
            benchmarkManager?.logDebug(`[HEALTH] Full updated node: ${JSON.stringify({ nodeId, serverId, modelName, updatedAttributes })}`);
        } else {
            // Create a new model-performance node with health info
            const newNode = {
                id: nodeId,
                type: 'model-performance' as NodeType,
                title: `${modelName} Performance on ${serverId}`,
                content: {
                    description: `Performance and usage tracking for ${modelName} on server ${serverId}`,
                    attributes: {
                        serverId,
                        modelName,
                        health: healthUpdate
                    }
                },
                metadata: {
                    universeId: 'system',
                    ownerId: 'system',
                    sourcePlugin: 'ai-orchestrator',
                    sensitivity: "public" as 'public',
                    tags: [],
                    version: 1
                },
                summaries: { brief: '', medium: '', detailed: '' },
                embeddings: [],
                privacy: { level: 'public', encrypted: false, shareable: true },
                timestamps: {
                    created: now,
                    modified: now
                },
                active: true
            };
            await ragManager.createNode(newNode);
            benchmarkManager?.logDebug(`[HEALTH] Created new model-performance node with health for ${nodeId}: serverId=${serverId}, modelName=${modelName}, health=${JSON.stringify(healthUpdate)}`);
            benchmarkManager?.logDebug(`[HEALTH] Full created node: ${JSON.stringify(newNode)}`);
        }
    }
}
