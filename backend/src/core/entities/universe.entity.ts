/**
 * Universe entity - Core domain model for universes
 * 
 * Represents a complete universe managed by the system with plugin configuration,
 * data preservation, and synchronization capabilities.
 */

import { randomUUID } from 'crypto';
import type { EncryptedUniverseData } from '../services/encryption.service.js';

/**
 * Custom error for encryption security violations
 */
export class UniverseEncryptionSecurityError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'UniverseEncryptionSecurityError';
    }
}

/**
 * Canon compliance levels for universe validation
 */
export enum CanonLevel {
    STRICT = 'strict',
    FLEXIBLE = 'flexible',
    CUSTOM = 'custom'
}

/**
 * Universe plugin configuration
 */
export interface PluginConfiguration {
    /** Currently active plugin identifier */
    active_plugin: string;
    /** Plugin version for compatibility */
    plugin_version: string;
    /** Sub-universe identifier (e.g., "Prime", "Kelvin") */
    sub_universe: string;
    /** Canon compliance level */
    canon_compliance: CanonLevel;
    /** Theme configuration for UI */
    theme_config: ThemeConfiguration;
}

/**
 * Theme configuration for universe UI
 */
export interface ThemeConfiguration {
    /** Primary theme identifier */
    theme_id: string;
    /** Theme variant (light, dark, etc.) */
    variant: string;
    /** Custom theme properties */
    custom_properties?: Record<string, unknown>;
    /** Mobile-specific overrides */
    mobile_overrides?: Record<string, unknown>;
}

/**
 * Universe-wide settings
 */
export interface UniverseSettings {
    /** Is universe private (encrypted) */
    is_private: boolean;
    /** Has universe ever been made public (irreversible flag) */
    was_ever_public: boolean;
    /** Allow collaboration */
    allow_collaboration: boolean;
    /** Collaboration permissions */
    collaboration_permissions: CollaborationPermissions;
    /** Sync settings for mobile */
    sync_settings: SyncSettings;
    /** Data validation settings */
    validation_settings: ValidationSettings;
}

/**
 * Collaboration permissions
 */
export interface CollaborationPermissions {
    /** Can others view the universe */
    can_view: boolean;
    /** Can others edit the universe */
    can_edit: boolean;
    /** Can others manage collaborators */
    can_manage: boolean;
    /** Specific user permissions */
    user_permissions: Record<string, CollaborationRole>;
}

/**
 * Collaboration roles
 */
export enum CollaborationRole {
    VIEWER = 'viewer',
    EDITOR = 'editor',
    MANAGER = 'manager',
    OWNER = 'owner'
}

/**
 * Sync settings for mobile and real-time updates
 */
export interface SyncSettings {
    /** Enable real-time sync */
    real_time_sync: boolean;
    /** Sync frequency in milliseconds */
    sync_frequency: number;
    /** Conflict resolution strategy */
    conflict_resolution: 'last_write_wins' | 'merge' | 'manual';
    /** Mobile-specific settings */
    mobile_settings: MobileSyncSettings;
}

/**
 * Mobile sync settings
 */
export interface MobileSyncSettings {
    /** Sync when on cellular */
    sync_on_cellular: boolean;
    /** Maximum sync payload size */
    max_payload_size: number;
    /** Offline capabilities */
    offline_mode: boolean;
}

/**
 * Data validation settings
 */
export interface ValidationSettings {
    /** Enable strict validation */
    strict_validation: boolean;
    /** Custom validation rules */
    custom_rules: ValidationRule[];
    /** Auto-correction settings */
    auto_correction: AutoCorrectionSettings;
}

/**
 * Validation rule
 */
export interface ValidationRule {
    /** Rule identifier */
    id: string;
    /** Rule description */
    description: string;
    /** Rule expression or function */
    rule: string | Function;
    /** Rule severity */
    severity: 'error' | 'warning' | 'info';
}

/**
 * Auto-correction settings
 */
export interface AutoCorrectionSettings {
    /** Enable auto-correction */
    enabled: boolean;
    /** Types of corrections to apply */
    correction_types: string[];
    /** Require confirmation for corrections */
    require_confirmation: boolean;
}

/**
 * Plugin data store for preservation
 */
export interface PluginDataStore {
    /** Data for currently active plugins */
    active_plugins: Record<string, PluginData>;
    /** Preserved data from inactive plugins */
    inactive_plugin_data: Record<string, PreservedPluginData>;
}

/**
 * Plugin data structure
 */
