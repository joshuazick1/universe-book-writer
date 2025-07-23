/**
 * Collaboration Invitation Use Cases
 * 
 * Application layer for managing universe collaboration invitations
 */

import { CollaborationInvitation, InvitationStatus } from '../../core/entities/collaboration-invitation.entity.js';
import { CollaborationRole } from '../../core/entities/universe.entity.js';
import { CollaborationInvitationRepository } from '../../core/interfaces/collaboration-invitation.repository.js';
import { UniverseRepository } from '../../core/entities/universe.entity.js';
import { UserRepository } from '../../core/interfaces/user.repository.js';
import { EmailService } from '../../core/interfaces/email.service.js';

export interface CreateInvitationRequest {
    universe_id: string;
    inviter_id: string;
    invitee_email: string;
    role: CollaborationRole;
    message?: string;
    expires_at?: Date;
}

export interface AcceptInvitationRequest {
    token: string;
    user_id: string;
}

export interface RespondToInvitationRequest {
    token: string;
    user_id: string;
    accept: boolean;
}

/**
 * Collaboration invitation management use cases
 */
export class CollaborationInvitationUseCase {
    constructor(
        private invitationRepository: CollaborationInvitationRepository,
        private universeRepository: UniverseRepository,
        private userRepository: UserRepository,
        private emailService: EmailService
    ) { }

    /**
     * Create and send a collaboration invitation
     */
    async createInvitation(request: CreateInvitationRequest): Promise<{
        success: boolean;
        invitation?: CollaborationInvitation;
        error?: string;
    }> {
        try {
            // Verify universe exists and inviter has permission
            const universe = await this.universeRepository.findById(request.universe_id);
            if (!universe) {
                return { success: false, error: 'Universe not found' };
            }

            // Check if inviter is the owner or has manager role
            if (universe.owner_id !== request.inviter_id) {
                // TODO: Check if inviter has manager role in universe contributors
                return { success: false, error: 'Insufficient permissions to invite contributors' };
            }

            // Check if user is trying to invite themselves
            const inviter = await this.userRepository.findById(request.inviter_id);
            if (inviter && inviter.email.toLowerCase() === request.invitee_email.toLowerCase()) {
                return { success: false, error: 'Cannot invite yourself to collaborate' };
            }

            // Check if invitation already exists
            const existingInvitation = await this.invitationRepository.hasPendingInvitation(
                request.universe_id,
                request.invitee_email
            );
            if (existingInvitation) {
                return { success: false, error: 'User already has a pending invitation for this universe' };
            }

            // Check if user is already a contributor
            // TODO: Implement contributor check in universe entity

            // Find invitee user if they exist
            const inviteeUser = await this.userRepository.findByEmail(request.invitee_email);

            // Create invitation
            const invitation = new CollaborationInvitation({
                universe_id: request.universe_id,
                inviter_id: request.inviter_id,
                invitee_email: request.invitee_email,
                invitee_id: inviteeUser?.id,
                role: request.role,
                message: request.message,
                expires_at: request.expires_at,
            });

            // Save invitation
            const savedInvitation = await this.invitationRepository.save(invitation);

            // Send invitation email
            await this.sendInvitationEmail(savedInvitation, universe.name, inviter?.username || 'Unknown');

            return { success: true, invitation: savedInvitation };
        } catch (error) {
            console.error('Error creating collaboration invitation:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to create invitation'
            };
        }
    }

    /**
     * Accept a collaboration invitation
     */
    async acceptInvitation(request: AcceptInvitationRequest): Promise<{
        success: boolean;
        invitation?: CollaborationInvitation;
        error?: string;
    }> {
        try {
            // Find invitation by token
            const invitation = await this.invitationRepository.findByToken(request.token);
            if (!invitation) {
                return { success: false, error: 'Invitation not found or invalid' };
            }

            // Check if invitation is still valid
            if (!invitation.isValid()) {
                return { success: false, error: 'Invitation has expired or is no longer valid' };
            }

            // Verify user email matches invitation
            const user = await this.userRepository.findById(request.user_id);
            if (!user || user.email.toLowerCase() !== invitation.invitee_email.toLowerCase()) {
                return { success: false, error: 'User email does not match invitation' };
            }

            // Accept invitation
            const acceptedInvitation = invitation.accept(request.user_id);
            const savedInvitation = await this.invitationRepository.update(invitation.id, acceptedInvitation);

            // Add user as contributor to universe
            const universe = await this.universeRepository.findById(invitation.universe_id);
            if (universe) {
                // TODO: Add user as contributor to universe
                // universe.addContributor({ user_id: request.user_id, role: invitation.role });
                // await this.universeRepository.update(universe.id, universe);
            }

            return { success: true, invitation: savedInvitation };
        } catch (error) {
            console.error('Error accepting collaboration invitation:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to accept invitation'
            };
        }
    }

