/**
 * Universe Management Hooks
 * 
 * React hooks for universe CRUD operations and state management
 */

import { useState, useEffect, useCallback } from 'react';
import { universeService } from '../services/universe.service';
import type {
    Universe,
    CreateUniverseRequest,
    UpdateUniverseRequest,
    UniverseFilters,
    UseUniverseState,
    UseUniverseListState,
    UniverseError,
    PluginConfiguration,
    PermissionUpdateRequest,
    SyncStatusResponse,
    ValidationResponse
} from '../types/universe.types';

/**
 * Hook for managing a single universe
 */
export function useUniverse(id: string | null) {
    const [state, setState] = useState<UseUniverseState>({
        universe: null,
        loading: false,
        error: null,
    });

    const fetchUniverse = useCallback(async () => {
        if (!id) return;

        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const response = await universeService.getUniverse(id);
            setState(prev => ({
                ...prev,
                universe: response.data,
                loading: false
            }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                error: error as UniverseError,
                loading: false
            }));
        }
    }, [id]);

    const updateUniverse = useCallback(async (updates: UpdateUniverseRequest) => {
        if (!id) return null;

        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const response = await universeService.updateUniverse(id, updates);
            setState(prev => ({
                ...prev,
                universe: response.data,
                loading: false
            }));
            return response.data;
        } catch (error) {
            setState(prev => ({
                ...prev,
                error: error as UniverseError,
                loading: false
            }));
            return null;
        }
    }, [id]);

    const deleteUniverse = useCallback(async () => {
        if (!id) return false;

        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            await universeService.deleteUniverse(id);
            setState(prev => ({
                ...prev,
                universe: null,
                loading: false
            }));
            return true;
        } catch (error) {
            setState(prev => ({
                ...prev,
                error: error as UniverseError,
                loading: false
            }));
            return false;
        }
    }, [id]);

    useEffect(() => {
        fetchUniverse();
    }, [fetchUniverse]);

    return {
        ...state,
        refetch: fetchUniverse,
        update: updateUniverse,
        delete: deleteUniverse,
    };
}

/**
 * Hook for managing universe list
 */
export function useUniverseList(filters?: Partial<UniverseFilters>) {
    const DEFAULT_LIMIT = 12;

    const [state, setState] = useState<UseUniverseListState>({
        universes: [],
        loading: false,
        error: null,
        pagination: {
            page: 1,
            limit: DEFAULT_LIMIT,
            total: 0,
            pages: 0,
        },
    });

    const fetchUniverses = useCallback(async (page = 1) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const response = await universeService.listUniverses({
                page,
                limit: DEFAULT_LIMIT,
                search: filters?.search,
                plugin_id: filters?.plugin_id,
            });

            setState(prev => ({
                ...prev,
                universes: page === 1 ? response.data : [...prev.universes, ...response.data],
                pagination: response.pagination,
                loading: false
            }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                error: error as UniverseError,
                loading: false
            }));
        }
    }, [filters?.search, filters?.plugin_id]);

    const createUniverse = useCallback(async (data: CreateUniverseRequest) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            const response = await universeService.createUniverse(data);
            setState(prev => ({
                ...prev,
                universes: [response.data, ...prev.universes],
                loading: false
            }));
            return response.data;
        } catch (error) {
            setState(prev => ({
                ...prev,
                error: error as UniverseError,
                loading: false
            }));
            return null;
        }
    }, []);

    const updateUniverseInList = useCallback((id: string, updates: Partial<Universe>) => {
        setState(prev => ({
            ...prev,
            universes: prev.universes.map(universe =>
                universe.id === id ? { ...universe, ...updates } : universe
            ),
        }));
    }, []);    const removeUniverseFromList = useCallback(async (id: string) => {
        setState(prev => ({ ...prev, loading: true, error: null }));

        try {
            await universeService.deleteUniverse(id);
            setState(prev => ({
                ...prev,
                universes: prev.universes.filter(universe => universe.id !== id),
                loading: false
            }));
            return true;
        } catch (error) {
            setState(prev => ({
                ...prev,
                error: error as UniverseError,
                loading: false
            }));
            return false;
        }
    }, []);

    const loadMore = useCallback(() => {
        setState(prev => {
            if (prev.pagination.page < prev.pagination.pages && !prev.loading) {
                fetchUniverses(prev.pagination.page + 1);
            }
            return prev;
        });
    }, [fetchUniverses]);

    useEffect(() => {
        fetchUniverses(1);
    }, [fetchUniverses]);
    return {
        ...state,
        refetch: () => fetchUniverses(1),
        create: createUniverse,
        updateInList: updateUniverseInList,
        removeFromList: removeUniverseFromList,
        loadMore,
        hasMore: state.pagination ? state.pagination.page < state.pagination.pages : false,
    };
}

/**
 * Hook for plugin configuration
 */
