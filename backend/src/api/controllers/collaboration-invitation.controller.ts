/**
 * Collaboration Invitation Controller
 * 
 * Handles HTTP requests for universe collaboration invitations
 */

import type { Request, Response } from 'express';
import { CollaborationInvitationUseCase } from '../../application/use-cases/collaboration-invitation.use-case.js';
import { CollaborationRole } from '../../core/entities/universe.entity.js';

/**
 * Collaboration invitation controller for REST API endpoints
 */
export class CollaborationInvitationController {
    constructor(
        private invitationUseCase: CollaborationInvitationUseCase
    ) { }

    /**
     * Create a collaboration invitation
     * POST /api/invitations
     */
    async createInvitation(req: Request, res: Response): Promise<void> {
        try {
            const {
                universe_id,
                invitee_email,
                role,
                message,
                expires_at
            } = req.body;

            // Get inviter ID from authenticated user
            const inviter_id = (req as any).user?.id;
            if (!inviter_id) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            // Validate required fields
            if (!universe_id || !invitee_email || !role) {
                res.status(400).json({
                    success: false,
                    error: 'Missing required fields: universe_id, invitee_email, role'
                });
                return;
            }

            // Validate role
            if (!Object.values(CollaborationRole).includes(role)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid collaboration role'
                });
                return;
            }

            // Validate email format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(invitee_email)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid email format'
                });
                return;
            }

            const result = await this.invitationUseCase.createInvitation({
                universe_id,
                inviter_id,
                invitee_email,
                role,
                message,
                expires_at: expires_at ? new Date(expires_at) : undefined
            });

            if (result.success && result.invitation) {
                res.status(201).json({
                    success: true,
                    data: {
                        id: result.invitation.id,
                        universe_id: result.invitation.universe_id,
                        invitee_email: result.invitation.invitee_email,
                        role: result.invitation.role,
                        status: result.invitation.status,
                        expires_at: result.invitation.expires_at,
                        created_at: result.invitation.created_at
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Error creating collaboration invitation:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * Accept a collaboration invitation
     * POST /api/invitations/:token/accept
     */
    async acceptInvitation(req: Request, res: Response): Promise<void> {
        try {
            const { token } = req.params;
            const user_id = (req as any).user?.id;

            if (!user_id) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            const result = await this.invitationUseCase.acceptInvitation({
                token,
                user_id
            });

            if (result.success && result.invitation) {
                res.json({
                    success: true,
                    data: {
                        id: result.invitation.id,
                        universe_id: result.invitation.universe_id,
                        status: result.invitation.status,
                        accepted_at: result.invitation.accepted_at
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Error accepting collaboration invitation:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * Decline a collaboration invitation
     * POST /api/invitations/:token/decline
     */
    async declineInvitation(req: Request, res: Response): Promise<void> {
        try {
            const { token } = req.params;

            const result = await this.invitationUseCase.declineInvitation(token);

            if (result.success && result.invitation) {
                res.json({
                    success: true,
                    data: {
                        id: result.invitation.id,
                        status: result.invitation.status,
                        declined_at: result.invitation.declined_at
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Error declining collaboration invitation:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * Revoke a collaboration invitation
     * DELETE /api/invitations/:id
     */
    async revokeInvitation(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const user_id = (req as any).user?.id;

            if (!user_id) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            const result = await this.invitationUseCase.revokeInvitation(id, user_id);

            if (result.success && result.invitation) {
                res.json({
                    success: true,
                    data: {
                        id: result.invitation.id,
                        status: result.invitation.status
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Error revoking collaboration invitation:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * Get invitations for a universe
     * GET /api/universes/:universeId/invitations
     */
    async getUniverseInvitations(req: Request, res: Response): Promise<void> {
        try {
            const { universeId } = req.params;
            const user_id = (req as any).user?.id;

            if (!user_id) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            const result = await this.invitationUseCase.getUniverseInvitations(universeId, user_id);

            if (result.success && result.invitations) {
                res.json({
                    success: true,
                    data: {
                        invitations: result.invitations.map(invitation => ({
                            id: invitation.id,
                            invitee_email: invitation.invitee_email,
                            role: invitation.role,
                            status: invitation.status,
                            message: invitation.message,
                            expires_at: invitation.expires_at,
                            created_at: invitation.created_at,
                            accepted_at: invitation.accepted_at,
                            declined_at: invitation.declined_at
                        }))
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Error getting universe invitations:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * Get invitations for current user
     * GET /api/invitations/me
     */
    async getMyInvitations(req: Request, res: Response): Promise<void> {
        try {
            const user = (req as any).user;
            if (!user?.email) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            const result = await this.invitationUseCase.getUserInvitations(user.email);

            if (result.success && result.invitations) {
                res.json({
                    success: true,
                    data: {
                        invitations: result.invitations.map(invitation => ({
                            id: invitation.id,
                            universe_id: invitation.universe_id,
                            role: invitation.role,
                            status: invitation.status,
                            message: invitation.message,
                            expires_at: invitation.expires_at,
                            created_at: invitation.created_at,
                            token: invitation.status === 'pending' ? invitation.token : undefined
                        }))
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Error getting user invitations:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * Get invitation details by token (for invitation page)
     * GET /api/invitations/:token
     */
    async getInvitationByToken(req: Request, res: Response): Promise<void> {
        try {
            const { token } = req.params;

            // This is a simple implementation - in production you might want more security
            const invitation = await this.invitationUseCase['invitationRepository'].findByToken(token);

            if (!invitation) {
                res.status(404).json({
                    success: false,
                    error: 'Invitation not found'
                });
                return;
            }

            // Get universe details for invitation page
            const universe = await this.invitationUseCase['universeRepository'].findById(invitation.universe_id);
            const inviter = await this.invitationUseCase['userRepository'].findById(invitation.inviter_id);

            res.json({
                success: true,
                data: {
                    id: invitation.id,
                    universe: {
                        id: universe?.id,
                        name: universe?.name,
                        description: universe?.description
                    },
                    inviter: {
                        username: inviter?.username,
                        email: inviter?.email
                    },
                    role: invitation.role,
                    message: invitation.message,
                    status: invitation.status,
                    expires_at: invitation.expires_at,
                    created_at: invitation.created_at,
                    is_valid: invitation.isValid()
                }
            });
        } catch (error) {
            console.error('Error getting invitation by token:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
}
