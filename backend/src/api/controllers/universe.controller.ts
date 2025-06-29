/**
 * Universe Controller
 * 
 * Handles HTTP requests for universe management, plugin configuration,
 * and advanced permission system operations.
 */

import type { Request, Response } from 'express';
import type { CreateUniverseUseCase } from '../../application/use-cases/universe/create-universe.use-case.js';
import type { UpdateUniverseUseCase } from '../../application/use-cases/universe/update-universe.use-case.js';
import type { DeleteUniverseUseCase } from '../../application/use-cases/universe/delete-universe.use-case.js';
import type { UniverseRepository } from '../../core/entities/universe.entity.js';
import { CanonLevel } from '../../core/entities/universe.entity.js';
import type { PluginUseCase } from '../../application/use-cases/plugin.use-case.js';

/**
 * Universe Controller for REST API endpoints
 */
export class UniverseController {
    constructor(
        private createUniverseUseCase: CreateUniverseUseCase,
        private updateUniverseUseCase: UpdateUniverseUseCase,
        private deleteUniverseUseCase: DeleteUniverseUseCase,
        private universeRepository: UniverseRepository,
        private pluginManager: PluginUseCase
    ) { }    /**
     * Create a new universe
     * POST /api/universes
     */
    async createUniverse(req: Request, res: Response): Promise<void> {
        try {
            const {
                name,
                description,
                settings
            } = req.body;

            // Get owner ID from authenticated user
            const owner_id = (req as any).user?.id;
            if (!owner_id) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            // Use default values for plugin configuration (can be customized later)
            const defaultPluginConfig = {
                plugin_id: 'custom',
                plugin_version: '1.0.0',
                sub_universe: 'default',
                canon_compliance: CanonLevel.FLEXIBLE,
                theme_config: {
                    theme_id: 'default',
                    variant: 'dark'
                }
            };

            const result = await this.createUniverseUseCase.execute({
                name,
                description,
                owner_id,
                plugin_id: defaultPluginConfig.plugin_id,
                plugin_version: defaultPluginConfig.plugin_version,
                sub_universe: defaultPluginConfig.sub_universe,
                canon_compliance: defaultPluginConfig.canon_compliance,
                theme_config: defaultPluginConfig.theme_config,
                settings
            });

            if (result.success && result.universe) {
                res.status(201).json({
                    success: true,
                    data: {
                        id: result.universe.id,
                        name: result.universe.name,
                        description: result.universe.description,
                        plugin_config: result.universe.plugin_config,
                        settings: result.universe.settings,
                        created_at: result.universe.created_at,
                        updated_at: result.universe.updated_at
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error,
                    validation_result: result.validation_result
                });
            }
        } catch (error) {
            console.error('Error creating universe:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * List universes for the authenticated user
     * GET /api/universes
     */
    async listUniverses(req: Request, res: Response): Promise<void> {
        try {
            const user_id = (req as any).user?.id;
            if (!user_id) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const { page = 1, limit = 20, search, plugin_id } = req.query;

            const universes = await this.universeRepository.findByOwnerId(
                user_id,
                {
                    page: Number(page),
                    limit: Number(limit),
                    search: search as string,
                    plugin_id: plugin_id as string
                }
            );

            res.json({
                success: true,
                data: universes.map(universe => ({
                    id: universe.id,
                    name: universe.name,
                    description: universe.description,
                    plugin_config: universe.plugin_config,
                    settings: {
                        is_private: universe.settings.is_private,
                        allow_collaboration: universe.settings.allow_collaboration
                    },
                    created_at: universe.created_at,
                    updated_at: universe.updated_at
                }))
            });
        } catch (error) {
            console.error('Error listing universes:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get a specific universe
     * GET /api/universes/:id
     */
    async getUniverse(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const user_id = (req as any).user?.id;

            if (!user_id) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const universe = await this.universeRepository.findById(id);
            if (!universe) {
                res.status(404).json({ error: 'Universe not found' });
                return;
            }

            // Check permissions
            if (universe.owner_id !== user_id) {
                // TODO: Check collaboration permissions
                res.status(403).json({ error: 'Access denied' });
                return;
            }

            res.json({
                success: true,
                data: {
                    id: universe.id,
                    name: universe.name,
                    description: universe.description,
                    plugin_config: universe.plugin_config,
                    settings: universe.settings,
                    plugin_data_store: universe.plugin_data_store,
                    orphaned_plugin_data: universe.orphaned_plugin_data,
                    sync_token: universe.sync_token,
                    created_at: universe.created_at,
                    updated_at: universe.updated_at
                }
            });
        } catch (error) {
            console.error('Error getting universe:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Update a universe
     * PUT /api/universes/:id
     */
    async updateUniverse(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const user_id = (req as any).user?.id;
            const updates = req.body;

            if (!user_id) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            } const result = await this.updateUniverseUseCase.execute({
                id: id,
                user_id,
                name: updates.name,
                description: updates.description,
                plugin_config: updates.plugin_config,
                settings: updates.settings
            });

            if (result.success && result.universe) {
                res.json({
                    success: true,
                    data: {
                        id: result.universe.id,
                        name: result.universe.name,
                        description: result.universe.description,
                        plugin_config: result.universe.plugin_config,
                        settings: result.universe.settings,
                        updated_at: result.universe.updated_at
                    }
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Error updating universe:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Delete a universe
     * DELETE /api/universes/:id
     */
    async deleteUniverse(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const user_id = (req as any).user?.id;

            if (!user_id) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            } const result = await this.deleteUniverseUseCase.execute({
                id: id,
                user_id
            });

            if (result.success) {
                res.json({
                    success: true,
                    message: 'Universe deleted successfully'
                });
            } else {
                res.status(400).json({
                    success: false,
                    error: result.error
                });
            }
        } catch (error) {
            console.error('Error deleting universe:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Configure plugin for universe
     * POST /api/universes/:id/plugin-config
     */
    async configurePlugin(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const user_id = (req as any).user?.id;
            const { plugin_id, plugin_version, sub_universe, canon_compliance, theme_config } = req.body;

            if (!user_id) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const universe = await this.universeRepository.findById(id);
            if (!universe || universe.owner_id !== user_id) {
                res.status(404).json({ error: 'Universe not found or access denied' });
                return;
            }            // Validate plugin exists
            const plugin = this.pluginManager.getPlugin(plugin_id);
            if (!plugin) {
                res.status(400).json({ error: `Plugin ${plugin_id} not found` });
                return;
            }

            // Update plugin configuration
            universe.updatePluginConfig({
                active_plugin: plugin_id,
                plugin_version: plugin_version || plugin.metadata.version,
                sub_universe: sub_universe || 'default',
                canon_compliance: canon_compliance || CanonLevel.FLEXIBLE,
                theme_config: theme_config || {
                    theme_id: 'default',
                    variant: 'standard'
                }
            });

            await this.universeRepository.save(universe);

            res.json({
                success: true,
                data: {
                    plugin_config: universe.plugin_config
                }
            });
        } catch (error) {
            console.error('Error configuring plugin:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get plugin configuration
     * GET /api/universes/:id/plugin-config
     */
    async getPluginConfig(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const user_id = (req as any).user?.id;

            if (!user_id) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const universe = await this.universeRepository.findById(id);
            if (!universe || universe.owner_id !== user_id) {
                res.status(404).json({ error: 'Universe not found or access denied' });
                return;
            }

            res.json({
                success: true,
                data: {
                    plugin_config: universe.plugin_config
                }
            });
        } catch (error) {
            console.error('Error getting plugin config:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Configure sub-universe (Star Trek specific)
     * POST /api/universes/:id/sub-universe
     */
    async configureSubUniverse(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const user_id = (req as any).user?.id;
            const { sub_universe, custom_rules } = req.body;

            if (!user_id) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const universe = await this.universeRepository.findById(id);
            if (!universe || universe.owner_id !== user_id) {
                res.status(404).json({ error: 'Universe not found or access denied' });
                return;
            }

            // Update sub-universe configuration
            const updatedConfig = { ...universe.plugin_config };
            updatedConfig.sub_universe = sub_universe;

            universe.updatePluginConfig(updatedConfig);

            // Store custom rules if provided
            if (custom_rules) {
                universe.storePluginData(
                    universe.plugin_config.active_plugin,
                    { custom_rules },
                    '1.0.0'
                );
            }

            await this.universeRepository.save(universe);

            res.json({
                success: true,
                data: {
                    sub_universe: universe.plugin_config.sub_universe,
                    custom_rules
                }
            });
        } catch (error) {
            console.error('Error configuring sub-universe:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get sub-universe configuration
     * GET /api/universes/:id/sub-universe
     */
    async getSubUniverseConfig(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const user_id = (req as any).user?.id;

            if (!user_id) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const universe = await this.universeRepository.findById(id);
            if (!universe || universe.owner_id !== user_id) {
                res.status(404).json({ error: 'Universe not found or access denied' });
                return;
            }

            const pluginData = universe.getPluginData(universe.plugin_config.active_plugin);
            const customRules = pluginData?.data?.custom_rules || {};

            res.json({
                success: true,
                data: {
                    sub_universe: universe.plugin_config.sub_universe,
                    canon_compliance: universe.plugin_config.canon_compliance,
                    custom_rules: customRules
                }
            });
        } catch (error) {
            console.error('Error getting sub-universe config:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Update permissions
     * POST /api/universes/:id/permissions
     */
    async updatePermissions(req: Request, res: Response): Promise<void> {
        try {
            // TODO: Implement permission management
            res.status(501).json({ error: 'Permission management not yet implemented' });
        } catch (error) {
            console.error('Error updating permissions:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get permissions
     * GET /api/universes/:id/permissions
     */
    async getPermissions(req: Request, res: Response): Promise<void> {
        try {
            // TODO: Implement permission retrieval
            res.status(501).json({ error: 'Permission retrieval not yet implemented' });
        } catch (error) {
            console.error('Error getting permissions:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Add contributor
     * POST /api/universes/:id/contributors
     */
    async addContributor(req: Request, res: Response): Promise<void> {
        try {
            // TODO: Implement contributor management
            res.status(501).json({ error: 'Contributor management not yet implemented' });
        } catch (error) {
            console.error('Error adding contributor:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Remove contributor
     * DELETE /api/universes/:id/contributors/:userId
     */
    async removeContributor(req: Request, res: Response): Promise<void> {
        try {
            // TODO: Implement contributor removal
            res.status(501).json({ error: 'Contributor removal not yet implemented' });
        } catch (error) {
            console.error('Error removing contributor:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Configure encryption
     * POST /api/universes/:id/encryption
     */
    async configureEncryption(req: Request, res: Response): Promise<void> {
        try {
            // TODO: Implement encryption configuration
            res.status(501).json({ error: 'Encryption configuration not yet implemented' });
        } catch (error) {
            console.error('Error configuring encryption:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Make universe public
     * POST /api/universes/:id/make-public
     */
    async makePublic(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const user_id = (req as any).user?.id;

            if (!user_id) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const universe = await this.universeRepository.findById(id);
            if (!universe || universe.owner_id !== user_id) {
                res.status(404).json({ error: 'Universe not found or access denied' });
                return;
            }

            universe.makePublic();
            await this.universeRepository.save(universe);

            res.json({
                success: true,
                data: {
                    privacy_status: universe.getPrivacyStatus()
                }
            });
        } catch (error) {
            console.error('Error making universe public:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Make universe private
     * POST /api/universes/:id/make-private
     */
    async makePrivate(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const user_id = (req as any).user?.id;

            if (!user_id) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const universe = await this.universeRepository.findById(id);
            if (!universe || universe.owner_id !== user_id) {
                res.status(404).json({ error: 'Universe not found or access denied' });
                return;
            }

            try {
                universe.makePrivate();
                await this.universeRepository.save(universe);

                res.json({
                    success: true,
                    data: {
                        privacy_status: universe.getPrivacyStatus()
                    }
                });
            } catch (encryptionError: any) {
                res.status(400).json({
                    success: false,
                    error: encryptionError.message
                });
            }
        } catch (error) {
            console.error('Error making universe private:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get plugin data
     * GET /api/universes/:id/plugin-data
     */
    async getPluginData(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const user_id = (req as any).user?.id;
            const { plugin_id } = req.query;

            if (!user_id) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const universe = await this.universeRepository.findById(id);
            if (!universe || universe.owner_id !== user_id) {
                res.status(404).json({ error: 'Universe not found or access denied' });
                return;
            }

            if (plugin_id) {
                const pluginData = universe.getPluginData(plugin_id as string);
                res.json({
                    success: true,
                    data: pluginData
                });
            } else {
                res.json({
                    success: true,
                    data: {
                        plugin_data_store: universe.plugin_data_store
                    }
                });
            }
        } catch (error) {
            console.error('Error getting plugin data:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Preserve plugin data
     * POST /api/universes/:id/plugin-data/preserve
     */
    async preservePluginData(req: Request, res: Response): Promise<void> {
        try {
            // TODO: Implement plugin data preservation
            res.status(501).json({ error: 'Plugin data preservation not yet implemented' });
        } catch (error) {
            console.error('Error preserving plugin data:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get orphaned data
     * GET /api/universes/:id/orphaned-data
     */
    async getOrphanedData(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const user_id = (req as any).user?.id;

            if (!user_id) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const universe = await this.universeRepository.findById(id);
            if (!universe || universe.owner_id !== user_id) {
                res.status(404).json({ error: 'Universe not found or access denied' });
                return;
            }

            res.json({
                success: true,
                data: {
                    orphaned_data: universe.orphaned_plugin_data
                }
            });
        } catch (error) {
            console.error('Error getting orphaned data:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Recover orphaned data
     * POST /api/universes/:id/orphaned-data/:dataId/recover
     */
    async recoverOrphanedData(req: Request, res: Response): Promise<void> {
        try {
            // TODO: Implement orphaned data recovery
            res.status(501).json({ error: 'Orphaned data recovery not yet implemented' });
        } catch (error) {
            console.error('Error recovering orphaned data:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Get sync status
     * GET /api/universes/:id/sync-status
     */
    async getSyncStatus(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const user_id = (req as any).user?.id;

            if (!user_id) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const universe = await this.universeRepository.findById(id);
            if (!universe || universe.owner_id !== user_id) {
                res.status(404).json({ error: 'Universe not found or access denied' });
                return;
            }

            res.json({
                success: true,
                data: {
                    sync_token: universe.sync_token,
                    sync_settings: universe.settings.sync_settings,
                    last_updated: universe.updated_at
                }
            });
        } catch (error) {
            console.error('Error getting sync status:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Regenerate sync token
     * POST /api/universes/:id/sync-token/regenerate
     */
    async regenerateSyncToken(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const user_id = (req as any).user?.id;

            if (!user_id) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const universe = await this.universeRepository.findById(id);
            if (!universe || universe.owner_id !== user_id) {
                res.status(404).json({ error: 'Universe not found or access denied' });
                return;
            }

            universe.regenerateSyncToken();
            await this.universeRepository.save(universe);

            res.json({
                success: true,
                data: {
                    sync_token: universe.sync_token
                }
            });
        } catch (error) {
            console.error('Error regenerating sync token:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}

/**
 * Universe Validation Controller for plugin-specific validation
 */
export class UniverseValidationController {
    constructor(
        private universeRepository: UniverseRepository,
        private pluginManager: PluginUseCase
    ) { }

    /**
     * Validate universe with current plugin rules
     * GET /api/universes/:id/validation
     */
    async validateUniverse(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const user_id = (req as any).user?.id;

            if (!user_id) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const universe = await this.universeRepository.findById(id);
            if (!universe || universe.owner_id !== user_id) {
                res.status(404).json({ error: 'Universe not found or access denied' });
                return;
            }            // Get plugin and run validation
            const plugin = this.pluginManager.getPlugin(universe.plugin_config.active_plugin);
            if (!plugin) {
                res.status(400).json({ error: 'Universe plugin not found' });
                return;
            }

            // TODO: Implement plugin validation
            const validationResult = {
                is_valid: true,
                warnings: [],
                errors: [],
                suggestions: []
            };

            res.json({
                success: true,
                data: {
                    validation_result: validationResult
                }
            });
        } catch (error) {
            console.error('Error validating universe:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }

    /**
     * Validate universe with custom rules
     * POST /api/universes/:id/validation/custom
     */
    async validateWithCustomRules(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const user_id = (req as any).user?.id;
            const { validation_rules } = req.body;

            if (!user_id) {
                res.status(401).json({ error: 'Authentication required' });
                return;
            }

            const universe = await this.universeRepository.findById(id);
            if (!universe || universe.owner_id !== user_id) {
                res.status(404).json({ error: 'Universe not found or access denied' });
                return;
            }

            // TODO: Implement custom validation rules
            const validationResult = {
                is_valid: true,
                warnings: [],
                errors: [],
                suggestions: [],
                custom_rule_results: []
            };

            res.json({
                success: true,
                data: {
                    validation_result: validationResult
                }
            });
        } catch (error) {
            console.error('Error validating universe with custom rules:', error);
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
