/**
 * Create Universe From Template Modal Component
 * 
 * Modal for creating custom universes from plugin templates
 */

import React, { useState } from 'react';
import { Button } from '../base/Button/Button';
import { Input } from '../base/Input/Input';
import { Modal } from '../base/Modal/Modal';
import { CollaborationSetup } from './CollaborationSetup';
import { PluginSpecificOptions } from './PluginSpecificOptions';
import type { UniverseFormData } from '../../types/universe.types';

interface PluginUniverseTemplate {
    id: string;
    name: string;
    description: string;
    plugin_id: string;
    icon: string;
    theme_color: string;
}

interface SubUniverseOption {
    id: string;
    name: string;
    description: string;
    icon?: string;
}

interface CreateUniverseFromTemplateModalProps {
    isOpen: boolean;
    onClose: () => void;
    template: PluginUniverseTemplate | null;
    subUniverse?: SubUniverseOption;
    onCreateFromTemplate: (data: UniverseFormData & { collaborationInvites?: any[] }) => Promise<void>;
    loading?: boolean;
}

export function CreateUniverseFromTemplateModal({
    isOpen,
    onClose,
    template,
    subUniverse,
    onCreateFromTemplate,
    loading = false
}: CreateUniverseFromTemplateModalProps) {
    const [formData, setFormData] = useState<UniverseFormData>({
        name: '',
        description: '',
        is_private: false,
        allow_collaboration: false,
    });
    const [allowCollaboration, setAllowCollaboration] = useState(false);
    const [collaborationInvites, setCollaborationInvites] = useState<any[]>([]);
    const [pluginOptions, setPluginOptions] = useState<Record<string, any>>({});

    React.useEffect(() => {
        if (template && isOpen) {
            const defaultName = subUniverse
                ? `${template.name} - ${subUniverse.name}`
                : `${template.name} Universe`;
            const defaultDescription = subUniverse
                ? `${subUniverse.description} - Custom universe based on ${template.name}`
                : `${template.description} - Custom universe based on ${template.name}`; setFormData({
                    name: defaultName,
                    description: defaultDescription,
                    is_private: false,
                    allow_collaboration: false,
                });
            setAllowCollaboration(false);
            setCollaborationInvites([]);
            setPluginOptions({});
        }
    }, [template, subUniverse, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!template) return; const createData = {
            ...formData,
            allow_collaboration: allowCollaboration,
            collaborationInvites: allowCollaboration ? collaborationInvites : undefined,
            pluginOptions: pluginOptions,
        };

        await onCreateFromTemplate(createData);
    };

    const handleInputChange = (field: keyof UniverseFormData, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
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

    const getTextareaStyles = () => ({
        backgroundColor: 'var(--color-universe-surface)',
        borderColor: 'var(--color-universe-primary)',
        color: 'var(--color-universe-text)'
    });

    if (!template) return null;

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={`Create Universe from ${template.name}${subUniverse ? ` - ${subUniverse.name}` : ''}`}
            size="lg"
        >
            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Template Info */}                <div className="border rounded-lg p-4" style={getInfoBoxStyles()}>
                    <div className="flex items-start gap-3">
                        <span className="text-lg" style={{ color: 'var(--color-universe-primary)' }}>ℹ️</span>
                        <div className="text-sm">
                            <p className="font-medium mb-1" style={{ color: 'var(--color-universe-text)' }}>
                                Creating Custom Universe from Template
                            </p>
                            <p style={getSecondaryTextStyles()}>
                                This will create a new custom universe based on the {template.name} template
                                {subUniverse && ` (${subUniverse.name} sub-universe)`}.
                                You can modify all settings and content in your custom universe.
                            </p>
                        </div>
                    </div>
                </div>

                {/* Basic Information */}
                <div className="space-y-4">
                    <div>                        <label htmlFor="name" className="block text-sm font-medium mb-2" style={getLabelStyles()}>
                        Universe Name *
                    </label>
                        <Input
                            id="name"
                            type="text"
                            required
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            placeholder="Enter universe name"
                        />
                    </div>

                    <div>                        <label htmlFor="description" className="block text-sm font-medium mb-2" style={getLabelStyles()}>
                        Description
                    </label>
                        <textarea
                            id="description"
                            rows={3}
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            placeholder="Describe your universe"
                            className="w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50" style={getTextareaStyles()}
                        />
                    </div>                </div>

                {/* Plugin-Specific Options */}
                {template && (
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <PluginSpecificOptions
                            pluginId={template.plugin_id}
                            subUniverseId={subUniverse?.id}
                            options={pluginOptions}
                            onChange={setPluginOptions}
                        />
                    </div>
                )}

                {/* Privacy Settings */}
                <div className="space-y-4">
                    <div className="flex items-center">
                        <input
                            type="checkbox"
                            id="is_private"
                            checked={formData.is_private}
                            onChange={(e) => handleInputChange('is_private', e.target.checked)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor="is_private" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                            🔒 Make this universe private
                        </label>
                    </div>

                    {formData.is_private && (
                        <div className="ml-6 text-sm text-gray-600 dark:text-gray-400">
                            Private universes are only visible to you and invited collaborators
                        </div>
                    )}
                </div>

                {/* Collaboration Setup */}
                <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                    <CollaborationSetup
                        allowCollaboration={allowCollaboration}
                        onAllowCollaborationChange={setAllowCollaboration}
                        invites={collaborationInvites}
                        onInvitesChange={setCollaborationInvites}
                    />
                </div>

                {/* Form Actions */}
                <div className="flex justify-end gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onClose}
                        disabled={loading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        disabled={loading || !formData.name.trim()}
                    >
                        {loading ? (
                            <>
                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline-block mr-2"></span>
                                Creating...
                            </>
                        ) : (
                            <>
                                🎨 Create Custom Universe
                            </>
                        )}
                    </Button>
                </div>
            </form>
        </Modal>
    );
}
