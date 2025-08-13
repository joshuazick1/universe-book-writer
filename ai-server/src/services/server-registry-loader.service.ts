/**
 * Server Registry Loader Service
 * 
 * Loads servers from configuration files and registers them in the queue system on startup
 */

import { readFile } from 'fs/promises';
import { resolve } from 'path';
import { ServerInfo, ServerId } from '../../../shared/types/server.js';
import { universalQueueService } from './universal-queue.service.js';
import { logger } from '../../../shared/logging/logger.js';

interface ServerConfig {
    id: string;
    url: string;
    type: string;
    healthy: boolean;
    lastResponseTime: number | null;
    models: string[];
}

export class ServerRegistryLoaderService {
    private configPath: string;

    constructor() {
        // Default to the orchestrator servers file
        this.configPath = resolve(process.cwd(), 'data', 'orchestrator-servers.json');
    }

    /**
     * Load and register all servers from the configuration file
     */
    async loadAndRegisterServers(): Promise<void> {
        try {
            logger.info('[ServerRegistryLoader] Loading servers from configuration file...');

            const serversData = await readFile(this.configPath, 'utf-8');
            const serverConfigs: ServerConfig[] = JSON.parse(serversData);

            logger.info(`[ServerRegistryLoader] Found ${serverConfigs.length} servers in configuration`);

            let registeredCount = 0;
            let healthyCount = 0;

            for (const config of serverConfigs) {
                try {
                    const serverInfo: ServerInfo = {
                        id: config.id as ServerId,
                        baseUrl: config.url,
                        availableModels: config.models || [], // Will be discovered later
                        loadedModels: [],
                        currentLoad: 0,
                        queueDepth: 0,
                        availableMemoryMB: 8192, // Default, will be updated by health checks
                        hasGPU: true, // Assume true, will be updated by health checks
                        isHealthy: config.healthy,
                        lastResponseTime: config.lastResponseTime || 0,
                        errorRate: 0
                    };

                    // Register server in queue service
                    universalQueueService.registerServer(serverInfo);
                    registeredCount++;

                    if (serverInfo.isHealthy) {
                        healthyCount++;
                    }

                    logger.debug(`[ServerRegistryLoader] Registered server: ${config.id} (${config.url})`);

                } catch (serverError) {
                    const errorMessage = serverError instanceof Error ? serverError.message : 'Unknown error';
                    logger.warn(`[ServerRegistryLoader] Failed to register server ${config.id}: ${errorMessage}`);
                }
            }

            logger.info(`[ServerRegistryLoader] Successfully registered ${registeredCount} servers (${healthyCount} healthy)`);

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error(`[ServerRegistryLoader] Failed to load servers from ${this.configPath}: ${errorMessage}`);
            throw error;
        }
    }

    /**
     * Reload servers from configuration (for runtime updates)
     */
    async reloadServers(): Promise<void> {
        logger.info('[ServerRegistryLoader] Reloading servers from configuration...');
        await this.loadAndRegisterServers();
    }

    /**
     * Get the current configuration file path
     */
    getConfigPath(): string {
        return this.configPath;
    }

    /**
     * Set a custom configuration file path
     */
    setConfigPath(path: string): void {
        this.configPath = path;
        logger.info(`[ServerRegistryLoader] Configuration path updated to: ${path}`);
    }
}

// Export singleton instance
export const serverRegistryLoader = new ServerRegistryLoaderService();
