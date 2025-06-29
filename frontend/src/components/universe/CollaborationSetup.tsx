/**
 * Collaboration Setup Component
 * 
 * Component for setting up collaboration during universe creation/editing
 */

import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '../base/Button/Button';
import { Input } from '../base/Input/Input';
import { Select } from '../base/Select/Select';
import type { User, UserSearchResult } from '../../types/user.types.js';
import type { CollaborationRole } from '../../types/universe.types.js';
import { useUserSearch } from '../../hooks/user.hooks.js';
import { useDebounce } from '../../hooks/useDebounce.js';

interface CollaborationInvite {
    id: string;
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    role: CollaborationRole;
    status: 'pending' | 'sent';
}

interface CollaborationSetupProps {
    allowCollaboration: boolean;
    onAllowCollaborationChange: (allow: boolean) => void;
    invites: CollaborationInvite[];
    onInvitesChange: (invites: CollaborationInvite[]) => void;
    className?: string;
}

const roleOptions = [
    { value: 'viewer', label: 'Viewer - Can view universe content' },
    { value: 'editor', label: 'Editor - Can edit universe content' },
    { value: 'manager', label: 'Manager - Can manage universe and collaborators' },
];

export function CollaborationSetup({
    allowCollaboration,
    onAllowCollaborationChange,
    invites,
    onInvitesChange,
    className = ''
}: CollaborationSetupProps) {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRole, setSelectedRole] = useState<CollaborationRole>('editor');
    const [inviteMessage, setInviteMessage] = useState('');
    const [showInviteForm, setShowInviteForm] = useState(false);
    const [manualEmail, setManualEmail] = useState('');

    const debouncedSearchQuery = useDebounce(searchQuery, 300);

    const {
        users: searchResults,
        loading: searchLoading,
        searchUsers,
        clearResults
    } = useUserSearch();

    // Search for users when query changes
    useEffect(() => {
        if (debouncedSearchQuery.length >= 2) {
            searchUsers(debouncedSearchQuery);
        } else {
            clearResults();
        }
    }, [debouncedSearchQuery, searchUsers, clearResults]);
    const handleAddUserInvite = useCallback((user: UserSearchResult) => {
        // Check if user is already invited
        const alreadyInvited = invites.some(invite =>
            invite.email.toLowerCase() === user.email.toLowerCase()
        );

        if (alreadyInvited) {
            return;
        }

        const newInvite: CollaborationInvite = {
            id: `invite-${Date.now()}-${Math.random()}`,
            email: user.email,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName,
            role: selectedRole,
            status: 'pending'
        };

        onInvitesChange([...invites, newInvite]);
        setSearchQuery('');
        clearResults();
    }, [invites, selectedRole, onInvitesChange, clearResults]);

    const handleAddEmailInvite = useCallback(() => {
        if (!manualEmail.trim()) return;

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(manualEmail)) {
            alert('Please enter a valid email address');
            return;
        }

        // Check if email is already invited
        const alreadyInvited = invites.some(invite =>
            invite.email.toLowerCase() === manualEmail.toLowerCase()
        );

        if (alreadyInvited) {
            alert('This email has already been invited');
            return;
        }

        const newInvite: CollaborationInvite = {
            id: `invite-${Date.now()}-${Math.random()}`,
            email: manualEmail.trim(),
            role: selectedRole,
            status: 'pending'
        };

        onInvitesChange([...invites, newInvite]);
        setManualEmail('');
        setShowInviteForm(false);
    }, [manualEmail, selectedRole, invites, onInvitesChange]);

    const handleRemoveInvite = useCallback((inviteId: string) => {
        onInvitesChange(invites.filter(invite => invite.id !== inviteId));
    }, [invites, onInvitesChange]);

    const handleUpdateInviteRole = useCallback((inviteId: string, newRole: CollaborationRole) => {
        onInvitesChange(invites.map(invite =>
            invite.id === inviteId ? { ...invite, role: newRole } : invite
        ));
    }, [invites, onInvitesChange]);

    // Helper functions for consistent styling
    const getLabelStyles = () => ({
        color: 'var(--color-universe-text)',
        opacity: 0.8
    });

    const getSecondaryTextStyles = () => ({
        color: 'var(--color-universe-text)',
        opacity: 0.6
    });

    const getSurfaceStyles = () => ({
        backgroundColor: 'var(--color-universe-surface)',
        borderColor: 'var(--color-universe-primary)',
        color: 'var(--color-universe-text)'
    });

    return (
        <div className={`space-y-6 ${className}`}>
            {/* Collaboration Toggle */}
            <div className="flex items-center space-x-3">                <input
                type="checkbox"
                id="allowCollaboration"
                checked={allowCollaboration}
                onChange={(e) => onAllowCollaborationChange(e.target.checked)}
                className="w-4 h-4 rounded focus:ring-2 focus:ring-opacity-50"
                style={{
                    accentColor: 'var(--color-universe-primary)',
                    backgroundColor: 'var(--color-universe-surface)',
                    borderColor: 'var(--color-universe-primary)'
                }}
            />
                <label htmlFor="allowCollaboration" className="text-sm font-medium" style={getLabelStyles()}>
                    Allow collaboration on this universe
                </label>
            </div>

            {allowCollaboration && (
                <div className="space-y-4 pl-7">
                    {/* Collaboration Description */}                    <p className="text-sm" style={getSecondaryTextStyles()}>
                        Invite other users to collaborate on your universe. You can control their permissions and manage access.
                    </p>

                    {/* Role Selection */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Default role for new invitations
                        </label>
                        <Select
                            value={selectedRole}
                            onChange={(value) => setSelectedRole(value as CollaborationRole)}
                            options={roleOptions}
                            className="w-full"
                        />
                    </div>

                    {/* User Search */}
                    <div className="space-y-2">                        <label className="block text-sm font-medium" style={getLabelStyles()}>
                        Search users to invite
                    </label>
                        <div className="relative">
                            <Input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder="Search by username or email..."
                                className="w-full"
                            />
                            {searchLoading && (
                                <div className="absolute right-3 top-3">
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                                </div>
                            )}
                        </div>

                        {/* Search Results */}
                        {searchResults.length > 0 && (
                            <div className="mt-2 border rounded-md shadow-sm max-h-60 overflow-y-auto" style={getSurfaceStyles()}>                {searchResults.map((user: UserSearchResult) => (
                                <div
                                    key={user.id}
                                    className="p-3 hover:bg-gray-50 border-b border-gray-200 last:border-b-0 cursor-pointer"
                                    onClick={() => handleAddUserInvite(user)}
                                >
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <div className="font-medium text-gray-900">
                                                {user.firstName && user.lastName
                                                    ? `${user.firstName} ${user.lastName}`
                                                    : user.username
                                                }
                                            </div>
                                            <div className="text-sm text-gray-500">{user.email}</div>
                                            {user.username !== user.email && (
                                                <div className="text-sm text-gray-400">@{user.username}</div>
                                            )}
                                        </div>
                                        <Button
                                            size="sm"
                                            variant="secondary"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAddUserInvite(user);
                                            }}
                                        >
                                            Invite
                                        </Button>
                                    </div>
                                </div>
                            ))}
                            </div>
                        )}
                    </div>

                    {/* Manual Email Invite */}
                    <div className="space-y-2">
                        {!showInviteForm ? (
                            <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => setShowInviteForm(true)}
                            >
                                + Invite by email
                            </Button>
                        ) : (
                            <div className="space-y-3 p-4 bg-gray-50 rounded-md">
                                <Input
                                    type="email"
                                    value={manualEmail}
                                    onChange={(e) => setManualEmail(e.target.value)}
                                    placeholder="Enter email address..."
                                    className="w-full"
                                />
                                <div className="flex space-x-2">
                                    <Button
                                        type="button"
                                        size="sm"
                                        onClick={handleAddEmailInvite}
                                        disabled={!manualEmail.trim()}
                                    >
                                        Add Invitation
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="sm"
                                        onClick={() => {
                                            setShowInviteForm(false);
                                            setManualEmail('');
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Current Invitations */}
                    {invites.length > 0 && (
                        <div className="space-y-2">
                            <label className="block text-sm font-medium text-gray-700">
                                Pending invitations ({invites.length})
                            </label>
                            <div className="space-y-2">
                                {invites.map((invite) => (
                                    <div
                                        key={invite.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-md"
                                    >
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-900">
                                                {invite.firstName && invite.lastName
                                                    ? `${invite.firstName} ${invite.lastName}`
                                                    : invite.username || invite.email
                                                }
                                            </div>
                                            <div className="text-sm text-gray-500">{invite.email}</div>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            <Select
                                                value={invite.role}
                                                onChange={(value) => handleUpdateInviteRole(invite.id, value as CollaborationRole)}
                                                options={roleOptions}
                                                size="sm"
                                                className="w-40"
                                            />
                                            <Button
                                                type="button"
                                                variant="secondary"
                                                size="sm"
                                                onClick={() => handleRemoveInvite(invite.id)}
                                                className="text-red-600 hover:text-red-700"
                                            >
                                                Remove
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Optional Message */}
                    <div className="space-y-2">
                        <label className="block text-sm font-medium text-gray-700">
                            Invitation message (optional)
                        </label>
                        <textarea
                            value={inviteMessage}
                            onChange={(e) => setInviteMessage(e.target.value)}
                            placeholder="Add a personal message to your invitation..."
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
