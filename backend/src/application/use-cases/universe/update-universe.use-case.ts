/**
 * Update Universe Use Case
 * 
 * Handles updating existing universes with validation and plugin data preservation.
 */

import { UniverseEntity } from '../../../core/entities/universe.entity.js';
import type { UniverseRepository } from '../../../core/entities/universe.entity.js';
import type {
    UpdateUniverseParams,
    UniverseValidationResult,
    UniverseDomainService
} from '../../../core/interfaces/universe.interfaces.js';

/**
 * Update Universe Use Case Input
 */
export interface UpdateUniverseInput extends Omit<UpdateUniverseParams, 'id'> {
    id: string;
    user_id: string; // For permission checking
}

/**
 * Update Universe Use Case Output
 */
export interface UpdateUniverseOutput {
    success: boolean;
    universe?: UniverseEntity;
    validation_result?: UniverseValidationResult;
    error?: string;
}

/**
 * Update Universe Use Case
 */
export class UpdateUniverseUseCase {
    constructor(
        private universeRepository: UniverseRepository,
        private universeDomainService: UniverseDomainService
    ) { }

    async execute(input: UpdateUniverseInput): Promise<UpdateUniverseOutput> {
        try {
            // Find existing universe
            const existingUniverse = await this.universeRepository.findById(input.id);
            if (!existingUniverse) {
                return {
                    success: false,
                    error: 'Universe not found'
                };
            }

            // Check permissions
            if (!this.canUpdateUniverse(existingUniverse, input.user_id)) {
                return {
                    success: false,
                    error: 'Insufficient permissions to update universe'
                };
            }

            // Check name availability if name is being changed
            if (input.name && input.name !== existingUniverse.name) {
                const isNameAvailable = await this.universeRepository.isNameAvailable(
                    input.name,
                    existingUniverse.owner_id,
                    input.id
                );

                if (!isNameAvailable) {
                    return {
                        success: false,
                        error: 'Universe name is already taken'
                    };
                }
            }

            // Apply updates
            if (input.name) {
                existingUniverse.updateName(input.name);
            }

            if (input.description !== undefined) {
                existingUniverse.updateDescription(input.description);
            }

            if (input.plugin_config) {
                const currentConfig = existingUniverse.plugin_config;
                const newConfig = {
                    ...currentConfig,
                    ...input.plugin_config
                };
                existingUniverse.updatePluginConfig(newConfig);
            }

            if (input.settings) {
                existingUniverse.updateSettings(input.settings);
            }

            // Validate updated universe
            const validationResult = await this.universeDomainService.validateUniverse(existingUniverse);

            if (!validationResult.is_valid) {
                return {
                    success: false,
                    validation_result: validationResult,
                    error: 'Universe validation failed'
                };
            }

            // Save updated universe
            await this.universeRepository.save(existingUniverse);

            return {
                success: true,
                universe: existingUniverse,
                validation_result: validationResult
            };

        } catch (error) {
            return {
                success: false,
                error: `Failed to update universe: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    private canUpdateUniverse(universe: UniverseEntity, userId: string): boolean {
        // Owner can always update
        if (universe.owner_id === userId) {
            return true;
        }

        // Check collaboration permissions
        return universe.hasCollaborationPermission(userId, 'can_edit');
    }
}
