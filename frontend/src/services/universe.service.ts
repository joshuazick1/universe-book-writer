/**
 * Universe API Service
 * 
 * Service layer for universe management API endpoints
 */

import { ApiService } from '../utils/api-service.js';
import type {
    CreateUniverseRequest,
    UpdateUniverseRequest,
    UniverseResponse,
    UniverseListResponse,
    PluginConfigRequest,
    PluginConfigResponse,
    PermissionUpdateRequest,
    SyncStatusResponse,
    ValidationResponse,
    ValidationRequest
} from '../types/universe.types';

export class UniverseService extends ApiService {
    private readonly basePath = '/universes';

    constructor() {
        super('/api');
    }/**
     * Create a new universe
     */
    async createUniverse(data: CreateUniverseRequest): Promise<UniverseResponse> {
        return this.post<UniverseResponse>(this.basePath, data);
    }

    /**
     * Get list of universes for current user
     */
    async listUniverses(params?: {
        page?: number;
        limit?: number;
        search?: string;
        plugin_id?: string;
    }): Promise<UniverseListResponse> {
        const queryParams = new URLSearchParams();
        if (params?.page) queryParams.append('page', params.page.toString());
        if (params?.limit) queryParams.append('limit', params.limit.toString());
        if (params?.search) queryParams.append('search', params.search);
        if (params?.plugin_id) queryParams.append('plugin_id', params.plugin_id);

        const url = queryParams.toString()
            ? `${this.basePath}?${queryParams.toString()}`
            : this.basePath;

        return this.get<UniverseListResponse>(url);
    }

    /**
     * Get universe by ID
     */
    async getUniverse(id: string): Promise<UniverseResponse> {
        return this.get<UniverseResponse>(`${this.basePath}/${id}`);
    }

    /**
     * Update universe
     */
    async updateUniverse(id: string, data: UpdateUniverseRequest): Promise<UniverseResponse> {
        return this.put<UniverseResponse>(`${this.basePath}/${id}`, data);
    }

    /**
     * Delete universe
     */
    async deleteUniverse(id: string): Promise<void> {
        return this.delete(`${this.basePath}/${id}`);
    }

    /**
     * Configure plugin for universe
     */
    async configurePlugin(id: string, config: PluginConfigRequest): Promise<PluginConfigResponse> {
        return this.post<PluginConfigResponse>(`${this.basePath}/${id}/plugin-config`, config);
    }

    /**
     * Get plugin configuration
     */
    async getPluginConfig(id: string): Promise<PluginConfigResponse> {
        return this.get<PluginConfigResponse>(`${this.basePath}/${id}/plugin-config`);
    }

    /**
     * Update permissions
     */
    async updatePermissions(id: string, permissions: PermissionUpdateRequest): Promise<void> {
        return this.post(`${this.basePath}/${id}/permissions`, permissions);
    }

    /**
     * Get permissions
     */
    async getPermissions(id: string): Promise<PermissionUpdateRequest> {
        return this.get<PermissionUpdateRequest>(`${this.basePath}/${id}/permissions`);
    }

    /**
     * Add contributor to universe
     */
    async addContributor(id: string, data: { user_id: string; role: string }): Promise<void> {
        return this.post(`${this.basePath}/${id}/contributors`, data);
    }

    /**
     * Remove contributor from universe
     */
    async removeContributor(id: string, userId: string): Promise<void> {
        return this.delete(`${this.basePath}/${id}/contributors/${userId}`);
    }

    /**
     * Make universe public
     */
    async makePublic(id: string): Promise<void> {
        return this.post(`${this.basePath}/${id}/make-public`);
    }

    /**
     * Make universe private
     */
    async makePrivate(id: string): Promise<void> {
        return this.post(`${this.basePath}/${id}/make-private`);
    }

    /**
     * Configure encryption
     */
    async configureEncryption(id: string, config: { encryption_enabled: boolean; encryption_scope: string }): Promise<void> {
        return this.post(`${this.basePath}/${id}/encryption`, config);
    }

    /**
     * Get sync status
     */
    async getSyncStatus(id: string): Promise<SyncStatusResponse> {
        return this.get<SyncStatusResponse>(`${this.basePath}/${id}/sync-status`);
    }

    /**
     * Regenerate sync token
     */
    async regenerateSyncToken(id: string): Promise<{ sync_token: string }> {
        return this.post<{ sync_token: string }>(`${this.basePath}/${id}/sync-token/regenerate`);
    }

    /**
     * Validate universe
     */
    async validateUniverse(id: string): Promise<ValidationResponse> {
        return this.get<ValidationResponse>(`${this.basePath}/${id}/validation`);
    }

    /**
     * Validate with custom rules
     */
    async validateWithCustomRules(id: string, rules: ValidationRequest): Promise<ValidationResponse> {
        return this.post<ValidationResponse>(`${this.basePath}/${id}/validation/custom`, rules);
    }

    /**
     * Configure sub-universe (Star Trek specific)
     */
    async configureSubUniverse(id: string, config: { sub_universe: string; settings: any }): Promise<void> {
        return this.post(`${this.basePath}/${id}/sub-universe`, config);
    }

    /**
     * Get sub-universe configuration
     */
    async getSubUniverseConfig(id: string): Promise<{ sub_universe: string; settings: any }> {
        return this.get<{ sub_universe: string; settings: any }>(`${this.basePath}/${id}/sub-universe`);
    }

    /**
     * Get plugin data
     */
    async getPluginData(id: string): Promise<any> {
        return this.get(`${this.basePath}/${id}/plugin-data`);
    }

    /**
     * Preserve plugin data
     */
    async preservePluginData(id: string, data: { plugin_id: string; preservation_reason: string }): Promise<void> {
        return this.post(`${this.basePath}/${id}/plugin-data/preserve`, data);
    }

    /**
     * Get orphaned data
     */
    async getOrphanedData(id: string): Promise<any[]> {
        return this.get<any[]>(`${this.basePath}/${id}/orphaned-data`);
    }

    /**
     * Recover orphaned data
     */
    async recoverOrphanedData(id: string, dataId: string, recoveryOptionId: string): Promise<void> {
        return this.post(`${this.basePath}/${id}/orphaned-data/${dataId}/recover`, { recovery_option_id: recoveryOptionId });
    }
}

// Export singleton instance
export const universeService = new UniverseService();
