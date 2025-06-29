/**
 * Collaboration Invitation Service
 * 
 * API service for managing collaboration invitations
 */

import { ApiService } from '../utils/api-service.js';

export interface CollaborationInvitation {
    id: string;
    universe_id: string;
    invitee_email: string;
    role: string;
    status: 'pending' | 'accepted' | 'declined' | 'revoked';
    message?: string;
    expires_at?: string;
    created_at: string;
    accepted_at?: string;
    declined_at?: string;
    token?: string;
}

export interface CreateInvitationData {
    universe_id: string;
    invitee_email: string;
    role: string;
    message?: string;
    expires_at?: string;
}

class CollaborationInvitationService extends ApiService {
    constructor() {
        super('/api');
    }
    /**
     * Create a new collaboration invitation
     */
    async createInvitation(data: CreateInvitationData): Promise<CollaborationInvitation> {
        return await this.post<CollaborationInvitation>('/invitations', data);
    }

    /**
     * Accept an invitation
     */
    async acceptInvitation(token: string): Promise<CollaborationInvitation> {
        return await this.post<CollaborationInvitation>(`/invitations/${token}/accept`);
    }

    /**
     * Decline an invitation
     */
    async declineInvitation(token: string): Promise<CollaborationInvitation> {
        return await this.post<CollaborationInvitation>(`/invitations/${token}/decline`);
    }

    /**
     * Revoke an invitation
     */
    async revokeInvitation(invitationId: string): Promise<CollaborationInvitation> {
        return await this.delete<CollaborationInvitation>(`/invitations/${invitationId}`);
    }

    /**
     * Get invitations for a universe
     */
    async getUniverseInvitations(universeId: string): Promise<{ invitations: CollaborationInvitation[] }> {
        return await this.get<{ invitations: CollaborationInvitation[] }>(`/universes/${universeId}/invitations`);
    }

    /**
     * Get current user's invitations
     */
    async getMyInvitations(): Promise<{ invitations: CollaborationInvitation[] }> {
        return await this.get<{ invitations: CollaborationInvitation[] }>('/invitations/me');
    }

    /**
     * Get invitation details by token
     */
    async getInvitationByToken(token: string): Promise<{
        id: string;
        universe: {
            id: string;
            name: string;
            description: string;
        };
        inviter: {
            username: string;
            email: string;
        };
        role: string;
        message?: string;
        status: string;
        expires_at?: string;
        created_at: string;
        is_valid: boolean;
    }> {
        return await this.get<{
            id: string;
            universe: {
                id: string;
                name: string;
                description: string;
            };
            inviter: {
                username: string;
                email: string;
            };
            role: string;
            message?: string;
            status: string;
            expires_at?: string;
            created_at: string;
            is_valid: boolean;
        }>(`/invitations/${token}`);
    }
}

export const collaborationInvitationService = new CollaborationInvitationService();
