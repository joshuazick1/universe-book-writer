/**
 * Plugin version management system - Handles semantic versioning and compatibility checks
 */

import type { PluginMetadata } from '@verseforge/core';

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
export enum VersionRangeType {
  EXACT = 'exact', // 1.2.3
  CARET = 'caret', // ^1.2.3
  TILDE = 'tilde', // ~1.2.3
  GREATER = 'greater', // >1.2.3
  GREATER_EQUAL = 'gte', // >=1.2.3
  LESS = 'less', // <1.2.3
  LESS_EQUAL = 'lte', // <=1.2.3
  RANGE = 'range', // 1.2.3 - 2.0.0
  WILDCARD = 'wildcard', // 1.2.x, 1.x, x
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
export enum ConflictType {
  VERSION_MISMATCH = 'version_mismatch',
  MISSING_DEPENDENCY = 'missing_dependency',
  CIRCULAR_DEPENDENCY = 'circular_dependency',
  INCOMPATIBLE_VERSION = 'incompatible_version',
}

/**
 * Resolution strategies
 */
export enum ResolutionStrategy {
  STRICT = 'strict', // Exact version matching
  COMPATIBLE = 'compatible', // Compatible version ranges
  LATEST = 'latest', // Use latest compatible version
  MANUAL = 'manual', // Manual resolution required
}

/**
 * Plugin version manager
 */
export class PluginVersionManager {
  private installedPlugins: Map<string, PluginMetadata> = new Map();
  private versionCache: Map<string, SemanticVersion> = new Map();

