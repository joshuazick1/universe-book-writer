/**
 * Universe Card Component
 * 
 * Card component for displaying universe information in list/grid views
 */

import React from 'react';
import { Button } from '../base/Button/Button';
import { Card } from '../base/Card/Card';
import type { Universe } from '../../types/universe.types';

interface UniverseCardProps {
    universe: Universe;
    viewMode: 'grid' | 'list';
    onEdit: (universe: Universe) => void;
    onDelete: (id: string) => void;
    onClone: (universe: Universe) => void;
    className?: string;
}

export function UniverseCard({
    universe,
    viewMode,
    onEdit,
    onDelete,
    onClone,
    className = '',
}: UniverseCardProps) {
    const getPluginBadgeColor = (pluginId: string) => {
        switch (pluginId) {
            case 'star-trek':
                return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
            case 'star-wars':
                return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
            default:
                return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
        }
    };

    const getSubUniverseBadge = (pluginId: string, subUniverse: string) => {
        if (pluginId === 'star-trek') {
            switch (subUniverse) {
                case 'prime':
                    return '🖖 Prime';
                case 'kelvin':
                    return '🌟 Kelvin';
                case 'mirror':
                    return '🪞 Mirror';
                default:
                    return subUniverse;
            }
        }
        return subUniverse;
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString();
    };

    if (viewMode === 'list') {
        return (
            <Card className={`p-4 ${className}`}>
                <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-2">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white truncate">
                                {universe.name}
                            </h3>
                            <span
                                className={`px-2 py-1 text-xs font-medium rounded-full ${getPluginBadgeColor(
                                    universe.plugin_config.active_plugin
                                )}`}
                            >
                                {universe.plugin_config.active_plugin}
                            </span>
                            <span className="text-sm text-gray-500 dark:text-gray-400">
                                {getSubUniverseBadge(universe.plugin_config.active_plugin, universe.plugin_config.sub_universe)}
                            </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 text-sm truncate">
                            {universe.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                            <span>Created: {formatDate(universe.created_at)}</span>
                            <span>Updated: {formatDate(universe.updated_at)}</span>
                            <span className="flex items-center gap-1">
                                {universe.settings.is_private ? '🔒 Private' : '🌍 Public'}
                            </span>
                            {universe.settings.allow_collaboration && (
                                <span>👥 Collaborative</span>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(universe)}
                            title="Edit Universe"
                        >
                            ✏️
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onClone(universe)}
                            title="Clone Universe"
                        >
                            📋
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(universe.id)}
                            title="Delete Universe"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                            🗑️
                        </Button>
                    </div>
                </div>
            </Card>
        );
    }

    // Grid view
    return (
        <Card className={`p-4 h-full flex flex-col ${className}`}>
            <div className="flex-1">
                <div className="flex items-start justify-between mb-3">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-2">
                        {universe.name}
                    </h3>
                    <div className="flex items-center gap-1 ml-2">
                        {universe.settings.is_private ? (
                            <span title="Private Universe">🔒</span>
                        ) : (
                            <span title="Public Universe">🌍</span>
                        )}
                        {universe.settings.allow_collaboration && (
                            <span title="Allows Collaboration">👥</span>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap gap-2 mb-3">
                    <span
                        className={`px-2 py-1 text-xs font-medium rounded-full ${getPluginBadgeColor(
                            universe.plugin_config.active_plugin
                        )}`}
                    >
                        {universe.plugin_config.active_plugin}
                    </span>
                    <span className="px-2 py-1 text-xs bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 rounded-full">
                        {getSubUniverseBadge(universe.plugin_config.active_plugin, universe.plugin_config.sub_universe)}
                    </span>
                </div>

                <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-3 mb-4">
                    {universe.description}
                </p>

                <div className="text-xs text-gray-500 space-y-1">
                    <div>Created: {formatDate(universe.created_at)}</div>
                    <div>Updated: {formatDate(universe.updated_at)}</div>
                </div>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center gap-1">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onEdit(universe)}
                        title="Edit Universe"
                    >
                        ✏️
                    </Button>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onClone(universe)}
                        title="Clone Universe"
                    >
                        📋
                    </Button>
                </div>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(universe.id)}
                    title="Delete Universe"
                    className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                    🗑️
                </Button>
            </div>
        </Card>
    );
}
