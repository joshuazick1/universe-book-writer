/**
 * Universe Collaboration Controller
 * 
 * Handles HTTP requests for simplified universe collaboration management
 */

import type { Request, Response } from 'express';
import { UniverseCollaborationUseCase } from '../../application/use-cases/universe-collaboration.use-case.js';
import { CollaborationRole } from '../../core/entities/universe.entity.js';

/**
 * Controller for universe collaboration operations
 */
export class UniverseCollaborationController {
    constructor(
        private collaborationUseCase: UniverseCollaborationUseCase
    ) { }

    /**
     * Add a collaborator to a universe
     * POST /api/universes/:id/collaborators
     */
    async addCollaborator(req: Request, res: Response): Promise<void> {
        try {
            const { id: universe_id } = req.params;
            const { email, role, message } = req.body;
            const requester_id = (req as any).user?.id;

            if (!requester_id) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            if (!email || !role) {
                res.status(400).json({
                    success: false,
                    error: 'Email and role are required'
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
            if (!emailRegex.test(email)) {
                res.status(400).json({
                    success: false,
                    error: 'Invalid email format'
                });
                return;
            }

            const result = await this.collaborationUseCase.addCollaborator({
                universe_id,
                requester_id,
                collaborator_email: email,
                role,
                message
            });

            if (result.success) {
                res.status(201).json({
                    success: true,
                    data: result.collaborator
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Error adding collaborator:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * Remove a collaborator from a universe
     * DELETE /api/universes/:id/collaborators/:collaboratorId
     */
    async removeCollaborator(req: Request, res: Response): Promise<void> {
        try {
            const { id: universe_id, collaboratorId } = req.params;
            const requester_id = (req as any).user?.id;

            if (!requester_id) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            const result = await this.collaborationUseCase.removeCollaborator({
                universe_id,
                requester_id,
                collaborator_id: collaboratorId
            });

            if (result.success) {
                res.json({
                    success: true,
                    message: 'Collaborator removed successfully'
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Error removing collaborator:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * Update a collaborator's role
     * PUT /api/universes/:id/collaborators/:collaboratorId
     */
    async updateCollaboratorRole(req: Request, res: Response): Promise<void> {
        try {
            const { id: universe_id, collaboratorId } = req.params;
            const { role } = req.body;
            const requester_id = (req as any).user?.id;

            if (!requester_id) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            if (!role) {
                res.status(400).json({
                    success: false,
                    error: 'Role is required'
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

            const result = await this.collaborationUseCase.updateCollaboratorRole({
                universe_id,
                requester_id,
                collaborator_id: collaboratorId,
                new_role: role
            });

            if (result.success) {
                res.json({
                    success: true,
                    message: 'Collaborator role updated successfully'
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Error updating collaborator role:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * Leave a universe (for collaborators)
     * POST /api/universes/:id/leave
     */
    async leaveUniverse(req: Request, res: Response): Promise<void> {
        try {
            const { id: universe_id } = req.params;
            const user_id = (req as any).user?.id;

            if (!user_id) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            const result = await this.collaborationUseCase.leaveUniverse({
                universe_id,
                user_id
            });

            if (result.success) {
                res.json({
                    success: true,
                    message: 'Successfully left the universe'
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Error leaving universe:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }

    /**
     * Get all collaborators for a universe
     * GET /api/universes/:id/collaborators
     */
    async getCollaborators(req: Request, res: Response): Promise<void> {
        try {
            const { id: universe_id } = req.params;
            const requester_id = (req as any).user?.id;

            if (!requester_id) {
                res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
                return;
            }

            const result = await this.collaborationUseCase.getUniverseCollaborators(
                universe_id,
                requester_id
            );

            if (result.success) {
                res.json({
                    success: true,
                    data: {
                        collaborators: result.collaborators
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Error getting collaborators:', error);
            res.status(500).json({
                success: false,
                error: 'Internal server error'
            });
        }
    }
}
