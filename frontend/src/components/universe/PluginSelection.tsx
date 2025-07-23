/**
 * Plugin Selection Component
 * 
 * Component for selecting a plugin and optionally a sub-universe (plugin-dependent)
 */

import React, { useState, useEffect } from 'react';
import { Select } from '../base/Select/Select';
import { usePlugins, usePluginSubUniverses } from '../../hooks/usePlugin';
import type { PluginConfiguration } from '../../types/universe.types';

interface PluginSelectionProps {
    selectedPlugin?: string;
    selectedSubUniverse?: string;
    onPluginChange: (pluginId: string) => void;
    onSubUniverseChange: (subUniverseId: string) => void;
    onConfigChange: (config: Partial<PluginConfiguration>) => void;
    className?: string;
    error?: string;
}

export function PluginSelection({
    selectedPlugin,
    selectedSubUniverse,
    onPluginChange,
    onSubUniverseChange,
    onConfigChange,
    className = '',
    error
}: PluginSelectionProps) {
    const { plugins, loading: pluginsLoading, error: pluginsError } = usePlugins({
        type: 'universe',
        state: 'active',
        includeInactive: true
    });

    const {
        subUniverses,
        loading: subUniversesLoading,
        error: subUniversesError,
        supportedFeature
    } = usePluginSubUniverses(selectedPlugin || null);

    const [selectedSubUniverseLocal, setSelectedSubUniverseLocal] = useState(selectedSubUniverse || '');

    // Reset sub-universe when plugin changes
    useEffect(() => {
        if (selectedPlugin && subUniverses.length > 0) {
            // Auto-select first sub-universe if none selected
            if (!selectedSubUniverseLocal) {
                const defaultSubUniverse = subUniverses.find(su => su.id === 'prime') || subUniverses[0];
                setSelectedSubUniverseLocal(defaultSubUniverse.id);
                onSubUniverseChange(defaultSubUniverse.id);
            }
        } else {
            setSelectedSubUniverseLocal('');
            onSubUniverseChange('');
        }
    }, [selectedPlugin, subUniverses, onSubUniverseChange]);

    // Update configuration when plugin or sub-universe changes
    useEffect(() => {
        if (selectedPlugin) {
            const plugin = plugins.find(p => p.name === selectedPlugin);
            if (plugin) {
                const selectedSubUniverseData = subUniverses.find(su => su.id === selectedSubUniverseLocal);

                onConfigChange({
                    active_plugin: selectedPlugin,
                    plugin_version: plugin.version,
                    sub_universe: selectedSubUniverseLocal || 'default',
                    canon_compliance: selectedSubUniverseData?.canonLevel as any || 'flexible', theme_config: {
                        theme_id: 'default', // User can change theme independently via theme selector
                        variant: 'dark'
                    }
                });
            }
        }
    }, [selectedPlugin, selectedSubUniverseLocal, plugins, subUniverses, onConfigChange]);

    const handlePluginChange = (value: string) => {
        onPluginChange(value);
        setSelectedSubUniverseLocal(''); // Reset sub-universe selection
    };

    const handleSubUniverseChange = (value: string) => {
        setSelectedSubUniverseLocal(value);
        onSubUniverseChange(value);
    };

    // Helper functions for consistent styling
    const getLabelStyles = () => ({
        color: 'var(--color-universe-text)',
        opacity: 0.8
    });

    const getSecondaryTextStyles = () => ({
        color: 'var(--color-universe-text)',
        opacity: 0.6
    });

    const getInfoBoxStyles = () => ({
        backgroundColor: 'rgba(var(--color-universe-primary-rgb), 0.1)',
        borderColor: 'rgba(var(--color-universe-primary-rgb), 0.3)',
        color: 'var(--color-universe-text)'
    });

    const getBadgeStyles = (variant: 'primary' | 'secondary') => ({
        backgroundColor: variant === 'primary'
            ? 'rgba(var(--color-universe-primary-rgb), 0.2)'
            : 'rgba(var(--color-universe-text-rgb), 0.1)',
        color: variant === 'primary'
            ? 'var(--color-universe-primary)'
            : 'var(--color-universe-text)'
    }); const getSkeletonStyles = () => ({
        backgroundColor: 'rgba(var(--color-universe-text-rgb), 0.1)'
    });

    const getSurfaceStyles = () => ({
        backgroundColor: 'var(--color-universe-surface)',
        borderColor: 'var(--color-universe-primary)',
        color: 'var(--color-universe-text)'
    });

    if (pluginsLoading) {
        return (
            <div className={`space-y-4 ${className}`}>
                <div className="animate-pulse">                    <div className="h-4 rounded w-1/4 mb-2" style={getSkeletonStyles()}></div>
                    <div className="h-10 rounded" style={getSkeletonStyles()}></div>
                </div>
            </div>
        );
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {/* Plugin Selection */}
            <div>                <label className="block text-sm font-medium mb-2" style={getLabelStyles()}>
                Universe Type *
            </label><Select
                    value={selectedPlugin || ''}
                    onChange={handlePluginChange}
                    options={[
                        { value: '', label: 'Select Universe Type' },
                        ...plugins.map((plugin) => ({
                            value: plugin.name,
                            label: plugin.description || plugin.name
                        }))
                    ]}
                    error={error || pluginsError || undefined}
                />
                {pluginsError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                        {pluginsError}
                    </p>
                )}
            </div>

            {/* Sub-Universe Selection (Plugin-Dependent) */}
            {selectedPlugin && supportedFeature && (
                <div>                    <label className="block text-sm font-medium mb-2" style={getLabelStyles()}>
                    Sub-Universe
                </label>

                    {subUniversesLoading ? (
                        <div className="animate-pulse h-10 rounded" style={getSkeletonStyles()}></div>
                    ) : (
                        <>              <Select
                            value={selectedSubUniverseLocal}
                            onChange={handleSubUniverseChange}
                            options={subUniverses.map((subUniverse) => ({
                                value: subUniverse.id,
                                label: subUniverse.name
                            }))}
                            error={subUniversesError || undefined}
                        />

                            {/* Sub-Universe Description */}
                            {selectedSubUniverseLocal && (<div className="mt-2 p-3 border rounded-md" style={getInfoBoxStyles()}>
                                {(() => {
                                    const selectedSubUniverseData = subUniverses.find(su => su.id === selectedSubUniverseLocal);
                                    return selectedSubUniverseData ? (
                                        <div>
                                            <p className="text-sm" style={{ color: 'var(--color-universe-text)' }}>
                                                {selectedSubUniverseData.description}
                                            </p>
                                            <div className="mt-2 flex flex-wrap gap-2">
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" style={getBadgeStyles('primary')}>
                                                    Canon: {selectedSubUniverseData.canonLevel}
                                                </span>
                                                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium" style={getBadgeStyles('secondary')}>
                                                    Default Era: {selectedSubUniverseData.defaultEra?.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                    ) : null;
                                })()}
                            </div>
                            )}

                            {subUniversesError && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                                    {subUniversesError}
                                </p>
                            )}
                        </>
                    )}
                </div>
            )}

            {/* Generic Universe Note */}
            {selectedPlugin && !supportedFeature && !subUniversesLoading && (<div className="p-3 border rounded-md" style={getSurfaceStyles()}>
                <p className="text-sm" style={getSecondaryTextStyles()}>
                    This universe type uses a generic configuration without specific sub-universes.
                </p>
            </div>
            )}
        </div>
    );
}
