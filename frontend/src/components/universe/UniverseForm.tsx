/**
 * Universe Form Component
 * 
 * Form for creating and editing universes
 */

import React, { useState, useEffect } from 'react';
import { Button } from '../base/Button/Button';
import { Input } from '../base/Input/Input';
import { CollaborationSetup } from './CollaborationSetup';
import { PluginSelection } from './PluginSelection';
import type {
    UniverseFormData,
    UniverseError,
    CollaborationRole,
    PluginConfiguration,
} from '../../types/universe.types';

interface CollaborationInvite {
    id: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    role: CollaborationRole;
    status: 'pending' | 'sent';
}

interface UniverseFormProps {
    universe?: UniverseFormData;
    onSubmit: (data: UniverseFormData & { collaborationInvites?: CollaborationInvite[] }) => void;
    onCancel: () => void;
    loading?: boolean;
    error?: UniverseError | null;
}

export function UniverseForm({
    universe,
    onSubmit,
    onCancel,
    loading = false,
    error,
}: UniverseFormProps) {
    const [formData, setFormData] = useState<UniverseFormData>({
        name: '',
        description: '',
        is_private: false,
        allow_collaboration: true,
        plugin_config: {
            active_plugin: '',
            plugin_version: '1.0.0',
            sub_universe: '',
            canon_compliance: 'flexible',
            theme_config: {
                theme_id: 'default',
                variant: 'dark'
            }
        }
    });

    const [collaborationInvites, setCollaborationInvites] = useState<CollaborationInvite[]>([]);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (universe) {
            setFormData(universe);
        }
    }, [universe]); const validateForm = (): boolean => {
        const newErrors: Record<string, string> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Universe name is required';
        } else if (formData.name.length < 3) {
            newErrors.name = 'Universe name must be at least 3 characters';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Description is required';
        } else if (formData.description.length < 10) {
            newErrors.description = 'Description must be at least 10 characters';
        }

        if (!formData.plugin_config?.active_plugin) {
            newErrors.plugin = 'Please select a universe type';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    }; const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (validateForm()) {
            onSubmit({
                ...formData,
                collaborationInvites: formData.allow_collaboration ? collaborationInvites : undefined
            });
        }
    }; const handleInputChange = (field: keyof UniverseFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: '' }));
        }
    };

    const handlePluginChange = (pluginId: string) => {
        setFormData(prev => ({
            ...prev,
            plugin_config: {
                ...prev.plugin_config!,
                active_plugin: pluginId,
                sub_universe: '', // Reset sub-universe when plugin changes
            }
        }));
        // Clear plugin error
        if (errors.plugin) {
            setErrors(prev => ({ ...prev, plugin: '' }));
        }
    };

    const handleSubUniverseChange = (subUniverseId: string) => {
        setFormData(prev => ({
            ...prev,
            plugin_config: {
                ...prev.plugin_config!,
                sub_universe: subUniverseId
            }
        }));
    };

    const handlePluginConfigChange = (config: Partial<PluginConfiguration>) => {
        setFormData(prev => ({
            ...prev,
            plugin_config: {
                ...prev.plugin_config!,
                ...config
            }
        }));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                    <div className="text-red-800 dark:text-red-200">
                        <strong>Error:</strong> {error.message}
                    </div>
                </div>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Basic Information
                </h3>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Universe Name *
                    </label>
                    <Input
                        type="text"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="e.g., My Star Trek Universe"
                        error={errors.name}
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Description *
                    </label>
                    <textarea
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        placeholder="Describe your universe, its purpose, and key features..."
                        rows={4}
                        className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${errors.description
                            ? 'border-red-300 dark:border-red-600'
                            : 'border-gray-300 dark:border-gray-600'
                            } bg-white dark:bg-gray-700 text-gray-900 dark:text-white`}
                    />
                    {errors.description && (
                        <p className="mt-1 text-sm text-red-600 dark:text-red-400">
                            {errors.description}
                        </p>
                    )}                </div>
            </div>

            {/* Plugin Configuration */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Universe Type & Configuration
                </h3>

                <PluginSelection
                    selectedPlugin={formData.plugin_config?.active_plugin}
                    selectedSubUniverse={formData.plugin_config?.sub_universe}
                    onPluginChange={handlePluginChange}
                    onSubUniverseChange={handleSubUniverseChange}
                    onConfigChange={handlePluginConfigChange}
                    error={errors.plugin}
                />
            </div>

            {/* Privacy and Collaboration */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                    Privacy & Collaboration
                </h3>

                <div className="space-y-4">
                    {/* Privacy/Encryption Setting */}
                    <div className="space-y-2">
                        <label className="flex items-center">
                            <input
                                type="checkbox"
                                checked={formData.is_private}
                                onChange={(e) => handleInputChange('is_private', e.target.checked)}
                                className="rounded border-gray-300 text-blue-600 shadow-sm focus:border-blue-300 focus:ring focus:ring-blue-200 focus:ring-opacity-50"
                            />
                            <span className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                                Make this universe private & encrypted
                            </span>
                        </label>
                        {!universe && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 ml-6">
                                Note: Encryption can only be enabled during creation. Public universes cannot be encrypted later for security reasons.
                            </p>
                        )}
                        {universe && universe.is_private && (
                            <p className="text-xs text-green-600 dark:text-green-400 ml-6">
                                This universe is encrypted and private
                            </p>
                        )}
                    </div>                    {/* Collaboration Setup */}
                    <CollaborationSetup
                        allowCollaboration={formData.allow_collaboration}
                        onAllowCollaborationChange={(allow) => handleInputChange('allow_collaboration', allow)}
                        invites={collaborationInvites}
                        onInvitesChange={setCollaborationInvites}
                        className="space-y-4"
                    />

                    {/* Privacy vs Collaboration Warning */}
                    {formData.is_private && formData.allow_collaboration && (
                        <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-md">
                            <p className="text-sm text-amber-800 dark:text-amber-200">
                                <strong>Private + Collaborative:</strong> This universe will be encrypted, but you can still invite specific users to collaborate.
                                Only invited collaborators will have access to the content.
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Form Actions */}
            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                <Button
                    type="button"
                    variant="secondary"
                    onClick={onCancel}
                    disabled={loading}
                >
                    Cancel
                </Button>
                <Button
                    type="submit"
                    loading={loading}
                    disabled={loading}
                >
                    {universe ? 'Update Universe' : 'Create Universe'}
                </Button>
            </div>
        </form>
    );
}
