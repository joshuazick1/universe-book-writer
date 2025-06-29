/**
 * Universe List Component
 * 
 * Main component for displaying and managing universe list
 */

import React, { useState } from 'react';
import { useUniverseList } from '../../hooks/universe.hooks';
import { useCollaborationInvitations } from '../../hooks/collaboration-invitation.hooks.js';
import { UniverseCard } from './UniverseCard.js';
import { UniverseForm } from './UniverseForm.js';
import { PluginUniverseSection } from './PluginUniverseSection.js';
import { CreateUniverseFromTemplateModal } from './CreateUniverseFromTemplateModal.js';
import { Button } from '../base/Button/Button';
import { Input } from '../base/Input/Input';
import { Modal } from '../base/Modal/Modal';
import type { Universe, UniverseFormData } from '../../types/universe.types';

interface UniverseListProps {
    className?: string;
}

export function UniverseList({ className = '' }: UniverseListProps) {
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [editingUniverse, setEditingUniverse] = useState<Universe | null>(null); const [showTemplateModal, setShowTemplateModal] = useState(false);
    const [templateToUse, setTemplateToUse] = useState<any>(null);
    const [templateSubUniverse, setTemplateSubUniverse] = useState<any>(null); const {
        universes,
        loading,
        error,
        hasMore,
        create,
        loadMore,
        refetch,
        updateInList,
        removeFromList, } = useUniverseList({
            search: searchTerm,
        });

    const {
        createInvitation,
        loading: invitationLoading,
        error: invitationError
    } = useCollaborationInvitations();

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
    }; const handleCreateUniverse = async (data: UniverseFormData & { collaborationInvites?: any[] }) => {
        const universeData = {
            name: data.name,
            description: data.description,
            settings: {
                is_private: data.is_private,
                allow_collaboration: data.allow_collaboration,
            },
        };

        const newUniverse = await create(universeData);
        if (newUniverse) {
            // Send collaboration invitations if any
            if (data.collaborationInvites && data.collaborationInvites.length > 0) {
                for (const invite of data.collaborationInvites) {
                    try {
                        await createInvitation({
                            universe_id: newUniverse.id,
                            invitee_email: invite.email,
                            role: invite.role,
                            message: invite.message
                        });
                    } catch (error) {
                        console.error(`Failed to send invitation to ${invite.email}:`, error);
                        // Could show a notification here
                    }
                }
            }
            setShowCreateForm(false);
        }
    }; const handleEditUniverse = async (data: UniverseFormData & { collaborationInvites?: any[] }) => {
        if (!editingUniverse) return;

        const updateData = {
            name: data.name,
            description: data.description,
            settings: {
                is_private: data.is_private,
                allow_collaboration: data.allow_collaboration,
            },
        };        // Update in the list optimistically
        updateInList(editingUniverse.id, {
            name: data.name,
            description: data.description,
            settings: { ...editingUniverse.settings, ...updateData.settings },
        });

        // Send new collaboration invitations if any
        if (data.collaborationInvites && data.collaborationInvites.length > 0) {
            for (const invite of data.collaborationInvites) {
                try {
                    await createInvitation({
                        universe_id: editingUniverse.id,
                        invitee_email: invite.email,
                        role: invite.role,
                        message: invite.message
                    });
                } catch (error) {
                    console.error(`Failed to send invitation to ${invite.email}:`, error);
                    // Could show a notification here
                }
            }
        }

        setEditingUniverse(null);
    }; const handleDeleteUniverse = async (id: string) => {
        if (window.confirm('Are you sure you want to delete this universe? This action cannot be undone.')) {
            const success = await removeFromList(id);
            if (!success) {
                console.error('Failed to delete universe');
                // Could show a notification here
            }
        }
    }; const handleCloneUniverse = async (universe: Universe) => {
        const cloneData = {
            name: `${universe.name} (Copy)`,
            description: universe.description,
            settings: {
                is_private: universe.settings.is_private,
                allow_collaboration: universe.settings.allow_collaboration,
            },
        };

        await create(cloneData);
    }; const handleCloneFromTemplate = (template: any, subUniverse?: any) => {
        setTemplateToUse(template);
        setTemplateSubUniverse(subUniverse);
        setShowTemplateModal(true);
    }; const handleExecuteClone = async (data: UniverseFormData & { collaborationInvites?: any[] }) => {
        await handleCreateUniverse(data);
        setShowTemplateModal(false);
        setTemplateToUse(null);
        setTemplateSubUniverse(null);
    }; const getFormDataFromUniverse = (universe: Universe): UniverseFormData => ({
        name: universe.name,
        description: universe.description,
        is_private: universe.settings.is_private,
        allow_collaboration: universe.settings.allow_collaboration,
    }); if (error) {
        return (
            <div className={`space-y-4 ${className}`}>
                <div
                    className="border rounded-lg p-4"
                    style={{
                        backgroundColor: 'var(--color-universe-surface)',
                        borderColor: '#dc2626',
                        color: 'var(--color-universe-text)'
                    }}
                >
                    <div style={{ color: '#dc2626' }}>
                        <strong>Error:</strong> {error.message}
                    </div>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={refetch}
                        className="mt-2"
                    >
                        Try Again
                    </Button>
                </div>
            </div>
        );
    }

    return (<div className={`space-y-6 ${className}`}>
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
                <h1
                    className="text-2xl font-bold"
                    style={{ color: 'var(--color-universe-text)' }}
                >
                    Universes
                </h1>
                <p
                    className="opacity-75"
                    style={{ color: 'var(--color-universe-text)' }}
                >
                    Manage your fictional universes and their configurations
                </p>
            </div>
            <Button
                onClick={() => setShowCreateForm(true)}
            >
                ➕ Create Universe
            </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
                <Input
                    type="text"
                    placeholder="🔍 Search universes..."
                    value={searchTerm}
                    onChange={handleSearch}
                />                </div>                <div
                    className="flex items-center border rounded-md"
                    style={{ borderColor: 'var(--color-universe-primary)' }}
                >
                <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 transition-colors ${viewMode === 'grid' ? '' : 'opacity-60 hover:opacity-80'}`}
                    style={{
                        backgroundColor: viewMode === 'grid' ? 'var(--color-universe-primary)' : 'transparent',
                        color: viewMode === 'grid' ? 'var(--color-universe-background)' : 'var(--color-universe-text)'
                    }}
                    title="Grid View"
                >
                    ⚏
                </button>                    <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 transition-colors ${viewMode === 'list' ? '' : 'opacity-60 hover:opacity-80'}`}
                    style={{
                        backgroundColor: viewMode === 'list' ? 'var(--color-universe-primary)' : 'transparent',
                        color: viewMode === 'list' ? 'var(--color-universe-background)' : 'var(--color-universe-text)'
                    }}
                    title="List View"
                >
                    ☰
                </button>
            </div>
        </div>            {/* Plugin Universe Templates Section */}
        <PluginUniverseSection
            onSelectTemplate={handleCloneFromTemplate}
        />            <hr style={{ borderColor: 'var(--color-universe-primary)', opacity: 0.3 }} />

        {/* User Universes Section */}
        <div>
            <h2
                className="text-xl font-semibold mb-4"
                style={{ color: 'var(--color-universe-text)' }}
            >
                📚 Your Universes
            </h2>

            {/* Universe Grid/List */}
            {loading && universes.length === 0 ? (
                <div className="flex justify-center py-12">
                    <div
                        className="animate-spin rounded-full h-8 w-8 border-b-2"
                        style={{ borderColor: 'var(--color-universe-primary)' }}
                    ></div>
                </div>
            ) : (
                <>                        {universes.length === 0 ? (
                    <div className="text-center py-12">
                        <div
                            className="text-lg mb-4 opacity-60"
                            style={{ color: 'var(--color-universe-text)' }}
                        >
                            No universes found
                        </div>
                        <Button onClick={() => setShowCreateForm(true)}>
                            Create your first universe
                        </Button>
                    </div>
                ) : (
                    <div
                        className={
                            viewMode === 'grid'
                                ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6'
                                : 'space-y-4'
                        }
                    >
                        {universes.map((universe) => (
                            <UniverseCard
                                key={universe.id}
                                universe={universe}
                                viewMode={viewMode}
                                onEdit={setEditingUniverse}
                                onDelete={handleDeleteUniverse}
                                onClone={handleCloneUniverse}
                            />
                        ))}
                    </div>
                )}

                    {/* Load More */}
                    {hasMore && (
                        <div className="text-center">
                            <Button
                                variant="secondary"
                                onClick={loadMore}
                                disabled={loading}
                                className="min-w-32"
                            >
                                {loading ? (
                                    <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500 inline-block mr-2"></span>) : null}
                                Load More
                            </Button>
                        </div>
                    )}
                </>
            )}
        </div> {/* End User Universes Section */}

        {/* Create Universe Modal */}
        <Modal
            isOpen={showCreateForm}
            onClose={() => setShowCreateForm(false)}
            title="Create New Universe"
        >
            <UniverseForm
                onSubmit={handleCreateUniverse}
                onCancel={() => setShowCreateForm(false)}
                loading={loading}
                error={error}
            />
        </Modal>

        {/* Edit Universe Modal */}
        <Modal
            isOpen={!!editingUniverse}
            onClose={() => setEditingUniverse(null)}
            title="Edit Universe"
        >
            {editingUniverse && (
                <UniverseForm
                    universe={getFormDataFromUniverse(editingUniverse)}
                    onSubmit={handleEditUniverse}
                    onCancel={() => setEditingUniverse(null)}
                    loading={loading}
                    error={error}
                />
            )}
        </Modal>            {/* Create Universe From Template Modal */}
        <CreateUniverseFromTemplateModal
            isOpen={showTemplateModal}
            onClose={() => setShowTemplateModal(false)}
            onCreateFromTemplate={handleExecuteClone}
            template={templateToUse}
            subUniverse={templateSubUniverse}
            loading={loading}
        />
    </div>
    );
}
