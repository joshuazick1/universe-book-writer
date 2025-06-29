/**
 * Delete Universe Use Case
 * 
 * Handles safe deletion of universes with plugin data preservation.
 */

import { UniverseEntity } from '../../../core/entities/universe.entity.js';
import type { UniverseRepository } from '../../../core/entities/universe.entity.js';

/**
 * Delete Universe Use Case Input
 */
export interface DeleteUniverseInput {
    id: string;
    user_id: string; // For permission checking
    preserve_data?: boolean; // Whether to preserve plugin data
}

/**
 * Delete Universe Use Case Output
 */
export interface DeleteUniverseOutput {
    success: boolean;
    preserved_data?: Record<string, unknown>;
    error?: string;
}

/**
 * Delete Universe Use Case
 */
export class DeleteUniverseUseCase {
    constructor(
        private universeRepository: UniverseRepository
    ) { }

    async execute(input: DeleteUniverseInput): Promise<DeleteUniverseOutput> {
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
            if (!this.canDeleteUniverse(existingUniverse, input.user_id)) {
                return {
                    success: false,
                    error: 'Insufficient permissions to delete universe'
                };
            }

            // Preserve plugin data if requested
            let preserved_data: Record<string, unknown> | undefined;
            if (input.preserve_data) {
                preserved_data = {
                    plugin_data_store: existingUniverse.plugin_data_store,
                    orphaned_plugin_data: existingUniverse.orphaned_plugin_data,
                    plugin_config: existingUniverse.plugin_config
                };
            }

            // Delete universe
            await this.universeRepository.delete(input.id);

            return {
                success: true,
                preserved_data
            };

        } catch (error) {
            return {
                success: false,
                error: `Failed to delete universe: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    private canDeleteUniverse(universe: UniverseEntity, userId: string): boolean {
        // Only owner can delete universe
        return universe.owner_id === userId;
    }
}