export function usePluginConfig(universeId: string | null) {
    const [config, setConfig] = useState<PluginConfiguration | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<UniverseError | null>(null);

    const fetchConfig = useCallback(async () => {
        if (!universeId) return;

        setLoading(true);
        setError(null);

        try {
            const response = await universeService.getPluginConfig(universeId);
            setConfig(response.data);
        } catch (error) {
            setError(error as UniverseError);
        } finally {
            setLoading(false);
        }
    }, [universeId]);

    const updateConfig = useCallback(async (newConfig: Partial<PluginConfiguration>) => {
        if (!universeId || !config) return null;

        setLoading(true);
        setError(null);

        try {
            const fullConfig = { ...config, ...newConfig };
            const response = await universeService.configurePlugin(universeId, fullConfig);
            setConfig(response.data);
            return response.data;
        } catch (error) {
            setError(error as UniverseError);
            return null;
        } finally {
            setLoading(false);
        }
    }, [universeId, config]);

    useEffect(() => {
        fetchConfig();
    }, [fetchConfig]);

    return {
        config,
        loading,
        error,
        refetch: fetchConfig,
        update: updateConfig,
    };
}

/**
 * Hook for permissions management
 */
export function usePermissions(universeId: string | null) {
    const [permissions, setPermissions] = useState<PermissionUpdateRequest | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<UniverseError | null>(null);

    const fetchPermissions = useCallback(async () => {
        if (!universeId) return;

        setLoading(true);
        setError(null);

        try {
            const response = await universeService.getPermissions(universeId);
            setPermissions(response);
        } catch (error) {
            setError(error as UniverseError);
        } finally {
            setLoading(false);
        }
    }, [universeId]);

    const updatePermissions = useCallback(async (newPermissions: PermissionUpdateRequest) => {
        if (!universeId) return false;

        setLoading(true);
        setError(null);

        try {
            await universeService.updatePermissions(universeId, newPermissions);
            setPermissions(prev => ({ ...prev, ...newPermissions }));
            return true;
        } catch (error) {
            setError(error as UniverseError);
            return false;
        } finally {
            setLoading(false);
        }
    }, [universeId]);

    const addContributor = useCallback(async (userId: string, role: string) => {
        if (!universeId) return false;

        setLoading(true);
        setError(null);

        try {
            await universeService.addContributor(universeId, { user_id: userId, role });
            // Refresh permissions to get updated state
            await fetchPermissions();
            return true;
        } catch (error) {
            setError(error as UniverseError);
            return false;
        } finally {
            setLoading(false);
        }
    }, [universeId, fetchPermissions]);

    const removeContributor = useCallback(async (userId: string) => {
        if (!universeId) return false;

        setLoading(true);
        setError(null);

        try {
            await universeService.removeContributor(universeId, userId);
            // Refresh permissions to get updated state
            await fetchPermissions();
            return true;
        } catch (error) {
            setError(error as UniverseError);
            return false;
        } finally {
            setLoading(false);
        }
    }, [universeId, fetchPermissions]);

    useEffect(() => {
        fetchPermissions();
    }, [fetchPermissions]);

    return {
        permissions,
        loading,
        error,
        refetch: fetchPermissions,
        update: updatePermissions,
        addContributor,
        removeContributor,
    };
}

/**
 * Hook for sync status management
 */
export function useSyncStatus(universeId: string | null) {
    const [syncStatus, setSyncStatus] = useState<SyncStatusResponse['data'] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<UniverseError | null>(null);

    const fetchSyncStatus = useCallback(async () => {
        if (!universeId) return;

        setLoading(true);
        setError(null);

        try {
            const response = await universeService.getSyncStatus(universeId);
            setSyncStatus(response.data);
        } catch (error) {
            setError(error as UniverseError);
        } finally {
            setLoading(false);
        }
    }, [universeId]);

    const regenerateToken = useCallback(async () => {
        if (!universeId) return false;

        setLoading(true);
        setError(null);

        try {
            const response = await universeService.regenerateSyncToken(universeId);
            setSyncStatus(prev => prev ? { ...prev, sync_token: response.sync_token } : null);
            return true;
        } catch (error) {
            setError(error as UniverseError);
            return false;
        } finally {
            setLoading(false);
        }
    }, [universeId]);

    useEffect(() => {
        fetchSyncStatus();
    }, [fetchSyncStatus]);

    return {
        syncStatus,
        loading,
        error,
        refetch: fetchSyncStatus,
        regenerateToken,
    };
}

/**
 * Hook for universe validation
 */
export function useValidation(universeId: string | null) {
    const [validation, setValidation] = useState<ValidationResponse['data'] | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<UniverseError | null>(null);

    const validateUniverse = useCallback(async () => {
        if (!universeId) return;

        setLoading(true);
        setError(null);

        try {
            const response = await universeService.validateUniverse(universeId);
            setValidation(response.data);
        } catch (error) {
            setError(error as UniverseError);
        } finally {
            setLoading(false);
        }
    }, [universeId]);

    const validateWithCustomRules = useCallback(async (rules: any) => {
        if (!universeId) return;

        setLoading(true);
        setError(null);

        try {
            const response = await universeService.validateWithCustomRules(universeId, { rules });
            setValidation(response.data);
        } catch (error) {
            setError(error as UniverseError);
        } finally {
            setLoading(false);
        }
    }, [universeId]);

    return {
        validation,
        loading,
        error,
        validate: validateUniverse,
        validateWithCustomRules,
    };
}
