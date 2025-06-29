/**
 * Simple Universe Domain Service Implementation
 * 
 * Provides basic universe validation without plugin dependencies
 * for simplified universe creation flow.
 */

import type { UniverseEntity, CanonLevel } from '../../core/entities/universe.entity.js';
import type {
    UniverseDomainService,
    UniverseValidationResult,
    PluginCompatibilityResult,
    SubUniverseInfo,
    UniverseSyncEvent,
    ValidationError,
    ValidationWarning,
    ValidationSuggestion
} from '../../core/interfaces/universe.interfaces.js';

export class SimpleUniverseDomainService implements UniverseDomainService {
    async validateUniverse(universe: UniverseEntity): Promise<UniverseValidationResult> {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];
        const suggestions: ValidationSuggestion[] = [];

        // Basic validation - just check required fields
        if (!universe.name || universe.name.trim().length === 0) {
            errors.push({
                field: 'name',
                message: 'Universe name is required',
                code: 'REQUIRED_FIELD',
                severity: 'error' as const
            });
        }

        if (!universe.description || universe.description.trim().length === 0) {
            errors.push({
                field: 'description',
                message: 'Universe description is required',
                code: 'REQUIRED_FIELD',
                severity: 'error' as const
            });
        }

        return {
            is_valid: errors.length === 0,
            errors,
            warnings,
            suggestions
        };
    }

    async checkPluginCompatibility(
        universe: UniverseEntity,
        targetPluginId: string,
        targetVersion: string
    ): Promise<PluginCompatibilityResult> {
        // For simplified flow, always return compatible
        return {
            is_compatible: true,
            plugin_version: targetVersion,
            required_version: targetVersion,
            migration_required: false,
            breaking_changes: []
        };
    } async getSubUniverses(pluginId: string): Promise<SubUniverseInfo[]> {
        // For simplified flow, return default sub-universe
        return [{
            id: 'default',
            name: 'Default Sub-Universe',
            description: 'Default sub-universe for simplified setup',
            canon_rules: [],
            default_settings: {},
            validation_schema: {
                schema_version: '1.0.0',
                schema_definition: {},
                custom_validators: []
            }
        }];
    }

    async applyCanonRules(
        universe: UniverseEntity,
        canonLevel: CanonLevel
    ): Promise<UniverseValidationResult> {
        // For simplified flow, return valid result
        return {
            is_valid: true,
            errors: [],
            warnings: [],
            suggestions: []
        };
    }

    async migratePluginData(
        universe: UniverseEntity,
        fromVersion: string,
        toVersion: string
    ): Promise<boolean> {
        // For simplified flow, always return true (no migration needed)
        return true;
    }

    generateSyncToken(universe: UniverseEntity): string {
        // Generate a simple sync token
        return `sync_${universe.id}_${Date.now()}`;
    }

    async processSyncEvent(event: UniverseSyncEvent): Promise<void> {
        // No-op for simplified flow
    }
}