export interface PluginData {
    /** Plugin identifier */
    plugin_id: string;
    /** Plugin version */
    version: string;
    /** Stored data */
    data: Record<string, unknown>;
    /** Data schema version */
    schema_version: string;
    /** Last updated timestamp */
    last_updated: Date;
}

/**
 * Preserved plugin data for inactive plugins
 */
export interface PreservedPluginData extends PluginData {
    /** Date when plugin was deactivated */
    preserved_date: Date;
    /** Reason for preservation */
    preservation_reason: string;
    /** Recovery metadata */
    recovery_metadata: RecoveryMetadata;
}

/**
 * Recovery metadata for preserved data
 */
export interface RecoveryMetadata {
    /** Can data be automatically recovered */
    auto_recoverable: boolean;
    /** Required plugin version for recovery */
    required_plugin_version?: string;
    /** Data migration path */
    migration_path?: string;
    /** Recovery instructions */
    recovery_instructions?: string;
}

/**
 * Orphaned plugin data (when plugin is completely removed)
 */
export interface OrphanedPluginData {
    /** Original plugin identifier */
    plugin_id: string;
    /** Original plugin name */
    plugin_name: string;
    /** Date when data became orphaned */
    orphaned_date: Date;
    /** Orphaned data */
    data: Record<string, unknown>;
    /** Available recovery options */
    recovery_options: RecoveryOption[];
}

/**
 * Recovery option for orphaned data
 */
export interface RecoveryOption {
    /** Recovery option identifier */
    id: string;
    /** Human-readable description */
    description: string;
    /** Target plugin for recovery */
    target_plugin?: string;
    /** Migration function or script */
    migration_handler: string;
    /** Success probability */
    success_probability: number;
}

/**
 * Core Universe entity
 */
export class UniverseEntity {
    public readonly id: string;
    private _name: string;
    private _description: string;
    private _owner_id: string;
    private _plugin_config: PluginConfiguration;
    private _settings: UniverseSettings;
    private _plugin_data_store: PluginDataStore;
    private _orphaned_plugin_data: OrphanedPluginData[];
    private _sync_token: string;
    private _created_at: Date;
    private _updated_at: Date;

    constructor(params: {
        name: string;
        description: string;
        owner_id: string;
        plugin_config: PluginConfiguration;
        settings?: Partial<UniverseSettings>;
        id?: string;
    }) {
        this.id = params.id || randomUUID();
        this._name = params.name;
        this._description = params.description;
        this._owner_id = params.owner_id;
        this._plugin_config = params.plugin_config;
        this._settings = this.initializeSettings(params.settings);
        this._plugin_data_store = {
            active_plugins: {},
            inactive_plugin_data: {}
        };
        this._orphaned_plugin_data = [];
        this._sync_token = randomUUID();
        this._created_at = new Date();
        this._updated_at = new Date();
    }

    // Getters
    get name(): string {
        return this._name;
    }

    get description(): string {
        return this._description;
    }

    get owner_id(): string {
        return this._owner_id;
    }

    get plugin_config(): PluginConfiguration {
        return { ...this._plugin_config };
    }

    get settings(): UniverseSettings {
        return { ...this._settings };
    }

    get plugin_data_store(): PluginDataStore {
        return {
            active_plugins: { ...this._plugin_data_store.active_plugins },
            inactive_plugin_data: { ...this._plugin_data_store.inactive_plugin_data }
        };
    }

    get orphaned_plugin_data(): OrphanedPluginData[] {
        return [...this._orphaned_plugin_data];
    }

    get sync_token(): string {
        return this._sync_token;
    }

    get created_at(): Date {
        return new Date(this._created_at);
    }

    get updated_at(): Date {
        return new Date(this._updated_at);
    }

    // Methods
    updateName(name: string): void {
        this._name = name;
        this.touch();
    }

    updateDescription(description: string): void {
        this._description = description;
        this.touch();
    }

    updatePluginConfig(config: PluginConfiguration): void {
        // Preserve current plugin data before switching
        if (config.active_plugin !== this._plugin_config.active_plugin) {
            this.preserveCurrentPluginData();
        }

        this._plugin_config = { ...config };
        this.regenerateSyncToken();
        this.touch();
    }
    updateSettings(settings: Partial<UniverseSettings>): void {
        // Handle the special case of making universe public (irreversible)
        if (settings.is_private === false && this._settings.is_private === true) {
            this.makePublic();
            // Remove is_private from settings to prevent direct override
            const { is_private, ...otherSettings } = settings;
            this._settings = { ...this._settings, ...otherSettings };
        } else if (settings.is_private === true && this._settings.was_ever_public) {
            // Prevent re-encryption of previously public universes
            throw new UniverseEncryptionSecurityError('Cannot make universe private: Universe was previously made public and cannot be re-encrypted for security reasons.');
        } else {
            this._settings = { ...this._settings, ...settings };
        }
        this.touch();
    }

