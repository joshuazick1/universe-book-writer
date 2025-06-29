/**
 * Universe Collaboration Use Cases
 * 
 * Simplified collaboration system that directly manages universe permissions
 * and sends notification emails instead of complex invitation flows
 */

import { UniverseRepository } from '../../core/entities/universe.entity.js';
import { UserRepository } from '../../core/interfaces/user.repository.js';
import { EmailService } from '../../core/interfaces/email.service.js';
import { CollaborationRole } from '../../core/entities/universe.entity.js';

export interface AddCollaboratorRequest {
    universe_id: string;
    requester_id: string; // User making the request (must be owner or manager)
    collaborator_email: string;
    role: CollaborationRole;
    message?: string; // Optional message to include in notification
}

export interface RemoveCollaboratorRequest {
    universe_id: string;
    requester_id: string;
    collaborator_id: string;
}

export interface UpdateCollaboratorRoleRequest {
    universe_id: string;
    requester_id: string;
    collaborator_id: string;
    new_role: CollaborationRole;
}

export interface LeaveUniverseRequest {
    universe_id: string;
    user_id: string;
}

/**
 * Simplified collaboration management use cases
 */
export class UniverseCollaborationUseCase {
    constructor(
        private universeRepository: UniverseRepository,
        private userRepository: UserRepository,
        private emailService: EmailService
    ) { }

    /**
     * Add a collaborator directly to the universe
     */
    async addCollaborator(request: AddCollaboratorRequest): Promise<{
        success: boolean;
        error?: string;
        collaborator?: {
            id: string;
            email: string;
            role: CollaborationRole;
        };
    }> {
        try {
            // Verify universe exists
            const universe = await this.universeRepository.findById(request.universe_id);
            if (!universe) {
                return { success: false, error: 'Universe not found' };
            }

            // Check requester permissions (must be owner or manager)
            const requesterRole = universe.getUserRole(request.requester_id);
            if (!requesterRole || (requesterRole !== CollaborationRole.OWNER && requesterRole !== CollaborationRole.MANAGER)) {
                return { success: false, error: 'Insufficient permissions to add collaborators' };
            }

            // Find the user to be added
            const collaboratorUser = await this.userRepository.findByEmail(request.collaborator_email);
            if (!collaboratorUser) {
                return { success: false, error: 'User not found. They must create an account first.' };
            }

            // Check if user is trying to add themselves
            if (collaboratorUser.id === request.requester_id) {
                return { success: false, error: 'Cannot add yourself as a collaborator' };
            }

            // Check if user is already a collaborator
            if (universe.isCollaborator(collaboratorUser.id)) {
                return { success: false, error: 'User is already a collaborator in this universe' };
            }

            // Add the collaborator
            universe.addCollaborator(collaboratorUser.id, request.role);
            await this.universeRepository.save(universe);

            // Get requester details for email
            const requester = await this.userRepository.findById(request.requester_id);
            const requesterName = requester?.profile?.firstName
                ? `${requester.profile.firstName} ${requester.profile.lastName || ''}`.trim()
                : requester?.username || 'Someone';

            // Send notification email
            try {
                await this.emailService.sendCollaborationNotification(
                    collaboratorUser.email,
                    requesterName,
                    universe.name,
                    request.role,
                    `${process.env.FRONTEND_URL}/universes/${universe.id}`,
                    request.message
                );
            } catch (emailError) {
                console.error('Failed to send collaboration notification email:', emailError);
                // Don't fail the operation if email fails
            }

            return {
                success: true,
                collaborator: {
                    id: collaboratorUser.id,
                    email: collaboratorUser.email,
                    role: request.role
                }
            };
        } catch (error) {
            console.error('Error adding collaborator:', error);
            return { success: false, error: 'Failed to add collaborator' };
        }
    }

