/**
 * Universe Routes
 * 
 * REST API endpoints for universe management with advanced permission system,
 * plugin integration, and multi-scope encryption support.
 */

import { Router } from 'express';
import type {
    UniverseController,
    UniverseValidationController
} from '../controllers/universe.controller.js';

/**
 * Create universe routes with dependency injection
 */
export function createUniverseRoutes(
    universeController: UniverseController,
    universeValidationController: UniverseValidationController
): Router {
    const router = Router();

    // Universe CRUD operations
    router.post('/', universeController.createUniverse.bind(universeController));
    router.get('/', universeController.listUniverses.bind(universeController));
    router.get('/:id', universeController.getUniverse.bind(universeController));
    router.put('/:id', universeController.updateUniverse.bind(universeController));
    router.delete('/:id', universeController.deleteUniverse.bind(universeController));

    // Plugin configuration endpoints
    router.post('/:id/plugin-config', universeController.configurePlugin.bind(universeController));
    router.get('/:id/plugin-config', universeController.getPluginConfig.bind(universeController));

    // Universe validation endpoints
    router.get('/:id/validation', universeValidationController.validateUniverse.bind(universeValidationController));
    router.post('/:id/validation/custom', universeValidationController.validateWithCustomRules.bind(universeValidationController));

    // Sub-universe management (Star Trek specific)
    router.post('/:id/sub-universe', universeController.configureSubUniverse.bind(universeController));
    router.get('/:id/sub-universe', universeController.getSubUniverseConfig.bind(universeController));

    // Permission and collaboration endpoints
    router.post('/:id/permissions', universeController.updatePermissions.bind(universeController));
    router.get('/:id/permissions', universeController.getPermissions.bind(universeController));
    router.post('/:id/contributors', universeController.addContributor.bind(universeController));
    router.delete('/:id/contributors/:userId', universeController.removeContributor.bind(universeController));

    // Encryption management
    router.post('/:id/encryption', universeController.configureEncryption.bind(universeController));
    router.post('/:id/make-public', universeController.makePublic.bind(universeController));
    router.post('/:id/make-private', universeController.makePrivate.bind(universeController));

    // Data preservation and recovery
    router.get('/:id/plugin-data', universeController.getPluginData.bind(universeController));
    router.post('/:id/plugin-data/preserve', universeController.preservePluginData.bind(universeController));
    router.get('/:id/orphaned-data', universeController.getOrphanedData.bind(universeController));
    router.post('/:id/orphaned-data/:dataId/recover', universeController.recoverOrphanedData.bind(universeController));

    // Real-time sync endpoints
    router.get('/:id/sync-status', universeController.getSyncStatus.bind(universeController));
    router.post('/:id/sync-token/regenerate', universeController.regenerateSyncToken.bind(universeController));

    return router;
}
