/**
 * Plugin Service
 * 
 * Service for managing plugins and their configurations
 */

import { ApiService, type ApiResponse } from '../utils/api-service';

export interface PluginInfo {
    name: string;
    version: string;
    type: string;
    state: string;
    description: string;
    author: string;
}

export interface SubUniverse {
    id: string;
    name: string;
    description: string;
    canonLevel: string;
    supportedEras: string[];
    defaultEra: string;
}

export interface PluginSubUniversesResponse {
    pluginName: string;
    subUniverses: SubUniverse[];
    supportedFeature: boolean;
}

export class PluginService extends ApiService {
    constructor() {
        super('/api');
    }

    /**
     * Get all available plugins
     */
    async getPlugins(params?: {
        type?: string;
        state?: string;
        includeInactive?: boolean;
    }): Promise<ApiResponse<PluginInfo[]>> {
        const searchParams = new URLSearchParams();

        if (params?.type) searchParams.append('type', params.type);
        if (params?.state) searchParams.append('state', params.state);
        if (params?.includeInactive) searchParams.append('includeInactive', 'true');

        const queryString = searchParams.toString();
        const url = `/plugins${queryString ? `?${queryString}` : ''}`;

        return this.get(url);
    }

    /**
     * Get plugin details
     */
    async getPlugin(name: string): Promise<ApiResponse<PluginInfo>> {
        return this.get(`/plugins/${encodeURIComponent(name)}`);
    }

    /**
     * Get sub-universes for a specific plugin (if supported)
     */
    async getPluginSubUniverses(pluginName: string): Promise<ApiResponse<PluginSubUniversesResponse>> {
        return this.get(`/plugins/${encodeURIComponent(pluginName)}/sub-universes`);
    }

    /**
     * Activate a plugin
     */
    async activatePlugin(name: string): Promise<ApiResponse<void>> {
        return this.post(`/plugins/${encodeURIComponent(name)}/activate`, {});
    }

    /**
     * Deactivate a plugin
     */
    async deactivatePlugin(name: string): Promise<ApiResponse<void>> {
        return this.post(`/plugins/${encodeURIComponent(name)}/deactivate`, {});
    }

    /**
     * Update plugin configuration
     */
    async updatePluginConfig(
        name: string,
        config: Record<string, unknown>
    ): Promise<ApiResponse<void>> {
        return this.put(`/plugins/${encodeURIComponent(name)}/config`, config);
    }
}

// Export singleton instance
export const pluginService = new PluginService();
