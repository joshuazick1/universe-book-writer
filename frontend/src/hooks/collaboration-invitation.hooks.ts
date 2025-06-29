/**
 * Collaboration Invitation Hooks
 * 
 * React hooks for managing collaboration invitations
 */

import { useState, useCallback } from 'react';
import type { CollaborationInvitation, CreateInvitationData } from '../services/collaboration-invitation.service.js';
import { collaborationInvitationService } from '../services/collaboration-invitation.service.js';

/**
 * Hook for managing collaboration invitations
 */
export function useCollaborationInvitations() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const createInvitation = useCallback(async (data: CreateInvitationData) => {
        setLoading(true);
        setError(null);

        try {
            const result = await collaborationInvitationService.createInvitation(data);
            return result;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to create invitation');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const acceptInvitation = useCallback(async (token: string) => {
        setLoading(true);
        setError(null);

        try {
            const result = await collaborationInvitationService.acceptInvitation(token);
            return result;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to accept invitation');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const declineInvitation = useCallback(async (token: string) => {
        setLoading(true);
        setError(null);

        try {
            const result = await collaborationInvitationService.declineInvitation(token);
            return result;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to decline invitation');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    const revokeInvitation = useCallback(async (invitationId: string) => {
        setLoading(true);
        setError(null);

        try {
            const result = await collaborationInvitationService.revokeInvitation(invitationId);
            return result;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to revoke invitation');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        error,
        createInvitation,
        acceptInvitation,
        declineInvitation,
        revokeInvitation,
    };
}

/**
 * Hook for getting universe invitations
 */
export function useUniverseInvitations(universeId?: string) {
    const [invitations, setInvitations] = useState<CollaborationInvitation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadInvitations = useCallback(async (id?: string) => {
        const targetId = id || universeId;
        if (!targetId) return;

        setLoading(true);
        setError(null);

        try {
            const result = await collaborationInvitationService.getUniverseInvitations(targetId);
            setInvitations(result.invitations);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load invitations');
            setInvitations([]);
        } finally {
            setLoading(false);
        }
    }, [universeId]);

    return {
        invitations,
        loading,
        error,
        loadInvitations,
    };
}

/**
 * Hook for getting current user's invitations
 */
export function useMyInvitations() {
    const [invitations, setInvitations] = useState<CollaborationInvitation[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadMyInvitations = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const result = await collaborationInvitationService.getMyInvitations();
            setInvitations(result.invitations);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load invitations');
            setInvitations([]);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        invitations,
        loading,
        error,
        loadMyInvitations,
    };
}

/**
 * Hook for getting invitation details by token
 */
export function useInvitationByToken() {
    const [invitation, setInvitation] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadInvitationByToken = useCallback(async (token: string) => {
        setLoading(true);
        setError(null);

        try {
            const result = await collaborationInvitationService.getInvitationByToken(token);
            setInvitation(result);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load invitation');
            setInvitation(null);
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        invitation,
        loading,
        error,
        loadInvitationByToken,
    };
}