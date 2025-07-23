/**
 * Plugin system type definitions
 * 
 * Core types for the plugin architecture including manifests, configurations,
 * and validation definitions.
 */

import { CanonLevel } from '../../core/entities/universe.entity.js';

/**
 * Plugin manifest - defines plugin capabilities and configuration
 */
export interface PluginManifest {
    // Basic information
    id: string;
    name: string;
    description: string;
    version: string;
    author: string;
    license: string;

    // Metadata
    created_date: Date;
    updated_date: Date;
    min_system_version: string;
    max_system_version: string;

    // Capabilities
    capabilities: PluginCapability[];

    // Sub-universe definitions
    sub_universes: Record<string, SubUniverseDefinition>;
    default_sub_universe: string;

    // Theme definitions
    themes: Record<string, ThemeDefinition>;
    default_theme: string;

    // Canon compliance
    canon_levels: CanonLevelDefinition[];

    // Data models
    data_models: Record<string, DataModelDefinition>;

    // Settings schema
    settings_schema: PluginSettingsSchema;

    // Dependencies
    dependencies: string[];
    optional_dependencies: string[];

    // Configuration
    configuration: PluginConfiguration;

    // Hooks and events
    hooks: PluginHooks;

    // API endpoints
    api_endpoints: ApiEndpointDefinition[];

    // UI components
    ui_components: UIComponentDefinition[];
}

/**
 * Plugin capabilities
 */
export type PluginCapability =
    | 'universe_management'
    | 'sub_universe_support'
    | 'canon_validation'
    | 'timeline_management'
    | 'character_management'
    | 'location_management'
    | 'organization_management'
    | 'technology_management'
    | 'story_management'
    | 'custom_theming'
    | 'data_preservation'
    | 'real_time_sync'
    | 'ai_integration'
    | 'collaboration'
    | 'import_export'
    | 'reporting'
    | 'visualization';

/**
 * Sub-universe definition
 */
export interface SubUniverseDefinition {
    id: string;
    name: string;
    description: string;
    timeline_start?: Date;
    timeline_end?: Date;
    canon_rules: CanonRule[];
    default_settings: Record<string, unknown>;
    validation_schema: ValidationSchema;
}

/**
 * Canon rule definition
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
 * Validation schema
 */
export interface ValidationSchema {
    schema_version: string;
    schema_definition: Record<string, unknown>;
    custom_validators: CustomValidator[];
}

/**
 * Custom validator
 */
export interface CustomValidator {
    id: string;
    name: string;
    validator_function: string;
    parameters: Record<string, unknown>;
}

/**
 * Theme definition
 */
export interface ThemeDefinition {
    theme_id: string;
    name: string;
    description: string;
    version: string;
    colors: ThemeColors;
    typography: ThemeTypography;
    spacing: ThemeSpacing;
    borders: ThemeBorders;
    animations: ThemeAnimations;
    mobile_overrides?: {
        colors?: Partial<ThemeColors>;
        typography?: Partial<ThemeTypography>;
        spacing?: Partial<ThemeSpacing>;
        borders?: Partial<ThemeBorders>;
        animations?: Partial<ThemeAnimations>;
    };
}

/**
 * Theme colors
 */
export interface ThemeColors {
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    surface: string;
    text_primary: string;
    text_secondary: string;
    success: string;
    warning: string;
    error: string;
    info: string;
    [key: string]: string;
}

/**
 * Theme typography
 */
export interface ThemeTypography {
    font_family: string;
    font_sizes: Record<string, string>;
    line_heights: Record<string, number>;
    font_weights?: Record<string, number>;
}

/**
 * Theme spacing
 */
export interface ThemeSpacing {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
    xxl: string;
    [key: string]: string;
}

/**
 * Theme borders
 */
export interface ThemeBorders {
    radius: string;
    width: string;
    style?: string;
}

/**
 * Theme animations
 */
export interface ThemeAnimations {
    duration: string;
    easing: string;
    [key: string]: string;
}

/**
 * Canon level definition
 */
export interface CanonLevelDefinition {
    level: CanonLevel;
    name: string;
    description: string;
    validation_rules: string[];
}

/**
 * Data model definition
 */
export interface DataModelDefinition {
    schema_version: string;
    properties: Record<string, PropertyDefinition>;
    indexes?: IndexDefinition[];
    relationships?: RelationshipDefinition[];
}

/**
 * Property definition for data models
 */
export interface PropertyDefinition {
    type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
    required?: boolean;
    default?: unknown;
    enum?: unknown[];
    minimum?: number;
    maximum?: number;
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    items?: PropertyDefinition;
    properties?: Record<string, PropertyDefinition>;
    validation?: string;
}

