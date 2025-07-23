/**
 * Universe domain interfaces
 * 
 * Core domain interfaces for the universe management system including
 * value objects, domain services, and repository contracts.
 */

import type {
    UniverseEntity,
    CanonLevel,
    CollaborationRole,
    ThemeConfiguration,
    UniverseSettings,
    PluginConfiguration
} from '../entities/universe.entity.js';

/**
 * Universe creation parameters
 */
export interface CreateUniverseParams {
    name: string;
    description: string;
    owner_id: string;
    plugin_id: string;
    plugin_version: string;
    sub_universe: string;
    canon_compliance: CanonLevel;
    theme_config?: ThemeConfiguration;
    settings?: Partial<UniverseSettings>;
}

/**
 * Universe update parameters
 */
export interface UpdateUniverseParams {
    id: string;
    name?: string;
    description?: string;
    plugin_config?: Partial<PluginConfiguration>;
    settings?: Partial<UniverseSettings>;
}

/**
 * Universe search parameters
 */
export interface UniverseSearchParams {
    query?: string;
    owner_id?: string;
    plugin_id?: string;
    sub_universe?: string;
    is_private?: boolean;
    created_after?: Date;
    created_before?: Date;
    limit?: number;
    offset?: number;
}

/**
 * Universe validation result
 */
export interface UniverseValidationResult {
    is_valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    suggestions: ValidationSuggestion[];
}

/**
 * Validation error
 */
export interface ValidationError {
    field: string;
    message: string;
    code: string;
    severity: 'error' | 'warning' | 'info';
}

/**
 * Validation warning
 */
export interface ValidationWarning {
    field: string;
    message: string;
    code: string;
    auto_correctable: boolean;
}

/**
 * Validation suggestion
 */
export interface ValidationSuggestion {
    field: string;
    message: string;
    suggested_value: unknown;
    confidence: number;
}

/**
 * Plugin compatibility check result
 */
export interface PluginCompatibilityResult {
    is_compatible: boolean;
    plugin_version: string;
    required_version: string;
    migration_required: boolean;
    migration_path?: string;
    breaking_changes: string[];
}

/**
 * Sub-universe information
 */
export interface SubUniverseInfo {
    id: string;
    name: string;
    description: string;
    canon_rules: CanonRule[];
    default_settings: Record<string, unknown>;
    validation_schema: ValidationSchema;
}

/**
 * Canon rule for sub-universe validation
 */
export interface CanonRule {
    id: string;
    name: string;
    description: string;
    rule_type: 'required' | 'forbidden' | 'conditional' | 'custom';
    field_path: string;
    condition?: string;
    validation_function?: string;
    severity: 'error' | 'warning' | 'info';
}

/**
 * Validation schema for plugin data
 */
export interface ValidationSchema {
    schema_version: string;
    schema_definition: Record<string, unknown>;
    custom_validators: CustomValidator[];
}

/**
 * Custom validator definition
 */
export interface CustomValidator {
    id: string;
    name: string;
    validator_function: string;
    parameters: Record<string, unknown>;
}

/**
 * Universe sync event
 */
export interface UniverseSyncEvent {
    event_type: 'create' | 'update' | 'delete' | 'plugin_change';
    universe_id: string;
    user_id: string;
    timestamp: Date;
    changes: UniverseChange[];
    sync_token: string;
}

/**
 * Universe change record
 */
export interface UniverseChange {
    field_path: string;
    old_value: unknown;
    new_value: unknown;
    change_type: 'add' | 'update' | 'delete';
}

/**
 * Real-time sync message
 */
export interface SyncMessage {
    message_type: 'universe_update' | 'plugin_change' | 'collaboration_change';
    universe_id: string;
    sync_token: string;
    payload: Record<string, unknown>;
    timestamp: Date;
}

/**
 * Universe domain service interface
 */
export interface UniverseDomainService {
    /**
     * Validate universe data against plugin rules
     */
    validateUniverse(universe: UniverseEntity): Promise<UniverseValidationResult>;

    /**
     * Check plugin compatibility
     */
    checkPluginCompatibility(
        universe: UniverseEntity,
        targetPluginId: string,
        targetVersion: string
    ): Promise<PluginCompatibilityResult>;

    /**
     * Get available sub-universes for a plugin
     */
    getSubUniverses(pluginId: string): Promise<SubUniverseInfo[]>;

    /**
     * Apply canon rules to universe data
     */
    applyCanonRules(
        universe: UniverseEntity,
        canonLevel: CanonLevel
    ): Promise<UniverseValidationResult>;

