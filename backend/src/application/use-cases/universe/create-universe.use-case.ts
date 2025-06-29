/**
 * Create Universe Use Case
 * 
 * Handles the creation of new universes with plugin configuration,
 * validation, and initial setup.
 */

import { UniverseEntity, CanonLevel } from '../../../core/entities/universe.entity.js';
import type { UniverseRepository } from '../../../core/entities/universe.entity.js';
import type {
    CreateUniverseParams,
    UniverseValidationResult,
    UniverseDomainService
} from '../../../core/interfaces/universe.interfaces.js';

/**
 * Create Universe Use Case Input
 */
export interface CreateUniverseInput {
    name: string;
    description: string;
    owner_id: string;
    plugin_id: string;
    plugin_version: string;
    sub_universe: string;
    canon_compliance: CanonLevel;
    theme_config?: {
        theme_id: string;
        variant: string;
        custom_properties?: Record<string, unknown>;
    };
    settings?: {
        is_private?: boolean;
        allow_collaboration?: boolean;
        sync_settings?: {
            real_time_sync?: boolean;
            sync_frequency?: number;
        };
    };
}

/**
 * Create Universe Use Case Output
 */
export interface CreateUniverseOutput {
    success: boolean;
    universe?: UniverseEntity;
    validation_result?: UniverseValidationResult;
    error?: string;
}

/**
 * Create Universe Use Case
 */
export class CreateUniverseUseCase {
    constructor(
        private universeRepository: UniverseRepository,
        private universeDomainService: UniverseDomainService
    ) { }

    async execute(input: CreateUniverseInput): Promise<CreateUniverseOutput> {
        try {
            // Validate input parameters
            const inputValidation = await this.validateInput(input);
            if (!inputValidation.success) {
                return {
                    success: false,
                    error: inputValidation.error
                };
            }      // Check if universe name is available
            const isNameAvailable = await this.universeRepository.isNameAvailable(
                input.name,
                input.owner_id
            );

            if (isNameAvailable === false) {
                return {
                    success: false,
                    error: 'Universe name is already taken'
                };
            }

            // Create universe entity
            const universe = new UniverseEntity({
                name: input.name,
                description: input.description,
                owner_id: input.owner_id,
                plugin_config: {
                    active_plugin: input.plugin_id,
                    plugin_version: input.plugin_version,
                    sub_universe: input.sub_universe,
                    canon_compliance: input.canon_compliance,
                    theme_config: input.theme_config || {
                        theme_id: 'default',
                        variant: 'standard'
                    }
                },
                settings: {
                    is_private: input.settings?.is_private || false,
                    allow_collaboration: input.settings?.allow_collaboration || true,
                    collaboration_permissions: {
                        can_view: true,
                        can_edit: false,
                        can_manage: false,
                        user_permissions: {}
                    },
                    sync_settings: {
                        real_time_sync: input.settings?.sync_settings?.real_time_sync || true,
                        sync_frequency: input.settings?.sync_settings?.sync_frequency || 1000,
                        conflict_resolution: 'last_write_wins',
                        mobile_settings: {
                            sync_on_cellular: false,
                            max_payload_size: 1024 * 1024,
                            offline_mode: true
                        }
                    },
                    validation_settings: {
                        strict_validation: false,
                        custom_rules: [],
                        auto_correction: {
                            enabled: false,
                            correction_types: [],
                            require_confirmation: true
                        }
                    }
                }
            });

            // Validate universe with domain service
            const validationResult = await this.universeDomainService.validateUniverse(universe);

            if (!validationResult.is_valid) {
                return {
                    success: false,
                    validation_result: validationResult,
                    error: 'Universe validation failed'
                };
            }

            // Save universe
            await this.universeRepository.save(universe);

            return {
                success: true,
                universe,
                validation_result: validationResult
            };

        } catch (error) {
            return {
                success: false,
                error: `Failed to create universe: ${error instanceof Error ? error.message : 'Unknown error'}`
            };
        }
    }

    private async validateInput(input: CreateUniverseInput): Promise<{ success: boolean; error?: string }> {
        // Name validation
        if (!input.name || input.name.trim().length === 0) {
            return { success: false, error: 'Universe name is required' };
        }

        if (input.name.length > 255) {
            return { success: false, error: 'Universe name must be 255 characters or less' };
        }

        // Description validation
        if (input.description && input.description.length > 2000) {
            return { success: false, error: 'Universe description must be 2000 characters or less' };
        }

        // Owner ID validation
        if (!input.owner_id || input.owner_id.trim().length === 0) {
            return { success: false, error: 'Owner ID is required' };
        }

        // Plugin validation
        if (!input.plugin_id || input.plugin_id.trim().length === 0) {
            return { success: false, error: 'Plugin ID is required' };
        }

        if (!input.plugin_version || input.plugin_version.trim().length === 0) {
            return { success: false, error: 'Plugin version is required' };
        }

        // Sub-universe validation
        if (!input.sub_universe || input.sub_universe.trim().length === 0) {
            return { success: false, error: 'Sub-universe is required' };
        }

        // Canon compliance validation
        if (!Object.values(CanonLevel).includes(input.canon_compliance)) {
            return { success: false, error: 'Invalid canon compliance level' };
        }

        return { success: true };
    }
}