/**
 * Index definition
 */
export interface IndexDefinition {
    name: string;
    fields: Record<string, 1 | -1>;
    unique?: boolean;
}

/**
 * Relationship definition
 */
export interface RelationshipDefinition {
    name: string;
    type: 'one_to_one' | 'one_to_many' | 'many_to_many';
    target_model: string;
    foreign_key?: string;
    cascade_delete?: boolean;
}

/**
 * Plugin settings schema
 */
export interface PluginSettingsSchema {
    schema_version: string;
    properties: Record<string, PropertyDefinition>;
}

/**
 * Plugin configuration
 */
export interface PluginConfiguration {
    can_be_disabled: boolean;
    supports_multiple_instances: boolean;
    requires_database: boolean;
    requires_file_system: boolean;
    security_level: 'minimal' | 'standard' | 'elevated' | 'system';
    resource_requirements: ResourceRequirements;
}

/**
 * Resource requirements
 */
export interface ResourceRequirements {
    memory_mb: number;
    storage_mb: number;
    cpu_cores: number;
    network_access?: boolean;
}

/**
 * Plugin hooks
 */
export interface PluginHooks {
    // Lifecycle hooks
    on_install?: string;
    on_enable?: string;
    on_disable?: string;
    on_uninstall?: string;
    on_update?: string;

    // Universe hooks
    on_universe_create?: string;
    on_universe_update?: string;
    on_universe_delete?: string;

    // Data hooks
    on_validate_data?: string;
    on_migrate_data?: string;
    on_export_data?: string;
    on_import_data?: string;

    // UI hooks
    on_theme_change?: string;
    on_component_render?: string;
}

/**
 * API endpoint definition
 */
export interface ApiEndpointDefinition {
    path: string;
    method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
    description: string;
    parameters?: ApiParameterDefinition[];
    response_schema?: Record<string, unknown>;
    authentication_required?: boolean;
}

/**
 * API parameter definition
 */
export interface ApiParameterDefinition {
    name: string;
    type: 'query' | 'path' | 'body' | 'header';
    data_type: string;
    required: boolean;
    description: string;
    default?: unknown;
}

/**
 * UI component definition
 */
export interface UIComponentDefinition {
    id: string;
    name: string;
    description: string;
    category?: string;
    props?: Record<string, PropertyDefinition>;
    dependencies?: string[];
}

/**
 * Plugin instance configuration
 */
export interface PluginInstanceConfig {
    plugin_id: string;
    instance_id: string;
    enabled: boolean;
    settings: Record<string, unknown>;
    version: string;
    created_at: Date;
    updated_at: Date;
}

/**
 * Plugin loading result
 */
export interface PluginLoadResult {
    success: boolean;
    plugin?: LoadedPlugin;
    error?: PluginLoadError;
    warnings: string[];
}

/**
 * Loaded plugin
 */
export interface LoadedPlugin {
    manifest: PluginManifest;
    instance: PluginInstance;
    handlers: PluginHandlers;
}

/**
 * Plugin instance
 */
export interface PluginInstance {
    id: string;
    plugin_id: string;
    version: string;
    config: PluginInstanceConfig;
    state: PluginState;
    last_error?: string;
}

/**
 * Plugin state
 */
export enum PluginState {
    UNLOADED = 'unloaded',
    LOADING = 'loading',
    LOADED = 'loaded',
    ENABLED = 'enabled',
    DISABLED = 'disabled',
    ERROR = 'error',
    UNINSTALLING = 'uninstalling'
}

/**
 * Plugin handlers
 */
export interface PluginHandlers {
    lifecycle: LifecycleHandlers;
    universe: UniverseHandlers;
    data: DataHandlers;
    ui: UIHandlers;
    api: ApiHandlers;
}

/**
 * Lifecycle handlers
 */
export interface LifecycleHandlers {
    install?: () => Promise<void>;
    enable?: () => Promise<void>;
    disable?: () => Promise<void>;
    uninstall?: () => Promise<void>;
    update?: (fromVersion: string, toVersion: string) => Promise<void>;
}

/**
 * Universe handlers
 */
export interface UniverseHandlers {
    onCreate?: (universe: any) => Promise<void>;
    onUpdate?: (universe: any, changes: any) => Promise<void>;
    onDelete?: (universeId: string) => Promise<void>;
}

/**
 * Data handlers
 */
export interface DataHandlers {
    validate?: (data: unknown) => Promise<ValidationResult>;
    migrate?: (data: unknown, fromVersion: string, toVersion: string) => Promise<unknown>;
    export?: (universeId: string) => Promise<unknown>;
    import?: (data: unknown, universeId: string) => Promise<void>;
}

/**
 * Validation result
 */
