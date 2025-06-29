/**
 * Plugin Universe Selection Component
 * 
 * Displays available universe plugins and their sub-universes dynamically
 * fetched from the backend API instead of hardcoded static data.
 */

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { usePluginTemplates, type PluginTemplate, type SubUniverseOption } from '../../hooks/plugin.hooks';

interface PluginUniverseSectionProps {
    onSelectTemplate: (template: PluginTemplate, subUniverse?: SubUniverseOption) => void;
}

export function PluginUniverseSection({ onSelectTemplate }: PluginUniverseSectionProps) {
    const { templates, loading, error } = usePluginTemplates();
    const navigate = useNavigate(); if (loading) {
        return (
            <div className="space-y-6">
                <div className="text-center py-8">
                    <div
                        className="inline-block animate-spin rounded-full h-8 w-8 border-b-2"
                        style={{ borderColor: 'var(--color-universe-primary)' }}
                    ></div>
                    <p
                        className="mt-4 opacity-75"
                        style={{ color: 'var(--color-universe-text)' }}
                    >
                        Loading universe plugins...
                    </p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div
                    className="text-center py-8"
                    style={{ color: '#dc2626' }}
                >
                    Error loading plugins: {String(error)}
                </div>
            </div>
        );
    } if (!templates || templates.length === 0) {
        return (
            <div
                className="text-center py-8 opacity-60"
                style={{ color: 'var(--color-universe-text)' }}
            >
                No universe plugins found.
            </div>
        );
    }// Helper: is this a custom sub-universe?
    const isCustomSubUniverse = (sub: SubUniverseOption) => {
        if (!sub || !sub.id) return false;
        const id = sub.id.toLowerCase();
        return id.includes('custom');
    };

    return (<div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {templates.map((template) => (
                <div
                    key={template.id}
                    className="rounded-lg shadow p-6 flex flex-col"
                    style={{ backgroundColor: 'var(--color-universe-surface)' }}
                >
                    <div className="flex-1">
                        <h3
                            className="text-lg font-semibold mb-1"
                            style={{ color: 'var(--color-universe-text)' }}
                        >
                            {template.name}
                        </h3>
                        <p
                            className="text-sm mb-2 opacity-75"
                            style={{ color: 'var(--color-universe-text)' }}
                        >
                            {template.description}
                        </p>
                        {template.sub_universes && template.sub_universes.length > 0 ? (
                            <div className="mt-2 space-y-2">                                    {template.sub_universes.map((sub: SubUniverseOption) => (
                                <button
                                    key={sub.id}
                                    className="w-full text-left px-4 py-2 rounded border font-medium transition hover:opacity-80"
                                    style={{
                                        backgroundColor: 'var(--color-universe-accent)',
                                        borderColor: 'var(--color-universe-primary)',
                                        color: 'var(--color-universe-background)'
                                    }}
                                    onClick={() =>
                                        isCustomSubUniverse(sub)
                                            ? onSelectTemplate(template, sub)
                                            : navigate(`/universes/${template.id}/${sub.id}`)
                                    }
                                >
                                    {sub.name}
                                </button>
                            ))}
                            </div>) : (
                            <button
                                className="mt-4 px-4 py-2 rounded font-semibold transition hover:opacity-90"
                                style={{
                                    backgroundColor: 'var(--color-universe-primary)',
                                    color: 'var(--color-universe-background)'
                                }}
                                onClick={() => navigate(`/universes/${template.id}`)}
                            >
                                Manage {template.name}
                            </button>
                        )}
                    </div>
                </div>
            ))}
        </div>            {/* Plugin System Info */}
        <div
            className="mt-8 p-4 rounded-lg"
            style={{ backgroundColor: 'var(--color-universe-surface)' }}
        >
            <h4
                className="text-sm font-medium mb-2"
                style={{ color: 'var(--color-universe-text)' }}
            >
                🔌 Dynamic Plugin System
            </h4>
            <p
                className="text-sm opacity-75"
                style={{ color: 'var(--color-universe-text)' }}
            >
                Universe templates are loaded dynamically from the plugin system. Loaded {templates.length} plugin{templates.length !== 1 ? 's' : ''} from the backend.
            </p>
        </div>
    </div>
    );
}

export default PluginUniverseSection;
