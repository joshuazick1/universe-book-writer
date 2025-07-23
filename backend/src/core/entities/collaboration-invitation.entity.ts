/**
 * Collaboration Invitation Entity  
 * 
 * Domain entity for managing universe collaboration invitations
 */

import { randomUUID } from 'crypto';
import { CollaborationRole } from './universe.entity.js';

export enum InvitationStatus {
    PENDING = 'pending',
    ACCEPTED = 'accepted',
    DECLINED = 'declined',
    EXPIRED = 'expired',
    REVOKED = 'revoked'
}

/**
 * Collaboration invitation entity
 */
export class CollaborationInvitation {
    public readonly id: string;
    public readonly universe_id: string;
    public readonly inviter_id: string;
    public readonly invitee_email: string;
    public readonly invitee_id?: string; // Set when user is found
    public readonly role: CollaborationRole;
    public readonly token: string;
    public readonly message?: string;
    public readonly status: InvitationStatus;
    public readonly expires_at: Date;
    public readonly created_at: Date;
    public readonly updated_at: Date;
    public readonly accepted_at?: Date;
    public readonly declined_at?: Date;

    constructor(data: {
        id?: string;
        universe_id: string;
        inviter_id: string;
        invitee_email: string;
        invitee_id?: string;
        role: CollaborationRole;
        token?: string;
        message?: string;
        status?: InvitationStatus;
        expires_at?: Date;
        created_at?: Date;
        updated_at?: Date;
        accepted_at?: Date;
        declined_at?: Date;
    }) {
        this.id = data.id || randomUUID();
        this.universe_id = data.universe_id;
        this.inviter_id = data.inviter_id;
        this.invitee_email = data.invitee_email.toLowerCase().trim();
        this.invitee_id = data.invitee_id;
        this.role = data.role;
        this.token = data.token || this.generateSecureToken();
        this.message = data.message;
        this.status = data.status || InvitationStatus.PENDING;
        this.expires_at = data.expires_at || this.getDefaultExpiryDate();
        this.created_at = data.created_at || new Date();
        this.updated_at = data.updated_at || new Date();
        this.accepted_at = data.accepted_at;
        this.declined_at = data.declined_at;
    }

    /**
     * Check if invitation is still valid
     */
    isValid(): boolean {
        return this.status === InvitationStatus.PENDING &&
            this.expires_at > new Date();
    }

    /**
     * Accept the invitation
     */
    accept(userId: string): CollaborationInvitation {
        if (!this.isValid()) {
            throw new Error('Cannot accept expired or invalid invitation');
        }

        if (this.status !== InvitationStatus.PENDING) {
            throw new Error('Invitation has already been responded to');
        }

        return new CollaborationInvitation({
            ...this,
            invitee_id: userId,
            status: InvitationStatus.ACCEPTED,
            accepted_at: new Date(),
            updated_at: new Date()
        });
    }

    /**
     * Decline the invitation
     */
    decline(): CollaborationInvitation {
        if (this.status !== InvitationStatus.PENDING) {
            throw new Error('Invitation has already been responded to');
        }

        return new CollaborationInvitation({
            ...this,
            status: InvitationStatus.DECLINED,
            declined_at: new Date(),
            updated_at: new Date()
        });
    }

    /**
     * Revoke the invitation (by inviter)
     */
    revoke(): CollaborationInvitation {
        if (this.status !== InvitationStatus.PENDING) {
            throw new Error('Cannot revoke non-pending invitation');
        }

        return new CollaborationInvitation({
            ...this,
            status: InvitationStatus.REVOKED,
            updated_at: new Date()
        });
    }

    /**
     * Mark invitation as expired
     */
    markExpired(): CollaborationInvitation {
        return new CollaborationInvitation({
            ...this,
            status: InvitationStatus.EXPIRED,
            updated_at: new Date()
        });
    }

    /**
     * Generate secure token for invitation
     */
    private generateSecureToken(): string {
        return randomUUID() + '-' + randomUUID();
    }

    /**
     * Get default expiry date (7 days from now)
     */
    private getDefaultExpiryDate(): Date {
        const expiryDate = new Date();
        expiryDate.setDate(expiryDate.getDate() + 7);
        return expiryDate;
    }

    /**
     * Update invitation with new data
     */
    update(data: Partial<{
        role: CollaborationRole;
        message: string;
        expires_at: Date;
    }>): CollaborationInvitation {
        if (this.status !== InvitationStatus.PENDING) {
            throw new Error('Cannot update non-pending invitation');
        }

        return new CollaborationInvitation({
            ...this,
            ...data,
            updated_at: new Date()
        });
    }
}