export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
}

/**
 * Validation error
 */
export interface ValidationError {
    field: string;
    message: string;
    code: string;
}

/**
 * Validation warning
 */
export interface ValidationWarning {
    field: string;
    message: string;
    code: string;
}

/**
 * UI handlers
 */
export interface UIHandlers {
    onThemeChange?: (theme: ThemeDefinition) => Promise<void>;
    onComponentRender?: (componentId: string, props: any) => Promise<any>;
}

/**
 * API handlers
 */
export interface ApiHandlers {
    [endpoint: string]: (req: any, res: any) => Promise<void>;
}

/**
 * Plugin load error
 */
export interface PluginLoadError {
    code: PluginErrorCode;
    message: string;
    details?: Record<string, unknown>;
}

/**
 * Plugin error codes
 */
export enum PluginErrorCode {
    PLUGIN_NOT_FOUND = 'PLUGIN_NOT_FOUND',
    INVALID_MANIFEST = 'INVALID_MANIFEST',
    VERSION_INCOMPATIBLE = 'VERSION_INCOMPATIBLE',
    DEPENDENCY_MISSING = 'DEPENDENCY_MISSING',
    SECURITY_VIOLATION = 'SECURITY_VIOLATION',
    RESOURCE_LIMIT_EXCEEDED = 'RESOURCE_LIMIT_EXCEEDED',
    INITIALIZATION_FAILED = 'INITIALIZATION_FAILED',
    RUNTIME_ERROR = 'RUNTIME_ERROR'
}

/**
 * Plugin discovery result
 */
export interface PluginDiscoveryResult {
    available_plugins: PluginManifest[];
    installed_plugins: PluginInstance[];
    errors: PluginLoadError[];
}

/**
 * Plugin update info
 */
export interface PluginUpdateInfo {
    plugin_id: string;
    current_version: string;
    available_version: string;
    update_required: boolean;
    breaking_changes: boolean;
    changelog: string;
}

/**
 * Plugin registry interface
 */
export interface PluginRegistry {
    registerPlugin(manifest: PluginManifest): Promise<void>;
    unregisterPlugin(pluginId: string): Promise<void>;
    getPlugin(pluginId: string): Promise<PluginManifest | null>;
    listPlugins(): Promise<PluginManifest[]>;
    searchPlugins(query: string): Promise<PluginManifest[]>;
    checkUpdates(pluginId?: string): Promise<PluginUpdateInfo[]>;
}

/**
 * Plugin loader interface
 */
export interface PluginLoader {
    loadPlugin(pluginId: string): Promise<PluginLoadResult>;
    unloadPlugin(pluginId: string): Promise<void>;
    reloadPlugin(pluginId: string): Promise<PluginLoadResult>;
    enablePlugin(pluginId: string): Promise<void>;
    disablePlugin(pluginId: string): Promise<void>;
    getLoadedPlugins(): Promise<LoadedPlugin[]>;
}

/**
 * Plugin manager interface
 */
export interface PluginManager {
    registry: PluginRegistry;
    loader: PluginLoader;

    installPlugin(pluginPath: string): Promise<void>;
    uninstallPlugin(pluginId: string): Promise<void>;
    updatePlugin(pluginId: string): Promise<void>;
    configurePlugin(pluginId: string, config: Record<string, unknown>): Promise<void>;
    validatePlugin(manifest: PluginManifest): Promise<ValidationResult>;
}

/**
 * Plugin sandbox interface for security
 */
export interface PluginSandbox {
    createSandbox(pluginId: string): Promise<PluginSandboxContext>;
    destroySandbox(pluginId: string): Promise<void>;
    executeInSandbox(pluginId: string, code: string, context?: Record<string, unknown>): Promise<unknown>;
}

/**
 * Plugin sandbox context
 */
export interface PluginSandboxContext {
    plugin_id: string;
    available_apis: string[];
    resource_limits: ResourceRequirements;
    permissions: PluginPermissions;
}

/**
 * Plugin permissions
 */
export interface PluginPermissions {
    file_system: FileSystemPermissions;
    network: NetworkPermissions;
    database: DatabasePermissions;
    system: SystemPermissions;
}

/**
 * File system permissions
 */
export interface FileSystemPermissions {
    read: string[];
    write: string[];
    execute: string[];
}

/**
 * Network permissions
 */
export interface NetworkPermissions {
    outbound_urls: string[];
    allowed_ports: number[];
}

/**
 * Database permissions
 */
export interface DatabasePermissions {
    collections: string[];
    operations: string[];
}

/**
 * System permissions
 */
export interface SystemPermissions {
    spawn_processes: boolean;
    access_environment: boolean;
    modify_system_settings: boolean;
}
