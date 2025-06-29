/**
 * Universe Management Types
 * 
 * TypeScript types for universe management system
 */

// Core Types
export type CanonLevel = 'strict' | 'flexible' | 'custom';
export type CollaborationRole = 'viewer' | 'editor' | 'manager' | 'owner';

// Theme Configuration
export interface ThemeConfiguration {
    theme_id: string;
    variant: string;
    custom_properties?: Record<string, unknown>;
    mobile_overrides?: Record<string, unknown>;
}

// Plugin Configuration
export interface PluginConfiguration {
    active_plugin: string;
    plugin_version: string;
    sub_universe: string;
    canon_compliance: CanonLevel;
    theme_config: ThemeConfiguration;

    // Multi-plugin support for crossovers
    secondary_plugins?: Array<{
        plugin_id: string;
        plugin_version: string;
        sub_universe?: string;
        integration_level: 'full' | 'partial' | 'reference';
        namespace?: string;
    }>;
}

// Sub-Universe Management
export interface SubUniverseOption {
    id: string;
    name: string;
    description: string;
    canonLevel: string;
    supportedEras: string[];
    defaultEra: string;
    isAlternative?: boolean;
}

export interface UniverseMenuAction {
    id: string;
    label: string;
    icon: string;
    type: 'create' | 'switch' | 'configure' | 'manage';
    pluginSpecific: boolean;
    requiresSubUniverse?: boolean;
}

// Collaboration Permissions
export interface CollaborationPermissions {
    can_view: boolean;
    can_edit: boolean;
    can_manage: boolean;
    user_permissions: Record<string, CollaborationRole>;
}

// Sync Settings
export interface SyncSettings {
    real_time_sync: boolean;
    sync_frequency: number;
    conflict_resolution: 'last_write_wins' | 'merge' | 'manual';
    mobile_settings: {
        sync_on_cellular: boolean;
        max_payload_size: number;
        offline_mode: boolean;
    };
}

// Validation Settings
export interface ValidationSettings {
    strict_validation: boolean;
    custom_rules: ValidationRule[];
    auto_correction: {
        enabled: boolean;
        correction_types: string[];
        require_confirmation: boolean;
    };
}

export interface ValidationRule {
    id: string;
    description: string;
    rule: string;
    severity: 'error' | 'warning' | 'info';
}

// Universe Settings
export interface UniverseSettings {
    is_private: boolean;
    was_ever_public: boolean;
    allow_collaboration: boolean;
    collaboration_permissions: CollaborationPermissions;
    sync_settings: SyncSettings;
    validation_settings: ValidationSettings;
}

// Universe Entity
export interface Universe {
    id: string;
    name: string;
    description: string;
    owner_id: string;
    plugin_config: PluginConfiguration;
    settings: UniverseSettings;
    sync_token: string;
    created_at: string;
    updated_at: string;
}

// Request/Response Types
export interface CreateUniverseRequest {
    name: string;
    description: string;
    settings?: Partial<UniverseSettings>;
}

export interface UpdateUniverseRequest {
    name?: string;
    description?: string;
    plugin_config?: Partial<PluginConfiguration>;
    settings?: Partial<UniverseSettings>;
}

export interface UniverseResponse {
    success: boolean;
    data: Universe;
    message?: string;
}

