/**
 * Enhanced plugin validation system with security checks and advanced validation rules
 */
import { type Plugin, type PluginConfig, type PluginMetadata, PluginType } from '@universe-book-writer/core';
/**
 * Validation severity levels
 */
export declare enum ValidationSeverity {
    ERROR = "error",
    WARNING = "warning",
    INFO = "info"
}
/**
 * Validation rule result
 */
export interface ValidationResult {
    valid: boolean;
    severity: ValidationSeverity;
    rule: string;
    message: string;
    details?: Record<string, unknown>;
}
/**
 * Plugin validation report
 */
export interface PluginValidationReport {
    valid: boolean;
    pluginName: string;
    results: ValidationResult[];
    securityScore: number;
    performanceScore: number;
    overallScore: number;
    timestamp: Date;
}
/**
 * Security validation options
 */
export interface SecurityValidationOptions {
    checkFilePermissions: boolean;
    validateCodeSignature: boolean;
    scanForMaliciousPatterns: boolean;
    checkDependencyVulnerabilities: boolean;
    enforceFileExtensions: boolean;
    maxFileSize: number;
}
/**
 * Performance validation options
 */
export interface PerformanceValidationOptions {
    maxInitializationTime: number;
    maxMemoryUsage: number;
    maxFileSize: number;
    checkAsyncOperations: boolean;
}
/**
 * Validation configuration
 */
export interface ValidationConfig {
    security: SecurityValidationOptions;
    performance: PerformanceValidationOptions;
    enableStrictMode: boolean;
    allowedPluginTypes: PluginType[];
    requiredFields: string[];
    customValidators: ValidationRule[];
}
/**
 * Custom validation rule interface
 */
export interface ValidationRule {
    name: string;
    description: string;
    severity: ValidationSeverity;
    validate: (plugin: Plugin, metadata: PluginMetadata, config?: PluginConfig) => Promise<ValidationResult>;
}
/**
 * Enhanced plugin validator
 */
export declare class PluginValidator {
    private config;
    private customRules;
    constructor(config?: Partial<ValidationConfig>);
    /**
     * Validate a plugin comprehensively
     */
    validatePlugin(plugin: Plugin, pluginPath?: string): Promise<PluginValidationReport>;
    /**
     * Add custom validation rule
     */
    addCustomRule(rule: ValidationRule): void;
    /**
     * Remove custom validation rule
     */
    removeCustomRule(ruleName: string): void;
    /**
     * Get all custom rules
     */
    getCustomRules(): ValidationRule[];
    /**
     * Update validation configuration
     */
    updateConfig(config: Partial<ValidationConfig>): void;
    /**
     * Validate plugin metadata
     */
    private validateMetadata;
    /**
     * Validate plugin configuration
     */
    private validateConfiguration;
    /**
     * Validate plugin security
     */
    private validateSecurity;
    /**
     * Validate plugin performance characteristics
     */
    private validatePerformance;
    /**
     * Validate plugin type-specific requirements
     */
    private validatePluginType;
    /**
     * Validate universe plugin specific requirements
     */
    private validateUniversePlugin;
    /**
     * Validate theme plugin specific requirements
     */
    private validateThemePlugin;
    /**
     * Validate AI plugin specific requirements
     */
    private validateAIPlugin;
    /**
     * Validate core plugin specific requirements
     */
    private validateCorePlugin;
    /**
     * Validate plugin dependencies
     */
    private validateDependencies;
    /**
     * Run custom validation rules
     */
    private runCustomValidators;
    /**
     * Generate validation report
     */
    private generateReport;
    /**
     * Calculate score for a set of results
     */
    private calculateScore;
    /**
     * Calculate overall score
     */
    private calculateOverallScore;
    /**
     * Initialize built-in validation rules
     */
    private initializeBuiltInRules;
}
//# sourceMappingURL=plugin-validator.d.ts.map