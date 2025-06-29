/**
 * Collaboration Invitation Routes
 * 
 * REST API endpoints for managing universe collaboration invitations
 */

import { Router } from 'express';
import type { CollaborationInvitationController } from '../controllers/collaboration-invitation.controller.js';

/**
 * Create collaboration invitation routes with dependency injection
 */
export function createCollaborationInvitationRoutes(
    invitationController: CollaborationInvitationController
): Router {
    const router = Router();

    // Create invitation (authenticated users only)
    router.post('/', invitationController.createInvitation.bind(invitationController));

    // Get current user's invitations
    router.get('/me', invitationController.getMyInvitations.bind(invitationController));

    // Get invitation details by token (public endpoint for invitation page)
    router.get('/:token', invitationController.getInvitationByToken.bind(invitationController));

    // Accept invitation
    router.post('/:token/accept', invitationController.acceptInvitation.bind(invitationController));

    // Decline invitation (public endpoint - no auth required)
    router.post('/:token/decline', invitationController.declineInvitation.bind(invitationController));

    // Revoke invitation (authenticated users only)
    router.delete('/:id', invitationController.revokeInvitation.bind(invitationController));

    return router;
}

/**
 * Create universe-specific invitation routes
 */
export function createUniverseInvitationRoutes(
    invitationController: CollaborationInvitationController
): Router {
    const router = Router();

    // Get invitations for a universe
    router.get('/invitations', invitationController.getUniverseInvitations.bind(invitationController));

    return router;
}