    /**
     * Migrate universe data between plugin versions
     */
    migratePluginData(
        universe: UniverseEntity,
        fromVersion: string,
        toVersion: string
    ): Promise<boolean>;

    /**
     * Generate sync token for real-time updates
     */
    generateSyncToken(universe: UniverseEntity): string;

    /**
     * Process sync event
     */
    processSyncEvent(event: UniverseSyncEvent): Promise<void>;
}

/**
 * Universe query service interface
 */
export interface UniverseQueryService {
    /**
     * Search universes with advanced filtering
     */
    searchUniverses(params: UniverseSearchParams): Promise<UniverseSearchResult>;

    /**
     * Get universes by owner with pagination
     */
    getUniversesByOwner(
        ownerId: string,
        limit?: number,
        offset?: number
    ): Promise<PaginatedUniverseResult>;

    /**
     * Get universes by plugin
     */
    getUniversesByPlugin(pluginId: string): Promise<UniverseEntity[]>;

    /**
     * Get universe statistics
     */
    getUniverseStatistics(ownerId?: string): Promise<UniverseStatistics>;

    /**
     * Check universe name availability
     */
    isUniverseNameAvailable(name: string, ownerId: string): Promise<boolean>;
}

/**
 * Universe search result
 */
export interface UniverseSearchResult {
    universes: UniverseEntity[];
    total_count: number;
    has_more: boolean;
    next_offset?: number;
}

/**
 * Paginated universe result
 */
export interface PaginatedUniverseResult {
    universes: UniverseEntity[];
    total_count: number;
    current_page: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
}

/**
 * Universe statistics
 */
export interface UniverseStatistics {
    total_universes: number;
    universes_by_plugin: Record<string, number>;
    universes_by_canon_level: Record<string, number>;
    private_universes: number;
    collaborative_universes: number;
    recently_created: number;
    recently_updated: number;
}

/**
 * Collaboration management service interface
 */
export interface UniverseCollaborationService {
    /**
     * Add collaborator to universe
     */
    addCollaborator(
        universeId: string,
        userId: string,
        role: CollaborationRole,
        requesterId: string
    ): Promise<boolean>;

    /**
     * Remove collaborator from universe
     */
    removeCollaborator(
        universeId: string,
        userId: string,
        requesterId: string
    ): Promise<boolean>;

    /**
     * Update collaborator role
     */
    updateCollaboratorRole(
        universeId: string,
        userId: string,
        newRole: CollaborationRole,
        requesterId: string
    ): Promise<boolean>;

    /**
     * Get collaborators for universe
     */
    getCollaborators(universeId: string): Promise<UniverseCollaborator[]>;

    /**
     * Check collaboration permission
     */
    checkCollaborationPermission(
        universeId: string,
        userId: string,
        permission: string
    ): Promise<boolean>;
}

/**
 * Universe collaborator information
 */
export interface UniverseCollaborator {
    user_id: string;
    username: string;
    role: CollaborationRole;
    added_date: Date;
    last_activity: Date;
    permissions: string[];
}

/**
 * Universe encryption service interface
 */
export interface UniverseEncryptionService {
    /**
     * Encrypt universe data
     */
    encryptUniverseData(universe: UniverseEntity): Promise<EncryptedUniverseData>;

    /**
     * Decrypt universe data
     */
    decryptUniverseData(
        encryptedData: EncryptedUniverseData,
        userId: string
    ): Promise<UniverseEntity>;

    /**
     * Generate encryption key for universe
     */
    generateEncryptionKey(universeId: string, ownerId: string): Promise<string>;

    /**
     * Rotate encryption key
     */
    rotateEncryptionKey(universeId: string, ownerId: string): Promise<string>;
}

/**
 * Encrypted universe data
 */
export interface EncryptedUniverseData {
    universe_id: string;
    encrypted_data: string;
    encryption_method: string;
    key_version: number;
    checksum: string;
}

/**
 * Re-export entity types for convenience
 */
export type {
    PluginConfiguration,
    ThemeConfiguration,
    UniverseSettings,
    CollaborationPermissions,
    SyncSettings,
    MobileSyncSettings,
    ValidationSettings,
    ValidationRule,
    AutoCorrectionSettings,
    PluginDataStore,
    PluginData,
    PreservedPluginData,
    RecoveryMetadata,
    OrphanedPluginData,
    RecoveryOption
} from '../entities/universe.entity.js';