    /**
     * Make universe public (irreversible operation)
     * This marks the universe as having been public, preventing future encryption
     */
    makePublic(): void {
        if (this._settings.was_ever_public && !this._settings.is_private) {
            // Already public, no-op
            return;
        }

        this._settings.is_private = false;
        this._settings.was_ever_public = true;
        this.regenerateSyncToken(); // Force sync since encryption status changed
        this.touch();
    }

    /**
     * Check if universe can be made private (returns false if universe was ever public)
     */
    canBeMadePrivate(): boolean {
        return !this._settings.was_ever_public;
    }

    /**
     * Attempt to make universe private (will throw if previously public)
     */
    makePrivate(): void {
        if (this._settings.was_ever_public) {
            throw new UniverseEncryptionSecurityError('Cannot make universe private: Universe was previously made public and cannot be re-encrypted for security reasons.');
        }

        if (this._settings.is_private) {
            // Already private, no-op
            return;
        }

        this._settings.is_private = true;
        this.regenerateSyncToken(); // Force sync since encryption status changed
        this.touch();
    }

    /**
     * Get current privacy status with context
     */
    getPrivacyStatus(): {
        is_private: boolean;
        was_ever_public: boolean;
        can_be_made_private: boolean;
        can_be_made_public: boolean;
    } {
        return {
            is_private: this._settings.is_private,
            was_ever_public: this._settings.was_ever_public,
            can_be_made_private: this.canBeMadePrivate(),
            can_be_made_public: true // Can always make public
        };
    }

    /**
     * Store data for the currently active plugin
     */
    storePluginData(pluginId: string, data: Record<string, unknown>, schemaVersion: string): void {
        this._plugin_data_store.active_plugins[pluginId] = {
            plugin_id: pluginId,
            version: this._plugin_config.plugin_version,
            data,
            schema_version: schemaVersion,
            last_updated: new Date()
        };
        this.touch();
    }

    /**
     * Retrieve data for a specific plugin
     */
    getPluginData(pluginId: string): PluginData | undefined {
        return this._plugin_data_store.active_plugins[pluginId];
    }

    /**
     * Preserve current plugin data when switching plugins
     */
    private preserveCurrentPluginData(): void {
        const currentPluginId = this._plugin_config.active_plugin;
        const currentData = this._plugin_data_store.active_plugins[currentPluginId];

        if (currentData) {
            this._plugin_data_store.inactive_plugin_data[currentPluginId] = {
                ...currentData,
                preserved_date: new Date(),
                preservation_reason: 'Plugin switch',
                recovery_metadata: {
                    auto_recoverable: true,
                    required_plugin_version: this._plugin_config.plugin_version
                }
            };

            // Remove from active plugins
            delete this._plugin_data_store.active_plugins[currentPluginId];
        }
    }

    /**
     * Handle orphaned plugin data
     */
    orphanPluginData(pluginId: string, pluginName: string, recoveryOptions: RecoveryOption[]): void {
        const preservedData = this._plugin_data_store.inactive_plugin_data[pluginId];

        if (preservedData) {
            this._orphaned_plugin_data.push({
                plugin_id: pluginId,
                plugin_name: pluginName,
                orphaned_date: new Date(),
                data: preservedData.data,
                recovery_options: recoveryOptions
            });

            // Remove from inactive plugin data
            delete this._plugin_data_store.inactive_plugin_data[pluginId];
            this.touch();
        }
    }

    /**
     * Recover orphaned plugin data
     */
    recoverOrphanedData(orphanedDataId: string, recoveryOptionId: string): boolean {
        const orphanedIndex = this._orphaned_plugin_data.findIndex(
            data => data.plugin_id === orphanedDataId
        );

        if (orphanedIndex === -1) {
            return false;
        }

        const orphanedData = this._orphaned_plugin_data[orphanedIndex];
        const recoveryOption = orphanedData.recovery_options.find(
            option => option.id === recoveryOptionId
        );

        if (!recoveryOption) {
            return false;
        }

        // Move data to active plugins if recovery is to current plugin
        if (recoveryOption.target_plugin === this._plugin_config.active_plugin) {
            this.storePluginData(
                orphanedData.plugin_id,
                orphanedData.data,
                '1.0.0' // Default schema version
            );
        }

        // Remove from orphaned data
        this._orphaned_plugin_data.splice(orphanedIndex, 1);
        this.touch();

        return true;
    }

