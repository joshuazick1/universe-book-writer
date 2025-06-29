/**
 * Collaboration Invitation Repository Interface
 * 
 * Data access contract for collaboration invitation entities
 */

import { CollaborationInvitation, InvitationStatus } from '../entities/collaboration-invitation.entity.js';
import { CollaborationRole } from '../entities/universe.entity.js';

export interface CollaborationInvitationSearchFilters {
    universe_id?: string;
    inviter_id?: string;
    invitee_email?: string;
    invitee_id?: string;
    status?: InvitationStatus;
    role?: CollaborationRole;
    expired?: boolean;
    created_after?: Date;
    created_before?: Date;
}

export interface CollaborationInvitationRepository {
    /**
     * Save a collaboration invitation
     */
    save(invitation: CollaborationInvitation): Promise<CollaborationInvitation>;

    /**
     * Find invitation by ID
     */
    findById(id: string): Promise<CollaborationInvitation | null>;

    /**
     * Find invitation by token
     */
    findByToken(token: string): Promise<CollaborationInvitation | null>;

    /**
     * Find invitations with filters
     */
    findMany(
        filters?: CollaborationInvitationSearchFilters,
        options?: {
            limit?: number;
            offset?: number;
            sortBy?: string;
            sortOrder?: 'asc' | 'desc';
        }
    ): Promise<{
        invitations: CollaborationInvitation[];
        total: number;
        hasMore: boolean;
    }>;

    /**
     * Update invitation
     */
    update(id: string, invitation: CollaborationInvitation): Promise<CollaborationInvitation>;

    /**
     * Delete invitation
     */
    delete(id: string): Promise<void>;

    /**
     * Check if user has pending invitation for universe
     */
    hasPendingInvitation(universeId: string, userEmail: string): Promise<boolean>;

    /**
     * Get invitations for a universe
     */
    findByUniverseId(universeId: string): Promise<CollaborationInvitation[]>;

    /**
     * Get invitations for a user (by email)
     */
    findByUserEmail(email: string): Promise<CollaborationInvitation[]>;

    /**
     * Clean up expired invitations
     */
    cleanupExpired(): Promise<number>;

    /**
     * Count invitations with filters
     */
    count(filters?: CollaborationInvitationSearchFilters): Promise<number>;
}
