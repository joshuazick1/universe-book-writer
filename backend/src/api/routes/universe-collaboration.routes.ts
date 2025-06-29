/**
 * Universe Collaboration Routes
 * 
 * REST API endpoints for simplified universe collaboration management
 */

import { Router } from 'express';
import type { UniverseCollaborationController } from '../controllers/universe-collaboration.controller.js';

/**
 * Create universe collaboration routes with dependency injection
 */
export function createUniverseCollaborationRoutes(
    collaborationController: UniverseCollaborationController
): Router {
    const router = Router();

    // Add collaborator to universe
    router.post('/:id/collaborators', collaborationController.addCollaborator.bind(collaborationController));

    // Get all collaborators for a universe
    router.get('/:id/collaborators', collaborationController.getCollaborators.bind(collaborationController));

    // Update collaborator role
    router.put('/:id/collaborators/:collaboratorId', collaborationController.updateCollaboratorRole.bind(collaborationController));

    // Remove collaborator from universe
    router.delete('/:id/collaborators/:collaboratorId', collaborationController.removeCollaborator.bind(collaborationController));

    // Leave universe (for collaborators)
    router.post('/:id/leave', collaborationController.leaveUniverse.bind(collaborationController));

    return router;
}