export interface UniverseListResponse {
    success: boolean;
    data: Universe[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

export interface PluginConfigRequest {
    active_plugin: string;
    plugin_version: string;
    sub_universe: string;
    canon_compliance: CanonLevel;
    theme_config: ThemeConfiguration;
}

export interface PluginConfigResponse {
    success: boolean;
    data: PluginConfiguration;
}

export interface PermissionUpdateRequest {
    allow_collaboration?: boolean;
    collaboration_permissions?: Partial<CollaborationPermissions>;
}

export interface SyncStatusResponse {
    success: boolean;
    data: {
        sync_token: string;
        last_sync: string;
        sync_status: 'synced' | 'pending' | 'error';
        pending_changes: number;
    };
}

export interface ValidationResponse {
    success: boolean;
    data: {
        is_valid: boolean;
        issues: ValidationIssue[];
        suggestions: string[];
    };
}

export interface ValidationIssue {
    id: string;
    severity: 'error' | 'warning' | 'info';
    message: string;
    field?: string;
    suggestion?: string;
}

export interface ValidationRequest {
    rules: ValidationRule[];
}

// UI State Types
export interface UniverseFormData {
    name: string;
    description: string;
    is_private: boolean;
    allow_collaboration: boolean;
    plugin_config?: PluginConfiguration;
}

export interface UniverseFilters {
    search: string;
    plugin_id: string;
    sort_by: 'name' | 'created_at' | 'updated_at';
    sort_order: 'asc' | 'desc';
}

// Plugin Data Types
export interface PluginData {
    plugin_id: string;
    version: string;
    data: Record<string, unknown>;
    schema_version: string;
    last_updated: string;
}

export interface OrphanedPluginData {
    plugin_id: string;
    plugin_name: string;
    orphaned_date: string;
    data: Record<string, unknown>;
    recovery_options: RecoveryOption[];
}

export interface RecoveryOption {
    id: string;
    description: string;
    target_plugin?: string;
    migration_handler: string;
    success_probability: number;
}

// Error Types
export interface UniverseError {
    code: string;
    message: string;
    field?: string;
    details?: Record<string, unknown>;
}

// Hook State Types
export interface UseUniverseState {
    universe: Universe | null;
    loading: boolean;
    error: UniverseError | null;
}

export interface UseUniverseListState {
    universes: Universe[];
    loading: boolean;
    error: UniverseError | null;
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}

// Event Types for Real-time Updates
export interface UniverseUpdateEvent {
    type: 'universe_updated' | 'universe_deleted' | 'permissions_changed' | 'plugin_switched';
    universe_id: string;
    data: Partial<Universe>;
    timestamp: string;
    user_id: string;
}

export interface SyncEvent {
    type: 'sync_required' | 'sync_completed' | 'sync_conflict';
    universe_id: string;
    sync_token: string;
    changes: string[];
    timestamp: string;
}

// Component Props Types
export interface UniverseCardProps {
    universe: Universe;
    onEdit: (universe: Universe) => void;
    onDelete: (id: string) => void;
    onClone: (universe: Universe) => void;
    className?: string;
}

export interface UniverseFormProps {
    universe?: Universe;
    onSubmit: (data: UniverseFormData) => void;
    onCancel: () => void;
    loading?: boolean;
    error?: UniverseError | null;
}

export interface UniverseListProps {
    universes: Universe[];
    loading: boolean;
    error: UniverseError | null;
    onEdit: (universe: Universe) => void;
    onDelete: (id: string) => void;
    onClone: (universe: Universe) => void;
    onLoadMore?: () => void;
    hasMore?: boolean;
}

export interface PluginConfigPanelProps {
    universe: Universe;
    onUpdate: (config: PluginConfiguration) => void;
    availablePlugins: Array<{
        id: string;
        name: string;
        version: string;
        sub_universes: string[];
    }>;
}

export interface PermissionsPanelProps {
    universe: Universe;
    onUpdate: (permissions: PermissionUpdateRequest) => void;
    loading?: boolean;
    error?: UniverseError | null;
}

export interface SyncStatusPanelProps {
    universe: Universe;
    syncStatus: SyncStatusResponse['data'];
    onRefresh: () => void;
    onRegenerateToken: () => void;
}

// Context Types
export interface UniverseContextValue {
    currentUniverse: Universe | null;
    setCurrentUniverse: (universe: Universe | null) => void;
    updateUniverse: (updates: Partial<Universe>) => void;
    refreshUniverse: () => Promise<void>;
    loading: boolean;
    error: UniverseError | null;
}

// Store Types (for state management)
export interface UniverseStore {
    universes: Record<string, Universe>;
    currentUniverseId: string | null;
    loading: boolean;
    error: UniverseError | null;
    filters: UniverseFilters;
    pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}