    /**
     * Check if user has collaboration permission
     */
    hasCollaborationPermission(userId: string, permission: keyof CollaborationPermissions): boolean {
        if (userId === this._owner_id) {
            return true; // Owner has all permissions
        }

        const userRole = this._settings.collaboration_permissions.user_permissions[userId];
        if (!userRole) {
            return false;
        }

        // Check role-based permissions
        switch (userRole) {
            case CollaborationRole.OWNER:
                return true;
            case CollaborationRole.MANAGER:
                return permission !== 'can_manage' || this._settings.collaboration_permissions.can_manage;
            case CollaborationRole.EDITOR:
                return permission === 'can_view' || permission === 'can_edit';
            case CollaborationRole.VIEWER:
                return permission === 'can_view';
            default:
                return false;
        }
    }

    /**
     * Add a collaborator to the universe
     */
    addCollaborator(userId: string, role: CollaborationRole): void {
        if (userId === this._owner_id) {
            throw new Error('Owner cannot be added as a collaborator');
        }

        if (role === CollaborationRole.OWNER) {
            throw new Error('Cannot assign owner role to collaborator');
        }

        this._settings.collaboration_permissions.user_permissions[userId] = role;
        this.touch();
    }

    /**
     * Remove a collaborator from the universe
     */
    removeCollaborator(userId: string): void {
        if (userId === this._owner_id) {
            throw new Error('Cannot remove owner from universe');
        }

        delete this._settings.collaboration_permissions.user_permissions[userId];
        this.touch();
    }

    /**
     * Update collaborator role
     */
    updateCollaboratorRole(userId: string, role: CollaborationRole): void {
        if (userId === this._owner_id) {
            throw new Error('Cannot change owner role');
        }

        if (role === CollaborationRole.OWNER) {
            throw new Error('Cannot assign owner role to collaborator');
        }

        if (!this._settings.collaboration_permissions.user_permissions[userId]) {
            throw new Error('User is not a collaborator in this universe');
        }

        this._settings.collaboration_permissions.user_permissions[userId] = role;
        this.touch();
    }

    /**
     * Get all collaborators with their roles
     */
    getCollaborators(): Array<{ userId: string; role: CollaborationRole }> {
        return Object.entries(this._settings.collaboration_permissions.user_permissions)
            .map(([userId, role]) => ({ userId, role }));
    }

    /**
     * Check if user is a collaborator
     */
    isCollaborator(userId: string): boolean {
        return userId in this._settings.collaboration_permissions.user_permissions;
    }

    /**
     * Get user's role in the universe
     */
    getUserRole(userId: string): CollaborationRole | null {
        if (userId === this._owner_id) {
            return CollaborationRole.OWNER;
        }
        return this._settings.collaboration_permissions.user_permissions[userId] || null;
    }

    /**
     * Generate new sync token for real-time updates
     */
    regenerateSyncToken(): void {
        this._sync_token = randomUUID();
    }

    /**
     * Update the updated_at timestamp
     */
    private touch(): void {
        this._updated_at = new Date();
    }

