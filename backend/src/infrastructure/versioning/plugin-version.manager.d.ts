/**
 * Plugin version management system - Handles semantic versioning and compatibility checks
 */
import type { PluginMetadata } from '@universe-book-writer/core';
/**
 * Semantic version structure
 */
export interface SemanticVersion {
    major: number;
    minor: number;
    patch: number;
    prerelease?: string;
    build?: string;
    original: string;
}
/**
 * Version range types
 */
export declare enum VersionRangeType {
    EXACT = "exact",// 1.2.3
    CARET = "caret",// ^1.2.3
    TILDE = "tilde",// ~1.2.3
    GREATER = "greater",// >1.2.3
    GREATER_EQUAL = "gte",// >=1.2.3
    LESS = "less",// <1.2.3
    LESS_EQUAL = "lte",// <=1.2.3
    RANGE = "range",// 1.2.3 - 2.0.0
    WILDCARD = "wildcard"
}
/**
 * Version range specification
 */
export interface VersionRange {
    type: VersionRangeType;
    version: SemanticVersion;
    upperBound?: SemanticVersion;
    original: string;
}
/**
 * Compatibility result
 */
export interface CompatibilityResult {
    compatible: boolean;
    requiredVersion: string;
    actualVersion: string;
    reason?: string;
    suggestion?: string;
}
/**
 * Dependency resolution result
 */
export interface DependencyResolutionResult {
    resolved: boolean;
    conflicts: DependencyConflict[];
    resolutionStrategy?: ResolutionStrategy;
    suggestedVersions: Record<string, string>;
}
/**
 * Dependency conflict
 */
export interface DependencyConflict {
    pluginName: string;
    dependencyName: string;
    requiredVersions: string[];
    availableVersion?: string;
    conflictType: ConflictType;
}
/**
 * Conflict types
 */
export declare enum ConflictType {
    VERSION_MISMATCH = "version_mismatch",
    MISSING_DEPENDENCY = "missing_dependency",
    CIRCULAR_DEPENDENCY = "circular_dependency",
    INCOMPATIBLE_VERSION = "incompatible_version"
}
/**
 * Resolution strategies
 */
export declare enum ResolutionStrategy {
    STRICT = "strict",// Exact version matching
    COMPATIBLE = "compatible",// Compatible version ranges
    LATEST = "latest",// Use latest compatible version
    MANUAL = "manual"
}
/**
 * Plugin version manager
 */
export declare class PluginVersionManager {
    private installedPlugins;
    private versionCache;
    /**
     * Parse semantic version string
     */
    parseVersion(versionString: string): SemanticVersion;
    /**
     * Parse version range specification
     */
    parseVersionRange(rangeString: string): VersionRange;
    /**
     * Check if a version satisfies a range
     */
    satisfiesRange(version: string, range: string): boolean;
    /**
     * Check version compatibility between plugins
     */
    checkCompatibility(requiredVersion: string, availableVersion: string): CompatibilityResult;
    /**
     * Resolve dependencies for multiple plugins
     */
    resolveDependencies(plugins: PluginMetadata[], strategy?: ResolutionStrategy): DependencyResolutionResult;
    /**
     * Find the best compatible version
     */
    findBestVersion(availableVersions: string[], requiredRange: string): string | null;
    /**
     * Compare two versions
     */
    compareVersions(a: string, b: string): number;
    /**
     * Get the next version based on increment type
     */
    incrementVersion(version: string, type: 'major' | 'minor' | 'patch'): string;
    /**
     * Register installed plugin
     */
    registerPlugin(metadata: PluginMetadata): void;
    /**
     * Unregister plugin
     */
    unregisterPlugin(pluginName: string): void;
    /**
     * Get installed plugin version
     */
    getInstalledVersion(pluginName: string): string | undefined;
    /**
     * Check if version satisfies range object
     */
    private versionSatisfiesRange;
    /**
     * Check if versions are equal
     */
    private versionsEqual;
    /**
     * Check if version a is greater than version b
     */
    private versionGT;
    /**
     * Check if version a is greater than or equal to version b
     */
    private versionGTE;
    /**
     * Check if version a is less than version b
     */
    private versionLT;
    /**
     * Check if version a is less than or equal to version b
     */
    private versionLTE;
    /**
     * Check if version matches wildcard pattern
     */
    private versionMatchesWildcard;
    /**
     * Get incompatibility reason
     */
    private getIncompatibilityReason;
    /**
     * Get suggestion for version resolution
     */
    private getSuggestion;
    /**
     * Detect circular dependencies
     */
    private detectCircularDependencies;
    /**
     * Detect version conflicts
     */
    private detectVersionConflicts;
    /**
     * Find a version compatible with all requirements
     */
    private findCompatibleVersion;
    /**
     * Check if two version ranges overlap
     */
    private rangesOverlap;
    /**
     * Generate suggested versions based on strategy
     */
    private generateSuggestedVersions;
    /**
     * Find the most compatible version from a list of requirements
     */
    private findMostCompatibleVersion;
}
//# sourceMappingURL=plugin-version.manager.d.ts.map