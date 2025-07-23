/**
 * Plugin Hook
 * 
 * React hook for managing plugin data and sub-universe selection
 */

import { useState, useEffect } from 'react';
import { pluginService, type PluginInfo, type SubUniverse } from '../services/plugin.service';

export interface UsePluginSubUniversesResult {
    subUniverses: SubUniverse[];
    loading: boolean;
    error: string | null;
    supportedFeature: boolean;
}

export interface UsePluginsResult {
    plugins: PluginInfo[];
    loading: boolean;
    error: string | null;
}

/**
 * Hook to get sub-universes for a specific plugin
 */
export function usePluginSubUniverses(pluginName: string | null): UsePluginSubUniversesResult {
    const [subUniverses, setSubUniverses] = useState<SubUniverse[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [supportedFeature, setSupportedFeature] = useState(false);

    useEffect(() => {
        let mounted = true;

        const fetchSubUniverses = async () => {
            if (!pluginName) {
                setSubUniverses([]);
                setSupportedFeature(false);
                setError(null);
                return;
            }

            setLoading(true);
            setError(null);

            try {
                const response = await pluginService.getPluginSubUniverses(pluginName);

                if (mounted) {
                    if (response.success) {
                        setSubUniverses(response.data.subUniverses);
                        setSupportedFeature(response.data.supportedFeature);
                    } else {
                        setError('Failed to load sub-universes');
                        setSubUniverses([]);
                        setSupportedFeature(false);
                    }
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Unknown error');
                    setSubUniverses([]);
                    setSupportedFeature(false);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        fetchSubUniverses();

        return () => {
            mounted = false;
        };
    }, [pluginName]);

    return {
        subUniverses,
        loading,
        error,
        supportedFeature
    };
}

/**
 * Hook to get all available plugins
 */
export function usePlugins(params?: {
    type?: string;
    state?: string;
    includeInactive?: boolean;
}): UsePluginsResult {
    const [plugins, setPlugins] = useState<PluginInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let mounted = true;

        const fetchPlugins = async () => {
            setLoading(true);
            setError(null);

            try {
                const response = await pluginService.getPlugins(params);

                if (mounted) {
                    if (response.success) {
                        setPlugins(response.data);
                    } else {
                        setError('Failed to load plugins');
                        setPlugins([]);
                    }
                }
            } catch (err) {
                if (mounted) {
                    setError(err instanceof Error ? err.message : 'Unknown error');
                    setPlugins([]);
                }
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        };

        fetchPlugins();

        return () => {
            mounted = false;
        };
    }, [params?.type, params?.state, params?.includeInactive]);

    return {
        plugins,
        loading,
        error
    };
}