  /**
   * Initialize default settings
   */  private initializeSettings(settings?: Partial<UniverseSettings>): UniverseSettings {
        return {
            is_private: false,
            was_ever_public: false,
            allow_collaboration: true,
            collaboration_permissions: {
                can_view: true,
                can_edit: false,
                can_manage: false,
                user_permissions: {}
            },
            sync_settings: {
                real_time_sync: true,
                sync_frequency: 1000, // 1 second
                conflict_resolution: 'last_write_wins',
                mobile_settings: {
                    sync_on_cellular: false,
                    max_payload_size: 1024 * 1024, // 1MB
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
            },
            ...settings
        };
    }

    /**
     * Convert to plain object for serialization
     */
    toObject(): Record<string, unknown> {
        return {
            id: this.id,
            name: this._name,
            description: this._description,
            owner_id: this._owner_id,
            plugin_config: this._plugin_config,
            settings: this._settings,
            plugin_data_store: this._plugin_data_store,
            orphaned_plugin_data: this._orphaned_plugin_data,
            sync_token: this._sync_token,
            created_at: this._created_at,
            updated_at: this._updated_at
        };
    }

    /**
     * Create from plain object
     */
    static fromObject(obj: Record<string, unknown>): UniverseEntity {
        const universe = new UniverseEntity({
            name: obj.name as string,
            description: obj.description as string,
            owner_id: obj.owner_id as string,
            plugin_config: obj.plugin_config as PluginConfiguration,
            settings: obj.settings as UniverseSettings,
            id: obj.id as string
        });

        // Restore private fields
        universe._plugin_data_store = obj.plugin_data_store as PluginDataStore;
        universe._orphaned_plugin_data = obj.orphaned_plugin_data as OrphanedPluginData[];
        universe._sync_token = obj.sync_token as string;
        universe._created_at = new Date(obj.created_at as string);
        universe._updated_at = new Date(obj.updated_at as string);

        return universe;
    }

    /**
     * Check if universe data should be encrypted
     */
    isEncryptionRequired(): boolean {
        return this._settings.is_private;
    }

    /**
     * Get data for encryption (excludes sensitive metadata)
     */
    getDataForEncryption(): Record<string, unknown> {
        return {
            name: this._name,
            description: this._description,
            plugin_config: this._plugin_config,
            settings: this._settings,
            plugin_data_store: this._plugin_data_store,
            orphaned_plugin_data: this._orphaned_plugin_data
        };
    }

    /**
     * Apply decrypted data to entity
     */
    applyDecryptedData(decryptedData: Record<string, unknown>): void {
        if (decryptedData.name) this._name = decryptedData.name as string;
        if (decryptedData.description) this._description = decryptedData.description as string;
        if (decryptedData.plugin_config) this._plugin_config = decryptedData.plugin_config as PluginConfiguration;
        if (decryptedData.settings) this._settings = decryptedData.settings as UniverseSettings;
        if (decryptedData.plugin_data_store) this._plugin_data_store = decryptedData.plugin_data_store as PluginDataStore;
        if (decryptedData.orphaned_plugin_data) this._orphaned_plugin_data = decryptedData.orphaned_plugin_data as OrphanedPluginData[];

        this.touch();
    }

    /**
     * Create encrypted version of entity data
     */
    async createEncryptedData(encryptionService: any): Promise<EncryptedUniverseData> {
        if (!this.isEncryptionRequired()) {
            throw new Error('Universe is not configured for encryption');
        }

        const dataToEncrypt = this.getDataForEncryption();
        return await encryptionService.encryptUniverseData(
            dataToEncrypt,
            this.id,
            this._owner_id
        );
    }

    /**
     * Create from encrypted data
     */
    static async fromEncryptedData(
        encryptedData: EncryptedUniverseData,
        encryptionService: any,
        ownerId: string,
        basicInfo: { id: string; created_at: Date; updated_at: Date; sync_token: string }
    ): Promise<UniverseEntity> {
        const decryptedData = await encryptionService.decryptUniverseData(
            encryptedData,
            encryptedData.universe_id,
            ownerId
        );

        const universe = new UniverseEntity({
            name: decryptedData.name as string,
            description: decryptedData.description as string,
            owner_id: ownerId,
            plugin_config: decryptedData.plugin_config as PluginConfiguration,
            settings: decryptedData.settings as UniverseSettings,
            id: basicInfo.id
        });

        // Restore additional data
        universe._plugin_data_store = decryptedData.plugin_data_store as PluginDataStore;
        universe._orphaned_plugin_data = decryptedData.orphaned_plugin_data as OrphanedPluginData[];
        universe._created_at = basicInfo.created_at;
        universe._updated_at = basicInfo.updated_at;
        universe._sync_token = basicInfo.sync_token;

        return universe;
    }
}

/**
 * Search parameters for universe queries
 */
export interface UniverseSearchParams {
    page?: number;
    limit?: number;
    search?: string;
    plugin_id?: string;
    owner_id?: string;
}

/**
 * Universe repository interface
 */
export interface UniverseRepository {
    save(universe: UniverseEntity): Promise<void>;
    findById(id: string): Promise<UniverseEntity | null>;
    findByOwnerId(ownerId: string, params?: UniverseSearchParams): Promise<UniverseEntity[]>;
    findByPluginId(pluginId: string): Promise<UniverseEntity[]>;
    delete(id: string): Promise<void>;
    search(query: string, ownerId?: string): Promise<UniverseEntity[]>;
    isNameAvailable(name: string, ownerId: string, excludeId?: string): Promise<boolean>;
}
