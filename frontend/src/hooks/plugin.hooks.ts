/**
 * Plugin Hooks
 * 
 * React hooks for managing plugin data and operations
 */

import { useState, useEffect } from 'react';
import { pluginService, type PluginInfo, type SubUniverse } from '../services/plugin.service';

export interface PluginTemplate {
    id: string;
    name: string;
    description: string;
    plugin_id: string;
    icon: string;
    theme_color: string;
    sub_universes: SubUniverseOption[];
    version: string;
    author: string;
}

export interface SubUniverseOption {
    id: string;
    name: string;
    description: string;
    canonLevel?: string;
    supportedEras?: string[];
    defaultEra?: string;
    icon?: string;
}

/**
 * Hook to fetch all available plugins
 */
export function usePlugins() {
    const [plugins, setPlugins] = useState<PluginInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPlugins = async () => {
            try {
                setLoading(true);
                setError(null);
                const response = await pluginService.getPlugins({ type: 'universe' });

                if (response.success && response.data) {
                    setPlugins(response.data);
                } else {
                    setError('Failed to fetch plugins');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchPlugins();
    }, []);

    return { plugins, loading, error, refetch: () => window.location.reload() };
}

/**
 * Hook to fetch plugin templates with their sub-universes
 */
export function usePluginTemplates() {
    const [templates, setTemplates] = useState<PluginTemplate[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPluginTemplates = async () => {
            try {
                setLoading(true);
                setError(null);

                // First, get all universe plugins
                const pluginsResponse = await pluginService.getPlugins({ type: 'universe' });

                if (!pluginsResponse.success || !pluginsResponse.data) {
                    throw new Error('Failed to fetch plugins');
                }

                const templates: PluginTemplate[] = [];

                // For each plugin, get its details and sub-universes
                for (const plugin of pluginsResponse.data) {
                    try {
                        // Get sub-universes if the plugin supports them
                        const subUniversesResponse = await pluginService.getPluginSubUniverses(plugin.name);

                        let subUniverses: SubUniverseOption[] = [];
                        if (subUniversesResponse.success && subUniversesResponse.data?.subUniverses) {
                            subUniverses = subUniversesResponse.data.subUniverses.map(su => ({
                                id: su.id,
                                name: su.name,
                                description: su.description,
                                canonLevel: su.canonLevel,
                                supportedEras: su.supportedEras,
                                defaultEra: su.defaultEra,
                                icon: getSubUniverseIcon(plugin.name, su.id)
                            }));
                        }

                        // Create plugin template
                        const template: PluginTemplate = {
                            id: plugin.name,
                            name: getPluginDisplayName(plugin.name),
                            description: plugin.description,
                            plugin_id: plugin.name,
                            icon: getPluginIcon(plugin.name),
                            theme_color: getPluginThemeColor(plugin.name),
                            sub_universes: subUniverses,
                            version: plugin.version,
                            author: plugin.author
                        };

                        templates.push(template);
                    } catch (subErr) {
                        // If sub-universes fail, still include the plugin without sub-universes
                        console.warn(`Failed to fetch sub-universes for ${plugin.name}:`, subErr);

                        const template: PluginTemplate = {
                            id: plugin.name,
                            name: getPluginDisplayName(plugin.name),
                            description: plugin.description,
                            plugin_id: plugin.name,
                            icon: getPluginIcon(plugin.name),
                            theme_color: getPluginThemeColor(plugin.name),
                            sub_universes: [],
                            version: plugin.version,
                            author: plugin.author
                        };

                        templates.push(template);
                    }
                }

                setTemplates(templates);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                setLoading(false);
            }
        };

        fetchPluginTemplates();
    }, []);

    return { templates, loading, error, refetch: () => window.location.reload() };
}

/**
 * Helper functions for plugin display
 */
function getPluginDisplayName(pluginName: string): string {
    const nameMap: Record<string, string> = {
        'star-trek-universe': 'Star Trek Universe',
        'star-wars-universe': 'Star Wars Universe',
        'lotr-universe': 'Lord of the Rings Universe',
        'harry-potter-universe': 'Harry Potter Universe'
    };
    return nameMap[pluginName] || pluginName.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getPluginIcon(pluginName: string): string {
    const iconMap: Record<string, string> = {
        'star-trek-universe': '🖖',
        'star-wars-universe': '⚔️',
        'lotr-universe': '💍',
        'harry-potter-universe': '⚡'
    };
    return iconMap[pluginName] || '🌌';
}

function getPluginThemeColor(pluginName: string): string {
    const colorMap: Record<string, string> = {
        'star-trek-universe': 'blue',
        'star-wars-universe': 'yellow',
        'lotr-universe': 'green',
        'harry-potter-universe': 'purple'
    };
    return colorMap[pluginName] || 'gray';
}

function getSubUniverseIcon(pluginName: string, subUniverseId: string): string {
    const iconMap: Record<string, Record<string, string>> = {
        'star-trek-universe': {
            'prime': '🌟',
            'kelvin': '⭐',
            'mirror': '🪞',
            'custom': '🛠️'
        },
        'star-wars-universe': {
            'canon': '🏰',
            'legends': '📚',
            'old-republic': '⚔️',
            'custom': '🛠️'
        }
    };

    return iconMap[pluginName]?.[subUniverseId] || '🌌';
}