    /**
     * Remove a collaborator from the universe
     */
    async removeCollaborator(request: RemoveCollaboratorRequest): Promise<{
        success: boolean;
        error?: string;
    }> {
        try {
            // Verify universe exists
            const universe = await this.universeRepository.findById(request.universe_id);
            if (!universe) {
                return { success: false, error: 'Universe not found' };
            }

            // Check requester permissions
            const requesterRole = universe.getUserRole(request.requester_id);
            if (!requesterRole || (requesterRole !== CollaborationRole.OWNER && requesterRole !== CollaborationRole.MANAGER)) {
                return { success: false, error: 'Insufficient permissions to remove collaborators' };
            }

            // Check if collaborator exists
            if (!universe.isCollaborator(request.collaborator_id)) {
                return { success: false, error: 'User is not a collaborator in this universe' };
            }

            // Remove the collaborator
            universe.removeCollaborator(request.collaborator_id);
            await this.universeRepository.save(universe);

            // Send notification email to removed collaborator
            try {
                const removedUser = await this.userRepository.findById(request.collaborator_id);
                const requester = await this.userRepository.findById(request.requester_id);

                if (removedUser && requester) {
                    const requesterName = requester.profile?.firstName
                        ? `${requester.profile.firstName} ${requester.profile.lastName || ''}`.trim()
                        : requester.username || 'Someone';

                    await this.emailService.sendCollaborationRemovalNotification(
                        removedUser.email,
                        requesterName,
                        universe.name
                    );
                }
            } catch (emailError) {
                console.error('Failed to send removal notification email:', emailError);
                // Don't fail the operation if email fails
            }

            return { success: true };
        } catch (error) {
            console.error('Error removing collaborator:', error);
            return { success: false, error: 'Failed to remove collaborator' };
        }
    }

    /**
     * Update a collaborator's role
     */
    async updateCollaboratorRole(request: UpdateCollaboratorRoleRequest): Promise<{
        success: boolean;
        error?: string;
    }> {
        try {
            // Verify universe exists
            const universe = await this.universeRepository.findById(request.universe_id);
            if (!universe) {
                return { success: false, error: 'Universe not found' };
            }

            // Check requester permissions
            const requesterRole = universe.getUserRole(request.requester_id);
            if (!requesterRole || (requesterRole !== CollaborationRole.OWNER && requesterRole !== CollaborationRole.MANAGER)) {
                return { success: false, error: 'Insufficient permissions to update collaborator roles' };
            }

            // Update the role
            universe.updateCollaboratorRole(request.collaborator_id, request.new_role);
            await this.universeRepository.save(universe);

            return { success: true };
        } catch (error) {
            if (error instanceof Error) {
                return { success: false, error: error.message };
            }
            console.error('Error updating collaborator role:', error);
            return { success: false, error: 'Failed to update collaborator role' };
        }
    }

    /**
     * Allow a user to leave a universe they're collaborating on
     */
    async leaveUniverse(request: LeaveUniverseRequest): Promise<{
        success: boolean;
        error?: string;
    }> {
        try {
            // Verify universe exists
            const universe = await this.universeRepository.findById(request.universe_id);
            if (!universe) {
                return { success: false, error: 'Universe not found' };
            }

            // Check if user is a collaborator
            if (!universe.isCollaborator(request.user_id)) {
                return { success: false, error: 'You are not a collaborator in this universe' };
            }

            // Remove the user
            universe.removeCollaborator(request.user_id);
            await this.universeRepository.save(universe);

            return { success: true };
        } catch (error) {
            console.error('Error leaving universe:', error);
            return { success: false, error: 'Failed to leave universe' };
        }
    }

    /**
     * Get all collaborators for a universe
     */
    async getUniverseCollaborators(universe_id: string, requester_id: string): Promise<{
        success: boolean;
        error?: string;
        collaborators?: Array<{
            id: string;
            username: string;
            email: string;
            firstName?: string;
            lastName?: string;
            role: CollaborationRole;
        }>;
    }> {
        try {
            // Verify universe exists
            const universe = await this.universeRepository.findById(universe_id);
            if (!universe) {
                return { success: false, error: 'Universe not found' };
            }

            // Check if requester has access to view collaborators
            const requesterRole = universe.getUserRole(requester_id);
            if (!requesterRole) {
                return { success: false, error: 'Access denied' };
            }

            // Get collaborator details
            const collaboratorData = universe.getCollaborators();
            const collaborators = [];

            for (const { userId, role } of collaboratorData) {
                const user = await this.userRepository.findById(userId);
                if (user) {
                    collaborators.push({
                        id: user.id,
                        username: user.username,
                        email: user.email,
                        firstName: user.profile?.firstName,
                        lastName: user.profile?.lastName,
                        role
                    });
                }
            }

            return { success: true, collaborators };
        } catch (error) {
            console.error('Error getting universe collaborators:', error);
            return { success: false, error: 'Failed to get collaborators' };
        }
    }
}