    /**
     * Decline a collaboration invitation
     */
    async declineInvitation(token: string): Promise<{
        success: boolean;
        invitation?: CollaborationInvitation;
        error?: string;
    }> {
        try {
            // Find invitation by token
            const invitation = await this.invitationRepository.findByToken(token);
            if (!invitation) {
                return { success: false, error: 'Invitation not found or invalid' };
            }

            // Decline invitation
            const declinedInvitation = invitation.decline();
            const savedInvitation = await this.invitationRepository.update(invitation.id, declinedInvitation);

            return { success: true, invitation: savedInvitation };
        } catch (error) {
            console.error('Error declining collaboration invitation:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to decline invitation'
            };
        }
    }

    /**
     * Revoke an invitation (by inviter)
     */
    async revokeInvitation(invitationId: string, userId: string): Promise<{
        success: boolean;
        invitation?: CollaborationInvitation;
        error?: string;
    }> {
        try {
            // Find invitation
            const invitation = await this.invitationRepository.findById(invitationId);
            if (!invitation) {
                return { success: false, error: 'Invitation not found' };
            }

            // Verify user has permission to revoke (must be inviter or universe owner)
            if (invitation.inviter_id !== userId) {
                const universe = await this.universeRepository.findById(invitation.universe_id);
                if (!universe || universe.owner_id !== userId) {
                    return { success: false, error: 'Insufficient permissions to revoke invitation' };
                }
            }

            // Revoke invitation
            const revokedInvitation = invitation.revoke();
            const savedInvitation = await this.invitationRepository.update(invitation.id, revokedInvitation);

            return { success: true, invitation: savedInvitation };
        } catch (error) {
            console.error('Error revoking collaboration invitation:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to revoke invitation'
            };
        }
    }

    /**
     * Get invitations for a universe
     */
    async getUniverseInvitations(universeId: string, userId: string): Promise<{
        success: boolean;
        invitations?: CollaborationInvitation[];
        error?: string;
    }> {
        try {
            // Verify user has permission to view invitations
            const universe = await this.universeRepository.findById(universeId);
            if (!universe) {
                return { success: false, error: 'Universe not found' };
            }

            if (universe.owner_id !== userId) {
                // TODO: Check if user has manager role
                return { success: false, error: 'Insufficient permissions' };
            }

            const invitations = await this.invitationRepository.findByUniverseId(universeId);
            return { success: true, invitations };
        } catch (error) {
            console.error('Error getting universe invitations:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get invitations'
            };
        }
    }

    /**
     * Get invitations for a user
     */
    async getUserInvitations(userEmail: string): Promise<{
        success: boolean;
        invitations?: CollaborationInvitation[];
        error?: string;
    }> {
        try {
            const invitations = await this.invitationRepository.findByUserEmail(userEmail);
            return { success: true, invitations };
        } catch (error) {
            console.error('Error getting user invitations:', error);
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to get invitations'
            };
        }
    }

    /**
     * Clean up expired invitations
     */
    async cleanupExpiredInvitations(): Promise<number> {
        return await this.invitationRepository.cleanupExpired();
    }
    /**
     * Send invitation email
     */
    private async sendInvitationEmail(
        invitation: CollaborationInvitation,
        universeName: string,
        inviterName: string
    ): Promise<void> {
        await this.emailService.sendCollaborationInvitation(
            invitation.invitee_email,
            inviterName,
            universeName,
            invitation.role,
            invitation.token,
            invitation.message,
            invitation.expires_at
        );
    }
}