  /**
   * Parse semantic version string
   */
  parseVersion(versionString: string): SemanticVersion {
    // Check cache first
    if (this.versionCache.has(versionString)) {
      return this.versionCache.get(versionString)!;
    }

    const cleaned = versionString.trim().replace(/^v/, '');

    // Regex for semantic version with optional prerelease and build
    const semverRegex =
      /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?(?:\+([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

    const match = cleaned.match(semverRegex);
    if (!match) {
      throw new Error(`Invalid semantic version: ${versionString}`);
    }

    const version: SemanticVersion = {
      major: Number.parseInt(match[1] || '0', 10),
      minor: Number.parseInt(match[2] || '0', 10),
      patch: Number.parseInt(match[3] || '0', 10),
      prerelease: match[4],
      build: match[5],
      original: versionString,
    };

    // Cache the parsed version
    this.versionCache.set(versionString, version);

    return version;
  }

  /**
   * Parse version range specification
   */
  parseVersionRange(rangeString: string): VersionRange {
    const trimmed = rangeString.trim();

    // Exact version
    if (
      /^\d+\.\d+\.\d+/.test(trimmed) &&
      !trimmed.includes(' ') &&
      !trimmed.startsWith('^') &&
      !trimmed.startsWith('~')
    ) {
      return {
        type: VersionRangeType.EXACT,
        version: this.parseVersion(trimmed),
        original: rangeString,
      };
    }

    // Caret range (^1.2.3)
    if (trimmed.startsWith('^')) {
      return {
        type: VersionRangeType.CARET,
        version: this.parseVersion(trimmed.slice(1)),
        original: rangeString,
      };
    }

    // Tilde range (~1.2.3)
    if (trimmed.startsWith('~')) {
      return {
        type: VersionRangeType.TILDE,
        version: this.parseVersion(trimmed.slice(1)),
        original: rangeString,
      };
    }

    // Greater than (>1.2.3)
    if (trimmed.startsWith('>') && !trimmed.startsWith('>=')) {
      return {
        type: VersionRangeType.GREATER,
        version: this.parseVersion(trimmed.slice(1)),
        original: rangeString,
      };
    }

    // Greater than or equal (>=1.2.3)
    if (trimmed.startsWith('>=')) {
      return {
        type: VersionRangeType.GREATER_EQUAL,
        version: this.parseVersion(trimmed.slice(2)),
        original: rangeString,
      };
    }

    // Less than (<1.2.3)
    if (trimmed.startsWith('<') && !trimmed.startsWith('<=')) {
      return {
        type: VersionRangeType.LESS,
        version: this.parseVersion(trimmed.slice(1)),
        original: rangeString,
      };
    }

    // Less than or equal (<=1.2.3)
    if (trimmed.startsWith('<=')) {
      return {
        type: VersionRangeType.LESS_EQUAL,
        version: this.parseVersion(trimmed.slice(2)),
        original: rangeString,
      };
    }

    // Range (1.2.3 - 2.0.0)
    if (trimmed.includes(' - ')) {
      const [lower, upper] = trimmed.split(' - ').map(v => v.trim());
      if (!lower || !upper) {
        throw new Error(`Invalid range format: ${rangeString}`);
      }
      return {
        type: VersionRangeType.RANGE,
        version: this.parseVersion(lower),
        upperBound: this.parseVersion(upper),
        original: rangeString,
      };
    }

    // Wildcard (1.2.x, 1.x, x)
    if (trimmed.includes('x') || trimmed.includes('X') || trimmed.includes('*')) {
      const normalized = trimmed.replace(/[xX*]/g, '0');
      return {
        type: VersionRangeType.WILDCARD,
        version: this.parseVersion(normalized),
        original: rangeString,
      };
    }

    throw new Error(`Unsupported version range format: ${rangeString}`);
  }

  /**
   * Check if a version satisfies a range
   */
  satisfiesRange(version: string, range: string): boolean {
    try {
      const versionObj = this.parseVersion(version);
      const rangeObj = this.parseVersionRange(range);

      return this.versionSatisfiesRange(versionObj, rangeObj);
    } catch {
      return false;
    }
  }

  /**
   * Check version compatibility between plugins
   */
  checkCompatibility(requiredVersion: string, availableVersion: string): CompatibilityResult {
    try {
      const required = this.parseVersionRange(requiredVersion);
      const available = this.parseVersion(availableVersion);

      const compatible = this.versionSatisfiesRange(available, required);

      const result: CompatibilityResult = {
        compatible,
        requiredVersion,
        actualVersion: availableVersion,
      };

      if (!compatible) {
        result.reason = this.getIncompatibilityReason(required, available);
        result.suggestion = this.getSuggestion(required, available);
      }

      return result;
    } catch (error) {
      return {
        compatible: false,
        requiredVersion,
        actualVersion: availableVersion,
        reason: `Invalid version format: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Resolve dependencies for multiple plugins
   */
  resolveDependencies(
    plugins: PluginMetadata[],
    strategy: ResolutionStrategy = ResolutionStrategy.COMPATIBLE
  ): DependencyResolutionResult {
    const conflicts: DependencyConflict[] = [];
    const dependencyGraph: Map<string, Set<string>> = new Map();
    const allDependencies: Map<string, string[]> = new Map();

    // Build dependency graph
    for (const plugin of plugins) {
      dependencyGraph.set(plugin.name, new Set());

      if (plugin.dependencies) {
        for (const [depName, version] of Object.entries(plugin.dependencies)) {
          dependencyGraph.get(plugin.name)!.add(depName);

          if (!allDependencies.has(depName)) {
            allDependencies.set(depName, []);
          }
          allDependencies.get(depName)!.push(version);
        }
      }
    }

    // Check for circular dependencies
    this.detectCircularDependencies(dependencyGraph, conflicts);

    // Check for version conflicts
    this.detectVersionConflicts(allDependencies, conflicts);

    // Generate suggested versions
    const suggestedVersions = this.generateSuggestedVersions(allDependencies, strategy);

    return {
      resolved: conflicts.length === 0,
      conflicts,
      resolutionStrategy: strategy,
      suggestedVersions,
    };
  }

  /**
   * Find the best compatible version
   */
  findBestVersion(availableVersions: string[], requiredRange: string): string | null {
    try {
      const range = this.parseVersionRange(requiredRange);
      const compatibleVersions = availableVersions
        .filter(version => {
          try {
            const versionObj = this.parseVersion(version);
            return this.versionSatisfiesRange(versionObj, range);
          } catch {
            return false;
          }
        })
        .sort((a, b) => this.compareVersions(a, b));

      return compatibleVersions.length > 0
        ? (compatibleVersions[compatibleVersions.length - 1] ?? null)
        : null;
    } catch {
      return null;
    }
  }

  /**
   * Compare two versions
   */
  compareVersions(a: string, b: string): number {
    try {
      const versionA = this.parseVersion(a);
      const versionB = this.parseVersion(b);

      if (versionA.major !== versionB.major) {
        return versionA.major - versionB.major;
      }
      if (versionA.minor !== versionB.minor) {
        return versionA.minor - versionB.minor;
      }
      if (versionA.patch !== versionB.patch) {
        return versionA.patch - versionB.patch;
      }

      // Handle prerelease versions
      if (versionA.prerelease && !versionB.prerelease) return -1;
      if (!versionA.prerelease && versionB.prerelease) return 1;
      if (versionA.prerelease && versionB.prerelease) {
        return versionA.prerelease.localeCompare(versionB.prerelease);
      }

      return 0;
    } catch {
      return a.localeCompare(b);
    }
  }

  /**
   * Get the next version based on increment type
   */
  incrementVersion(version: string, type: 'major' | 'minor' | 'patch'): string {
    const versionObj = this.parseVersion(version);

    switch (type) {
      case 'major':
        return `${versionObj.major + 1}.0.0`;
      case 'minor':
        return `${versionObj.major}.${versionObj.minor + 1}.0`;
      case 'patch':
        return `${versionObj.major}.${versionObj.minor}.${versionObj.patch + 1}`;
      default:
        throw new Error(`Invalid increment type: ${type}`);
    }
  }

  /**
   * Register installed plugin
   */
  registerPlugin(metadata: PluginMetadata): void {
    this.installedPlugins.set(metadata.name, metadata);
  }

  /**
   * Unregister plugin
   */
  unregisterPlugin(pluginName: string): void {
    this.installedPlugins.delete(pluginName);
  }

  /**
   * Get installed plugin version
   */
  getInstalledVersion(pluginName: string): string | undefined {
    return this.installedPlugins.get(pluginName)?.version;
  }

  /**
   * Check if version satisfies range object
   */
  private versionSatisfiesRange(version: SemanticVersion, range: VersionRange): boolean {
    switch (range.type) {
      case VersionRangeType.EXACT:
        return this.versionsEqual(version, range.version);

      case VersionRangeType.CARET:
        // ^1.2.3 := >=1.2.3 <2.0.0
        return version.major === range.version.major && this.versionGTE(version, range.version);

      case VersionRangeType.TILDE:
        // ~1.2.3 := >=1.2.3 <1.3.0
        return (
          version.major === range.version.major &&
          version.minor === range.version.minor &&
          this.versionGTE(version, range.version)
        );

      case VersionRangeType.GREATER:
        return this.versionGT(version, range.version);

      case VersionRangeType.GREATER_EQUAL:
        return this.versionGTE(version, range.version);

      case VersionRangeType.LESS:
        return this.versionLT(version, range.version);

      case VersionRangeType.LESS_EQUAL:
        return this.versionLTE(version, range.version);

      case VersionRangeType.RANGE:
        return range.upperBound
          ? this.versionGTE(version, range.version) && this.versionLTE(version, range.upperBound)
          : false;

      case VersionRangeType.WILDCARD:
        return this.versionMatchesWildcard(version, range);

      default:
        return false;
    }
  }

  /**
   * Check if versions are equal
   */
  private versionsEqual(a: SemanticVersion, b: SemanticVersion): boolean {
    return a.major === b.major && a.minor === b.minor && a.patch === b.patch;
  }

  /**
   * Check if version a is greater than version b
   */
  private versionGT(a: SemanticVersion, b: SemanticVersion): boolean {
    if (a.major !== b.major) return a.major > b.major;
    if (a.minor !== b.minor) return a.minor > b.minor;
    return a.patch > b.patch;
  }

  /**
   * Check if version a is greater than or equal to version b
   */
  private versionGTE(a: SemanticVersion, b: SemanticVersion): boolean {
    return this.versionGT(a, b) || this.versionsEqual(a, b);
  }

  /**
   * Check if version a is less than version b
   */
  private versionLT(a: SemanticVersion, b: SemanticVersion): boolean {
    return this.versionGT(b, a);
  }

  /**
   * Check if version a is less than or equal to version b
   */
  private versionLTE(a: SemanticVersion, b: SemanticVersion): boolean {
    return this.versionLT(a, b) || this.versionsEqual(a, b);
  }

  /**
   * Check if version matches wildcard pattern
   */
  private versionMatchesWildcard(version: SemanticVersion, range: VersionRange): boolean {
    const original = range.original.toLowerCase();

    if (original === 'x' || original === '*') {
      return true; // Any version
    }

    if (original.startsWith('x.') || original.startsWith('*.')) {
      return true; // Any major version
    }

    const parts = original.split('.');
    if (parts.length >= 1 && parts[0] !== 'x' && parts[0] !== '*') {
      if (version.major !== Number.parseInt(parts[0] || '0', 10)) return false;
    }
    if (parts.length >= 2 && parts[1] !== 'x' && parts[1] !== '*') {
      if (version.minor !== Number.parseInt(parts[1] || '0', 10)) return false;
    }

    return true;
  }

  /**
   * Get incompatibility reason
   */
  private getIncompatibilityReason(range: VersionRange, version: SemanticVersion): string {
    switch (range.type) {
      case VersionRangeType.EXACT:
        return `Exact version ${range.version.original} required, but ${version.original} is available`;
      case VersionRangeType.CARET:
        return `Compatible version ^${range.version.original} required, but ${version.original} is not compatible`;
      case VersionRangeType.TILDE:
        return `Patch-level compatible version ~${range.version.original} required, but ${version.original} is not compatible`;
      case VersionRangeType.GREATER:
        return `Version greater than ${range.version.original} required, but ${version.original} is not greater`;
      case VersionRangeType.GREATER_EQUAL:
        return `Version ${range.version.original} or higher required, but ${version.original} is lower`;
      case VersionRangeType.LESS:
        return `Version less than ${range.version.original} required, but ${version.original} is not less`;
      case VersionRangeType.LESS_EQUAL:
        return `Version ${range.version.original} or lower required, but ${version.original} is higher`;
      default:
        return `Version ${version.original} does not satisfy range ${range.original}`;
    }
  }

  /**
   * Get suggestion for version resolution
   */
  private getSuggestion(range: VersionRange, version: SemanticVersion): string {
    if (this.versionLT(version, range.version)) {
      return `Consider upgrading to version ${range.version.original} or higher`;
    }
    return 'Consider using a more permissive version range or upgrading the requirement';
  }

  /**
   * Detect circular dependencies
   */
  private detectCircularDependencies(
    graph: Map<string, Set<string>>,
    conflicts: DependencyConflict[]
  ): void {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (node: string, path: string[]): void => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node);
        const cycle = path.slice(cycleStart).concat(node);

        conflicts.push({
          pluginName: node,
          dependencyName: cycle[cycle.length - 2] || 'unknown',
          requiredVersions: [],
          conflictType: ConflictType.CIRCULAR_DEPENDENCY,
        });
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      recursionStack.add(node);

      const dependencies = graph.get(node) || new Set();
      for (const dep of dependencies) {
        dfs(dep, [...path, node]);
      }

      recursionStack.delete(node);
    };

    for (const node of graph.keys()) {
      if (!visited.has(node)) {
        dfs(node, []);
      }
    }
  }

  /**
   * Detect version conflicts
   */
  private detectVersionConflicts(
    dependencies: Map<string, string[]>,
    conflicts: DependencyConflict[]
  ): void {
    for (const [depName, versions] of dependencies) {
      if (versions.length > 1) {
        // Check if all versions are compatible
        const uniqueVersions = [...new Set(versions)];

        if (uniqueVersions.length > 1) {
          // Try to find a version that satisfies all requirements
          const hasCompatibleVersion = this.findCompatibleVersion(uniqueVersions);

          if (!hasCompatibleVersion) {
            conflicts.push({
              pluginName: depName,
              dependencyName: depName,
              requiredVersions: uniqueVersions,
              conflictType: ConflictType.VERSION_MISMATCH,
            });
          }
        }
      }
    }
  }

  /**
   * Find a version compatible with all requirements
   */
  private findCompatibleVersion(requirements: string[]): boolean {
    // This is a simplified check - in a real implementation,
    // you'd need to solve the constraint satisfaction problem
    for (const requirement of requirements) {
      const compatible = requirements.every(
        other => other === requirement || this.rangesOverlap(requirement, other)
      );

      if (compatible) return true;
    }

    return false;
  }

  /**
   * Check if two version ranges overlap
   */
  private rangesOverlap(range1: string, range2: string): boolean {
    try {
      const r1 = this.parseVersionRange(range1);
      const r2 = this.parseVersionRange(range2);

      // Simplified overlap check - would need more sophisticated logic
      return r1.type === r2.type && this.versionsEqual(r1.version, r2.version);
    } catch {
      return false;
    }
  }

  /**
   * Generate suggested versions based on strategy
   */
  private generateSuggestedVersions(
    dependencies: Map<string, string[]>,
    strategy: ResolutionStrategy
  ): Record<string, string> {
    const suggestions: Record<string, string> = {};

    for (const [depName, versions] of dependencies) {
      switch (strategy) {
        case ResolutionStrategy.STRICT:
          // Use exact versions - take the first one
          if (versions[0]) {
            suggestions[depName] = versions[0];
          }
          break;

        case ResolutionStrategy.LATEST: {
          // Find the highest version
          const sortedVersions = versions.sort((a, b) => this.compareVersions(a, b));
          const latestVersion = sortedVersions[sortedVersions.length - 1];
          if (latestVersion) {
            suggestions[depName] = latestVersion;
          }
          break;
        }
        default:
          // Try to find a compatible version range
          suggestions[depName] = this.findMostCompatibleVersion(versions);
          break;
      }
    }

    return suggestions;
  }

  /**
   * Find the most compatible version from a list of requirements
   */
  private findMostCompatibleVersion(versions: string[]): string {
    // For now, return the first version
    // In a real implementation, this would analyze ranges and find the most permissive one
    if (versions.length === 0) {
      throw new Error('No versions provided for compatibility check');
    }
    const firstVersion = versions[0];
    if (!firstVersion) {
      throw new Error('Invalid version found in compatibility check');
    }
    return firstVersion;
  }
}
